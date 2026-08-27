/**
 * AUTH-009/010/011 — probe de identidade.
 *
 * email_confirm via Admin API é FIXTURE, não substitui e-mail real em nova aba.
 * AUTH_READY não pode virar PASS só com este script.
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

try {
  const env = mergedEnv();
  const creds = requireLiveStagingCredentials(env);
  const { admin } = stagingClients(creds);
  const created = [];
  try {
    const user = await createTempUser(admin, "auth");
    created.push(user.id);

    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(user.id);
    if (authErr || !authUser.user) {
      throw new StagingGuardError(`AUTH-009 FAIL: auth.users ausente (${authErr?.message ?? "empty"})`);
    }

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    if (profileErr) {
      throw new StagingGuardError(`AUTH-009 FAIL: profiles ${profileErr.message}`);
    }
    if (!profile) {
      throw new StagingGuardError("AUTH-009 FAIL: profiles não criado para o user.");
    }
    if (profile.onboarding_completed === true) {
      throw new StagingGuardError(
        "AUTH-009 FAIL: onboarding_completed já true no fixture (create-account deveria deixar false)."
      );
    }

    const clientA = await signInAnon(creds.url, creds.anon, user);
    const { data: aUser } = await clientA.auth.getUser();
    const clientB = await signInAnon(creds.url, creds.anon, user);
    const { data: bUser } = await clientB.auth.getUser();
    if (aUser.user?.id !== bUser.user?.id || aUser.user?.id !== user.id) {
      throw new StagingGuardError("AUTH-011 FAIL: segundo client não é o mesmo user_id.");
    }

    console.log("AUTH fixture: auth.users + profiles ok; onboarding_completed não é true.");
    console.log("AUTH-009 email real / nova aba: NOT_RUN (fixture admin email_confirm ≠ e-mail).");
    console.log("OK: v476-auth-identity (fixture only; AUTH_READY permanece não-PASS)");
  } finally {
    await deleteTempUsers(admin, created);
  }
} catch (error) {
  failClosed(error);
}
