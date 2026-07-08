import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");

  if (!serviceRole || !supabaseUrl || !supabaseAnon) {
    return new Response(JSON.stringify({ error: "Servidor não configurado." }), { status: 501 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Sessão inválida." }), { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRole);
  const userId = user.id;

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
    return new Response(JSON.stringify({ error: authError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
