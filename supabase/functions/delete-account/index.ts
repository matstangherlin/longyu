import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit, handleOptions, jsonResponse } from "../_shared/security.ts";

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");

  if (!serviceRole || !supabaseUrl || !supabaseAnon) {
    return jsonResponse(req, { error: "Servidor não configurado." }, 501);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(req, { error: "Não autenticado." }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return jsonResponse(req, { error: "Sessão inválida." }, 401);
  }

  if (!checkRateLimit(`delete-account:${user.id}`, 3, 24 * 60 * 60 * 1000)) {
    return jsonResponse(req, { error: "Limite de exclusão atingido. Tente amanhã." }, 429);
  }

  const admin = createClient(supabaseUrl, serviceRole);
  const userId = user.id;

  await admin.from("league_xp_events").delete().eq("user_id", userId);
  await admin.from("league_weekly_results").delete().eq("user_id", userId);
  await admin.from("league_memberships").delete().eq("user_id", userId);
  await admin.from("user_progress").delete().eq("user_id", userId);
  await admin.from("user_economy").delete().eq("user_id", userId);
  await admin.from("user_srs").delete().eq("user_id", userId);
  await admin.from("user_missions").delete().eq("user_id", userId);
  await admin.from("user_chests").delete().eq("user_id", userId);
  await admin.from("user_achievements").delete().eq("user_id", userId);
  await admin.from("subscriptions").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("id", userId);

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    return jsonResponse(req, { error: authError.message }, 500);
  }

  return jsonResponse(req, { ok: true });
});
