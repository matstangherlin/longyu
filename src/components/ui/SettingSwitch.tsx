/** Interruptor de ajuste (alvo de toque 48×56). Usado em Configurações. */
export function SettingSwitch({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium text-ink">{label}</div>
        <div className="mt-0.5 text-sm leading-5 text-ink-soft">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className="flex h-12 w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <span
          aria-hidden="true"
          className={[
            // RC2.3.13R.3.2.5 — OFF is a visible track (≥ 3:1 for the control), not a pale line.
            "relative block h-7 w-12 rounded-full transition",
            checked ? "bg-accent" : "bg-ink-faint/55 ring-1 ring-inset ring-ink-faint/40",
          ].join(" ")}
        >
          <span
            className={[
              "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-card transition-transform",
              checked ? "translate-x-5" : "translate-x-0",
            ].join(" ")}
          />
        </span>
      </button>
    </div>
  );
}
