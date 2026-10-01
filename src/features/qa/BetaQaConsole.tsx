import { useEffect, useState } from "react";
import { Button } from "../../components/ui/primitives";
import { FIRST_SESSION_LOAD_BUDGET, PERCEIVED_SPEEDS, sessionLoad, sessionLoadExceeded, type PerceivedSpeed } from "../../lib/betaQa";
import { idleLeaks, jsResourceCounters, JUSTIFIED_IDLE_RESOURCES } from "../../lib/resourceCounters";
import { nativeResourceCounters, type NativeResourceCounters } from "../../lib/platform/nativeSpeech";
import { currentAudioOwner } from "../../lib/audioArbiter";
import { recordTechEvent, techEventsSnapshot } from "../../lib/techEvents";

const SPEED_LABELS: Record<PerceivedSpeed, string> = { INSTANT: "Instantâneo", ACCEPTABLE: "Aceitável", SLOW: "Lento", FROZE: "Travou" };

/**
 * RC2.2.22 — painel do Beta QA em /qa/device:
 *  - recursos vivos (nativo + JS): em repouso, tudo 0 ou justificado;
 *  - carga da sessão (orientações, revelações, cerimônias, permissões) contra
 *    o orçamento da primeira sessão;
 *  - marcação de velocidade percebida (instantâneo/aceitável/lento/travou).
 * Só números e categorias; nada de conteúdo do aluno.
 */
export function BetaQaConsole() {
  const [native, setNative] = useState<NativeResourceCounters | null>(null);
  const [tick, setTick] = useState(0);
  const [marked, setMarked] = useState<PerceivedSpeed | null>(null);

  useEffect(() => {
    let alive = true;
    void nativeResourceCounters().then((value) => alive && setNative(value));
    return () => {
      alive = false;
    };
  }, [tick]);

  const js = jsResourceCounters();
  const counters: Record<string, number | string | undefined> = {
    activeMediaPlayers: native?.activeMediaPlayers,
    activeRecorders: native?.activeRecorders,
    activeRecognizers: native?.activeRecognizers,
    activeTtsUtterances: native?.activeTtsUtterances,
    pendingRecognitionCalls: native?.pendingRecognitionCalls,
    activeTimersCritical: (native?.activeTimersCritical ?? 0) + js.activeTimersCritical,
    activeObservers: js.activeObservers,
  };
  const owner = currentAudioOwner();
  const leaks = owner === "IDLE" ? idleLeaks(counters) : [];
  const load = sessionLoad(techEventsSnapshot());
  const over = sessionLoadExceeded(load);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-beta-console" data-idle-leaks={leaks.join(",")} data-session-over={over.join(",")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Beta QA</h2>
        <Button type="button" size="sm" variant="outline" onClick={() => setTick((value) => value + 1)} data-testid="qa-beta-refresh">
          Atualizar
        </Button>
      </div>
      <h3 className="mt-3 text-[12px] font-semibold text-ink">Recursos vivos (dono do áudio: {owner})</h3>
      <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 font-mono text-[11px] text-ink-soft">
        {Object.entries(counters).map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-ink-faint">{key}</dt>
            <dd data-qa-resource={key}>{value ?? "— (web)"}</dd>
          </div>
        ))}
      </dl>
      {leaks.length > 0 && (
        <p className="mt-2 text-[12px] font-semibold text-wrong" role="alert">
          Em repouso deveria ser 0: {leaks.join(", ")}
        </p>
      )}
      <p className="mt-1 text-[11px] text-ink-faint">Justificados em repouso: {JUSTIFIED_IDLE_RESOURCES.join("; ")}.</p>

      <h3 className="mt-3 text-[12px] font-semibold text-ink">Carga desta sessão</h3>
      <p className="font-mono text-[11px] text-ink-soft" data-testid="qa-session-load">
        orientações {load.coachmarks}/{FIRST_SESSION_LOAD_BUDGET.coachmarks} · revelações {load.unlockReveals}/{FIRST_SESSION_LOAD_BUDGET.unlockReveals} · cerimônias {load.ceremonies}/
        {FIRST_SESSION_LOAD_BUDGET.ceremonies} · permissões {load.permissions}/{FIRST_SESSION_LOAD_BUDGET.permissions}
      </p>
      {over.length > 0 && (
        <p className="mt-1 text-[12px] font-semibold text-wrong" role="alert">
          Acima do orçamento da primeira sessão: {over.join(", ")}
        </p>
      )}

      <h3 className="mt-3 text-[12px] font-semibold text-ink">Como pareceu a velocidade aqui?</h3>
      <div className="mt-1 flex flex-wrap gap-2">
        {PERCEIVED_SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={`min-h-11 rounded-full border px-3 text-xs font-medium ${marked === speed ? "border-accent bg-accent-soft text-ink" : "border-line text-ink-soft"}`}
            onClick={() => {
              setMarked(speed);
              recordTechEvent("perceived_speed", { speed });
            }}
            data-perceived-speed={speed}
          >
            {SPEED_LABELS[speed]}
          </button>
        ))}
      </div>
    </section>
  );
}
