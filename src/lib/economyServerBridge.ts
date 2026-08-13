import { isSupabaseBackendEnabled } from "./backendConfig";
import { getSupabaseClient } from "./supabaseClient";
import { useStore } from "./store";
import type { EconomyRpcResult, ServerEconomySnapshot } from "./economyTypes";
import type { PearlLedgerEntry } from "./pearlEconomy";
import {
  bumpEconomyIntentAttempt,
  enqueueEconomyIntent,
  listEconomyIntents,
  removeEconomyIntent,
} from "./economyIntentQueue";

export function shouldUseServerEconomy(): boolean {
  if (!isSupabaseBackendEnabled()) return false;
  const client = getSupabaseClient();
  if (!client) return false;
  const state = useStore.getState();
  const account = state.accounts[state.currentAccountId];
  return account?.authMode === "cloud";
}

function parseTs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function normalizePearlLedger(raw: unknown): PearlLedgerEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PearlLedgerEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const e = item as Partial<PearlLedgerEntry>;
    if (!e.id || (e.direction !== "earned" && e.direction !== "spent")) continue;
    const amount = Math.max(0, Math.round(Number(e.amount) || 0));
    if (amount <= 0) continue;
    out.push({
      id: String(e.id),
      direction: e.direction,
      source: String(e.source ?? ""),
      amount,
      timestamp: Number(e.timestamp) || Date.now(),
      milestoneId: e.milestoneId ? String(e.milestoneId) : undefined,
      purchaseId: e.purchaseId ? String(e.purchaseId) : undefined,
    });
  }
  return out.slice(-200);
}

function normalizeClaimed(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (k && Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

export function applyServerEconomyToStore(snapshot: ServerEconomySnapshot): void {
  useStore.getState().setEconomySyncMessage(null);
  useStore.setState((s) => {
    const dailyEnergy = {
      ...s.dailyEnergy,
      charges: snapshot.current_charges,
      maxCharges: snapshot.max_charges,
      date: snapshot.energy_day,
    };
    const pearlMilestonesClaimed = snapshot.pearl_milestones_claimed
      ? normalizeClaimed(snapshot.pearl_milestones_claimed)
      : s.pearlMilestonesClaimed ?? {};
    const pearlLedger = snapshot.pearl_ledger
      ? normalizePearlLedger(snapshot.pearl_ledger)
      : s.pearlLedger ?? [];
    const pearlProExpiresAt =
      snapshot.pearl_pro_expires_at !== undefined
        ? parseTs(snapshot.pearl_pro_expires_at)
        : s.pearlProExpiresAt ?? null;
    const pearlProLastActivatedAt =
      snapshot.pearl_pro_last_activated_at !== undefined
        ? parseTs(snapshot.pearl_pro_last_activated_at)
        : s.pearlProLastActivatedAt ?? null;
    const pearlProAutoActivate =
      typeof snapshot.pearl_pro_auto_activate === "boolean"
        ? snapshot.pearl_pro_auto_activate
        : s.pearlProAutoActivate ?? false;

    const pearlPatch = {
      pearlMilestonesClaimed,
      pearlLedger,
      pearlProExpiresAt,
      pearlProLastActivatedAt,
      pearlProAutoActivate,
      pearlProPendingOffline: false,
    };

    const account = s.accounts[s.currentAccountId];
    const accounts = account
      ? {
          ...s.accounts,
          [s.currentAccountId]: {
            ...account,
            points: snapshot.qi,
            dragonPearls: snapshot.dragon_pearls,
            streakShields: snapshot.streak_shields,
            dailyEnergy,
            focusPassUntil: snapshot.focus_pass_until
              ? Date.parse(snapshot.focus_pass_until)
              : account.focusPassUntil,
            ...pearlPatch,
          },
        }
      : s.accounts;

    return {
      points: snapshot.qi,
      dragonPearls: snapshot.dragon_pearls,
      streakShields: snapshot.streak_shields,
      dailyEnergy,
      focusPassUntil: snapshot.focus_pass_until
        ? Date.parse(snapshot.focus_pass_until)
        : s.focusPassUntil,
      ...pearlPatch,
      accounts,
    };
  });
}

async function invokeRpc<T extends EconomyRpcResult>(
  fn: string,
  args: Record<string, unknown>
): Promise<{ data: T | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: "Cliente indisponível" };
  const { data, error } = await client.rpc(fn, args);
  if (error) return { data: null, error: error.message };
  return { data: data as T, error: null };
}

function setSyncing(message: string): void {
  useStore.getState().setEconomySyncMessage(message);
}

export async function fetchServerEconomy(): Promise<EconomyRpcResult | null> {
  const { data, error } = await invokeRpc<EconomyRpcResult>("get_server_economy", {});
  if (error || !data?.economy) return null;
  applyServerEconomyToStore(data.economy);
  return data;
}

export async function serverConsumeCharge(
  activityType: string,
  idempotencyKey: string
): Promise<EconomyRpcResult> {
  setSyncing("Sincronizando carga...");
  const { data, error } = await invokeRpc<EconomyRpcResult>("consume_charge", {
    p_activity_type: activityType,
    p_idempotency_key: idempotencyKey,
  });
  if (error || !data) {
    enqueueEconomyIntent({
      id: idempotencyKey,
      operation: "consume_charge",
      idempotencyKey,
      payload: { activityType },
    });
    useStore.getState().setEconomySyncMessage("Falha ao sincronizar carga. Tentaremos de novo.");
    return { ok: false, error: error ?? "rpc_failed" };
  }
  if (data.economy) applyServerEconomyToStore(data.economy);
  else useStore.getState().setEconomySyncMessage(null);
  return data;
}

export async function serverSpendQi(
  amount: number,
  reason: string,
  idempotencyKey: string
): Promise<EconomyRpcResult> {
  setSyncing("Sincronizando Qi...");
  const { data, error } = await invokeRpc<EconomyRpcResult>("spend_qi", {
    p_amount: amount,
    p_reason: reason,
    p_idempotency_key: idempotencyKey,
  });
  if (error || !data) {
    enqueueEconomyIntent({
      id: idempotencyKey,
      operation: "spend_qi",
      idempotencyKey,
      payload: { amount, reason },
    });
    return { ok: false, error: error ?? "rpc_failed" };
  }
  if (data.economy) applyServerEconomyToStore(data.economy);
  else useStore.getState().setEconomySyncMessage(null);
  return data;
}

export async function serverGrantLessonReward(input: {
  lessonId: string;
  attemptId: string;
  stars: number;
  noSkip: boolean;
}): Promise<EconomyRpcResult> {
  setSyncing("Sincronizando recompensa...");
  const { data, error } = await invokeRpc<EconomyRpcResult>("grant_lesson_reward", {
    p_lesson_id: input.lessonId,
    p_attempt_id: input.attemptId,
    p_stars: input.stars,
    p_no_skip: input.noSkip,
  });
  if (error || !data) {
    const key = `lesson-reward:${input.lessonId}:${input.attemptId}`;
    enqueueEconomyIntent({
      id: key,
      operation: "grant_lesson_reward",
      idempotencyKey: key,
      payload: input,
    });
    return { ok: false, error: error ?? "rpc_failed" };
  }
  if (data.economy) applyServerEconomyToStore(data.economy);
  else useStore.getState().setEconomySyncMessage(null);
  return data;
}

export async function serverGrantStoryEnergy(storyId: string, dayKey: string): Promise<EconomyRpcResult> {
  setSyncing("Sincronizando energia da história...");
  const key = `story-energy:${dayKey}:${storyId}`;
  const { data, error } = await invokeRpc<EconomyRpcResult>("grant_story_energy", {
    p_story_id: storyId,
    p_day_key: dayKey,
  });
  if (error || !data) {
    enqueueEconomyIntent({ id: key, operation: "grant_story_energy", idempotencyKey: key, payload: { storyId, dayKey } });
    return { ok: false, error: error ?? "rpc_failed" };
  }
  if (data.economy) applyServerEconomyToStore(data.economy);
  else useStore.getState().setEconomySyncMessage(null);
  return data;
}

export async function serverClaimMission(input: {
  scope: string;
  missionId: string;
  periodKey: string;
  metricValue: number;
}): Promise<EconomyRpcResult> {
  setSyncing("Sincronizando recompensa...");
  const key = `mission:${input.scope}:${input.missionId}:${input.periodKey}`;
  const { data, error } = await invokeRpc<EconomyRpcResult>("claim_mission", {
    p_scope: input.scope,
    p_mission_id: input.missionId,
    p_period_key: input.periodKey,
    p_metric_value: input.metricValue,
  });
  if (error || !data) {
    enqueueEconomyIntent({ id: key, operation: "claim_mission", idempotencyKey: key, payload: input });
    return { ok: false, error: error ?? "rpc_failed" };
  }
  if (data.economy) applyServerEconomyToStore(data.economy);
  else useStore.getState().setEconomySyncMessage(null);
  return data;
}

export async function serverOpenChest(chestType: string, openingId: string): Promise<EconomyRpcResult> {
  setSyncing("Sincronizando baú...");
  const key = `chest:${openingId}`;
  const { data, error } = await invokeRpc<EconomyRpcResult>("open_chest", {
    p_chest_type: chestType,
    p_opening_id: openingId,
  });
  if (error || !data) {
    enqueueEconomyIntent({
      id: key,
      operation: "open_chest",
      idempotencyKey: key,
      payload: { chestType, openingId },
    });
    return { ok: false, error: error ?? "rpc_failed" };
  }
  if (data.economy) applyServerEconomyToStore(data.economy);
  else useStore.getState().setEconomySyncMessage(null);
  return data;
}

export async function serverActivatePearlProPass(idempotencyKey: string): Promise<EconomyRpcResult> {
  setSyncing("Ativando Pro com Pérolas...");
  const { data, error } = await invokeRpc<EconomyRpcResult>("activate_pearl_pro_pass", {
    p_idempotency_key: idempotencyKey,
  });
  if (error || !data) {
    enqueueEconomyIntent({
      id: idempotencyKey,
      operation: "activate_pearl_pro_pass",
      idempotencyKey,
      payload: {},
    });
    useStore.getState().setEconomySyncMessage("Falha ao ativar Pro. Tentaremos de novo.");
    return { ok: false, error: error ?? "rpc_failed" };
  }
  if (data.economy) applyServerEconomyToStore(data.economy);
  else useStore.getState().setEconomySyncMessage(null);
  if (data.ok && data.is_pro) {
    useStore.getState().setServerEntitlement(true);
  }
  return data;
}

export async function serverClaimPearlMilestone(input: {
  milestoneId: string;
  idempotencyKey: string;
  evidence: Record<string, unknown>;
}): Promise<EconomyRpcResult> {
  setSyncing("Resgatando Pérola...");
  const { data, error } = await invokeRpc<EconomyRpcResult>("claim_pearl_milestone", {
    p_milestone_id: input.milestoneId,
    p_idempotency_key: input.idempotencyKey,
    p_evidence: input.evidence,
  });
  if (error || !data) {
    enqueueEconomyIntent({
      id: input.idempotencyKey,
      operation: "claim_pearl_milestone",
      idempotencyKey: input.idempotencyKey,
      payload: {
        milestoneId: input.milestoneId,
        evidence: input.evidence,
      },
    });
    return { ok: false, error: error ?? "rpc_failed" };
  }
  if (data.economy) applyServerEconomyToStore(data.economy);
  else useStore.getState().setEconomySyncMessage(null);
  return data;
}

export async function serverMigrateLocalEconomy(
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<EconomyRpcResult> {
  setSyncing("Migrando economia...");
  const { data, error } = await invokeRpc<EconomyRpcResult>("migrate_local_economy", {
    p_payload: payload,
    p_idempotency_key: idempotencyKey,
  });
  if (error || !data) return { ok: false, error: error ?? "rpc_failed" };
  if (data.economy) applyServerEconomyToStore(data.economy);
  else useStore.getState().setEconomySyncMessage(null);
  return data;
}

export async function flushEconomyIntentQueue(): Promise<void> {
  if (!shouldUseServerEconomy()) return;

  // Pass Pro marcado offline: tenta ativar ao reconectar.
  const state = useStore.getState();
  if (state.pearlProPendingOffline) {
    const result = state.activatePearlProPass({
      idempotencyKey: `pearl-pro-pending:${state.pearlProLastActivatedAt ?? 0}`,
    });
    if (result.ok || result.reason !== "offline_cloud") {
      useStore.setState((s) => {
        const pearlProPendingOffline = false;
        const account = s.accounts[s.currentAccountId];
        const accounts = account
          ? { ...s.accounts, [s.currentAccountId]: { ...account, pearlProPendingOffline } }
          : s.accounts;
        return { pearlProPendingOffline, accounts };
      });
    }
  }

  for (const intent of listEconomyIntents()) {
    bumpEconomyIntentAttempt(intent.idempotencyKey);
    let result: EconomyRpcResult = { ok: false };
    switch (intent.operation) {
      case "consume_charge":
        result = await serverConsumeCharge(String(intent.payload.activityType), intent.idempotencyKey);
        break;
      case "spend_qi":
        result = await serverSpendQi(
          Number(intent.payload.amount),
          String(intent.payload.reason),
          intent.idempotencyKey
        );
        break;
      case "grant_lesson_reward":
        result = await serverGrantLessonReward(intent.payload as {
          lessonId: string;
          attemptId: string;
          stars: number;
          noSkip: boolean;
        });
        break;
      case "grant_story_energy":
        result = await serverGrantStoryEnergy(String(intent.payload.storyId), String(intent.payload.dayKey));
        break;
      case "claim_mission":
        result = await serverClaimMission(intent.payload as {
          scope: string;
          missionId: string;
          periodKey: string;
          metricValue: number;
        });
        break;
      case "open_chest":
        result = await serverOpenChest(String(intent.payload.chestType), String(intent.payload.openingId));
        break;
      case "activate_pearl_pro_pass":
        result = await serverActivatePearlProPass(intent.idempotencyKey);
        break;
      case "claim_pearl_milestone":
        result = await serverClaimPearlMilestone({
          milestoneId: String(intent.payload.milestoneId),
          idempotencyKey: intent.idempotencyKey,
          evidence: (intent.payload.evidence as Record<string, unknown>) ?? {},
        });
        break;
      default:
        break;
    }
    if (result.ok) removeEconomyIntent(intent.idempotencyKey);
  }
}

export function buildLocalEconomyMigrationPayload(): Record<string, unknown> {
  const s = useStore.getState();
  const energy = s.dailyEnergy;
  return {
    qi: s.points,
    dragon_pearls: s.dragonPearls,
    streak_shields: s.streakShields,
    current_charges: energy.charges,
    max_charges: energy.maxCharges,
    pearl_milestones_claimed: s.pearlMilestonesClaimed ?? {},
    pearl_pro_expires_at: s.pearlProExpiresAt ? new Date(s.pearlProExpiresAt).toISOString() : null,
    pearl_pro_last_activated_at: s.pearlProLastActivatedAt
      ? new Date(s.pearlProLastActivatedAt).toISOString()
      : null,
    pearl_pro_auto_activate: s.pearlProAutoActivate ?? false,
  };
}
