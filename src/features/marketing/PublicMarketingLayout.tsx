import { Link } from "react-router-dom";
import { BrandLockup } from "../../components/layout/Brand";
import { ButtonLink } from "../../components/ui/primitives";
import { AppVersionLabel } from "../../components/system/AppVersionLabel";
import { BetaNotice } from "../../components/system/BetaNotice";
import { useStore } from "../../lib/store";
import { useEffect, type ReactNode } from "react";
import { PUBLIC_SEO_PAGES } from "../../lib/seo";

const FOOTER_LINKS = PUBLIC_SEO_PAGES.filter((p) =>
  [
    "/aprender-mandarim",
    "/curso-de-mandarim-online",
    "/tons-do-mandarim",
    "/aprender-pinyin",
    "/aprender-hanzi",
    "/mandarim-para-brasileiros",
    "/como-funciona",
    "/metodo-longyu",
  ].includes(p.path)
);

export function PublicMarketingLayout({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="theme-transition relative min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_12%_0%,rgb(var(--accent)/0.08),transparent_42%),radial-gradient(circle_at_88%_18%,rgb(var(--accent-soft)/0.55),transparent_36%),rgb(var(--bg))]">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" aria-label="Longyu — início">
          <BrandLockup size={32} tagline={eyebrow ?? "PT-BR → Mandarim"} />
        </Link>
        <div className="flex items-center gap-2">
          <ButtonLink to="/login" variant="ghost" size="sm">
            Entrar
          </ButtonLink>
          <ButtonLink to="/conta" variant="primary" size="sm" className="hidden sm:inline-flex">
            Começar
          </ButtonLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-2 sm:px-6 sm:pb-14">{children}</main>

      <footer className="border-t border-line/60 bg-surface/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 sm:px-6">
          <nav aria-label="Conteúdo público" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {FOOTER_LINKS.map((page) => (
              <Link
                key={page.path}
                to={page.path}
                className="text-ink-soft underline-offset-2 hover:text-accent hover:underline"
              >
                {page.title.replace(/ — Longyu$/, "").replace(/ — mandarim pela lógica$/, "")}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
            <Link to="/privacidade" className="hover:text-ink-soft">
              Privacidade
            </Link>
            <Link to="/sobre" className="hover:text-ink-soft">
              Sobre
            </Link>
            <span>
              Longyu · <AppVersionLabel />
            </span>
          </div>
          <BetaNotice />
        </div>
      </footer>
    </div>
  );
}

export function MarketingArticle({
  title,
  lead,
  sections,
}: {
  title: string;
  lead: string;
  sections: { heading: string; body: string[] }[];
}) {
  return (
    <article>
      <h1 className="font-serif text-[2rem] font-semibold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[2.35rem]">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-ink-soft sm:text-[17px] sm:leading-8">{lead}</p>

      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.heading} className="max-w-2xl">
            <h2 className="font-serif text-xl font-semibold text-ink sm:text-2xl">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="mt-3 text-[15px] leading-7 text-ink-soft">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-3 sm:max-w-md">
        <ButtonLink to="/conta" size="lg" className="w-full shadow-lift">
          Começar a aprender
        </ButtonLink>
        <ButtonLink to="/" variant="outline" size="lg" className="w-full">
          Voltar ao início
        </ButtonLink>
      </div>
    </article>
  );
}
