import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getSupabaseClient } from "../lib/supabaseClient";
import { BACKEND_UNAVAILABLE_MESSAGE } from "../lib/auth/localAuthPolicy";
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
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: BACKEND_UNAVAILABLE_MESSAGE };

  const { data, error } = await client.functions.invoke<{
    ok?: boolean;
    attemptId?: string;
    analysis?: PlacementAnalysis;
    error?: string;
  }>("commit-placement", {
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
    return { ok: false, message: data?.error || BACKEND_UNAVAILABLE_MESSAGE, analysis };
  }

  return {
    ok: true,
    message: "Nivelamento salvo na sua conta.",
    analysis: data?.analysis ?? analysis,
    attemptId: data?.attemptId,
  };
}
