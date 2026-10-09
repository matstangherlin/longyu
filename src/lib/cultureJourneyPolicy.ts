/**
 * RC2.3.13E — Culture never blocks main Mandarin Journey.
 * Culture gates remain as optional bridges / context, not lesson locks.
 */
export const CULTURE_MAY_BLOCK_JOURNEY = false;

export function cultureBlocksJourney(): boolean {
  return CULTURE_MAY_BLOCK_JOURNEY;
}
