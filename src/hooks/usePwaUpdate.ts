import { useCallback, useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { flushCloudProgressPush } from "../services/cloudSyncCoordinator";
import { applyPwaUpdateNow, markPwaUpdateAvailable } from "../lib/pwaUpdateState";

export function usePwaUpdateRegistration(): void {
  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        markPwaUpdateAvailable(() => {
          void updateSW(true);
        });
      },
    });
  }, []);
}

export function usePwaUpdateActions() {
  const [applying, setApplying] = useState(false);

  const applyUpdate = useCallback(async () => {
    setApplying(true);
    try {
      await flushCloudProgressPush();
      await applyPwaUpdateNow();
    } finally {
      setApplying(false);
    }
  }, []);

  return { applying, applyUpdate };
}
