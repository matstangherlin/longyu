import { AVATAR_TONES } from "../../data/conversationScenes";
import { cultureText, type CultureSpeaker, type CultureStoryBeat } from "../../data/cultureQuest";
import type { SupportedLocale } from "../../i18n/config";

export function CultureCastAvatar({
  speaker,
  active,
}: {
  speaker: CultureSpeaker;
  active?: boolean;
}) {
  if (speaker === "narrator") return null;
  const names: Record<Exclude<CultureSpeaker, "narrator">, string> = {
    mei: "Mei",
    wang: "Wang",
    lin: "Lin",
  };
  const name = names[speaker];
  const tone = AVATAR_TONES[speaker] ?? AVATAR_TONES.default;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={[
          "flex h-12 w-12 items-center justify-center rounded-full border text-lg font-semibold shadow-card",
          tone.bg,
          tone.fg,
          active ? "border-accent ring-2 ring-accent/20" : "border-line",
        ].join(" ")}
        aria-hidden
      >
        {name.charAt(0)}
      </div>
      <span className="text-xs font-semibold text-ink">{name}</span>
    </div>
  );
}

export function CultureVisual({ kind }: { kind?: CultureStoryBeat["visual"] }) {
  if (!kind) return null;
  if (kind === "chopsticks-table") {
    return (
      <svg viewBox="0 0 220 120" className="mx-auto h-28 w-full max-w-sm" data-testid="culture-visual-chopsticks" role="img" aria-label="table">
        <rect x="8" y="18" width="204" height="90" rx="16" className="fill-[rgb(var(--surface-2))] stroke-[rgb(var(--line))]" strokeWidth="2" />
        <ellipse cx="70" cy="64" rx="28" ry="18" className="fill-[rgb(var(--surface))] stroke-[rgb(var(--line))]" strokeWidth="2" />
        <text x="70" y="68" textAnchor="middle" className="fill-ink" fontSize="12">饭</text>
        <rect x="118" y="48" width="44" height="28" rx="6" className="fill-[rgb(var(--surface))] stroke-[rgb(var(--line))]" strokeWidth="2" />
        <rect x="172" y="58" width="22" height="8" rx="3" className="fill-accent/40 stroke-accent" strokeWidth="1.5" />
        <line x1="176" y1="50" x2="210" y2="44" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
        <line x1="176" y1="56" x2="210" y2="52" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "shared-table") {
    return (
      <svg viewBox="0 0 220 110" className="mx-auto h-24 w-full max-w-sm" data-testid="culture-visual-shared" role="img">
        <ellipse cx="110" cy="58" rx="90" ry="36" className="fill-[rgb(var(--surface-2))] stroke-[rgb(var(--line))]" strokeWidth="2" />
        <circle cx="110" cy="58" r="16" className="fill-accent/25 stroke-accent" strokeWidth="1.5" />
        <circle cx="70" cy="52" r="12" className="fill-[rgb(var(--good)/0.2)] stroke-[rgb(var(--good))]" strokeWidth="1.5" />
        <circle cx="150" cy="52" r="12" className="fill-gold/30 stroke-gold" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === "door-shoes") {
    return (
      <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-center text-sm text-ink" data-testid="culture-visual-door">
        <p>🚪</p>
        <p className="mt-1 text-xs text-ink-soft">👟 👟 👟</p>
      </div>
    );
  }
  if (kind === "qr-till") {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3" data-testid="culture-visual-qr">
        <span className="text-3xl" aria-hidden>
          ▦
        </span>
        <span className="text-sm text-ink">QR</span>
      </div>
    );
  }
  if (kind === "metro-door") {
    return (
      <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-center text-sm text-ink" data-testid="culture-visual-metro">
        🚇 → 🚪
      </div>
    );
  }
  if (kind === "gift-hands") {
    return (
      <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-center text-2xl" data-testid="culture-visual-gift">
        🎁
      </div>
    );
  }
  return null;
}

export function CultureBeat({
  beat,
  locale,
}: {
  beat: CultureStoryBeat;
  locale: SupportedLocale;
}) {
  const speaker = beat.speaker ?? "narrator";
  const body = cultureText(beat.text, locale);
  if (speaker === "narrator") {
    return (
      <p className="text-sm leading-6 text-ink" data-testid="culture-narration">
        {body}
      </p>
    );
  }
  return (
    <div className="flex items-start gap-3" data-testid="culture-dialogue-line">
      <CultureCastAvatar speaker={speaker} active />
      <div className="min-w-0 flex-1 rounded-2xl border border-line bg-surface px-3 py-2 shadow-card">
        {beat.hanzi ? <p className="font-serif text-lg text-ink">{beat.hanzi}</p> : null}
        {beat.pinyin ? <p className="text-xs text-ink-faint">{beat.pinyin}</p> : null}
        <p className="mt-1 text-sm leading-5 text-ink-soft">{body}</p>
      </div>
    </div>
  );
}
