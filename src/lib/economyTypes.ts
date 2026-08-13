/** Estado retornado pelas RPCs de economia no servidor. */

export interface ServerEconomySnapshot {
  qi: number;
  dragon_pearls: number;
  streak_shields: number;
  current_charges: number;
  max_charges: number;
  energy_day: string;
  focus_pass_until?: string | null;
  pearl_milestones_claimed?: Record<string, number> | null;
  pearl_ledger?: unknown[] | null;
  pearl_pro_expires_at?: string | null;
  pearl_pro_last_activated_at?: string | null;
  pearl_pro_auto_activate?: boolean | null;
}

export interface EconomyRpcResult {
  ok: boolean;
  already_applied?: boolean;
  is_pro?: boolean;
  /** A resposta pertence a outro perfil que deixou de ser o perfil ativo. */
  stale_account?: boolean;
  skipped?: boolean;
  granted?: boolean;
  reason?: string;
  error?: string;
  economy?: ServerEconomySnapshot;
  rewards?: unknown;
  granted_today?: number;
  cap?: number;
  expires_at?: string | null;
  amount?: number;
  /** Falha de transporte já enfileirada; não equivale a concessão. */
  retry_pending?: boolean;
}

export type EconomyIntentOperation =
  | "consume_charge"
  | "spend_qi"
  | "grant_lesson_reward"
  | "grant_story_energy"
  | "claim_mission"
  | "open_chest"
  | "migrate_local_economy"
  | "activate_pearl_pro_pass"
  | "claim_pearl_milestone";

export interface EconomyIntent {
  id: string;
  operation: EconomyIntentOperation;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  /** Perfil que originou a intenção; evita replay sob outra conta cloud. */
  accountId?: string;
}
