import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PINYIN_ACCENT_ROUNDS,
  PINYIN_BUILD_ROUNDS,
  PINYIN_FINALS,
  PINYIN_GRID_FINALS,
  PINYIN_GRID_INITIALS,
  PINYIN_INITIALS,
  PINYIN_SYLLABLES,
  PINYIN_TONE_GUIDE,
  PINYIN_TONE_OPTIONS,
  parseItemRef,
  type PinyinAccentRound,
  type PinyinBuildRound,
  type PinyinExample,
  type PinyinFinal,
  type PinyinInitial,
  type PinyinSyllableCell,
  type PinyinTone,
} from "../../data/pinyinLab";
import { TONE_COLOR } from "../../data/tones";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { GlossText } from "../../components/hanzi/GlossText";
import { Button, Card, Pill, ProgressBar } from "../../components/ui/primitives";
import { HubHeader, HubPage } from "../../components/layout/HubLayout";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { IconCheck, IconChevron, IconHeadphones, IconRefresh, IconShield, IconSound, IconX } from "../../components/ui/Icon";
import { ProPaywall } from "../../components/pro/ProPaywall";
import { numericPinyinToDiacritics, stripPinyinTone } from "../../lib/pinyin";
import { hasChineseVoice, speak, stopSpeaking, warmUpVoices } from "../../lib/tts";
import { useStore } from "../../lib/store";
import { gradeReviewDomain } from "../../lib/reviewPlan";
import { playSoundFx } from "../../lib/soundFx";
import { canAccessPinyinLab, useIsPro } from "../../lib/proAccess";
import { KeyboardShortcutHint, ShortcutBadge, shortcutKeyForIndex, useExerciseHotkeys } from "../../lib/useExerciseHotkeys";
import { ToneTrainer } from "../som/SomPage";

const BUILD_INITIAL_CHOICES = ["", ...PINYIN_INITIALS.map((item) => item.id)];
const BUILD_FINAL_CHOICES = Array.from(new Set(PINYIN_BUILD_ROUNDS.map((round) => round.final)));
const PASSING_BUILD_SCORE = Math.ceil(PINYIN_BUILD_ROUNDS.length * 0.8);
const PASSING_ACCENT_SCORE = Math.ceil(PINYIN_ACCENT_ROUNDS.length * 0.8);
type PinyinLabView = "iniciais" | "finais" | "silabas" | "tons" | "treino";
const PINYIN_LAB_VIEWS: { id: PinyinLabView; label: string }[] = [
  { id: "iniciais", label: "Iniciais" },
  { id: "finais", label: "Finais" },
  { id: "silabas", label: "Sílabas" },
  { id: "tons", label: "Tons" },
  { id: "treino", label: "Treino" },
];

export function PinyinLabPage() {
  const completedLessons = useStore((s) => s.completedLessons);
  const isPremium = useIsPro();
  const access = canAccessPinyinLab({ isPremium, completedLessons });
  const [selectedSyllable, setSelectedSyllable] = useState(PINYIN_SYLLABLES[0]);
  const [mobileView, setMobileView] = useState<PinyinLabView>("silabas");
  const [hasVoice, setHasVoice] = useState(true);
  const recordDailyTask = useStore((s) => s.recordDailyTask);

  const syllableMap = useMemo(() => {
    const map = new Map<string, PinyinSyllableCell>();
    for (const cell of PINYIN_SYLLABLES) map.set(`${cell.initial}:${cell.final}`, cell);
    return map;
  }, []);

  // As cinco variações de tom da sílaba selecionada (1º-4º + neutro), geradas a
  // partir da base sem acento. Fallback: se a conversão falhar, mostra a base.
  const toneVariants = useMemo(() => {
    const base = stripPinyinTone(selectedSyllable.pinyin);
    return PINYIN_TONE_OPTIONS.map((tone) => {
      const converted = numericPinyinToDiacritics(`${base}${tone}`);
      return { tone, pinyin: /[1-5]$/.test(converted) ? base : converted };
    });
  }, [selectedSyllable]);

  useEffect(() => {
    void warmUpVoices().then(() => setHasVoice(hasChineseVoice()));
    return () => stopSpeaking();
  }, []);

  function playSyllable(cell: PinyinSyllableCell) {
    setSelectedSyllable(cell);
    recordDailyTask("audioHeard");
    speak(cell.audioText, { rate: 0.82 });
  }

  function playToneVariant(pinyin: string) {
    recordDailyTask("audioHeard");
    speak(pinyin, { rate: 0.78 });
  }

  return (
    <HubPage className="space-y-5">
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0">
          <HubHeader
            eyebrow="Pinyin Lab"
            title="Som, acento e tons"
            desc="Pinyin é a ponte entre o ouvido, a boca e os caracteres."
          />
          <div className="sticky top-14 z-20 -mx-1 overflow-x-auto rounded-xl bg-bg/95 px-1 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <div className="flex min-w-max gap-1.5">
              {PINYIN_LAB_VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setMobileView(view.id)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition md:hidden",
                    mobileView === view.id ? "bg-accent text-white" : "bg-surface-2 text-ink-soft",
                  ].join(" ")}
                >
                  {view.label}
                </button>
              ))}
              {PINYIN_LAB_VIEWS.map((view) => (
                <a
                  key={`desktop-${view.id}`}
                  className="hidden rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-accent-soft hover:text-accent md:inline-flex"
                  href={`#${view.id === "treino" ? "acentos" : view.id}`}
                >
                  {view.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <Card className="hidden rounded-xl border-line/70 p-4 shadow-none md:block">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Padrão visual</div>
              <div className="mt-3 space-y-2 font-serif text-2xl font-semibold text-ink">
                <Pinyin text="nǐ hǎo" />
                <Pinyin text="xièxie" />
                <Pinyin text="Zhōngwén" />
              </div>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <IconSound width={24} height={24} />
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink-soft">
            O Longyu mostra pinyin com acento para o aluno comum. Formas numéricas ficam só como formato interno e são convertidas antes de aparecer.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill tone={access.pro ? "gold" : "muted"}>{access.pro ? "Pro liberado" : "Grátis com Cargas"}</Pill>
            {!hasVoice && <Pill tone="accent">Sem voz zh-CN dedicada</Pill>}
          </div>
        </Card>
      </section>

      <section id="iniciais" className={["scroll-mt-20", mobileView === "iniciais" ? "block" : "hidden md:block"].join(" ")}>
        <LabSectionHeader title="Tabela de iniciais" desc="A inicial abre a sílaba. O sopro faz diferença em pares como b/p, d/t, g/k e z/c." />
        <ReferenceGrid items={PINYIN_INITIALS} kind="initial" />
      </section>

      <section id="finais" className={["scroll-mt-20", mobileView === "finais" ? "block" : "hidden md:block"].join(" ")}>
        <LabSectionHeader title="Tabela de finais" desc="A final carrega a vogal e, muitas vezes, o fechamento nasal ou arredondado da sílaba." />
        <ReferenceGrid items={PINYIN_FINALS} kind="final" />
      </section>

      <section id="silabas" className={["scroll-mt-20", mobileView === "silabas" ? "block" : "hidden md:block"].join(" ")}>
        <LabSectionHeader title="Tabela de sílabas" desc="A matriz começa pequena, mas a estrutura já aceita novas combinações." />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <MobileSyllableGrid
            syllableMap={syllableMap}
            selectedId={selectedSyllable.id}
            onSelect={playSyllable}
          />

          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[920px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2/70">
                    <th className="sticky left-0 z-10 w-20 bg-surface-2/95 px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                      Final
                    </th>
                    {PINYIN_GRID_INITIALS.map((initial) => (
                      <th key={initial} className="w-16 px-2 py-3 text-center font-serif text-base font-semibold text-ink">
                        {initial}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PINYIN_GRID_FINALS.map((final) => (
                    <tr key={final} className="border-b border-line/70 last:border-b-0">
                      <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-serif text-base font-semibold text-accent">
                        {final}
                      </th>
                      {PINYIN_GRID_INITIALS.map((initial) => {
                        const cell = syllableMap.get(`${initial}:${final}`);
                        return (
                          <td key={`${initial}-${final}`} className="h-14 border-l border-line/60 px-1.5 py-1.5 text-center">
                            {cell ? (
                              <button
                                type="button"
                                onClick={() => playSyllable(cell)}
                                className={[
                                  "h-10 w-full rounded-lg border text-sm font-semibold transition active:scale-[.98]",
                                  selectedSyllable.id === cell.id
                                    ? "border-accent bg-accent text-white"
                                    : "border-line bg-surface hover:border-accent-soft hover:bg-surface-2",
                                ].join(" ")}
                              >
                                <Pinyin text={cell.pinyin} />
                              </button>
                            ) : (
                              <span className="mx-auto block h-10 rounded-lg bg-surface-2/55" aria-hidden="true" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Selecionada</div>
                <div className="mt-2 font-serif text-4xl font-semibold text-ink">
                  <Pinyin text={selectedSyllable.pinyin} />
                </div>
                <div className="mt-1 text-sm text-ink-soft">
                  {selectedSyllable.initial} + {selectedSyllable.final}
                </div>
              </div>
              <SpeakButton text={selectedSyllable.audioText} size="lg" />
            </div>
            <div className="mt-5 space-y-2">
              {selectedSyllable.examples.map((example) => (
                <ExampleRow key={`${example.hanzi}-${example.pinyin}`} example={example} />
              ))}
            </div>

            <div className="mt-5 border-t border-line pt-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Os cinco tons desta sílaba
              </div>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {toneVariants.map(({ tone, pinyin }) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => playToneVariant(pinyin)}
                    aria-label={`Ouvir ${pinyin} (${tone === 5 ? "tom neutro" : `${tone}º tom`})`}
                    className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface px-1 py-2 transition hover:border-accent-soft hover:bg-surface-2 active:scale-95"
                  >
                    <span className="font-serif text-base font-semibold leading-none" style={{ color: TONE_COLOR[tone] }}>
                      <Pinyin text={pinyin} />
                    </span>
                    <ToneCurve tone={tone} />
                    <span className="text-[9px] font-medium text-ink-faint">{tone === 5 ? "neutro" : `${tone}º`}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section id="tons" className={["scroll-mt-20", mobileView === "tons" ? "block" : "hidden md:block"].join(" ")}>
        <LabSectionHeader title="Explicação dos tons" desc="O acento muda a direção da voz. Em mandarim, isso pode mudar a palavra." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PINYIN_TONE_GUIDE.map((tone) => (
            <Card key={tone.tone} className="p-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 font-serif text-2xl font-semibold" style={{ color: TONE_COLOR[tone.tone] }}>
                {tone.symbol}
              </div>
              <ToneCurve tone={tone.tone} />
              <h3 className="mt-3 text-sm font-semibold text-ink">{tone.name}</h3>
              <p className="mt-1 text-xs leading-5 text-ink-soft">{tone.desc}</p>
              <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2">
                <GlossText text={tone.example.hanzi} className="hanzi text-xl text-ink" />
                <div className="font-serif text-base font-semibold" style={{ color: TONE_COLOR[tone.tone] }}>
                  <Pinyin text={tone.example.pinyin} />
                </div>
                <div className="text-[11px] text-ink-faint">{tone.example.meaningPt}</div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-5">
          <ToneTrainer />
        </div>
      </section>

      <section id="acentos" className={["scroll-mt-20", mobileView === "treino" ? "block" : "hidden md:block"].join(" ")}>
        <LabSectionHeader
          title="Treino de acentos"
          desc="Escolha o pinyin correto. Aqui o acento não é detalhe decorativo: ele mostra o tom que muda som e sentido."
        />
        <PinyinAccentTrainer />
      </section>

      <section id="montar" className={["scroll-mt-20", mobileView === "treino" ? "block" : "hidden md:block"].join(" ")}>
        <LabSectionHeader title="Treino de montar pinyin" desc="Ouça a sílaba, escolha inicial, final e tom, e veja o resultado com acento." />
        <PinyinBuilder />
      </section>
    </HubPage>
  );
}

function MobileSyllableGrid({
  syllableMap,
  selectedId,
  onSelect,
}: {
  syllableMap: Map<string, PinyinSyllableCell>;
  selectedId: string;
  onSelect: (cell: PinyinSyllableCell) => void;
}) {
  const groups = PINYIN_GRID_FINALS.map((final) => ({
    final,
    cells: PINYIN_GRID_INITIALS
      .map((initial) => syllableMap.get(`${initial}:${final}`))
      .filter((cell): cell is PinyinSyllableCell => Boolean(cell)),
  })).filter((group) => group.cells.length > 0);

  return (
    <div className="grid gap-3 md:hidden">
      {groups.map((group) => (
        <Card key={group.final} className="p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="font-serif text-2xl font-semibold text-accent">{group.final}</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              final
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">
            {group.cells.map((cell) => (
              <button
                key={cell.id}
                type="button"
                onClick={() => onSelect(cell)}
                aria-label={`${cell.pinyin}, ${cell.initial || "sem inicial"} + ${cell.final}`}
                className={[
                  "min-h-14 rounded-2xl border px-2 py-2 text-left transition active:scale-[.98]",
                  selectedId === cell.id
                    ? "border-accent bg-accent text-white shadow-card"
                    : "border-line bg-surface hover:border-accent-soft hover:bg-surface-2",
                ].join(" ")}
              >
                <span className="block font-serif text-xl font-semibold leading-tight">
                  <Pinyin text={cell.pinyin} />
                </span>
                <span className={selectedId === cell.id ? "text-xs text-white/80" : "text-xs text-ink-faint"}>
                  {cell.initial || "sem inicial"} + {cell.final}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ReferenceGrid({
  items,
  kind,
}: {
  items: Array<PinyinInitial | PinyinFinal>;
  kind: "initial" | "final";
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft font-serif text-2xl font-semibold text-accent">
              {item.label}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  {kind === "initial" ? "Inicial" : "Final"}
                </div>
                <SpeakButton text={item.example.audioText ?? item.example.hanzi} size="sm" />
              </div>
              <p className="mt-1 text-sm leading-5 text-ink-soft">{item.approxPt}</p>
              <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2">
                <ExampleRow example={item.example} compact />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ExampleRow({ example, compact = false }: { example: PinyinExample; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <GlossText text={example.hanzi} className={["hanzi shrink-0 text-ink", compact ? "text-xl" : "text-2xl"].join(" ")} />
      <div className="min-w-0 flex-1">
        <div className={["font-serif font-semibold text-accent", compact ? "text-base" : "text-lg"].join(" ")}>
          <Pinyin text={example.pinyin} />
        </div>
        <div className="truncate text-xs text-ink-soft">{example.meaningPt}</div>
      </div>
      {!compact && <SpeakButton text={example.audioText ?? example.hanzi} size="sm" />}
    </div>
  );
}

function PinyinAccentTrainer() {
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const recordActivityError = useStore((s) => s.recordActivityError);
  const consumeCharge = useStore((s) => s.consumeCharge);
  const addMinutes = useStore((s) => s.addMinutes);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const soundEffects = useStore((s) => s.soundEffects);

  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Array<{ roundId: string; correct: boolean }>>([]);
  const [sessionCharged, setSessionCharged] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [done, setDone] = useState(false);

  const round = PINYIN_ACCENT_ROUNDS[roundIndex];
  const checked = selected !== null;
  const selectedCorrect = selected === round.answer;
  const score = answers.filter((answer) => answer.correct).length;

  function ensureTrainingCharge(): boolean {
    if (sessionCharged) return true;
    if (!consumeCharge("extra_training")) {
      setPaywallOpen(true);
      return false;
    }
    setSessionCharged(true);
    return true;
  }

  function playRound() {
    recordDailyTask("audioHeard");
    speak(round.audioText, { rate: 0.78 });
  }

  function choose(value: string) {
    if (checked || done) return;
    if (!ensureTrainingCharge()) return;
    const correct = value === round.answer;
    setSelected(value);
    setAnswers((items) => [...items, { roundId: round.id, correct }]);
    gradeAccentRound(round, correct, value, { ensureSrs, gradeSrs, recordActivityError });
    playSoundFx(correct ? "success" : "error", soundEffects);
    if (!correct) window.setTimeout(() => speak(round.audioText, { rate: 0.72 }), 180);
  }

  function nextRound() {
    if (!checked) return;
    if (roundIndex + 1 >= PINYIN_ACCENT_ROUNDS.length) {
      addMinutes("som", 4);
      setDone(true);
      return;
    }
    setRoundIndex((current) => current + 1);
    setSelected(null);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    optionCount: round.options.length,
    isAnswered: checked,
    hasSelection: checked,
    onSelectOption: (index) => {
      const option = round.options[index];
      if (option) choose(option);
    },
    onContinue: nextRound,
  });

  function reset() {
    stopSpeaking();
    setRoundIndex(0);
    setSelected(null);
    setAnswers([]);
    setSessionCharged(false);
    setDone(false);
  }

  if (done) {
    const passed = score >= PASSING_ACCENT_SCORE;
    return (
      <Card className="p-5 text-center sm:p-7">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          {passed ? <IconCheck width={30} height={30} /> : <IconRefresh width={30} height={30} />}
        </div>
        <Pill tone={passed ? "good" : "accent"} className="mx-auto mt-4">
          {passed ? "Acentos consolidados" : "Acentos para revisar"}
        </Pill>
        <h3 className="mt-3 font-serif text-3xl font-semibold text-ink">
          {score}/{PINYIN_ACCENT_ROUNDS.length}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
          Meta deste treino: {PASSING_ACCENT_SCORE}/{PINYIN_ACCENT_ROUNDS.length}. Erros de tom e pinyin entram em revisão com áudio.
        </p>
        <Button className="mt-5" size="lg" onClick={reset}>
          Refazer treino
          <IconRefresh width={18} height={18} />
        </Button>
        <ProPaywall open={paywallOpen} kind="energy" onClose={() => setPaywallOpen(false)} />
      </Card>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-surface-2/60 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="accent">Acento tonal</Pill>
                <Pill tone="muted">{PASSING_ACCENT_SCORE}/{PINYIN_ACCENT_ROUNDS.length} meta</Pill>
              </div>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">Escolha o pinyin correto</h3>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Rodada</div>
              <div className="font-serif text-2xl font-semibold text-ink">
                {roundIndex + 1}/{PINYIN_ACCENT_ROUNDS.length}
              </div>
            </div>
          </div>
          <ProgressBar value={roundIndex + (checked ? 1 : 0)} max={PINYIN_ACCENT_ROUNDS.length} className="mt-4" />
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="rounded-2xl border border-line bg-surface-2/70 p-4 text-center">
            <button
              type="button"
              onClick={playRound}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-accent-soft text-accent shadow-card transition active:scale-[.98]"
              aria-label={`Ouvir ${round.hanzi}`}
            >
              <IconHeadphones width={38} height={38} />
            </button>
            <GlossText text={round.hanzi} className="hanzi mt-4 text-5xl font-semibold text-ink" examMode />
            <p className="mt-2 text-sm text-ink-soft">{round.meaningPt}</p>
          </div>

          <KeyboardShortcutHint />
          <div className="grid gap-3 sm:grid-cols-2">
            {round.options.map((option, index) => {
              const state =
                !checked
                  ? "idle"
                  : option === round.answer
                  ? "right"
                  : option === selected
                  ? "wrong"
                  : "idle";
              return (
                <button
                  key={option}
                  type="button"
                  disabled={checked}
                  onClick={() => choose(option)}
                  aria-label={`Opção ${shortcutKeyForIndex(index)}: ${option}`}
                  className={[
                    "relative min-h-16 rounded-2xl border px-4 py-3 text-center font-serif text-2xl font-semibold transition active:scale-[.98]",
                    state === "idle" && "border-line bg-surface hover:border-accent-soft hover:bg-surface-2",
                    state === "right" && "border-[rgb(var(--good)/0.28)] bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]",
                    state === "wrong" && "border-wrong/30 bg-wrong-soft text-wrong",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  >
                  <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>
                  <Pinyin text={option} />
                </button>
              );
            })}
          </div>

          {checked && (
            <div className={["rounded-2xl border px-4 py-4", selectedCorrect ? "border-[rgb(var(--good)/0.28)] bg-[rgb(var(--good)/0.1)]" : "border-wrong/25 bg-wrong-soft/70"].join(" ")}>
              <div className="flex items-start gap-3">
                <span className={["mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", selectedCorrect ? "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]" : "bg-wrong text-white"].join(" ")}>
                  {selectedCorrect ? <IconCheck width={20} height={20} /> : <IconX width={20} height={20} />}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink">
                    {selectedCorrect ? "Certo!" : "Resposta correta"}
                  </div>
                  <div className="mt-1 font-serif text-xl font-semibold text-accent">
                    <Pinyin text={round.answer} /> · {toneLabel(round.answerTone)}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">{round.explanation}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button size="lg" variant="soft" onClick={playRound}>
              <IconSound width={18} height={18} />
              Repetir áudio
            </Button>
            <Button size="lg" disabled={!checked} onClick={nextRound}>
              {roundIndex + 1 >= PINYIN_ACCENT_ROUNDS.length ? "Ver nota" : "Próxima"}
              <IconChevron width={18} height={18} />
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <IconSound width={22} height={22} />
          </span>
          <div>
            <h3 className="font-serif text-xl font-semibold text-ink">Por que acento importa</h3>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              Sem acento, sílabas como ma ou shi ficam ambíguas. Com acento, o aluno treina ouvido, boca e memória visual ao mesmo tempo.
            </p>
            <Link to="/revisao" className="mt-4 inline-flex text-sm font-semibold text-accent">
              Ver erros de pinyin
            </Link>
          </div>
        </div>
      </Card>
      <ProPaywall open={paywallOpen} kind="energy" onClose={() => setPaywallOpen(false)} />
    </section>
  );
}

function PinyinBuilder() {
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const recordActivityError = useStore((s) => s.recordActivityError);
  const consumeCharge = useStore((s) => s.consumeCharge);
  const addMinutes = useStore((s) => s.addMinutes);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const soundEffects = useStore((s) => s.soundEffects);

  const [roundIndex, setRoundIndex] = useState(0);
  const [initial, setInitial] = useState<string | null>(null);
  const [final, setFinal] = useState<string | null>(null);
  const [tone, setTone] = useState<PinyinTone | null>(null);
  const [answers, setAnswers] = useState<Array<{ roundId: string; correct: boolean }>>([]);
  const [checked, setChecked] = useState(false);
  const [sessionCharged, setSessionCharged] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [done, setDone] = useState(false);

  const round = PINYIN_BUILD_ROUNDS[roundIndex];
  const selectedPinyin = initial !== null && final !== null && tone !== null ? composePinyin(initial, final, tone) : "";
  const correct = initial === round.initial && final === round.final && tone === round.tone;
  const score = answers.filter((answer) => answer.correct).length;

  function playRound() {
    recordDailyTask("audioHeard");
    speak(round.audioText, { rate: 0.78 });
  }

  function ensureTrainingCharge(): boolean {
    if (sessionCharged) return true;
    if (!consumeCharge("extra_training")) {
      setPaywallOpen(true);
      return false;
    }
    setSessionCharged(true);
    return true;
  }

  function checkAnswer() {
    if (checked || initial === null || final === null || tone === null) return;
    if (!ensureTrainingCharge()) return;
    const wasCorrect = correct;
    setChecked(true);
    setAnswers((items) => [...items, { roundId: round.id, correct: wasCorrect }]);
    gradeBuildRound(round, wasCorrect, selectedPinyin, { ensureSrs, gradeSrs, recordActivityError });
    playSoundFx(wasCorrect ? "success" : "error", soundEffects);
    if (!wasCorrect) window.setTimeout(() => speak(round.audioText, { rate: 0.72 }), 180);
  }

  function nextRound() {
    if (!checked) return;
    if (roundIndex + 1 >= PINYIN_BUILD_ROUNDS.length) {
      addMinutes("som", 4);
      setDone(true);
      return;
    }
    setRoundIndex((current) => current + 1);
    setInitial(null);
    setFinal(null);
    setTone(null);
    setChecked(false);
  }

  useExerciseHotkeys({
    enabled: true,
    mode: "builder",
    optionCount: PINYIN_TONE_OPTIONS.length,
    isAnswered: checked,
    hasSelection: initial !== null && final !== null && tone !== null,
    onSelectOption: (index) => {
      const selectedTone = PINYIN_TONE_OPTIONS[index];
      if (!checked && selectedTone) setTone(selectedTone);
    },
    onSubmit: checkAnswer,
    onContinue: nextRound,
  });

  function reset() {
    stopSpeaking();
    setRoundIndex(0);
    setInitial(null);
    setFinal(null);
    setTone(null);
    setAnswers([]);
    setChecked(false);
    setSessionCharged(false);
    setDone(false);
  }

  if (done) {
    const passed = score >= PASSING_BUILD_SCORE;
    return (
      <Card className="p-5 text-center sm:p-7">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          {passed ? <IconCheck width={30} height={30} /> : <IconRefresh width={30} height={30} />}
        </div>
        <Pill tone={passed ? "good" : "accent"} className="mx-auto mt-4">
          {passed ? "Desafio concluído" : "Revisar e tentar de novo"}
        </Pill>
        <h3 className="mt-3 font-serif text-3xl font-semibold text-ink">
          {score}/{PINYIN_BUILD_ROUNDS.length}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
          Meta deste treino: {PASSING_BUILD_SCORE}/{PINYIN_BUILD_ROUNDS.length}. Os erros de pinyin entram na revisão recente.
        </p>
        <Button className="mt-5" size="lg" onClick={reset}>
          Refazer treino
          <IconRefresh width={18} height={18} />
        </Button>
        <ProPaywall open={paywallOpen} kind="energy" onClose={() => setPaywallOpen(false)} />
      </Card>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-surface-2/60 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="accent">Montagem</Pill>
                <Pill tone="muted">{PASSING_BUILD_SCORE}/{PINYIN_BUILD_ROUNDS.length} meta</Pill>
              </div>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">Ouça e monte o pinyin</h3>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Rodada</div>
              <div className="font-serif text-2xl font-semibold text-ink">
                {roundIndex + 1}/{PINYIN_BUILD_ROUNDS.length}
              </div>
            </div>
          </div>
          <ProgressBar value={roundIndex + (checked ? 1 : 0)} max={PINYIN_BUILD_ROUNDS.length} className="mt-4" />
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="rounded-lg border border-line bg-surface-2/70 p-4 text-center">
            <button
              type="button"
              onClick={playRound}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-accent-soft text-accent shadow-card transition active:scale-[.98]"
              aria-label="Ouvir sílaba"
            >
              <IconHeadphones width={38} height={38} />
            </button>
            <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Áudio</div>
            <GlossText text={round.hanzi} className="hanzi mt-1 text-4xl font-semibold text-ink" />
            <p className="mt-1 text-sm text-ink-soft">{round.meaningPt}</p>
          </div>

          <ChoiceGroup label="Inicial" value={initial ?? ""} emptyLabel="sem inicial" choices={BUILD_INITIAL_CHOICES} onSelect={setInitial} disabled={checked} />
          <ChoiceGroup label="Final" value={final ?? ""} choices={BUILD_FINAL_CHOICES} onSelect={setFinal} disabled={checked} />
          <p className="-mb-3 hidden text-[11px] font-medium text-ink-faint sm:block">Atalhos: 1-5 escolhem o tom; Enter confere ou avança.</p>
          <ToneChoiceGroup value={tone} onSelect={setTone} disabled={checked} />

          <div className="rounded-lg border border-line bg-surface px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Resultado</div>
            <div className="mt-1 min-h-10 font-serif text-3xl font-semibold text-ink">
              {selectedPinyin ? <Pinyin text={selectedPinyin} /> : <span className="text-ink-faint">...</span>}
            </div>
          </div>

          {checked && (
            <div className={["rounded-lg border px-4 py-4", correct ? "border-[rgb(var(--good)/0.28)] bg-[rgb(var(--good)/0.1)]" : "border-wrong/25 bg-wrong-soft/70"].join(" ")}>
              <div className="flex items-start gap-3">
                <span className={["mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", correct ? "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]" : "bg-wrong text-white"].join(" ")}>
                  {correct ? <IconCheck width={20} height={20} /> : <IconX width={20} height={20} />}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink">{correct ? "Certo!" : "Resposta correta"}</div>
                  <div className="mt-1 font-serif text-xl font-semibold text-accent">
                    <Pinyin text={round.pinyin} />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    Inicial {round.initial || "sem inicial"}, final {round.final}, {toneLabel(round.tone)}.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              size="lg"
              variant="soft"
              onClick={checkAnswer}
              disabled={checked || initial === null || final === null || tone === null}
            >
              Conferir
              <IconCheck width={18} height={18} />
            </Button>
            <Button size="lg" onClick={nextRound} disabled={!checked}>
              {roundIndex + 1 >= PINYIN_BUILD_ROUNDS.length ? "Ver nota" : "Próxima"}
              <IconChevron width={18} height={18} />
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <IconShield width={22} height={22} />
          </span>
          <div>
            <h3 className="font-serif text-xl font-semibold text-ink">Cargas no plano grátis</h3>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              O treino avançado usa uma Carga por sessão. No Pro, a prática fica liberada.
            </p>
            <Link to="/revisao" className="mt-4 inline-flex text-sm font-semibold text-accent">
              Ver revisão
            </Link>
          </div>
        </div>
      </Card>
      <ProPaywall open={paywallOpen} kind="energy" onClose={() => setPaywallOpen(false)} />
    </section>
  );
}

function ChoiceGroup({
  label,
  value,
  choices,
  onSelect,
  disabled,
  emptyLabel,
}: {
  label: string;
  value: string;
  choices: string[];
  onSelect: (value: string) => void;
  disabled: boolean;
  emptyLabel?: string;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <button
            key={choice || "empty"}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(choice)}
            className={[
              "min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-[.98] disabled:pointer-events-none",
              value === choice ? "border-accent bg-accent text-white" : "border-line bg-surface-2 text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            {choice || emptyLabel || "sem inicial"}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToneChoiceGroup({
  value,
  onSelect,
  disabled,
}: {
  value: PinyinTone | null;
  onSelect: (tone: PinyinTone) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Tom</div>
      <div className="grid grid-cols-5 gap-2">
        {PINYIN_TONE_OPTIONS.map((tone, index) => (
          <button
            key={tone}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(tone)}
            className={[
              "relative flex min-h-16 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition active:scale-[.98] disabled:pointer-events-none",
              value === tone ? "border-accent bg-accent text-white" : "border-line bg-surface-2 text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            <ShortcutBadge className="shrink-0">{shortcutKeyForIndex(index)}</ShortcutBadge>
            <span className="font-serif text-xl font-semibold leading-none">{tone === 5 ? "sem" : PINYIN_TONE_GUIDE[tone - 1]?.symbol}</span>
            <span className="mt-1 text-[11px] font-semibold">{tone === 5 ? "neutro" : `tom ${tone}`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LabSectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-2">
      <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>
      {desc && <p className="mt-0.5 text-xs text-ink-soft">{desc}</p>}
    </div>
  );
}

function ToneCurve({ tone }: { tone: PinyinTone }) {
  if (tone === 5) {
    return (
      <div className="mx-auto mt-3 h-7 w-16 rounded-full border border-line bg-surface-2 text-[10px] font-semibold leading-7 text-ink-faint">
        leve
      </div>
    );
  }
  const paths: Record<1 | 2 | 3 | 4, string> = {
    1: "M4 8 H44",
    2: "M4 20 L44 6",
    3: "M4 10 C14 26, 26 26, 44 8",
    4: "M4 6 L44 22",
  };
  return (
    <svg viewBox="0 0 48 28" className="mx-auto mt-3 h-7 w-16" aria-hidden="true">
      <path d={paths[tone]} fill="none" stroke={TONE_COLOR[tone]} strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

function toneLabel(tone: PinyinTone): string {
  return tone === 5 ? "tom neutro, sem marca" : `tom ${tone}`;
}

function composePinyin(initial: string, final: string, tone: PinyinTone): string {
  const frontRounded = ["j", "q", "x"].includes(initial);
  const numericFinal = final.replace(/ü/g, frontRounded ? "u" : "v");
  return numericPinyinToDiacritics(`${initial}${numericFinal}${tone}`);
}

function gradeBuildRound(
  round: PinyinBuildRound,
  correct: boolean,
  selectedAnswer: string,
  tools: {
    ensureSrs: ReturnType<typeof useStore.getState>["ensureSrs"];
    gradeSrs: ReturnType<typeof useStore.getState>["gradeSrs"];
    recordActivityError: ReturnType<typeof useStore.getState>["recordActivityError"];
  }
) {
  const target = parseItemRef(round.itemRef);
  gradeReviewDomain({
    ensureSrs: tools.ensureSrs,
    gradeSrs: tools.gradeSrs,
    type: target.type,
    itemId: target.itemId,
    track: "som",
    domain: "pinyin",
    grade: correct ? "good" : "again",
  });

  if (correct) return;
  tools.recordActivityError({
    id: `pinyin-build:${round.id}:${Date.now()}`,
    lessonId: "pinyin-lab",
    moduleId: "pinyin-lab",
    phaseId: "lab",
    taskId: "pinyin-builder",
    questionId: round.id,
    exerciseId: "pinyin-builder",
    type: "pinyin-builder",
    prompt: `Monte o pinyin de ${round.hanzi}`,
    correctAnswer: round.pinyin,
    selectedAnswer: selectedAnswer || "incompleto",
    topic: "pinyin",
    tokens: [round.initial || "sem inicial", round.final, toneLabel(round.tone), round.pinyin],
    hanzi: round.hanzi,
    pinyin: round.pinyin,
    meaningPt: round.meaningPt,
    explanation: "A sílaba precisa combinar inicial, final e tom.",
    mistakeReason: "pinyin_montagem",
    timestamp: Date.now(),
    wrongCount: 1,
    correctionAttempts: 0,
    correctedSuccessDates: [],
    skill: "pinyin",
    targets: [{ type: target.type, itemId: target.itemId, domain: "pinyin", track: "som" }],
  });
}

function gradeAccentRound(
  round: PinyinAccentRound,
  correct: boolean,
  selectedAnswer: string,
  tools: {
    ensureSrs: ReturnType<typeof useStore.getState>["ensureSrs"];
    gradeSrs: ReturnType<typeof useStore.getState>["gradeSrs"];
    recordActivityError: ReturnType<typeof useStore.getState>["recordActivityError"];
  }
) {
  const target = parseItemRef(round.itemRef);
  for (const domain of ["pinyin", "som"] as const) {
    gradeReviewDomain({
      ensureSrs: tools.ensureSrs,
      gradeSrs: tools.gradeSrs,
      type: target.type,
      itemId: target.itemId,
      track: "som",
      domain,
      grade: correct ? "good" : "again",
    });
  }

  if (correct) return;

  const reviewKind = samePinyinBase(selectedAnswer, round.answer) ? "tone-review" : "pinyin-review";
  const primaryDomain = reviewKind === "tone-review" ? "som" : "pinyin";
  const secondaryDomain = primaryDomain === "som" ? "pinyin" : "som";
  tools.recordActivityError({
    id: `${reviewKind}:${round.id}:${Date.now()}`,
    lessonId: "pinyin-lab",
    moduleId: "pinyin-lab",
    phaseId: "lab",
    taskId: "pinyin-accent-trainer",
    questionId: round.id,
    exerciseId: `pinyin-accent:${round.id}`,
    type: reviewKind,
    prompt: `Escolha o pinyin correto de ${round.hanzi}`,
    correctAnswer: round.answer,
    selectedAnswer: selectedAnswer || "sem resposta",
    topic: "pinyin",
    tokens: [round.hanzi, round.answer, selectedAnswer, toneLabel(round.answerTone)],
    hanzi: round.hanzi,
    pinyin: round.answer,
    meaningPt: round.meaningPt,
    explanation: round.explanation,
    mistakeReason: reviewKind,
    timestamp: Date.now(),
    wrongCount: 1,
    correctionAttempts: 0,
    correctedSuccessDates: [],
    skill: primaryDomain,
    targets: [
      { type: target.type, itemId: target.itemId, domain: primaryDomain, track: "som" },
      { type: target.type, itemId: target.itemId, domain: secondaryDomain, track: "som" },
    ],
  });
}

function samePinyinBase(left: string, right: string): boolean {
  const normalize = (value: string) =>
    stripPinyinTone(value)
      .replace(/[\s'’-]/g, "")
      .toLocaleLowerCase("pt-BR");
  return normalize(left) === normalize(right);
}
