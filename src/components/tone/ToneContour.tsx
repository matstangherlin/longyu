import { useEffect, useState } from "react";
import { TONE_COLOR } from "../../data/tones";
import { toneGuidance, toneKnowledge, type MandarinToneNumber, type ToneDisplayMode } from "../../data/toneKnowledge";

/**
 * Contorno de tom = altura da voz ao longo do tempo (pitch). RC2.2.17 · BR:
 * este componente NUNCA descreve língua/boca — isso é articulação, outro
 * sistema. O 3º tom é desenhado baixo, com subida parcial: na fala natural o
 * final muitas vezes não sobe por completo (toneKnowledge, Part EB).
 */
const PATHS: Partial<Record<MandarinToneNumber, string>> = {
  1: "M4 8 H44",
  2: "M4 20 L44 6",
  3: "M4 12 C14 26, 26 26, 44 16",
  4: "M4 6 L44 22",
};

/** Caminho grande (guiado) a partir das alturas 1–5 de `toneGuidance`. */
export function guidedContourPath(tone: MandarinToneNumber): string {
  const heights = toneGuidance(tone).heights;
  const top = 10;
  const bottom = 58;
  const y = (h: number) => bottom - ((h - 1) / 4) * (bottom - top);
  if (heights.length === 1) return `M56 ${y(heights[0])} L64 ${y(heights[0])}`;
  const left = 12;
  const right = 108;
  const step = (right - left) / (heights.length - 1);
  const points = heights.map((h, index) => [left + index * step, y(h)] as const);
  if (tone === 3) {
    // Vale suave: curva, não quina.
    const [a, b, c, d] = points;
    return `M${a[0]} ${a[1]} C${b[0]} ${b[1] + 4}, ${c[0]} ${c[1] + 4}, ${d[0]} ${d[1]}`;
  }
  return points.map(([px, py], index) => `${index === 0 ? "M" : "L"}${px} ${py}`).join(" ");
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function ordinal(tone: MandarinToneNumber, locale: "pt-BR" | "en"): string {
  if (tone === 5) return locale === "en" ? "Neutral" : "Neutro";
  return locale === "en" ? `${tone}${tone === 1 ? "st" : tone === 2 ? "nd" : tone === 3 ? "rd" : "th"}` : `${tone}º`;
}

export function ToneContour({
  tone,
  mode = "MID",
  locale = "pt-BR",
  className = "",
  guided = false,
  playKey = 0,
  gesture = false,
  heightScale = false,
}: {
  tone: MandarinToneNumber;
  mode?: ToneDisplayMode;
  locale?: "pt-BR" | "en";
  className?: string;
  /** RC2.2.17 · BS — versão guiada: linha de pitch grande + ponto animado. */
  guided?: boolean;
  /** Muda a cada reprodução do áudio: o ponto percorre o contorno de novo. */
  playKey?: number;
  /** RC2.2.17 · CA — mão que imita o contorno (memorização). */
  gesture?: boolean;
  /** RC2.2.17 · BZ — coluna ALTO/BAIXO mostrando onde a voz está. */
  heightScale?: boolean;
}) {
  const knowledge = toneKnowledge(tone);
  if (mode === "ASSESSMENT") return null;

  const label = locale === "en"
    ? `${tone === 5 ? "Neutral tone" : `${ordinal(tone, "en")} tone`} · ${knowledge.learnerDescriptionEn}`
    : `${tone === 5 ? "Tom neutro" : `${tone}º tom`} · ${knowledge.learnerDescriptionPt}`;

  if (guided) {
    return (
      <GuidedContour
        tone={tone}
        mode={mode}
        locale={locale}
        label={label}
        className={className}
        playKey={playKey}
        gesture={gesture}
        heightScale={heightScale}
      />
    );
  }

  return (
    <div
      data-tone-contour={tone}
      data-tone-display-mode={mode}
      className={["inline-flex min-w-0 items-center justify-center gap-2", className].join(" ")}
      role="img"
      aria-label={label}
    >
      {tone === 5 ? (
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TONE_COLOR[5] }} aria-hidden="true" />
      ) : (
        <svg viewBox="0 0 48 28" className="h-7 w-16 shrink-0" aria-hidden="true">
          <path
            d={PATHS[tone]}
            fill="none"
            stroke={TONE_COLOR[tone]}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </svg>
      )}
      {mode !== "LATE" && (
        <span className="min-w-0 text-left">
          <span className="block text-sm font-semibold text-ink">
            {ordinal(tone, locale)}
            {knowledge.mark ? ` · ${knowledge.mark}` : ""}
          </span>
          {mode === "EARLY" && (
            <span className="block text-xs leading-4 text-ink-soft">
              {locale === "en" ? knowledge.learnerDescriptionEn : knowledge.learnerDescriptionPt}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function GuidedContour({
  tone,
  mode,
  locale,
  label,
  className,
  playKey,
  gesture,
  heightScale,
}: {
  tone: MandarinToneNumber;
  mode: ToneDisplayMode;
  locale: "pt-BR" | "en";
  label: string;
  className: string;
  playKey: number;
  gesture: boolean;
  heightScale: boolean;
}) {
  const guidance = toneGuidance(tone);
  const path = guidedContourPath(tone);
  const color = TONE_COLOR[tone];
  const [reduced] = useState(prefersReducedMotion);
  // Sem animação (reduced motion) o ponto fica no ESTADO FINAL, estático.
  const [runId, setRunId] = useState(0);
  useEffect(() => {
    if (playKey > 0) setRunId((value) => value + 1);
  }, [playKey]);
  const heights = guidance.heights;
  const endHeight = heights[heights.length - 1];
  const endY = 58 - ((endHeight - 1) / 4) * 48;
  const endX = heights.length === 1 ? 64 : 108;
  const dur = `${guidance.durationMs}ms`;

  return (
    <figure
      data-tone-contour={tone}
      data-tone-display-mode={mode}
      data-tone-guided="true"
      data-tone-heights={heights.join(",")}
      data-tone-animating={!reduced && runId > 0 ? "true" : undefined}
      className={["flex min-w-0 flex-col items-center", className].join(" ")}
      role="img"
      aria-label={label}
    >
      <div className="flex items-stretch gap-2">
        {heightScale && (
          <div className="flex w-10 flex-col justify-between py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint" aria-hidden="true">
            <span>{locale === "en" ? "High" : "Alto"}</span>
            <span className="mx-auto w-px flex-1 bg-line" />
            <span>{locale === "en" ? "Low" : "Baixo"}</span>
          </div>
        )}
        <svg viewBox="0 0 120 68" className="h-28 w-56 max-w-full" aria-hidden="true">
          {[10, 22, 34, 46, 58].map((lineY) => (
            <line key={lineY} x1="6" x2="114" y1={lineY} y2={lineY} stroke="currentColor" className="text-line" strokeWidth={0.6} strokeDasharray="2 3" />
          ))}
          {tone === 5 ? (
            <circle cx="60" cy="34" r="4" fill={color} />
          ) : (
            <path d={path} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
          )}
          {tone !== 5 &&
            (reduced || runId === 0 ? (
              <circle cx={endX} cy={endY} r="5" fill={color} stroke="white" strokeWidth={1.5} data-tone-dot="static" />
            ) : (
              <circle key={runId} r="5" fill={color} stroke="white" strokeWidth={1.5} data-tone-dot="moving">
                <animateMotion dur={dur} fill="freeze" path={path} />
              </circle>
            ))}
          {gesture && tone !== 5 &&
            (reduced || runId === 0 ? (
              <text x={endX - 7} y={endY - 8} fontSize="14" aria-hidden="true">✋</text>
            ) : (
              <g key={`hand-${runId}`}>
                <text x="-7" y="-8" fontSize="14">✋<animateMotion dur={dur} fill="freeze" path={path} /></text>
              </g>
            ))}
        </svg>
      </div>
      <figcaption className="mt-1 text-center">
        <span className="block text-sm font-semibold text-ink">{locale === "en" ? guidance.guidedEn : guidance.guidedPt}</span>
        {gesture && <span className="mt-0.5 block text-xs text-ink-soft" data-tone-gesture>{locale === "en" ? guidance.gestureEn : guidance.gesturePt}</span>}
      </figcaption>
    </figure>
  );
}
