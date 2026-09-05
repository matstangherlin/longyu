import type { InstructionLocale } from "../i18n/config";

/**
 * V4.9.2B — Parte E: o asset de mídia de uma aula.
 *
 * O domínio não conhece provider. `delivery` diz como o arquivo chega
 * (`DIRECT_MP4` hoje, `HLS` preparado, `INTERNAL` para a animação que já
 * roda dentro do app), e nada aqui importa SDK de ninguém. Trocar de host
 * depois é trocar `url`, não reescrever o modelo.
 */

export type LessonMediaKind = "VIDEO" | "INTERNAL_ANIMATION";

/**
 * `HLS` existe no tipo de propósito, sem implementação: declarar o formato
 * agora evita que o player nasça assumindo que mídia é sempre um MP4 direto.
 * A biblioteca só entra quando existir um asset HLS real para justificá-la.
 */
export type LessonMediaDelivery = "DIRECT_MP4" | "HLS" | "INTERNAL";

export interface MediaCaptionCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

/**
 * O que acontece quando o vídeo não carrega. Uma cápsula CORE não pode virar
 * beco sem saída — o aluno precisa continuar aprendendo pelo caminho que
 * sobrou, não ficar preso num spinner.
 */
export type LessonMediaFallback = "INTERACTIVE_SEGMENTS" | "TRANSCRIPT_ONLY";

export interface LessonMediaAsset {
  id: string;
  version: number;
  kind: LessonMediaKind;
  delivery: LessonMediaDelivery;
  url?: string;
  mimeType?: string;
  poster?: string;
  durationSeconds: number;
  /** Idioma falado. Ausente quando o material não tem voz. */
  spokenLocale?: InstructionLocale;
  /** Material sem fala: serve os dois cursos sem duplicar arquivo. */
  languageNeutral?: boolean;
  captions: MediaCaptionCue[];
  transcript: string;
  fallback: LessonMediaFallback;
}

// ── Parte Y — segurança de mídia ──────────────────────────────────────────
//
// A URL de um asset é conteúdo de autoria: alguém a digita num arquivo de
// dados. Aceitar qualquer string aqui transformaria esse arquivo num vetor —
// `javascript:` num `src` executa, e `data:text/html` carrega documento
// arbitrário. A checagem é allowlist, não blocklist: só passa o que é
// reconhecidamente seguro, então um esquema novo não entra por omissão.

const ALLOWED_PROTOCOLS = new Set(["https:"]);

export interface MediaUrlVerdict {
  safe: boolean;
  reason?: "EMPTY" | "UNSAFE_PROTOCOL" | "MALFORMED";
}

export function verifyMediaUrl(url: string | undefined, origin?: string): MediaUrlVerdict {
  if (!url || !url.trim()) return { safe: false, reason: "EMPTY" };
  const value = url.trim();

  // `//host/arquivo` parece caminho relativo mas é protocol-relative: aponta
  // para outro host e herda o esquema da página. Recusado antes de qualquer
  // resolução, porque `new URL` o normalizaria para https e ele passaria.
  if (value.startsWith("//")) return { safe: false, reason: "UNSAFE_PROTOCOL" };

  // Caminho relativo é same-origin por construção — o caso do fixture local.
  if (value.startsWith("/")) return { safe: true };

  let parsed: URL;
  try {
    parsed = new URL(value, origin ?? "https://longyu.app");
  } catch {
    return { safe: false, reason: "MALFORMED" };
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return { safe: false, reason: "UNSAFE_PROTOCOL" };
  return { safe: true };
}

// ── Parte M — cobertura realmente assistida ───────────────────────────────
//
// `currentTime / duration` é falsificável: arrastar a barra até o fim marcaria
// a aula como vista sem nada ter sido reproduzido. O que conta é a união dos
// trechos que de fato passaram, por isso guardamos intervalos e não um número.

export interface WatchedRange {
  start: number;
  end: number;
}

/** Une intervalos sobrepostos ou contíguos. Entrada desordenada é aceita. */
export function mergeWatchedRanges(ranges: readonly WatchedRange[], toleranceSeconds = 0.5): WatchedRange[] {
  const valid = ranges
    .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start)
    .map((range) => ({ start: Math.max(0, range.start), end: Math.max(0, range.end) }))
    .sort((a, b) => a.start - b.start);

  const merged: WatchedRange[] = [];
  for (const range of valid) {
    const last = merged[merged.length - 1];
    // A tolerância existe porque `timeupdate` dispara a cada ~250ms: sem ela,
    // uma reprodução contínua viraria dezenas de intervalos com micro-buracos.
    if (last && range.start <= last.end + toleranceSeconds) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

export function watchedSeconds(ranges: readonly WatchedRange[]): number {
  return mergeWatchedRanges(ranges).reduce((total, range) => total + (range.end - range.start), 0);
}

export function watchedCoverage(ranges: readonly WatchedRange[], durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  return Math.min(1, watchedSeconds(ranges) / durationSeconds);
}

/**
 * 90% e não 100%: créditos finais, silêncio de encerramento e o próprio
 * arredondamento do `timeupdate` fazem com que quem assistiu a aula inteira
 * raramente registre o último par de segundos. Exigir 100% puniria o aluno
 * atento por um detalhe técnico. Abaixo de 90% ainda falta conteúdo real.
 */
export const MEDIA_COMPLETION_THRESHOLD = 0.9;

export function isMediaWatched(ranges: readonly WatchedRange[], durationSeconds: number): boolean {
  return watchedCoverage(ranges, durationSeconds) >= MEDIA_COMPLETION_THRESHOLD;
}

// ── Parte K — progresso de reprodução ─────────────────────────────────────
//
// Deliberadamente separado de mastery e SRS: assistir é instrução, não
// aprendizagem medida (Parte N). Misturar os dois faria um vídeo "ensinar"
// vocabulário que o aluno nunca produziu.

export interface MediaPlaybackProgress {
  capsuleId: string;
  mediaAssetId: string;
  mediaVersion: number;
  instructionLocale: InstructionLocale;
  currentTimeSeconds: number;
  durationSeconds: number;
  watchedRanges: WatchedRange[];
  maxPositionSeconds: number;
  completed: boolean;
  updatedAt: number;
}

export const MEDIA_PROGRESS_STORAGE_KEY = "longyu:media-playback-progress:v1";

/** Chave por cápsula, asset, versão e locale: trocar de idioma não herda posição. */
export function mediaProgressKey(
  capsuleId: string,
  mediaAssetId: string,
  mediaVersion: number,
  locale: InstructionLocale
): string {
  return `${capsuleId}|${mediaAssetId}|v${mediaVersion}|${locale}`;
}

type ProgressMap = Record<string, MediaPlaybackProgress>;

function readAll(): ProgressMap {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(MEDIA_PROGRESS_STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function readMediaProgress(
  capsuleId: string,
  mediaAssetId: string,
  mediaVersion: number,
  locale: InstructionLocale
): MediaPlaybackProgress | undefined {
  const entry = readAll()[mediaProgressKey(capsuleId, mediaAssetId, mediaVersion, locale)];
  if (!entry) return undefined;
  // Uma versão nova do asset invalida a posição: 1:42 no corte antigo pode ser
  // outro assunto no novo, e retomar ali confundiria mais do que ajudaria.
  if (entry.mediaVersion !== mediaVersion) return undefined;
  return { ...entry, watchedRanges: mergeWatchedRanges(entry.watchedRanges ?? []) };
}

export function writeMediaProgress(progress: MediaPlaybackProgress): void {
  if (typeof localStorage === "undefined") return;
  const key = mediaProgressKey(
    progress.capsuleId,
    progress.mediaAssetId,
    progress.mediaVersion,
    progress.instructionLocale
  );
  const ranges = mergeWatchedRanges(progress.watchedRanges);
  const next: MediaPlaybackProgress = {
    ...progress,
    watchedRanges: ranges,
    maxPositionSeconds: Math.max(progress.maxPositionSeconds, ...ranges.map((range) => range.end), 0),
    completed: isMediaWatched(ranges, progress.durationSeconds),
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(MEDIA_PROGRESS_STORAGE_KEY, JSON.stringify({ ...readAll(), [key]: next }));
  } catch {
    // Armazenamento negado (janela privada) não pode derrubar a aula: o aluno
    // perde o "continuar de", nunca o acesso ao conteúdo.
  }
}

export function clearMediaProgressForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(MEDIA_PROGRESS_STORAGE_KEY);
}

// ── Decisões do player, como funções puras ────────────────────────────────
//
// Retomada e fallback são regras de produto, não detalhe de renderização.
// Mantê-las dentro do componente as tornaria verificáveis só por E2E, que é
// o teste mais lento e mais frágil de todos. Aqui elas ficam provadas em
// milissegundos, e o componente só as consome.

export type MediaPlaybackMode =
  | "PLAYABLE"
  | "FALLBACK_OFFLINE"
  | "FALLBACK_UNSAFE_URL"
  | "FALLBACK_UNSUPPORTED_DELIVERY"
  | "FALLBACK_ERROR";

export function mediaPlaybackMode(
  asset: LessonMediaAsset,
  state: { offline?: boolean; failed?: boolean } = {}
): MediaPlaybackMode {
  // Offline vem primeiro: sem rede, a URL mais segura do mundo não carrega, e
  // insistir renderizaria o spinner infinito que a Parte P proíbe.
  if (state.offline) return "FALLBACK_OFFLINE";
  if (!verifyMediaUrl(asset.url).safe) return "FALLBACK_UNSAFE_URL";
  // HLS está declarado no tipo, mas sem implementação: cair no fallback é
  // honesto, tentar tocar seria prometer o que o player não faz.
  if (asset.delivery === "HLS") return "FALLBACK_UNSUPPORTED_DELIVERY";
  if (state.failed) return "FALLBACK_ERROR";
  return "PLAYABLE";
}

/**
 * Posição a oferecer como "continuar de", ou `null` quando não faz sentido.
 *
 * Não oferecemos retomada nos primeiros segundos (o aluno não perdeu nada) nem
 * depois de concluída (aí o gesto natural é rever do começo). A oferta também
 * morre quando a versão do asset muda, porque 1:42 no corte antigo pode ser
 * outro assunto no novo.
 */
export const RESUME_MINIMUM_SECONDS = 3;

export function resumeOfferSeconds(progress: MediaPlaybackProgress | undefined): number | null {
  if (!progress) return null;
  if (progress.completed) return null;
  if (progress.maxPositionSeconds <= RESUME_MINIMUM_SECONDS) return null;
  // Perto demais do fim também não é retomada útil.
  if (progress.durationSeconds > 0 && progress.maxPositionSeconds >= progress.durationSeconds - 1) return null;
  return progress.maxPositionSeconds;
}

// ── Registro ──────────────────────────────────────────────────────────────

/**
 * A cápsula oficial de Pinyin continua `ANIMATED_CAPSULE` (Parte V): ela é
 * material real e não vira vídeo falso só para exercitar o player.
 */
export const PINYIN_FOUNDATION_ANIMATION_PT: LessonMediaAsset = {
  id: "media:pinyin-foundation:pt:v1",
  version: 1,
  kind: "INTERNAL_ANIMATION",
  delivery: "INTERNAL",
  durationSeconds: 48,
  spokenLocale: "pt-BR",
  captions: [],
  transcript: "",
  fallback: "INTERACTIVE_SEGMENTS",
};

export const PINYIN_FOUNDATION_ANIMATION_EN: LessonMediaAsset = {
  id: "media:pinyin-foundation:en:v1",
  version: 1,
  kind: "INTERNAL_ANIMATION",
  delivery: "INTERNAL",
  durationSeconds: 48,
  spokenLocale: "en",
  captions: [],
  transcript: "",
  fallback: "INTERACTIVE_SEGMENTS",
};

export const LESSON_MEDIA_ASSETS: LessonMediaAsset[] = [
  PINYIN_FOUNDATION_ANIMATION_PT,
  PINYIN_FOUNDATION_ANIMATION_EN,
];

export function getLessonMediaAsset(id: string | undefined): LessonMediaAsset | undefined {
  return id ? LESSON_MEDIA_ASSETS.find((asset) => asset.id === id) : undefined;
}
