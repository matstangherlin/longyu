import { getAppVersion } from "../../lib/feedback";

/** Versão discreta para rodapés / Sobre / admin. */
export function AppVersionLabel({ className }: { className?: string }) {
  return (
    <span className={["tabular-nums text-ink-faint", className].filter(Boolean).join(" ")}>
      v{getAppVersion()}
    </span>
  );
}
