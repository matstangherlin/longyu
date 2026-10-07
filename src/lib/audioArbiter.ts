/**
 * RC2.2.21/31 — um dono do áudio por vez (sem segundo motor de áudio).
 *
 *   IDLE · CANONICAL_MEDIA · TTS · SELF_PLAYBACK · RECORDING · RECOGNITION
 *
 * RC2.2.31 — asset canônico NAO usa owner "TTS".
 */
import { recordTechEvent } from "./techEvents";
import { setAudioOwnerState } from "./audioOwnerState";

export const AUDIO_OWNERS = ["IDLE", "CANONICAL_MEDIA", "TTS", "SELF_PLAYBACK", "RECORDING", "RECOGNITION"] as const;
export type AudioOwner = (typeof AUDIO_OWNERS)[number];

let owner: AudioOwner = "IDLE";
let token = 0;
const stoppers = new Map<AudioOwner, () => void>();

/**
 * Reivindica o áudio para `next`. `stop` é como parar este dono se outro o
 * substituir. Devolve o token da posse (para liberar só a PRÓPRIA posse).
 *
 * RC2.2.31B — mesmo dono (CANONICAL_MEDIA → CANONICAL_MEDIA) também para o
 * stopper anterior: conversa fala A→B não deixa A vivo matando o STARTED de B.
 */
export function claimAudio(next: Exclude<AudioOwner, "IDLE">, stop?: () => void): number {
  const previous = owner;
  if (previous !== "IDLE") {
    const stopPrevious = stoppers.get(previous);
    stoppers.delete(previous);
    try {
      stopPrevious?.();
    } catch {
      /* o dono anterior já tinha terminado */
    }
  }
  owner = next;
  setAudioOwnerState(next);
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
  setAudioOwnerState("IDLE");
  stoppers.delete(who);
}

export function currentAudioOwner(): AudioOwner {
  return owner;
}

export function resetAudioArbiterForTests(): void {
  owner = "IDLE";
  setAudioOwnerState("IDLE");
  token = 0;
  stoppers.clear();
}
