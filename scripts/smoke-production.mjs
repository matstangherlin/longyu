/** Smoke rápido do deploy publicado (landing + bundle fresco + Supabase embutido). */

const PRODUCTION_URL = process.env.LONGYU_PRODUCTION_URL
  ?? "https://singular-meringue-7838cd.netlify.app";

const errors = [];

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

console.log(`== smoke:production (${PRODUCTION_URL}) ==`);

try {
  const html = await fetchText(PRODUCTION_URL);
  const bundleMatch = html.match(/assets\/index-[^"]+\.js/);
  if (!bundleMatch) errors.push("bundle JS não encontrado no HTML");

  const bundle = bundleMatch
    ? await fetchText(`${PRODUCTION_URL}/${bundleMatch[0]}`)
    : "";

  const landingOk = /Aprenda mandarim/i.test(html) || /Aprenda mandarim/i.test(bundle);
  if (!landingOk) errors.push("landing pública sem heading esperado");

  const ctaOk = /Começar agora/i.test(html) || /Começar agora/i.test(bundle);
  if (!ctaOk) errors.push("CTA Começar agora ausente");

  if (bundle) {
    if (!bundle.includes("recompensas recebidas")) errors.push("bundle sem string de fim de lição compacto");
    if (!bundle.includes("drjcfalvlbbeblmmyhwj")) errors.push("bundle sem host Supabase de produção");
    if (bundle.includes("Pro Preview")) errors.push("bundle ainda expõe Pro Preview");
  }

  // SEO mínimo no deploy publicado
  const robots = await fetchText(`${PRODUCTION_URL}/robots.txt`);
  if (/<!doctype html>/i.test(robots) || /<html[\s>]/i.test(robots)) {
    errors.push(
      "robots.txt servindo HTML da SPA — deploy de produção desatualizado (SEO da main ainda não publicado no Netlify)"
    );
  } else {
    if (!/Sitemap:/i.test(robots)) errors.push("robots.txt sem Sitemap");
    if (!/Disallow:\s*\/jornada/.test(robots)) errors.push("robots.txt sem Disallow /jornada");
  }

  const sitemapRes = await fetch(`${PRODUCTION_URL}/sitemap.xml`, { redirect: "follow" });
  const sitemapType = sitemapRes.headers.get("content-type") || "";
  if (!sitemapRes.ok) errors.push(`sitemap.xml HTTP ${sitemapRes.status}`);
  else if (/text\/html/i.test(sitemapType)) {
    errors.push("sitemap.xml servindo HTML da SPA — deploy Netlify desatualizado");
  } else {
    const xml = await sitemapRes.text();
    if (!xml.includes("<urlset") || !xml.includes("aprender-mandarim")) {
      errors.push("sitemap.xml incompleto");
    }
    if (xml.includes("longyu.netlify.app")) {
      errors.push("sitemap.xml ainda aponta para longyu.netlify.app (404)");
    }
  }

  const og = await fetch(`${PRODUCTION_URL}/og-image.png`, { redirect: "follow" });
  const ogType = og.headers.get("content-type") || "";
  if (!og.ok) errors.push(`og-image.png HTTP ${og.status}`);
  else if (/text\/html/i.test(ogType)) {
    errors.push("og-image.png servindo HTML da SPA — deploy Netlify desatualizado");
  }

  if (/longyu\.netlify\.app/.test(html) && !/singular-meringue-7838cd\.netlify\.app/.test(html)) {
    errors.push("HTML canônico aponta só para longyu.netlify.app (domínio morto)");
  }
} catch (error) {
  errors.push(error instanceof Error ? error.message : "falha ao buscar deploy");
}

if (errors.length > 0) {
  console.error("ERRO: smoke:production falhou:");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("OK: smoke:production passou.");
