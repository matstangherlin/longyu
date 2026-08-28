import { useTranslation } from "../../i18n/useTranslation";

// Fallback exibido enquanto uma rota lazy carrega (code-splitting).
// Mantém o layout do app estável: sem "pulo" quando o chunk da página chega.
export function PageFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center" role="status" aria-label={t("common.loadingPage")}>
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-accent/25 border-r-accent motion-reduce:animate-none"
        />
        <span className="text-sm text-ink-soft">{t("common.loading")}</span>
      </div>
    </div>
  );
}
