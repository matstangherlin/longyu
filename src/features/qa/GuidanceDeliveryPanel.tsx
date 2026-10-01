import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/primitives";
import { useStore } from "../../lib/store";
import { useFeatureVisibility } from "../../hooks/useProgressiveDiscovery";
import { EMPTY_GUIDANCE_SESSION, GUIDANCE_BY_ID, explainGuidance, pendingGuidance, resetGuidanceState, type GuidanceContext } from "../../lib/guidanceOrchestrator";
import { getGuidanceSession, guidanceDeliveryTrace, startNewGuidanceSession, useGuidanceRuntime } from "../../components/guidance/guidanceRuntime";
import { isNativeApp } from "../../lib/platform/nativePlatform";

/**
 * RC2.2.23 — GUIDANCE DELIVERY em /qa/device (só em builds de QA).
 *
 * Responde "por que a dica não apareceu?": o que está elegível, a próxima
 * planejada, o motivo de cada pendente não ter saído (reason code) e a trilha
 * real de entrega (selecionada → renderizada → visível → mostrada). Os botões
 * existem SÓ aqui, nunca em produção.
 */
export function GuidanceDeliveryPanel() {
  const navigate = useNavigate();
  const guidance = useStore((s) => s.guidance);
  const updateGuidance = useStore((s) => s.updateGuidance);
  const { visibility, learner, ready } = useFeatureVisibility();
  const runtime = useGuidanceRuntime();
  const [showPending, setShowPending] = useState(true);
  const [tick, setTick] = useState(0);

  const context = useMemo<GuidanceContext | null>(() => {
    if (!ready || !guidance) return null;
    return {
      now: Date.now(),
      pathname: "/qa/device",
      visibility,
      learner,
      state: guidance,
      session: getGuidanceSession(),
      activeLearning: false,
      inputFocused: false,
      otherCeremonyActive: false,
      anchorsPresent: new Set<string>(),
      isNative: isNativeApp(),
      notificationPermissionPromptable: false,
      recentToneConfusions: 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick`/`runtime` forçam a releitura
  }, [ready, guidance, visibility, learner, tick, runtime.session]);

  const pending = context ? pendingGuidance(context) : [];
  const next = pending[0] ?? null;
  // Motivo de cada pendente na PRÓPRIA superfície, com a sessão real (orçamento etc.).
  const blocked = context
    ? pending.map((item) => {
        const onSurface = explainGuidance({ ...context, pathname: item.surface, anchorsPresent: new Set([GUIDANCE_BY_ID.get(item.guidanceId)?.anchor ?? ""]) }).find((row) => row.guidanceId === item.guidanceId);
        return { ...item, reasonCode: onSurface?.reasonCode ?? null };
      })
    : [];
  const trace = guidanceDeliveryTrace().slice(-20).reverse();

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-guidance-delivery" data-guidance-initialized={guidance?.initialized ? "yes" : "no"} data-guidance-enabled={guidance?.enabled === false ? "no" : "yes"}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">GUIDANCE DELIVERY</h2>
        <Button type="button" size="sm" variant="outline" onClick={() => setTick((value) => value + 1)}>
          Atualizar
        </Button>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 font-mono text-[11px] text-ink-soft">
        <dt className="text-ink-faint">Dicas guiadas</dt>
        <dd>{!guidance?.initialized ? "NOT_INITIALIZED" : guidance.enabled === false ? "DISABLED" : "ligadas"}</dd>
        <dt className="text-ink-faint">Na tela agora</dt>
        <dd data-testid="qa-guidance-current">{runtime.current ? `${runtime.current.definition.id}${runtime.current.anchorFallback ? " (card sem âncora)" : ""}` : "—"}</dd>
        <dt className="text-ink-faint">Sessão</dt>
        <dd>
          mostradas {runtime.session.shownIds.length} · adiadas {runtime.session.snoozedIds.length} · sem âncora {(runtime.session.anchorMisses ?? []).length}
        </dd>
        <dt className="text-ink-faint">Current eligible</dt>
        <dd>{blocked.filter((item) => item.reasonCode === null).map((item) => item.guidanceId).join(", ") || "—"}</dd>
        <dt className="text-ink-faint">Next planned</dt>
        <dd data-testid="qa-guidance-next">{next ? `${next.guidanceId} → ${next.surface}` : "— (nenhuma pendente)"}</dd>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setShowPending((value) => !value)} data-testid="qa-guidance-list">
          Listar dicas pendentes
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!next}
          data-testid="qa-guidance-show-next"
          onClick={() => {
            if (!next) return;
            // Sessão nova (orçamento zerado) e vai para a superfície da próxima.
            startNewGuidanceSession();
            navigate(next.surface);
          }}
        >
          Mostrar próxima dica
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="qa-guidance-reset"
          onClick={() => {
            updateGuidance((state) => resetGuidanceState(state));
            startNewGuidanceSession();
            setTick((value) => value + 1);
          }}
        >
          Resetar guidance de QA
        </Button>
      </div>

      {showPending && (
        <>
          <h3 className="mt-3 text-[12px] font-semibold text-ink">Pendentes (Blocked because)</h3>
          <ol className="mt-1 space-y-0.5 font-mono text-[11px] text-ink-soft" data-testid="qa-guidance-pending">
            {blocked.length === 0 ? <li>— nenhuma dica pendente —</li> : null}
            {blocked.map((item) => (
              <li key={item.guidanceId} data-guidance-pending={item.guidanceId} data-guidance-reason={item.reasonCode ?? "ELIGIBLE"}>
                {item.guidanceId} · {item.surface} · {item.status} · {item.reasonCode ?? "elegível lá"}
              </li>
            ))}
          </ol>
        </>
      )}

      <h3 className="mt-3 text-[12px] font-semibold text-ink">Trilha de entrega</h3>
      <ol className="mt-1 max-h-40 overflow-auto font-mono text-[11px] text-ink-soft" data-testid="qa-guidance-trace">
        {trace.length === 0 ? <li>—</li> : null}
        {trace.map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            {new Date(entry.at).toISOString().slice(11, 19)} · {entry.guidanceId} · {entry.stage}
            {entry.reasonCode ? ` · ${entry.reasonCode}` : ""}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-ink-faint">
        Sessão vazia de referência: {JSON.stringify(EMPTY_GUIDANCE_SESSION)}. Mostrar/resetar só existe aqui (QA), nunca na produção.
      </p>
    </section>
  );
}
