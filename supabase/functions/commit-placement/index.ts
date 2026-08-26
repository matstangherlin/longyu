import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  PLACEMENT_VERSION,
  type Experience,
  type PlacementAnswerEvidence,
} from "../_shared/placement/types.ts";
import {
  evaluatePlacementEvidence,
  validatePlacementEvidence,
} from "../_shared/placement/engine.ts";

const CANONICAL_ORIGIN = Deno.env.get("APP_CANONICAL_ORIGIN") ?? "https://longyu.app";
const DEFAULT_ORIGINS = [
  "https://singular-meringue-7838cd.netlify.app",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];

function allowedOrigins(): Set<string> {
  return new Set(
    [
      CANONICAL_ORIGIN,
      ...DEFAULT_ORIGINS,
      ...(Deno.env.get("STRIPE_ALLOWED_ORIGINS") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ].map((value) => value.replace(/\/$/, "")),
  );
}

function requestOrigin(req: Request): string {
  const incoming = (req.headers.get("origin") ?? "").replace(/\/$/, "");
  return allowedOrigins().has(incoming) ? incoming : CANONICAL_ORIGIN;
}

function corsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": requestOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { ok: false, error: "Método não permitido." }, 405);
  }

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
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user?.id) {
    return json(req, { ok: false, error: "Sessão inválida." }, 401);
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const declaredExperience = String(body.declaredExperience ?? "") as Experience;
  const answers = Array.isArray(body.answers) ? body.answers as PlacementAnswerEvidence[] : [];
  const goal = typeof body.goal === "string" ? body.goal : null;
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : null;
  const placementVersion = Number(body.placementVersion ?? PLACEMENT_VERSION);

  const validated = validatePlacementEvidence({
    placementVersion,
    declaredExperience,
    answers: answers.map((item) => ({
      questionId: String(item.questionId ?? ""),
      answer: String(item.answer ?? ""),
      hintUsed: Boolean(item.hintUsed),
      responseMode: item.responseMode === "self_report" ? "self_report" : "choice",
    })),
  });
  if (!validated.ok) {
    return json(req, { ok: false, error: validated.error }, 400);
  }

  const normalized = answers.map((item) => ({
    questionId: String(item.questionId),
    answer: String(item.answer),
    hintUsed: Boolean(item.hintUsed),
    responseMode: (item.responseMode === "self_report" ? "self_report" : "choice") as PlacementAnswerEvidence["responseMode"],
  }));

  const analysis = evaluatePlacementEvidence(declaredExperience, normalized);
  const mastered = analysis.placement.masteredByPlacement;

  const admin = createClient(supabaseUrl, serviceRole);
  const { data, error } = await admin.rpc("commit_placement_result", {
    p_user_id: user.id,
    p_placement_version: PLACEMENT_VERSION,
    p_declared_experience: declaredExperience,
    p_goal: goal,
    p_answers: normalized,
    p_score_summary: {
      score: analysis.score,
      weightedAccuracy: analysis.weightedAccuracy,
      noHintAccuracy: analysis.noHintAccuracy,
      questionsAnswered: analysis.questionsAnswered,
      strengths: analysis.strengths,
      reinforcements: analysis.reinforcements,
    },
    p_competency_summary: analysis.competency,
    p_foundation_proofs: analysis.foundationProofs,
    p_recommended_lesson_id: analysis.placement.targetLessonId,
    p_mastered_by_placement: mastered,
    p_confidence: analysis.placementConfidence,
    p_idempotency_key: idempotencyKey,
    p_learning_goal: goal,
  });

  if (error) {
    return json(req, { ok: false, error: error.message }, 500);
  }

  return json(req, {
    ok: true,
    attemptId: (data as { attemptId?: string } | null)?.attemptId,
    analysis,
  });
});
