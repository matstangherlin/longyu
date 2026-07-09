import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useStore } from "../../lib/store";
import { Button } from "../../components/ui/primitives";
import { BrandLockup } from "../../components/layout/Brand";
import { Mascot } from "../../components/brand/Mascot";
import { IconCheck, IconChevron, IconSound, IconStar } from "../../components/ui/Icon";

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
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const hasProgress = useStore((s) => s.completedLessons.length > 0);
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");

  // A landing vive fora do AppShell, então aplica o tema por conta própria.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (accountSetupComplete || hasProgress || authMode === "cloud") {
    return <Navigate to="/jornada" replace />;
  }

  return (
    <div className="theme-transition flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <BrandLockup size={34} tagline="PT-BR → Mandarim" />
        <Link to="/login">
          <Button variant="ghost" size="sm">
            Entrar
          </Button>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-2 sm:px-6 lg:pt-0">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          {/* Ilustração (desktop): mascote + exemplos de conteúdo real. */}
          <section
            aria-hidden="true"
            className="relative hidden overflow-hidden rounded-[32px] border border-accent-soft bg-[radial-gradient(circle_at_50%_0%,rgb(var(--accent-soft)),rgb(var(--surface))_58%,rgb(var(--bg))_100%)] p-8 text-center shadow-lift lg:block"
          >
            <span className="hanzi pointer-events-none absolute -right-8 -top-10 select-none text-[11rem] leading-none text-accent/[0.07]">
              龙
            </span>

            <div className="relative mx-auto mt-2 flex justify-center">
              <Mascot size={168} variant="wave" />
            </div>

            <div className="relative mx-auto mt-6 flex max-w-xs flex-col gap-3">
              <div className="longyu-reward-rise flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-card">
                <div>
                  <div className="hanzi text-2xl leading-tight text-ink">你好</div>
                  <div className="mt-0.5 font-serif text-sm text-ink-soft">nǐ hǎo · olá</div>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent">
                  <IconSound width={17} height={17} />
                </span>
              </div>
              <div
                className="longyu-reward-rise flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-card"
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

          {/* Proposta + CTAs. */}
          <section className="text-center lg:text-left">
            <div className="mb-4 flex justify-center lg:hidden">
              <Mascot size={104} variant="wave" />
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              <IconStar width={12} height={12} fill="currentColor" /> Grátis para começar
            </span>

            <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl lg:text-[2.65rem]">
              Aprenda mandarim com pinyin, tons e{" "}
              <span className="text-accent">hànzì</span>.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-soft sm:text-base lg:mx-0">
              Lições curtas para brasileiros praticarem frases reais, escuta e caracteres
              chineses todos os dias.
            </p>

            <ul className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 text-left lg:mx-0">
              {BULLETS.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 rounded-xl border border-line/70 bg-surface px-3 py-2 text-xs font-medium text-ink-soft shadow-card sm:text-sm"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]">
                    <IconCheck width={12} height={12} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mx-auto mt-6 grid max-w-md gap-2.5 lg:mx-0">
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

            <p className="mt-3 text-xs text-ink-faint">
              Sem cartão de crédito. Seu progresso pode ser salvo na nuvem.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
