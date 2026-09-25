import { useState } from "react";
import { Link } from "react-router-dom";
import { ButtonLink } from "../../components/ui/primitives";
import { Mascot } from "../../components/brand/Mascot";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { IconCheck } from "../../components/ui/Icon";
import { AppVersionLabel } from "../../components/system/AppVersionLabel";
import { LOCALE_DISPLAY_NAME, SUPPORTED_LOCALES, type SupportedLocale } from "../../i18n/config";
import { useTranslation } from "../../i18n/useTranslation";

/** Rótulo curto do botão de idioma ("PT-BR", "EN"). */
const LOCALE_SHORT: Record<SupportedLocale, string> = { "pt-BR": "PT-BR", en: "EN" };

/**
 * RC2.2.14 · A–I — boas-vindas do celular e do app Android.
 *
 * A primeira dobra responde "como eu começo a aprender?": marca → dragão →
 * promessa curta → teste guiado de 2 min → "Já tenho uma conta" discreto.
 * Cards de benefício, BetaNotice longo, tema e rodapé saem da primeira dobra
 * (o tema mora em Configurações; os links legais ficam abaixo da dobra).
 */
export function MobileWelcome() {
  const { t, locale, setLocale } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const current = (SUPPORTED_LOCALES as readonly string[]).includes(locale) ? (locale as SupportedLocale) : "pt-BR";

  return (
    <div
      data-testid="mobile-welcome"
      className="theme-transition relative overflow-x-hidden bg-[radial-gradient(circle_at_50%_22%,rgb(var(--accent-soft)/0.55),transparent_55%),rgb(var(--bg))]"
    >
      <div className="flex min-h-dvh flex-col">
        <header
          data-testid="mobile-welcome-header"
          className="flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(var(--app-safe-top)+0.5rem)]"
        >
          <span className="inline-flex items-center gap-1.5 font-serif text-xl font-semibold text-accent">
            <span aria-hidden="true">🐉</span> Longyu
          </span>
          <button
            type="button"
            data-testid="landing-locale-button"
            aria-haspopup="dialog"
            aria-label={t("marketing.localeButtonAria", { locale: LOCALE_DISPLAY_NAME[current] })}
            onClick={() => setSheetOpen(true)}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-ink shadow-card transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <span aria-hidden="true">🌐</span>
            {LOCALE_SHORT[current]}
          </button>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-5 pb-4 text-center">
          <Mascot size={132} variant="wave" className="drop-shadow-[0_14px_16px_rgb(var(--accent)/0.16)]" />
          <h1 className="mt-4 font-serif text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.02em] text-ink">
            <span className="block">{t("marketing.heroTitle1")}</span>
            <span className="block">
              {t("marketing.heroTitle2Before")}
              <span className="text-accent">hànzì</span>
              {t("marketing.heroTitle2After")}
            </span>
          </h1>
          <p className="mt-3 max-w-xs text-[15px] leading-6 text-ink-soft">{t("marketing.heroPromise")}</p>
        </main>

        <div className="px-5 pb-[calc(var(--app-safe-bottom)+0.75rem)]">
          <ButtonLink to="/teste-guiado" size="lg" className="w-full shadow-lift" data-testid="landing-guided-try">
            {t("marketing.ctaGuidedTry")}
          </ButtonLink>
          <Link
            to="/login"
            data-testid="landing-has-account"
            className="mt-1 inline-flex min-h-12 w-full items-center justify-center text-sm font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            {t("marketing.ctaHasAccount")}
          </Link>
        </div>
      </div>

      {/* Abaixo da dobra: só os links legais e de método. */}
      <footer className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-4 pb-[calc(var(--app-safe-bottom)+1rem)] pt-2 text-[11px] text-ink-faint">
        <Link to="/metodo-longyu" className="inline-flex min-h-10 items-center hover:text-ink-soft">{t("marketing.method")}</Link>
        <Link to="/privacidade" className="inline-flex min-h-10 items-center hover:text-ink-soft">{t("marketing.privacy")}</Link>
        <Link to="/termos" className="inline-flex min-h-10 items-center hover:text-ink-soft">{t("marketing.terms")}</Link>
        <Link to="/sobre" className="inline-flex min-h-10 items-center hover:text-ink-soft">{t("marketing.about")}</Link>
        <span className="inline-flex min-h-10 w-full items-center justify-center">
          Longyu · <AppVersionLabel />
        </span>
      </footer>

      {sheetOpen && (
        <ModalOverlay label={t("marketing.localeSheetTitle")} onBackdropClick={() => setSheetOpen(false)}>
          <div
            data-testid="landing-locale-sheet"
            className="w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,var(--app-safe-bottom))] shadow-card sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-semibold text-ink">{t("marketing.localeSheetTitle")}</h2>
            <ul className="mt-3 grid gap-2">
              {SUPPORTED_LOCALES.map((code) => (
                <li key={code}>
                  <button
                    type="button"
                    data-locale-option={code}
                    aria-pressed={current === code}
                    onClick={() => {
                      setLocale(code);
                      setSheetOpen(false);
                    }}
                    className={[
                      "flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 text-left font-semibold transition",
                      current === code ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface-2 text-ink hover:bg-surface",
                    ].join(" ")}
                  >
                    {LOCALE_DISPLAY_NAME[code]}
                    {current === code && <IconCheck width={16} height={16} />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
