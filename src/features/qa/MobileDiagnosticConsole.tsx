import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/primitives";
import type { DeviceQaBuildInfo } from "../../lib/deviceQa";
import { buildMobileDiagnostic, lastNavigation, lastTechEventState, webViewVersionFromUserAgent, type MobileDiagnosticInput } from "../../lib/mobileDiagnostics";
import { techEventsSnapshot, techCaptureInstalled, TECH_EVENT_LIMIT } from "../../lib/techEvents";
import { currentAudioOwner } from "../../lib/audioArbiter";
import { getNativeTtsUnavailableReason, isTTSAvailable, usesNativeVoice } from "../../lib/tts";
import { currentRecognitionCapability, recognitionDiagnosticsSnapshot } from "../../lib/speech";
import { useSpeechDiagnostics } from "../../lib/speechDiagnostics";
import { nativePracticeAudioDiagnostics, type NativePracticeAudioDiagnostics } from "../../lib/platform/nativeSpeech";

/**
 * RC2.2.21 — console de diagnóstico mobile (/qa/device).
 *
 * Mostra o estado técnico do aparelho AGORA (build, WebView, viewport, safe
 * areas, teclado, rede, ciclo de vida, rota, áudio, TTS, microfone,
 * reconhecimento, gravação/reprodução) e os últimos eventos técnicos (máx.
 * 150, só na memória). "Copiar diagnóstico" gera JSON sanitizado: sem e-mail,
 * nome, senha, OTP, token, texto do aluno, gravação ou transcrição.
 */
function readSafeAreas(probe: HTMLDivElement | null): { top: number | null; bottom: number | null } {
  if (!probe || typeof getComputedStyle === "undefined") return { top: null, bottom: null };
  const style = getComputedStyle(probe);
  const top = Number.parseFloat(style.paddingTop);
  const bottom = Number.parseFloat(style.paddingBottom);
  return { top: Number.isFinite(top) ? top : null, bottom: Number.isFinite(bottom) ? bottom : null };
}

function keyboardState(): "open" | "closed" | "unknown" {
  if (typeof document === "undefined") return "unknown";
  if (document.documentElement.dataset.nativeKeyboard === "open") return "open";
  const viewport = typeof window !== "undefined" ? window.visualViewport : null;
  if (!viewport) return "unknown";
  return window.innerHeight - viewport.height > 150 ? "open" : "closed";
}

export function MobileDiagnosticConsole({ build }: { build: DeviceQaBuildInfo }) {
  const speech = useSpeechDiagnostics();
  const probeRef = useRef<HTMLDivElement | null>(null);
  const [tick, setTick] = useState(0);
  const [practiceAudio, setPracticeAudio] = useState<NativePracticeAudioDiagnostics | null>(null);
  const [copied, setCopied] = useState<"idle" | "ok" | "failed">("idle");

  useEffect(() => {
    let alive = true;
    void nativePracticeAudioDiagnostics().then((value) => alive && setPracticeAudio(value));
    return () => {
      alive = false;
    };
  }, [tick]);

  const input = useMemo<MobileDiagnosticInput>(() => {
    const events = techEventsSnapshot();
    const safe = readSafeAreas(probeRef.current);
    const viewport = typeof window !== "undefined" ? window.visualViewport : null;
    const recognition = recognitionDiagnosticsSnapshot();
    const volume =
      practiceAudio && typeof practiceAudio.mediaVolumeCurrent === "number"
        ? `${practiceAudio.mediaVolumeCurrent}/${practiceAudio.mediaVolumeMax ?? "?"}${practiceAudio.mediaMuted ? " (mudo)" : ""}`
        : speech.mediaVolume;
    return {
      build: {
        // SHA curto: o completo parece token para o sanitizador.
        buildSha: build.buildSha ? build.buildSha.slice(0, 12) : null,
        versionName: build.versionName,
        versionCode: build.versionCode,
        packageName: build.packageName,
        runtime: build.runtime,
      },
      device: {
        androidVersion: build.androidVersion,
        webViewVersion: webViewVersionFromUserAgent(typeof navigator !== "undefined" ? navigator.userAgent : ""),
        viewport: typeof window !== "undefined" ? { width: window.innerWidth, height: window.innerHeight } : null,
        visualViewport: viewport ? { width: Math.round(viewport.width), height: Math.round(viewport.height) } : null,
        devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : null,
        safeAreaTop: safe.top,
        safeAreaBottom: safe.bottom,
      },
      state: {
        keyboard: keyboardState(),
        network: typeof navigator === "undefined" ? "unknown" : navigator.onLine ? "online" : "offline",
        lifecycle: typeof document === "undefined" ? "unknown" : document.visibilityState === "hidden" ? "hidden" : "visible",
        route: typeof location !== "undefined" ? location.pathname : "",
        lastNavigation: lastNavigation(events),
      },
      audio: {
        owner: currentAudioOwner(),
        engine: usesNativeVoice() ? "android-native" : "web",
        ttsAvailable: isTTSAvailable(),
        ttsReason: getNativeTtsUnavailableReason(),
        microphone: recognition.microphonePermission,
        speechService: recognition.recognitionService,
        zhCnSupport: recognition.zhCnSupport,
        recognitionCapability: currentRecognitionCapability(),
        recognizerKind: speech.recognizerKind,
        recordingState: practiceAudio?.state ?? lastTechEventState(events, "recording_"),
        playbackState: lastTechEventState(events, "playback_"),
        outputRoute: practiceAudio?.outputRoute ?? speech.outputRoute,
        mediaVolume: volume,
      },
      events,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` força a releitura do aparelho
  }, [build, speech, practiceAudio, tick]);

  const diagnostic = useMemo(() => buildMobileDiagnostic(input), [input]);
  const text = JSON.stringify(diagnostic, null, 2);
  const rows: [string, string][] = [
    ["BUILD SHA", input.build.buildSha ?? "—"],
    ["versionName", input.build.versionName ?? "—"],
    ["versionCode", input.build.versionCode != null ? String(input.build.versionCode) : "—"],
    ["package", input.build.packageName ?? "—"],
    ["Android", input.device.androidVersion ?? "—"],
    ["WebView", input.device.webViewVersion ?? "—"],
    ["viewport", input.device.viewport ? `${input.device.viewport.width}×${input.device.viewport.height}` : "—"],
    ["DPR", input.device.devicePixelRatio != null ? String(input.device.devicePixelRatio) : "—"],
    ["safe-area", `topo ${input.device.safeAreaTop ?? "?"} · base ${input.device.safeAreaBottom ?? "?"}`],
    ["teclado", input.state.keyboard],
    ["rede", input.state.network],
    ["ciclo de vida", input.state.lifecycle],
    ["rota", input.state.route],
    ["última navegação", input.state.lastNavigation ?? "—"],
    ["dono do áudio", input.audio.owner],
    ["motor de áudio", input.audio.engine],
    ["TTS", input.audio.ttsAvailable ? "disponível" : `indisponível${input.audio.ttsReason ? ` · ${input.audio.ttsReason}` : ""}`],
    ["microfone", input.audio.microphone],
    ["serviço de fala", input.audio.speechService],
    ["zh-CN", input.audio.zhCnSupport],
    ["capacidade", input.audio.recognitionCapability],
    ["reconhecedor", input.audio.recognizerKind ?? "—"],
    ["gravação", input.audio.recordingState ?? "—"],
    ["reprodução", input.audio.playbackState ?? "—"],
    ["saída de áudio", input.audio.outputRoute ?? "—"],
    ["volume de mídia", input.audio.mediaVolume ?? "—"],
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-mobile-console" data-tech-capture={techCaptureInstalled() ? "on" : "off"}>
      {/* Sonda das safe areas: lê os MESMOS tokens que o layout usa (Capacitor + WebView). */}
      <div
        ref={probeRef}
        aria-hidden
        className="pointer-events-none invisible fixed left-0 top-0 h-0 w-0"
        style={{ paddingTop: "var(--app-safe-top, 0px)", paddingBottom: "var(--app-safe-bottom, 0px)" }}
      />
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Diagnóstico mobile</h2>
        <Button type="button" size="sm" variant="outline" onClick={() => setTick((value) => value + 1)} data-testid="qa-mobile-refresh">
          Atualizar
        </Button>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 font-mono text-[11px] text-ink-soft">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-faint">{label}</dt>
            <dd className="break-words" data-qa-mobile-field={label}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-3 text-[12px] font-semibold text-ink">
        Eventos técnicos ({input.events.length}/{TECH_EVENT_LIMIT}, só na memória)
      </h3>
      <ol className="mt-1 max-h-48 overflow-auto font-mono text-[11px] text-ink-soft" data-testid="qa-mobile-events">
        {input.events.length === 0 ? <li>—</li> : null}
        {input.events
          .slice(-40)
          .reverse()
          .map((event, index) => (
            <li key={`${event.at}-${index}`} className="break-words">
              {new Date(event.at).toISOString().slice(11, 19)} · {event.name} · {event.route}
              {event.detail ? ` · ${Object.entries(event.detail).map(([key, value]) => `${key}=${value}`).join(" ")}` : ""}
            </li>
          ))}
      </ol>
      <Button
        type="button"
        className="mt-3"
        data-testid="qa-mobile-copy"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(
            () => setCopied("ok"),
            () => setCopied("failed")
          );
        }}
      >
        {copied === "ok" ? "Diagnóstico copiado" : "Copiar diagnóstico"}
      </Button>
      {copied === "failed" && <p className="mt-1 text-[12px] text-wrong">Não deu para copiar — selecione o JSON abaixo.</p>}
      <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-surface-2 p-3 text-[10px] leading-4 text-ink-soft" data-testid="qa-mobile-json">
        {text}
      </pre>
    </section>
  );
}
