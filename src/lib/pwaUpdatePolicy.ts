import { useStore } from "./store";
import {
  isCheckoutFlowActive,
  isLessonFocusPath,
  isRewardClaimInProgress,
} from "./sensitiveFlow";

export type PwaUpdateReason =
  | "lesson"
  | "checkout"
  | "sync"
  | "reward"
  | null;

export function getPwaUpdateBlockReason(
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
  search = typeof window !== "undefined" ? window.location.search : ""
): PwaUpdateReason {
  if (isLessonFocusPath(pathname)) return "lesson";
  if (isCheckoutFlowActive(search)) return "checkout";
  if (isRewardClaimInProgress()) return "reward";

  const syncStatus = useStore.getState().cloudSyncState.status;
  if (syncStatus === "pending" || syncStatus === "loading") return "sync";

  return null;
}

export function shouldDeferPwaUpdate(
  pathname?: string,
  search?: string
): boolean {
  return getPwaUpdateBlockReason(pathname, search) !== null;
}

export function pwaUpdateBlockMessage(reason: PwaUpdateReason): string {
  switch (reason) {
    case "lesson":
      return "Termine o exercício para atualizar com segurança.";
    case "checkout":
      return "Conclua o checkout antes de atualizar.";
    case "sync":
      return "Aguardando sincronização do progresso…";
    case "reward":
      return "Aguarde o resgate de recompensa.";
    default:
      return "";
  }
}
