import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  PLACEMENT_VERSION,
  type PlacementAnswerEvidence,
} from "../_shared/placement/types.ts";
import {
  evaluatePlacementEvidence,
  validatePlacementEvidence,
} from "../_shared/placement/engine.ts";
import {
  onboardingIdempotencyKey,
  parsePlacementEvidence,
} from "../_shared/placement/evidence.ts";
import { logOpsEdge } from "../_shared/opsCorrelation.ts";

const CANONICAL_ORIGIN = Deno.env.get("APP_CANONICAL_ORIGIN") ?? "https://longyu.app";
const DEFAULT_ORIGINS = [
  "https://singular-meringue-7838cd.netlify.app",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { ok: false, code: "method_not_allowed", error: "Metodo nao permitido." }, 405);
  }

  logOpsEdge(req, "start");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnon || !serviceRole) {
    return json(req, { ok: false, code: "unavailable", error: "Servidor nao configurado." }, 501);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(req, { ok: false, code: "unauthenticated", error: "Nao autenticado." }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user?.id) {
    return json(req, { ok: false, code: "invalid_session", error: "Sessao invalida." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRole);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("onboarding_completed, placement_attempt_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("finalize-onboarding profile:", profileError.message);
    return json(req, { ok: false, code: "unavailable", error: "Falha temporaria." }, 503);
  }

  if (profile?.onboarding_completed === true) {
    return json(req, {
      ok: true,
      alreadyCompleted: true,
      attemptId: profile.placement_attempt_id,
    });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  let evidence = null as ReturnType<typeof parsePlacementEvidence>;

  const { data: draft, error: draftError } = await admin
    .from("placement_onboarding_drafts")
    .select("placement_version, declared_experience, goal, answers, expires_at, consumed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (draftError) {
    console.error("finalize-onboarding draft:", draftError.message);
    return json(req, { ok: false, code: "unavailable", error: "Falha temporaria." }, 503);
  }

  if (draft && !draft.consumed_at && new Date(String(draft.expires_at)).getTime() > Date.now()) {
    const answers = (Array.isArray(draft.answers) ? draft.answers : []) as PlacementAnswerEvidence[];
    evidence = {
      placementVersion: Number(draft.placement_version ?? PLACEMENT_VERSION),
      declaredExperience: draft.declared_experience,
      goal: typeof draft.goal === "string" ? draft.goal : null,
      answers: answers.map((item) => ({
        questionId: String(item.questionId ?? ""),
        answer: String(item.answer ?? ""),
        hintUsed: Boolean(item.hintUsed),
        responseMode: item.responseMode === "self_report" ? "self_report" : "choice",
      })),
    };
  } else {
    evidence = parsePlacementEvidence(
      body && typeof body === "object" && "placement" in body ? body.placement : body,
    );
  }

  if (!evidence) {
    return json(req, { ok: false, code: "missing_draft", error: "Placement ausente." }, 409);
  }

  const validated = validatePlacementEvidence({
    placementVersion: evidence.placementVersion,
    declaredExperience: evidence.declaredExperience,
    answers: evidence.answers,
  });
  if (!validated.ok) {
    return json(req, { ok: false, code: "invalid_evidence", error: validated.error }, 400);
  }

  const analysis = evaluatePlacementEvidence(evidence.declaredExperience, evidence.answers);
  const mastered = analysis.placement.masteredByPlacement;
  const idempotencyKey = onboardingIdempotencyKey(user.id);

  const { data, error } = await admin.rpc("commit_placement_result", {
    p_user_id: user.id,
    p_placement_version: PLACEMENT_VERSION,
    p_declared_experience: evidence.declaredExperience,
    p_goal: evidence.goal,
    p_answers: evidence.answers,
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
    p_learning_goal: evidence.goal,
  });

  if (error) {
    console.error("finalize-onboarding commit:", error.message);
    return json(req, { ok: false, code: "commit_failed", error: error.message }, 500);
  }

  return json(req, {
    ok: true,
    alreadyCompleted: Boolean((data as { alreadyCompleted?: boolean } | null)?.alreadyCompleted),
    attemptId: (data as { attemptId?: string } | null)?.attemptId,
    analysis,
  });
});
