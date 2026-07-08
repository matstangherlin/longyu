import { useState } from "react";

export function BrandMark({
  size = 36,
  className = "",
  fallback = "wordmark",
}: {
  size?: number;
  className?: string;
  fallback?: "wordmark" | "hidden";
}) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src="/longyu-mascot.png"
        alt="Longyu"
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-xl bg-transparent object-contain ${className}`}
      />
    );
  }

  if (fallback === "hidden") return null;

  return (
    <span
      style={{ minWidth: Math.max(size * 2.25, 72), height: size, fontSize: Math.max(14, size * 0.38) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-accent-soft bg-accent-soft px-2 font-serif font-semibold leading-none text-accent ${className}`}
    >
      Longyu
    </span>
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif text-xl font-semibold leading-none text-accent ${className}`}>
      Longyu
    </span>
  );
}

export function BrandLockup({
  size = 36,
  tagline,
}: {
  size?: number;
  tagline?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={size} fallback="hidden" />
      <div className="leading-tight">
        <BrandWordmark />
        {tagline && <div className="text-[11px] text-ink-faint">{tagline}</div>}
      </div>
    </div>
  );
}
