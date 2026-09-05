#!/usr/bin/env node
/**
 * Gera `e2e/fixtures/lesson-media-probe.webm`.
 *
 * Por que existe um binário no repositório: sem um vídeo que decodifica de
 * verdade, todo teste do player vira teatro. Dá para simular o elemento
 * `<video>`, mas então o teste prova que o mock funciona — não que o aluno
 * consegue assistir a aula. Duração, `timeupdate`, seek e a união de trechos
 * assistidos só existem quando há um arquivo real sendo decodificado.
 *
 * O fixture NÃO é conteúdo pedagógico e não vira aula: são 12 segundos de
 * cor sólida mudando, 320x180, ~7 KB. Nenhuma aula gravada foi inventada
 * para fazer o teste passar.
 *
 * A geração usa o que já vem instalado com o Playwright (o ffmpeg do próprio
 * pacote, com libvpx) e o `sharp` que já é dependência de build, para que
 * regenerar não exija nada de novo na máquina de ninguém. VP8/WebM porque é o
 * único codec que o ffmpeg embutido sabe escrever — e Chromium e Firefox
 * decodificam nativamente.
 *
 * Uso: node scripts/make-lesson-media-fixture.mjs
 */
import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const WIDTH = 320;
const HEIGHT = 180;
const FPS = 10;
const SECONDS = 12;
const OUTPUT = path.join(process.cwd(), "e2e/fixtures/lesson-media-probe.webm");
const FFMPEG_CANDIDATES = [
  process.env.FFMPEG_PATH,
  "/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux",
].filter(Boolean);

async function findFfmpeg() {
  for (const candidate of FFMPEG_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Próximo candidato.
    }
  }
  throw new Error(
    `ffmpeg não encontrado. Defina FFMPEG_PATH ou instale os browsers do Playwright. Tentados: ${FFMPEG_CANDIDATES.join(", ")}`
  );
}

const ffmpeg = await findFfmpeg();
await mkdir(path.dirname(OUTPUT), { recursive: true });

// Cada quadro é um JPEG sólido; a cor caminha ao longo do tempo para que um
// seek visível no vídeo corresponda a um quadro diferente.
const frames = [];
for (let frame = 0; frame < FPS * SECONDS; frame += 1) {
  const progress = frame / (FPS * SECONDS);
  frames.push(
    await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 3,
        background: {
          r: Math.round(30 + progress * 200),
          g: Math.round(90 + Math.sin(progress * Math.PI) * 120),
          b: Math.round(220 - progress * 180),
        },
      },
    })
      .jpeg({ quality: 70 })
      .toBuffer()
  );
}

const child = spawn(ffmpeg, [
  "-y",
  "-f", "image2pipe",
  "-vcodec", "mjpeg",
  "-framerate", String(FPS),
  "-i", "pipe:0",
  "-c:v", "libvpx",
  "-b:v", "120k",
  "-pix_fmt", "yuv420p",
  "-g", String(FPS),
  "-f", "webm",
  OUTPUT,
]);

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});
child.stdin.on("error", () => {
  // O código de saída abaixo é o que importa.
});

for (const frame of frames) child.stdin.write(frame);
child.stdin.end();

const code = await new Promise((resolve) => child.on("close", resolve));
if (code !== 0) {
  console.error(stderr.slice(-2000));
  process.exit(1);
}
console.log(`OK ${OUTPUT} — ${SECONDS}s, ${WIDTH}x${HEIGHT}, VP8/WebM`);
