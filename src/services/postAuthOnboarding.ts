import { clearPendingPlacement, readPendingPlacement, toServerPlacementEvidence, type PendingPlacementV2 } from "../lib/placement";
import { finalizeOnboardingOnServer } from "./finalizeOnboarding";
import { commitPlacementToServer } from "./placementCommit";
import { useStore } from "../lib/store";
import { syncAuthSessionProgress } from "./cloudSyncCoordinator";
import { trackFunnelEvent } from "./funnelEvents";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getSupabaseClient } from "../lib/supabaseClient";
import { buildProgressSnapshot, isMeaningfulProgress } from "../lib/progressSnapshot";
import { FINALIZE_ONBOARDING_TEMP_ERROR } from "../lib/auth/onboardingCopy";
import { isCloudOnboardingV2Enabled } from "../lib/featureFlags";

export async function completeAuthenticatedOnboarding(input?: {
  placement?: PendingPlacementV2 | null;
}): Promise<{
  ok: boolean;
  code?: "missing_draft" | "commit_failed" | "unavailable" | "invalid_evidence" | "already_completed";
  message: string;
}> {
  const before = useStore.getState();
  const account = before.accounts[before.currentAccountId];
  const migratingLocal =
    account?.authMode === "local" && isMeaningfulProgress(buildProgressSnapshot(account));

  if (isSupabaseBackendEnabled()) {
    const client = getSupabaseClient();
    if (client) {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (user?.id) {
        await client.rpc("ensure_own_profile", {
          p_name: account?.name ?? user.user_metadata?.name ?? "Aluno Longyu",
        });
      }
    }
  }

  if (isCloudOnboardingV2Enabled()) {
    const result = await finalizeOnboardingOnServer({
      placement: input?.placement ? toServerPlacementEvidence(input.placement) : null,
    });
    if (!result.ok) {
      return { ok: false, code: result.code, message: result.message || FINALIZE_ONBOARDING_TEMP_ERROR };
    }

    if (result.analysis) {
      useStore.getState().applyServerPlacement(result.analysis);
    }
    clearPendingPlacement();

    const sync = await syncAuthSessionProgress();
    if (!sync.ok) {
      return { ok: false, code: "unavailable", message: sync.message };
    }
    useStore.getState().setAccountSetupComplete(true);
    if (migratingLocal) useStore.getState().markLocalMigrated();
    trackFunnelEvent("placement_committed", {
      targetLessonId: result.analysis?.placement.targetLessonId ?? null,
      from: "server_draft",
    });
    trackFunnelEvent("account_authenticated");
    trackFunnelEvent("journey_entered");
    return { ok: true, message: sync.message };
  }

  const pending = input?.placement ?? readPendingPlacement();
  if (pending?.answers.length) {
    const commit = await commitPlacementToServer({
      declaredExperience: pending.declaredExperience,
      goal: pending.goal,
      answers: pending.answers,
      idempotencyKey: String(pending.startedAt),
    });
    if (!commit.ok || !commit.analysis) {
      return { ok: false, code: "unavailable", message: commit.message };
    }
    useStore.getState().applyServerPlacement(commit.analysis);
    clearPendingPlacement();
    trackFunnelEvent("placement_committed", {
      targetLessonId: commit.analysis.placement.targetLessonId,
      questions: commit.analysis.questionsAnswered,
      from: "compat_session_storage",
    });
  }

  const sync = await syncAuthSessionProgress();
  if (!sync.ok) {
    return { ok: false, code: "unavailable", message: sync.message };
  }
  useStore.getState().setAccountSetupComplete(true);
  if (migratingLocal) useStore.getState().markLocalMigrated();
  trackFunnelEvent("account_authenticated");
  trackFunnelEvent("journey_entered");
  return { ok: true, message: sync.message };
}
