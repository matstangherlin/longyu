/**
 * RC2.2.21 — reproduzir a PRÓPRIA voz: códigos estáveis e mensagens.
 *
 * O QA vê o código; o aluno vê uma frase simples. Volume de mídia zerado não
 * é falha de gravação, e "o player terminou" não é "o aluno ouviu": PASS
 * físico exige PLAYING confirmado + fim + o owner dizendo que ouviu.
 */
export const SELF_PLAYBACK_ERROR_CODES = [
  "NO_RECORDING",
  "INVALID_FILE",
  "PLAYER_PREPARE_FAILED",
  "AUDIO_FOCUS_FAILED",
  "PLAYBACK_START_FAILED",
  "OUTPUT_UNAVAILABLE",
  "MEDIA_VOLUME_ZERO",
  "PLAYBACK_INTERRUPTED",
  "PLAYBACK_ERROR",
] as const;
export type SelfPlaybackErrorCode = (typeof SELF_PLAYBACK_ERROR_CODES)[number];

export type SelfPlaybackMessageKey =
  | "player.selfPlaybackNoRecording"
  | "player.selfPlaybackVolumeZero"
  | "player.selfPlaybackBusy"
  | "player.selfPlaybackInterrupted"
  | "player.selfPlaybackFailed";

/** Mensagem amigável por código (nunca o código cru na tela de produção). */
export function selfPlaybackMessageKey(code: string): SelfPlaybackMessageKey {
  switch (code) {
    case "NO_RECORDING":
    case "INVALID_FILE":
      return "player.selfPlaybackNoRecording";
    case "MEDIA_VOLUME_ZERO":
      return "player.selfPlaybackVolumeZero";
    case "AUDIO_FOCUS_FAILED":
      return "player.selfPlaybackBusy";
    case "PLAYBACK_INTERRUPTED":
      return "player.selfPlaybackInterrupted";
    default:
      return "player.selfPlaybackFailed";
  }
}

/** Evidência que a reprodução precisa reunir (o último item é humano). */
export const SELF_PLAYBACK_PROOF = ["playbackPrepared", "playbackStarted", "playbackCompleted", "ownerHeardOwnVoice"] as const;

/**
 * Máquina declarada: PLAYING só depois de PLAY_PREPARING; PLAYED só depois de
 * PLAYING. Serve ao gate e ao QA para recusar "completou sem tocar".
 */
export function selfPlaybackProven(events: readonly string[]): boolean {
  const prepared = events.indexOf("PLAY_PREPARING");
  const playing = events.indexOf("PLAYING");
  const played = events.lastIndexOf("PLAYED");
  return prepared >= 0 && playing > prepared && played > playing;
}
