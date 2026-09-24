import { useEffect, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { getBuildIdentity, getNativeAppVersion, platformLabel, type NativeAppVersion } from "../../lib/platform/buildIdentity";

/**
 * RC2.2.10 — "Android · build abc1234" (ou Web). Nunca expõe segredos.
 * RC2.2.10B — no Android acrescenta o versionCode do APK instalado.
 */
export function BuildIdentityLabel({ className }: { className?: string }) {
  const { t } = useTranslation();
  const identity = getBuildIdentity();
  const [nativeVersion, setNativeVersion] = useState<NativeAppVersion | null>(null);

  useEffect(() => {
    let active = true;
    void getNativeAppVersion().then((version) => {
      if (active) setNativeVersion(version);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <span data-build-identity={identity.platform} className={["tabular-nums text-ink-faint", className].filter(Boolean).join(" ")}>
      {t("marketing.aboutBuild", { platform: platformLabel(identity.platform), build: identity.build })}
      {nativeVersion ? ` · ${t("marketing.aboutVersionCode", { code: nativeVersion.versionCode })}` : null}
    </span>
  );
}
