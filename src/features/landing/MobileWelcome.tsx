import { Link } from "react-router-dom";
import { ButtonLink } from "../../components/ui/primitives";
import { Mascot } from "../../components/brand/Mascot";
import { AppVersionLabel } from "../../components/system/AppVersionLabel";
import { hasCourseDirection } from "../../lib/courseDirectionState";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * RC2.2.14 · A–I — boas-vindas do celular e do app Android.
 *
 * A primeira dobra responde "como eu começo a aprender?": marca → dragão →
 * promessa curta → teste guiado de 2 min → "Já tenho uma conta" discreto.
 * RC2.2.14B: sem seletor de idioma — a interface segue o idioma do sistema
 * (Configurações › Idioma do aplicativo para mudar) e o curso é escolhido
 * na tela seguinte.
 * Cards de benefício, BetaNotice longo, tema e rodapé saem da primeira dobra
 * (o tema mora em Configurações; os links legais ficam abaixo da dobra).
 */
export function MobileWelcome() {
  const { t } = useTranslation();
  // RC2.2.14B · Q — sem curso escolhido, o teste guiado começa pela escolha do curso.
  const guidedTo = hasCourseDirection() ? "/teste-guiado" : "/curso?next=%2Fteste-guiado";

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
          <ButtonLink to={guidedTo} size="lg" className="w-full shadow-lift" data-testid="landing-guided-try">
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

    </div>
  );
}
