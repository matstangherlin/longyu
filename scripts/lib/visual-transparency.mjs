/**
 * V4.9.5A.1 — contrato de transparência dos assets visuais.
 *
 * `backgroundStyle: "transparent"` promete que fora do sujeito o canvas é
 * realmente vazio. Os SVGs traçados por VTracer trazem o fundo da ilustração
 * original desenhado como caminho: uma placa clara que aparece como retângulo
 * em cima de qualquer superfície escura.
 *
 * Aqui mora a definição usada tanto pelo validador quanto pela correção dos
 * arquivos, para as duas nunca discordarem sobre o que é fundo.
 */

/**
 * Verde-acinzentado claro do fundo traçado: claro, pouco saturado e nunca mais
 * quente que verde — o creme das nuvens e da louça tem vermelho dominante e
 * fica de fora. Só isto define "cor de fundo"; o que sai de fato ainda passa
 * pelo teste de silhueta.
 */
export function isBackgroundFamily(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return Math.min(r, g, b) >= 0xc0 && Math.max(r, g, b) - Math.min(r, g, b) <= 0x24 && g >= r;
}

function parseHex(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((part) => parseInt(part, 16));
}

/**
 * Tolerância maior, usada SÓ para a placa de canvas — que a geometria já
 * identificou. O céu pinta chão e sol com o mesmo verde-oliva: a faixa de
 * largura inteira encostada na borda é fundo, o círculo do sol não é, e é a
 * forma que separa os dois, não a cor.
 */
export function isPlateFill(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return Math.min(r, g, b) >= 0xa8 && Math.max(r, g, b) - Math.min(r, g, b) <= 0x40 && g >= r;
}

function viewBoxOf(svg) {
  const raw = svg.match(/viewBox="([\d.\s-]+)"/)?.[1];
  const parts = raw ? raw.trim().split(/\s+/).map(Number) : [];
  if (parts.length === 4 && parts.every(Number.isFinite)) return parts;
  const width = Number(svg.match(/width="(\d+)"/)?.[1] ?? 600);
  const height = Number(svg.match(/height="(\d+)"/)?.[1] ?? 600);
  return [0, 0, width, height];
}

/** Caixa aproximada de um <path>: os números do `d` já vêm em pares de coordenadas. */
function pathBox(tag) {
  const d = tag.match(/d="([^"]*)"/)?.[1] ?? "";
  const numbers = (d.match(/-?\d+\.?\d*/g) ?? []).map(Number);
  if (numbers.length < 4) return null;
  const translate = tag.match(/transform="translate\(([-\d.]+)[ ,]+([-\d.]+)\)"/);
  const tx = translate ? Number(translate[1]) : 0;
  const ty = translate ? Number(translate[2]) : 0;
  const xs = numbers.filter((_, index) => index % 2 === 0).map((v) => v + tx);
  const ys = numbers.filter((_, index) => index % 2 === 1).map((v) => v + ty);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** Caixa de um <rect>, inclusive quando vem em porcentagem do viewBox. */
function rectBox(tag, [vx, vy, vw, vh]) {
  const value = (name, span, fallback) => {
    const raw = tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
    if (raw == null) return fallback;
    return raw.trim().endsWith("%") ? (Number.parseFloat(raw) / 100) * span : Number.parseFloat(raw);
  };
  const x = value("x", vw, vx);
  const y = value("y", vh, vy);
  const width = value("width", vw, 0);
  const height = value("height", vh, 0);
  if (![x, y, width, height].every(Number.isFinite)) return null;
  return { x0: x, y0: y, x1: x + width, y1: y + height };
}

export function svgShapes(svg) {
  const viewBox = viewBoxOf(svg);
  const shapes = [];
  for (const tag of svg.match(/<(?:path|rect|polygon)\b[^>]*>/g) ?? []) {
    const fill = tag.match(/fill="([^"]*)"/)?.[1] ?? "none";
    if (fill === "none" || fill === "transparent") continue;
    if (/fill-opacity="0?(?:\.0+)?"/.test(tag)) continue;
    const box = tag.startsWith("<rect") ? rectBox(tag, viewBox) : pathBox(tag);
    if (box) shapes.push({ tag, fill, box });
  }
  return shapes;
}

/**
 * Placa de canvas: pinta a largura inteira encostando em uma borda.
 * É o caso que o olho vê como "retângulo da imagem" e o único que o gate
 * reprova sozinho — o resto do fundo residual é medido no raster.
 */
export function findCanvasPlates(svg) {
  const [vx, vy, vw, vh] = viewBoxOf(svg);
  return svgShapes(svg).filter(({ fill, box }) => {
    const spansWidth = box.x1 - box.x0 >= vw * 0.95 && box.x0 <= vx + vw * 0.02;
    const spansHeight = box.y1 - box.y0 >= vh * 0.95 && box.y0 <= vy + vh * 0.02;
    // Cobrir o canvas inteiro é fundo em qualquer cor — nenhum desenho precisa
    // de uma forma opaca do tamanho da tela atrás de si.
    if (spansWidth && spansHeight) return true;
    const touchesBottom = box.y1 >= vy + vh * 0.99;
    const touchesTop = box.y0 <= vy + vh * 0.01;
    // Faixa encostada na borda só conta como placa se for clara: uma montanha
    // escura pode legitimamente ocupar a largura toda.
    return spansWidth && (touchesTop || touchesBottom) && isPlateFill(fill);
  });
}

export function removeShapes(svg, shapes) {
  let out = svg;
  for (const shape of shapes) out = out.replace(shape.tag, "");
  return out.replace(/\n{3,}/g, "\n\n");
}

/** Pixels opacos que NÃO são da família do fundo — a silhueta do sujeito. */
export async function subjectMask(sharp, svg, size = 200) {
  const { data, info } = await sharp(Buffer.from(svg), { density: 150 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let subject = 0;
  let background = 0;
  const mask = new Uint8Array(info.width * info.height);
  for (let i = 0; i < info.width * info.height; i += 1) {
    const alpha = data[i * channels + 3];
    if (alpha < 128) continue;
    const hex = `#${[0, 1, 2].map((c) => data[i * channels + c].toString(16).padStart(2, "0")).join("")}`;
    if (isBackgroundFamily(hex)) {
      background += 1;
    } else {
      subject += 1;
      mask[i] = 1;
    }
  }
  return { mask, subject, background, pixels: info.width * info.height };
}

function maskDelta(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff += 1;
  return diff / a.length;
}

/**
 * Remove o fundo preservando o desenho: um caminho só sai quando tirá-lo não
 * muda a silhueta do sujeito. Um brilho ou uma mancha clara que pertence ao
 * objeto revela a cor de baixo ao ser removida — a silhueta muda e o caminho
 * fica. O fundo, ao sair, só revela transparência.
 */
export async function stripBackground(sharp, svg, { tolerance = 0.004 } = {}) {
  // A placa de canvas sai pela forma: largura inteira encostada na borda não é
  // desenho, é o retângulo que o dark mode denuncia.
  const plates = findCanvasPlates(svg);
  let current = removeShapes(svg, plates);
  const removed = plates.map((plate) => ({ fill: plate.fill, reason: "canvas-plate" }));
  const kept = [];
  // O resto do fundo é mais delicado: tirar fundo revela transparência, mas
  // tirar um brilho do objeto revela a cor de baixo. Só sai o que não mexe na
  // silhueta do sujeito.
  const base = await subjectMask(sharp, current);
  for (const shape of svgShapes(current)) {
    if (!isBackgroundFamily(shape.fill)) continue;
    const candidate = removeShapes(current, [shape]);
    const next = await subjectMask(sharp, candidate);
    if (maskDelta(base.mask, next.mask) > tolerance) {
      kept.push({ fill: shape.fill, reason: "background-region", box: shape.box });
      continue;
    }
    current = candidate;
    removed.push({ fill: shape.fill, reason: "background-region" });
  }
  return { svg: current, removed, kept };
}

/**
 * RC1.3 · P10/P11 — resíduo de fundo que a placa de canvas não cobre.
 *
 * O QA real viu a árvore ainda com "pixels/área de fundo ao redor da base".
 * `findCanvasPlates` não pegava: aquilo não é uma placa full-bleed, são manchas
 * do chão traçadas pelo VTracer. E `stripBackground` também não: as manchas
 * ficam fora da família estrita do canvas (min < 0xC0), e os retalhos cor de
 * canvas PINTADOS POR CIMA do desenho eram preservados porque a métrica antiga
 * lia "revelou sujeito" como "mudou a silhueta" — quando é exatamente o
 * contrário: revelar o desenho é a prova de que aquilo era fundo.
 *
 * Duas classes, ambas medidas no raster (não no olho):
 *
 * - `canvas-over-drawing` — fill da família do canvas cuja remoção NÃO tira
 *   nenhum pixel opaco nem nenhum pixel de sujeito, e revela desenho embaixo.
 *   Era o halo claro em volta dos galhos.
 * - `ground-residue` — mancha clara e pouco saturada na margem INFERIOR,
 *   pequena, cuja remoção só apaga ela mesma. Era a grama/sombra solta na base.
 *
 * P10.4 continua valendo: sombra pode existir. O que não pode é canvas —
 * e canvas é claro, dessaturado e da cor do fundo original, não um tom do
 * próprio desenho.
 */
export function isGroundResidueFill(hex) {
  const rgb = parseHexPublic(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return Math.min(r, g, b) >= 0x8c && Math.max(r, g, b) - Math.min(r, g, b) <= 0x30;
}

/**
 * Tinta de CANVAS, não tinta de desenho.
 *
 * O fundo traçado deste pacote é um branco-esverdeado quase puro (#EAF0EA e
 * vizinhos): min de canal ≥ 0xE0. Isso separa, sem depender do olho, o halo de
 * fundo dos detalhes claros que pertencem à ilustração — o vidro esverdeado das
 * janelas da casa (#C6DCD2, min 0xC6) fica de fora e continua desenhado, como
 * tem de ficar. Foi essa distinção que faltou na primeira passada: sem ela,
 * "limpar o fundo" apagava as vidraças junto.
 */
export function isCanvasPaintFill(hex) {
  const rgb = parseHexPublic(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return Math.min(r, g, b) >= 0xe0 && Math.max(r, g, b) - Math.min(r, g, b) <= 0x24 && g >= r;
}

function parseHexPublic(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((part) => parseInt(part, 16));
}

const RESIDUE_RASTER_SIZE = 200;

async function residueMasks(sharp, svg) {
  const { data, info } = await sharp(Buffer.from(svg), { density: 160 })
    .resize(RESIDUE_RASTER_SIZE, RESIDUE_RASTER_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = new Uint8Array(RESIDUE_RASTER_SIZE * RESIDUE_RASTER_SIZE);
  const subject = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i += 1) {
    const offset = i * info.channels;
    if (data[offset + 3] < 128) continue;
    alpha[i] = 1;
    const hex = `#${[0, 1, 2].map((c) => data[offset + c].toString(16).padStart(2, "0")).join("")}`;
    if (!isBackgroundFamily(hex)) subject[i] = 1;
  }
  return { alpha, subject };
}

function viewBoxNumbers(svg) {
  const raw = svg.match(/viewBox="([\d.\s-]+)"/)?.[1];
  const parts = raw ? raw.trim().split(/\s+/).map(Number) : [];
  if (parts.length === 4 && parts.every(Number.isFinite)) return parts;
  return [0, 0, 600, 600];
}

/**
 * Limiares do gate. `subjectRevealRatio` separa o halo de canvas (décimos de
 * 1% do sujeito) de arte clara legítima que por acaso cobre desenho — uma
 * camisa branca, a cédula, o brilho da xícara — que fica na casa dos 2–10%.
 */
export const RESIDUE_LIMITS = {
  minRevealedPixels: 12,
  maxSubjectRevealRatio: 0.01,
  maxGroundBoxRatio: 0.05,
};

export async function findResidueShapes(sharp, svg) {
  const [vx, vy, vw, vh] = viewBoxNumbers(svg);
  const base = await residueMasks(sharp, svg);
  const subjectPixels = base.subject.reduce((total, value) => total + value, 0) || 1;
  const findings = [];
  for (const shape of svgShapes(svg)) {
    const without = await residueMasks(sharp, removeShapes(svg, [shape]));
    let alphaLost = 0;
    let subjectLost = 0;
    let subjectRevealed = 0;
    for (let i = 0; i < base.alpha.length; i += 1) {
      if (base.alpha[i] && !without.alpha[i]) alphaLost += 1;
      if (base.subject[i] && !without.subject[i]) subjectLost += 1;
      if (!base.subject[i] && without.subject[i]) subjectRevealed += 1;
    }
    const ratio = subjectRevealed / subjectPixels;
    if (
      isCanvasPaintFill(shape.fill) &&
      alphaLost === 0 &&
      subjectLost === 0 &&
      subjectRevealed >= RESIDUE_LIMITS.minRevealedPixels &&
      ratio <= RESIDUE_LIMITS.maxSubjectRevealRatio
    ) {
      findings.push({
        reason: "canvas-over-drawing",
        fill: shape.fill,
        tag: shape.tag,
        box: shape.box,
        subjectRevealed,
        ratio,
      });
      continue;
    }
    const boxArea = (shape.box.x1 - shape.box.x0) * (shape.box.y1 - shape.box.y0);
    const inBottomMargin = shape.box.y1 >= vy + vh * 0.9 && shape.box.y0 >= vy + vh * 0.8;
    if (
      isGroundResidueFill(shape.fill) &&
      inBottomMargin &&
      subjectRevealed === 0 &&
      boxArea <= vw * vh * RESIDUE_LIMITS.maxGroundBoxRatio
    ) {
      findings.push({ reason: "ground-residue", fill: shape.fill, tag: shape.tag, box: shape.box });
    }
  }
  return findings;
}

/** Remove o resíduo encontrado, repetindo até o arquivo estabilizar. */
export async function stripResidue(sharp, svg) {
  let current = svg;
  const removed = [];
  for (let pass = 0; pass < 12; pass += 1) {
    const findings = await findResidueShapes(sharp, current);
    if (findings.length === 0) break;
    removed.push(...findings.map(({ reason, fill, box }) => ({ reason, fill, box })));
    current = removeShapes(current, findings);
  }
  return { svg: current, removed };
}
