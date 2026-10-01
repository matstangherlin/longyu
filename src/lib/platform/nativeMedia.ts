/**
 * RC2.2.28/31 — bridge Capacitor do player canônico (LongyuMedia).
 *
 * Capacitor/registerPlugin só vivem em src/lib/platform/ (android-platform-boundaries).
 * RC2.2.31 — cancelCanonicalAudio request-aware; androidAssetPath explícito.
 */
import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { isAndroid } from "./nativePlatform";

/** Re-export — features/libs fora de platform/ usam este tipo, nunca @capacitor/core. */
export type NativeMediaListenerHandle = PluginListenerHandle;

export interface NativeMediaPlayResult {
  ok: boolean;
  state?: string;
  reason?: string;
  requestId?: string;
  mediaId?: string;
  generation?: number;
  assetPath?: string;
  ignored?: boolean;
}

export interface NativeMediaCancelResult {
  ok: boolean;
  ignored?: boolean;
  reason?: string;
  requestId?: string;
  activeRequestId?: string;
}

export interface NativeMediaPlayerState {
  state: string;
  requestId?: string;
  mediaId?: string;
  audioId?: string;
  generation?: number;
  assetPath?: string;
  isPlaying?: boolean;
  positionMs?: number;
  durationMs?: number;
  volume?: number;
  started?: boolean;
  sessionState?: string;
  errorCode?: string;
  playerMediaId?: string;
}

export interface NativeMediaPlugin {
  playCanonicalAudio(options: {
    audioId: string;
    uri: string;
    requestId: string;
    androidAssetPath?: string;
  }): Promise<NativeMediaPlayResult>;
  /** Request-aware: stale requestId → ignored STALE_REQUEST, nao para o player. */
  cancelCanonicalAudio(options: { requestId: string }): Promise<NativeMediaCancelResult>;
  /** Alias: com requestId = cancel; sem requestId = stopAll. */
  stopCanonicalAudio(options?: { requestId?: string }): Promise<NativeMediaCancelResult>;
  stopAllCanonicalAudio(): Promise<{ ok: boolean }>;
  getCanonicalPlayerState(): Promise<NativeMediaPlayerState>;
  preflightCanonicalAsset(options: {
    androidAssetPath?: string;
    uri?: string;
  }): Promise<{ ok: boolean; exists?: boolean; length?: number; reason?: string; assetPath?: string }>;
  releaseCanonicalPlayer(): Promise<{ ok: boolean }>;
  addListener(
    eventName: string,
    listener: (data: {
      requestId?: string;
      mediaId?: string;
      reason?: string;
      state?: string;
      positionMs?: number;
      isPlaying?: boolean;
      generation?: number;
    }) => void
  ): Promise<NativeMediaListenerHandle>;
}

const LongyuMedia = registerPlugin<NativeMediaPlugin>("LongyuMedia");

/** Android nativo com o plugin Media3 — único runtime que usa o bridge. */
export function usesNativeMediaPlayer(): boolean {
  return isAndroid();
}

export function getNativeMediaPlugin(): NativeMediaPlugin | null {
  return usesNativeMediaPlayer() ? LongyuMedia : null;
}
