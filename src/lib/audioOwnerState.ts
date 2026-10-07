/**
 * RC2.3.7 — current audio owner as plain state (no dependencies).
 * `audioArbiter.ts` writes it; interface sound (`soundFx.ts`) reads it to stay
 * out of the way of recordings, Mandarin models and self-playback.
 */
let current = "IDLE";

export function setAudioOwnerState(owner: string): void {
  current = owner;
}

export function audioOwnerState(): string {
  return current;
}
