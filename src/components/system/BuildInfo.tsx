import { buildInfoLines, formatAppVersionLabel, shortCommitSha, formatBuildTimestamp } from "../../lib/appMeta";

interface BuildInfoProps {
  className?: string;
  /** Uma linha compacta para rodapés. */
  compact?: boolean;
}

export function BuildInfo({ className = "", compact = false }: BuildInfoProps) {
  if (compact) {
    return (
      <p className={["text-xs text-ink-faint", className].filter(Boolean).join(" ")}>
        {formatAppVersionLabel()} · {shortCommitSha()} · {formatBuildTimestamp()}
      </p>
    );
  }

  const lines = buildInfoLines();
  return (
    <div className={["text-xs leading-5 text-ink-faint", className].filter(Boolean).join(" ")}>
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}
