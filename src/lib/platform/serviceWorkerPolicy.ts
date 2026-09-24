import { getPlatform, type LongyuPlatform } from "./nativePlatform";

/**
 * RC2.2.10 — Service Worker só no web/PWA.
 *
 * No app Capacitor os assets já estão empacotados no APK/AAB e o update chega
 * pela loja. Um SW do PWA dentro da WebView criaria cache duplo e poderia
 * prender o app num bundle anterior ao da versão instalada. Por isso:
 * - web: registra normalmente (autoUpdate, PwaUpdateBanner);
 * - nativo: não registra e remove qualquer registro que tenha sobrado.
 */
export function shouldRegisterServiceWorker(platform: LongyuPlatform = getPlatform()): boolean {
  return platform === "web";
}

/** Nativo: desfaz registros antigos e limpa os caches do Workbox. Idempotente. */
export async function unregisterNativeServiceWorkers(): Promise<number> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return 0;
  let removed = 0;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if (await registration.unregister()) removed += 1;
    }
    if (typeof caches !== "undefined") {
      for (const key of await caches.keys()) {
        if (/workbox|longyu-i18n/i.test(key)) await caches.delete(key);
      }
    }
  } catch {
    /* sem SW / sem Cache Storage neste runtime */
  }
  return removed;
}
