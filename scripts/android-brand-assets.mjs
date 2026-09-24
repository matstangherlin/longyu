/**
 * RC2.2.10 — deriva os ícones e a splash do Android da identidade EXISTENTE.
 *
 * Fonte canônica: public/logo.png (a mesma marca do PWA/manifest). Nada de
 * branding novo: só redimensiona, recorta em círculo (round) e centraliza no
 * safe zone do adaptive icon. Reprodutível — rode de novo se o logo mudar:
 *
 *   node scripts/android-brand-assets.mjs
 *
 * NÃO gera: ícone monocromático (Android 13 themed icon) nem assets de loja
 * (512px Play icon, feature graphic). Não existe glifo monocromático canônico;
 * derivar um por threshold seria inventar arte. Reportado como
 * ANDROID_BRAND_ASSET_REQUIRED em docs/reports/rc2-2-10-android-native-foundation.md.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const res = path.join(root, "android", "app", "src", "main", "res");
const SOURCE = path.join(root, "public", "logo.png");
// A splash e o adaptive background usam a cor do PRÓPRIO fundo do logo
// (amostrada no canto) para não aparecer um "quadrado" de outro tom.
async function sampleBackground() {
  const { data, info } = await sharp(SOURCE).raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => (y * info.width + x) * info.channels;
  const corners = [at(2, 2), at(info.width - 3, 2), at(2, info.height - 3), at(info.width - 3, info.height - 3)];
  const avg = (k) => Math.round(corners.reduce((sum, i) => sum + data[i + k], 0) / corners.length);
  return { r: avg(0), g: avg(1), b: avg(2), alpha: 1 };
}
const BACKGROUND = await sampleBackground();
const BACKGROUND_HEX = `#${[BACKGROUND.r, BACKGROUND.g, BACKGROUND.b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

async function logoAt(size) {
  return sharp(SOURCE).resize(size, size, { fit: "contain", background: BACKGROUND }).flatten({ background: BACKGROUND }).png().toBuffer();
}

async function writePng(file, buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buffer);
}

async function launcher(density, scale) {
  const dir = path.join(res, `mipmap-${density}`);
  const legacy = Math.round(48 * scale);
  await writePng(path.join(dir, "ic_launcher.png"), await logoAt(legacy));

  const circle = Buffer.from(
    `<svg width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}" fill="#fff"/></svg>`
  );
  const round = await sharp(await logoAt(legacy)).composite([{ input: circle, blend: "dest-in" }]).png().toBuffer();
  await writePng(path.join(dir, "ic_launcher_round.png"), round);

  // Adaptive icon: canvas de 108dp; o logo inteiro ocupa 72dp e a marca
  // (≈70% do arquivo) fica dentro do safe zone circular de 66dp.
  const canvas = Math.round(108 * scale);
  const inner = Math.round(72 * scale);
  const offset = Math.round((canvas - inner) / 2);
  const foreground = await sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await logoAt(inner), left: offset, top: offset }])
    .png()
    .toBuffer();
  await writePng(path.join(dir, "ic_launcher_foreground.png"), foreground);
}

const SPLASH = {
  drawable: [480, 320],
  "drawable-land-mdpi": [480, 320],
  "drawable-land-hdpi": [800, 480],
  "drawable-land-xhdpi": [1280, 720],
  "drawable-land-xxhdpi": [1600, 960],
  "drawable-land-xxxhdpi": [1920, 1280],
  "drawable-port-mdpi": [320, 480],
  "drawable-port-hdpi": [480, 800],
  "drawable-port-xhdpi": [720, 1280],
  "drawable-port-xxhdpi": [960, 1600],
  "drawable-port-xxxhdpi": [1280, 1920],
};

async function splash(dir, width, height) {
  const mark = Math.round(Math.min(width, height) * 0.45);
  const buffer = await sharp({ create: { width, height, channels: 4, background: BACKGROUND } })
    .composite([{ input: await logoAt(mark), left: Math.round((width - mark) / 2), top: Math.round((height - mark) / 2) }])
    .flatten({ background: BACKGROUND })
    .png()
    .toBuffer();
  await writePng(path.join(res, dir, "splash.png"), buffer);
}

for (const [density, scale] of Object.entries(DENSITIES)) await launcher(density, scale);
for (const [dir, [width, height]] of Object.entries(SPLASH)) await splash(dir, width, height);

// Os drawables vetoriais do template Capacitor (logo Capacitor + grade verde)
// não são referenciados pelo adaptive icon do Longyu (que usa a cor
// @color/ic_launcher_background e o PNG de foreground acima).
for (const stale of ["drawable-v24/ic_launcher_foreground.xml", "drawable/ic_launcher_background.xml"]) {
  fs.rmSync(path.join(res, stale), { force: true });
}
fs.rmSync(path.join(res, "drawable-v24"), { recursive: true, force: true });

fs.writeFileSync(
  path.join(res, "values", "ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <!-- Amostrado de public/logo.png por scripts/android-brand-assets.mjs -->\n    <color name="ic_launcher_background">${BACKGROUND_HEX}</color>\n</resources>\n`
);

console.log(`android-brand-assets: fundo ${BACKGROUND_HEX} · launcher/round/adaptive/splash derivados de public/logo.png`);
