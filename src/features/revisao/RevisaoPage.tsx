import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { leagueXpKeyActivity } from "../../lib/leagueXpKeys";
import { todayKey } from "../../lib/storage";
import { useStore, type Track } from "../../lib/store";
import type { ActivityErrorRecord } from "../../lib/store";
import { dueItems, describeNextDue, makeKey, newItem, type SRSItem, type Grade, type ReviewDomain } from "../../lib/srs";
import { primaryReviewDomain } from "../../lib/reviewPlan";
import { REVIEW_DOMAIN_META, REVIEW_DOMAIN_ORDER } from "../../data/reviewDomains";
import { reviewExampleFor, type ReviewExample } from "../../data/reviewExamples";
import { charById } from "../../data/characters";
import { IconRefresh, IconTarget } from "../../components/ui/Icon";
import { chunkById } from "../../data/chunks";
import { radicalById } from "../../data/radicals";
import { Card, Button, Pill } from "../../components/ui/primitives";
import { HubHeader, HubNavGrid, HubPage, HubSection } from "../../components/layout/HubLayout";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { MandarinText } from "../../components/hanzi/MandarinText";
import { GlossText } from "../../components/hanzi/GlossText";
import { HanziBuilderExercise } from "../../components/hanzi/HanziBuilderExercise";
import { getHanziBuilder } from "../../data/hanziBuilder";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import { ImageChoiceGrid } from "../../components/hanzi/ImageChoiceGrid";
import { VisualConceptImage } from "../../components/hanzi/VisualConceptImage";
import {
  KeyboardShortcutHint,
  ShortcutBadge,
  leftPairShortcut,
  rightPairShortcut,
  shortcutKeyForIndex,
  useExerciseHotkeys,
  type ExerciseHotkeyMode,
} from "../../lib/useExerciseHotkeys";
import { isJourneyBlockingActivityError } from "../../lib/missionHelpers";
import {
  canAccessAdvancedReview,
  canAccessDetailedErrors,
  FREE_TIER_REVIEW_HINT,
  useIsPro,
} from "../../lib/proAccess";
import { FREE_REVIEW_SESSION_LIMIT } from "../../data/economy";
import { playSoundFx, type SoundKind } from "../../lib/soundFx";
import { ProPaywall } from "../../components/pro/ProPaywall";
import { useProOffer } from "../../hooks/useProOffer";
import {
  buildReviewExercise,
  buildReviewExerciseFromMistake,
  type ReviewExercise,
  type ReviewMatchPair,
  type ReviewOption,
  type ReviewTextType,
} from "./reviewExerciseBuilder";
import { ALL_LESSONS } from "../../data/journey";
import { buildReviewSessionInsight, findUnitById, srsItemMatchesModule } from "../../lib/moduleReview";

interface Resolved {
  type: SRSItem["type"];
  itemId: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  literalPt?: string;
  mnemonicPt?: string;
  example: ReviewExample;
}

type ReviewQueueEntry =
  | { kind: "mistake"; id: string; item: SRSItem; error: ActivityErrorRecord }
  | { kind: "srs"; id: string; item: SRSItem };

type ReviewMode = "all" | "mistakes" | "weak" | "sound" | "hanzi" | "phrases";

const REVIEW_MODES: { id: ReviewMode; label: string; hint: string }[] = [
  { id: "all", label: "Revisar agora", hint: "Fila inteligente completa, com formatos intercalados." },
  { id: "mistakes", label: "Erros recentes", hint: "Corrija exatamente o que você errou na lição." },
  { id: "weak", label: "Itens fracos", hint: "Reforça itens que você já errou antes." },
  { id: "sound", label: "Pinyin e tons", hint: "Áudio, pinyin escrito, acentos e tom." },
  { id: "hanzi", label: "Hànzì", hint: "Forma visual, componentes e montagem." },
  { id: "phrases", label: "Frases", hint: "Lacunas, diálogo, peças e leitura em contexto." },
];

function reviewModeFromSearch(value: string | null): ReviewMode {
  if (value === "erros") return "mistakes";
  if (value === "fracos") return "weak";
  if (value && REVIEW_MODES.some((mode) => mode.id === value)) return value as ReviewMode;
  return "all";
}

function isDetailedReviewMode(mode: ReviewMode): boolean {
  return mode !== "all";
}

// Filtra a fila já congelada pelo modo escolhido. Não reconstrói nada.
function filterQueueByModule(
  queue: ReviewQueueEntry[],
  unitId: string,
  completedLessons: string[]
): ReviewQueueEntry[] {
  return queue.filter(
    (entry) =>
      srsItemMatchesModule(entry.item, unitId, completedLessons) ||
      (entry.kind === "mistake" && entry.error.moduleId === unitId)
  );
}

function latestReviewableModuleId(completedLessons: string[]): string | undefined {
  const reviewLessons = ALL_LESSONS.filter((lesson) => lesson.isReview);
  for (let index = reviewLessons.length - 1; index >= 0; index -= 1) {
    const lesson = reviewLessons[index];
    const prior = ALL_LESSONS.filter((candidate) => candidate.unitId === lesson.unitId && !candidate.isReview);
    if (prior.every((candidate) => completedLessons.includes(candidate.id))) return lesson.unitId;
  }
  return reviewLessons[0]?.unitId;
}
// Filtra a fila já congelada pelo modo escolhido. Não reconstrói nada.
function filterQueueByMode(queue: ReviewQueueEntry[], mode: ReviewMode): ReviewQueueEntry[] {
  if (mode === "mistakes") return queue.filter((entry) => entry.kind === "mistake");
  if (mode === "weak") return queue.filter((entry) => entry.kind === "mistake" || entry.item.lapses > 0);
  if (mode === "sound") return queue.filter(isSoundEntry);
  if (mode === "hanzi") return queue.filter(isHanziEntry);
  if (mode === "phrases") return queue.filter(isPhraseEntry);
  return queue;
}

function isSoundEntry(entry: ReviewQueueEntry): boolean {
  const domain = domainForEntry(entry);
  const skill = entry.kind === "mistake" ? entry.error.skill : undefined;
  return domain === "som" || domain === "pinyin" || skill === "som" || skill === "pinyin";
}

function isHanziEntry(entry: ReviewQueueEntry): boolean {
  const domain = domainForEntry(entry);
  const skill = entry.kind === "mistake" ? entry.error.skill : undefined;
  return domain === "forma" || skill === "forma" || skill === "hanzi" || entry.item.type === "radical";
}

function isPhraseEntry(entry: ReviewQueueEntry): boolean {
  const domain = domainForEntry(entry);
  return entry.item.type === "chunk" || domain === "uso" || domain === "fala" || domain === "leitura";
}

function countByMode(queue: ReviewQueueEntry[]): Record<ReviewMode, number> {
  return {
    all: queue.length,
    mistakes: filterQueueByMode(queue, "mistakes").length,
    weak: filterQueueByMode(queue, "weak").length,
    sound: filterQueueByMode(queue, "sound").length,
    hanzi: filterQueueByMode(queue, "hanzi").length,
    phrases: filterQueueByMode(queue, "phrases").length,
  };
}

function resolve(item: SRSItem): Resolved | null {
  if (item.type === "chunk") {
    const c = chunkById[item.itemId];
    return c
      ? {
          type: item.type,
          itemId: item.itemId,
          hanzi: c.hanzi,
          pinyin: c.pinyin,
          meaningPt: c.meaningPt,
          literalPt: c.literalPt,
          example: reviewExampleFor(c.hanzi),
        }
      : null;
  }
  const c = charById[item.itemId];
  if (c) {
    return {
      type: item.type,
      itemId: item.itemId,
      hanzi: c.hanzi,
      pinyin: c.pinyin,
      meaningPt: c.meaningPt,
      mnemonicPt: c.mnemonicPt,
      example: reviewExampleFor(c.hanzi),
    };
  }
  const r = radicalById[item.itemId];
  return r
    ? {
        type: item.type,
        itemId: item.itemId,
        hanzi: r.glyph,
        pinyin: r.pinyin ?? "",
        meaningPt: r.meaningPt,
        example: reviewExampleFor(r.glyph),
      }
    : null;
}

const GRADES: { g: Grade; label: string; effect: string; variant: "outline" | "soft" | "primary" }[] = [
  { g: "again", label: "Errei", effect: "volta em ~10 min", variant: "outline" },
  { g: "hard", label: "Difícil", effect: "volta hoje", variant: "outline" },
  { g: "good", label: "Bom", effect: "agenda normal", variant: "soft" },
  { g: "easy", label: "Fácil", effect: "intervalo maior", variant: "primary" },
];

// Limite canônico do plano grátis vive em data/economy.ts.
const FREE_REVIEW_LIMIT = FREE_REVIEW_SESSION_LIMIT;
const RECENT_ERROR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function itemLabel(item: SRSItem): string {
  if (item.type === "chunk") return "Frase";
  if (item.type === "radical") return "Peça";
  return "Caractere";
}

function reviewTrack(domain: ReviewDomain): Track {
  if (domain === "som" || domain === "pinyin") return "som";
  if (domain === "fala" || domain === "uso") return "fala";
  if (domain === "leitura") return "leitura";
  return "hanzi";
}

function reviewXpForGrade(grade: Grade): number {
  if (grade === "again") return 3;
  if (grade === "hard") return 4;
  if (grade === "good") return 6;
  return 8;
}

function reviewQiForGrade(grade: Grade): number {
  if (grade === "again" || grade === "hard") return 1;
  if (grade === "good") return 2;
  return 3;
}

function gradeSound(grade: Grade): SoundKind {
  if (grade === "again") return "error";
  if (grade === "hard") return "pieceSelect";
  if (grade === "good") return "success";
  return "streak";
}

function domainForItem(item: SRSItem): ReviewDomain {
  return item.reviewDomain ?? primaryReviewDomain(item.type);
}

function reviewStateLabel(item: SRSItem): string {
  if (item.lapses > 0 && item.reps <= 1) return "fraco";
  if (item.reps === 0) return "novo";
  if (item.reps >= 5 || item.intervalDays >= 14) return "dominado";
  if (item.reps >= 3 || item.intervalDays >= 7) return "quase aprendido";
  return "em revisão";
}

function focusForQueue(queue: ReviewQueueEntry[]): { domain: ReviewDomain; score: number; count: number } | null {
  const scores = new Map<ReviewDomain, { score: number; count: number }>();
  for (const entry of queue) {
    const item = entry.item;
    const domain = domainForEntry(entry);
    const current = scores.get(domain) ?? { score: 0, count: 0 };
    current.count += 1;
    current.score +=
      1 +
      item.lapses * 2 +
      (item.reps === 0 ? 1.5 : 0) +
      Math.max(0, 2 - item.reps) * 0.5 +
      (entry.kind === "mistake" ? 4 + Math.max(0, (entry.error.wrongCount ?? 1) - 1) : 0);
    scores.set(domain, current);
  }
  const sorted = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  if (!sorted[0]) return null;
  return { domain: sorted[0][0], ...sorted[0][1] };
}

function domainForEntry(entry: ReviewQueueEntry): ReviewDomain {
  return entry.kind === "mistake" ? entry.error.targets[0]?.domain ?? domainForItem(entry.item) : domainForItem(entry.item);
}

function ReviewAnswer({ data, domain }: { data: Resolved; domain: ReviewDomain }) {
  const meta = REVIEW_DOMAIN_META[domain];
  return (
    <div className="animate-pop mt-5 rounded-2xl bg-surface-2 p-4 text-center">
      <MandarinText
        hanzi={data.hanzi}
        pinyin={data.pinyin}
        meaning={data.meaningPt}
        size="lg"
        audio
        align="center"
      />
      {data.literalPt && <div className="mt-1 text-sm text-ink-faint">literal: {data.literalPt}</div>}
      <div className="mx-auto mt-3 max-w-sm rounded-xl bg-surface px-3 py-2 text-xs text-ink-soft">
        Este cartão avaliou <span className="font-semibold text-ink">{meta.weaknessLabel}</span>. A nota afeta só esse domínio.
      </div>
      {data.mnemonicPt && (
        <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-ink-soft">
          {data.mnemonicPt}
        </p>
      )}
      <div className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-ink-soft">
        <MandarinText
          hanzi={data.example.hanzi}
          pinyin={data.example.pinyin}
          meaning={data.example.pt}
          size="sm"
          align="center"
          autoPlay={false}
        />
        {data.example.note && <div className="mt-1 text-xs text-ink-faint">{data.example.note}</div>}
      </div>
    </div>
  );
}

function ReviewModeTabs({
  mode,
  counts,
  onSelect,
}: {
  mode: ReviewMode;
  counts: Record<ReviewMode, number>;
  onSelect: (mode: ReviewMode) => void;
}) {
  return (
    <section className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Seções de revisão">
      {REVIEW_MODES.map((option) => {
        const count = counts[option.id];
        const active = mode === option.id;
        const disabled = count === 0 && !active;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            aria-pressed={active}
            title={option.hint}
            className={[
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
              active
                ? "border-accent bg-accent-soft text-accent"
                : "border-line bg-surface text-ink-soft hover:border-accent/50 hover:bg-accent-soft/50",
              disabled ? "cursor-not-allowed opacity-45 hover:border-line hover:bg-surface" : "",
            ].join(" ")}
          >
            {option.label}
            <span className="ml-2 tabular-nums text-xs opacity-70">{count}</span>
          </button>
        );
      })}
    </section>
  );
}

function ReviewSummaryTile({
  label,
  value,
  detail,
  tone = "muted",
}: {
  label: string;
  value: number | string;
  detail: string;
  tone?: "muted" | "accent";
}) {
  return (
    <Card className="rounded-xl p-3 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{label}</div>
          <div className="mt-1 font-serif text-xl font-semibold text-ink">{value}</div>
          <div className="mt-1 text-xs leading-5 text-ink-soft">{detail}</div>
        </div>
        <Pill tone={tone}>{tone === "accent" ? "Prioridade" : "OK"}</Pill>
      </div>
    </Card>
  );
}

function isHanziText(value: string | undefined): boolean {
  return /[\u3400-\u9fff]/u.test(value ?? "");
}

function normalizeReviewAnswer(value: string): string {
  return value.replace(/[，。！？、,.!?\s：；;“”"（）()]/g, "").trim().toLocaleLowerCase("pt-BR");
}

function optionTone(option: ReviewOption, selected: string | null, revealed: boolean, answer: string): "accent" | "good" | "bad" | "neutral" {
  if (!revealed) return selected === option.value ? "accent" : "neutral";
  if (normalizeReviewAnswer(option.value) === normalizeReviewAnswer(answer)) return "good";
  if (selected === option.value) return "bad";
  return "neutral";
}

function gradeSuggestion(correct: boolean, elapsedMs: number): Grade {
  if (!correct) return "again";
  if (elapsedMs <= 8000) return "easy";
  if (elapsedMs >= 22000) return "hard";
  return "good";
}

function isExerciseComplete(
  exercise: ReviewExercise,
  selectedOption: string | null,
  selectedPieceIds: string[],
  pairMatches: Record<string, string>
): boolean {
  if (!exercise.canAutoCheck) return true;
  if (exercise.kind === "sentence_build") return selectedPieceIds.length > 0;
  if (exercise.kind === "match_pairs") return (exercise.pairs ?? []).every((pair) => pairMatches[pair.id]);
  return Boolean(selectedOption);
}

function isExerciseCorrect(
  exercise: ReviewExercise,
  selectedOption: string | null,
  selectedPieceIds: string[],
  pairMatches: Record<string, string>
): boolean {
  if (exercise.kind === "sentence_build") {
    const values = selectedPieceIds
      .map((id) => exercise.pieces?.find((piece) => piece.id === id)?.value ?? "")
      .join("");
    return normalizeReviewAnswer(values) === normalizeReviewAnswer((exercise.targetValues ?? []).join(""));
  }
  if (exercise.kind === "match_pairs") {
    return (exercise.pairs ?? []).every((pair) => pairMatches[pair.id] === pair.right);
  }
  return normalizeReviewAnswer(selectedOption ?? "") === normalizeReviewAnswer(exercise.answer);
}

// examMode: esconde a dica interativa (popover de pinyin/significado e áudio ao
// tocar). Usado antes de revelar a resposta para não entregar o gabarito.
function TypedValue({
  value,
  type,
  className = "",
  examMode = false,
}: {
  value: string;
  type?: ReviewTextType;
  className?: string;
  examMode?: boolean;
}) {
  const cjk = type === "hanzi" || isHanziText(value);
  if (type === "audio") return <SpeakButton text={value} size="sm" label="Ouvir" />;
  if (type === "pinyin") return <Pinyin text={value} className={["font-serif", className].filter(Boolean).join(" ")} />;
  if (cjk) return <GlossText text={value} className={className} examMode={examMode} />;
  return <span className={[cjk ? "hanzi" : "", className].filter(Boolean).join(" ")}>{formatPinyinForDisplay(value)}</span>;
}

function ChoiceButton({
  option,
  selected,
  revealed,
  answer,
  shortcut,
  onSelect,
}: {
  option: ReviewOption;
  selected: string | null;
  revealed: boolean;
  answer: string;
  shortcut?: string;
  onSelect: (value: string) => void;
}) {
  const tone = optionTone(option, selected, revealed, answer);
  const className =
    tone === "good"
      ? "border-good bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]"
      : tone === "bad"
        ? "border-danger bg-[rgb(var(--danger)/0.10)] text-danger"
        : tone === "accent"
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-surface text-ink hover:border-accent/50 hover:bg-accent-soft/60";

  return (
    <button
      type="button"
      disabled={revealed}
      onClick={() => onSelect(option.value)}
      aria-label={shortcut ? `Opção ${shortcut}: ${option.label}` : option.label}
      className={["relative min-h-12 rounded-xl border px-3 py-2 text-center text-sm font-semibold transition", className].join(" ")}
    >
      {shortcut && <ShortcutBadge className="absolute left-2 top-2">{shortcut}</ShortcutBadge>}
      <TypedValue value={option.label} type={option.type} className={isHanziText(option.label) ? "text-2xl" : ""} examMode={!revealed} />
      {option.detail && revealed && <span className="mt-0.5 block text-xs font-normal opacity-75">{formatPinyinForDisplay(option.detail)}</span>}
    </button>
  );
}

function ReviewExercisePanel({
  exercise,
  selectedOption,
  selectedPieceIds,
  pairMatches,
  activePairId,
  revealed,
  onSelectOption,
  onTogglePiece,
  onClearPieces,
  onSetActivePair,
  onMatchPair,
}: {
  exercise: ReviewExercise;
  selectedOption: string | null;
  selectedPieceIds: string[];
  pairMatches: Record<string, string>;
  activePairId: string | null;
  revealed: boolean;
  onSelectOption: (value: string) => void;
  onTogglePiece: (id: string) => void;
  onClearPieces: () => void;
  onSetActivePair: (id: string) => void;
  onMatchPair: (right: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
      <div className="text-center text-sm font-medium text-ink-soft">{exercise.prompt}</div>
      {exercise.audioText && (
        <div className="mt-4 flex justify-center">
          <SpeakButton text={exercise.audioText} size="lg" label="Ouvir" autoPlay />
        </div>
      )}
      {exercise.displayText && (
        <div className="mt-4 rounded-2xl bg-surface px-4 py-4 text-center">
          <TypedValue
            value={exercise.displayText}
            type={exercise.displayType}
            className={isHanziText(exercise.displayText) ? "text-3xl text-ink" : "text-2xl font-semibold text-ink"}
            examMode={!revealed}
          />
        </div>
      )}
      {exercise.kind === "speak" && (
        <div className="mt-4 rounded-2xl bg-surface px-4 py-4 text-center">
          <div className="text-2xl font-semibold text-ink">{exercise.entity.meaningPt}</div>
          {exercise.entity.literalPt && <div className="mt-2 text-sm text-ink-soft">literal: {exercise.entity.literalPt}</div>}
          <p className="mt-3 text-sm text-ink-soft">Fale primeiro. Depois confira, toque no modelo e compare ritmo, tom e pinyin.</p>
        </div>
      )}
      <div className="mt-4 text-center text-lg font-semibold text-ink">{exercise.question}</div>

      {exercise.kind === "sentence_build" && (
        <SentenceBuildExercise
          exercise={exercise}
          selectedPieceIds={selectedPieceIds}
          revealed={revealed}
          onTogglePiece={onTogglePiece}
          onClearPieces={onClearPieces}
        />
      )}

      {exercise.kind === "match_pairs" && (
        <MatchPairsExercise
          pairs={exercise.pairs ?? []}
          matches={pairMatches}
          activePairId={activePairId}
          revealed={revealed}
          onSetActivePair={onSetActivePair}
          onMatchPair={onMatchPair}
        />
      )}

      {exercise.kind === "image_choice" && exercise.visualConceptId && (
        <div className="mt-4 flex justify-center">
          {exercise.imageChoiceMode === "choose_image" && exercise.displayText ? (
            <MandarinText hanzi={exercise.displayText} size="lg" align="center" />
          ) : exercise.imageChoiceMode !== "listen_and_choose_image" && exercise.imageChoiceMode !== "choose_image" ? (
            <VisualConceptImage conceptId={exercise.visualConceptId} size="lg" />
          ) : null}
        </div>
      )}

      {exercise.kind === "image_choice" && exercise.imageOptionIds && (
        <div className="mt-5">
          <ImageChoiceGrid
            mode="images"
            options={exercise.imageOptionIds}
            answered={revealed ? selectedOption : null}
            selected={selectedOption}
            correctAnswer={exercise.answer}
            onSelect={onSelectOption}
          />
        </div>
      )}

      {exercise.kind === "image_choice" && exercise.options && !exercise.imageOptionIds && (
        <>
          <KeyboardShortcutHint />
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {exercise.options.map((option, index) => (
              <ChoiceButton
                key={option.id}
                option={option}
                shortcut={index < 10 ? shortcutKeyForIndex(index) : undefined}
                selected={selectedOption}
                revealed={revealed}
                answer={exercise.answer}
                onSelect={onSelectOption}
              />
            ))}
          </div>
        </>
      )}

      {exercise.options && !["sentence_build", "match_pairs", "image_choice"].includes(exercise.kind) && (
        <>
        <KeyboardShortcutHint />
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {exercise.options.map((option, index) => (
            <ChoiceButton
              key={option.id}
              option={option}
              shortcut={index < 10 ? shortcutKeyForIndex(index) : undefined}
              selected={selectedOption}
              revealed={revealed}
              answer={exercise.answer}
              onSelect={onSelectOption}
            />
          ))}
        </div>
        </>
      )}
    </div>
  );
}

function SentenceBuildExercise({
  exercise,
  selectedPieceIds,
  revealed,
  onTogglePiece,
  onClearPieces,
}: {
  exercise: ReviewExercise;
  selectedPieceIds: string[];
  revealed: boolean;
  onTogglePiece: (id: string) => void;
  onClearPieces: () => void;
}) {
  const selectedPieces = selectedPieceIds
    .map((id) => exercise.pieces?.find((piece) => piece.id === id))
    .filter((piece): piece is NonNullable<typeof piece> => Boolean(piece));
  return (
    <div className="mt-5 space-y-4">
      <div className="min-h-14 rounded-2xl border border-dashed border-line bg-surface px-3 py-3 text-center">
        {selectedPieces.length ? (
          <GlossText
            text={selectedPieces.map((piece) => piece.value).join("")}
            className="text-2xl font-semibold text-ink"
            examMode={!revealed}
          />
        ) : (
          <span className="text-sm text-ink-faint">Toque nas peças abaixo</span>
        )}
      </div>
      <KeyboardShortcutHint />
      <div className="flex flex-wrap justify-center gap-2">
        {(exercise.pieces ?? []).map((piece, index) => {
          const used = selectedPieceIds.includes(piece.id);
          return (
            <button
              key={piece.id}
              type="button"
              disabled={revealed || used}
              onClick={() => onTogglePiece(piece.id)}
              aria-label={index < 10 ? `Peça ${shortcutKeyForIndex(index)}: ${piece.value}` : piece.value}
              className={[
                "relative min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                used ? "border-line bg-surface-2 text-ink-faint opacity-55" : "border-line bg-surface text-ink hover:border-accent hover:bg-accent-soft",
                isHanziText(piece.value) ? "text-xl" : "",
              ].join(" ")}
            >
              {index < 10 && <ShortcutBadge className="absolute left-1.5 top-1.5">{shortcutKeyForIndex(index)}</ShortcutBadge>}
              <TypedValue value={piece.value} type={isHanziText(piece.value) ? "hanzi" : undefined} examMode={!revealed} />
            </button>
          );
        })}
      </div>
      {!revealed && selectedPieceIds.length > 0 && (
        <button type="button" onClick={onClearPieces} className="mx-auto block text-xs font-semibold text-ink-faint hover:text-accent">
          Limpar peças
        </button>
      )}
    </div>
  );
}

function MatchPairsExercise({
  pairs,
  matches,
  activePairId,
  revealed,
  onSetActivePair,
  onMatchPair,
}: {
  pairs: ReviewMatchPair[];
  matches: Record<string, string>;
  activePairId: string | null;
  revealed: boolean;
  onSetActivePair: (id: string) => void;
  onMatchPair: (right: string) => void;
}) {
  const rightOptions = pairs.map((pair) => pair.right).reverse();
  return (
    <div className="mt-5">
      <KeyboardShortcutHint pairs />
    <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1fr]">
      <div className="space-y-2">
        {pairs.map((pair, index) => {
          const matched = matches[pair.id];
          const good = revealed && matched === pair.right;
          const bad = revealed && matched && matched !== pair.right;
          return (
            <button
              key={pair.id}
              type="button"
              disabled={revealed}
              onClick={() => onSetActivePair(pair.id)}
              className={[
                "relative w-full rounded-xl border px-3 py-3 text-left transition",
                activePairId === pair.id ? "border-accent bg-accent-soft" : "border-line bg-surface",
                good ? "border-good bg-[rgb(var(--good)/0.12)]" : "",
                bad ? "border-danger bg-[rgb(var(--danger)/0.10)]" : "",
              ].join(" ")}
            >
              <ShortcutBadge className="absolute left-2 top-2">{leftPairShortcut(index)}</ShortcutBadge>
              <div className="font-semibold text-ink">
                <TypedValue value={pair.left} type={pair.leftType} className={isHanziText(pair.left) ? "text-2xl" : ""} examMode={!revealed} />
              </div>
              <div className="mt-1 text-xs text-ink-faint">{matched ?? "Escolha o par"}</div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2">
        {rightOptions.map((right, index) => (
          <button
            key={right}
            type="button"
            disabled={revealed || !activePairId}
            onClick={() => onMatchPair(right)}
            className="relative min-h-11 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:bg-accent-soft disabled:opacity-55"
          >
            <ShortcutBadge className="absolute left-2 top-2">{rightPairShortcut(index)}</ShortcutBadge>
            {right}
          </button>
        ))}
      </div>
    </div>
    </div>
  );
}

function ExerciseFeedback({
  exercise,
  correct,
  suggestedGrade,
  showMistakeReason = true,
}: {
  exercise: ReviewExercise;
  correct: boolean | null;
  suggestedGrade: Grade | null;
  showMistakeReason?: boolean;
}) {
  const title = correct == null
    ? "Confira a resposta"
    : correct && exercise.remediation
      ? "Erro corrigido!"
      : correct
        ? "Boa!"
        : "Resposta correta";
  return (
    <div
      className={[
        "animate-pop mt-5 rounded-2xl p-4 text-center",
        correct === false ? "bg-[rgb(var(--danger)/0.08)]" : "bg-surface-2",
      ].join(" ")}
    >
      <div className="text-sm font-semibold text-ink">{title}</div>
      <div className="mt-3">
        <MandarinText
          hanzi={exercise.entity.hanzi}
          pinyin={exercise.entity.pinyin}
          meaning={exercise.entity.meaningPt}
          size="md"
          audio
          align="center"
        />
      </div>
      <p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">{exercise.explanation}</p>
      {correct && exercise.remediation && (
        <p className="mx-auto mt-2 max-w-sm text-xs font-semibold text-[rgb(var(--good))]">
          Agora essa frase voltou para revisão espaçada.
        </p>
      )}
      {showMistakeReason && exercise.mistakeReason && (
        <p className="mx-auto mt-2 max-w-sm text-xs text-ink-faint">
          Motivo provável: {exercise.mistakeReason}
        </p>
      )}
      {correct === false && (
        <p className="mx-auto mt-2 max-w-sm text-xs font-medium text-danger">
          Esse erro vai voltar no fim da fila para você corrigir agora.
        </p>
      )}
      {suggestedGrade && (
        <div className="mx-auto mt-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          Sugestão: {GRADES.find((grade) => grade.g === suggestedGrade)?.label}
        </div>
      )}
    </div>
  );
}

function DetailedErrorsUpsellCard({
  onOpenPaywall,
  className = "",
}: {
  onOpenPaywall: () => void;
  className?: string;
}) {
  return (
    <Card className={["rounded-xl border-[#B7791F]/25 bg-[#B7791F]/5 p-4 shadow-none", className].filter(Boolean).join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Erros detalhados</div>
          <h2 className="mt-1 text-sm font-semibold text-ink">Histórico e padrões de erro</h2>
        </div>
        <Pill tone="gold">Pro</Pill>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        Erros detalhados fazem parte do Longyu Pro. Você ainda pode fazer revisões básicas pela Jornada.
      </p>
      <Button size="sm" variant="outline" className="mt-4 w-full" onClick={onOpenPaywall}>
        Ver Longyu Pro
      </Button>
    </Card>
  );
}

function DetailedErrorsPanel({
  errors,
  activeErrors,
  onCorrectWeakness,
}: {
  errors: ActivityErrorRecord[];
  activeErrors: ActivityErrorRecord[];
  onCorrectWeakness: () => void;
}) {
  const sortedErrors = [...errors].sort((a, b) => b.timestamp - a.timestamp);
  const priorityError = [...activeErrors].sort(
    (a, b) => (b.wrongCount ?? 1) - (a.wrongCount ?? 1) || b.timestamp - a.timestamp
  )[0];
  const repeatedCount = errors.filter((error) => (error.wrongCount ?? 1) > 1).length;
  const correctedCount = errors.filter((error) => error.correctedAt).length;
  const domainGroups = REVIEW_DOMAIN_ORDER.map((domain) => ({
    label: REVIEW_DOMAIN_META[domain].shortLabel,
    count: errors.filter((error) => errorDomain(error) === domain).length,
  })).filter((group) => group.count > 0);
  const lessonGroups = topCounts(errors.map((error) => error.lessonId || error.moduleId || "sem lição"), 4);
  const hanziGroups = topCounts(errors.map(errorHanziLabel).filter(Boolean), 4);
  const pinyinGroups = topCounts(
    errors
      .filter((error) => ["som", "pinyin"].includes(errorDomain(error)) || Boolean(error.pinyin))
      .map((error) => error.pinyin || REVIEW_DOMAIN_META[errorDomain(error)].shortLabel),
    4
  );

  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-xl font-semibold text-ink">Erros detalhados</h2>
            <Pill tone="gold">Pro</Pill>
          </div>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            Veja seus erros recentes e corrija pontos fracos.
          </p>
        </div>
        <Button size="sm" disabled={activeErrors.length === 0} onClick={onCorrectWeakness}>
          Corrigir pontos fracos
        </Button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <ErrorMetric label="Pendentes" value={activeErrors.length} />
        <ErrorMetric label="Histórico" value={errors.length} />
        <ErrorMetric label="Repetidos" value={repeatedCount} />
        <ErrorMetric label="Corrigidos" value={correctedCount} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <ErrorGroup label="Por competência" groups={domainGroups} empty="Sem competência dominante." />
        <ErrorGroup label="Por lição" groups={lessonGroups} empty="Sem lição associada." />
        <ErrorGroup label="Por hànzì" groups={hanziGroups} empty="Sem hànzì específico." />
        <ErrorGroup label="Por pinyin/tom" groups={pinyinGroups} empty="Sem padrão de som ainda." />
      </div>

      {priorityError && (
        <div className="mt-4 rounded-xl border border-accent-soft bg-accent-soft/30 px-3 py-2 text-sm text-ink-soft">
          <span className="font-semibold text-ink">Prioridade:</span>{" "}
          {errorSummary(priorityError)} · {(priorityError.wrongCount ?? 1)}x
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Histórico completo
        </div>
        <div className="max-h-80 overflow-y-auto rounded-xl border border-line">
          {sortedErrors.length === 0 ? (
            <div className="p-4 text-sm text-ink-soft">Os erros detalhados aparecem depois das próximas revisões e lições.</div>
          ) : (
            sortedErrors.map((error) => (
              <div key={error.id} className="border-b border-line px-3 py-3 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-ink">{errorSummary(error)}</div>
                  <Pill tone={error.correctedAt ? "good" : "accent"}>{error.correctedAt ? "Corrigido" : "Pendente"}</Pill>
                </div>
                <div className="mt-1 text-xs leading-5 text-ink-soft">
                  Esperado: {error.correctAnswer} · Resposta: {error.selectedAnswer}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-faint">
                  <span>{REVIEW_DOMAIN_META[errorDomain(error)].shortLabel}</span>
                  <span>{error.lessonId || error.moduleId}</span>
                  <span>{formatErrorDate(error.timestamp)}</span>
                  {(error.wrongCount ?? 1) > 1 && <span>{error.wrongCount} repetições</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ErrorMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-1 font-serif text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function ErrorGroup({
  label,
  groups,
  empty,
}: {
  label: string;
  groups: { label: string; count: number }[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {groups.length === 0 ? (
          <span className="text-xs text-ink-faint">{empty}</span>
        ) : (
          groups.map((group) => (
            <Pill key={group.label} tone="muted">
              {group.label} · {group.count}
            </Pill>
          ))
        )}
      </div>
    </div>
  );
}

function errorDomain(error: ActivityErrorRecord): ReviewDomain {
  return error.targets[0]?.domain ?? (error.skill === "hanzi" ? "forma" : error.skill);
}

function errorHanziLabel(error: ActivityErrorRecord): string {
  if (error.hanzi) return error.hanzi;
  const hanziToken = (error.tokens ?? []).find((token) => isHanziText(token));
  return hanziToken ?? "";
}

function errorSummary(error: ActivityErrorRecord): string {
  return error.hanzi || error.meaningPt || error.prompt || error.correctAnswer;
}

function topCounts(values: string[], limit: number): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function formatErrorDate(timestamp: number): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(timestamp);
}

function ReviewInsightGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: { label: string; count: number }[];
  tone: "good" | "accent";
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <Pill key={item.label} tone={tone}>
            {item.label} · {item.count}
          </Pill>
        ))}
      </div>
    </div>
  );
}

export function RevisaoPage() {
  const [searchParams] = useSearchParams();
  const srs = useStore((s) => s.srs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const addXp = useStore((s) => s.addXp);
  const addQi = useStore((s) => s.addQi);
  const addMinutes = useStore((s) => s.addMinutes);
  const isPremium = useIsPro();
  const soundEffects = useStore((s) => s.soundEffects);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const lessonStarsById = useStore((s) => s.lessonStarsById);
  const completedLessons = useStore((s) => s.completedLessons);
  const recordActivityError = useStore((s) => s.recordActivityError);
  const markActivityErrorCorrected = useStore((s) => s.markActivityErrorCorrected);
  const recentActivityErrors = useStore((s) => s.recentActivityErrors);
  const hanziBuilderProgress = useStore((s) => s.hanziBuilderProgressByChar);
  const requestedMode = reviewModeFromSearch(searchParams.get("modo"));
  const moduleUnitId = searchParams.get("modulo") ?? undefined;
  const moduleUnit = moduleUnitId ? findUnitById(moduleUnitId) : undefined;
  const suggestedModuleId = useMemo(() => latestReviewableModuleId(completedLessons), [completedLessons]);
  const detailedErrorsAccess = canAccessDetailedErrors({ isPremium });
  const detailedErrorsAllowed = detailedErrorsAccess.allowed;
  const requestedDetailedErrors = isDetailedReviewMode(requestedMode);
  const activeActivityErrors = useMemo(
    () => recentActivityErrors.filter((error) => !error.correctedAt && error.timestamp >= Date.now() - RECENT_ERROR_WINDOW_MS),
    [recentActivityErrors]
  );

  // Congela a fila no início da sessão, mas permite um rebuild se o storage
  // reidratar depois do primeiro paint (evita sessão vazia com dados locais).
  const sessionQueueRef = useRef<ReviewQueueEntry[] | null>(null);
  const fullQueue = useMemo(() => {
    const built = buildReviewQueue(srs, detailedErrorsAllowed ? activeActivityErrors : [], {
      includeRecentWeakItems: detailedErrorsAllowed,
    });
    const scoped = moduleUnitId ? filterQueueByModule(built, moduleUnitId, completedLessons) : built;
    if (sessionQueueRef.current === null) {
      sessionQueueRef.current = scoped;
      return scoped;
    }
    if (sessionQueueRef.current.length === 0 && scoped.length > 0) {
      sessionQueueRef.current = scoped;
    }
    return sessionQueueRef.current;
  }, [activeActivityErrors, completedLessons, detailedErrorsAllowed, moduleUnitId, srs]);
  // Modos de revisão: recuperar erros da tentativa/recentes, reforçar itens
  // fracos ou percorrer a fila inteligente inteira. O modo só filtra a fila já
  // congelada — não reconstrói SRS nem duplica nada.
  const [mode, setMode] = useState<ReviewMode>(() =>
    detailedErrorsAllowed || !requestedDetailedErrors ? requestedMode : "all"
  );
  const modeCounts = useMemo(() => countByMode(fullQueue), [fullQueue]);
  const modeQueue = useMemo(
    () => (detailedErrorsAllowed ? filterQueueByMode(fullQueue, mode) : fullQueue),
    [detailedErrorsAllowed, fullQueue, mode]
  );
  const advancedReviewAccess = canAccessAdvancedReview({ isPremium });
  const baseQueue = useMemo(
    () => (advancedReviewAccess.limited ? modeQueue.slice(0, FREE_REVIEW_LIMIT) : modeQueue),
    [advancedReviewAccess.limited, modeQueue]
  );
  const [retryQueue, setRetryQueue] = useState<ReviewQueueEntry[]>([]);
  const queue = useMemo(() => [...baseQueue, ...retryQueue], [baseQueue, retryQueue]);
  const domainCounts = useMemo(() => countByDomain(queue), [queue]);
  const focus = useMemo(() => (detailedErrorsAllowed ? focusForQueue(fullQueue) : null), [detailedErrorsAllowed, fullQueue]);
  const weakItemsCount = useMemo(
    () => (detailedErrorsAllowed ? Object.values(srs).filter((srsItem) => reviewStateLabel(srsItem) === "fraco").length : 0),
    [detailedErrorsAllowed, srs]
  );
  const recentErrorsCount = useMemo(
    () =>
      detailedErrorsAllowed
        ? recentActivityErrors.filter((error) => error.timestamp >= Date.now() - RECENT_ERROR_WINDOW_MS).length
        : 0,
    [detailedErrorsAllowed, recentActivityErrors]
  );
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [sessionGrades, setSessionGrades] = useState<{ domain: ReviewDomain; correct: boolean; label: string }[]>([]);
  const [returningItems, setReturningItems] = useState<string[]>([]);
  const sessionInsight = useMemo(() => buildReviewSessionInsight(sessionGrades, returningItems), [returningItems, sessionGrades]);
  const [proPaywallOpen, setProPaywallOpen] = useState(false);
  const [proPaywallKind, setProPaywallKind] = useState<"review" | "errors">("review");
  const contextualOffer = useProOffer();
  const openPaywall = useCallback((kind: "review" | "errors") => {
    contextualOffer.consider({
      reviewLimitHit: kind === "review",
      triedDetailedErrors: kind === "errors",
    });
    setProPaywallKind(kind);
    setProPaywallOpen(true);
  }, [contextualOffer]);
  const handleCorrectWeakness = useCallback(() => setMode("mistakes"), []);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedPieceIds, setSelectedPieceIds] = useState<string[]>([]);
  const [pairMatches, setPairMatches] = useState<Record<string, string>>({});
  const [activePairId, setActivePairId] = useState<string | null>(null);
  const [exerciseCorrect, setExerciseCorrect] = useState<boolean | null>(null);
  const [suggestedGrade, setSuggestedGrade] = useState<Grade | null>(null);
  const gradedReviewKeysRef = useRef(new Set<string>());
  const exerciseStartedAtRef = useRef(Date.now());
  const continueReviewRef = useRef<() => void>(() => undefined);
  const verifyReviewRef = useRef<() => void>(() => undefined);

  const entry = queue[pos];
  const item = entry?.item;
  const sourceError = entry?.kind === "mistake" ? entry.error : null;
  const data = item ? resolve(item) : null;
  const domain = entry ? domainForEntry(entry) : "significado";
  const learnedItems = useMemo(() => Object.values(srs), [srs]);
  const exercise = useMemo(
    () =>
      entry
        ? entry.kind === "mistake"
          ? buildReviewExerciseFromMistake({
              mistake: entry.error,
              learnedItems,
              hanziBuilderProgress,
            })
          : buildReviewExercise({
              item: entry.item,
              learnedItems,
              domain,
              errorHistory: detailedErrorsAllowed ? learnedItems.filter((learned) => learned.lapses > 0) : undefined,
              activityErrors: detailedErrorsAllowed ? activeActivityErrors : undefined,
              hanziBuilderProgress,
            })
        : null,
    [activeActivityErrors, detailedErrorsAllowed, domain, entry, hanziBuilderProgress, item, learnedItems]
  );

  useEffect(() => {
    setRevealed(false);
    setSelectedOption(null);
    setSelectedPieceIds([]);
    setPairMatches({});
    setActivePairId(null);
    setExerciseCorrect(null);
    setSuggestedGrade(null);
    exerciseStartedAtRef.current = Date.now();
  }, [pos, entry?.id, item?.id, exercise?.kind]);

  // Trocar de modo recomeça a fila filtrada do zero (sem carregar retry antigo).
  useEffect(() => {
    setPos(0);
    setRetryQueue([]);
  }, [mode]);

  // Hotkeys precisam rodar em todo render (antes dos early returns). Sem isso, a
  // reidratação Pro (fila vazia → fila com itens) muda a quantidade de hooks e
  // dispara React #300.
  const reviewBuilderForHotkeys =
    exercise?.kind === "hanzi_build" ? getHanziBuilder(exercise.builderId) : undefined;
  const reviewRightOptionsForHotkeys =
    exercise?.kind === "match_pairs" ? (exercise.pairs ?? []).map((pair) => pair.right).reverse() : [];
  const reviewHotkeyModeForHooks: ExerciseHotkeyMode =
    exercise?.kind === "match_pairs" ? "pairs" : exercise?.kind === "sentence_build" ? "builder" : "choice";
  const reviewOptionCountForHooks =
    exercise?.kind === "sentence_build" ? exercise.pieces?.length ?? 0 : exercise?.options?.length ?? 0;
  const sessionReadyForHotkeys = Boolean(
    entry && item && data && exercise && !(requestedDetailedErrors && !detailedErrorsAllowed)
  );

  useExerciseHotkeys({
    enabled: sessionReadyForHotkeys && !reviewBuilderForHotkeys,
    mode: reviewHotkeyModeForHooks,
    optionCount: reviewOptionCountForHooks,
    leftCount: exercise?.kind === "match_pairs" ? exercise.pairs?.length ?? 0 : 0,
    rightCount: reviewRightOptionsForHotkeys.length,
    isAnswered: revealed,
    hasSelection: exercise
      ? isExerciseComplete(exercise, selectedOption, selectedPieceIds, pairMatches)
      : false,
    onSelectOption: (index) => {
      if (!exercise || revealed) return;
      if (exercise.kind === "sentence_build") {
        const piece = exercise.pieces?.[index];
        if (piece) {
          setSelectedPieceIds((ids) =>
            ids.includes(piece.id) ? ids.filter((pieceId) => pieceId !== piece.id) : [...ids, piece.id]
          );
        }
        return;
      }
      const option = exercise.options?.[index];
      if (option) setSelectedOption(option.value);
    },
    onSelectLeft: (index) => {
      if (!exercise || revealed || exercise.kind !== "match_pairs") return;
      const pair = exercise.pairs?.[index];
      if (pair) setActivePairId(pair.id);
    },
    onSelectRight: (index) => {
      if (!exercise || revealed || exercise.kind !== "match_pairs") return;
      const right = reviewRightOptionsForHotkeys[index];
      if (!right || !activePairId) return;
      setPairMatches((matches) => ({ ...matches, [activePairId]: right }));
      const nextPair = (exercise.pairs ?? []).find((pair) => pair.id !== activePairId && !pairMatches[pair.id]);
      setActivePairId(nextPair?.id ?? null);
    },
    onSubmit: () => verifyReviewRef.current(),
    onContinue: () => continueReviewRef.current(),
  });

  if (requestedDetailedErrors && !detailedErrorsAllowed) {
    return (
      <HubPage>
        <HubHeader
          eyebrow="Revisão"
          title="Erros detalhados"
          desc="Histórico e correção intensiva fazem parte do Longyu Pro."
        />
        <HubSection title="Plano grátis">
          <HubNavGrid
            items={[
              {
                title: "Revisão básica",
                desc: "Fila gratuita do que você aprendeu.",
                icon: IconRefresh,
                to: "/revisao",
                featured: true,
              },
              {
                title: "Erros detalhados",
                desc: "Padrões de erro e histórico.",
                icon: IconTarget,
                status: "Pro",
                statusTone: "gold",
                pro: true,
                onClick: () => openPaywall("errors"),
              },
            ]}
            columns="grid-cols-2"
          />
        </HubSection>
        <DetailedErrorsUpsellCard onOpenPaywall={() => openPaywall("errors")} />
        <ProPaywall open={proPaywallOpen} kind={proPaywallKind} offer={contextualOffer.offer} onClose={() => setProPaywallOpen(false)} />
      </HubPage>
    );
  }

  if (!entry || !item || !data || !exercise) {
    return (
      <HubPage>
        <HubHeader
          eyebrow={moduleUnit ? "Revisão de módulo" : "Revisão"}
          title={moduleUnit ? moduleUnit.title : detailedErrorsAllowed ? "Revisão por domínio" : "Revisão básica"}
          desc={
            moduleUnit
              ? "Fila focada no módulo atual, com reforço de erros e itens fracos."
              : detailedErrorsAllowed
                ? "Som, forma, uso e frases em fila adaptativa."
                : "Reforce o que você aprendeu. Histórico detalhado fica no Pro."
          }
        />

        <HubSection title="Modos" desc="Escolha o tipo de revisão.">
          <HubNavGrid
            items={[
              {
                title: "Revisão básica",
                desc: "Fila gratuita do dia.",
                icon: IconRefresh,
                to: "/revisao",
                status: modeCounts.all > 0 ? `${modeCounts.all} itens` : "Em dia",
                featured: !detailedErrorsAllowed,
              },
              {
                title: "Itens fracos",
                desc: "Priorize lapsos.",
                icon: IconTarget,
                to: "/revisao?modo=fracos",
                status: detailedErrorsAllowed ? `${modeCounts.weak} itens` : "Pro",
                statusTone: detailedErrorsAllowed ? "accent" : "gold",
                pro: !detailedErrorsAllowed,
                disabled: !detailedErrorsAllowed,
              },
              {
                title: "Revisão de módulo",
                desc: "Foco no módulo atual da Jornada.",
                icon: IconRefresh,
                to: suggestedModuleId ? `/revisao?modulo=${suggestedModuleId}` : "/jornada",
                status: moduleUnitId ? "Ativo" : suggestedModuleId ? "Disponível" : "Jornada",
                featured: Boolean(moduleUnitId),
              },
              {
                title: "Erros detalhados",
                desc: "Corrija erros recentes.",
                icon: IconTarget,
                to: detailedErrorsAllowed ? "/revisao?modo=erros" : undefined,
                onClick: detailedErrorsAllowed ? undefined : () => openPaywall("errors"),
                status: "Pro",
                statusTone: "gold",
                pro: !detailedErrorsAllowed,
                featured: detailedErrorsAllowed && modeCounts.mistakes > 0,
              },
            ]}
            columns="grid-cols-2 sm:grid-cols-4"
          />
        </HubSection>

        <Card className="rounded-xl border-line/70 p-6 text-center shadow-none">
          {reviewed > 0 ? (
            <>
              <div className="font-serif text-2xl font-semibold text-ink">
                Sessão concluída
              </div>
              <p className="mt-1 text-ink-soft">
                {reviewed} {reviewed === 1 ? "item revisado" : "itens revisados"}.
                {sessionInsight.nextFocus ? ` Próximo foco: ${sessionInsight.nextFocus}.` : " Volte amanhã para os próximos."}
              </p>
              {(sessionInsight.strengths.length > 0 || sessionInsight.weaknesses.length > 0) && (
                <div className="mt-5 grid gap-3 text-left sm:grid-cols-2">
                  <ReviewInsightGroup title="Pontos fortes" items={sessionInsight.strengths} tone="good" />
                  <ReviewInsightGroup title="Pontos fracos" items={sessionInsight.weaknesses} tone="accent" />
                </div>
              )}
              {sessionInsight.returning.length > 0 && (
                <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4 text-left text-sm text-ink-soft">
                  <div className="font-semibold text-ink">Voltam em breve</div>
                  <p className="mt-1">{sessionInsight.returning.join(" · ")}</p>
                </div>
              )}
              {detailedErrorsAllowed && sessionGrades.length > 0 && (
                <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4 text-left">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Por habilidade</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {REVIEW_DOMAIN_ORDER.map((domain) => {
                      const domainGrades = sessionGrades.filter((entry) => entry.domain === domain);
                      if (domainGrades.length === 0) return null;
                      const accuracy = Math.round(
                        (domainGrades.filter((entry) => entry.correct).length / domainGrades.length) * 100
                      );
                      return (
                        <Pill key={domain} tone={accuracy >= 70 ? "good" : "accent"}>
                          {REVIEW_DOMAIN_META[domain].shortLabel} · {accuracy}%
                        </Pill>
                      );
                    })}
                  </div>
                </div>
              )}
              {!isPremium && fullQueue.length > queue.length && (
                <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4 text-sm text-ink-soft">
                  Ainda há {fullQueue.length - queue.length} prioridades de revisão. {FREE_TIER_REVIEW_HINT}
                  <button type="button" onClick={() => openPaywall("review")} className="mt-3 inline-flex font-semibold text-accent hover:underline">
                    Ver Longyu Pro
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="font-serif text-2xl font-semibold text-ink">
                Nada para revisar agora
              </div>
              <p className="mt-1 text-ink-soft">
                Aprenda caracteres no Hànzì ou chunks na Fala para alimentar a fila.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link to="/hanzi">
                  <Button variant="outline">Ir para Hànzì</Button>
                </Link>
                <Link to="/fala">
                  <Button>Ir para Fala</Button>
                </Link>
              </div>
            </>
          )}
        </Card>
        <ProPaywall open={proPaywallOpen} kind={proPaywallKind} offer={contextualOffer.offer} onClose={() => setProPaywallOpen(false)} />
      </HubPage>
    );
  }

  const domainMeta = REVIEW_DOMAIN_META[domain];
  const activeExercise = exercise;
  const reviewBuilder =
    activeExercise.kind === "hanzi_build" ? getHanziBuilder(activeExercise.builderId) : undefined;

  function verifyExercise() {
    if (!isExerciseComplete(activeExercise, selectedOption, selectedPieceIds, pairMatches)) return;
    const elapsed = Date.now() - exerciseStartedAtRef.current;
    if (!activeExercise.canAutoCheck) {
      setExerciseCorrect(null);
      setSuggestedGrade(null);
      setRevealed(true);
      playSoundFx("pieceSelect", soundEffects);
      return;
    }
    const correct = isExerciseCorrect(activeExercise, selectedOption, selectedPieceIds, pairMatches);
    gradeMatchPairReinforcements(activeExercise, pairMatches);
    setExerciseCorrect(correct);
    setSuggestedGrade(gradeSuggestion(correct, elapsed));
    setRevealed(true);
    playSoundFx(correct ? "success" : "error", soundEffects);
  }

  function gradeMatchPairReinforcements(exercise: ReviewExercise, matches: Record<string, string>) {
    if (exercise.kind !== "match_pairs") return;
    const seen = new Set<string>();
    for (const pair of exercise.pairs ?? []) {
      if (!pair.reinforcement || !pair.reviewType || !pair.reviewItemId) continue;
      const key = `${pair.reviewType}:${pair.reviewItemId}:${domain}`;
      if (seen.has(key)) continue;
      seen.add(key);
      gradeSrs(
        pair.reviewType,
        pair.reviewItemId,
        matches[pair.id] === pair.right ? "good" : "again",
        reviewTrack(domain),
        domain
      );
    }
  }

  function togglePiece(id: string) {
    setSelectedPieceIds((ids) => (ids.includes(id) ? ids.filter((pieceId) => pieceId !== id) : [...ids, id]));
  }

  function matchActivePair(right: string) {
    if (!activePairId) return;
    setPairMatches((matches) => ({ ...matches, [activePairId]: right }));
    const nextPair = (activeExercise.pairs ?? []).find((pair) => pair.id !== activePairId && !pairMatches[pair.id]);
    setActivePairId(nextPair?.id ?? null);
  }

  function grade(g: Grade) {
    const reviewKey = `${entry.id}:${pos}`;
    if (gradedReviewKeysRef.current.has(reviewKey)) return;
    gradedReviewKeysRef.current.add(reviewKey);
    const isLast = pos + 1 >= queue.length;
    const effectiveGrade = exerciseCorrect === false && activeExercise.canAutoCheck ? "again" : g;
    const xp = reviewXpForGrade(effectiveGrade);
    const qi = reviewQiForGrade(effectiveGrade);
    const itemLabelText = data?.hanzi ?? itemLabel(item);
    const correct = effectiveGrade !== "again";
    setSessionGrades((items) => [...items, { domain, correct, label: itemLabelText }]);
    if (!correct) {
      setReturningItems((items) => (items.includes(itemLabelText) ? items : [...items, itemLabelText]));
    }
    gradeSrs(item.type, item.itemId, effectiveGrade, item.track, item.reviewDomain);
    if (effectiveGrade === "again" && activeExercise.canAutoCheck) {
      if (sourceError) {
        recordActivityError({
          ...sourceError,
          selectedAnswer: (selectedOption ?? selectedPieceIds.join("")) || "Erro na revisão",
          timestamp: Date.now(),
          lastReviewedAt: Date.now(),
          correctedAt: undefined,
        });
      }
      setRetryQueue((items) =>
        items.filter((queued) => queued.id === entry.id).length >= 1
          ? items
          : [...items, { ...entry, item: { ...item, reps: 0, lapses: item.lapses + 1, due: Date.now() } }]
      );
    } else {
      if (sourceError) {
        markActivityErrorCorrected(sourceError.id);
        if (isJourneyBlockingActivityError(sourceError, lessonStarsById, completedLessons)) {
          recordDailyTask("errorsCorrected");
        }
      }
      // Fecha o loop: se este item veio de um erro de atividade e foi acertado
      // agora, marca o erro como corrigido para ele não voltar por 7 dias.
      for (const error of activeActivityErrors) {
        if (!sourceError && error.targets.some((t) => t.type === item.type && t.itemId === item.itemId && t.domain === domain)) {
          markActivityErrorCorrected(error.id);
          if (isJourneyBlockingActivityError(error, lessonStarsById, completedLessons)) {
            recordDailyTask("errorsCorrected");
          }
        }
      }
    }
    recordDailyTask("reviewsDone");
    addXp(xp, leagueXpKeyActivity("review", `${todayKey()}:${item.type}:${item.itemId}`));
    addQi(qi, "Revisão");
    addMinutes(reviewTrack(domain), 1);
    playSoundFx(isLast && effectiveGrade !== "again" ? "lessonComplete" : gradeSound(effectiveGrade), soundEffects);
    setReviewed((n) => n + 1);
    setRevealed(false);
    setSelectedOption(null);
    setSelectedPieceIds([]);
    setPairMatches({});
    setActivePairId(null);
    setExerciseCorrect(null);
    setSuggestedGrade(null);
    setPos((p) => p + 1);
  }

  verifyReviewRef.current = verifyExercise;
  continueReviewRef.current = () =>
    grade(exerciseCorrect === false && activeExercise.canAutoCheck ? "again" : suggestedGrade ?? "good");

  return (
    <HubPage>
      <HubHeader
        eyebrow="Revisão"
        title={detailedErrorsAllowed ? "Sessão ativa" : "Revisão básica"}
        desc={detailedErrorsAllowed ? domainMeta.weaknessLabel : "Responda e revele a resposta."}
      />

      {detailedErrorsAllowed && (
        <DetailedErrorsPanel
          errors={recentActivityErrors}
          activeErrors={activeActivityErrors}
          onCorrectWeakness={handleCorrectWeakness}
        />
      )}

      <section className={detailedErrorsAllowed ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-3 sm:grid-cols-2"}>
        <ReviewSummaryTile
          label="Revisão de hoje"
          value={queue.length}
          detail={focus ? `Foco: ${REVIEW_DOMAIN_META[focus.domain].shortLabel}` : "Fila adaptativa"}
        />
        {detailedErrorsAllowed && (
          <>
        <ReviewSummaryTile
          label="Erros recentes"
          value={recentErrorsCount}
          detail={`${activeActivityErrors.length} pendente(s)`}
          tone={activeActivityErrors.length > 0 ? "accent" : "muted"}
        />
        <ReviewSummaryTile
          label="Itens fracos"
          value={weakItemsCount}
          detail="Aparecem com prioridade"
          tone={weakItemsCount > 0 ? "accent" : "muted"}
        />
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Corrigir erros agora
          </div>
          <p className="mt-2 text-sm leading-5 text-ink-soft">
            {activeActivityErrors.length > 0
              ? "A fila começa pelos erros reais recentes."
              : "Sem erro pendente no momento."}
          </p>
          <Button
            size="sm"
            className="mt-3 w-full"
            disabled={modeCounts.mistakes === 0}
            onClick={() => setMode("mistakes")}
          >
            {modeCounts.mistakes > 0 ? "Corrigir agora" : "Tudo certo"}
          </Button>
        </Card>
          </>
        )}
        {!detailedErrorsAllowed && (
          <Card className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Revisão básica
            </div>
            <p className="mt-2 text-sm leading-5 text-ink-soft">
              Reforce o que você aprendeu. Histórico, filtros e padrões de erro ficam no Longyu Pro.
            </p>
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => openPaywall("errors")}>
              Ver Erros detalhados
            </Button>
          </Card>
        )}
      </section>

      {detailedErrorsAllowed && (
        <>
          <ReviewModeTabs mode={mode} counts={modeCounts} onSelect={setMode} />
          <p className="-mt-2 text-xs text-ink-faint">{REVIEW_MODES.find((option) => option.id === mode)?.hint}</p>
        </>
      )}

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              Plano de hoje
            </div>
            <h2 className="mt-1 font-serif text-xl font-semibold text-ink">
              {queue.length} {queue.length === 1 ? "prioridade de revisão" : "prioridades de revisão"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {detailedErrorsAllowed
                ? focus
                  ? `Foco principal: ${REVIEW_DOMAIN_META[focus.domain].weaknessLabel}. O Longyu mistura formatos para evitar repetição.`
                  : "Sem fraqueza clara nesta sessão. O Longyu mistura formatos para evitar repetição."
                : `${FREE_TIER_REVIEW_HINT} Erros detalhados e filtros avançados ficam no Pro.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone={focus ? "accent" : "muted"}>
              {detailedErrorsAllowed ? (focus ? REVIEW_DOMAIN_META[focus.domain].cardLabel : "Fila limpa") : "Básica"}
            </Pill>
            {!isPremium && fullQueue.length > FREE_REVIEW_LIMIT && (
              <Pill tone="muted">Grátis: {FREE_REVIEW_LIMIT}/{fullQueue.length}</Pill>
            )}
          </div>
        </div>
      </Card>

      <div className="mx-auto max-w-xl">
        <Card className="mb-4 p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {detailedErrorsAllowed ? "Fila inteligente" : "Fila básica"}
          </div>
          {detailedErrorsAllowed ? (
            <div className="flex flex-wrap gap-2">
              {REVIEW_DOMAIN_ORDER.map((domain) => {
                const count = domainCounts[domain] ?? 0;
                if (count === 0) return null;
                return (
                  <Pill key={domain} tone={domain === domainForEntry(entry) ? "accent" : "muted"}>
                    {REVIEW_DOMAIN_META[domain].shortLabel} · {count}
                  </Pill>
                );
              })}
            </div>
          ) : (
            <p className="text-sm leading-6 text-ink-soft">
              A revisão gratuita prioriza itens vencidos sem abrir histórico, filtros ou padrões de erro.
            </p>
          )}
          <p className="mt-2 text-xs text-ink-faint">
            {detailedErrorsAllowed
              ? "Itens com erro e domínios fracos vêm primeiro, mas o Longyu intercala para não repetir o mesmo cartão em sequência."
              : "Erros detalhados fazem parte do Longyu Pro."}
          </p>
        </Card>

        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-ink-faint">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="accent">{detailedErrorsAllowed ? domainMeta.label : "Revisão"}</Pill>
            {detailedErrorsAllowed && sourceError && <Pill tone="accent">Erro real</Pill>}
            <Pill>{itemLabel(item)}</Pill>
            {detailedErrorsAllowed && <Pill tone="muted">{domainMeta.cardLabel}</Pill>}
            {detailedErrorsAllowed && (
              <Pill tone={item.lapses > 0 && item.reps === 0 ? "accent" : "muted"}>
                {reviewStateLabel(item)}
              </Pill>
            )}
          </div>
          <span className="tabular-nums">
            {pos + 1} / {queue.length}
          </span>
        </div>

        <Card className="p-6 sm:p-8">
          <div className="mb-3 text-center text-sm font-medium text-ink-soft">
            {detailedErrorsAllowed ? domainMeta.helper : "Responda, confira e siga para o proximo item."}
          </div>
          <div className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
            Revisar: {describeNextDue(item)} · {activeExercise.fallback ? "fallback flashcard" : "tarefa ativa"}
          </div>
          {/* Revisão de forma via carta de montagem (HanziBuilderExercise). */}
          {reviewBuilder ? (
            <HanziBuilderExercise
              key={reviewBuilder.id}
              builder={reviewBuilder}
              onWrong={() => {
                gradeSrs(item.type, item.itemId, "again", item.track, item.reviewDomain);
                if (sourceError) {
                  recordActivityError({
                    ...sourceError,
                    selectedAnswer: "Erro ao montar na revisão",
                    timestamp: Date.now(),
                    lastReviewedAt: Date.now(),
                    correctedAt: undefined,
                  });
                }
              }}
              onCorrect={() => grade("good")}
            />
          ) : (
          <>
          <ReviewExercisePanel
            exercise={activeExercise}
            selectedOption={selectedOption}
            selectedPieceIds={selectedPieceIds}
            pairMatches={pairMatches}
            activePairId={activePairId}
            revealed={revealed}
            onSelectOption={setSelectedOption}
            onTogglePiece={togglePiece}
            onClearPieces={() => setSelectedPieceIds([])}
            onSetActivePair={setActivePairId}
            onMatchPair={matchActivePair}
          />

          {revealed ? (
            <>
              {activeExercise.fallback ? (
                <ReviewAnswer data={data} domain={domain} />
              ) : (
                <ExerciseFeedback
                  exercise={activeExercise}
                  correct={exerciseCorrect}
                  suggestedGrade={suggestedGrade}
                  showMistakeReason={detailedErrorsAllowed}
                />
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(exerciseCorrect === false ? GRADES.filter((grade) => grade.g === "again") : GRADES).map(({ g, label, effect, variant }) => (
                  <Button
                    key={g}
                    variant={variant}
                    size="sm"
                    className={[
                      "h-auto min-h-12 flex-col gap-0.5 py-2",
                      suggestedGrade === g ? "ring-2 ring-accent ring-offset-2 ring-offset-[rgb(var(--surface))]" : "",
                    ].join(" ")}
                    onClick={() => grade(g)}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] font-normal opacity-80">
                      {effect} · +{reviewXpForGrade(g)} XP · +{reviewQiForGrade(g)} Qi
                    </span>
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <Button
              className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-10 mt-5 w-full shadow-card sm:static sm:shadow-none"
              variant="soft"
              disabled={!isExerciseComplete(activeExercise, selectedOption, selectedPieceIds, pairMatches)}
              onClick={verifyExercise}
            >
              {activeExercise.canAutoCheck ? "Verificar" : "Conferir resposta"}
            </Button>
          )}
          </>
          )}
        </Card>
      </div>
      <ProPaywall open={proPaywallOpen} kind={proPaywallKind} onClose={() => setProPaywallOpen(false)} />
    </HubPage>
  );
}

function countByDomain(queue: ReviewQueueEntry[]): Partial<Record<ReviewDomain, number>> {
  const counts: Partial<Record<ReviewDomain, number>> = {};
  for (const entry of queue) {
    const domain = domainForEntry(entry);
    counts[domain] = (counts[domain] ?? 0) + 1;
  }
  return counts;
}

function buildReviewQueue(
  srs: Record<string, SRSItem>,
  activityErrors: ActivityErrorRecord[] = [],
  options: { includeRecentWeakItems?: boolean } = {},
  now = Date.now()
): ReviewQueueEntry[] {
  const due = dueItems(srs, now);
  const queued = new Set<string>();
  const entries: ReviewQueueEntry[] = [];
  const includeRecentWeakItems = options.includeRecentWeakItems ?? true;

  const sortedActivityErrors = activityErrors
    .filter((error) => !error.correctedAt && error.timestamp >= now - RECENT_ERROR_WINDOW_MS)
    .sort((a, b) => (b.wrongCount ?? 1) - (a.wrongCount ?? 1) || b.timestamp - a.timestamp);

  for (const error of sortedActivityErrors) {
    const target = error.targets[0];
    if (!target) continue;
    const key = makeKey(target.type, target.itemId, target.domain);
    const item = srs[key] ?? newItem(target.type, target.itemId, { track: target.track, reviewDomain: target.domain, now: error.timestamp });
    const entryId = `mistake:${error.id}`;
    if (queued.has(entryId)) continue;
    entries.push({
      kind: "mistake",
      id: entryId,
      error,
      item: {
        ...item,
        due: now,
        lapses: Math.max(item.lapses, error.wrongCount ?? 1),
        reps: Math.min(item.reps, error.correctionAttempts ?? 0),
      },
    });
    queued.add(entryId);
    queued.add(item.id);
  }

  for (const item of due) {
    if (queued.has(item.id)) continue;
    entries.push({ kind: "srs", id: `srs:${item.id}`, item });
    queued.add(item.id);
  }

  if (includeRecentWeakItems) {
    const recentErrors = Object.values(srs)
      .filter((item) => {
        if (queued.has(item.id) || item.lapses <= 0) return false;
        const touchedAt = item.reviewedAt ?? item.createdAt;
        return touchedAt >= now - RECENT_ERROR_WINDOW_MS;
      })
      .sort((a, b) =>
        b.lapses - a.lapses ||
        (b.reviewedAt ?? b.createdAt) - (a.reviewedAt ?? a.createdAt)
      );
    for (const item of recentErrors) {
      if (queued.has(item.id)) continue;
      entries.push({ kind: "srs", id: `weak:${item.id}`, item });
      queued.add(item.id);
    }
  }
  return entries;
}
