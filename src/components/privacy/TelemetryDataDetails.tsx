import { TELEMETRY_COLLECTED, TELEMETRY_NOT_COLLECTED } from "../../lib/privacyCopy";

export function TelemetryDataDetails() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold text-ink">Quais dados são coletados</h2>
        <p className="mt-1 text-sm leading-6 text-ink-soft">
          Eventos pedagógicos de melhoria do curso. Só são enviados se você permitir.
        </p>
      </div>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Coletado</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink">
          {TELEMETRY_COLLECTED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Não coletado</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink">
          {TELEMETRY_NOT_COLLECTED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
