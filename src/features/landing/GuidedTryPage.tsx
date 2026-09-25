import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { charById } from "../../data/characters";
import { chunkById } from "../../data/chunks";
import { speak } from "../../lib/tts";
import { haptic } from "../../lib/haptics";
import { Button, ButtonLink, ProgressBar } from "../../components/ui/primitives";
import { IconCheck, IconSound, IconX } from "../../components/ui/Icon";
import { Mascot } from "../../components/brand/Mascot";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * RC2.2.14 · J–P — Teste guiado de mandarim (~2 min), antes de criar conta.
 *
 * Não é Placement e não é uma lição: é uma amostra do método com o mesmo
 * conteúdo da Lição 1 (你好, 你, 好 = 女 + 子). NADA é gravado — sem aluno,
 * sem XP, estrelas, ofensiva, Qi, Pérolas, SRS ou conclusão. O estado vive só
 * neste componente e some ao sair. No fim, "Criar conta e continuar".
 */

const NIHAO = chunkById.nihao;
const NI = charById.ni;
const HAO = charById.hao;
const NV = charById.nv;
const ZI = charById.zi;
/** Distrator visual do construtor (não entra no ensino). */
const DISTRACTOR = charById.kou ?? { hanzi: "口" };

export const GUIDED_TRY_STEPS = ["listen", "explain", "meaning", "tones", "build"] as const;
type GuidedStep = (typeof GUIDED_TRY_STEPS)[number] | "done";

type Choice = { id: string; label: string; correct: boolean };

export function GuidedTryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<GuidedStep>("listen");
  const [heard, setHeard] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [built, setBuilt] = useState<string[]>([]);
  const [buildWrong, setBuildWrong] = useState(false);

  const index = step === "done" ? GUIDED_TRY_STEPS.length : GUIDED_TRY_STEPS.indexOf(step);
  const total = GUIDED_TRY_STEPS.length;

  const meaningChoices: Choice[] = useMemo(
    () => [
      { id: "hello", label: t("guidedTry.optHello"), correct: true },
      { id: "thanks", label: t("guidedTry.optThanks"), correct: false },
      { id: "bye", label: t("guidedTry.optBye"), correct: false },
    ],
    [t]
  );
  const pinyinChoices: Choice[] = useMemo(
    () => [
      { id: "ni", label: NI.pinyin, correct: false },
      { id: "hao", label: HAO.pinyin, correct: true },
      { id: "xie", label: "xiè", correct: false },
    ],
    []
  );
  const pieces = useMemo(() => [ZI.hanzi, DISTRACTOR.hanzi, NV.hanzi], []);
  const target = [NV.hanzi, ZI.hanzi];

  function go(next: GuidedStep) {
    setPicked(null);
    setStep(next);
  }

  function listen() {
    speak(NIHAO.hanzi, { rate: 0.8 });
    setHeard(true);
  }

  function choose(choice: Choice) {
    if (picked && choices(step).find((item) => item.id === picked)?.correct) return;
    setPicked(choice.id);
    haptic(choice.correct ? "answerCorrect" : "answerWrong");
  }

  function choices(current: GuidedStep): Choice[] {
    return current === "meaning" ? meaningChoices : current === "tones" ? pinyinChoices : [];
  }

  function place(piece: string) {
    if (built.length >= target.length) return;
    const expected = target[built.length];
    if (piece !== expected) {
      setBuildWrong(true);
      haptic("answerWrong");
      return;
    }
    const next = [...built, piece];
    setBuildWrong(false);
    setBuilt(next);
    haptic(next.length === target.length ? "answerCorrect" : "piecePlaced");
  }

  function finish() {
    haptic("practiceComplete");
    go("done");
  }

  const pickedChoice = choices(step).find((item) => item.id === picked);
  const answeredRight = Boolean(pickedChoice?.correct);
  const buildDone = built.length === target.length;

  const action =
    step === "listen"
      ? { label: t("guidedTry.continue"), disabled: !heard, onClick: () => go("explain") }
      : step === "explain"
        ? { label: t("guidedTry.continue"), disabled: false, onClick: () => go("meaning") }
        : step === "meaning"
          ? { label: t("guidedTry.continue"), disabled: !answeredRight, onClick: () => go("tones") }
          : step === "tones"
            ? { label: t("guidedTry.continue"), disabled: !answeredRight, onClick: () => go("build") }
            : step === "build"
              ? { label: t("guidedTry.finish"), disabled: !buildDone, onClick: finish }
              : null;

  return (
    <div className="flex min-h-dvh flex-col bg-bg" data-testid="guided-try" data-guided-step={step}>
      {step !== "done" && (
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-bg/95 px-3 pb-2 pt-[max(0.5rem,var(--app-safe-top))] backdrop-blur">
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label={t("guidedTry.exit")}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2 hover:text-ink"
          >
            <IconX width={18} height={18} />
          </button>
          <ProgressBar value={index + 1} max={total} className="h-2.5 min-w-0 flex-1" />
          <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-faint" data-guided-progress>
            {index + 1}/{total}
          </span>
        </header>
      )}

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-4 pt-2">
        {step === "listen" && (
          <section className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{t("guidedTry.listenEyebrow")}</p>
            <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">{t("guidedTry.listenTitle")}</h1>
            <button
              type="button"
              onClick={listen}
              data-guided-listen
              className="mt-6 grid h-24 w-24 place-items-center rounded-full bg-accent text-white shadow-lift transition active:scale-95"
              aria-label={t("guidedTry.listenAria")}
            >
              <IconSound width={34} height={34} />
            </button>
            {heard && (
              <div className="mt-6 animate-pop">
                <div className="hanzi text-5xl text-ink">{NIHAO.hanzi}</div>
                <div className="pinyin mt-1 text-lg text-ink-soft">{NIHAO.pinyin}</div>
                <div className="mt-1 text-sm text-ink-soft">{t("guidedTry.meaningHello")}</div>
              </div>
            )}
          </section>
        )}

        {step === "explain" && (
          <section className="flex flex-1 flex-col justify-center">
            <h1 className="font-serif text-2xl font-semibold text-ink">{t("guidedTry.explainTitle")}</h1>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <GlyphCard hanzi={NI.hanzi} pinyin={NI.pinyin} gloss={t("guidedTry.glossYou")} />
              <GlyphCard hanzi={HAO.hanzi} pinyin={HAO.pinyin} gloss={t("guidedTry.glossGood")} />
            </div>
            <p className="mt-4 text-sm leading-6 text-ink-soft">{t("guidedTry.explainLead")}</p>
          </section>
        )}

        {(step === "meaning" || step === "tones") && (
          <section className="flex flex-1 flex-col justify-center">
            {step === "meaning" ? (
              <>
                <h1 className="font-serif text-2xl font-semibold text-ink">{t("guidedTry.meaningQuestion")}</h1>
                <div className="hanzi mt-4 text-center text-5xl text-ink">{NIHAO.hanzi}</div>
              </>
            ) : (
              <>
                <h1 className="font-serif text-2xl font-semibold text-ink">{t("guidedTry.tonesTitle")}</h1>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{t("guidedTry.tonesLead")}</p>
                <p className="mt-4 text-center font-semibold text-ink">{t("guidedTry.tonesQuestion")}</p>
                <div className="hanzi mt-2 text-center text-5xl text-ink">{HAO.hanzi}</div>
              </>
            )}
            <div className="mt-5 grid gap-2" role="group" aria-label={t("guidedTry.options")}>
              {choices(step).map((choice) => {
                const state = picked === choice.id ? (choice.correct ? "right" : "wrong") : "idle";
                return (
                  <button
                    key={choice.id}
                    type="button"
                    data-guided-option={choice.id}
                    data-state={state}
                    onClick={() => choose(choice)}
                    className={[
                      "min-h-12 rounded-2xl border px-4 py-3 text-left text-base font-semibold transition",
                      state === "right" && "border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]",
                      state === "wrong" && "longyu-error-shake border-transparent bg-wrong-soft text-wrong",
                      state === "idle" && "border-line bg-surface text-ink hover:bg-surface-2",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className={step === "tones" ? "pinyin" : undefined}>{choice.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 min-h-5 text-sm text-ink-soft" role="status" aria-live="polite">
              {pickedChoice ? (pickedChoice.correct ? t("guidedTry.right") : t("guidedTry.tryAgain")) : ""}
            </p>
          </section>
        )}

        {step === "build" && (
          <section className="flex flex-1 flex-col justify-center">
            <h1 className="font-serif text-2xl font-semibold text-ink">{t("guidedTry.buildTitle")}</h1>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{t("guidedTry.buildLead")}</p>
            <div className="mt-5 flex items-center justify-center gap-2" data-guided-slots>
              {target.map((_, slot) => (
                <span
                  key={slot}
                  className={[
                    "hanzi grid h-20 w-20 place-items-center rounded-2xl border-2 text-4xl",
                    built[slot] ? "border-accent bg-accent-soft text-ink" : "border-dashed border-line text-ink-faint",
                  ].join(" ")}
                >
                  {built[slot] ?? ""}
                </span>
              ))}
              <span className="px-1 text-2xl text-ink-faint">=</span>
              <span className={["hanzi grid h-20 w-20 place-items-center rounded-2xl text-4xl", buildDone ? "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]" : "text-ink-faint"].join(" ")}>
                {buildDone ? HAO.hanzi : "?"}
              </span>
            </div>
            <div className="mt-5 flex justify-center gap-3">
              {pieces.map((piece) => (
                <button
                  key={piece}
                  type="button"
                  data-guided-piece={piece}
                  disabled={built.includes(piece) || buildDone}
                  onClick={() => place(piece)}
                  className="hanzi grid h-16 w-16 place-items-center rounded-2xl border border-line bg-surface text-3xl text-ink shadow-card transition active:scale-95 disabled:opacity-40"
                >
                  {piece}
                </button>
              ))}
            </div>
            <p className="mt-3 min-h-5 text-center text-sm text-ink-soft" role="status" aria-live="polite">
              {buildDone ? t("guidedTry.buildDone") : buildWrong ? t("guidedTry.buildHint") : ""}
            </p>
          </section>
        )}

        {step === "done" && (
          <section className="flex flex-1 flex-col justify-center pt-[var(--app-safe-top)]" data-testid="guided-try-done">
            <div className="flex justify-center">
              <Mascot size={96} variant="wave" />
            </div>
            <h1 className="mt-3 text-center font-serif text-2xl font-semibold text-ink">{t("guidedTry.doneTitle")}</h1>
            <ul className="mt-5 grid gap-2">
              {[
                t("guidedTry.learnedNihao"),
                t("guidedTry.learnedParts"),
                t("guidedTry.learnedTones"),
                t("guidedTry.learnedBuild"),
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 rounded-2xl border border-line/70 bg-surface px-3.5 py-3 text-sm text-ink">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]">
                    <IconCheck width={12} height={12} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center text-xs leading-5 text-ink-faint">{t("guidedTry.nothingSaved")}</p>
          </section>
        )}
      </main>

      <div className="sticky bottom-0 mx-auto w-full max-w-md bg-bg/95 px-4 pb-[calc(var(--app-safe-bottom)+1rem)] pt-2 backdrop-blur">
        {action ? (
          <Button size="lg" className="w-full" disabled={action.disabled} onClick={action.onClick} data-guided-action>
            {action.label}
          </Button>
        ) : (
          <div className="grid gap-2">
            <ButtonLink to="/comecar" size="lg" className="w-full shadow-lift" data-guided-create-account>
              {t("guidedTry.createAccount")}
            </ButtonLink>
            <Link to="/" className="inline-flex min-h-12 items-center justify-center text-sm font-semibold text-ink-soft">
              {t("guidedTry.backHome")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function GlyphCard({ hanzi, pinyin, gloss }: { hanzi: string; pinyin: string; gloss: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(hanzi, { rate: 0.8 })}
      className="rounded-2xl border border-line bg-surface p-4 text-center shadow-card transition active:scale-[0.98]"
    >
      <div className="hanzi text-4xl text-ink">{hanzi}</div>
      <div className="pinyin mt-1 text-sm text-ink-soft">{pinyin}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{gloss}</div>
    </button>
  );
}
