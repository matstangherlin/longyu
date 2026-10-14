import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getSupabaseClient } from "../lib/supabaseClient";
import { BACKEND_UNAVAILABLE_MESSAGE } from "../lib/auth/localAuthPolicy";
import { edgeOpsInit, noteOps } from "../lib/opsCorrelation";
import { isProductionLikeEnv } from "../lib/appEnvironment";
import knownMissing from "../lib/cloud/knownMissingBackend.json";
import {
  PLACEMENT_VERSION,
  evaluatePlacementEvidence,
  validatePlacementEvidence,
  type Experience,
  type PlacementAnalysis,
  type PlacementAnswerEvidence,
} from "../lib/placement";

export interface PlacementCommitResult {
  ok: boolean;
  message: string;
  analysis?: PlacementAnalysis;
  attemptId?: string;
  /** true when production still lacks commit-placement and we kept a local analysis only */
  localOnly?: boolean;
}

/** Production-like builds must not invoke the missing Edge until Batch B lands. */
export function isCommitPlacementEdgeAvailable(
  env: { VITE_APP_ENV?: string; MODE?: string; DEV?: boolean } = import.meta.env
): boolean {
  if (!isProductionLikeEnv(env)) return true;
  const missing = knownMissing.notGatedHere?.placement?.missing ?? [];
  return !missing.some((item) => item.kind === "edge" && item.name === "commit-placement");
}

export async function commitPlacementToServer(input: {
  declaredExperience: Experience;
  goal?: string | null;
  answers: PlacementAnswerEvidence[];
  idempotencyKey?: string;
}): Promise<PlacementCommitResult> {
  const validated = validatePlacementEvidence({
    placementVersion: PLACEMENT_VERSION,
    declaredExperience: input.declaredExperience,
    answers: input.answers,
  });
  if (!validated.ok) {
    return { ok: false, message: "Não foi possível validar o teste de nivelamento." };
  }

  const analysis = evaluatePlacementEvidence(input.declaredExperience, input.answers);

  if (!isSupabaseBackendEnabled()) {
    return { ok: false, message: BACKEND_UNAVAILABLE_MESSAGE };
  }

  // RC2.3.10D: zero MISSING_AND_REACHABLE while Batch B (placement migrations +
  // Edge deploy) is blocked on backup. Keep local analysis; do not call 404.
  if (!isCommitPlacementEdgeAvailable()) {
    return {
      ok: true,
      localOnly: true,
      message: "Nivelamento aplicado neste dispositivo. A sincronização com a conta chega com o backend de placement.",
      analysis,
    };
  }

  const client = getSupabaseClient();
  if (!client) return { ok: false, message: BACKEND_UNAVAILABLE_MESSAGE };

  const ops = edgeOpsInit("placement");
  const { data, error } = await client.functions.invoke<{
    ok?: boolean;
    attemptId?: string;
    analysis?: PlacementAnalysis;
    error?: string;
  }>("commit-placement", {
    headers: ops.headers,
    body: {
      placementVersion: PLACEMENT_VERSION,
      declaredExperience: input.declaredExperience,
      goal: input.goal ?? null,
      answers: input.answers.map((item) => ({
        questionId: item.questionId,
        answer: item.answer,
        hintUsed: Boolean(item.hintUsed),
        responseMode: item.responseMode ?? "choice",
      })),
      idempotencyKey: input.idempotencyKey,
    },
  });

  if (error || data?.ok === false) {
    noteOps("placement", ops.correlationId, "error", { code: data?.error ? "commit_failed" : "invoke_error" });
    return { ok: false, message: data?.error || BACKEND_UNAVAILABLE_MESSAGE, analysis };
  }

  noteOps("placement", ops.correlationId, "ok");

  return {
    ok: true,
    message: "Nivelamento salvo na sua conta.",
    analysis: data?.analysis ?? analysis,
    attemptId: data?.attemptId,
  };
}
