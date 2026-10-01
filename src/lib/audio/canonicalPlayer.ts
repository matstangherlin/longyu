/**
 * RC2.2.28 — player canônico (Web HTMLAudioElement + Android Media3 bridge).
 *
 * Contrato:
 *   playCanonicalAudio({ audioId, uri, requestId })
 *
 * Estados: IDLE → PREPARING → READY → PLAYING → ENDED | ERROR
 * Eventos: AUDIO_READY | AUDIO_STARTED | AUDIO_ENDED | AUDIO_ERROR
 * Correlação: sempre requestId.
 *
 * Um player reutilizável por sessão; release só no teardown do app.
 */
import { newTtsRequestId } from "../ttsCorrelation";
import { recordTechEvent, type TechEventDetail, type TechEventName } from "../techEvents";
import { deviceQaEnabled } from "../deviceQa";
import { getNativeMediaPlugin, usesNativeMediaPlayer } from "../platform/nativeMedia";

export type CanonicalPlayerState = "IDLE" | "PREPARING" | "READY" | "PLAYING" | "ENDED" | "ERROR";

export type CanonicalAudioEvent =
  | "AUDIO_READY"
  | "AUDIO_STARTED"
  | "AUDIO_ENDED"
  | "AUDIO_ERROR";

export interface PlayCanonicalAudioInput {
  audioId: string;
  uri: string;
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
  reason: string | null;
  engine: "web-asset" | "native-media";
}

let webAudio: HTMLAudioElement | null = null;
let webRequestId: string | null = null;
let nativeListenersBound = false;
const nativeHandlers = new Map<string, {
  onStart: () => void;
  onEnd: () => void;
  onError: (reason: string) => void;
}>();

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

async function ensureNativeListeners(): Promise<void> {
  const media = getNativeMediaPlugin();
  if (nativeListenersBound || !media) return;
  nativeListenersBound = true;
  const forward = (event: CanonicalAudioEvent) => (data: { requestId?: string; reason?: string }) => {
    const id = data.requestId ?? "";
    const h = nativeHandlers.get(id);
    if (!h) return;
    if (event === "AUDIO_STARTED") h.onStart();
    else if (event === "AUDIO_ENDED") h.onEnd();
    else if (event === "AUDIO_ERROR") h.onError(data.reason ?? "NATIVE_MEDIA_ERROR");
  };
  await media.addListener("AUDIO_READY", forward("AUDIO_READY"));
  await media.addListener("AUDIO_STARTED", forward("AUDIO_STARTED"));
  await media.addListener("AUDIO_ENDED", forward("AUDIO_ENDED"));
  await media.addListener("AUDIO_ERROR", forward("AUDIO_ERROR"));
}

function playWebAsset(
  uri: string,
  requestId: string,
  onStart: () => void,
  onEnd: () => void,
  onError: (reason: string) => void
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

/**
 * Toca um asset canônico. Nunca usa TextToSpeech.
 * Promise sempre resolve (nunca rejeita sem catch do caller).
 */
export function playCanonicalAudio(input: PlayCanonicalAudioInput): Promise<CanonicalPlayOutcome> {
  const requestId = input.requestId ?? newTtsRequestId();
  const audioId = input.audioId;
  const uri = input.uri;
  const engine = usesNativeMedia() ? "native-media" : "web-asset";
  const outcome: CanonicalPlayOutcome = {
    requestId,
    audioId,
    started: false,
    ended: false,
    failed: false,
    reason: null,
    engine,
  };

  trace("audio_request_created", { requestId, audioId, engine });
  input.onState?.("PREPARING");

  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve({ ...outcome });
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
      if (!outcome.started) {
        outcome.failed = true;
        outcome.reason = "ENDED_WITHOUT_START";
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

    if (!uri) {
      onError("MISSING_URI");
      return;
    }

    input.onState?.("READY");
    input.onEvent?.("AUDIO_READY", { requestId });

    const media = getNativeMediaPlugin();
    if (media) {
      trace("audio_engine_selected", { requestId, engine: "native-media" });
      trace("audio_native_call_enter", { requestId, audioId });
      nativeHandlers.set(requestId, { onStart, onEnd, onError });
      void ensureNativeListeners()
        .then(() => media.playCanonicalAudio({ audioId, uri, requestId }))
        .then((result) => {
          if (result && result.ok === false) onError(result.reason ?? "NATIVE_MEDIA_REJECTED");
        })
        .catch((err: unknown) => {
          onError(err instanceof Error ? err.message : "NATIVE_MEDIA_BRIDGE_FAILED");
        })
        .finally(() => {
          // cleanup handler after settle window
          setTimeout(() => nativeHandlers.delete(requestId), 15_000);
        });
      return;
    }

    trace("audio_engine_selected", { requestId, engine: "web-asset" });
    playWebAsset(uri, requestId, onStart, onEnd, onError);
  });
}

export async function stopCanonicalAudio(requestId?: string): Promise<void> {
  const media = getNativeMediaPlugin();
  if (media) {
    try {
      await media.stopCanonicalAudio({ requestId });
    } catch {
      /* ignore */
    }
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
