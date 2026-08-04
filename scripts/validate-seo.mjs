/**
 * Portão SEO: robots, sitemap, meta no index, og-image, rotas públicas.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed += 1;
}

function mustExist(rel) {
  const full = path.join(root, rel);
  if (fs.existsSync(full)) ok(rel);
  else fail(`faltando ${rel}`);
  return full;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("validate:seo");

mustExist("public/robots.txt");
mustExist("public/sitemap.xml");
mustExist("public/og-image.png");
mustExist("src/lib/seo.ts");
mustExist("src/components/seo/SeoHead.tsx");
mustExist("scripts/seo-prerender.mjs");

const robots = read("public/robots.txt");
if (robots.includes("Sitemap:")) ok("robots.txt tem Sitemap");
else fail("robots.txt sem Sitemap");
if (robots.includes("singular-meringue-7838cd.netlify.app")) ok("robots.txt usa domínio vivo");
else fail("robots.txt sem domínio de produção vivo");
if (robots.includes("longyu.netlify.app")) fail("robots.txt ainda aponta para longyu.netlify.app (404)");
if (robots.includes("Disallow: /jornada") && robots.includes("Disallow: /conta")) {
  ok("robots.txt bloqueia rotas privadas");
} else fail("robots.txt incompleto nas rotas privadas");

const indexHtml = read("index.html");
if (indexHtml.includes("singular-meringue-7838cd.netlify.app")) ok("index.html usa domínio vivo");
else fail("index.html sem domínio de produção vivo");
if (indexHtml.includes("longyu.netlify.app")) fail("index.html ainda aponta para longyu.netlify.app (404)");
for (const needle of [
  'property="og:title"',
  'property="og:image"',
  'name="twitter:card"',
  'rel="canonical"',
  "application/ld+json",
  "EducationalApplication",
]) {
  if (indexHtml.includes(needle)) ok(`index.html: ${needle}`);
  else fail(`index.html sem ${needle}`);
}

const seoTs = read("src/lib/seo.ts");
const requiredPaths = [
  "/aprender-mandarim",
  "/curso-de-mandarim-online",
  "/tons-do-mandarim",
  "/aprender-pinyin",
  "/aprender-hanzi",
  "/mandarim-para-brasileiros",
  "/como-funciona",
  "/metodo-longyu",
];
for (const p of requiredPaths) {
  if (seoTs.includes(`path: "${p}"`)) ok(`seo.ts: ${p}`);
  else fail(`seo.ts sem ${p}`);
}

const routes = read("src/routes.tsx");
for (const p of requiredPaths) {
  if (routes.includes(`path: "${p}"`)) ok(`routes: ${p}`);
  else fail(`routes sem ${p}`);
}

const mainTsx = read("src/main.tsx");
if (mainTsx.includes("SeoHead")) ok("main.tsx monta SeoHead");
else fail("main.tsx sem SeoHead");

const pkg = JSON.parse(read("package.json"));
if (pkg.scripts?.["validate:seo"]) ok("package.json validate:seo");
else fail("package.json sem validate:seo");
const viteBuild = read("scripts/vite-build.mjs");
if (viteBuild.includes("seo-prerender")) ok("vite-build chama seo-prerender");
else fail("vite-build não chama seo-prerender");

const og = path.join(root, "public", "og-image.png");
if (fs.existsSync(og)) {
  const { size } = fs.statSync(og);
  if (size > 10_000) ok(`og-image.png ${Math.round(size / 1024)} KB`);
  else fail("og-image.png parece pequeno demais");
}

if (failed > 0) {
  console.error(`\nvalidate:seo falhou (${failed})`);
  process.exit(1);
}
console.log("\nvalidate:seo ok");
