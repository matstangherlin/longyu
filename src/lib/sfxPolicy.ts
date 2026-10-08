/**
 * RC2.3.7 — sound-effect policy (pure, no store): when an interface sound is
 * dropped (setting off, Mandarin audio/recording active, duplicate) and how
 * repeated "success" sounds soften. `soundFx.ts` applies it; gates execute it.
 */
/**
 * RC2.3.7 — SFX is interface, Mandarin audio is pedagogy. While a recording,
 * recognition, model (canonical/TTS) or self-playback owns the audio, SFX is
 * dropped (never mixed over the model or into a recording).
 */
export const SFX_YIELDS_TO_OWNERS = ["RECORDING", "RECOGNITION", "CANONICAL_MEDIA", "TTS", "SELF_PLAYBACK"] as const;
/** Same sound twice inside this window = one gesture; second is dropped. */
export const SFX_DEDUPE_WINDOW_MS = 180;
/** Fatigue: after many "success" sounds in a short span the sound gets quieter (visual feedback unchanged). */
export const SUCCESS_FATIGUE = { windowMs: 120_000, startAfter: 5, step: 0.08, floor: 0.6 } as const;

/** Pure decision (testable): should this SFX play now, and at what relative gain? */
export function sfxDecision(input: {
  kind: string;
  enabled: boolean;
  soundEffectsSetting: boolean;
  audioOwner: string;
  now: number;
  lastKind: string | null;
  lastKindAt: number;
  recentSuccesses: number;
}): { play: boolean; reason?: string; gain: number } {
  if (!input.enabled || !input.soundEffectsSetting) return { play: false, reason: "setting_off", gain: 0 };
  if ((SFX_YIELDS_TO_OWNERS as readonly string[]).includes(input.audioOwner)) return { play: false, reason: `audio_owner:${input.audioOwner}`, gain: 0 };
  if (input.lastKind === input.kind && input.now - input.lastKindAt < SFX_DEDUPE_WINDOW_MS) return { play: false, reason: "duplicate", gain: 0 };
  let gain = 1;
  if (input.kind === "success" && input.recentSuccesses >= SUCCESS_FATIGUE.startAfter) {
    gain = Math.max(SUCCESS_FATIGUE.floor, 1 - (input.recentSuccesses - SUCCESS_FATIGUE.startAfter + 1) * SUCCESS_FATIGUE.step);
  }
  return { play: true, gain };
}

