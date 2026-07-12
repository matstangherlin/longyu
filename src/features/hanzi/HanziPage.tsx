import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CHARACTERS, DECOMPOSABLE } from "../../data/characters";
import { hanziLessonFor } from "../../data/hanziPedagogy";
import { RADICALS } from "../../data/radicals";
import { radicalById } from "../../data/radicals";
import { leagueXpKeyActivity } from "../../lib/leagueXpKeys";
import { todayKey } from "../../lib/storage";
import { useStore } from "../../lib/store";
import { gradeReviewDomain } from "../../lib/reviewPlan";
import { canAccessHanziLab, useIsPro } from "../../lib/proAccess";
import { playSoundFx } from "../../lib/soundFx";
import { Card, Button, Pill, SectionTitle } from "../../components/ui/primitives";
import { DecompositionCard } from "../../components/hanzi/DecompositionCard";
import { HanziBuilderExercise } from "../../components/hanzi/HanziBuilderExercise";
import {
  builderPrerequisitesMet,
  COMPLETE_BUILDERS,
  COMPONENT_BUILDERS,
  FRAGMENT_BUILDERS,
  SENTENCE_BUILDERS,
  type HanziBuilder,
} from "../../data/hanziBuilder";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { GlossText } from "../../components/hanzi/GlossText";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { IconCheck, IconHanzi, IconLibrary, IconX } from "../../components/ui/Icon";
import { EngineGate } from "../../components/layout/EngineGate";
import { ProPaywall } from "../../components/pro/ProPaywall";

export function HanziPage() {
  const [searchParams] = useSearchParams();
  const requestedCharId = searchParams.get("char");
  const [selected, setSelected] = useState(() => CHARACTERS.find((char) => char.id === requestedCharId) ?? DECOMPOSABLE[0]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [labNotice, setLabNotice] = useState<string | null>(null);
  const isPremium = useIsPro();
  const hanziLabAccess = canAccessHanziLab({ isPremium });
  const lesson = hanziLessonFor(selected);

  useEffect(() => {
    const next = CHARACTERS.find((char) => char.id === requestedCharId);
    if (next) setSelected(next);
  }, [requestedCharId]);

  return (
    <EngineGate track="hanzi">
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Competência · Hànzì"
        title="Montar hànzì"
        desc="Forma, som e sentido em peças visuais."
      />

      <section className="rounded-xl bg-surface px-4 py-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Atlas de Hànzì</div>
            <p className="mt-1 text-sm text-ink-soft">Consulte frequência, radical, tom e revisão.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/ideogramas">
              <Button variant="soft" className="w-full sm:w-auto">
                <IconHanzi width={17} height={17} /> Hub Ideogramas
              </Button>
            </Link>
            <Link to="/hanzi/atlas">
              <Button variant="outline" className="w-full sm:w-auto">
                <IconLibrary width={17} height={17} /> Abrir Atlas
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-surface px-4 py-3">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Hànzì profundo · Pro</div>
            <h2 className="mt-1 font-serif text-lg font-semibold text-ink">Laboratório de caracteres</h2>
            <p className="mt-1 text-sm text-ink-soft">Componentes, pistas sonoras e evolução visual.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (hanziLabAccess.pro) {
                setLabNotice("Em breve, o laboratório profundo de caracteres ficará disponível nesta área.");
                return;
              }
              setPaywallOpen(true);
            }}
          >
            {hanziLabAccess.pro ? "Laboratório em breve" : "Explorar laboratório"}
          </Button>
        </div>
        {labNotice && <p className="mt-3 text-xs leading-5 text-ink-faint">{labNotice}</p>}
      </section>

      <Card className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col items-center justify-center bg-surface-2 p-6 text-center sm:p-8">
            <div className="hanzi text-8xl text-accent sm:text-9xl">{selected.hanzi}</div>
            <div className="mt-3 flex items-center gap-3">
              <Pinyin text={selected.pinyin} className="font-serif text-2xl" />
              <SpeakButton text={selected.hanzi} size="sm" />
            </div>
            <div className="mt-2 text-lg font-medium text-ink">{selected.meaningPt}</div>
            <p className="mt-4 max-w-sm text-sm text-ink-soft">{lesson.coreIdea}</p>
            {lesson.caution && (
              <div className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm text-accent">
                {lesson.caution}
              </div>
            )}
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                Modelo Longyu
              </div>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-ink">
                {lesson.headline}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {["Ver", "Ouvir", "Desmontar", "Usar", "Revisar"].map((step) => (
                <Pill key={step}>{step}</Pill>
              ))}
            </div>

            <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
              <div className="mb-3 text-sm font-semibold text-ink">Peças e papéis</div>
              <div className="grid gap-2">
                {lesson.components.map((part, index) => {
                  const radical = radicalById[part.componentId];
                  if (!radical) return null;
                  return (
                    <div key={`${part.componentId}-${index}`} className="flex items-start gap-3 rounded-xl bg-surface p-3">
                      <span className="hanzi flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-3xl text-ink">
                        {radical.variant ?? radical.glyph}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-ink">{radical.namePt}</span>
                          <Pill tone={part.role === "som" ? "accent" : "muted"}>
                            pista de {part.role}
                          </Pill>
                        </div>
                        <p className="mt-1 text-sm text-ink-soft">{part.note}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
              <div className="text-sm font-semibold text-ink">Ordem de traços quando importa</div>
              <p className="mt-1 text-sm text-ink-soft">{lesson.strokeHint}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Decomposição em destaque */}
      <Card className="p-6">
        <div className="flex items-center justify-center rounded-2xl bg-surface-2 p-6 sm:p-8">
          <DecompositionCard char={selected} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="mb-2 text-sm font-semibold text-ink">Palavras compostas</div>
            <div className="space-y-2">
              {lesson.relatedWords.map((word) => (
                <div key={`${word.hanzi}-${word.pinyin}`} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2">
                  <div>
                    <GlossText text={word.hanzi} className="text-xl text-ink" />
                    <div className="text-xs text-ink-soft">
                      <Pinyin text={word.pinyin} className="font-serif" /> · {word.pt}
                    </div>
                  </div>
                  <SpeakButton text={word.hanzi} size="sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="mb-2 text-sm font-semibold text-ink">Frase real</div>
            <div className="rounded-xl bg-surface px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <GlossText text={lesson.sentence.hanzi} className="text-2xl text-ink" />
                  <Pinyin text={lesson.sentence.pinyin} className="mt-1 block font-serif text-sm" />
                  <div className="mt-1 text-sm text-ink-soft">{lesson.sentence.pt}</div>
                </div>
                <SpeakButton text={lesson.sentence.hanzi} size="sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {DECOMPOSABLE.filter((c) => ["hao", "ming", "lin", "sen", "xiu", "ma2"].includes(c.id)).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={[
                "hanzi flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition",
                c.id === selected.id
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-ink hover:bg-line",
              ].join(" ")}
            >
              {c.hanzi}
            </button>
          ))}
        </div>
      </Card>

      {/* Repertório de peças */}
      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold text-ink">
          Seu repertório de peças
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {RADICALS.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 p-3">
              <span className="hanzi flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2 text-2xl text-ink">
                {r.glyph}
              </span>
              <div className="min-w-0 leading-tight">
                <div className="font-medium text-ink">{r.namePt}</div>
                <div className="truncate text-xs text-ink-faint">{r.meaningPt}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Montar hànzì (quebra-cabeça visual) */}
      <HanziBuildTrainer />

      {/* Quiz de reconhecimento */}
      <RecognitionQuiz />
      <DecompositionQuiz />
      <ProPaywall open={paywallOpen} kind="hanzi" onClose={() => setPaywallOpen(false)} />
    </div>
    </EngineGate>
  );
}

const ROUND = 8;

const charIdByHanzi = new Map(CHARACTERS.map((char) => [char.hanzi, char.id]));

const BUILD_MODES: { id: string; label: string; desc: string; builders: HanziBuilder[] }[] = [
  {
    id: "fragments",
    label: "Montar hànzì",
    desc: "Encaixe traços soltos para formar o caractere.",
    builders: FRAGMENT_BUILDERS,
  },
  {
    id: "complete",
    label: "Reconhecer partes",
    desc: "Escolha o traço que falta na carta.",
    builders: COMPLETE_BUILDERS,
  },
  {
    id: "components",
    label: "Componentes frequentes",
    desc: "Combine componentes inteiros: 女 + 子 = 好.",
    builders: COMPONENT_BUILDERS,
  },
  {
    id: "sentences",
    label: "Hànzì em frases",
    desc: "Monte o caractere que falta dentro de uma frase curta.",
    builders: SENTENCE_BUILDERS,
  },
];

// Treino de montagem de hànzì: escolhe um modo e passa pelos exercícios daquele
// modo, gradando forma no SRS a cada acerto/erro.
function HanziBuildTrainer() {
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const addMinutes = useStore((s) => s.addMinutes);
  const addXp = useStore((s) => s.addXp);
  const soundEffects = useStore((s) => s.soundEffects);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const consumeCharge = useStore((s) => s.consumeCharge);
  const recordActivityError = useStore((s) => s.recordActivityError);
  const learnedCharIds = useStore((s) => s.learnedChars);
  const builderProgress = useStore((s) => s.hanziBuilderProgressByChar);

  const [modeId, setModeId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [energyPaywallOpen, setEnergyPaywallOpen] = useState(false);

  // Glifos que o aluno já encontrou: lições concluídas + hànzì já montados aqui.
  const seenGlyphs = useMemo(() => {
    const learned = new Set(learnedCharIds);
    const set = new Set(CHARACTERS.filter((char) => learned.has(char.id)).map((char) => char.hanzi));
    for (const [char, progress] of Object.entries(builderProgress)) {
      if (progress.correct > 0) set.add(char);
    }
    return set;
  }, [builderProgress, learnedCharIds]);

  const mode = BUILD_MODES.find((m) => m.id === modeId) ?? null;
  // Sem pular bases também no treino livre: composição (你, 明, 林…) só entra
  // depois de o aluno ter visto as bases (人, 日+月, 木…). Se o filtro esvaziar
  // o modo (conta nova explorando o lab), mantém a lista completa — o exercício
  // já facilita hànzì novo (guia, pinyin visível e sem distratores).
  const builders = useMemo(() => {
    const all = mode?.builders ?? [];
    const gated = all.filter((builder) => builderPrerequisitesMet(builder, seenGlyphs));
    return gated.length > 0 ? gated : all;
  }, [mode, seenGlyphs]);
  const current = builders[index];
  const isLast = index + 1 >= builders.length;

  function start(id: string) {
    if (!consumeCharge("extra_training")) {
      setEnergyPaywallOpen(true);
      return;
    }
    setModeId(id);
    setIndex(0);
    setCorrect(0);
    setDone(false);
  }

  function gradeForm(character: string, ok: boolean) {
    const itemId = charIdByHanzi.get(character);
    if (!itemId) return;
    gradeReviewDomain({
      ensureSrs,
      gradeSrs,
      type: "char",
      itemId,
      track: "hanzi",
      domain: "forma",
      grade: ok ? "good" : "again",
    });
  }

  function handleWrong() {
    if (!current) return;
    gradeForm(current.character, false);
    recordBuilderActivityError(current, recordActivityError);
  }

  function handleCorrect() {
    if (current) {
      gradeForm(current.character, true);
      recordDailyTask("hanziDecomposed");
    }
    const next = correct + 1;
    if (isLast) {
      setCorrect(next);
      setDone(true);
      addXp(6, leagueXpKeyActivity("hanzi", `${todayKey()}:practice`));
      addMinutes("hanzi", 4);
      playSoundFx("streak", soundEffects);
      return;
    }
    setCorrect(next);
    setIndex((i) => i + 1);
  }

  if (done) {
    return (
      <Card className="p-6 text-center">
        <div className="font-serif text-2xl font-semibold text-ink">
          {correct} / {builders.length}
        </div>
        <p className="mt-1 text-ink-soft">
          Você montou hànzì peça por peça. A forma desses caracteres entrou na revisão.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={() => setModeId(null)}>Escolher outro modo</Button>
          {mode && (
            <Button variant="outline" onClick={() => start(mode.id)}>
              Repetir modo
            </Button>
          )}
        </div>
        <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
      </Card>
    );
  }

  if (mode && current) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setModeId(null)}
            className="text-sm font-medium text-ink-soft transition hover:text-ink"
          >
            ← Modos
          </button>
          <Pill>
            {index + 1} / {builders.length}
          </Pill>
        </div>
        <HanziBuilderExercise
          key={current.id}
          builder={current}
          onWrong={handleWrong}
          onCorrect={handleCorrect}
          continueLabel={isLast ? "Concluir" : "Próximo"}
        />
        <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
      </Card>
    );
  }

  return (
    <section>
      <h2 className="mb-1 font-serif text-xl font-semibold text-ink">Montar hànzì</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Memorize a forma montando caracteres como um quebra-cabeça visual.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {BUILD_MODES.map((option) => (
          <Card key={option.id} className="flex flex-col p-4">
            <div className="text-sm font-semibold text-ink">{option.label}</div>
            <p className="mt-1 flex-1 text-xs leading-5 text-ink-soft">{option.desc}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {option.builders.length} hànzì
              </span>
              <Button variant="soft" onClick={() => start(option.id)}>
                Treinar
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
    </section>
  );
}

function recordBuilderActivityError(
  builder: HanziBuilder,
  recordActivityError: ReturnType<typeof useStore.getState>["recordActivityError"]
) {
  const itemId = charIdByHanzi.get(builder.character);
  if (!itemId) return;
  const now = Date.now();
  recordActivityError({
    id: `hanzi-build:${builder.id}:${now}`,
    lessonId: "hanzi-lab",
    moduleId: "hanzi-lab",
    phaseId: "hanzi",
    taskId: "hanzi-builder",
    questionId: builder.id,
    exerciseId: `hanzi-builder:${builder.id}`,
    type: "hanzi_build",
    prompt: builder.promptPt,
    correctAnswer: builder.character,
    selectedAnswer: "Montagem incorreta",
    topic: "forma visual",
    tokens: [builder.character, builder.pinyin, builder.meaningPt],
    hanzi: builder.character,
    pinyin: builder.pinyin,
    meaningPt: builder.meaningPt,
    explanation: builder.explanationPt,
    mistakeReason: "hanzi_visual_builder",
    timestamp: now,
    wrongCount: 1,
    correctionAttempts: 0,
    correctedSuccessDates: [],
    skill: "forma",
    targets: [{ type: "char", itemId, domain: "forma", track: "hanzi" }],
  });
}

function RecognitionQuiz() {
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const addMinutes = useStore((s) => s.addMinutes);
  const addXp = useStore((s) => s.addXp);
  const soundEffects = useStore((s) => s.soundEffects);
  const consumeCharge = useStore((s) => s.consumeCharge);

  const pool = useMemo(() => CHARACTERS, []);
  const [q, setQ] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [round, setRound] = useState(() => makeQuestion(pool));
  const [sessionCharged, setSessionCharged] = useState(false);
  const [energyPaywallOpen, setEnergyPaywallOpen] = useState(false);

  function ensureTrainingCharge(): boolean {
    if (sessionCharged) return true;
    if (!consumeCharge("extra_training")) {
      setEnergyPaywallOpen(true);
      return false;
    }
    setSessionCharged(true);
    return true;
  }

  function answer(meaning: string) {
    if (picked) return;
    if (!ensureTrainingCharge()) return;
    setPicked(meaning);
    const correct = meaning === round.answer.meaningPt;
    gradeReviewDomain({
      ensureSrs,
      gradeSrs,
      type: "char",
      itemId: round.answer.id,
      track: "hanzi",
      domain: "significado",
      grade: correct ? "good" : "again",
    });
    playSoundFx(correct ? "success" : "task", soundEffects);
    setTimeout(() => {
      const ns = score + (correct ? 1 : 0);
      if (q + 1 >= ROUND) {
        setScore(ns);
        setDone(true);
        addXp(5 + (ns >= 7 ? 3 : 0), leagueXpKeyActivity("hanzi", `${todayKey()}:builder:${ns}`));
        playSoundFx(ns >= 7 ? "streak" : "success", soundEffects);
        addMinutes("hanzi", 5);
        return;
      }
      setScore(ns);
      setQ(q + 1);
      setPicked(null);
      setRound(makeQuestion(pool));
    }, 850);
  }

  function restart() {
    setQ(0);
    setScore(0);
    setDone(false);
    setPicked(null);
    setSessionCharged(false);
    setRound(makeQuestion(pool));
  }

  if (done) {
    return (
      <Card className="p-6 text-center">
        <div className="font-serif text-2xl font-semibold text-ink">
          {score} / {ROUND}
        </div>
        <p className="mt-1 text-ink-soft">
          Os caracteres reconhecidos entraram na sua fila de revisão espaçada.
        </p>
        <Button className="mt-4" onClick={restart}>
          Jogar de novo
        </Button>
        <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-ink">
          O que significa?
        </h2>
        <Pill>
          {q + 1} / {ROUND}
        </Pill>
      </div>
      <div className="flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-2">
          <div className="hanzi text-7xl text-ink">{round.answer.hanzi}</div>
          <div className="flex items-center gap-2.5">
            <Pinyin text={round.answer.pinyin} className="font-serif text-lg" />
            <SpeakButton text={round.answer.hanzi} size="sm" />
          </div>
        </div>
        <div className="grid w-full max-w-md gap-2.5">
          {round.options.map((opt) => {
            const state =
              picked == null
                ? "idle"
                : opt === round.answer.meaningPt
                ? "right"
                : opt === picked
                ? "wrong"
                : "idle";
            return (
              <button
                key={opt}
                onClick={() => answer(opt)}
                className={[
                  "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                  state === "idle" && "border-line bg-surface hover:bg-surface-2",
                  state === "right" &&
                    "border-transparent bg-[rgb(var(--good)/0.15)] text-ink",
                  state === "wrong" && "border-transparent bg-accent-soft text-ink",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span>{opt}</span>
                {state === "right" && (
                  <IconCheck width={18} height={18} className="text-[rgb(var(--good))]" />
                )}
                {state === "wrong" && (
                  <IconX width={18} height={18} className="text-accent" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
    </Card>
  );
}

function makeQuestion(pool: typeof CHARACTERS) {
  const answer = pool[Math.floor(Math.random() * pool.length)];
  const distractors = shuffle(pool.filter((c) => c.id !== answer.id)).slice(0, 3);
  const options = shuffle([answer, ...distractors].map((c) => c.meaningPt));
  return { answer, options };
}

function DecompositionQuiz() {
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const addMinutes = useStore((s) => s.addMinutes);
  const addXp = useStore((s) => s.addXp);
  const soundEffects = useStore((s) => s.soundEffects);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const consumeCharge = useStore((s) => s.consumeCharge);
  const pool = useMemo(
    () => DECOMPOSABLE.filter((char) => char.components.length > 0),
    []
  );
  const [q, setQ] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [round, setRound] = useState(() => makeDecompositionQuestion(pool));
  const [sessionCharged, setSessionCharged] = useState(false);
  const [energyPaywallOpen, setEnergyPaywallOpen] = useState(false);

  function ensureTrainingCharge(): boolean {
    if (sessionCharged) return true;
    if (!consumeCharge("extra_training")) {
      setEnergyPaywallOpen(true);
      return false;
    }
    setSessionCharged(true);
    return true;
  }

  function answer(option: string) {
    if (picked) return;
    if (!ensureTrainingCharge()) return;
    setPicked(option);
    const correct = option === round.answer;
    gradeReviewDomain({
      ensureSrs,
      gradeSrs,
      type: "char",
      itemId: round.char.id,
      track: "hanzi",
      domain: "forma",
      grade: correct ? "good" : "again",
    });
    recordDailyTask("hanziDecomposed");
    playSoundFx(correct ? "success" : "task", soundEffects);
    setTimeout(() => {
      const ns = score + (correct ? 1 : 0);
      if (q + 1 >= ROUND) {
        setScore(ns);
        setDone(true);
        addXp(5 + (ns >= 7 ? 3 : 0), leagueXpKeyActivity("hanzi", `${todayKey()}:builder:${ns}`));
        playSoundFx(ns >= 7 ? "streak" : "success", soundEffects);
        addMinutes("hanzi", 5);
        return;
      }
      setScore(ns);
      setQ(q + 1);
      setPicked(null);
      setRound(makeDecompositionQuestion(pool));
    }, 900);
  }

  function restart() {
    setQ(0);
    setScore(0);
    setDone(false);
    setPicked(null);
    setSessionCharged(false);
    setRound(makeDecompositionQuestion(pool));
  }

  if (done) {
    return (
      <Card className="p-6 text-center">
        <div className="font-serif text-2xl font-semibold text-ink">
          {score} / {ROUND}
        </div>
        <p className="mt-1 text-ink-soft">
          Você treinou forma, sentido e pistas sonoras. Esses domínios entraram na revisão.
        </p>
        <Button className="mt-4" onClick={restart}>
          Desmontar de novo
        </Button>
        <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-ink">
          Qual peça faz esse papel?
        </h2>
        <Pill>
          {q + 1} / {ROUND}
        </Pill>
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <div>
          <div className="hanzi text-7xl text-ink">{round.char.hanzi}</div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <Pinyin text={round.char.pinyin} className="font-serif text-lg" />
            <SpeakButton text={round.char.hanzi} size="sm" />
          </div>
        </div>
        <p className="text-sm text-ink-soft">{round.prompt}</p>
        <div className="grid w-full max-w-md gap-2.5">
          {round.options.map((option) => {
            const state =
              picked == null
                ? "idle"
                : option === round.answer
                ? "right"
                : option === picked
                ? "wrong"
                : "idle";
            return (
              <button
                key={option}
                onClick={() => answer(option)}
                disabled={picked != null}
                className={[
                  "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                  state === "idle" && "border-line bg-surface hover:bg-surface-2",
                  state === "right" && "border-transparent bg-[rgb(var(--good)/0.15)] text-ink",
                  state === "wrong" && "border-transparent bg-accent-soft text-ink",
                ].filter(Boolean).join(" ")}
              >
                <span>{option}</span>
                {state === "right" && <IconCheck width={18} height={18} className="text-[rgb(var(--good))]" />}
                {state === "wrong" && <IconX width={18} height={18} className="text-accent" />}
              </button>
            );
          })}
        </div>
      </div>
      <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
    </Card>
  );
}

function makeDecompositionQuestion(pool: typeof DECOMPOSABLE) {
  const char = pool[Math.floor(Math.random() * pool.length)];
  const lesson = hanziLessonFor(char);
  const target =
    lesson.components.find((part) => part.role === "som") ??
    lesson.components[Math.floor(Math.random() * lesson.components.length)];
  const radical = radicalById[target.componentId];
  const answer = radical
    ? `${radical.variant ?? radical.glyph} · ${radical.namePt}`
    : target.componentId;
  const distractors = shuffle(
    RADICALS
      .filter((candidate) => candidate.id !== target.componentId)
      .map((candidate) => `${candidate.variant ?? candidate.glyph} · ${candidate.namePt}`)
  ).slice(0, 3);

  return {
    char,
    prompt: target.role === "som"
      ? "Qual peça funciona principalmente como pista de som?"
      : "Qual peça ajuda principalmente no sentido ou na forma visual?",
    answer,
    options: shuffle([answer, ...distractors]),
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
