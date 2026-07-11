import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import {
  collectFeedbackTechnicalMeta,
  type FeedbackCategory,
  type FeedbackSeverity,
  type FeedbackSubmitInput,
} from "../lib/feedback";

export interface FeedbackReportRow {
  id: string;
  user_id: string | null;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  message: string;
  expected_behavior: string | null;
  route: string;
  lesson_id: string | null;
  step_id: string | null;
  app_version: string;
  build_sha: string;
  browser: string;
  platform: string;
  viewport: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FeedbackSubmitResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fallbackMailto?: boolean };

function buildPayload(input: FeedbackSubmitInput) {
  const meta = collectFeedbackTechnicalMeta(input.context);
  return {
    category: input.category,
    severity: input.severity,
    message: input.message.trim(),
    expected_behavior: input.expectedBehavior?.trim() || null,
    route: meta.route,
    lesson_id: input.includeTechnical ? meta.lessonId ?? null : null,
    step_id: input.includeTechnical ? meta.stepId ?? null : null,
    app_version: input.includeTechnical ? meta.appVersion : "",
    build_sha: input.includeTechnical ? meta.buildSha : "",
    browser: input.includeTechnical ? meta.browser : "",
    platform: input.includeTechnical ? meta.platform : "",
    viewport: input.includeTechnical ? meta.viewport : "",
    status: "novo",
  };
}

export async function submitFeedbackReport(input: FeedbackSubmitInput): Promise<FeedbackSubmitResult> {
  if (!isSupabaseBackendEnabled()) {
    return { ok: false, error: "Backend em nuvem indisponível.", fallbackMailto: true };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, error: "Cliente Supabase indisponível.", fallbackMailto: true };
  }

  const payload = buildPayload(input);

  const {
    data: { user },
  } = await client.auth.getUser();

  if (user) {
    const { data, error } = await client
      .from("feedback_reports")
      .insert({ ...payload, user_id: user.id })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message, fallbackMailto: true };
    }
    return { ok: true, id: data.id };
  }

  const { data, error } = await client.functions.invoke("submit-feedback", {
    body: {
      ...payload,
      lesson_id: payload.lesson_id,
      step_id: payload.step_id,
      expected_behavior: payload.expected_behavior,
      app_version: payload.app_version,
      build_sha: payload.build_sha,
    },
  });

  if (error) {
    return { ok: false, error: error.message, fallbackMailto: true };
  }

  const body = data as { ok?: boolean; id?: string; error?: string } | null;
  if (!body?.ok || !body.id) {
    return { ok: false, error: body?.error ?? "Não foi possível enviar o feedback.", fallbackMailto: true };
  }

  return { ok: true, id: body.id };
}

export async function listFeedbackReportsForAdmin(): Promise<{
  ok: boolean;
  rows: FeedbackReportRow[];
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, rows: [], error: "Cliente indisponível." };

  const { data, error } = await client
    .from("feedback_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return { ok: false, rows: [], error: error.message };
  return { ok: true, rows: (data ?? []) as FeedbackReportRow[] };
}

export async function updateFeedbackReportAdmin(
  id: string,
  patch: { status?: string; admin_notes?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: "Cliente indisponível." };

  const { error } = await client.from("feedback_reports").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function fetchIsAdmin(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return false;

  const { data, error } = await client
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return false;
  return Boolean(data.is_admin);
}
