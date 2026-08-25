/**
 * Pós-build: gera HTML por rota pública com meta tags específicas
 * e conteúdo estático para crawlers (SPA-friendly prerender leve).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const siteUrl = (process.env.VITE_SITE_URL || "https://singular-meringue-7838cd.netlify.app").replace(/\/$/, "");

/** Espelha PUBLIC_SEO_PAGES de src/lib/seo.ts (Node sem TS). */
const PAGES = [
  {
    path: "/",
    title: "Longyu — aprenda mandarim pela lógica",
    description:
      "Longyu (龙语) — aprenda mandarim pela lógica: som primeiro, fala em blocos, caracteres em camadas, leitura guiada.",
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

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absolute(pathOrRoot) {
  if (pathOrRoot === "/") return `${siteUrl}/`;
  return `${siteUrl}${pathOrRoot}`;
}

function patchHtml(html, page) {
  const url = absolute(page.path);
  const image = `${siteUrl}/og-image.png`;
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const crawler = escapeHtml(page.crawlerText);

  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${description}" />`
  );
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${url}" />`
  );
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${title}" />`
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${description}" />`
  );
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${url}" />`
  );
  out = out.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${image}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${title}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${description}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${image}" />`
  );

  // Conteúdo estático para crawlers que leem o HTML sem JS.
  // aria-hidden evita conflito com o H1 real da SPA na árvore de acessibilidade.
  const seoBlock = `<div id="seo-static" data-seo-path="${escapeHtml(page.path)}" aria-hidden="true" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0"><h1>${title}</h1><p>${crawler}</p><p>${description}</p></div>`;
  if (out.includes('id="root"')) {
    out = out.replace(/<div id="root"><\/div>/, `${seoBlock}<div id="root"></div>`);
  }

  return out;
}

function writeSitemap() {
  const urls = PAGES.map((page) => {
    const loc = absolute(page.path);
    const priority = page.path === "/" ? "1.0" : "0.8";
    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(path.join(distDir, "sitemap.xml"), xml, "utf8");
}

function main() {
  const indexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error("seo-prerender: dist/index.html não encontrado. Rode o build antes.");
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexPath, "utf8");

  for (const page of PAGES) {
    const html = patchHtml(baseHtml, page);
    if (page.path === "/") {
      fs.writeFileSync(indexPath, html, "utf8");
      continue;
    }
    const dir = path.join(distDir, page.path.replace(/^\//, ""));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
  }

  writeSitemap();
  console.log(`seo-prerender: ${PAGES.length} páginas + sitemap.xml → ${distDir}`);
}

main();
