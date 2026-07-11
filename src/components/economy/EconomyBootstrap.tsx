import { useEffect } from "react";
import { fetchServerEconomy, flushEconomyIntentQueue, shouldUseServerEconomy } from "../../lib/economyServerBridge";

/** Sincroniza economia do servidor e reenvia intenções offline. */
export function EconomyBootstrap() {
  useEffect(() => {
    if (!shouldUseServerEconomy()) return;

    void fetchServerEconomy();
    void flushEconomyIntentQueue();

    const onOnline = () => {
      void flushEconomyIntentQueue();
      void fetchServerEconomy();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
