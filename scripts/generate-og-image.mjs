import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "public", "og-image.png");
const mascotPath = path.join(root, "public", "longyu-mascot-512.png");

const WIDTH = 1200;
const HEIGHT = 630;

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFF8F5"/>
      <stop offset="45%" stop-color="#F7F6F3"/>
      <stop offset="100%" stop-color="#F0E4DF"/>
    </linearGradient>
    <radialGradient id="glow" cx="18%" cy="30%" r="45%">
      <stop offset="0%" stop-color="#B9412E" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#B9412E" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <text x="72" y="168" font-family="Georgia, 'Noto Serif SC', serif" font-size="72" font-weight="700" fill="#B9412E">Longyu</text>
  <text x="72" y="248" font-family="Georgia, serif" font-size="44" font-weight="600" fill="#2F3437">Aprenda mandarim</text>
  <text x="72" y="308" font-family="Georgia, serif" font-size="44" font-weight="600" fill="#2F3437">pela lógica</text>
  <text x="72" y="380" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#5A6468">Som · tons · blocos · hànzì em camadas</text>
  <text x="72" y="540" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#8C9194">龙语 · para brasileiros</text>
  <text x="980" y="120" font-family="'Noto Serif SC', Georgia, serif" font-size="120" fill="#B9412E" fill-opacity="0.12">龙</text>
</svg>
`;

async function main() {
  const base = sharp(Buffer.from(svg)).png();
  let composed = base;

  if (fs.existsSync(mascotPath)) {
    const mascot = await sharp(mascotPath)
      .resize(340, 340, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    composed = sharp(await base.toBuffer()).composite([
      { input: mascot, left: 780, top: 160 },
    ]);
  }

  await composed.png().toFile(outPath);
  const stat = fs.statSync(outPath);
  console.log(`Wrote ${outPath} (${Math.round(stat.size / 1024)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
