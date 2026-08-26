import { clearPendingPlacement, readPendingPlacement } from "../lib/placement";
import { commitPlacementToServer } from "./placementCommit";
import { useStore } from "../lib/store";
import { syncAuthSessionProgress } from "./cloudSyncCoordinator";
import { trackFunnelEvent } from "./funnelEvents";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getSupabaseClient } from "../lib/supabaseClient";
import { buildProgressSnapshot, isMeaningfulProgress } from "../lib/progressSnapshot";

export async function completeAuthenticatedOnboarding(): Promise<{ ok: boolean; message: string }> {
  const pending = readPendingPlacement();
  const before = useStore.getState();
  const account = before.accounts[before.currentAccountId];
  const migratingLocal =
    account?.authMode === "local" && isMeaningfulProgress(buildProgressSnapshot(account));

  if (pending?.answers.length) {
    const commit = await commitPlacementToServer({
      declaredExperience: pending.declaredExperience,
      goal: pending.goal,
      answers: pending.answers,
      idempotencyKey: String(pending.startedAt),
    });
    if (!commit.ok || !commit.analysis) {
      return { ok: false, message: commit.message };
    }
    useStore.getState().applyServerPlacement(commit.analysis);
    clearPendingPlacement();
    trackFunnelEvent("placement_committed", {
      targetLessonId: commit.analysis.placement.targetLessonId,
      questions: commit.analysis.questionsAnswered,
    });
  }

  if (isSupabaseBackendEnabled()) {
    const client = getSupabaseClient();
    if (client) {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (user?.id) {
        await client.rpc("ensure_own_profile", {
          p_onboarding_completed: true,
        });
      }
    }
  }

  const sync = await syncAuthSessionProgress();
  if (!sync.ok) {
    return { ok: false, message: sync.message };
  }
  useStore.getState().setAccountSetupComplete(true);
  if (migratingLocal) useStore.getState().markLocalMigrated();
  trackFunnelEvent("account_authenticated");
  trackFunnelEvent("journey_entered");
  return { ok: true, message: sync.message };
}
