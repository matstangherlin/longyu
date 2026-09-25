import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";
import { t as translate, type TranslateVars } from "../../i18n/catalog";
import type { MessageKey } from "../../locales/pt-BR";
import type { LessonStep } from "../../data/journey";
import { HANZI_EVOLUTIONS } from "../../data/hanziPedagogy";
import { Button, Card } from "../../components/ui/primitives";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { GlossText } from "../../components/hanzi/GlossText";
import { HanziEvolutionCard } from "../../components/hanzi/HanziEvolutionCard";
import { PracticeCompletion } from "../../components/hanzi/PracticeCompletion";
import { IconStar } from "../../components/ui/Icon";
import { StepQiProvider, StepRenderer } from "../lesson/steps";
import { LessonActionRegionProvider } from "../lesson/LessonActionRegion";
import { activeCourseDirection } from "../../lib/courseDirectionState";
import { haptic } from "../../lib/haptics";
import type { ReviewDomain } from "../../lib/srs";
import type { CourseDirectionId } from "../../i18n/courseDirection";
import {
  characterStory,
  dailyVocabularyCandidate,
  frequencyBand,
  meaningForDirection,
  practiceDistractors,
  safeExample,
  wordComponents,
  type DailyVocabularyCandidate,
} from "../../lib/dailyVocabulary";

const LEVEL_KEY: Record<string, MessageKey> = {
  seed: "dailyWord.levelSeed",
  beginner: "dailyWord.levelBeginner",
  elementary: "dailyWord.levelElementary",
  survival: "dailyWord.levelSurvival",
  review: "dailyWord.levelReview",
  advancedPreview: "dailyWord.levelAdvancedPreview",
};

const DOMAIN_KEY: Partial<Record<string, MessageKey>> = {
  saudacao: "dailyWord.domainSaudacao",
  cortesia: "dailyWord.domainCortesia",
  pessoa: "dailyWord.domainPessoa",
  familia: "dailyWord.domainFamilia",
  comida: "dailyWord.domainComida",
  bebida: "dailyWord.domainBebida",
  compras: "dailyWord.domainCompras",
  transporte: "dailyWord.domainTransporte",
  sobrevivencia: "dailyWord.domainSobrevivencia",
  tempo: "dailyWord.domainTempo",
  lugar: "dailyWord.domainLugar",
  estudo: "dailyWord.domainEstudo",
  trabalho: "dailyWord.domainTrabalho",
  numero: "dailyWord.domainNumero",
  verbo: "dailyWord.domainVerbo",
  pergunta: "dailyWord.domainPergunta",
  gostos: "dailyWord.domainGostos",
};

/** Domínios de revisão que a palavra ganha DEPOIS da prática (forma só para um caractere). */
export function dailyWordReviewDomains(candidate: DailyVocabularyCandidate): ReviewDomain[] {
  return candidate.chars.length === 1 ? ["significado", "som", "forma"] : ["significado", "som"];
}

/**
 * RC2.2.15 · AZ–BA — micro-prática com os passos REAIS da lição (StepRenderer):
 * ouvir → significado → reconhecer pelo som → lembrar. Sem motor novo.
 */
export function dailyWordPracticeSteps(
  candidate: DailyVocabularyCandidate,
  direction: CourseDirectionId,
  seed: string,
  tc: (key: MessageKey, vars?: TranslateVars) => string
): LessonStep[] {
  const meaning = meaningForDirection(candidate, direction) ?? candidate.meaningPt;
  const others = practiceDistractors(candidate, direction, seed, 2);
  const rotate = <T,>(items: T[], by: number) => items.map((_, i) => items[(i + by) % items.length]);
  const shift = candidate.id.length % 3;
  const meanings = rotate([meaning, ...others.map((other) => meaningForDirection(other, direction) ?? other.meaningPt)], shift);
  const hanzis = rotate([candidate.hanzi, ...others.map((other) => other.hanzi)], (shift + 1) % 3);
  return [
    { kind: "listen", text: candidate.hanzi, pinyin: candidate.pinyin, pt: meaning },
    { kind: "comprehend", title: tc("dailyWord.stepMeaning"), hanzi: candidate.hanzi, pinyin: candidate.pinyin, answer: meaning, options: meanings },
    {
      kind: "listen_select",
      title: tc("dailyWord.stepRecognize"),
      prompt: tc("dailyWord.recognizePrompt"),
      audioText: candidate.hanzi,
      slowAudioText: candidate.hanzi,
      options: hanzis,
      correctAnswer: candidate.hanzi,
    },
    {
      kind: "dialogue_choice",
      title: tc("dailyWord.stepRecall"),
      speaker: "Longyu",
      dialoguePrompt: tc("dailyWord.recallPrompt", { meaning }),
      options: rotate(hanzis, 1),
      correctAnswer: candidate.hanzi,
    },
  ] as LessonStep[];
}

export function DailyWordPage() {
  const { id } = useParams();
  const candidate = dailyVocabularyCandidate(id);
  const { t } = useTranslation();
  if (!candidate) {
    return (
      <Card className="mx-auto mt-6 max-w-md space-y-3 p-5 text-center" data-testid="daily-word-not-found">
        <p className="text-ink">{t("dailyWord.notFound")}</p>
        <Link to="/hanzi/atlas" className="inline-flex min-h-12 items-center justify-center font-semibold text-accent">
          {t("dailyWord.toAtlas")}
        </Link>
      </Card>
    );
  }
  return <DailyWord candidate={candidate} key={candidate.id} />;
}

function DailyWord({ candidate }: { candidate: DailyVocabularyCandidate }) {
  const { t, instructionLocale } = useTranslation();
  const navigate = useNavigate();
  const direction = activeCourseDirection() ?? "pt-zh";
  const seed = useStore((s) => s.dailyVocabulary?.seed ?? "daily");
  // Enunciados da prática no idioma do CURSO; passos estáveis enquanto a página vive.
  const practiceSteps = useMemo(
    () => dailyWordPracticeSteps(candidate, direction, seed, (key, vars) => translate(key, vars, instructionLocale)),
    [candidate, direction, seed, instructionLocale]
  );
  const meaning = meaningForDirection(candidate, direction) ?? candidate.meaningPt;
  const markOpened = useStore((s) => s.markDailyVocabularyOpened);
  const favoriteKey = `${candidate.srsRef.type}:${candidate.srsRef.itemId}`;
  const favorite = useStore((s) => (s.favoriteItems ?? []).includes(favoriteKey));
  const toggleFavorite = useStore((s) => s.toggleFavoriteItem);
  const [mode, setMode] = useState<"learn" | "practice" | "done">("learn");
  const [result, setResult] = useState<{ correct: number; total: number; xp: number; reviewAdded: number } | null>(null);

  // Abrir = só `openedAt`. Não é aprendizado, não é XP, não vibra.
  useEffect(() => {
    markOpened(candidate.id);
  }, [candidate.id, markOpened]);

  const components = useMemo(() => wordComponents(candidate, direction), [candidate, direction]);
  const stories = useMemo(() => candidate.chars.map((ch) => characterStory(ch, direction)), [candidate, direction]);
  const example = useMemo(() => safeExample(candidate, direction), [candidate, direction]);
  const band = frequencyBand(candidate);
  const domainKey = DOMAIN_KEY[candidate.domain];
  const usage = instructionLocale === "pt-BR" ? candidate.notePt : undefined;
  const single = candidate.chars.length === 1;

  if (mode === "practice") {
    return (
      <DailyWordPractice
        candidate={candidate}
        steps={practiceSteps}
        onExit={() => setMode("learn")}
        onFinished={(summary) => {
          setResult(summary);
          setMode("done");
        }}
      />
    );
  }

  if (mode === "done" && result) {
    const reviewNote = result.reviewAdded > 0 ? t("dailyWord.addedToReview") : t("dailyWord.alreadyInReview");
    return (
      <div className="px-4 pb-8" data-testid="daily-word-done" data-review-added={result.reviewAdded} data-xp={result.xp}>
        <PracticeCompletion
          roundKey={`daily-word:${candidate.id}`}
          correct={result.correct}
          total={result.total}
          xp={result.xp}
          xpCapped={result.xp === 0}
          xpCappedNote={t("dailyWord.xpOncePerDay")}
          pearls={0}
          missions={[]}
          formsReviewed={result.reviewAdded}
          reviewNote={reviewNote}
          title={t("dailyWord.doneTitle")}
          continueLabel={t("dailyWord.backToJourney")}
          onContinue={() => navigate("/jornada")}
          hubTo="/hanzi/atlas"
          hubLabel={t("dailyWord.atlas")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-8 pt-2" data-testid="daily-word" data-lexical-id={candidate.id}>
      {/* Acima da dobra: hànzì, pinyin, significado e áudio. */}
      <section className="rounded-3xl border border-line bg-surface p-5 text-center shadow-card" data-testid="daily-word-header">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{t("dailyWord.eyebrow")}</p>
        <div className="hanzi mt-2 text-6xl leading-none text-ink" data-testid="daily-word-hanzi" lang="zh-CN">
          {candidate.hanzi}
        </div>
        <Pinyin text={candidate.pinyin} className="mt-2 block font-serif text-2xl" />
        <p className="mt-1 text-lg font-medium text-ink-soft" data-testid="daily-word-meaning">
          {meaning}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <SpeakButton text={candidate.hanzi} label={t("dailyWord.listen")} size="md" />
          <button
            type="button"
            onClick={() => toggleFavorite(favoriteKey)}
            aria-pressed={favorite}
            aria-label={favorite ? t("dailyWord.unfavorite") : t("dailyWord.favorite")}
            data-testid="daily-word-favorite"
            className={["grid h-12 w-12 place-items-center rounded-full border border-line bg-surface-2", favorite ? "text-accent" : "text-ink-faint"].join(" ")}
          >
            <IconStar width={19} height={19} fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>
        <Button size="lg" className="mt-4 w-full shadow-lift" onClick={() => setMode("practice")} data-testid="daily-word-learn">
          {t("dailyWord.learn")}
        </Button>
        <Link to="/jornada" className="mt-1 inline-flex min-h-12 items-center justify-center text-sm font-semibold text-ink-soft" data-testid="daily-word-skip">
          {t("dailyWord.skip")}
        </Link>
      </section>

      {/* Componentes: sentido de cada caractere ≠ tradução literal da palavra. */}
      {!single && (
        <Card className="space-y-3 p-4" data-testid="daily-word-components">
          <h2 className="font-serif text-lg font-semibold text-ink">{t("dailyWord.components")}</h2>
          <ul className="grid grid-cols-2 gap-2">
            {components.map((part) => (
              <li key={part.hanzi} className="rounded-2xl bg-surface-2 px-3 py-2">
                <span className="hanzi text-2xl text-ink" lang="zh-CN">{part.hanzi}</span>
                {part.pinyin && <Pinyin text={part.pinyin} className="ml-2 text-sm" />}
                {part.meaning && <span className="block text-sm text-ink-soft">{part.meaning}</span>}
                {part.atlasId && (
                  <Link to={`/hanzi/atlas?char=${encodeURIComponent(part.hanzi)}`} className="text-xs font-semibold text-accent">
                    {t("dailyWord.atlas")}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-faint" data-testid="daily-word-components-note">{t("dailyWord.componentsNote")}</p>
        </Card>
      )}

      {/* História / forma: origem só com fonte; mnemônico rotulado como dica. */}
      {stories.map((story) =>
        story.status === "VERIFIED_HISTORICAL" && story.text ? (
          <Card key={`origin-${story.hanzi}`} className="space-y-2 p-4" data-testid="daily-word-origin" data-story-status={story.status}>
            <h2 className="font-serif text-lg font-semibold text-ink">
              {t("dailyWord.origin")} · <span className="hanzi" lang="zh-CN">{story.hanzi}</span>
            </h2>
            <p className="text-sm leading-6 text-ink-soft">{story.text}</p>
            {instructionLocale === "pt-BR" && story.evolutionId && HANZI_EVOLUTIONS[story.evolutionId] && (
              <HanziEvolutionCard model={HANZI_EVOLUTIONS[story.evolutionId]} compact onTrain={() => navigate(`/hanzi?char=${story.evolutionId}`)} />
            )}
            <p className="text-xs text-ink-faint" data-testid="daily-word-origin-source">
              {t("dailyWord.source")}: {story.sources.map((source) => `${source.title} — ${source.detail}`).join("; ")}
            </p>
          </Card>
        ) : story.status === "PEDAGOGICAL_MNEMONIC" && story.text ? (
          <Card key={`tip-${story.hanzi}`} className="space-y-1 p-4" data-testid="daily-word-mnemonic" data-story-status={story.status}>
            <h2 className="text-sm font-semibold text-ink">
              {t("dailyWord.mnemonic")} · <span className="hanzi" lang="zh-CN">{story.hanzi}</span>
            </h2>
            <p className="text-sm leading-6 text-ink-soft">{story.text}</p>
          </Card>
        ) : story.status === "COMPONENT_EXPLANATION" && single ? (
          <Card key={`pieces-${story.hanzi}`} className="space-y-1 p-4" data-testid="daily-word-pieces" data-story-status={story.status}>
            <h2 className="text-sm font-semibold text-ink">{t("dailyWord.pieces")}</h2>
            <p className="text-sm text-ink-soft">
              {story.components.map((piece) => (piece.meaning ? `${piece.glyph} ${piece.meaning}` : piece.glyph)).join(" · ")}
            </p>
          </Card>
        ) : null
      )}

      {example && (
        <Card className="space-y-1 p-4" data-testid="daily-word-example">
          <h2 className="text-sm font-semibold text-ink">{t("dailyWord.example")}</h2>
          <GlossText text={example.hanzi} pinyin={example.pinyin} meaning={example.meaning} className="text-xl" />
          <p className="text-sm text-ink-soft">{example.meaning}</p>
        </Card>
      )}

      {usage && (
        <Card className="space-y-1 p-4" data-testid="daily-word-usage">
          <h2 className="text-sm font-semibold text-ink">{t("dailyWord.useThis")}</h2>
          <p className="text-sm text-ink-soft">{usage}</p>
        </Card>
      )}

      <details className="rounded-2xl border border-line bg-surface px-4 py-3" data-testid="daily-word-details">
        <summary className="min-h-10 cursor-pointer text-sm font-semibold text-ink">{t("dailyWord.level")} · {t(LEVEL_KEY[candidate.level] ?? "dailyWord.levelBeginner")}</summary>
        <dl className="mt-2 space-y-1 text-sm text-ink-soft">
          {band && (
            <div data-testid="daily-word-frequency">
              <dt className="inline font-medium text-ink">{t("dailyWord.frequencyLabel")}: </dt>
              <dd className="inline">{t(band === "top300" ? "dailyWord.top300" : "dailyWord.top1000")}</dd>
            </div>
          )}
          {domainKey && (
            <div>
              <dt className="inline font-medium text-ink">{t("dailyWord.usedIn")}: </dt>
              <dd className="inline">{t(domainKey)}</dd>
            </div>
          )}
          {candidate.firstLessonId && (
            <div>
              <dd className="inline">{t("dailyWord.inJourney")}</dd>
            </div>
          )}
        </dl>
        {single && (
          <Link to={`/hanzi/atlas?char=${encodeURIComponent(candidate.hanzi)}`} className="mt-2 inline-flex min-h-12 items-center text-sm font-semibold text-accent" data-testid="daily-word-atlas">
            {t("dailyWord.atlas")}
          </Link>
        )}
      </details>
    </div>
  );
}

function DailyWordPractice({
  candidate,
  steps,
  onExit,
  onFinished,
}: {
  candidate: DailyVocabularyCandidate;
  steps: LessonStep[];
  onExit: () => void;
  onFinished: (summary: { correct: number; total: number; xp: number; reviewAdded: number }) => void;
}) {
  const { t } = useTranslation();
  // Sem onSkip: o "Pular · custa 1 fôlego" é da lição; aqui não há fôlego em jogo.
  const complete = useStore((s) => s.completeDailyVocabularyPractice);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const firstTry = useRef(0);
  const missed = useRef(false);
  const [region, setRegion] = useState<HTMLDivElement | null>(null);
  const graded = steps.filter((step) => step.kind !== "listen").length;

  const onDone = (correct?: boolean) => {
    const step = steps[index];
    if (correct === false) {
      // Errou: o mesmo passo de novo (como o "Tentar de novo" da lição).
      missed.current = true;
      setAttempt((value) => value + 1);
      return;
    }
    if (step.kind !== "listen") {
      haptic("answerCorrect");
      if (!missed.current) firstTry.current += 1;
    }
    missed.current = false;
    if (index + 1 < steps.length) {
      setIndex(index + 1);
      setAttempt(0);
      return;
    }
    // Só DEPOIS da prática: entra na Revisão (SRS existente) e o XP pequeno, uma vez por dia.
    const outcome = complete({ lexicalId: candidate.id, srsRef: candidate.srsRef, domains: dailyWordReviewDomains(candidate) });
    onFinished({ correct: firstTry.current, total: graded, xp: outcome.xp, reviewAdded: outcome.reviewAdded });
  };

  return (
    // Modo foco: cobre a barra de abas (como a lição); 1–3 minutos, 4 toques.
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-bg pt-[calc(var(--app-safe-top)+0.5rem)]"
      data-testid="daily-word-practice"
      data-step-index={index}
    >
      <div className="mx-auto w-full max-w-xl px-4 pb-4">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-ink-faint">
        <span>{t("dailyWord.practiceTitle")}</span>
        <span data-testid="daily-word-practice-progress">{t("dailyWord.stepOf", { current: index + 1, total: steps.length })}</span>
        <button type="button" onClick={onExit} className="min-h-10 px-2 text-ink-soft" data-testid="daily-word-practice-exit">
          {t("dailyWord.exit")}
        </button>
      </div>
      <StepQiProvider enabled={false}>
      <LessonActionRegionProvider target={region}>
        <Card className="overflow-visible rounded-[24px] p-4 shadow-lift" data-lesson-step-frame>
          <StepRenderer
            key={`${candidate.id}:${index}:${attempt}`}
            step={steps[index]}
            lessonId={`daily-word:${candidate.id}`}
            attemptSeed={`daily-word:${candidate.id}:${index}:${attempt}`}
            onDone={onDone}
            onMistake={() => {
              missed.current = true;
              haptic("answerWrong");
            }}
          />
        </Card>
      </LessonActionRegionProvider>
      </StepQiProvider>
      <div ref={setRegion} data-lesson-action-region className="mt-3 pb-[calc(var(--app-safe-bottom)+0.5rem)] empty:hidden" />
      </div>
    </div>
  );
}
