import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { clearReferralCode, peekReferralCode, referralPublicUrl } from "../lib/referralCapture";

export interface ReferralInviteeRow {
  id: string;
  name: string;
  status: string;
  status_label: string;
  attributed_at: string;
}

export interface ReferralDashboard {
  code: string;
  stats: {
    sent: number;
    pending: number;
    qualified: number;
    rewarded: number;
    bonus_days: number;
  };
  invitees: ReferralInviteeRow[];
}

function client() {
  return getSupabaseClient();
}

export async function attributeStoredReferralCode(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseBackendEnabled()) return { ok: false, message: "Indicações exigem conta na nuvem." };
  const code = peekReferralCode();
  if (!code) return { ok: false, message: "Sem código de convite." };

  const supabase = client();
  if (!supabase) return { ok: false, message: "Cliente indisponível." };

  const { data, error } = await supabase.rpc("attribute_referral", { p_code: code });
  if (error) return { ok: false, message: error.message };

  const payload = data as { ok?: boolean; error?: string; already_attributed?: boolean };
  if (!payload?.ok) {
    return { ok: false, message: payload?.error ?? "Não foi possível vincular o convite." };
  }

  clearReferralCode();
  return {
    ok: true,
    message: payload.already_attributed ? "Convite já estava vinculado." : "Convite vinculado com sucesso.",
  };
}

export async function processReferralPipeline(): Promise<void> {
  if (!isSupabaseBackendEnabled()) return;
  const supabase = client();
  if (!supabase) return;
  await supabase.rpc("process_referral_pipeline");
}

export async function fetchReferralDashboard(): Promise<{ ok: boolean; data?: ReferralDashboard; message: string }> {
  if (!isSupabaseBackendEnabled()) {
    return { ok: false, message: "Indicações exigem conta na nuvem." };
  }
  const supabase = client();
  if (!supabase) return { ok: false, message: "Cliente indisponível." };

  const { data, error } = await supabase.rpc("get_referral_dashboard");
  if (error) return { ok: false, message: error.message };

  const payload = data as { ok?: boolean; error?: string; code?: string; stats?: ReferralDashboard["stats"]; invitees?: ReferralInviteeRow[] };
  if (!payload?.ok || !payload.code || !payload.stats) {
    return { ok: false, message: payload?.error ?? "Não foi possível carregar indicações." };
  }

  return {
    ok: true,
    message: "ok",
    data: {
      code: payload.code,
      stats: payload.stats,
      invitees: payload.invitees ?? [],
    },
  };
}

export function buildReferralShareUrl(code: string): string {
  return referralPublicUrl(code);
}
