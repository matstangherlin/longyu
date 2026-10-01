/**
 * RC2.2.31B — player canônico com Promise sempre terminal + READY honesto.
 *
 * READY só após AUDIO_READY nativo (Media3 STATE_READY).
 * Cancel / SUPERSEDED resolvem a Promise (nunca hang).
 * Listener handles removidos se bind parcial falhar.
 */
import { newTtsRequestId } from "../ttsCorrelation";
import { recordTechEvent, type TechEventDetail, type TechEventName } from "../techEvents";
import { deviceQaEnabled } from "../deviceQa";
import { getNativeMediaPlugin, usesNativeMediaPlayer, type NativeMediaListenerHandle } from "../platform/nativeMedia";

export type CanonicalPlayerState =
  | "IDLE"
  | "PREPARING"
  | "READY"
  | "PLAYING"
  | "ENDED"
  | "ERROR"
  | "CANCELLED"
  | "SUPERSEDED";

export type CanonicalAudioEvent =
  | "AUDIO_READY"
  | "AUDIO_STARTED"
  | "AUDIO_ENDED"
  | "AUDIO_ERROR"
  | "AUDIO_CANCELLED"
  | "AUDIO_SUPERSEDED";

export interface PlayCanonicalAudioInput {
  audioId: string;
  uri: string;
  androidAssetPath?: string;
  requestId?: string;
  onState?: (state: CanonicalPlayerState) => void;
  onEvent?: (event: CanonicalAudioEvent, detail: { requestId: string; reason?: string }) => void;
}

export interface CanonicalPlayOutcome {
  requestId: string;
  audioId: string;
  started: boolean;
  ended: boolean;
  failed: boolean;
  cancelled: boolean;
  superseded: boolean;
  reason: string | null;
  engine: "web-asset" | "native-media";
}

type ListenerBindState = "UNBOUND" | "BINDING" | "BOUND" | "FAILED";

type NativeHandler = {
  onReady: () => void;
  onStart: () => void;
  onEnd: () => void;
  onError: (reason: string) => void;
  onCancelled: (reason?: string) => void;
  onSuperseded: (reason?: string) => void;
};

let webAudio: HTMLAudioElement | null = null;
let webRequestId: string | null = null;
let nativeListenerState: ListenerBindState = "UNBOUND";
let nativeBindPromise: Promise<void> | null = null;
let nativeListenerHandles: NativeMediaListenerHandle[] = [];
const nativeHandlers = new Map<string, NativeHandler>();

function trace(event: TechEventName, detail: TechEventDetail): void {
  try {
    if (deviceQaEnabled() || import.meta.env?.DEV) {
      recordTechEvent(event, detail);
    }
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    const w = window as Window & { __longyuCanonicalAudioTrace?: unknown[] };
    w.__longyuCanonicalAudioTrace = [...(w.__longyuCanonicalAudioTrace ?? []), { at: Date.now(), event, ...detail }].slice(-80);
  }
}

function usesNativeMedia(): boolean {
  return usesNativeMediaPlayer();
}

function dropHandler(requestId: string): void {
  nativeHandlers.delete(requestId);
}

async function removeAllListenerHandles(): Promise<void> {
  const handles = nativeListenerHandles.splice(0, nativeListenerHandles.length);
  for (const h of handles) {
    try {
      await h.remove();
    } catch {
      /* ignore */
    }
  }
}

async function ensureNativeListeners(): Promise<void> {
  const media = getNativeMediaPlugin();
  if (!media) return;
  if (nativeListenerState === "BOUND") return;
  if (nativeListenerState === "BINDING" && nativeBindPromise) {
    await nativeBindPromise;
    return;
  }
  nativeListenerState = "BINDING";
  nativeBindPromise = (async () => {
    const handles: NativeMediaListenerHandle[] = [];
    try {
      const forward =
        (event: CanonicalAudioEvent) =>
        (data: { requestId?: string; reason?: string }) => {
          const id = data.requestId ?? "";
          const h = nativeHandlers.get(id);
          if (!h) return;
          if (event === "AUDIO_READY") h.onReady();
          else if (event === "AUDIO_STARTED") h.onStart();
          else if (event === "AUDIO_ENDED") h.onEnd();
          else if (event === "AUDIO_ERROR") h.onError(data.reason ?? "NATIVE_MEDIA_ERROR");
          else if (event === "AUDIO_CANCELLED") h.onCancelled(data.reason);
          else if (event === "AUDIO_SUPERSEDED") h.onSuperseded(data.reason);
        };
      handles.push(await media.addListener("AUDIO_READY", forward("AUDIO_READY")));
      handles.push(await media.addListener("AUDIO_STARTED", forward("AUDIO_STARTED")));
      handles.push(await media.addListener("AUDIO_ENDED", forward("AUDIO_ENDED")));
      handles.push(await media.addListener("AUDIO_ERROR", forward("AUDIO_ERROR")));
      handles.push(await media.addListener("AUDIO_CANCELLED", forward("AUDIO_CANCELLED")));
      handles.push(await media.addListener("AUDIO_SUPERSEDED", forward("AUDIO_SUPERSEDED")));
      nativeListenerHandles = handles;
      nativeListenerState = "BOUND";
    } catch {
      for (const h of handles) {
        try {
          await h.remove();
        } catch {
          /* ignore */
        }
      }
      nativeListenerHandles = [];
      nativeListenerState = "FAILED";
      nativeBindPromise = null;
      throw new Error("NATIVE_LISTENER_BIND_FAILED");
    }
  })();
  await nativeBindPromise;
}

function playWebAsset(
  uri: string,
  requestId: string,
  onStart: () => void,
  onEnd: () => void,
  onError: (reason: string) => void,
  onReady: () => void
): void {
  try {
    if (!webAudio) webAudio = new Audio();
    const audio = webAudio;
    webRequestId = requestId;
    audio.pause();
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    audio.oncanplaythrough = null;
    audio.src = uri;
    audio.load();
    audio.oncanplaythrough = () => {
      if (webRequestId !== requestId) return;
      onReady();
    };
    audio.onplaying = () => {
      if (webRequestId !== requestId) return;
      onStart();
    };
    audio.onended = () => {
      if (webRequestId !== requestId) return;
      onEnd();
    };
    audio.onerror = () => {
      if (webRequestId !== requestId) return;
      onError("ASSET_PLAYBACK_FAILED");
    };
    void audio.play().catch(() => onError("ASSET_PLAYBACK_BLOCKED"));
  } catch {
    onError("ASSET_PLAYBACK_FAILED");
  }
}

export function playCanonicalAudio(input: PlayCanonicalAudioInput): Promise<CanonicalPlayOutcome> {
  const requestId = input.requestId ?? newTtsRequestId();
  const audioId = input.audioId;
  const uri = input.uri;
  const androidAssetPath = input.androidAssetPath;
  const engine = usesNativeMedia() ? "native-media" : "web-asset";
  const outcome: CanonicalPlayOutcome = {
    requestId,
    audioId,
    started: false,
    ended: false,
    failed: false,
    cancelled: false,
    superseded: false,
    reason: null,
    engine,
  };

  trace("audio_request_created", { requestId, audioId, engine, androidAssetPath });
  input.onState?.("PREPARING");

  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      dropHandler(requestId);
      resolve({ ...outcome });
    };
    const onReady = () => {
      if (settled) return;
      input.onState?.("READY");
      input.onEvent?.("AUDIO_READY", { requestId });
    };
    const onStart = () => {
      if (settled || outcome.started) return;
      outcome.started = true;
      input.onState?.("PLAYING");
      input.onEvent?.("AUDIO_STARTED", { requestId });
      trace("audio_native_call_return", { requestId, audioId, phase: "started" });
    };
    const onEnd = () => {
      if (settled) return;
      // RC2.2.31C — READY/ENDED alone are NOT audible proof. Native must emit
      // AUDIO_STARTED (isPlaying or positionMs proof). Otherwise PLAYBACK_NOT_CONFIRMED.
      if (!outcome.started) {
        outcome.failed = true;
        outcome.reason = "PLAYBACK_NOT_CONFIRMED";
        input.onState?.("ERROR");
        input.onEvent?.("AUDIO_ERROR", { requestId, reason: outcome.reason });
        settle();
        return;
      }
      outcome.ended = true;
      input.onState?.("ENDED");
      input.onEvent?.("AUDIO_ENDED", { requestId });
      settle();
    };
    const onError = (reason: string) => {
      if (settled) return;
      outcome.failed = true;
      outcome.reason = reason;
      input.onState?.("ERROR");
      input.onEvent?.("AUDIO_ERROR", { requestId, reason });
      settle();
    };
    const onCancelled = (reason?: string) => {
      if (settled) return;
      outcome.cancelled = true;
      outcome.reason = reason ?? "CANCELLED";
      input.onState?.("CANCELLED");
      input.onEvent?.("AUDIO_CANCELLED", { requestId, reason: outcome.reason });
      settle();
    };
    const onSuperseded = (reason?: string) => {
      if (settled) return;
      outcome.superseded = true;
      outcome.reason = reason ?? "SUPERSEDED";
      input.onState?.("SUPERSEDED");
      input.onEvent?.("AUDIO_SUPERSEDED", { requestId, reason: outcome.reason });
      settle();
    };

    if (!uri && !androidAssetPath) {
      onError("MISSING_URI");
      return;
    }

    const media = getNativeMediaPlugin();
    if (media) {
      // READY só depois de AUDIO_READY nativo — nunca pré-nativo.
      trace("audio_engine_selected", { requestId, engine: "native-media" });
      trace("audio_native_call_enter", { requestId, audioId, androidAssetPath });
      nativeHandlers.set(requestId, { onReady, onStart, onEnd, onError, onCancelled, onSuperseded });
      const bind =
        nativeListenerState === "FAILED"
          ? ((nativeListenerState = "UNBOUND"), ensureNativeListeners())
          : ensureNativeListeners();
      void bind
        .then(() =>
          media.playCanonicalAudio({
            audioId,
            uri: uri || `/${androidAssetPath ?? ""}`,
            requestId,
            androidAssetPath,
          })
        )
        .then((result) => {
          if (result && result.ok === false) onError(result.reason ?? "NATIVE_MEDIA_REJECTED");
        })
        .catch((err: unknown) => {
          onError(err instanceof Error ? err.message : "NATIVE_MEDIA_BRIDGE_FAILED");
        });
      return;
    }

    trace("audio_engine_selected", { requestId, engine: "web-asset" });
    playWebAsset(uri, requestId, onStart, onEnd, onError, onReady);
  });
}

export async function cancelCanonicalAudio(requestId: string): Promise<void> {
  const media = getNativeMediaPlugin();
  if (media) {
    let ignoredStale = false;
    try {
      const result = await media.cancelCanonicalAudio({ requestId });
      // STALE_REQUEST: B já é ativo — só fechar Promise de A se o handler ainda existir.
      ignoredStale = Boolean(result?.ignored);
    } catch {
      /* ignore */
    }
    // Se o nativo não emitir CANCELLED (stale/miss), ainda termina Promise local de A.
    const h = nativeHandlers.get(requestId);
    if (h) h.onCancelled(ignoredStale ? "STALE_REQUEST" : "CANCELLED_LOCAL");
    return;
  }
  if (webAudio && webRequestId === requestId) {
    try {
      webAudio.pause();
      webAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}

/** @deprecated prefer cancelCanonicalAudio(requestId) or stopAllCanonicalAudio() */
export async function stopCanonicalAudio(requestId?: string): Promise<void> {
  if (requestId) {
    await cancelCanonicalAudio(requestId);
    return;
  }
  await stopAllCanonicalAudio();
}

export async function stopAllCanonicalAudio(): Promise<void> {
  const media = getNativeMediaPlugin();
  if (media) {
    try {
      if (typeof media.stopAllCanonicalAudio === "function") {
        await media.stopAllCanonicalAudio();
      } else {
        await media.stopCanonicalAudio();
      }
    } catch {
      /* ignore */
    }
    for (const [id, h] of nativeHandlers) {
      h.onCancelled("STOP_ALL");
      void id;
    }
    nativeHandlers.clear();
    return;
  }
  if (webAudio) {
    try {
      webAudio.pause();
      webAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}

export async function releaseCanonicalPlayer(): Promise<void> {
  const media = getNativeMediaPlugin();
  if (media) {
    try {
      await media.releaseCanonicalPlayer();
    } catch {
      /* ignore */
    }
    for (const [, h] of nativeHandlers) h.onCancelled("RELEASE");
    nativeHandlers.clear();
    await removeAllListenerHandles();
    nativeListenerState = "UNBOUND";
    nativeBindPromise = null;
    return;
  }
  if (webAudio) {
    try {
      webAudio.pause();
      webAudio.src = "";
    } catch {
      /* ignore */
    }
    webAudio = null;
  }
}

/** QA forensics helpers */
export function canonicalHandlerCount(): number {
  return nativeHandlers.size;
}

export function canonicalListenerBindState(): ListenerBindState {
  return nativeListenerState;
}
