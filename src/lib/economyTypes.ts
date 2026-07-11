/** Estado retornado pelas RPCs de economia no servidor. */

export interface ServerEconomySnapshot {
  qi: number;
  dragon_pearls: number;
  streak_shields: number;
  current_charges: number;
  max_charges: number;
  energy_day: string;
  focus_pass_until?: string | null;
}

export interface EconomyRpcResult {
  ok: boolean;
  already_applied?: boolean;
  is_pro?: boolean;
  skipped?: boolean;
  granted?: boolean;
  reason?: string;
  error?: string;
  economy?: ServerEconomySnapshot;
  rewards?: unknown;
  granted_today?: number;
  cap?: number;
}

export type EconomyIntentOperation =
  | "consume_charge"
  | "spend_qi"
  | "grant_lesson_reward"
  | "grant_story_energy"
  | "claim_mission"
  | "open_chest"
  | "migrate_local_economy";

export interface EconomyIntent {
  id: string;
  operation: EconomyIntentOperation;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}
