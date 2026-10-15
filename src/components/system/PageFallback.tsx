import { useTranslation } from "../../i18n/useTranslation";

// Fallback exibido enquanto uma rota lazy carrega (code-splitting).
// Mantém o layout do app estável: sem "pulo" quando o chunk da página chega.
export function PageFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center" role="status" aria-label={t("common.loadingPage")}>
      {/* RC2.3.13R.3.2.5 — a load that resolves fast never flashes a spinner:
          it fades in after a short delay (instant with reduced motion). */}
      <div className="loading-delayed-reveal flex flex-col items-center gap-3" data-testid="page-fallback">
        <span
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-accent/25 border-r-accent motion-reduce:animate-none"
        />
        <span className="text-sm text-ink-soft">{t("common.loading")}</span>
      </div>
    </div>
  );
}
