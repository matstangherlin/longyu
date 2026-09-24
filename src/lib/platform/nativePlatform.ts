import { Capacitor } from "@capacitor/core";

/**
 * RC2.2.10 — ponto ÚNICO que sabe em que runtime o Longyu está.
 *
 * O Android (Capacitor) é só mais um cliente do mesmo Longyu: mesmo frontend,
 * mesmo store, mesmo SRS, mesma conta. Nada fora de src/lib/platform/ lê
 * `window.Capacitor` nem chama `Capacitor.*` diretamente
 * (validate:android-platform-boundaries). Código nativo é progressive
 * enhancement: fora do app, tudo continua no caminho web.
 */
export type LongyuPlatform = "web" | "android" | "ios";

export function getPlatform(): LongyuPlatform {
  const platform = Capacitor.getPlatform();
  return platform === "android" || platform === "ios" ? platform : "web";
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAndroid(): boolean {
  return isNativeApp() && getPlatform() === "android";
}

export function isWeb(): boolean {
  return !isNativeApp();
}

/** O plugin existe NESTE runtime (web implementations não contam como nativo). */
export function isNativePluginAvailable(name: string): boolean {
  return isNativeApp() && Capacitor.isPluginAvailable(name);
}
