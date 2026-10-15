import { useEffect } from "react";
import { fetchServerEconomy, flushEconomyIntentQueue, shouldUseServerEconomy } from "../../lib/economyServerBridge";
import { isQaTestStateActive } from "../../lib/qaFastPathAccess";
import { readOnline, subscribeNetworkStatus } from "../../lib/platform/networkStatus";

/** Sincroniza economia do servidor e reenvia intenções offline. */
export function EconomyBootstrap() {
  useEffect(() => {
    if (isQaTestStateActive()) return;
    if (!shouldUseServerEconomy()) return;

    void fetchServerEconomy();
    void flushEconomyIntentQueue();

    // RC2.3.13R.3.2.5 — the shared network signal: the Android WebView often
    // misses window "online", the Network plugin does not. Once per return.
    let wasOnline = readOnline();
    return subscribeNetworkStatus((online) => {
      if (online && !wasOnline) {
        void flushEconomyIntentQueue();
        void fetchServerEconomy();
      }
      wasOnline = online;
    });
  }, []);

  return null;
}
