import { currentStorageNamespace } from "../accountStorage";
import { scopedEnergyStorageKey } from "../auth/accountIsolation";
import { useStore } from "../store";

/**
 * Preview/E2E only (`VITE_USE_TEST_FIXTURES=true`). Production builds drop the
 * body because the flag is statically false. Lets R-05 drive the real store
 * without a Supabase login.
 */
export function installAccountIsolationProbe(): void {
  if (import.meta.env.VITE_USE_TEST_FIXTURES !== "true" || typeof window === "undefined") return;
  const target = window as Window & { __longyuQa?: AccountIsolationProbe };
  target.__longyuQa = {
    activateCloudAccount: (identity) => useStore.getState().activateCloudAccount(identity),
    logout: () => useStore.getState().logout(),
    readProgress: () => {
      const state = useStore.getState();
      const account = state.accounts[state.currentAccountId];
      return {
        currentAccountId: state.currentAccountId,
        name: account?.name ?? "",
        username: account?.username ?? "",
        xpTotal: state.xpTotal,
        streak: state.streak,
        points: state.points,
        charges: state.dailyEnergy?.charges ?? null,
        completedLessons: state.completedLessons.length,
        accountIds: Object.keys(state.accounts),
        accountSetupComplete: state.accountSetupComplete,
      };
    },
    energyKey: (base) => scopedEnergyStorageKey(base, currentStorageNamespace()),
  };
}

export interface AccountIsolationProbe {
  activateCloudAccount: (identity: { userId: string; email?: string; name?: string }) => string;
  logout: () => void;
  readProgress: () => {
    currentAccountId: string;
    name: string;
    username: string;
    xpTotal: number;
    streak: number;
    points: number;
    charges: number | null;
    completedLessons: number;
    accountIds: string[];
    accountSetupComplete: boolean;
  };
  energyKey: (base: string) => string;
}
