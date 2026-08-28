/** Aviso discreto da beta — usar só em landing / Sobre (não em todas as telas). */
import { useTranslation } from "../../i18n/useTranslation";

export function BetaNotice({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p className={["text-xs leading-5 text-ink-faint", className].filter(Boolean).join(" ")}>
      {t("marketing.betaNotice")}
    </p>
  );
}
