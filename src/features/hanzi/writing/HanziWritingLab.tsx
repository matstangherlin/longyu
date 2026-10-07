/**
 * RC2.3.4 — Hànzì Writing Lab (core progressive writing; not "Em breve").
 * Deep Pro extras remain entitlement-gated; essential progression is free/core.
 */

import { useMemo, useState } from "react";
import { CHARACTERS } from "../../../data/characters";
import { listVerifiedHandwritingCharacters } from "../../../lib/hanziWriting/handwritingReference";
import { getFormEvidence, writingStateLabelPt } from "../../../lib/hanziWriting/evidence";
import { interleavedBoosterQueue } from "../../../lib/hanziWriting/booster";
import type { HanziLearningStage } from "../../../lib/hanziWriting/stages";
import { HanziWritingExercise } from "./HanziWritingExercise";
import { useStore } from "../../../lib/store";
import { loadTaughtConcepts } from "../../../lib/pedagogyV6/discovery";
import {
  eligibilityAllowsStage,
  hanziWritingEligibility,
  type HanziWritingEligibility,
} from "../../../lib/hanziWriting/curriculumLeak";
import type { MemoryWritePrompt } from "../../../lib/hanziWriting/types";

type LabMode = "trace" | "memory" | "missing";

export function HanziWritingLab({
  initialChar,
  onClose,
}: {
  initialChar?: string;
  onClose?: () => void;
}) {
  const verified = listVerifiedHandwritingCharacters();
  const completedLessons = useStore((s) => s.completedLessons);
  const learnedCharIds = useStore((s) => s.learnedChars);
  // RC2.3.4A — referência verificada não é permissão: o aluno precisa ter aprendido.
  const eligibilityByHanzi = useMemo(() => {
    const knowledge = { taught: loadTaughtConcepts(), completedLessons, learnedCharIds };
    return new Map<string, HanziWritingEligibility>(
      verified.map((h) => {
        const c = CHARACTERS.find((x) => x.hanzi === h);
        return [h, hanziWritingEligibility({ charId: c?.id ?? h, character: h, knowledge })];
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- verified é estático
  }, [completedLessons, learnedCharIds]);
  const canTrace = (h: string) => eligibilityAllowsStage(eligibilityByHanzi.get(h) ?? "NOT_INTRODUCED", "TRACE");
  const firstOpen = verified.find(canTrace);
  const [hanzi, setHanzi] = useState(
    initialChar && verified.includes(initialChar) && canTrace(initialChar) ? initialChar : firstOpen ?? verified[0] ?? "木"
  );
  const [mode, setMode] = useState<LabMode>("trace");
  const char = CHARACTERS.find((c) => c.hanzi === hanzi);
  const evidence = getFormEvidence(char?.id ?? hanzi, hanzi);
  const boosters = useMemo(() => interleavedBoosterQueue(), [evidence.writingState]);

  const stage: HanziLearningStage =
    mode === "memory" ? "MEMORY_WRITE" : mode === "missing" ? "COMPLETE" : "TRACE";
  const eligibility = eligibilityByHanzi.get(hanzi) ?? "NOT_INTRODUCED";
  const stageOpen = eligibilityAllowsStage(eligibility, stage);

  const prompt: MemoryWritePrompt | undefined =
    mode === "memory"
      ? {
          kind: "meaning",
          promptPt: char?.meaningPt ?? "Escreva o caractere",
          promptEn: char?.meaningPt ?? "Write the character",
          meaningPt: char?.meaningPt,
        }
      : undefined;

  return (
    <div className="space-y-4" data-testid="hanzi-writing-lab">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Laboratório de escrita</div>
          <h2 className="mt-1 font-serif text-xl font-semibold text-ink">Traçar e escrever</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Ordem dos traços, cópia guiada e escrita de memória — dados verificados apenas.
          </p>
        </div>
        {onClose && (
          <button type="button" className="min-h-11 rounded-xl border border-line px-3 text-sm" onClick={onClose}>
            Fechar
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {verified.map((h) => {
          const c = CHARACTERS.find((x) => x.hanzi === h);
          const st = getFormEvidence(c?.id ?? h, h).writingState;
          const open = canTrace(h);
          return (
            <button
              key={h}
              type="button"
              disabled={!open}
              data-eligibility={eligibilityByHanzi.get(h)}
              onClick={() => setHanzi(h)}
              className={`hanzi min-h-12 min-w-12 rounded-xl border px-3 text-2xl disabled:opacity-40 ${
                h === hanzi ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface"
              }`}
              aria-label={open ? `${h} · ${writingStateLabelPt(st)}` : `${h} · ainda não aprendido na Jornada`}
            >
              {h}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-ink-soft" data-testid="hanzi-writing-state">
        Estado: {writingStateLabelPt(evidence.writingState)}
      </p>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["trace", "Traçar"],
            ["missing", "Traço faltando"],
            ["memory", "Memória"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`min-h-12 rounded-xl text-sm font-semibold ${
              mode === id ? "bg-accent text-white" : "border border-line bg-surface"
            }`}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {!stageOpen ? (
        <p className="rounded-xl bg-surface-2 px-3 py-3 text-sm text-ink-soft" data-testid="hanzi-writing-locked">
          {eligibility === "NOT_INTRODUCED"
            ? "Aprenda este hànzì na Jornada antes de escrevê-lo."
            : "Trace este hànzì corretamente antes de escrever de memória."}
        </p>
      ) : (
      <HanziWritingExercise
        key={`${hanzi}-${mode}`}
        character={hanzi}
        charId={char?.id ?? hanzi}
        stage={stage}
        masteryPass={mode === "memory" ? 4 : 3}
        meaningPt={char?.meaningPt}
        pinyin={char?.pinyin}
        prompt={prompt}
        missingStrokeIndex={mode === "missing" ? Math.max(0, (char ? 1 : 1)) : undefined}
        evaluative={mode === "memory"}
      />
      )}

      {boosters.length > 0 && (
        <section className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-soft">
          Sugestão de progressão:{" "}
          {boosters.map((b) => `${b.character} → ${b.labelPt}`).join(" · ")}
        </section>
      )}
    </div>
  );
}
