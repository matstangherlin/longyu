import { useState } from "react";
import { Mascot } from "../../../components/brand/Mascot";
import { IconCheck } from "../../../components/ui/Icon";
import type { LessonCapsuleMicroCheck } from "../../../data/lessonCapsules";
import type { InstructionLocale } from "../../../i18n/config";
import { trackMediaEvent } from "../../../services/mediaEvents";

/**
 * V4.9.3 — Parte C2: a verificação de compreensão dentro da aula.
 *
 * Isto não é avaliação, e cada decisão aqui existe para deixar isso claro
 * para o aluno, não só para o código:
 *
 * - O apoio fica visível ANTES da resposta, não depois. Um microcheck de
 *   livro fechado seria uma prova disfarçada de aula.
 * - Errar não bloqueia nem repete: o dragão reensina em uma frase e o botão
 *   de continuar aparece do mesmo jeito. Quem errou precisa de mais aula, não
 *   de outra chance de acertar por eliminação.
 * - A resposta certa é revelada em qualquer caso. A aula não pode terminar com
 *   o aluno sem saber qual era.
 *
 * Nada daqui toca mastery, SRS, XP ou Qi. A telemetria registra tentativa e
 * acerto porque saber que 40% erram uma explicação é como se descobre que a
 * explicação está ruim — mas o número mede a AULA, nunca o aluno.
 */
export function CapsuleMicroCheck({
  check,
  locale,
  capsuleId,
  segmentId,
  onAnswered,
}: {
  check: LessonCapsuleMicroCheck;
  locale: InstructionLocale;
  capsuleId: string;
  segmentId: string;
  onAnswered: () => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const en = locale === "en";
  const answered = chosen !== null;
  const correct = chosen === check.correctIndex;

  const choose = (index: number) => {
    if (answered) return;
    setChosen(index);
    trackMediaEvent("microcheck_attempt", { capsule_id: capsuleId, segment_id: segmentId });
    if (index === check.correctIndex) {
      trackMediaEvent("microcheck_correct", { capsule_id: capsuleId, segment_id: segmentId });
    }
    onAnswered();
  };

  return (
    <div className="mt-5" data-testid="capsule-micro-check" data-answered={String(answered)}>
      <p className="text-sm font-semibold text-ink" id={`${segmentId}-prompt`}>
        {check.prompt}
      </p>

      {check.scaffold && !answered && (
        <p className="mt-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs leading-5 text-ink-soft">
          {check.scaffold}
        </p>
      )}

      <div
        className="mt-3 flex flex-col gap-2"
        role="group"
        aria-labelledby={`${segmentId}-prompt`}
      >
        {check.options.map((option, index) => {
          const isCorrect = index === check.correctIndex;
          const isChosen = index === chosen;
          // Depois de responder, a certa aparece marcada mesmo que o aluno
          // tenha escolhido outra: a aula precisa terminar com ele sabendo.
          const reveal = answered && isCorrect;
          const wrongPick = answered && isChosen && !isCorrect;
          return (
            <button
              key={option}
              type="button"
              onClick={() => choose(index)}
              disabled={answered}
              data-testid="capsule-micro-check-option"
              data-state={reveal ? "correct" : wrongPick ? "wrong" : answered ? "muted" : "idle"}
              aria-pressed={isChosen}
              className={[
                "flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left text-sm transition",
                reveal
                  ? "border-transparent bg-[rgb(var(--good)/0.16)] text-ink ring-1 ring-[rgb(var(--good)/0.45)]"
                  : wrongPick
                    ? "border-transparent bg-wrong-soft text-ink ring-1 ring-wrong/40"
                    : answered
                      ? "border-line/50 bg-surface-2 text-ink-soft"
                      : "border-line bg-surface text-ink hover:border-accent-soft",
              ].join(" ")}
            >
              <span className="min-w-0">{option}</span>
              {reveal && <IconCheck width={18} height={18} aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-3"
          data-testid="capsule-micro-check-feedback"
          data-correct={String(correct)}
          // `polite` e não `assertive`: o retorno é conversa do professor, não
          // alarme. Um leitor de tela deve terminar a frase em curso antes.
          role="status"
          aria-live="polite"
        >
          <Mascot size={44} variant={correct ? "celebrate" : "wave"} className="shrink-0" />
          <p className="min-w-0 text-sm leading-6 text-ink">
            {correct ? check.afterCorrect : check.afterWrong}
          </p>
        </div>
      )}

      {!answered && (
        <p className="mt-3 text-center text-[11px] text-ink-faint">
          {en ? "This is not scored." : "Isto não vale ponto."}
        </p>
      )}
    </div>
  );
}
