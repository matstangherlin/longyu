import { useTranslation } from "../../i18n/useTranslation";
import { getBuildIdentity, platformLabel } from "../../lib/platform/buildIdentity";

/** RC2.2.10 — "Android · build abc1234" (ou Web). Nunca expõe segredos. */
export function BuildIdentityLabel({ className }: { className?: string }) {
  const { t } = useTranslation();
  const identity = getBuildIdentity();
  return (
    <span data-build-identity={identity.platform} className={["tabular-nums text-ink-faint", className].filter(Boolean).join(" ")}>
      {t("marketing.aboutBuild", { platform: platformLabel(identity.platform), build: identity.build })}
    </span>
  );
}
