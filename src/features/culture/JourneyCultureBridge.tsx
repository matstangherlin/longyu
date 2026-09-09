import { useMemo, useState } from "react";
import {
  cultureText,
  type CultureChoiceOption,
} from "../../data/cultureQuest";
import type { CultureJourneyBridge } from "../../data/cultureJourneyBridges";
import { Button } from "../../components/ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";
import { CultureBeat, CultureVisual } from "./CultureQuestVisuals";

export function JourneyCultureBridgePanel({
  bridge,
  recall,
  onFinished,
}: {
  bridge: CultureJourneyBridge;
  recall: boolean;
  onFinished: (result: { taught: boolean; taskCorrect: boolean }) => void;
}) {
  const { t, instructionLocale } = useTranslation();
  const locale = instructionLocale;
  const [phase, setPhase] = useState<"teach" | "task" | "feedback">(recall ? "task" : "teach");
  const [selected, setSelected] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [ok, setOk] = useState(false);

  const selectedOption: CultureChoiceOption | undefined = bridge.options?.find((option) => option.id === selected);
  const sequenceReady = (bridge.sequence?.length ?? 0) > 0 && order.length === (bridge.sequence?.length ?? 0);

  const grade = useMemo(() => {
    if (bridge.sequenceCorrect) return bridge.sequenceCorrect.join() === order.join();
    return Boolean(selectedOption?.preferred);
  }, [bridge.sequenceCorrect, order, selectedOption]);

  function onContinue() {
    if (phase === "teach") {
      setPhase("task");
      return;
    }
    if (phase === "task") {
      const correct = grade;
      setOk(correct);
      setPhase("feedback");
      return;
    }
    onFinished({ taught: !recall, taskCorrect: ok });
  }

  const ctaDisabled =
    phase === "task" &&
    ((bridge.sequence ? !sequenceReady : !selected));

  return (
    <div className="space-y-3" data-testid="culture-bridge" data-concept-id={bridge.cultureConceptId} data-item-id={bridge.cultureItemId}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
        {t("culture.bridgeEyebrow")}
      </p>
      <h2 className="font-serif text-xl font-semibold text-ink">
        {recall ? t("culture.bridgeRemember") : cultureText(bridge.teachTitle, locale)}
      </h2>
      {phase === "teach" ? (
        <p className="text-sm leading-6 text-ink" data-testid="culture-bridge-teach">
          {cultureText(bridge.explanation, locale)}
        </p>
      ) : null}
      {phase !== "teach" ? (
        <>
          {recall ? (
            <p className="text-sm leading-6 text-ink-soft" data-testid="culture-bridge-recall">
              {cultureText(bridge.rememberPrompt, locale)}
            </p>
          ) : null}
          <CultureVisual kind={bridge.visual} />
          <p className="text-sm font-medium leading-6 text-ink">{cultureText(bridge.prompt, locale)}</p>
          {(bridge.beats ?? []).map((beat) => (
            <CultureBeat key={beat.id} beat={beat} locale={locale} />
          ))}
          {bridge.options ? (
            <div className="grid gap-2" data-testid="culture-bridge-options">
              {bridge.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-testid={`culture-bridge-option-${option.id}`}
                  disabled={phase === "feedback"}
                  onClick={() => setSelected(option.id)}
                  className={[
                    "min-h-11 rounded-xl border px-3 py-2 text-left text-sm",
                    selected === option.id ? "border-accent bg-accent-soft/40 text-ink" : "border-line bg-surface text-ink",
                  ].join(" ")}
                >
                  {cultureText(option.label, locale)}
                </button>
              ))}
            </div>
          ) : null}
          {bridge.sequence ? (
            <div className="grid gap-2" data-testid="culture-bridge-sequence">
              {bridge.sequence
                .filter((row) => !order.includes(row.id))
                .map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    data-testid={`culture-bridge-seq-${row.id}`}
                    className="min-h-11 rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm"
                    disabled={phase === "feedback"}
                    onClick={() => setOrder((current) => [...current, row.id])}
                  >
                    {cultureText(row.label, locale)}
                  </button>
                ))}
            </div>
          ) : null}
        </>
      ) : null}
      {phase === "feedback" ? (
        <div className="space-y-2" data-testid="culture-bridge-feedback">
          <p className="text-sm leading-6 text-ink-soft">
            {selectedOption ? cultureText(selectedOption.feedback, locale) : ok ? t("culture.checkCorrect") : t("culture.checkTryAgain")}
          </p>
          {selectedOption?.reaction ? <CultureBeat beat={selectedOption.reaction} locale={locale} /> : null}
        </div>
      ) : null}
      <Button className="min-h-12 w-full" disabled={ctaDisabled} onClick={onContinue} data-testid="culture-bridge-continue">
        {phase === "task" ? t("culture.checkAnswer") : t("culture.keepGoing")}
      </Button>
    </div>
  );
}
