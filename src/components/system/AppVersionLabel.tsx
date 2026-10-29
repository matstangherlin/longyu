import { useState } from "react";
import { getAppVersion } from "../../lib/feedback";
import { getBuildIdentity } from "../../lib/platform/buildIdentity";
import { useTranslation } from "../../i18n/useTranslation";

/** Versão discreta para rodapés / Sobre / admin. */
export function AppVersionLabel({ className }: { className?: string }) {
  return (
    <span className={["tabular-nums text-ink-faint", className].filter(Boolean).join(" ")}>
      v{getAppVersion()}
    </span>
  );
}

/** v<versão> (<sha7>) com cópia, para Ajustes e Sobre. */
export function ReleaseIdentityCard() {
  const { t } = useTranslation();
  const identity = getBuildIdentity();
  const label = identity.build ? `v${identity.appVersion} (${identity.build})` : `v${identity.appVersion}`;
  const [copied, setCopied] = useState(false);
  return (
    <div data-testid="release-identity" className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2">
      <p className="text-sm font-semibold tabular-nums text-ink">{label}</p>
      <button
        type="button"
        data-testid="copy-release-identity"
        className="min-h-11 rounded-xl px-3 text-sm font-semibold text-accent"
        onClick={() => {
          const write = navigator.clipboard?.writeText(label);
          void Promise.resolve(write).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? t("feedback.copiedVersion") : t("feedback.copyVersion")}
      </button>
    </div>
  );
}
