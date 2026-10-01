import { useEffect, useState } from "react";
import { Button } from "../../components/ui/primitives";
import { getBuildIdentity } from "../../lib/platform/buildIdentity";
import { isNativeApp } from "../../lib/platform/nativePlatform";
import { nativeSetTtsQaOptions, nativeTtsForensics, nativeTtsPluginAvailable, type NativeTtsForensics, type NativeTtsStopMode } from "../../lib/platform/nativeSpeech";
import { mandarinSpeechLog, requestMandarinSpeech } from "../../lib/mandarinSpeech";
import {
  buildIdentityVerdict,
  probePhrase,
  probeRow,
  runInterruptionProbe,
  runSequentialProbe,
  sequentialVerdict,
  type SequentialProbeRow,
} from "../../lib/ttsForensics";

const EXPECTED_HEAD_KEY = "longyu:qa-expected-pr-head";
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function speakProbe(index: number) {
  const handle = requestMandarinSpeech({ text: probePhrase(index), source: "QA_DIAGNOSTIC", mode: "USER_REQUESTED" });
  return { requestId: handle.requestId, done: handle.done };
}

function readExpectedHead(): string {
  try {
    return sessionStorage.getItem(EXPECTED_HEAD_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * RC2.2.27 — ANDROID TTS FORENSICS (/qa/device, só build de QA).
 *
 * Prova, no aparelho, qual request chegou, qual entrou no motor, se o motor
 * estava falando (isSpeaking), quais callbacks chegaram e por que a UI decidiu
 * o que decidiu. Sem texto falado, e-mail, nome, token, OTP ou transcrição.
 */
export function AndroidTtsForensicsPanel() {
  const identity = getBuildIdentity();
  const installedSha = identity.commitSha || null;
  const [expectedHead, setExpectedHead] = useState(readExpectedHead);
  const verdict = buildIdentityVerdict({ prHead: expectedHead || null, embeddedSha: installedSha, installedSha });
  const [forensics, setForensics] = useState<NativeTtsForensics | null>(null);
  const [stopMode, setStopMode] = useState<NativeTtsStopMode>("CONDITIONAL");
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [rows, setRows] = useState<SequentialProbeRow[]>([]);
  const [heard, setHeard] = useState<Record<number, boolean>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const native = isNativeApp() && nativeTtsPluginAvailable();

  async function refresh() {
    setForensics(await nativeTtsForensics());
  }

  useEffect(() => {
    if (!native) return;
    void nativeSetTtsQaOptions({ logs: true }).then((value) => value && setStopMode(value.stopMode));
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveExpected(value: string) {
    setExpectedHead(value);
    try {
      sessionStorage.setItem(EXPECTED_HEAD_KEY, value.trim());
    } catch {
      /* modo privado */
    }
  }

  async function changeMode(mode: NativeTtsStopMode) {
    const value = await nativeSetTtsQaOptions({ stopMode: mode, logs: true });
    if (value) setStopMode(value.stopMode);
  }

  async function runTest(name: string, body: () => Promise<string>) {
    setBusy(true);
    setLabel(name);
    setRows([]);
    setHeard({});
    setSummary(null);
    try {
      setSummary(await body());
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  const sequential = (count: number) => () =>
    runTest(`${count} falas sequenciais`, async () => {
      const result = await runSequentialProbe(count, speakProbe, (row) => setRows((prev) => [...prev, row]));
      const v = sequentialVerdict(result, count);
      return `${v.passed}/${v.total} ${v.result}`;
    });

  const interruption = () =>
    runTest("A → interromper → B", async () => {
      const out = await runInterruptionProbe(speakProbe, 350, wait);
      setRows([out.first, out.second]);
      return out.result;
    });

  const doneThenNext = () =>
    runTest("A → DONE → B", async () => {
      const result = await runSequentialProbe(2, speakProbe, (row) => setRows((prev) => [...prev, row]));
      return sequentialVerdict(result, 2).result;
    });

  const doubleTap = () =>
    runTest("A → toque duplo → B", async () => {
      const first = speakProbe(1);
      await wait(40);
      const second = speakProbe(1);
      const [a, b] = await Promise.all([first.done, second.done]);
      const last = speakProbe(2);
      const c = await last.done;
      const list = [probeRow(1, first.requestId, a), probeRow(2, second.requestId, b), probeRow(3, last.requestId, c)];
      setRows(list);
      return list[2].result === "PASS" && (a.superseded || !a.ended) ? "PASS" : "FAIL";
    });

  const dialogue = () =>
    runTest("diálogo simulado (Continuar a cada 0,6 s)", async () => {
      const handles: ReturnType<typeof speakProbe>[] = [];
      for (let index = 1; index <= 5; index += 1) {
        handles.push(speakProbe(index));
        if (index < 5) await wait(600);
      }
      const outcomes = await Promise.all(handles.map((handle) => handle.done));
      const list = outcomes.map((outcome, i) => probeRow(i + 1, handles[i].requestId, outcome));
      setRows(list);
      // Cada fala precisa ter COMEÇADO; as interrompidas pelo Continuar não precisam terminar.
      const started = list.filter((row) => row.started).length;
      return `${started}/5 começaram · última ${list[4].result}`;
    });

  async function copyDiagnostic() {
    const report = {
      build: { installedSha: installedSha?.slice(0, 12) ?? null, expectedHead: expectedHead.slice(0, 12) || null, verdict },
      stopMode,
      forensics,
      jsLog: mandarinSpeechLog(),
      test: label,
      rows,
      ownerHeard: heard,
      summary,
    };
    await navigator.clipboard?.writeText(JSON.stringify(report, null, 2)).catch(() => undefined);
    setCopied(true);
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-tts-forensics" data-build-verdict={verdict}>
      <h2 className="text-sm font-semibold text-ink">ANDROID TTS FORENSICS</h2>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px] text-ink-soft">
        <dt>Build instalado</dt>
        <dd data-testid="qa-tts-installed-sha">{installedSha ? installedSha.slice(0, 12) : "—"}</dd>
        <dt>PR HEAD</dt>
        <dd>
          <input
            value={expectedHead}
            onChange={(event) => saveExpected(event.target.value)}
            placeholder="cole o HEAD do PR"
            className="w-full rounded border border-line bg-surface-2 px-1 font-mono text-[11px]"
            data-testid="qa-tts-expected-head"
          />
        </dd>
        <dt>Identidade</dt>
        <dd data-testid="qa-tts-build-verdict" className={verdict === "MATCH" ? "text-[rgb(var(--good))]" : "text-wrong"}>
          {verdict === "MATCH" ? "MATCH" : verdict === "TEST_INVALID" ? "TEST INVALID — o APK não é o HEAD do PR" : "DESCONHECIDA — informe o HEAD"}
        </dd>
        <dt>plugin</dt>
        <dd>{native ? "disponível" : "indisponível"}</dd>
        {forensics && (
          <>
            <dt>motor</dt>
            <dd>{forensics.engine ?? "—"} · {forensics.initStatus}</dd>
            <dt>idioma</dt>
            <dd>{forensics.requestedLocale} → {forensics.voiceLocale ?? "—"} · {forensics.languageStatus}</dd>
            <dt>aparelho</dt>
            <dd>{forensics.manufacturer} {forensics.model} · API {forensics.androidApi}</dd>
            <dt>WebView</dt>
            <dd>{forensics.webView ?? "—"}</dd>
            <dt>request atual</dt>
            <dd>{forensics.currentRequestId?.slice(-10) ?? "—"} · {forensics.currentUtteranceId ?? "—"} · {forensics.currentState}</dd>
            <dt>isSpeaking</dt>
            <dd data-testid="qa-tts-is-speaking">{forensics.isSpeaking ? "true" : "false"}</dd>
            <dt>callbacks</dt>
            <dd>start {forensics.onStartCount} · done {forensics.onDoneCount} · stop {forensics.onStopCount} · erro {forensics.onErrorCount} · engine {forensics.engineSpeakingCount}</dd>
          </>
        )}
        <dt>modo de parada</dt>
        <dd>
          <select value={stopMode} onChange={(event) => void changeMode(event.target.value as NativeTtsStopMode)} disabled={!native} data-testid="qa-tts-stop-mode" className="rounded border border-line bg-surface-2 text-[11px]">
            <option value="CONDITIONAL">CONDITIONAL (stop só se falando)</option>
            <option value="EXPLICIT_STOP">MODO A — stop + speak</option>
            <option value="QUEUE_FLUSH_ONLY">MODO B — só QUEUE_FLUSH</option>
          </select>
        </dd>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || !native} onClick={() => void sequential(1)()} data-testid="qa-tts-one">Teste uma fala</Button>
        <Button size="sm" variant="outline" disabled={busy || !native} onClick={() => void sequential(5)()} data-testid="qa-tts-five">Teste 5 falas sequenciais</Button>
        <Button size="sm" variant="outline" disabled={busy || !native} onClick={() => void sequential(20)()} data-testid="qa-tts-twenty">Teste 20 falas</Button>
        <Button size="sm" variant="outline" disabled={busy || !native} onClick={() => void interruption()} data-testid="qa-tts-interrupt">Teste interrupção</Button>
        <Button size="sm" variant="outline" disabled={busy || !native} onClick={() => void doneThenNext()} data-testid="qa-tts-done-next">A → DONE → B</Button>
        <Button size="sm" variant="outline" disabled={busy || !native} onClick={() => void doubleTap()} data-testid="qa-tts-double-tap">Toque duplo</Button>
        <Button size="sm" variant="outline" disabled={busy || !native} onClick={() => void dialogue()} data-testid="qa-tts-dialogue">Teste diálogo simulado</Button>
        <Button size="sm" variant="outline" onClick={() => void copyDiagnostic()} data-testid="qa-tts-forensics-copy">{copied ? "Copiado" : "Copiar diagnóstico"}</Button>
      </div>
      {label && (
        <div className="mt-3" data-testid="qa-tts-forensics-result" data-summary={summary ?? ""}>
          <p className="text-[12px] font-semibold text-ink">{label}: {busy ? "rodando…" : summary}</p>
          <p className="text-[11px] text-ink-soft">PASS de código ≠ ouvido. Marque o que você OUVIU.</p>
          <ol className="mt-1 space-y-0.5 font-mono text-[11px] text-ink-soft">
            {rows.map((row) => (
              <li key={`${row.index}-${row.requestId}`} data-probe-result={row.result}>
                {row.index} {row.result} · {row.requestId.slice(-8)} · start {row.started ? "✓" : "✗"} · fim {row.ended ? "✓" : "✗"}{row.superseded ? " · superseded" : ""}{row.reason ? ` · ${row.reason}` : ""}
                <label className="ml-2">
                  <input type="checkbox" checked={Boolean(heard[row.index])} onChange={(event) => setHeard((prev) => ({ ...prev, [row.index]: event.target.checked }))} /> ouvi
                </label>
              </li>
            ))}
          </ol>
        </div>
      )}
      {forensics && forensics.requests.length > 0 && (
        <table className="mt-3 w-full font-mono text-[10px] text-ink-soft" data-testid="qa-tts-requests">
          <thead>
            <tr><th className="text-left">id</th><th>source</th><th>queued</th><th>engine</th><th>onStart</th><th>onDone</th><th>result</th></tr>
          </thead>
          <tbody>
            {forensics.requests.slice(-20).map((request) => (
              <tr key={request.requestId ?? ""}>
                <td>{request.requestId?.slice(-8)}</td>
                <td>{request.source ?? "—"}</td>
                <td>{request.speakAccepted ? "✓" : "✗"}</td>
                <td>{request.engineSpeaking ? "✓" : "✗"}</td>
                <td>{request.onStartAt ? "✓" : "✗"}</td>
                <td>{request.onDoneAt ? "✓" : "✗"}</td>
                <td>{request.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
