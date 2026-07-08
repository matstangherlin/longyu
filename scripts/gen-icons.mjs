// Gera favicons/ícones a partir de public/logo.png, recortando a borda branca.
import sharp from "sharp";

const SRC = "public/logo.png";

async function trimmed() {
  try {
    return await sharp(SRC)
      .trim({ background: "#ffffff", threshold: 20 })
      .toBuffer();
  } catch {
    return await sharp(SRC).toBuffer();
  }
}

const run = async () => {
  const base = await trimmed();

  // Favicons transparentes (borda recortada, sem padding).
  for (const size of [16, 32, 48]) {
    await sharp(base)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(`public/favicon-${size}.png`);
  }

  // Apple touch icon: fundo branco com leve padding.
  await sharp(base)
    .resize(160, 160, { fit: "contain", background: "#ffffff" })
    .extend({ top: 10, bottom: 10, left: 10, right: 10, background: "#ffffff" })
    .png()
    .toFile("public/apple-touch-icon.png");

  // Maskable PWA 512: fundo branco com padding (safe zone).
  await sharp(base)
    .resize(380, 380, { fit: "contain", background: "#ffffff" })
    .extend({ top: 66, bottom: 66, left: 66, right: 66, background: "#ffffff" })
    .png()
    .toFile("public/maskable-512.png");

  console.log("ícones gerados em public/");
};

run();
