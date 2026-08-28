/**
 * SYNC-014/015/016 probe: dois clients, não regredir completedLessons.
 * Fail-closed. Recusa produção. Sem credenciais = BLOCKED.
 */
import process from "node:process";
import { mergedEnv } from "./lib/env-local.mjs";
import { StagingGuardError, failClosed } from "./lib/staging-guard.mjs";
import {
  createTempUser,
  deleteTempUsers,
  requireLiveStagingCredentials,
  signInAnon,
  stagingClients,
} from "./lib/v476-live-env.mjs";

function progressBody(completedLessons, xpTotal) {
  return {
    completedLessons,
    lessonTaskProgress: {},
    learnedChars: [],
    learnedChunks: [],
    srs: {},
    points: 0,
    dailyEnergy: 5,
    dailyTasks: {},
    weeklyMissions: {},
    monthlyMission: null,
    missionHistory: [],
    chests: {},
    chestOpenHistory: [],
    achievementsUnlocked: {},
    achievementHistory: [],
    placement: null,
    xpTotal,
    xpToday: 0,
    weeklyXp: 0,
    monthlyXp: 0,
  };
}

function snapshot(accountId, email, completedLessons, xpTotal) {
  const now = Date.now();
  const progress = progressBody(completedLessons, xpTotal);
  return {
    schemaVersion: 1,
    exportedAt: now,
    snapshot: {
      schemaVersion: 1,
      exportedAt: now,
      account: {
        id: `cloud:${accountId}`,
        name: "V476 sync",
        email,
        authMode: "cloud",
        createdAt: now,
        updatedAt: now,
      },
      progress,
    },
  };
}

function lessonCount(row) {
  const snap = row?.client_snapshot;
  const lessons = snap?.snapshot?.progress?.completedLessons ?? snap?.progress?.completedLessons;
  return Array.isArray(lessons) ? lessons.length : 0;
}

try {
  const env = mergedEnv();
  const creds = requireLiveStagingCredentials(env);
  const { admin } = stagingClients(creds);
  const created = [];
  try {
    const user = await createTempUser(admin, "sync");
    created.push(user.id);
    const deviceA = await signInAnon(creds.url, creds.anon, user);
    const deviceB = await signInAnon(creds.url, creds.anon, user);

    const one = snapshot(user.id, user.email, ["m1-l1"], 10);
    const { error: upA } = await deviceA.from("user_progress").upsert(
      {
        user_id: user.id,
        client_snapshot: one.snapshot,
        client_snapshot_version: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (upA) throw new StagingGuardError(`SYNC-014 FAIL: upsert A ${upA.message}`);

    const { data: readB, error: errB } = await deviceB
      .from("user_progress")
      .select("client_snapshot")
      .eq("user_id", user.id)
      .maybeSingle();
    if (errB) throw new StagingGuardError(`SYNC-015 FAIL: B leu ${errB.message}`);
    if (lessonCount(readB) < 1) {
      throw new StagingGuardError("SYNC-015 FAIL: device B não recebeu 1/4 (completedLessons).");
    }

    const two = snapshot(user.id, user.email, ["m1-l1", "m1-l2"], 20);
    const { error: upB } = await deviceB.from("user_progress").upsert(
      {
        user_id: user.id,
        client_snapshot: two.snapshot,
        client_snapshot_version: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (upB) throw new StagingGuardError(`SYNC-015 FAIL: upsert B ${upB.message}`);

    const { data: readA, error: errA } = await deviceA
      .from("user_progress")
      .select("client_snapshot")
      .eq("user_id", user.id)
      .maybeSingle();
    if (errA) throw new StagingGuardError(`SYNC-015 FAIL: A relê ${errA.message}`);
    if (lessonCount(readA) < 2) {
      throw new StagingGuardError("SYNC-015 FAIL: device A não recebeu 2/4 após B.");
    }

    const regress = snapshot(user.id, user.email, [], 0);
    const { error: upRegress } = await deviceA.from("user_progress").upsert(
      {
        user_id: user.id,
        client_snapshot: regress.snapshot,
        client_snapshot_version: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    const { data: after, error: afterErr } = await deviceB
      .from("user_progress")
      .select("client_snapshot")
      .eq("user_id", user.id)
      .maybeSingle();
    if (afterErr) throw new StagingGuardError(`SYNC-016 FAIL: releitura ${afterErr.message}`);
    const remaining = lessonCount(after);
    if (!upRegress && remaining < 2) {
      throw new StagingGuardError(
        "SYNC-016 FAIL: upsert cru regressou completedLessons (servidor não bloqueou)."
      );
    }
    if (remaining >= 2) {
      console.log("SYNC-016: nuvem manteve ≥2 lições após tentativa de regressão.");
    }
    console.log("OK: v476-sync-identity");
  } finally {
    await deleteTempUsers(admin, created);
  }
} catch (error) {
  failClosed(error);
}
