// JEV Wave 2 — advisory beta feedback triage (DEV_AUDIT only).
// Learner runtime OFF. Feedback always survives Jev failure.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { askJev, jevAllowed, jevInputHash, resolveTypesafeApiKey, type JevResponse } from "../_shared/jev.ts";
import { logOpsEdge } from "../_shared/opsCorrelation.ts";
import {
  AI_POLICY_VERSION,
  buildClassificationWrite,
  buildClusterQuestions,
  buildSanitizedFeedbackState,
  buildTriageQuestions,
  pendingAiTriageWrite,
  type FeedbackRowV2,
} from "../_shared/jevTriagePipeline.ts";
import { allowNewJevEvaluation, allowSemanticClustering, jevBudgetLevel } from "../_shared/jevDailyBudget.ts";
import { containsUnredactedSecrets } from "../_shared/jevPiiRedact.ts";

const CANONICAL_ORIGIN = Deno.env.get("APP_CANONICAL_ORIGIN") ?? "https://longyu.app";
const DEFAULT_ORIGINS = [
  "https://singular-meringue-7838cd.netlify.app",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];
const BATCH_LIMIT = 25;
const CONCURRENCY = 5;
const QUESTIONS = buildTriageQuestions();

function requestOrigin(req: Request): string {
  const allowed = new Set([CANONICAL_ORIGIN, ...DEFAULT_ORIGINS].map((v) => v.replace(/\/$/, "")));
  const incoming = (req.headers.get("origin") ?? "").replace(/\/$/, "");
  return allowed.has(incoming) ? incoming : CANONICAL_ORIGIN;
}

function corsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": requestOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-longyu-correlation-id, x-longyu-session-id, x-longyu-op",
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

async function loadDailyBudget(admin: SupabaseClient): Promise<{ evaluations: number; reused: number; failures: number }> {
  const day = new Date().toISOString().slice(0, 10);
  const { data } = await admin.from("jev_ops_daily").select("evaluations, reused, failures").eq("day", day).maybeSingle();
  return {
    evaluations: Number(data?.evaluations ?? 0),
    reused: Number(data?.reused ?? 0),
    failures: Number(data?.failures ?? 0),
  };
}

async function bumpDailyBudget(
  admin: SupabaseClient,
  delta: { evaluations?: number; reused?: number; failures?: number; cluster_evals?: number },
): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const { data: existing } = await admin
    .from("jev_ops_daily")
    .select("evaluations, reused, failures, cluster_evals")
    .eq("day", day)
    .maybeSingle();
  const row = {
    day,
    evaluations: Number(existing?.evaluations ?? 0) + (delta.evaluations ?? 0),
    reused: Number(existing?.reused ?? 0) + (delta.reused ?? 0),
    failures: Number(existing?.failures ?? 0) + (delta.failures ?? 0),
    cluster_evals: Number(existing?.cluster_evals ?? 0) + (delta.cluster_evals ?? 0),
    updated_at: new Date().toISOString(),
  };
  // Best-effort: table may not exist until migration applied.
  await admin.from("jev_ops_daily").upsert(row, { onConflict: "day" });
}

/** Bounded cluster candidates — same area + same release only. Never raw learner text. */
async function loadClusterCandidates(
  admin: SupabaseClient,
  area: string | null,
  appVersion: string | null,
): Promise<Array<{ id: string; label: string }>> {
  let q = admin
    .from("beta_feedback")
    .select("ai_cluster_suggestion, ai_area, ai_kind, app_version, ai_policy_version, ai_status")
    .not("ai_cluster_suggestion", "is", null)
    .neq("ai_status", "DISMISSED")
    .order("ai_triaged_at", { ascending: false })
    .limit(12);
  if (area) q = q.eq("ai_area", area);
  // Do not merge clusters across releases (old fixed bug ≠ new regression).
  if (appVersion) q = q.eq("app_version", appVersion);
  const { data } = await q;
  const seen = new Set<string>();
  const out: Array<{ id: string; label: string }> = [];
  for (const row of data ?? []) {
    const id = String(row.ai_cluster_suggestion ?? "").slice(0, 64);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label: `cluster ${id} · kind=${row.ai_kind ?? "?"} · area=${row.ai_area ?? "?"} · release=${row.app_version ?? "?"}`,
    });
    if (out.length >= 6) break;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "Método não permitido." }, 405);

  logOpsEdge(req, "start");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnon || !serviceRole) {
    return json(req, { ok: false, error: "Servidor não configurado." }, 501);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(req, { ok: false, error: "Não autenticado." }, 401);

  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: isAdmin, error: adminError } = await userClient.rpc("is_beta_admin");
  if (adminError || isAdmin !== true) return json(req, { ok: false, error: "Acesso negado." }, 403);

  if (!jevAllowed("DEV_AUDIT")) {
    return json(req, { ok: false, error: "Triagem por IA desligada pela política de custo." }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const apiKey = await resolveTypesafeApiKey(admin);
  // Missing secret: controlled config response; feedback rows untouched.
  if (!apiKey) return json(req, { ok: false, error: "TYPESAFE_API_KEY não configurada." }, 501);

  let budget = { evaluations: 0, reused: 0, failures: 0 };
  try {
    budget = await loadDailyBudget(admin);
  } catch {
    budget = { evaluations: 0, reused: 0, failures: 0 };
  }
  const budgetLevel = jevBudgetLevel(budget.evaluations);
  const clusteringOn = allowSemanticClustering(budgetLevel);
  const evaluationsAllowed = allowNewJevEvaluation(budgetLevel);

  const { data: rows, error: selectError } = await admin
    .from("beta_feedback")
    .select("id, category, message, route, lesson_id, exercise_kind, app_version, browser")
    .is("ai_triaged_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);
  if (selectError) {
    console.error("triage select:", selectError.message);
    return json(req, { ok: false, error: "Falha ao ler feedback." }, 500);
  }

  const pending = (rows ?? []).map((r) => ({
    ...r,
    platform: (r as { browser?: string }).browser ?? null,
    rc_id: null,
  })) as FeedbackRowV2[];
  let triaged = 0;
  let reused = 0;
  let newEvals = 0;
  let clusterEvals = 0;
  let budgetSkipped = 0;
  const failures: string[] = [];
  const inFlight = new Map<string, Promise<JevResponse>>();

  const evaluate = (state: string) => {
    const key = jevInputHash(state, QUESTIONS);
    let call = inFlight.get(key);
    if (call) reused += 1;
    else {
      call = askJev(apiKey, state, QUESTIONS, "DEV_AUDIT");
      inFlight.set(key, call);
      newEvals += 1;
    }
    return call;
  };

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    await Promise.all(
      pending.slice(i, i + CONCURRENCY).map(async (row) => {
        try {
          const sanitized = buildSanitizedFeedbackState(row);
          if (containsUnredactedSecrets(sanitized.state).length) {
            throw new Error("pii_redaction_incomplete");
          }

          // Exact historical reuse (message+category+route) — no paid call.
          const { data: prior } = await admin
            .from("beta_feedback")
            .select(
              "ai_kind, ai_area, ai_severity, ai_needs_human, ai_confidence, ai_model, ai_policy_version, ai_input_hash, ai_p_candidate, ai_human_review_required, ai_kind_confidence, ai_area_confidence, ai_severity_confidence, ai_cluster_suggestion, ai_cluster_confidence, ai_override_reason, ai_status",
            )
            .eq("message", row.message)
            .eq("category", row.category)
            .eq("route", row.route)
            .not("ai_triaged_at", "is", null)
            .limit(1)
            .maybeSingle();
          if (prior) {
            const { error } = await admin
              .from("beta_feedback")
              .update({ ...prior, ai_triaged_at: new Date().toISOString(), ai_status: prior.ai_status ?? "AI_SUGGESTED" })
              .eq("id", row.id);
            if (error) throw new Error(error.message);
            reused += 1;
            triaged += 1;
            return;
          }

          if (!evaluationsAllowed) {
            // Budget exhausted: keep feedback, mark pending AI — operator can still review.
            // Not a row failure — intentional degrade (counted in budgetSkipped).
            const { error } = await admin
              .from("beta_feedback")
              .update({ ...pendingAiTriageWrite() })
              .eq("id", row.id);
            if (error) throw new Error(error.message);
            budgetSkipped += 1;
            return;
          }

          const inputHash = jevInputHash(sanitized.state, QUESTIONS);
          let result: JevResponse;
          try {
            result = await evaluate(sanitized.state);
          } catch (err) {
            // Fail-open: feedback row remains; mark pending.
            await admin.from("beta_feedback").update({ ...pendingAiTriageWrite() }).eq("id", row.id);
            throw err;
          }

          const kind = result.answers.kind;
          const area = result.answers.area;
          const severity = result.answers.severity;
          const needsHuman = result.answers.needs_human;
          const kindConf = kind && "confidence" in kind ? kind.confidence : null;
          const areaConf = area && "confidence" in area ? area.confidence : null;
          const sevConf = severity && "confidence" in severity ? severity.confidence : null;

          let clusterSuggestion: string | null = null;
          let clusterConfidence: number | null = null;
          if (clusteringOn) {
            const areaId = area?.type === "choice" ? String(area.choice) : null;
            const candidates = await loadClusterCandidates(admin, areaId, row.app_version ?? null);
            if (candidates.length) {
              try {
                const cq = buildClusterQuestions(candidates);
                // Suggestion only — never auto-close / resolve issues from cluster match.
                const cState = `${sanitized.state}\n\nExisting cluster labels are suggestions only. Similarity ≠ same root cause. Do not close issues.`;
                const cRes = await askJev(apiKey, cState, cq, "DEV_AUDIT");
                clusterEvals += 1;
                const ans = cRes.answers.cluster;
                if (ans?.type === "choice") {
                  clusterSuggestion = ans.choice === "new_cluster" ? `new:${row.id.slice(0, 8)}` : ans.choice;
                  clusterConfidence = "confidence" in ans ? ans.confidence : null;
                }
              } catch {
                // Clustering is optional — never block classification or close issues.
              }
            } else {
              clusterSuggestion = `new:${row.id.slice(0, 8)}`;
            }
          }

          const write = buildClassificationWrite({
            kind: kind?.type === "choice" ? kind.choice : null,
            area: area?.type === "choice" ? area.choice : null,
            severityScore: severity?.type === "score" ? severity.score : null,
            needsHumanNoul: needsHuman?.type === "noul" ? needsHuman.noul : null,
            kindConfidence: typeof kindConf === "number" ? kindConf : null,
            areaConfidence: typeof areaConf === "number" ? areaConf : null,
            severityConfidence: typeof sevConf === "number" ? sevConf : null,
            model: result.model,
            inputHash,
            originalMessage: row.message,
            clusterSuggestion,
            clusterConfidence,
          });

          // Never write P-level into ai_severity; never auto-confirm P0/P1.
          if (typeof write.ai_severity === "string") throw new Error("severity_p_level_forbidden");
          if (write.ai_status === ("HUMAN_CONFIRMED" as typeof write.ai_status)) {
            throw new Error("p0_auto_resolve_forbidden");
          }

          const { error } = await admin.from("beta_feedback").update(write).eq("id", row.id);
          if (error) throw new Error(error.message);
          triaged += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("triage row", row.id, message.slice(0, 120));
          failures.push(message.slice(0, 200));
        }
      }),
    );
  }

  try {
    await bumpDailyBudget(admin, {
      evaluations: newEvals,
      reused,
      failures: failures.length,
      cluster_evals: clusterEvals,
    });
  } catch {
    // ops counter optional
  }

  logOpsEdge(req, failures.length ? "error" : "ok", failures.length ? { code: "jev_partial" } : undefined);
  return json(req, {
    ok: failures.length === 0,
    policyVersion: AI_POLICY_VERSION,
    pending: pending.length,
    triaged,
    reused,
    newEvaluations: newEvals,
    clusterEvaluations: clusterEvals,
    budgetSkipped,
    failed: failures.length,
    firstError: failures[0] ?? null,
    budgetLevel,
    clusteringEnabled: clusteringOn,
  });
});
