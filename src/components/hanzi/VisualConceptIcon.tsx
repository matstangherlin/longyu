import type { ReactNode } from "react";
import type { VisualConceptId } from "../../data/visualVocabulary";

interface VisualConceptIconProps {
  conceptId: VisualConceptId | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-28 w-28",
} as const;

function SvgWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <circle cx="32" cy="16" r="9" fill="currentColor" opacity="0.9" />
      <path d="M14 54c2-14 12-18 18-18s16 4 18 18" fill="currentColor" opacity="0.85" />
    </SvgWrap>
  );
}

function TreeIcon({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <rect x="28" y="36" width="8" height="18" rx="2" fill="currentColor" opacity="0.75" />
      <circle cx="32" cy="24" r="16" fill="currentColor" opacity="0.9" />
    </SvgWrap>
  );
}

function MouthIcon({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <rect x="14" y="20" width="36" height="24" rx="12" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M20 34h24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </SvgWrap>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <circle cx="32" cy="32" r="12" fill="currentColor" />
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4;
        const x1 = 32 + Math.cos(angle) * 18;
        const y1 = 32 + Math.sin(angle) * 18;
        const x2 = 32 + Math.cos(angle) * 24;
        const y2 = 32 + Math.sin(angle) * 24;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />;
      })}
    </SvgWrap>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <path
        d="M40 14a18 18 0 1 0 10 32a14 14 0 1 1 0-32z"
        fill="currentColor"
      />
    </SvgWrap>
  );
}

function MountainIcon({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <path d="M8 50 L28 18 L40 34 L52 22 L56 50 Z" fill="currentColor" opacity="0.9" />
    </SvgWrap>
  );
}

function WaterIcon({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <path d="M32 10c8 12 16 20 16 30a16 16 0 1 1-32 0c0-10 8-18 16-30z" fill="currentColor" opacity="0.85" />
    </SvgWrap>
  );
}

function FireIcon({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <path d="M32 8c6 10 14 14 14 24a14 14 0 1 1-28 0c0-10 8-14 14-24z" fill="currentColor" />
      <path d="M32 28c3 5 7 7 7 12a7 7 0 1 1-14 0c0-5 4-7 7-12z" fill="currentColor" opacity="0.55" />
    </SvgWrap>
  );
}

function BigIcon({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <rect x="12" y="12" width="40" height="40" rx="6" fill="currentColor" opacity="0.9" />
    </SvgWrap>
  );
}

function SmallIcon({ className }: { className?: string }) {
  return (
    <SvgWrap className={className}>
      <rect x="24" y="24" width="16" height="16" rx="3" fill="currentColor" opacity="0.9" />
    </SvgWrap>
  );
}

const ICON_BY_ID: Record<string, (props: { className?: string }) => JSX.Element> = {
  person: PersonIcon,
  tree: TreeIcon,
  mouth: MouthIcon,
  sun: SunIcon,
  moon: MoonIcon,
  mountain: MountainIcon,
  water: WaterIcon,
  fire: FireIcon,
  big: BigIcon,
  small: SmallIcon,
};

export function VisualConceptIcon({ conceptId, size = "md", className = "" }: VisualConceptIconProps) {
  const Icon = ICON_BY_ID[conceptId] ?? PersonIcon;
  return (
    <div
      className={[
        "inline-flex items-center justify-center rounded-2xl border border-line bg-surface-2 text-accent",
        SIZE_CLASS[size],
        className,
      ].join(" ")}
    >
      <Icon className="h-[70%] w-[70%]" />
    </div>
  );
}
