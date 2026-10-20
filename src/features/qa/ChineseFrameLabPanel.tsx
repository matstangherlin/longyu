/**
 * RC2.3.13R.3.2.6 — Device QA: Chinese Frame Lab (never learner UI).
 * Whisper, Heritage and Ceremony side by side in the live theme and inside a
 * 360 px simulation box, so frame tuning is never done blind: hooks must meet
 * the inner rule, stay inside the radius and never touch text.
 */
import { QaFrameLevelSamples } from "./LivingUiQaPanel";

const PHYSICAL_CHECKS = [
  "Corners are part of the line (no gap, no overlap)",
  "Hooks never touch text, icons or buttons",
  "Clay, china and dark: visible, never glaring",
  "One entrance, then still; reduced motion: still",
  "Ordinary cards never carry a frame",
];

export function ChineseFrameLabPanel() {
  const theme = typeof document !== "undefined" ? document.documentElement.dataset.theme ?? "clay" : "clay";
  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-chinese-frame-lab">
      <h2 className="text-base font-semibold text-ink">Chinese Frame Lab (RC2.3.13R.3.2.6)</h2>
      <p className="mt-1 text-sm text-ink-soft">Inspeção — não é UI de aluno. Tema atual: {theme}.</p>
      <div className="mt-3">
        <QaFrameLevelSamples />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink">Simulação 360 px</h3>
      <div className="mt-2 w-[360px] max-w-full rounded-2xl border border-dashed border-line p-2" data-testid="qa-chinese-frame-lab-360">
        <QaFrameLevelSamples />
      </div>
      <ol className="mt-3 list-decimal pl-5 text-xs text-ink-soft" data-testid="qa-chinese-frame-lab-checks">
        {PHYSICAL_CHECKS.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ol>
    </section>
  );
}
