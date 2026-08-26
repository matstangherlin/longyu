/**
 * Metadados SEO do Longyu.
 * Domínio canônico atual: singular-meringue-7838cd.netlify.app (site vivo).
 * Não use longyu.netlify.app até existir alias Netlify ativo.
 * Quando existir longyu.com.br, defina VITE_SITE_URL no Netlify.
 */

export const DEFAULT_SITE_URL = "https://singular-meringue-7838cd.netlify.app";

export const SITE_NAME = "Longyu";
export const SITE_NAME_HANZI = "龙语";
export const DEFAULT_TITLE = "Longyu — aprenda mandarim pela lógica";
export const DEFAULT_DESCRIPTION =
  "Longyu (龙语) — aprenda mandarim pela lógica: som primeiro, fala em blocos, caracteres em camadas, leitura guiada.";
export const DEFAULT_OG_IMAGE = "/og-image.png";
export const TWITTER_HANDLE = "@longyuapp";

export type SeoRobots = "index,follow" | "noindex,nofollow";

export type SeoPage = {
  path: string;
  title: string;
  description: string;
  /** Conteúdo estático para crawlers (prerender / noscript). */
  crawlerText: string;
  robots?: SeoRobots;
  /** Incluir no sitemap.xml (default: true se indexável). */
  sitemap?: boolean;
};

/** Páginas públicas indexáveis com título/descrição próprios. */
export const PUBLIC_SEO_PAGES: SeoPage[] = [
  {
    path: "/",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    crawlerText:
      "Longyu (龙语) é um app para brasileiros aprenderem mandarim pela lógica: som e tons primeiro, fala em blocos, hànzì em camadas e revisão espaçada. Comece grátis.",
  },
  {
    path: "/aprender-mandarim",
    title: "Aprender mandarim online — Longyu",
    description:
      "Aprenda mandarim online com lições curtas para brasileiros: pinyin, tons, frases reais e caracteres chineses em camadas. Grátis para começar.",
    crawlerText:
      "Guia para aprender mandarim online com o Longyu. Método em etapas: escuta e tons, fala em blocos, hànzì progressivo e revisão do que você erra.",
  },
  {
    path: "/curso-de-mandarim-online",
    title: "Curso de mandarim online — Longyu",
    description:
      "Curso de mandarim online em português: trilha guiada, conversas com ramificações, produção de respostas e revisão espaçada. Sem decorar listas soltas.",
    crawlerText:
      "O Longyu funciona como um curso de mandarim online: unidades progressivas, exercícios de escuta, fala, leitura e recuperação de erros.",
  },
  {
    path: "/tons-do-mandarim",
    title: "Tons do mandarim: como treinar — Longyu",
    description:
      "Entenda os quatro tons do mandarim (e o tom neutro) e treine a orelha com exercícios curtos. No Longyu, som vem antes da memorização cega.",
    crawlerText:
      "Os tons mudam o significado das sílabas em mandarim. O Longyu treina discriminação auditiva e produção antes de cobrar escrita.",
  },
  {
    path: "/aprender-pinyin",
    title: "Aprender pinyin — Longyu",
    description:
      "Aprenda pinyin com foco em som e leitura: sílabas, combinações e ligação com o que você ouve. Base sólida antes dos caracteres.",
    crawlerText:
      "Pinyin é o sistema de romanização do mandarim. No Longyu você aprende a ler e ouvir sílabas com precisão, conectando pinyin ao tom e ao significado.",
  },
  {
    path: "/aprender-hanzi",
    title: "Aprender hànzì (caracteres chineses) — Longyu",
    description:
      "Aprenda hànzì em camadas: radicais, componentes e montagem passo a passo. Menos cópia mecânica, mais reconhecimento e construção.",
    crawlerText:
      "Caracteres chineses (hànzì) no Longyu entram em camadas: forma, sentido e pistas sonoras, com prática de montagem e leitura gradual.",
  },
  {
    path: "/mandarim-para-brasileiros",
    title: "Mandarim para brasileiros — Longyu",
    description:
      "Mandarim pensado para falantes de português do Brasil: explicações em PT-BR, contraste de sons e exemplos do dia a dia. Sem depender só de inglês.",
    crawlerText:
      "O Longyu foi feito para brasileiros: interface e pedagogia em português, com atenção a sons e estruturas que o PT-BR não prepara sozinho.",
  },
  {
    path: "/como-funciona",
    title: "Como funciona o Longyu",
    description:
      "Veja como o Longyu organiza o aprendizado: lições curtas, conversas, revisão espaçada e trilha do som ao hànzì. Ideal para estudar um pouco todo dia.",
    crawlerText:
      "Como funciona: escolha uma lição na jornada, pratique escuta e fala, monte frases, revise erros e avance por unidades com checkpoints.",
  },
  {
    path: "/metodo-longyu",
    title: "Método Longyu — mandarim pela lógica",
    description:
      "O método Longyu evita flashcards soltos: som e tons, palavras em blocos, frases contextualizadas, conversas, produção e retomada no SRS.",
    crawlerText:
      "Método Longyu: estrutura pedagógica com profundidade validada — som, blocos, contexto, conversação, produção, revisão espaçada e hànzì em camadas.",
  },
  {
    path: "/business",
    title: "Treinamento de Mandarim para Empresas | Longyu",
    description:
      "Treinamento de mandarim para equipes e empresas que operam Brasil–China. Longyu Business e Enterprise: programa corporativo, sem checkout individual.",
    crawlerText:
      "Longyu for Business é a linha corporativa: mandarim para colaboradores, acompanhamento de progresso e conversa comercial. Enterprise cobre grandes equipes e implantação personalizada. Sem logotipos de clientes nesta página.",
  },
  {
    path: "/privacidade",
    title: "Privacidade — Longyu",
    description: "Política de privacidade e consentimento do Longyu (龙语).",
    crawlerText: "Informações sobre privacidade, dados locais e conta na nuvem no Longyu.",
  },
  {
    path: "/sobre",
    title: "Sobre o Longyu",
    description:
      "Sobre o Longyu (龙语): app em beta para aprender mandarim pela lógica, feito para brasileiros.",
    crawlerText:
      "Longyu é um aplicativo educacional em beta pública para aprender mandarim. Conteúdo e recursos evoluem com o feedback dos alunos.",
  },
];

const PUBLIC_PATH_SET = new Set(PUBLIC_SEO_PAGES.map((p) => p.path));

/** Prefixos de rotas internas / auth — sempre noindex. */
const NOINDEX_PREFIXES = [
  "/jornada",
  "/treino",
  "/praticar",
  "/missoes",
  "/loja",
  "/som",
  "/pinyin",
  "/hanzi",
  "/ideogramas",
  "/fala",
  "/leitura",
  "/revisao",
  "/biblioteca",
  "/imersao",
  "/ligas",
  "/amigos",
  "/convide",
  "/conquistas",
  "/pro",
  "/plano",
  "/login",
  "/esqueci-senha",
  "/redefinir-senha",
  "/confirmar-email",
  "/comecar",
  "/perfil",
  "/conta",
  "/dados-locais",
  "/config",
  "/ajustes",
  "/mais",
  "/admin",
  "/licao",
  "/teste",
  "/convite",
] as const;

export function getSiteUrl(): string {
  const fromEnv =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL
      ? String(import.meta.env.VITE_SITE_URL).trim()
      : "";
  const raw = fromEnv || DEFAULT_SITE_URL;
  return raw.replace(/\/$/, "");
}

export function absoluteUrl(pathOrUrl: string, siteUrl = getSiteUrl()): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteUrl}${path === "/" ? "/" : path}`;
}

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const cleaned = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return cleaned || "/";
}

export function findPublicSeoPage(pathname: string): SeoPage | undefined {
  const path = normalizePath(pathname);
  return PUBLIC_SEO_PAGES.find((p) => p.path === path);
}

export function isIndexablePath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (PUBLIC_PATH_SET.has(path)) return true;
  return false;
}

export function robotsForPath(pathname: string): SeoRobots {
  if (isIndexablePath(pathname)) return "index,follow";
  const path = normalizePath(pathname);
  if (NOINDEX_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return "noindex,nofollow";
  }
  // Rotas desconhecidas: não indexar por padrão (SPA).
  return "noindex,nofollow";
}

export function resolveSeo(pathname: string): {
  title: string;
  description: string;
  canonical: string;
  robots: SeoRobots;
  ogImage: string;
  page?: SeoPage;
} {
  const path = normalizePath(pathname);
  const page = findPublicSeoPage(path);
  const robots = page?.robots ?? robotsForPath(path);
  return {
    title: page?.title ?? DEFAULT_TITLE,
    description: page?.description ?? DEFAULT_DESCRIPTION,
    canonical: absoluteUrl(page?.path ?? (robots === "index,follow" ? path : "/")),
    robots,
    ogImage: absoluteUrl(DEFAULT_OG_IMAGE),
    page,
  };
}

export function buildJsonLd(siteUrl = getSiteUrl()): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: SITE_NAME,
        alternateName: [SITE_NAME_HANZI, "Longyu Mandarim"],
        description: DEFAULT_DESCRIPTION,
        inLanguage: "pt-BR",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        logo: absoluteUrl("/logo.png", siteUrl),
        description: DEFAULT_DESCRIPTION,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#app`,
        name: `${SITE_NAME} (${SITE_NAME_HANZI})`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        inLanguage: "pt-BR",
        url: siteUrl,
        description: DEFAULT_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "BRL",
          description: "Começar grátis; planos Pro opcionais.",
        },
        educationalUse: "language learning",
        learningResourceType: "interactive lesson",
        audience: {
          "@type": "EducationalAudience",
          educationalRole: "student",
          geographicArea: "Brazil",
        },
      },
    ],
  };
}

/** Paths públicos para sitemap (sem query). */
export function sitemapPaths(): string[] {
  return PUBLIC_SEO_PAGES.filter((p) => p.sitemap !== false && (p.robots ?? "index,follow").startsWith("index")).map(
    (p) => p.path
  );
}
