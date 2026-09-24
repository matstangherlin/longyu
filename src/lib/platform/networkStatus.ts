import { isNativePluginAvailable } from "./nativePlatform";

/**
 * RC2.2.10 — consciência de rede para INFORMAR componentes (indicador
 * discreto, evitar chamadas absurdas). Não é engine offline nem certifica
 * "Longyu funciona totalmente offline"; o sync continua sendo o de sempre.
 *
 * - web: eventos online/offline do navegador (como antes);
 * - Android: além deles, o plugin Network (a WebView nem sempre dispara
 *   online/offline quando o rádio muda com o app aberto).
 */
export function readOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function subscribeNetworkStatus(onChange: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const sync = () => onChange(readOnline());
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);

  let disposed = false;
  let removeNative: (() => void) | null = null;
  if (isNativePluginAvailable("Network")) {
    void import("@capacitor/network")
      .then(async ({ Network }) => {
        const status = await Network.getStatus();
        if (!disposed) onChange(status.connected);
        const handle = await Network.addListener("networkStatusChange", (next) => onChange(next.connected));
        if (disposed) void handle.remove();
        else removeNative = () => void handle.remove();
      })
      .catch(() => {
        /* plugin indisponível: fica com os eventos do navegador */
      });
  }

  return () => {
    disposed = true;
    window.removeEventListener("online", sync);
    window.removeEventListener("offline", sync);
    removeNative?.();
  };
}
