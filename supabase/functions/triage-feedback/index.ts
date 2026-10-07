// Triagem de beta_feedback com TypeSafe Jev: tipo, área, gravidade e se
// precisa de resposta humana. Só admin beta (is_beta_admin) pode disparar.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { askJev, jevAllowed, jevInputHash, resolveTypesafeApiKey, type JevQuestion, type JevResponse } from "../_shared/jev.ts";
import { logOpsEdge } from "../_shared/opsCorrelation.ts";

const CANONICAL_ORIGIN = Deno.env.get("APP_CANONICAL_ORIGIN") ?? "https://longyu.app";
const DEFAULT_ORIGINS = [
  "https://singular-meringue-7838cd.netlify.app",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];
const BATCH_LIMIT = 25;
const CONCURRENCY = 5;

function requestOrigin(req: Request): string {
  const allowed = new Set([CANONICAL_ORIGIN, ...DEFAULT_ORIGINS].map((v) => v.replace(/\/$/, "")));
  const incoming = (req.headers.get("origin") ?? "").replace(/\/$/, "");
  return allowed.has(incoming) ? incoming : CANONICAL_ORIGIN;
}

function corsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": requestOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-longyu-correlation-id, x-longyu-session-id, x-longyu-op",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

const QUESTIONS: Record<string, JevQuestion> = {
  kind: {
    type: "choice",
    instructions: "What kind of feedback is this, from a learner of a Mandarin learning app",
    criteria: {
      bug: "Something in the app is broken or behaves incorrectly",
      content_error: "Wrong translation, pinyin, tone, audio or lesson content",
      suggestion: "Idea or request for a new feature or improvement",
      confusion: "Learner did not understand an exercise or how the app works",
      praise: "Positive feedback with no problem reported",
    },
  },
  area: {
    type: "choice",
    instructions: "Which part of the app the feedback is about",
    criteria: {
      lesson: "Lessons, exercises, review or the learning path",
      audio_speech: "Audio playback, text-to-speech or speech recognition",
      ui: "Layout, navigation, buttons or visual problems",
      performance: "Slowness, freezing, crashes or loading",
      account: "Login, signup, profile, sync or progress lost",
      payments: "Subscription, Pro plan, checkout or billing",
      social: "Leagues, friends, ranking or referrals",
    },
  },
  severity: {
    type: "score",
    instructions: "How severe the reported problem is for the learner",
    criteria: [
      "No problem or purely cosmetic",
      "Annoying but the learner can continue",
      "Blocks an exercise or lesson",
      "Blocks using the app, or loses progress, data or money",
    ],
  },
  needs_human: {
    type: "noul",
    instructions: "The learner expects a reply or the issue needs urgent human attention",
  },
};

interface FeedbackRow {
  id: string;
  category: string;
  message: string;
  route: string;
  lesson_id: string | null;
  exercise_kind: string | null;
}

function feedbackState(row: FeedbackRow): string {
  return [
    `Category chosen by learner: ${row.category}`,
    `Screen: ${row.route || "unknown"}`,
    row.lesson_id ? `Lesson: ${row.lesson_id}` : null,
    row.exercise_kind ? `Exercise type: ${row.exercise_kind}` : null,
    `Message:\n${row.message.slice(0, 4000)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { ok: false, error: "Método não permitido." }, 405);
  }

  logOpsEdge(req, "start");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnon || !serviceRole) {
    return json(req, { ok: false, error: "Servidor não configurado." }, 501);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(req, { ok: false, error: "Não autenticado." }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: isAdmin, error: adminError } = await userClient.rpc("is_beta_admin");
  if (adminError || isAdmin !== true) {
    return json(req, { ok: false, error: "Acesso negado." }, 403);
  }

  // RC2.3.4A — internal semantic audit only; kill switch JEV_DEV_AUDIT_ENABLED=false.
  if (!jevAllowed("DEV_AUDIT")) {
    return json(req, { ok: false, error: "Triagem por IA desligada pela política de custo." }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const apiKey = await resolveTypesafeApiKey(admin);
  if (!apiKey) {
    return json(req, { ok: false, error: "TYPESAFE_API_KEY não configurada." }, 501);
  }

  const { data: rows, error: selectError } = await admin
    .from("beta_feedback")
    .select("id, category, message, route, lesson_id, exercise_kind")
    .is("ai_triaged_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);
  if (selectError) {
    console.error("triage select:", selectError.message);
    return json(req, { ok: false, error: "Falha ao ler feedback." }, 500);
  }

  const pending = (rows ?? []) as FeedbackRow[];
  let triaged = 0;
  let reused = 0;
  const failures: string[] = [];
  // No duplicate evaluation: identical input in this batch shares one call,
  // and an identical message already triaged earlier is copied, not re-sent.
  const inFlight = new Map<string, Promise<JevResponse>>();
  const evaluate = (state: string) => {
    const key = jevInputHash(state, QUESTIONS);
    let call = inFlight.get(key);
    if (call) reused += 1;
    else {
      call = askJev(apiKey, state, QUESTIONS, "DEV_AUDIT");
      inFlight.set(key, call);
    }
    return call;
  };

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    await Promise.all(
      pending.slice(i, i + CONCURRENCY).map(async (row) => {
        try {
          const { data: prior } = await admin
            .from("beta_feedback")
            .select("ai_kind, ai_area, ai_severity, ai_needs_human, ai_confidence, ai_model")
            .eq("message", row.message)
            .eq("category", row.category)
            .eq("route", row.route)
            .not("ai_triaged_at", "is", null)
            .limit(1)
            .maybeSingle();
          if (prior) {
            const { error } = await admin
              .from("beta_feedback")
              .update({ ...prior, ai_triaged_at: new Date().toISOString() })
              .eq("id", row.id);
            if (error) throw new Error(error.message);
            reused += 1;
            triaged += 1;
            return;
          }
          const result = await evaluate(feedbackState(row));
          const kind = result.answers.kind;
          const area = result.answers.area;
          const severity = result.answers.severity;
          const needsHuman = result.answers.needs_human;
          const confidences = [kind, area, severity]
            .map((answer) => (answer && "confidence" in answer ? answer.confidence : null))
            .filter((value): value is number => typeof value === "number");

          const { error } = await admin
            .from("beta_feedback")
            .update({
              ai_kind: kind?.type === "choice" ? kind.choice : null,
              ai_area: area?.type === "choice" ? area.choice : null,
              ai_severity: severity?.type === "score" ? severity.score : null,
              ai_needs_human: needsHuman?.type === "noul" ? needsHuman.noul : null,
              ai_confidence: confidences.length ? Math.min(...confidences) : null,
              ai_model: result.model,
              ai_triaged_at: new Date().toISOString(),
            })
            .eq("id", row.id);
          if (error) throw new Error(error.message);
          triaged += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("triage row", row.id, message);
          failures.push(message.slice(0, 200));
        }
      }),
    );
  }

  logOpsEdge(req, failures.length ? "error" : "ok", failures.length ? { code: "jev_partial" } : undefined);
  return json(req, {
    ok: failures.length === 0,
    pending: pending.length,
    triaged,
    reused,
    failed: failures.length,
    firstError: failures[0] ?? null,
  });
});
