/**
 * RC2.2.28 — bridge Capacitor do player canônico de assets (LongyuMedia).
 *
 * Capacitor/registerPlugin só vivem em src/lib/platform/ (android-platform-boundaries).
 * O player JS (`canonicalPlayer.ts`) chama estes helpers; nunca importa Capacitor.
 */
import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { isAndroid } from "./nativePlatform";

export interface NativeMediaPlayResult {
  ok: boolean;
  state?: string;
  reason?: string;
}

export interface NativeMediaPlugin {
  playCanonicalAudio(options: { audioId: string; uri: string; requestId: string }): Promise<NativeMediaPlayResult>;
  stopCanonicalAudio(options?: { requestId?: string }): Promise<{ ok: boolean }>;
  getCanonicalPlayerState(): Promise<{ state: string; requestId?: string }>;
  releaseCanonicalPlayer(): Promise<{ ok: boolean }>;
  addListener(
    eventName: string,
    listener: (data: { requestId?: string; reason?: string; state?: string }) => void
  ): Promise<PluginListenerHandle>;
}

const LongyuMedia = registerPlugin<NativeMediaPlugin>("LongyuMedia");

/** Android nativo com o plugin Media3 — único runtime que usa o bridge. */
export function usesNativeMediaPlayer(): boolean {
  return isAndroid();
}

export function getNativeMediaPlugin(): NativeMediaPlugin | null {
  return usesNativeMediaPlayer() ? LongyuMedia : null;
}
