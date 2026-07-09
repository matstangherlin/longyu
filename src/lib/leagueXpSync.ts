import { useStore } from "./store";
import { addLeagueWeeklyXpOnServer } from "../services/leagueService";

/** Envia XP semanal ao servidor quando a conta está autenticada na nuvem. */
export function syncLeagueXpToServer(amount: number, sourceKey: string): void {
  const inc = Math.max(0, Math.round(amount));
  if (inc <= 0) return;

  const key = sourceKey.trim();
  if (key.length < 3) return;

  const { accounts, currentAccountId } = useStore.getState();
  if (accounts[currentAccountId]?.authMode !== "cloud") return;

  void addLeagueWeeklyXpOnServer(inc, key);
}
