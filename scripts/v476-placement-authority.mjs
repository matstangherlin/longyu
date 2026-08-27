/**
 * PLACEMENT-012 live: o client não escolhe score / skippedLessonIds / mastery.
 * Fail-closed. Recusa produção e atomurus. Sem credenciais = BLOCKED.
 */
import process from "node:process";
import { mergedEnv } from "./lib/env-local.mjs";
import { StagingGuardError, failClosed } from "./lib/staging-guard.mjs";
import {
  createTempUser,
  deleteTempUsers,
  fetchWithTimeout,
  requireLiveStagingCredentials,
  signInAnon,
  stagingClients,
} from "./lib/v476-live-env.mjs";

const BEGINNER_EVIDENCE = [
  { questionId: "warm-nihao-meaning", answer: "Olá", hintUsed: true, responseMode: "choice" },
  { questionId: "warm-xiexie-meaning", answer: "Obrigado(a).", hintUsed: true, responseMode: "choice" },
  { questionId: "warm-nihao-pinyin", answer: "nǐ hǎo", hintUsed: true, responseMode: "choice" },
];

try {
  const env = mergedEnv();
  const creds = requireLiveStagingCredentials(env);
  const { admin } = stagingClients(creds);
  const created = [];
  try {
    const user = await createTempUser(admin, "place");
    created.push(user.id);
    const session = await signInAnon(creds.url, creds.anon, user);
    const { data: sessionData } = await session.auth.getSession();
    const access = sessionData.session?.access_token;
    if (!access) throw new StagingGuardError("PLACEMENT-012 BLOCKED: sem access_token de sessão.");

    const forged = {
      placementVersion: 2,
      declaredExperience: "zero",
      answers: BEGINNER_EVIDENCE,
      score: 100,
      skippedLessonIds: ["forge-all-lessons"],
      masteredByPlacement: ["forge-all-lessons"],
      mastery: { "forge-all-lessons": 4 },
    };

    const response = await fetchWithTimeout(`${creds.url}/functions/v1/commit-placement`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        apikey: creds.anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forged),
    });

    if (response.status === 404) {
      throw new StagingGuardError(
        "PLACEMENT-012 BLOCKED: commit-placement ausente neste staging (STG-007 NOT_RUN)."
      );
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) {
      throw new StagingGuardError(
        `PLACEMENT-012 FAIL: commit-placement HTTP ${response.status} code=${body.error ?? "unknown"}`
      );
    }

    const analysis = body.analysis ?? {};
    const skipped = analysis.placement?.skippedLessonIds ?? [];
    const mastered = analysis.placement?.masteredByPlacement ?? [];
    if (skipped.includes("forge-all-lessons") || mastered.includes("forge-all-lessons")) {
      throw new StagingGuardError(
        "PLACEMENT-012 FAIL: servidor aceitou skippedLessonIds/mastery forjados."
      );
    }
    if (analysis.score === 100 && BEGINNER_EVIDENCE.every((item) => item.hintUsed)) {
      throw new StagingGuardError(
        "PLACEMENT-012 FAIL: score 100 do client parece ter sido honrado."
      );
    }
    console.log("PLACEMENT-012 live: servidor ignorou score/skip/mastery forjados.");
    console.log("OK: v476-placement-authority");
  } finally {
    await deleteTempUsers(admin, created);
  }
} catch (error) {
  failClosed(error);
}
