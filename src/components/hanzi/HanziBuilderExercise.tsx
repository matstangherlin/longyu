import { useEffect, useMemo, useState } from "react";
import type { HanziBuilder, HanziGlyphPiece, HanziGuideStrength, HanziStroke } from "../../data/hanziBuilder";
import { isCharMastered, resolveGuideStrength } from "../../data/hanziBuilder";
import { playSoundFx } from "../../lib/soundFx";
import { useStore } from "../../lib/store";
import { KeyboardShortcutHint, ShortcutBadge, shortcutKeyForIndex, useExerciseHotkeys } from "../../lib/useExerciseHotkeys";
import { Button } from "../ui/primitives";
import { SpeakButton } from "../ui/SpeakButton";
import { IconCheck, IconChevron, IconX } from "../ui/Icon";
import { Pinyin } from "./Pinyin";

type BuilderPiece =
  | { kind: "stroke"; id: string; stroke: HanziStroke; correct: boolean }
  | { kind: "glyph"; id: string; glyph: HanziGlyphPiece; correct: boolean };

type BuildStatus = "idle" | "incomplete" | "wrong" | "correct";

const MODE_LABEL: Record<HanziBuilder["mode"], string> = {
  fragments: "Monte por fragmentos",
  complete: "Complete a peça que falta",
  components: "Monte pelas peças",
};

// "Componentes" soa técnico e sugere tradução literal. Para iniciante a bandeja
// chama "Peças"; em níveis avançados, "Peças da forma" (pista estrutural).
function trayLabel(builder: HanziBuilder): string {
  if (builder.mode !== "components") return "Fragmentos";
  return builder.level >= 4 ? "Peças da forma" : "Peças";
}

// Montar hànzì como quebra-cabeça visual: toque nas peças (traços ou
// componentes) para preencher a carta central. Toque simples no mobile,
// clique no desktop. A carta revela o caractere completo ao acertar.
export function HanziBuilderExercise({
  builder,
  onWrong,
  onCorrect,
  externalRetry = false,
  showContinue = true,
  continueLabel = "Continuar",
}: {
  builder: HanziBuilder;
  /** Erro cometido — sempre chamado (liga à economia/SRS do contexto). */
  onWrong?: () => void;
  /** Concluído com acerto e "Continuar" pressionado. `firstTry` = sem erros. */
  onCorrect?: (firstTry: boolean) => void;
  /**
   * Quando true (lição), o contexto externo conduz o retry (LessonPlayer mostra
   * o overlay e remonta este componente), então não exibimos "Tentar de novo".
   */
  externalRetry?: boolean;
  showContinue?: boolean;
  continueLabel?: string;
}) {
  const soundEffects = useStore((s) => s.soundEffects);
  const charProgress = useStore((s) => s.hanziBuilderProgressByChar[builder.character]);
  const recordHanziBuilderResult = useStore((s) => s.recordHanziBuilderResult);

  // Guia/silhueta dinâmica: cheia para hànzì novo, mais fraca com prática,
  // some quando o aluno domina (ou em builders "sem molde").
  const guideStrength = useMemo(
    () => resolveGuideStrength(builder, charProgress),
    [builder, charProgress]
  );
  const builtWithoutGuide = guideStrength === "none";

  const fixedStrokes = useMemo(() => resolveFixedStrokes(builder), [builder]);
  const correctOrder = useMemo(() => resolveCorrectOrder(builder), [builder]);
  const correctIds = useMemo(() => new Set(correctOrder), [correctOrder]);
  // Componentes iguais (林 = 木 + 木) têm ids distintos mas o mesmo glifo:
  // a validação compara a sequência de glifos, não de ids, para não punir a
  // ordem entre peças idênticas — mas ainda exigir 女 antes de 子 em 好.
  const correctGlyphOrder = useMemo(
    () => (builder.components ?? []).map((piece) => piece.glyph),
    [builder]
  );
  // Primeiro contato (nunca montou este caractere): pinyin visível e sem
  // distratores, mesmo em builders avançados — hànzì novo é fácil; a
  // dificuldade entra conforme o domínio cresce.
  const isNewChar = !charProgress || charProgress.correct === 0;
  // Dominado: feedback curto no acerto (a explicação completa volta se errou).
  const mastered = isCharMastered(charProgress);

  // Embaralhado uma vez por exercício (estável entre re-renders).
  const pool = useMemo(
    () => shuffle(resolvePool(builder, { withDistractors: !isNewChar })),
    [builder, isNewChar]
  );
  const pieceById = useMemo(() => new Map(pool.map((piece) => [piece.id, piece])), [pool]);

  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<BuildStatus>("idle");
  const [hadMistake, setHadMistake] = useState(false);

  // Reinicia quando troca de exercício (sessões de treino/revisão).
  useEffect(() => {
    setSelected([]);
    setStatus("idle");
    setHadMistake(false);
  }, [builder.id]);

  // Erro trava as peças. No treino/revisão o próprio componente oferece
  // "Tentar de novo"; na lição (externalRetry) o LessonPlayer mostra o overlay
  // de retry e remonta este componente, então não duplicamos a UI.
  const locked = status === "correct" || status === "wrong";
  const selectedPieces = selected
    .map((id) => pieceById.get(id))
    .filter((piece): piece is BuilderPiece => Boolean(piece));
  const usedIds = new Set(selected);
  const availablePieces = pool.filter((piece) => !usedIds.has(piece.id));
  const selectedStrokeDs = selectedPieces
    .filter((piece): piece is Extract<BuilderPiece, { kind: "stroke" }> => piece.kind === "stroke")
    .map((piece) => ({ id: piece.id, d: piece.stroke.d, correct: piece.correct }));
  const hidePromptPinyin =
    (builder.hidePinyinUntilCorrect ?? (builder.level >= 4 && !isNewChar)) && status !== "correct";

  function addPiece(piece: BuilderPiece) {
    if (locked || usedIds.has(piece.id)) return;
    playSoundFx("pieceSelect", soundEffects);
    setSelected((current) => [...current, piece.id]);
    if (status !== "idle") setStatus("idle");
  }

  function removePiece(id: string) {
    if (locked) return;
    playSoundFx("tap", soundEffects);
    setSelected((current) => current.filter((pieceId) => pieceId !== id));
    if (status !== "idle") setStatus("idle");
  }

  function clearPieces() {
    if (locked || selected.length === 0) return;
    playSoundFx("tap", soundEffects);
    setSelected([]);
    setStatus("idle");
  }

  function check() {
    if (locked || selected.length === 0) return;
    const hasDistractor = selected.some((id) => !correctIds.has(id));
    const selectedCorrect = selected.filter((id) => correctIds.has(id));

    if (builder.mode === "components") {
      if (!hasDistractor && selected.length < correctOrder.length) {
        setStatus("incomplete");
        return;
      }
      const selectedGlyphs = selected.map((id) => {
        const piece = pieceById.get(id);
        return piece && piece.kind === "glyph" ? piece.glyph.glyph : "";
      });
      const ok =
        !hasDistractor &&
        selected.length === correctOrder.length &&
        selectedGlyphs.join("¦") === correctGlyphOrder.join("¦");
      finish(ok);
      return;
    }

    // fragments / complete: ordem livre, valida por conjunto.
    if (!hasDistractor && selectedCorrect.length < correctOrder.length) {
      setStatus("incomplete");
      return;
    }
    finish(!hasDistractor && selectedCorrect.length === correctOrder.length);
  }

  function finish(ok: boolean) {
    if (ok) {
      setStatus("correct");
      playSoundFx("success", soundEffects);
      // Registra o domínio deste caractere (persiste na conta/nuvem). firstTry =
      // montou sem nenhum erro nesta rodada — vale mais para o domínio.
      recordHanziBuilderResult({
        character: builder.character,
        correct: true,
        firstTry: !hadMistake,
        level: builder.level,
      });
      return;
    }
    setStatus("wrong");
    setHadMistake(true);
    onWrong?.();
    if (!externalRetry) playSoundFx("error", soundEffects);
  }

  function retry() {
    setSelected([]);
    setStatus("idle");
  }

  const canCheck = selected.length > 0 && status !== "correct";

  useExerciseHotkeys({
    enabled: true,
    mode: "builder",
    optionCount: availablePieces.length,
    isAnswered: status === "correct",
    hasSelection: selected.length > 0,
    onSelectOption: (index) => {
      const piece = availablePieces[index];
      if (piece) addPiece(piece);
    },
    onSubmit: check,
    onContinue: () => onCorrect?.(!hadMistake),
  });

  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
        {MODE_LABEL[builder.mode]}
      </div>
      <h2 className="mt-1 font-serif text-xl font-semibold leading-tight text-ink sm:text-2xl">{builder.promptPt}</h2>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
        <span>{builder.meaningPt}</span>
        {!hidePromptPinyin && (
          <>
            <span className="text-ink-faint">·</span>
            <Pinyin text={builder.pinyin} className="font-serif" />
          </>
        )}
      </div>
      {builder.context && (
        <div className="mt-3 rounded-2xl border border-line bg-surface-2/70 px-4 py-3 text-center">
          <div className="hanzi text-3xl font-semibold text-ink">
            {builder.context.before}
            <span className="mx-1 inline-flex min-w-12 justify-center rounded-xl border border-dashed border-accent-soft bg-surface px-2 text-accent">
              ?
            </span>
            {builder.context.after}
          </div>
          {status === "correct" && (
            <div className="mt-2 text-sm text-ink-soft">
              <Pinyin text={builder.context.sentencePinyin} className="font-serif" /> · {builder.context.sentencePt}
            </div>
          )}
        </div>
      )}
      {builder.hintPt && status === "idle" && (
        <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-soft">💡 {builder.hintPt}</p>
      )}

      {/* Carta central de montagem */}
      <div className="mt-5 flex justify-center">
        <BuildCanvas
          builder={builder}
          guideStrength={guideStrength}
          fixedStrokes={fixedStrokes}
          selectedStrokes={selectedStrokeDs}
          selectedGlyphs={selectedPieces
            .filter((piece): piece is Extract<BuilderPiece, { kind: "glyph" }> => piece.kind === "glyph")
            .map((piece) => ({ glyph: piece.glyph.glyph, correct: piece.correct }))}
          status={status}
        />
      </div>

      {/* Peças colocadas (toque devolve para a bandeja) */}
      {selectedPieces.length > 0 && status !== "correct" && (
        <div className="mt-4">
          <div className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Peças colocadas — toque para devolver
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {selectedPieces.map((piece) => (
              <PieceButton
                key={piece.id}
                piece={piece}
                placed
                state={status === "wrong" && !piece.correct ? "wrong" : "idle"}
                onClick={() => removePiece(piece.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bandeja de peças disponíveis */}
      {status !== "correct" && availablePieces.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {trayLabel(builder)}
          </div>
          <KeyboardShortcutHint />
          <div className="max-h-[34svh] overflow-y-auto rounded-2xl border border-line bg-surface-2/45 p-2">
            <div className="flex flex-wrap justify-center gap-2.5">
            {availablePieces.map((piece, index) => (
              <PieceButton
                key={piece.id}
                piece={piece}
                shortcut={index < 10 ? shortcutKeyForIndex(index) : undefined}
                showInfo={!builder.context}
                onClick={() => addPiece(piece)}
              />
            ))}
            </div>
          </div>
        </div>
      )}

      {/* Sem peças na bandeja: montagem completa, é hora de verificar (não é bug). */}
      {status !== "correct" && availablePieces.length === 0 && selected.length > 0 && (
        <p className="animate-pop mt-5 rounded-2xl border border-[rgb(var(--good)/0.28)] bg-[rgb(var(--good)/0.08)] px-4 py-3 text-center text-sm font-semibold text-[rgb(var(--good))]">
          Tudo colocado. Agora toque em Verificar.
        </p>
      )}

      {status === "incomplete" && (
        <p role="status" aria-live="polite" className="animate-pop mt-4 rounded-xl border border-accent-soft bg-accent-soft/45 px-3 py-2 text-center text-sm font-medium text-accent">
          Ainda faltam peças. Continue montando.
        </p>
      )}

      {status === "wrong" && !externalRetry && (
        <div role="status" aria-live="polite" className="animate-pop mt-5 rounded-2xl border border-accent-soft bg-accent-soft/45 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <IconX width={18} height={18} />
            Quase.
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {builder.errorHintPt ?? "Revise as peças e tente de novo."}
          </p>
          <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-xs font-medium text-ink-soft">
            Este hànzì vai voltar em revisão visual.
          </p>
          <Button variant="good" className="mt-4 w-full shadow-lift" onClick={retry}>
            Tentar de novo
          </Button>
        </div>
      )}

      {status === "correct" && (
        <div role="status" aria-live="polite" className="animate-pop longyu-success-bloom mt-5 rounded-2xl border border-transparent bg-[rgb(var(--good)/0.12)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--good))]">
            <IconCheck width={18} height={18} />
            {hadMistake ? "Boa! Hànzì montado." : "Perfeito! Hànzì montado."}
          </div>
          {(!hadMistake || builtWithoutGuide) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {!hadMistake && (
                <span className="rounded-full bg-[rgb(var(--good)/0.16)] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--good))]">
                  Domínio visual +1
                </span>
              )}
              {builtWithoutGuide && (
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-soft">
                  Você montou sem molde.
                </span>
              )}
            </div>
          )}
          <div className="mt-2 text-sm font-semibold text-ink">{builder.meaningPt}</div>
          {(!mastered || hadMistake) && (
            <>
              <p className="mt-1 text-sm leading-6 text-ink-soft">{builder.explanationPt}</p>
              {builder.relatedPt && <p className="mt-1 text-sm text-ink-faint">{builder.relatedPt}</p>}
            </>
          )}
          {showContinue && (
            <Button
              variant="good"
              className="mt-4 w-full shadow-lift"
              onClick={() => onCorrect?.(!hadMistake)}
            >
              {continueLabel} <IconChevron width={18} height={18} />
            </Button>
          )}
        </div>
      )}

      {(status === "idle" || status === "incomplete") && (
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-20 -mx-1 mt-5 flex items-center justify-center gap-2 rounded-2xl border border-line bg-bg/90 p-2 shadow-lift backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none lg:bottom-4">
          {selected.length > 0 && (
            <Button variant="ghost" onClick={clearPieces} className="min-w-24">
              Limpar
            </Button>
          )}
          <Button
            variant={canCheck ? "good" : "outline"}
            disabled={!canCheck}
            onClick={check}
            className={[
              "min-w-32 flex-1 shadow-lift sm:flex-none",
              canCheck && availablePieces.length === 0 ? "animate-pulse ring-2 ring-[rgb(var(--good)/0.4)]" : "",
            ].join(" ")}
          >
            Verificar
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carta central
// ---------------------------------------------------------------------------

function BuildCanvas({
  builder,
  guideStrength,
  fixedStrokes,
  selectedStrokes,
  selectedGlyphs,
  status,
}: {
  builder: HanziBuilder;
  guideStrength: HanziGuideStrength;
  fixedStrokes: HanziStroke[];
  selectedStrokes: { id: string; d: string; correct: boolean }[];
  selectedGlyphs: { glyph: string; correct: boolean }[];
  status: BuildStatus;
}) {
  const done = status === "correct";
  const cardBase =
    "relative flex aspect-square w-[min(76vw,260px)] items-center justify-center rounded-3xl border-2 bg-surface-2 sm:w-[min(72vw,240px)]";
  const cardBorder = done
    ? "border-[rgb(var(--good))]"
    : status === "wrong"
      ? "border-accent-soft"
      : "border-dashed border-line";

  // Carta concluída: revela o caractere Unicode grande, com áudio.
  if (done) {
    return (
      <div className={[cardBase, cardBorder, "longyu-success-bloom flex-col gap-3"].join(" ")}>
        <div className="hanzi animate-pop text-8xl leading-none text-accent">{builder.character}</div>
        <div className="flex items-center gap-2">
          <Pinyin text={builder.pinyin} className="font-serif text-xl" />
          <SpeakButton text={builder.character} size="sm" />
        </div>
      </div>
    );
  }

  if (builder.mode === "components") {
    return (
      <div className={[cardBase, cardBorder].join(" ")}>
        {selectedGlyphs.length === 0 ? (
          <span className="px-4 text-center text-sm font-medium text-ink-faint">
            toque nas peças
          </span>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-1 px-4">
            {selectedGlyphs.map((piece, index) => (
              <span
                key={`${piece.glyph}-${index}`}
                className={[
                  "hanzi animate-pop text-6xl leading-none",
                  status === "wrong" && !piece.correct ? "text-wrong" : "text-ink",
                ].join(" ")}
              >
                {piece.glyph}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // fragments / complete: desenha os traços num viewBox 100x100.
  return (
    <div className={[cardBase, cardBorder].join(" ")}>
      <svg viewBox="0 0 100 100" className="h-full w-full p-3" role="img" aria-label={`Montagem de ${builder.character}`}>
        {guideStrength !== "none" &&
          (builder.strokes ?? []).map((stroke) => (
            <path
              key={`guide-${stroke.id}`}
              d={stroke.d}
              className="text-ink-faint"
              stroke="currentColor"
              strokeWidth={guideStrength === "weak" ? 6 : 7}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={guideStrength === "weak" ? 0.09 : 0.18}
            />
          ))}
        {fixedStrokes.map((stroke) => (
          <path
            key={`fixed-${stroke.id}`}
            d={stroke.d}
            className="text-ink"
            stroke="currentColor"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {selectedStrokes.map((stroke) => (
          <path
            key={`sel-${stroke.id}`}
            d={stroke.d}
            className={["animate-pop", status === "wrong" && !stroke.correct ? "text-wrong" : "text-accent"].join(" ")}
            stroke="currentColor"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </svg>
      {selectedStrokes.length === 0 && guideStrength === "none" && fixedStrokes.length === 0 && (
        <span className="pointer-events-none absolute px-4 text-center text-sm font-medium text-ink-faint">
          toque nos fragmentos
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Peça (bandeja e "colocadas")
// ---------------------------------------------------------------------------

function PieceButton({
  piece,
  placed = false,
  state = "idle",
  shortcut,
  showInfo = false,
  onClick,
}: {
  piece: BuilderPiece;
  placed?: boolean;
  state?: "idle" | "wrong";
  shortcut?: string;
  /** Mostra nome curto + papel sob o glifo (bandeja de componentes). */
  showInfo?: boolean;
  onClick: () => void;
}) {
  const label =
    piece.kind === "stroke"
      ? `Fragmento: ${piece.stroke.label}`
      : `Peça ${piece.glyph.glyph} (${piece.glyph.label}${piece.glyph.rolePt ? `, ${piece.glyph.rolePt}` : ""})`;
  // Glifo + nome curto + papel, só na bandeja: peça colocada volta a ser compacta.
  const withCaption = piece.kind === "glyph" && showInfo && !placed;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shortcut && !placed ? `Peça ${shortcut}: ${label}` : placed ? `Devolver ${label}` : label}
      className={[
        "relative",
        "inline-flex items-center justify-center rounded-2xl border-2 bg-surface transition active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        placed && state === "wrong"
          ? "h-12 min-w-12 border-wrong bg-wrong-soft px-2"
          : placed
          ? "h-12 min-w-12 border-accent/60 px-2"
          : withCaption
          ? "min-h-14 min-w-20 border-line px-2.5 py-1.5 hover:border-accent-soft hover:bg-surface-2"
          : "h-14 min-w-14 border-line px-2 hover:border-accent-soft hover:bg-surface-2",
      ].join(" ")}
    >
      {shortcut && !placed && <ShortcutBadge className="absolute left-1 top-1">{shortcut}</ShortcutBadge>}
      {piece.kind === "stroke" ? (
        <svg
          viewBox="0 0 100 100"
          className={state === "wrong" ? "h-8 w-8 text-wrong" : placed ? "h-8 w-8 text-accent" : "h-10 w-10 text-ink"}
          aria-hidden="true"
        >
          <path
            d={piece.stroke.d}
            stroke="currentColor"
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      ) : withCaption ? (
        <span className="flex flex-col items-center gap-0.5">
          <span className="hanzi text-3xl leading-none text-ink">{piece.glyph.glyph}</span>
          <span className="max-w-24 text-center text-[10px] font-semibold leading-tight text-ink-soft">
            {piece.glyph.label}
          </span>
          {piece.glyph.rolePt && (
            <span className="max-w-24 text-center text-[10px] leading-tight text-ink-faint">
              {piece.glyph.rolePt}
            </span>
          )}
        </span>
      ) : (
        <span className={["hanzi leading-none", state === "wrong" ? "text-3xl text-wrong" : placed ? "text-3xl text-accent" : "text-4xl text-ink"].join(" ")}>
          {piece.glyph.glyph}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Derivação das peças a partir do builder
// ---------------------------------------------------------------------------

function resolveFixedStrokes(builder: HanziBuilder): HanziStroke[] {
  if (builder.mode !== "complete") return [];
  const fixed = new Set(builder.fixedStrokeIds ?? []);
  return (builder.strokes ?? []).filter((stroke) => fixed.has(stroke.id));
}

function resolveCorrectOrder(builder: HanziBuilder): string[] {
  if (builder.mode === "components") return (builder.components ?? []).map((piece) => piece.id);
  const fixed = new Set(builder.fixedStrokeIds ?? []);
  return (builder.strokes ?? []).filter((stroke) => !fixed.has(stroke.id)).map((stroke) => stroke.id);
}

function resolvePool(
  builder: HanziBuilder,
  { withDistractors = true }: { withDistractors?: boolean } = {}
): BuilderPiece[] {
  if (builder.mode === "components") {
    const correct = new Set((builder.components ?? []).map((piece) => piece.id));
    const distractors = withDistractors ? builder.componentDistractors ?? [] : [];
    return [...(builder.components ?? []), ...distractors].map((glyph) => ({
      kind: "glyph" as const,
      id: glyph.id,
      glyph,
      correct: correct.has(glyph.id),
    }));
  }
  const fixed = new Set(builder.fixedStrokeIds ?? []);
  const playable = (builder.strokes ?? []).filter((stroke) => !fixed.has(stroke.id));
  const correct = new Set(playable.map((stroke) => stroke.id));
  const distractors = withDistractors ? builder.strokeDistractors ?? [] : [];
  return [...playable, ...distractors].map((stroke) => ({
    kind: "stroke" as const,
    id: stroke.id,
    stroke,
    correct: correct.has(stroke.id),
  }));
}

// Embaralhamento determinístico e estável (não usa Math.random para não
// re-ordenar entre renders quando envolvido em useMemo já basta, mas manter
// determinístico evita saltos visuais em StrictMode double-invoke).
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = (i * 7 + 3) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
