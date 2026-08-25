import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = new Set([
  "https://longyu.com.br",
  "https://www.longyu.com.br",
  "https://longyu.netlify.app",
  "https://singular-meringue-7838cd.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const EMPLOYEE_COUNTS = new Set([
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
]);
const GOALS = new Set([
  "work_with_chinese_teams",
  "travel_to_china",
  "relocation",
  "industry_operations",
  "export_import",
  "custom",
]);
const START_WINDOWS = new Set(["asap", "this_quarter", "this_year", "exploring"]);
const FUNNEL_EVENTS = new Set([
  "business_page_view",
  "business_cta_clicked",
  "business_lead_started",
  "business_lead_submitted",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUCCESS_MESSAGE =
  "Recebemos seu pedido. O time comercial do Longyu responde em breve.";

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://singular-meringue-7838cd.netlify.app";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function canonicalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { error: "Missing Supabase env" }, 500);
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const kind = String(body.kind ?? "lead");
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (kind === "funnel") {
      const event = String(body.event ?? "");
      if (!FUNNEL_EVENTS.has(event)) {
        return json(req, { ok: false, error: "invalid_event" }, 400);
      }
      const ctaId = clip(body.ctaId, 64) || null;
      const { error } = await admin.from("business_funnel_events").insert({
        event_name: event,
        cta_id: ctaId,
      });
      if (error) {
        console.error("business funnel insert", error.message);
        return json(req, { ok: false, error: "Falha temporária." }, 503);
      }
      return json(req, { ok: true });
    }

    const honeypot = clip(body.website ?? body.company_website, 200);
    const firstName = clip(body.firstName, 80);
    const lastName = clip(body.lastName, 80);
    const nameFromParts = clip(`${firstName} ${lastName}`, 160);
    const name = clip(body.name, 160) || nameFromParts;
    const workEmailRaw = clip(body.workEmail, 254).toLowerCase();
    const workEmailKey = canonicalizeEmail(workEmailRaw);
    const company = clip(body.company, 160);
    const jobTitle = clip(body.jobTitle, 120);
    const employeeCountRange = clip(body.employeeCountRange, 32);
    const country = clip(body.country, 80);
    const goal = clip(body.goal, 64);
    const startWindow = clip(body.startWindow, 32);
    const message = clip(body.message, 4000);
    const sourceCta = clip(body.sourceCta, 64);

    const ip = clientIp(req);
    const ipHash = await sha256Hex(ip);
    const emailHash = await sha256Hex(workEmailKey || "empty");
    const { data: rateData, error: rateError } = await admin.rpc(
      "check_and_record_business_lead_rate",
      { p_ip_hash: ipHash, p_email_hash: emailHash },
    );
    if (rateError) {
      console.error("business lead rate rpc", rateError.message);
      return json(req, { error: "Falha temporária. Tente novamente." }, 503);
    }
    const allowed = Boolean((rateData as { allowed?: boolean } | null)?.allowed);
    if (!allowed) {
      return json(
        req,
        {
          ok: false,
          code: "rate_limited",
          error: "Muitos envios deste endereço. Tente de novo em alguns minutos.",
        },
        429,
      );
    }

    // Honeypot preenchido: responde sucesso e não grava o lead.
    if (honeypot) {
      return json(req, { ok: true, message: SUCCESS_MESSAGE });
    }

    if (name.length < 3) {
      return json(req, { ok: false, error: "Informe nome e sobrenome." }, 400);
    }
    if (!EMAIL_RE.test(workEmailRaw)) {
      return json(req, { ok: false, error: "Informe um e-mail de trabalho válido." }, 400);
    }
    if (company.length < 2) {
      return json(req, { ok: false, error: "Informe o nome da empresa." }, 400);
    }
    if (jobTitle.length < 2) {
      return json(req, { ok: false, error: "Informe o cargo." }, 400);
    }
    if (!EMPLOYEE_COUNTS.has(employeeCountRange)) {
      return json(req, { ok: false, error: "Faixa de colaboradores inválida." }, 400);
    }
    if (country.length < 2) {
      return json(req, { ok: false, error: "Informe o país." }, 400);
    }
    if (!GOALS.has(goal)) {
      return json(req, { ok: false, error: "Objetivo inválido." }, 400);
    }
    if (!START_WINDOWS.has(startWindow)) {
      return json(req, { ok: false, error: "Prazo de início inválido." }, 400);
    }

    const { error: insertError } = await admin.from("business_leads").insert({
      name,
      work_email: workEmailRaw,
      company,
      job_title: jobTitle,
      employee_count_range: employeeCountRange,
      country,
      goal,
      start_window: startWindow,
      message: message || null,
      source_cta: sourceCta || null,
      status: "new",
    });
    if (insertError) {
      console.error("business lead insert", insertError.message);
      return json(req, { ok: false, error: "Falha temporária. Tente novamente." }, 503);
    }

    await admin.from("business_funnel_events").insert({
      event_name: "business_lead_submitted",
      cta_id: sourceCta || "form",
    });

    return json(req, { ok: true, message: SUCCESS_MESSAGE });
  } catch (error) {
    console.error("submit-business-lead", error);
    return json(req, { error: "Falha temporária. Tente novamente." }, 500);
  }
});
