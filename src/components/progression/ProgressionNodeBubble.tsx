import type { ReactNode } from "react";
import { IconCheck, IconLock, IconPlay } from "../ui/Icon";
import { ProgressionNodeLabel } from "./ProgressionNodeLabel";
import type {
  ProgressionNodeState,
  ProgressionPassRing,
  ProgressionPersonality,
} from "./progressionTypes";

/** Gentle sinusoidal offset — safe at 360px (±26px). */
export function progressionOffsetForIndex(index: number): number {
  return Math.round(Math.sin(index * 1.1) * 26);
}

function PassRing({
  ring,
  accent,
  locked,
}: {
  ring: ProgressionPassRing;
  accent: string;
  locked: boolean;
}) {
  const total = Math.max(1, ring.total);
  const value = Math.max(0, Math.min(total, ring.progress));
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const step = circumference / total;
  const gap = 8;
  const dash = Math.max(1, step - gap);
  const inactive = locked ? "rgb(var(--text-faint))" : "rgb(var(--line))";

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full -rotate-90 overflow-visible"
      viewBox="0 0 80 80"
      aria-hidden
      data-testid="progression-pass-ring"
      data-progress={`${value}/${total}`}
    >
      {Array.from({ length: total }, (_, index) => {
        const active = index < value;
        return (
          <circle
            key={index}
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={active ? accent : inactive}
            strokeLinecap="round"
            strokeOpacity={active ? 0.92 : 0.72}
            strokeWidth={4}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-index * step}
          />
        );
      })}
    </svg>
  );
}

/**
 * Canonical path bubble — Journey and Culture share this component.
 * State clarity uses shape/icon + size + border, never color alone.
 */
export function ProgressionNodeBubble({
  id,
  title,
  state,
  personality = "journey",
  statusLabel,
  metaLabel,
  passRing,
  offset = 0,
  icon,
  onSelect,
  href,
  disabled,
  testId,
  anchor,
  coreAula = false,
}: {
  id: string;
  title: string;
  state: ProgressionNodeState;
  personality?: ProgressionPersonality;
  statusLabel?: string;
  metaLabel?: string;
  passRing?: ProgressionPassRing;
  offset?: number;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  disabled?: boolean;
  testId?: string;
  anchor?: string;
  /** Core instructional AULA — never labeled Optional. */
  coreAula?: boolean;
}) {
  const isCurrent = state === "CURRENT";
  const isDone = state === "COMPLETED";
  const isLocked = state === "LOCKED";
  const isAvailable = state === "AVAILABLE";
  const nodeSize = isCurrent ? "h-[64px] w-[64px]" : isDone ? "h-[48px] w-[48px]" : "h-[54px] w-[54px]";
  const ringSize = isCurrent ? "h-[76px] w-[76px]" : isDone ? "h-[58px] w-[58px]" : "h-[64px] w-[64px]";
  const accent = personality === "culture" ? "rgb(var(--accent))" : "rgb(var(--accent))";
  const ariaState =
    state === "COMPLETED"
      ? "completed"
      : state === "CURRENT"
        ? "current"
        : state === "LOCKED"
          ? "locked"
          : "available";

  const content = (
    <>
      {isCurrent ? (
        <span
          className="absolute inset-0 rounded-full bg-accent/15 motion-safe:animate-pulse motion-reduce:animate-none"
          aria-hidden
          data-testid="progression-current-pulse"
        />
      ) : null}
      {passRing && passRing.total > 1 ? (
        <PassRing ring={passRing} accent={accent} locked={isLocked} />
      ) : null}
      <span
        className={[
          "relative flex items-center justify-center rounded-full border-2 transition active:scale-95",
          nodeSize,
          "min-h-11 min-w-11",
          isCurrent && "border-accent shadow-[0_0_0_3px_rgb(var(--accent)/0.28)]",
          isDone && "border-[rgb(var(--good)/0.55)] bg-[rgb(var(--good)/0.18)] text-[rgb(var(--good))]",
          isAvailable && "border-accent/50 bg-accent-soft/40 text-accent",
          isLocked && "border-line bg-surface-2 text-ink-faint",
          coreAula && !isLocked && "ring-1 ring-accent/30",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {isDone ? (
          <IconCheck width={isCurrent ? 26 : 20} height={isCurrent ? 26 : 20} data-testid="progression-complete-icon" />
        ) : isLocked ? (
          <IconLock width={18} height={18} data-testid="progression-lock-icon" />
        ) : icon ? (
          icon
        ) : (
          <IconPlay width={20} height={20} />
        )}
      </span>
    </>
  );

  const label = (
    <ProgressionNodeLabel
      title={title}
      statusLabel={
        statusLabel ??
        (coreAula && !isDone
          ? personality === "culture"
            ? undefined
            : "Aula"
          : undefined)
      }
      metaLabel={metaLabel}
      state={state}
    />
  );

  const wrapperClass = "relative z-[1] flex flex-col items-center";
  const commonProps = {
    "data-testid": testId ?? `progression-node-${id}`,
    "data-progression-node": id,
    "data-progression-state": state,
    "data-progression-personality": personality,
    "data-progression-anchor": anchor ?? `node:${id}`,
    "data-core-aula": coreAula ? "true" : undefined,
    "aria-current": isCurrent ? ("step" as const) : undefined,
    "aria-disabled": isLocked || disabled ? true : undefined,
    "aria-label": `${title}, ${ariaState}${passRing && passRing.total > 1 ? `, ${passRing.progress} of ${passRing.total}` : ""}`,
    className: [
      "flex flex-col items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
      isLocked || disabled ? "cursor-help" : "cursor-pointer",
    ].join(" "),
  };

  return (
    <div className={wrapperClass} style={{ transform: `translateX(${offset}px)` }}>
      {isCurrent && passRing && passRing.total > 1 ? (
        <div className="mb-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {passRing.progress}/{passRing.total}
        </div>
      ) : isCurrent ? (
        <div className="mb-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Continuar
        </div>
      ) : null}
      <div className={["relative grid place-items-center", ringSize].join(" ")}>
        {href && !isLocked && !disabled ? (
          <a {...commonProps} href={href} onClick={onSelect}>
            {content}
          </a>
        ) : (
          <button type="button" {...commonProps} onClick={isLocked || disabled ? undefined : onSelect}>
            {content}
          </button>
        )}
      </div>
      {label}
    </div>
  );
}
