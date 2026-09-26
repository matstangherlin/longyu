import { SPEECH_DIAGNOSTIC_FIELDS, recognitionProven, recordingProven, speechDiagnosticsEnabled, useSpeechDiagnostics } from "../../lib/speechDiagnostics";

/**
 * RC2.2.19 — painel DEV/QA da fala. Fechado por padrão; nunca aparece em
 * production_beta. Mostra cada elo como o aparelho respondeu e os dois
 * veredictos que o QA físico precisa (reconhecimento / gravação provados).
 */
export function SpeechDiagnosticsPanel() {
  const diagnostics = useSpeechDiagnostics();
  if (!speechDiagnosticsEnabled()) return null;
  return (
    <details className="mt-4 rounded-xl border border-dashed border-line px-3 py-2 text-[11px] text-ink-soft" data-testid="speech-diagnostics">
      <summary className="cursor-pointer select-none font-semibold">Speech diagnostics (DEV/QA)</summary>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono">
        {SPEECH_DIAGNOSTIC_FIELDS.map((field) => (
          <div key={field} className="contents" data-speech-diagnostic={field}>
            <dt>{field}</dt>
            <dd data-value={String(diagnostics[field] ?? "")}>{String(diagnostics[field] ?? "—")}</dd>
          </div>
        ))}
        <dt>recognitionProven</dt>
        <dd data-testid="speech-recognition-proven">{String(recognitionProven(diagnostics))}</dd>
        <dt>recordingProven</dt>
        <dd data-testid="speech-recording-proven">{String(recordingProven(diagnostics))}</dd>
      </dl>
    </details>
  );
}
