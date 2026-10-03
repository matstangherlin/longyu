import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "../../components/ui/primitives";
import { useStore } from "../../lib/store";
import { getBuildIdentity, getNativeAppInfo } from "../../lib/platform/buildIdentity";
import { isNativeApp } from "../../lib/platform/nativePlatform";
import {
  DEVICE_QA_DEVICE_CLASSES,
  DEVICE_QA_EVIDENCE_TYPES,
  DEVICE_QA_STATUSES,
  DEVICE_QA_TESTS,
  deviceQaEnabled,
  deviceQaObservations,
  exportDeviceQaReport,
  loadDeviceQaRegistry,
  physicalCriticalMatrixPass,
  recordDeviceQaResult,
  sanitizeDeviceFromUserAgent,
  saveDeviceQaRegistry,
  summarizeDeviceQa,
  type DeviceQaBuildInfo,
  type DeviceQaDeviceClass,
  type DeviceQaEvidenceType,
  type DeviceQaRegistry,
  type DeviceQaResultError,
  type DeviceQaStatus,
} from "../../lib/deviceQa";
import {
  DEVICE_PERF_MARKS,
  devicePerfRegressions,
  devicePerfSnapshot,
  loadDevicePerfBaseline,
  saveDevicePerfBaseline,
  type DevicePerfBaseline,
} from "../../lib/devicePerf";
import {
  compareUpgradeSnapshots,
  loadUpgradeSnapshot,
  saveUpgradeSnapshot,
  takeUpgradeSnapshot,
  type UpgradeViolation,
} from "../../lib/upgradeContract";
import { SPEECH_DIAGNOSTIC_FIELDS, useSpeechDiagnostics } from "../../lib/speechDiagnostics";
import { signupTrace } from "../../lib/signupTrace";
import { playMandarinAudio, playbackTrace } from "../../lib/audioPlayback";
import { isTTSAvailable, usesNativeVoice } from "../../lib/tts";
import { nativeTtsPluginAvailable } from "../../lib/platform/nativeSpeech";
import { newTtsRequestId } from "../../lib/ttsCorrelation";
import { ttsDiagnosticSnapshot, type TtsAckSource } from "../../lib/ttsDiagnostic";
import { MobileDiagnosticConsole } from "./MobileDiagnosticConsole";
import { AndroidTtsForensicsPanel } from "./AndroidTtsForensicsPanel";
import { CanonicalMediaForensicsPanel } from "./CanonicalMediaForensicsPanel";
import { BetaQaConsole } from "./BetaQaConsole";
import { GuidanceDeliveryPanel } from "./GuidanceDeliveryPanel";
import { BetaIssueReporter } from "./BetaIssueReporter";
import { VisualFirstQaPanel } from "./VisualFirstQaPanel";
import { EverydayMandarinQaPanel } from "./EverydayMandarinQaPanel";

/**
 * RC2.2.20 — /qa/device: a superfície ÚNICA do QA físico.
 *
 * Só em DEV, Preview, QA Candidate, fixtures ou build com `VITE_DEVICE_QA=true`.
 * Mostra a identidade do build e do aparelho, os 12 testes físicos, os
 * tempos medidos aqui, o retrato de update (N→N+1) e as trilhas (áudio/avanço,
 * fala, cadastro). Nada é marcado sozinho: PASS exige testedAt, buildSha,
 * versionCode, classe do aparelho e tipo de evidência, e nunca vale no
 * navegador ou no emulador.
 */
export function QaDevicePage() {
  if (!deviceQaEnabled()) return <Navigate to="/" replace />;
  return <QaDeviceSurface />;
}

const ERROR_COPY: Record<DeviceQaResultError, string> = {
  UNKNOWN_STATUS: "Estado desconhecido.",
  PASS_WITHOUT_TESTED_AT: "PASS precisa da data do teste.",
  PASS_WITHOUT_BUILD_SHA: "PASS precisa do SHA do build.",
  PASS_WITHOUT_VERSION_CODE: "PASS precisa do versionCode (só existe no app Android instalado).",
  PASS_WITHOUT_DEVICE_CLASS: "PASS precisa da classe do aparelho.",
  PASS_WITHOUT_EVIDENCE: "PASS precisa do tipo de evidência.",
  PASS_ON_WEB_OR_EMULATOR: "Navegador ou emulador não é PHYSICAL PASS.",
  FAIL_WITHOUT_NOTE: "FAIL precisa de uma nota que reproduza o problema.",
  NOTE_HAS_PII: "A nota parece ter e-mail, código ou token. Descreva sem dados pessoais.",
};

function QaDeviceSurface() {
  const [registry, setRegistry] = useState<DeviceQaRegistry>(() => loadDeviceQaRegistry());
  const [build, setBuild] = useState<DeviceQaBuildInfo>(() => {
    const identity = getBuildIdentity();
    const device = sanitizeDeviceFromUserAgent(typeof navigator !== "undefined" ? navigator.userAgent : "");
    return {
      buildSha: identity.commitSha || null,
      versionName: identity.appVersion || null,
      versionCode: null,
      packageName: null,
      runtime: isNativeApp() ? "native" : "web",
      androidVersion: device.androidVersion,
      deviceModel: device.model,
      emulator: device.emulator,
    };
  });

  // No Android, versionName/versionCode/package vêm do APK instalado.
  useEffect(() => {
    let alive = true;
    void getNativeAppInfo().then((info) => {
      if (!alive || !info) return;
      setBuild((prev) => ({
        ...prev,
        versionName: info.versionName || prev.versionName,
        versionCode: info.versionCode,
        packageName: info.packageName || null,
      }));
    });
    return () => {
      alive = false;
    };
  }, []);

  const summary = summarizeDeviceQa(registry);
  const matrixPass = physicalCriticalMatrixPass(registry);

  function commit(testId: string, next: DeviceQaRegistry) {
    setRegistry(next);
    saveDeviceQaRegistry(next);
    void testId;
  }

  const report = useMemo(() => exportDeviceQaReport(registry, build), [registry, build]);
  const [copied, setCopied] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16" data-testid="qa-device" data-physical-matrix={matrixPass ? "PASS" : "NOT_PASS"}>
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">QA físico · RC2.2.20</p>
        <h1 className="font-serif text-2xl font-semibold text-ink">Testes no aparelho</h1>
        <p className="text-sm text-ink-soft">
          CODE PASS, E2E, screenshot automatizado e emulador não são PHYSICAL PASS. Registre só o que você viu e ouviu neste aparelho.
        </p>
      </header>

      <VisualFirstQaPanel />
      <EverydayMandarinQaPanel />

      <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-device-build">
        <h2 className="text-sm font-semibold text-ink">Build e aparelho</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[12px] text-ink-soft">
          <dt>BUILD SHA</dt>
          <dd data-testid="qa-device-sha">{build.buildSha ? build.buildSha.slice(0, 12) : "—"}</dd>
          <dt>versionName</dt>
          <dd>{build.versionName ?? "—"}</dd>
          <dt>versionCode</dt>
          <dd data-testid="qa-device-version-code">{build.versionCode ?? "— (só no app instalado)"}</dd>
          <dt>package</dt>
          <dd>{build.packageName ?? "—"}</dd>
          <dt>runtime</dt>
          <dd data-testid="qa-device-runtime">{build.runtime}</dd>
          <dt>Android</dt>
          <dd>{build.androidVersion ?? "—"}</dd>
          <dt>modelo</dt>
          <dd>{build.deviceModel ?? "—"}</dd>
          <dt>emulador</dt>
          <dd>{build.emulator ? "sim (não conta como físico)" : "não detectado"}</dd>
        </dl>
        {build.runtime === "web" && (
          <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[12px] text-ink-soft" data-testid="qa-device-web-warning">
            Você está no navegador: dá para ver os testes, mas PASS físico só no app Android instalado.
          </p>
        )}
      </section>

      <QaTtsProbe />
      <AndroidTtsForensicsPanel />
      <CanonicalMediaForensicsPanel />
      <GuidanceDeliveryPanel />
      <MobileDiagnosticConsole build={build} />
      <BetaQaConsole />
      <BetaIssueReporter />

      <section className="space-y-3" data-testid="qa-device-tests">
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
          {DEVICE_QA_STATUSES.map((status) => (
            <span key={status} className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-soft" data-qa-summary={status}>
              {status} · {summary[status]}
            </span>
          ))}
          <span
            className={`rounded-full px-2.5 py-1 ${matrixPass ? "bg-good-soft text-ink" : "bg-wrong-soft text-wrong"}`}
            data-testid="qa-device-matrix"
          >
            Matriz crítica: {matrixPass ? "PASS" : "não passa"}
          </span>
        </div>
        {DEVICE_QA_TESTS.map((test) => (
          <DeviceQaTestCard
            key={test.id}
            testId={test.id}
            registry={registry}
            build={build}
            onCommit={(next) => commit(test.id, next)}
          />
        ))}
      </section>

      <PerfSection />
      <UpgradeSection build={build} />
      <TraceSection />

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Exportar</h2>
        <p className="mt-1 text-[12px] text-ink-soft">
          Cole em <code>docs/release/rc2-2-20-device-matrix.json</code> (ou mande ao time). Sem e-mail, senha, código, gravação ou token.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          data-testid="qa-device-export"
          onClick={() => {
            const text = JSON.stringify(report, null, 2);
            void navigator.clipboard?.writeText(text).then(
              () => setCopied(true),
              () => setCopied(false)
            );
          }}
        >
          {copied ? "Copiado" : "Copiar JSON"}
        </Button>
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-surface-2 p-3 text-[10px] leading-4 text-ink-soft" data-testid="qa-device-json">
          {JSON.stringify(report, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function QaTtsProbe() {
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState("IDLE");
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    if (!isNativeApp() || !nativeTtsPluginAvailable()) return;
    setBusy(true);
    setCopied(false);
    setLive("REQUESTED");
    const requestId = newTtsRequestId();
    const sources = new Set<TtsAckSource>();
    try {
      const outcome = await playMandarinAudio("你好", {
        requestId,
        onTtsEvent: (event) => {
          if ((event.type === "TTS_STARTED" || event.type === "TTS_DONE") && event.source) sources.add(event.source);
          setLive(`${event.type} · ${Array.from(sources).join("/") || "waiting"}`);
        },
      });
      const snapshot = await ttsDiagnosticSnapshot({
        requestId,
        ackSources: Array.from(sources),
        audioOutcome: outcome.started ? "STARTED" : outcome.reason ?? "NOT_STARTED",
        finalDecision: outcome.started ? "CODE_CONFIRMED" : "RECOVERY_REQUIRED",
      });
      setDiagnostic(JSON.stringify(snapshot, null, 2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-y border-line py-4" data-testid="qa-tts-probe">
      <h2 className="text-sm font-semibold text-ink">Teste de TTS nativo</h2>
      <p className="mt-1 font-mono text-[11px] text-ink-soft">LongyuSpeech: {nativeTtsPluginAvailable() ? "disponível" : "indisponível"} · {live}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void run()} disabled={busy || !isNativeApp() || !nativeTtsPluginAvailable()} data-testid="qa-tts-reproduce">
          Reproduzir teste de TTS
        </Button>
        {diagnostic && (
          <Button type="button" size="sm" variant="outline" onClick={() => void navigator.clipboard?.writeText(diagnostic).then(() => setCopied(true))} data-testid="qa-tts-copy">
            {copied ? "Copiado" : "Copiar diagnóstico"}
          </Button>
        )}
      </div>
      {diagnostic && <pre className="mt-3 max-h-48 overflow-auto bg-surface-2 p-3 font-mono text-[10px] text-ink-soft" data-testid="qa-tts-diagnostic">{diagnostic}</pre>}
    </section>
  );
}

function DeviceQaTestCard({
  testId,
  registry,
  build,
  onCommit,
}: {
  testId: string;
  registry: DeviceQaRegistry;
  build: DeviceQaBuildInfo;
  onCommit: (next: DeviceQaRegistry) => void;
}) {
  const test = DEVICE_QA_TESTS.find((item) => item.id === testId)!;
  const current = registry[testId] ?? { status: "NOT_RUN" as DeviceQaStatus };
  const [status, setStatus] = useState<DeviceQaStatus>(current.status);
  const [deviceClass, setDeviceClass] = useState<DeviceQaDeviceClass | "">(current.deviceClass ?? "");
  const [evidenceType, setEvidenceType] = useState<DeviceQaEvidenceType | "">(current.evidenceType ?? "");
  const [note, setNote] = useState(current.note ?? "");
  const [errors, setErrors] = useState<DeviceQaResultError[]>([]);

  function save() {
    const { registry: next, errors: found } = recordDeviceQaResult(
      registry,
      testId,
      {
        status,
        testedAt: new Date().toISOString(),
        buildSha: build.buildSha,
        versionCode: build.versionCode,
        deviceClass: deviceClass || null,
        evidenceType: evidenceType || null,
        note,
      },
      { native: build.runtime === "native", emulator: build.emulator }
    );
    setErrors(found);
    if (!found.length) onCommit(next);
  }

  return (
    <article className="rounded-2xl border border-line bg-surface p-4" data-qa-test={testId} data-qa-status={current.status}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">{test.title}</h3>
          <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
            {testId}
            {test.critical ? " · crítico" : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{current.status}</span>
      </div>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[13px] text-ink-soft">
        {test.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-2 text-[13px] text-ink">
        <span className="font-semibold">Esperado:</span> {test.expect}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
          Estado
          <select className="mt-1 h-10 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink" value={status} onChange={(event) => setStatus(event.target.value as DeviceQaStatus)} data-qa-field="status">
            {DEVICE_QA_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
          Aparelho
          <select className="mt-1 h-10 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink" value={deviceClass} onChange={(event) => setDeviceClass(event.target.value as DeviceQaDeviceClass | "")} data-qa-field="deviceClass">
            <option value="">—</option>
            {DEVICE_QA_DEVICE_CLASSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
          Evidência
          <select className="mt-1 h-10 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value as DeviceQaEvidenceType | "")} data-qa-field="evidenceType">
            <option value="">—</option>
            {DEVICE_QA_EVIDENCE_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
        Nota (o que você viu — sem dados pessoais)
        <textarea
          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          rows={2}
          maxLength={280}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          data-qa-field="note"
        />
      </label>
      {errors.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[12px] font-medium text-wrong" role="alert" data-qa-errors={errors.join(",")}>
          {errors.map((error) => (
            <li key={error}>{ERROR_COPY[error]}</li>
          ))}
        </ul>
      )}
      <Button type="button" size="sm" className="mt-3" onClick={save} data-qa-save={testId}>
        Registrar
      </Button>
    </article>
  );
}

function PerfSection() {
  const [snapshot, setSnapshot] = useState(() => devicePerfSnapshot());
  const [baseline, setBaseline] = useState<DevicePerfBaseline | null>(() => loadDevicePerfBaseline());
  const current: DevicePerfBaseline = Object.fromEntries(
    DEVICE_PERF_MARKS.map((mark) => [mark, snapshot[mark].last ?? snapshot[mark].cold ?? undefined]).filter(([, value]) => value != null)
  );
  const regressions = baseline ? devicePerfRegressions(current, baseline) : [];
  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-device-perf">
      <h2 className="text-sm font-semibold text-ink">Tempos neste aparelho</h2>
      <p className="mt-1 text-[12px] text-ink-soft">
        Abra Jornada, uma lição, Revisão, Imersão e Atlas; volte e atualize. A base é do SEU aparelho — só regressão grande em relação a ela é apontada.
      </p>
      <table className="mt-2 w-full font-mono text-[12px] text-ink-soft">
        <thead>
          <tr className="text-left text-ink-faint">
            <th>marco</th>
            <th>frio (ms)</th>
            <th>último (ms)</th>
            <th>base</th>
          </tr>
        </thead>
        <tbody>
          {DEVICE_PERF_MARKS.map((mark) => (
            <tr key={mark} data-perf-mark={mark} data-perf-regression={regressions.includes(mark) ? "true" : "false"}>
              <td>{mark}</td>
              <td>{snapshot[mark].cold ?? "—"}</td>
              <td>{snapshot[mark].last ?? "—"}</td>
              <td>{baseline?.[mark] ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {regressions.length > 0 && (
        <p className="mt-2 text-[12px] font-semibold text-wrong" role="alert">
          Regressão grande: {regressions.join(", ")}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setSnapshot(devicePerfSnapshot())}>
          Atualizar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            saveDevicePerfBaseline(current);
            setBaseline(current);
          }}
        >
          Guardar como base
        </Button>
      </div>
    </section>
  );
}

const UPGRADE_COPY: Record<UpgradeViolation, string> = {
  JOURNEY_RESET: "Jornada voltou para trás",
  XP_DUPLICATED: "XP aumentou só com o update",
  XP_LOST: "XP diminuiu",
  PEARLS_DUPLICATED: "Pérolas aumentaram só com o update",
  PEARLS_LOST: "Pérolas diminuíram",
  REWARD_DUPLICATED: "Recompensa entregue de novo",
  SRS_RESET: "Revisão (SRS) perdeu itens ou repetições",
  MEDALS_LOST: "Medalhas sumiram",
  ACHIEVEMENTS_LOST: "Conquistas sumiram",
  GUIDANCE_RESET: "Orientações já vistas voltaram",
  FEATURE_RELOCKED: "Área liberada trancou de novo",
  SETTINGS_RESET: "Configurações voltaram ao padrão",
  SAME_BUILD: "O versionCode não aumentou (não é um update N→N+1)",
};

function UpgradeSection({ build }: { build: DeviceQaBuildInfo }) {
  const state = useStore();
  const [before, setBefore] = useState(() => loadUpgradeSnapshot());
  const [violations, setViolations] = useState<UpgradeViolation[] | null>(null);
  const snapshotNow = () => takeUpgradeSnapshot(state, { versionCode: build.versionCode, buildSha: build.buildSha });
  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-device-upgrade">
      <h2 className="text-sm font-semibold text-ink">Update N → N+1</h2>
      <p className="mt-1 text-[12px] text-ink-soft">
        1) Antes do update: guarde o retrato. 2) Atualize pela Play sem estudar no meio. 3) Volte aqui e compare. O retrato só tem contagens.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="qa-upgrade-take"
          onClick={() => {
            const snapshot = snapshotNow();
            saveUpgradeSnapshot(snapshot);
            setBefore(snapshot);
            setViolations(null);
          }}
        >
          Guardar retrato (antes)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!before}
          data-testid="qa-upgrade-compare"
          onClick={() => before && setViolations(compareUpgradeSnapshots(before, snapshotNow()))}
        >
          Comparar (depois)
        </Button>
      </div>
      {before && (
        <p className="mt-2 font-mono text-[11px] text-ink-faint">
          retrato: {before.takenAt} · versionCode {before.versionCode ?? "—"} · {before.completedLessons} lições · {before.points} XP
        </p>
      )}
      {violations && (
        <div className="mt-2 text-[13px]" data-testid="qa-upgrade-result" data-violations={violations.join(",")}>
          {violations.length === 0 ? (
            <p className="font-semibold text-ink">Nada mudou com o update.</p>
          ) : (
            <ul className="list-disc space-y-0.5 pl-5 font-medium text-wrong">
              {violations.map((violation) => (
                <li key={violation}>{UPGRADE_COPY[violation]}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function TraceSection() {
  const speech = useSpeechDiagnostics();
  const [tick, setTick] = useState(0);
  const lessonTrace = useMemo(
    () => ((typeof window !== "undefined" ? (window as Window & { __longyuLessonTrace?: { at: number; event: string; kind: string; stepIndex: number; lessonId: string }[] }).__longyuLessonTrace : undefined) ?? []).slice(-24),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` só força a releitura
    [tick]
  );
  const signup = useMemo(() => signupTrace().slice(-12), [tick]);
  const audio = useMemo(() => playbackTrace().slice(-16), [tick]);
  const observations = useMemo(() => deviceQaObservations().slice(-12), [tick]);
  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-device-traces">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Trilhas (sem PII)</h2>
        <Button type="button" size="sm" variant="outline" onClick={() => setTick((value) => value + 1)}>
          Atualizar
        </Button>
      </div>
      <h3 className="mt-3 text-[12px] font-semibold text-ink">Áudio e avanço (última lição)</h3>
      <ol className="mt-1 max-h-48 overflow-auto font-mono text-[11px] text-ink-soft">
        {lessonTrace.length === 0 ? <li>— abra uma lição —</li> : null}
        {lessonTrace.map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            {entry.event} · {entry.lessonId}#{entry.stepIndex} · {entry.kind}
          </li>
        ))}
      </ol>
      <h3 className="mt-3 text-[12px] font-semibold text-ink">Áudio (TTS)</h3>
      <p className="font-mono text-[11px] text-ink-soft" data-testid="qa-device-tts">
        caminho: {usesNativeVoice() ? "nativo (Android TTS)" : "web (speechSynthesis)"} · voz disponível: {isTTSAvailable() ? "sim" : "não"}
      </p>
      <ol className="mt-1 max-h-40 overflow-auto font-mono text-[11px] text-ink-soft">
        {audio.length === 0 ? <li>— toque um 🔊 —</li> : null}
        {audio.map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            {entry.event} · {entry.engine}
            {entry.reason ? ` · ${entry.reason}` : ""}
          </li>
        ))}
      </ol>
      <h3 className="mt-3 text-[12px] font-semibold text-ink">Fala</h3>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 font-mono text-[11px] text-ink-soft">
        {SPEECH_DIAGNOSTIC_FIELDS.map((field) => (
          <div key={field} className="contents">
            <dt>{field}</dt>
            <dd>{String(speech[field] ?? "—")}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-3 text-[12px] font-semibold text-ink">Cadastro</h3>
      <ol className="mt-1 font-mono text-[11px] text-ink-soft">
        {signup.length === 0 ? <li>—</li> : null}
        {signup.map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            {entry.stage} · {entry.outcome}
            {entry.code ? ` · ${entry.code}` : ""}
            {entry.category ? ` · ${entry.category}` : ""}
          </li>
        ))}
      </ol>
      <h3 className="mt-3 text-[12px] font-semibold text-ink">Observações</h3>
      <ol className="mt-1 font-mono text-[11px] text-ink-soft" data-testid="qa-device-observations">
        {observations.length === 0 ? <li>—</li> : null}
        {observations.map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            {entry.kind} · {entry.detail}
          </li>
        ))}
      </ol>
    </section>
  );
}
