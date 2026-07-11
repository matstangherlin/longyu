import { isSupabaseBackendEnabled } from "./backendConfig";
import { getSupabaseClient } from "./supabaseClient";
import { useStore } from "./store";
import type { EconomyRpcResult, ServerEconomySnapshot } from "./economyTypes";
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

export function applyServerEconomyToStore(snapshot: ServerEconomySnapshot): void {
  useStore.getState().setEconomySyncMessage(null);
  useStore.setState((s) => {
    const dailyEnergy = {
      ...s.dailyEnergy,
      charges: snapshot.current_charges,
      maxCharges: snapshot.max_charges,
      date: snapshot.energy_day,
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
            focusPassUntil: snapshot.focus_pass_until ? Date.parse(snapshot.focus_pass_until) : account.focusPassUntil,
          },
        }
      : s.accounts;

    return {
      points: snapshot.qi,
      dragonPearls: snapshot.dragon_pearls,
      streakShields: snapshot.streak_shields,
      dailyEnergy,
      focusPassUntil: snapshot.focus_pass_until ? Date.parse(snapshot.focus_pass_until) : s.focusPassUntil,
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
  };
}
