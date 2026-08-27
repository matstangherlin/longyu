import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getSupabaseClient } from "../lib/supabaseClient";
import { BACKEND_UNAVAILABLE_MESSAGE } from "../lib/auth/localAuthPolicy";
import { isDevLocalAuthAllowed } from "../lib/auth/localAuthPolicy";
import {
  FINALIZE_ONBOARDING_MISSING_DRAFT,
  FINALIZE_ONBOARDING_TEMP_ERROR,
} from "../lib/auth/onboardingCopy";
import {
  evaluatePlacementEvidence,
  toServerPlacementEvidence,
  type PlacementAnalysis,
  type PlacementCommitPayload,
} from "../lib/placement";

export const E2E_FINALIZE_CODE_KEY = "longyu:e2e-finalize-code";

export interface FinalizeOnboardingResult {
  ok: boolean;
  code?: "missing_draft" | "commit_failed" | "unavailable" | "invalid_evidence" | "already_completed";
  message: string;
  analysis?: PlacementAnalysis;
  attemptId?: string;
  alreadyCompleted?: boolean;
}

function e2eFinalizeHook(): FinalizeOnboardingResult | null {
  if (!isDevLocalAuthAllowed()) return null;
  if (typeof localStorage === "undefined") return null;
  try {
    const code = localStorage.getItem(E2E_FINALIZE_CODE_KEY);
    if (code === "missing_draft") {
      return { ok: false, code: "missing_draft", message: FINALIZE_ONBOARDING_MISSING_DRAFT };
    }
    if (code === "unavailable") {
      return { ok: false, code: "unavailable", message: FINALIZE_ONBOARDING_TEMP_ERROR };
    }
    if (code === "ok") {
      return { ok: true, alreadyCompleted: true, message: "Onboarding concluído." };
    }
  } catch {
    return null;
  }
  return null;
}

export async function finalizeOnboardingOnServer(input?: {
  placement?: PlacementCommitPayload | null;
}): Promise<FinalizeOnboardingResult> {
  const hooked = e2eFinalizeHook();
  if (hooked) return hooked;

  if (!isSupabaseBackendEnabled()) {
    return { ok: false, code: "unavailable", message: BACKEND_UNAVAILABLE_MESSAGE };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, code: "unavailable", message: BACKEND_UNAVAILABLE_MESSAGE };
  }

  const evidence = input?.placement ? toServerPlacementEvidence({
    version: input.placement.placementVersion,
    startedAt: 0,
    expiresAt: Date.now() + 1,
    answers: input.placement.answers,
    declaredExperience: input.placement.declaredExperience,
    goal: input.placement.goal,
    askedQuestionIds: input.placement.answers.map((item) => item.questionId),
  }) : undefined;

  const { data, error } = await client.functions.invoke<{
    ok?: boolean;
    code?: string;
    error?: string;
    attemptId?: string;
    alreadyCompleted?: boolean;
    analysis?: PlacementAnalysis;
  }>("finalize-onboarding", {
    body: evidence ? { placement: evidence } : {},
  });

  let body = data;
  if (!body && error) {
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        body = (await ctx.json()) as typeof data;
      }
    } catch {
      // ignore
    }
  }

  const code = body?.code;
  if (code === "missing_draft") {
    return { ok: false, code: "missing_draft", message: FINALIZE_ONBOARDING_MISSING_DRAFT };
  }
  if (error || body?.ok === false) {
    const mapped =
      code === "invalid_evidence"
        ? "invalid_evidence"
        : code === "commit_failed"
          ? "commit_failed"
          : "unavailable";
    return {
      ok: false,
      code: mapped,
      message: body?.error || FINALIZE_ONBOARDING_TEMP_ERROR,
    };
  }

  const analysis =
    body?.analysis ??
    (evidence
      ? evaluatePlacementEvidence(evidence.declaredExperience, evidence.answers)
      : undefined);

  return {
    ok: true,
    alreadyCompleted: Boolean(body?.alreadyCompleted),
    attemptId: body?.attemptId,
    analysis,
    message: "Ponto de partida salvo na sua conta.",
  };
}
