/**
 * RC2.2.28 — tipos do manifesto canônico de áudio.
 *
 * não usar texto cru como ID. Usar chave estável:
 *   audio:foundation:nihao:v1
 *   conversation:store:greeting:chenmei:v1
 */
export type AudioPack = "core" | "extended" | "hosted";

export interface CanonicalAudioEntry {
  audioId: string;
  contentHash: string;
  textKey: string;
  locale: string;
  speaker: string;
  file: string;
  /** URL web (/audio/...) — Capacitor public. */
  uri: string;
  /**
   * RC2.2.31 — caminho AssetManager nativo (ex: audio/core/guided-try-nihao.mp3).
   * Se omitido, deriva de `file`. Android nao adivinha public/.
   */
  androidAssetPath?: string;
  durationMs: number;
  version: number;
  pack: AudioPack;
  bytes?: number;
  checksum?: string;
}

export interface AudioManifest {
  schema: "longyu-audio-manifest/1";
  generatedAt: string;
  version: number;
  entries: CanonicalAudioEntry[];
}

export interface AudioCorpusReport {
  uniqueUtterances: number;
  references: number;
  missingAudio: string[];
  dynamicOnly: string[];
  duplicateText: Array<{ textKey: string; audioIds: string[] }>;
  corePackCount: number;
  extendedCount: number;
  bySource: Record<string, number>;
}
