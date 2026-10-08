/**
 * RC2.3.7 — Device QA panel for sensory feedback & guidance (never learner UI).
 * Test buttons fire only sound/haptic — they never touch progress.
 */
import { useEffect, useState } from "react";
import { useStore } from "../../lib/store";
import { haptic, type HapticEvent } from "../../lib/haptics";
import { playSoundFx, type SoundKind } from "../../lib/soundFx";
import { sensoryLogSnapshot } from "../../lib/sensoryLog";
import { getCurrentGuidance, getGuidanceSession } from "../../components/guidance/guidanceRuntime";
import { GUIDANCE_FIRST_SESSION_BUDGET, GUIDANCE_SESSION_BUDGET } from "../../lib/guidanceOrchestrator";
import { isCelebrationActive } from "../../lib/celebrationLock";

const TESTS: { label: string; sound: SoundKind | null; haptic: HapticEvent }[] = [
  { label: "Correto", sound: "success", haptic: "answerCorrect" },
  { label: "Quase (erro)", sound: "error", haptic: "answerWrong" },
  { label: "Prática concluída", sound: "task", haptic: "practiceComplete" },
  { label: "Conquista", sound: "medal", haptic: "achievementReveal" },
  { label: "Bloqueado", sound: "blocked", haptic: "blocked" },
];

export function SensoryQaPanel() {
  const soundEffects = useStore((s) => s.soundEffects);
  const hapticsOn = useStore((s) => s.hapticsEnabled !== false);
  const soundTheme = useStore((s) => s.soundTheme ?? "longyu_classic");
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const log = sensoryLogSnapshot();
  const session = getGuidanceSession();
  const current = getCurrentGuidance();

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-sensory">
      <h2 className="text-base font-semibold text-ink">Sensory & Guidance (RC2.3.7)</h2>
      <p className="mt-1 text-sm text-ink-soft">Inspeção — não é UI de aluno. Os botões só tocam som/vibração; nenhum progresso muda.</p>
      <ul className="mt-2 grid gap-1 text-xs font-mono text-ink-soft">
        <li>sound: {soundEffects ? "ON" : "OFF"} · theme: {soundTheme}</li>
        <li>haptic: {hapticsOn ? "ON" : "OFF"}</li>
        <li>reduced motion: {reducedMotion ? "ON" : "OFF"}</li>
        <li>
          sensory: played {log.played} · suppressed {log.suppressed}
        </li>
        <li>
          guidance this session: {session.shownIds.join(", ") || "—"} (budget {GUIDANCE_SESSION_BUDGET} · 1ª sessão {GUIDANCE_FIRST_SESSION_BUDGET})
        </li>
        <li>guidance on screen: {current?.definition.id ?? "—"}</li>
        <li>ceremony active: {isCelebrationActive() ? "yes" : "no"}</li>
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {TESTS.map((t) => (
          <button
            key={t.label}
            type="button"
            className="min-h-11 rounded-lg border border-line px-3 text-sm"
            onClick={() => {
              if (t.sound) playSoundFx(t.sound, soundEffects);
              haptic(t.haptic);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ol className="mt-3 max-h-48 overflow-y-auto text-xs font-mono text-ink-soft" data-testid="qa-sensory-log">
        {[...log.entries].reverse().map((e, i) => (
          <li key={`${e.at}-${i}`}>
            {new Date(e.at).toISOString().slice(11, 19)} {e.channel} {e.event} {e.outcome}
            {e.reason ? ` (${e.reason})` : ""}
          </li>
        ))}
      </ol>
    </section>
  );
}
