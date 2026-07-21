import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useStore } from "../../lib/store";
import { Button } from "../../components/ui/primitives";
import { BrandLockup } from "../../components/layout/Brand";
import { Mascot } from "../../components/brand/Mascot";
import { IconCheck, IconChevron, IconSound, IconStar, IconSun } from "../../components/ui/Icon";
import { AppVersionLabel } from "../../components/system/AppVersionLabel";
import { BetaNotice } from "../../components/system/BetaNotice";

const BULLETS = [
  "Comece pelo básico",
  "Treine tons sem decorar",
  "Monte hànzì passo a passo",
  "Revise seus erros",
];

// Landing pública em "/": primeira impressão para quem ainda não tem conta.
// Sem sidebar/topbar/tab bar — só marca, proposta e dois CTAs. Quem já tem
// conta configurada, progresso ou sessão cloud vai direto para /jornada.
export function LandingPage() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const hasProgress = useStore((s) => s.completedLessons.length > 0);
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const isDark = theme === "dark";

  // A landing vive fora do AppShell, então aplica o tema por conta própria.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (accountSetupComplete || hasProgress || authMode === "cloud") {
    return <Navigate to="/jornada" replace />;
  }

  return (
    <div className="theme-transition relative flex min-h-dvh flex-col overflow-x-hidden bg-[radial-gradient(circle_at_18%_34%,rgb(var(--accent)/0.07),transparent_32%),radial-gradient(circle_at_82%_24%,rgb(var(--accent-soft)/0.48),transparent_30%),rgb(var(--bg))]">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4 lg:py-5">
        <BrandLockup size={34} tagline="PT-BR → Mandarim" />
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setTheme(isDark ? "clay" : "dark")}
            aria-pressed={isDark}
            aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink-soft shadow-card transition hover:border-accent-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <IconSun width={17} height={17} aria-hidden="true" />
            <span className="hidden sm:inline">{isDark ? "Modo claro" : "Modo escuro"}</span>
          </button>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-[1] mx-auto flex w-full max-w-6xl flex-1 items-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-0 sm:px-8 lg:py-8 xl:py-10">
        <div
          data-testid="landing-hero"
          className="grid w-full items-center gap-6 lg:grid-cols-[minmax(420px,0.96fr)_minmax(0,1.04fr)] lg:gap-14 xl:gap-20"
        >
          <section
            aria-hidden="true"
            data-testid="landing-demo"
            className="relative hidden overflow-hidden rounded-[28px] border border-accent/20 bg-[radial-gradient(circle_at_50%_4%,rgb(var(--accent-soft)),rgb(var(--surface))_56%,rgb(var(--bg))_100%)] p-7 text-center shadow-lift lg:block"
          >
            <span className="hanzi pointer-events-none absolute -right-8 -top-10 select-none text-[11rem] leading-none text-accent/[0.07]">
              龙
            </span>

            <span className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full border border-line/70 bg-surface/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--good))]" />
              Sua primeira lição
            </span>

            <div className="relative mx-auto mt-5 flex justify-center">
              <Mascot size={156} variant="wave" className="drop-shadow-[0_16px_18px_rgb(var(--accent)/0.16)]" />
            </div>

            <div className="relative mx-auto mt-5 flex max-w-sm flex-col gap-3">
              <div className="longyu-reward-rise flex items-center justify-between rounded-2xl border border-line/80 bg-surface/95 px-4 py-3 text-left shadow-card">
                <div>
                  <div className="hanzi text-2xl leading-tight text-ink">你好</div>
                  <div className="mt-0.5 font-serif text-sm text-ink-soft">nǐ hǎo · olá</div>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent">
                  <IconSound width={17} height={17} />
                </span>
              </div>
              <div
                className="longyu-reward-rise flex items-center justify-between rounded-2xl border border-line/80 bg-surface/95 px-4 py-3 text-left shadow-card"
                style={{ animationDelay: "120ms" }}
              >
                <div>
                  <div className="hanzi text-2xl leading-tight text-ink">谢谢</div>
                  <div className="mt-0.5 font-serif text-sm text-ink-soft">xièxie · obrigado(a)</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--good)/0.12)] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--good))]">
                  <IconCheck width={13} height={13} /> +15 XP
                </span>
              </div>
            </div>
          </section>

          <section data-testid="landing-copy" className="mx-auto w-full max-w-[34rem] text-center lg:mx-0 lg:text-left">
            <div className="mb-2 flex justify-center sm:mb-3 lg:hidden">
              <Mascot size={88} variant="wave" className="drop-shadow-[0_12px_14px_rgb(var(--accent)/0.14)]" />
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/10 bg-accent-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent sm:text-[11px]">
              <IconStar width={12} height={12} fill="currentColor" /> Grátis para começar
            </span>

            <h1 className="mt-2.5 font-serif text-[2rem] font-semibold leading-[1.02] tracking-[-0.02em] text-ink sm:text-[2.5rem] lg:text-[2.5rem] lg:leading-[1.04] xl:text-[2.7rem]">
              <span className="block">Aprenda mandarim</span>
              <span className="block">
                com pinyin, tons e <span className="text-accent">hànzì</span>.
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-5 text-ink-soft sm:text-[15px] sm:leading-6 lg:mx-0">
              Lições curtas para brasileiros praticarem frases reais, escuta e caracteres
              chineses todos os dias.
            </p>

            <ul className="mx-auto mt-4 grid max-w-lg grid-cols-2 gap-1.5 text-left sm:gap-2 lg:mx-0">
              {BULLETS.map((item) => (
                <li
                  key={item}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-line/70 bg-surface/90 px-2.5 py-2 text-[12px] font-medium leading-4 text-ink-soft shadow-card sm:gap-2.5 sm:px-3 sm:text-sm"
                >
                  <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))] sm:h-5 sm:w-5">
                    <IconCheck width={11} height={11} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mx-auto mt-5 grid max-w-lg gap-2.5 lg:mx-0">
              <Link to="/conta" className="block">
                <Button size="lg" className="w-full shadow-lift">
                  Começar agora <IconChevron width={18} height={18} />
                </Button>
              </Link>
              <Link to="/login" className="block">
                <Button variant="outline" size="lg" className="w-full">
                  Já tenho uma conta
                </Button>
              </Link>
            </div>

            <p className="mt-2.5 text-[11px] leading-4 text-ink-faint sm:text-xs">
              Sem cartão de crédito. Seu progresso pode ser salvo na nuvem.
            </p>
          </section>
        </div>
      </main>

      <footer className="relative z-[1] mx-auto w-full max-w-6xl space-y-1.5 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2 text-center sm:px-8 lg:text-left">
        <BetaNotice />
        <p className="text-[11px] text-ink-faint">
          Longyu · <AppVersionLabel />
        </p>
      </footer>
    </div>
  );
}

