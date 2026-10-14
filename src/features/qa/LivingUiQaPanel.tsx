/**
 * RC2.3.13R.3.2.4 — Device QA panel for Living UI and the Chinese ornament
 * family (never learner UI). The owner judges smoothness, ornament quality and
 * motion budget on the physical device here: every ornament in each state
 * tone, a frame/divider/corner sample, the Victory burst on demand, and a live
 * readout of how many ambient loops run right now (budget ≤ 4).
 */
import { useEffect, useState } from "react";
import { CompletionBurst } from "../../components/motion/CompletionBurst";
import { ChineseOrnament } from "../../components/ornaments/chinese/ChineseOrnament";
import { ChineseOrnamentalDivider } from "../../components/ornaments/chinese/ChineseOrnamentalDivider";
import { ChineseOrnamentalFrame } from "../../components/ornaments/chinese/ChineseOrnamentalFrame";
import {
  CHINESE_ORNAMENTS,
  CHINESE_ORNAMENT_PACK_VERSION,
} from "../../components/ornaments/chinese/chineseOrnamentRegistry";
import { ambientSnapshot } from "../../lib/motion/ambientBudget";
import { MAX_VISIBLE_AMBIENT_ANIMATIONS, MOTION_MS, prefersReducedMotion } from "../../lib/motion/livingUiMotion";

const TONES = ["accent", "gold", "muted"] as const;

const PHYSICAL_CHECKS = [
  "Smoothness (Journey scroll, no jank)",
  "Visual beauty / ornament quality",
  "Motion quality (calm, never busy)",
  "Clarity (state never carried by motion alone)",
  "No clutter / no over-animation",
  "Victory feels rewarding, not a casino",
  "Reduced motion: still, state visible",
  "30-minute session: heat, battery, memory, audio",
];

export function LivingUiQaPanel() {
  const [snapshot, setSnapshot] = useState(() => ambientSnapshot());
  const [burstKey, setBurstKey] = useState(0);
  const theme = typeof document !== "undefined" ? document.documentElement.dataset.theme ?? "clay" : "clay";

  useEffect(() => {
    const id = window.setInterval(() => setSnapshot(ambientSnapshot()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-living-ui">
      <h2 className="text-base font-semibold text-ink">Living UI &amp; ornaments (RC2.3.13R.3.2.4)</h2>
      <p className="mt-1 text-sm text-ink-soft">Inspeção — não é UI de aluno. Julgue no aparelho físico.</p>
      <ul className="mt-2 grid gap-1 font-mono text-xs text-ink-soft" data-testid="qa-living-ui-identity">
        <li>
          ornament pack v{CHINESE_ORNAMENT_PACK_VERSION} · {CHINESE_ORNAMENTS.length} assets · theme {theme}
        </li>
        <li>
          motion ms: instant {MOTION_MS.instant} · fast {MOTION_MS.fast} · normal {MOTION_MS.normal} · emphasis{" "}
          {MOTION_MS.emphasis} · celebrate ≤ {MOTION_MS.celebrate}
        </li>
        <li data-testid="qa-living-ui-ambient">
          ambient loops: {snapshot.running} running / {snapshot.registered} registered · budget ≤{" "}
          {MAX_VISIBLE_AMBIENT_ANIMATIONS} · reduced motion: {prefersReducedMotion() ? "ON" : "OFF"}
        </li>
      </ul>

      <div className="mt-3 grid grid-cols-3 gap-2" data-testid="qa-living-ui-gallery">
        {CHINESE_ORNAMENTS.map((entry) =>
          TONES.map((tone) => (
            <div key={`${entry.id}-${tone}`} className="flex flex-col items-center gap-1">
              <span
                className="lyo flex h-12 w-full items-center justify-center"
                aria-hidden="true"
                data-ornament-surface="qa-gallery"
                data-intensity="milestone"
                data-tone={tone}
              >
                <ChineseOrnament
                  id={entry.id}
                  style={{ height: "100%", width: entry.aspect >= 1 ? "100%" : "50%", maxWidth: `${3 * entry.aspect}rem` }}
                />
              </span>
              <span className="font-mono text-[10px] text-ink-faint">
                {entry.id} · {tone}
              </span>
            </div>
          )),
        )}
      </div>

      <div className="relative isolate mt-4 rounded-2xl border border-accent-soft bg-surface px-4 pb-4 pt-5" data-testid="qa-living-ui-frame">
        <ChineseOrnamentalFrame motif="huiwen" intensity="milestone" surface="qa-gallery" animated />
        <p className="type-card-title">Moldura · huiwen</p>
        <ChineseOrnamentalDivider motif="knot" intensity="medium" surface="qa-gallery" className="mt-2" />
        <p className="type-supporting mt-2">Texto nunca fica sob o bordado; o tamanho do cartão não muda.</p>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="relative isolate h-16 w-20" data-testid="qa-living-ui-burst">
          <CompletionBurst key={burstKey} play={burstKey > 0 && !prefersReducedMotion()} />
        </div>
        <button
          type="button"
          className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold text-ink"
          onClick={() => setBurstKey((key) => key + 1)}
          data-testid="qa-living-ui-burst-replay"
        >
          Repetir conclusão (Victory)
        </button>
      </div>

      <ol className="mt-3 list-decimal pl-5 text-xs text-ink-soft" data-testid="qa-living-ui-checks">
        {PHYSICAL_CHECKS.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ol>
    </section>
  );
}
