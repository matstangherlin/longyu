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
} catch (error) {
  errors.push(error instanceof Error ? error.message : "falha ao buscar deploy");
}

if (errors.length > 0) {
  console.error("ERRO: smoke:production falhou:");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("OK: smoke:production passou.");
