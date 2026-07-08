import { useId, type CSSProperties } from "react";
import type { ChestType } from "../../lib/store";
import { CHEST_VISUALS } from "./chestMeta";

export type LongyuChestState = "locked" | "unlocked" | "opened";
export type LongyuChestSize = "sm" | "md" | "lg";

// Baú do Longyu desenhado em SVG inline — sem imagem externa. Um baú "de
// verdade": tampa arredondada, corpo de tábuas, cintas de metal, fecho e um
// selo chinês na tampa. Cada tipo tem paleta própria (ocre, vermelho/dourado,
// jade); os estados controlam cadeado, brilho e tampa aberta.
interface ChestPalette {
  lid: string;
  lidDark: string;
  body: string;
  bodyDark: string;
  stroke: string;
  band: string;
  bandDark: string;
  clasp: string;
  sealBg: string;
  sealText: string;
  glow: string;
  detail: string;
}

const PALETTES: Record<ChestType, ChestPalette> = {
  // Baú Pequeno: madeira ocre com fecho dourado e selo vermelho 宝.
  small: {
    lid: "#B87F3A",
    lidDark: "#8F5E26",
    body: "#A06B2C",
    bodyDark: "#7C4F1D",
    stroke: "#6B431A",
    band: "#D9A742",
    bandDark: "#A97B24",
    clasp: "#EBC25E",
    sealBg: "#B3402F",
    sealText: "#FFF7EA",
    glow: "rgba(217, 167, 66, 0.55)",
    detail: "#8F5E26",
  },
  // Baú do Dragão: laca vermelha com escamas e metais dourados, selo 龙.
  dragon: {
    lid: "#C43A2C",
    lidDark: "#93261C",
    body: "#A92E22",
    bodyDark: "#7E1F16",
    stroke: "#6E1A12",
    band: "#E3AC3F",
    bandDark: "#B07E22",
    clasp: "#F2C858",
    sealBg: "#B7791F",
    sealText: "#FFF6E0",
    glow: "rgba(242, 200, 88, 0.65)",
    detail: "#E3AC3F",
  },
  // Baú Mensal: jade com nuvens auspiciosas e selo 玉 — raro e sereno.
  monthly: {
    lid: "#3E9C6E",
    lidDark: "#2A7550",
    body: "#2F855A",
    bodyDark: "#20603F",
    stroke: "#1B5236",
    band: "#8FD6AF",
    bandDark: "#57A57E",
    clasp: "#B9E6CD",
    sealBg: "#1F5C3D",
    sealText: "#EAFBF1",
    glow: "rgba(143, 214, 175, 0.6)",
    detail: "#8FD6AF",
  },
  // Baú Lendário: jade imperial, ouro e roxo profundo, com brilho raro.
  legendary: {
    lid: "#2FA377",
    lidDark: "#167055",
    body: "#24795D",
    bodyDark: "#124A3B",
    stroke: "#0B352E",
    band: "#E8C75D",
    bandDark: "#A77720",
    clasp: "#FFE08A",
    sealBg: "#3B1F5C",
    sealText: "#FFF4C4",
    glow: "rgba(255, 224, 138, 0.85)",
    detail: "#9B7BE8",
  },
};

// Bloqueado: o mesmo baú, mas escuro e dessaturado, com cadeado no fecho.
const LOCKED_PALETTE: ChestPalette = {
  lid: "#8A8781",
  lidDark: "#6E6B66",
  body: "#7A7772",
  bodyDark: "#5F5D58",
  stroke: "#54524E",
  band: "#98948C",
  bandDark: "#767370",
  clasp: "#A3A099",
  sealBg: "#6E6B66",
  sealText: "#C9C6BF",
  glow: "rgba(0, 0, 0, 0)",
  detail: "#6E6B66",
};

const SIZES: Record<LongyuChestSize, number> = { sm: 54, md: 74, lg: 118 };

const STATE_LABEL: Record<LongyuChestState, string> = {
  locked: "bloqueado",
  unlocked: "pronto para abrir",
  opened: "aberto",
};

// Pose final da tampa aberta — os keyframes de `longyu-chest-lid` terminam
// exatamente nesta pose para a animação e o estado estático coincidirem.
const LID_OPEN_STYLE: CSSProperties = {
  transformBox: "fill-box",
  transformOrigin: "10% 95%",
  transform: "translate(-2px, -10px) rotate(-14deg)",
};

const SPARK_PATH = "M0 -3.2 L0.9 -0.9 L3.2 0 L0.9 0.9 L0 3.2 L-0.9 0.9 L-3.2 0 L-0.9 -0.9 Z";

const SPARKS: { x: number; y: number; scale: number; delay: number }[] = [
  { x: 40, y: 22, scale: 0.8, delay: 0 },
  { x: 52, y: 12, scale: 1, delay: 130 },
  { x: 64, y: 20, scale: 0.7, delay: 260 },
  { x: 46, y: 30, scale: 0.6, delay: 390 },
  { x: 58, y: 27, scale: 0.75, delay: 520 },
];

export function LongyuChest({
  type,
  state,
  size = "md",
  animated = false,
  title,
  className,
}: {
  type: ChestType;
  state: LongyuChestState;
  size?: LongyuChestSize;
  animated?: boolean;
  /** Tooltip; no estado locked o padrão é "Complete o módulo para liberar". */
  title?: string;
  className?: string;
}) {
  const uid = useId();
  const clipLidId = `longyu-chest-lid-${uid}`;
  const clipBodyId = `longyu-chest-body-${uid}`;
  const locked = state === "locked";
  const opened = state === "opened";
  const p = locked ? LOCKED_PALETTE : PALETTES[type];
  const visual = CHEST_VISUALS[type];
  const width = SIZES[size];
  const height = Math.round((width * 88) / 96);

  const svgClass =
    animated && state === "unlocked" ? "longyu-chest-glow" : undefined;
  const svgStyle: CSSProperties | undefined =
    !animated && state === "unlocked"
      ? { filter: `drop-shadow(0 3px 8px ${p.glow})` }
      : undefined;

  return (
    <span
      className={["inline-flex", className].filter(Boolean).join(" ")}
      title={title ?? (locked ? "Complete o módulo para liberar" : undefined)}
      style={{ "--chest-glow": p.glow } as CSSProperties}
    >
      <svg
        viewBox="0 0 96 88"
        width={width}
        height={height}
        role="img"
        aria-label={`${visual.name} — ${STATE_LABEL[state]}`}
        className={svgClass}
        style={svgStyle}
      >
        <defs>
          <clipPath id={clipLidId}>
            <path d="M12 40 V30 Q12 10 48 10 Q84 10 84 30 V40 Z" />
          </clipPath>
          <clipPath id={clipBodyId}>
            <rect x="12" y="40" width="72" height="34" rx="6" />
          </clipPath>
        </defs>

        {/* Pés */}
        <rect x="16" y="72" width="10" height="8" rx="2" fill={p.bodyDark} />
        <rect x="70" y="72" width="10" height="8" rx="2" fill={p.bodyDark} />

        {/* Corpo (tábuas) */}
        <rect x="12" y="40" width="72" height="34" rx="6" fill={p.body} stroke={p.stroke} strokeWidth="2" />
        <line x1="16" y1="52" x2="80" y2="52" stroke={p.bodyDark} strokeWidth="1.5" opacity="0.55" />
        <line x1="16" y1="63" x2="80" y2="63" stroke={p.bodyDark} strokeWidth="1.5" opacity="0.55" />

        {/* Cintas verticais (parte do corpo) */}
        <g clipPath={`url(#${clipBodyId})`}>
          <rect x="25" y="38" width="9" height="38" fill={p.band} stroke={p.bandDark} strokeWidth="1.5" />
          <rect x="62" y="38" width="9" height="38" fill={p.band} stroke={p.bandDark} strokeWidth="1.5" />
        </g>

        {/* Aro de metal na junção */}
        <rect x="10" y="36" width="76" height="8" rx="3" fill={p.band} stroke={p.bandDark} strokeWidth="1.5" />

        {/* Interior aberto: cavidade escura + luz saindo */}
        {opened && (
          <g>
            <rect x="15" y="28" width="66" height="14" rx="5" fill="#241A10" opacity="0.9" />
            <ellipse cx="48" cy="33" rx="26" ry="8" fill={p.clasp} opacity="0.28" />
            <ellipse cx="48" cy="33" rx="14" ry="5" fill="#FFF6DC" opacity="0.5" />
            <line x1="36" y1="28" x2="31" y2="17" stroke={p.clasp} strokeWidth="2" strokeLinecap="round" opacity="0.65" />
            <line x1="48" y1="26" x2="48" y2="13" stroke={p.clasp} strokeWidth="2" strokeLinecap="round" opacity="0.65" />
            <line x1="60" y1="28" x2="65" y2="17" stroke={p.clasp} strokeWidth="2" strokeLinecap="round" opacity="0.65" />
          </g>
        )}

        {/* Fecho (fica no corpo; a tampa levanta sem ele) */}
        <g>
          <rect x="40" y="36" width="16" height="17" rx="4" fill={p.clasp} stroke={p.bandDark} strokeWidth="1.5" />
          {!locked && (
            <>
              <circle cx="48" cy="43" r="2.2" fill={p.bandDark} />
              <rect x="46.9" y="43.5" width="2.2" height="5" rx="1" fill={p.bandDark} />
            </>
          )}
        </g>

        {/* Cadeado (somente bloqueado) */}
        {locked && (
          <g>
            <path d="M42.5 40 v-3.4 a5.5 5.5 0 0 1 11 0 V40" fill="none" stroke="#44423D" strokeWidth="2.6" />
            <rect x="40.5" y="39.5" width="15" height="12.5" rx="3" fill="#57554F" stroke="#3B3935" strokeWidth="1.5" />
            <circle cx="48" cy="44.5" r="1.9" fill="#2C2B27" />
            <rect x="47" y="45" width="2" height="4" rx="0.9" fill="#2C2B27" />
          </g>
        )}

        {/* Tampa (grupo inteiro levanta quando aberto) */}
        <g
          style={opened ? LID_OPEN_STYLE : undefined}
          className={opened && animated ? "longyu-chest-lid" : undefined}
        >
          <path
            d="M12 40 V30 Q12 10 48 10 Q84 10 84 30 V40 Z"
            fill={p.lid}
            stroke={p.stroke}
            strokeWidth="2"
          />
          <g clipPath={`url(#${clipLidId})`}>
            {/* Cintas na tampa */}
            <rect x="25" y="8" width="9" height="34" fill={p.band} stroke={p.bandDark} strokeWidth="1.5" />
            <rect x="62" y="8" width="9" height="34" fill={p.band} stroke={p.bandDark} strokeWidth="1.5" />
            {/* Detalhe por tipo */}
            {type === "small" && !locked && (
              <>
                <line x1="40" y1="12" x2="40" y2="38" stroke={p.lidDark} strokeWidth="1.4" opacity="0.5" />
                <line x1="56" y1="12" x2="56" y2="38" stroke={p.lidDark} strokeWidth="1.4" opacity="0.5" />
              </>
            )}
            {type === "dragon" && !locked && (
              <>
                <path
                  d="M14 38 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0"
                  fill="none"
                  stroke={p.detail}
                  strokeWidth="1.6"
                  opacity="0.6"
                />
                <path
                  d="M18 29 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0"
                  fill="none"
                  stroke={p.detail}
                  strokeWidth="1.6"
                  opacity="0.45"
                />
              </>
            )}
            {type === "monthly" && !locked && (
              <>
                <path d="M18 32 q5 -9 12 -6 q-6 1 -8 8" fill={p.detail} opacity="0.4" />
                <path d="M78 32 q-5 -9 -12 -6 q6 1 8 8" fill={p.detail} opacity="0.4" />
              </>
            )}
            {type === "legendary" && !locked && (
              <>
                <path d="M18 33 q8 -12 18 -4 q-9 2 -13 10" fill={p.detail} opacity="0.32" />
                <path d="M78 33 q-8 -12 -18 -4 q9 2 13 10" fill={p.detail} opacity="0.32" />
                <path
                  d="M30 26 L48 15 L66 26 L48 36 Z"
                  fill="none"
                  stroke={p.detail}
                  strokeWidth="1.8"
                  opacity="0.62"
                />
                <path d="M48 18 L54 26 L48 33 L42 26 Z" fill={p.detail} opacity="0.24" />
              </>
            )}
            {/* Brilho da laca */}
            <path d="M20 24 Q26 13 40 11 Q28 17 25 28 Z" fill="#FFFFFF" opacity={type === "small" ? 0.16 : type === "legendary" ? 0.3 : 0.24} />
          </g>
          {/* Selo chinês na tampa */}
          <rect x="40.5" y="16.5" width="15" height="15" rx="3.5" fill={p.sealBg} stroke={p.bandDark} strokeWidth="1.2" />
          <text
            x="48"
            y="24.4"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            className="hanzi"
            fill={p.sealText}
          >
            {visual.glyph}
          </text>
        </g>

        {/* Brilhos extras dos baús valiosos (fechado, não bloqueado) */}
        {!locked && !opened && type !== "small" && (
          <g fill={p.clasp}>
            <path d={SPARK_PATH} transform="translate(87 16) scale(0.9)" opacity="0.9" />
            <path d={SPARK_PATH} transform="translate(9 22) scale(0.6)" opacity="0.7" />
            {type === "dragon" && <path d={SPARK_PATH} transform="translate(80 6) scale(0.55)" opacity="0.8" />}
            {type === "legendary" && (
              <>
                <path d={SPARK_PATH} transform="translate(80 6) scale(0.65)" opacity="0.95" />
                <path d={SPARK_PATH} transform="translate(14 10) scale(0.5)" opacity="0.78" />
                <path d={SPARK_PATH} transform="translate(48 4) scale(0.48)" opacity="0.72" />
              </>
            )}
          </g>
        )}

        {/* Partículas da revelação */}
        {opened && (
          <g fill={p.clasp}>
            {SPARKS.map((spark, index) => (
              <g key={index} transform={`translate(${spark.x} ${spark.y}) scale(${spark.scale})`}>
                <path
                  d={SPARK_PATH}
                  className={animated ? "longyu-chest-spark" : undefined}
                  style={animated ? { animationDelay: `${spark.delay}ms` } : { opacity: 0.5 }}
                />
              </g>
            ))}
          </g>
        )}
      </svg>
    </span>
  );
}
