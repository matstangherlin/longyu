/**
 * RC2.3.8 — keeps the storage namespace in step with the active account.
 * Imported once at startup (before the first render reads any evidence).
 */
import { useStore } from "./store";
import { namespaceForAccount, setStorageNamespace } from "./accountStorage";

let bound = false;

export function bindAccountStorageNamespace(): void {
  if (bound) return;
  bound = true;
  setStorageNamespace(namespaceForAccount(useStore.getState().currentAccountId));
  useStore.subscribe((state, prev) => {
    if (state.currentAccountId !== prev.currentAccountId) setStorageNamespace(namespaceForAccount(state.currentAccountId));
  });
}
