import { useState } from "react";
import { useStore } from "../../lib/store";
import { resetGuidanceState } from "../../lib/guidanceOrchestrator";
import { useTranslation } from "../../i18n/useTranslation";
import { HubSection } from "../layout/HubLayout";
import { Button, Card } from "../ui/primitives";
import { startNewGuidanceSession } from "./guidanceRuntime";

/**
 * RC2.2.18 · H/I — Ajustes › Aprendizagem › Dicas guiadas.
 * Desligar suprime só orientações não essenciais (erros, segurança e
 * permissões necessárias seguem aparecendo). "Rever dicas" zera o visto — nunca
 * o progresso, as áreas liberadas ou a economia.
 */
export function GuidanceSettingsCard() {
  const { t } = useTranslation();
  const enabled = useStore((s) => s.guidance?.enabled !== false);
  const updateGuidance = useStore((s) => s.updateGuidance);
  const [resetDone, setResetDone] = useState(false);

  return (
    <HubSection id="dicas-guiadas" className="scroll-mt-6" title={t("guidance.settings.title")}>
      <Card className="space-y-4 rounded-xl border-line/70 p-3.5 shadow-none" data-testid="guidance-settings">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-ink">{t("guidance.settings.title")}</div>
            <div className="text-sm text-ink-soft">{t("guidance.settings.description")}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={t("guidance.settings.title")}
            data-testid="guidance-toggle"
            onClick={() => {
              setResetDone(false);
              updateGuidance((state) => ({ ...state, enabled: !enabled }));
            }}
            className="flex h-12 w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
          >
            <span
              aria-hidden="true"
              className={["relative block h-7 w-12 rounded-full transition", enabled ? "bg-accent" : "bg-line"].join(" ")}
            >
              <span
                className={[
                  "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                  enabled ? "translate-x-5" : "translate-x-0",
                ].join(" ")}
              />
            </span>
          </button>
        </div>
        <div className="border-t border-line pt-3">
          <Button
            variant="secondary"
            size="lg"
            className="min-h-12 w-full sm:w-auto"
            data-testid="guidance-reset"
            onClick={() => {
              updateGuidance((state) => resetGuidanceState(state));
              // Sessão nova de orientação: o orçamento volta, uma dica por vez.
              startNewGuidanceSession();
              setResetDone(true);
            }}
          >
            {t("guidance.settings.reset")}
          </Button>
          {resetDone && (
            <p role="status" className="mt-2 text-sm text-ink-soft" data-testid="guidance-reset-done">
              {t("guidance.settings.resetDone")}
            </p>
          )}
        </div>
      </Card>
    </HubSection>
  );
}
