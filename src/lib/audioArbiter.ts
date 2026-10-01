/**
 * RC2.2.21 — um dono do áudio por vez (sem segundo motor de áudio).
 *
 *   IDLE · TTS · SELF_PLAYBACK · RECORDING · RECOGNITION
 *
 * Quem começa "reivindica" o áudio; se outro dono estava ativo, o anterior é
 * parado/liberado ANTES (o último pedido vence). Assim nunca tocam juntos a
 * voz modelo, a própria gravação, o microfone gravando e o reconhecimento.
 * Cada parte continua usando o seu caminho existente (tts/audioPlayback,
 * plugin LongyuSpeech, MediaRecorder da Web); aqui só se coordena.
 */
import { recordTechEvent } from "./techEvents";

export const AUDIO_OWNERS = ["IDLE", "TTS", "SELF_PLAYBACK", "RECORDING", "RECOGNITION"] as const;
export type AudioOwner = (typeof AUDIO_OWNERS)[number];

let owner: AudioOwner = "IDLE";
let token = 0;
const stoppers = new Map<AudioOwner, () => void>();

/**
 * Reivindica o áudio para `next`. `stop` é como parar este dono se outro o
 * substituir. Devolve o token da posse (para liberar só a PRÓPRIA posse).
 */
export function claimAudio(next: Exclude<AudioOwner, "IDLE">, stop?: () => void): number {
  const previous = owner;
  if (previous !== "IDLE" && previous !== next) {
    const stopPrevious = stoppers.get(previous);
    stoppers.delete(previous);
    try {
      stopPrevious?.();
    } catch {
      /* o dono anterior já tinha terminado */
    }
  }
  owner = next;
  token += 1;
  if (stop) stoppers.set(next, stop);
  else stoppers.delete(next);
  recordTechEvent("audio_owner", { owner: next, previous });
  return token;
}

/** Libera só se a posse ainda é de quem pede (um pedido mais novo não é afetado). */
export function releaseAudio(who: Exclude<AudioOwner, "IDLE">, claimToken?: number): void {
  if (owner !== who) return;
  if (claimToken != null && claimToken !== token) return;
  owner = "IDLE";
  stoppers.delete(who);
}

export function currentAudioOwner(): AudioOwner {
  return owner;
}

export function resetAudioArbiterForTests(): void {
  owner = "IDLE";
  token = 0;
  stoppers.clear();
}
