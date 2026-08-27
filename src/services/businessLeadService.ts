import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import {
  isBusinessHoneypotTriggered,
  validateBusinessLead,
  type BusinessLeadDraft,
  type ValidatedBusinessLead,
} from "../lib/businessLead";
import { getTurnstileToken, turnstileSiteKey } from "../lib/turnstile";
import { getSupabaseClient } from "../lib/supabaseClient";
import { edgeOpsInit, noteOps } from "../lib/opsCorrelation";

export type BusinessLeadSubmitStatus =
  | "opened"
  | "error"
  | "not_implemented"
  | "rate_limited"
  | "captcha_failed";

export interface BusinessLeadSubmitResult {
  status: BusinessLeadSubmitStatus;
  message: string;
}

const SUCCESS_MESSAGE =
  "Recebemos seu pedido. O time comercial do Longyu responde em breve.";

const PREVIEW_MESSAGE =
  "O envio à equipe comercial fica ativo no site principal do Longyu. Aqui o formulário só valida os dados.";

function publicLeadError(body: { error?: string; message?: string } | null): string {
  const text = (body?.error || body?.message || "").trim();
  if (!text || /Failed to send|FunctionsHttpError|NetworkError|fetch/i.test(text)) {
    return "Não foi possível enviar. Tente de novo.";
  }
  return text;
}

async function readFunctionError(
  error: { context?: Response; message?: string } | null
): Promise<{ ok?: boolean; code?: string; error?: string; message?: string } | null> {
  if (!error) return null;
  try {
    const ctx = error.context;
    if (ctx && typeof ctx.json === "function") {
      return (await ctx.json()) as { ok?: boolean; code?: string; error?: string; message?: string };
    }
  } catch {
    // ignore
  }
  return { error: error.message };
}

export async function submitBusinessLead(
  draft: BusinessLeadDraft
): Promise<BusinessLeadSubmitResult> {
  const honeypot = isBusinessHoneypotTriggered(draft);
  const validated = honeypot ? { ok: true as const, value: null } : validateBusinessLead(draft);
  if (!validated.ok) {
    return { status: "error", message: "Revise os campos destacados e tente de novo." };
  }

  if (!isSupabaseBackendEnabled()) {
    return { status: "not_implemented", message: PREVIEW_MESSAGE };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { status: "not_implemented", message: PREVIEW_MESSAGE };
  }

  let captchaToken: string | null = null;
  if (turnstileSiteKey() && !honeypot) {
    try {
      captchaToken = await getTurnstileToken();
    } catch {
      captchaToken = null;
    }
    if (!captchaToken) {
      return {
        status: "captcha_failed",
        message: "Não foi possível validar o desafio de segurança. Tente de novo.",
      };
    }
  }

  const payload = honeypot
    ? {
        kind: "lead",
        website: draft.website,
        firstName: draft.firstName,
        lastName: draft.lastName,
        workEmail: draft.workEmail,
        company: draft.company,
        jobTitle: draft.jobTitle,
        employeeCountRange: draft.employeeCountRange,
        country: draft.country,
        goal: draft.goal,
        startWindow: draft.startWindow,
        message: draft.message,
        sourceCta: draft.sourceCta,
      }
    : { ...leadBody(validated.value!), captchaToken: captchaToken ?? undefined };

  const ops = edgeOpsInit("business_lead");
  const { data, error } = await client.functions.invoke<{
    ok?: boolean;
    code?: string;
    error?: string;
    message?: string;
  }>("submit-business-lead", { headers: ops.headers, body: payload });

  const body = data ?? (await readFunctionError(error));
  if (body?.code === "rate_limited") {
    noteOps("business_lead", ops.correlationId, "error", { code: "rate_limited" });
    return {
      status: "rate_limited",
      message: "Muitos envios deste endereço. Tente de novo em alguns minutos.",
    };
  }
  if (body?.code === "captcha_failed") {
    noteOps("business_lead", ops.correlationId, "error", { code: "captcha_failed" });
    return {
      status: "captcha_failed",
      message: "Não foi possível validar o desafio de segurança. Tente de novo.",
    };
  }
  if (error && !body?.ok) {
    noteOps("business_lead", ops.correlationId, "error", { code: "invoke_error" });
    return {
      status: "error",
      message: publicLeadError(body),
    };
  }
  noteOps("business_lead", ops.correlationId, "ok");
  return { status: "opened", message: body?.message || SUCCESS_MESSAGE };
}

function leadBody(value: ValidatedBusinessLead) {
  return {
    kind: "lead",
    website: "",
    name: value.name,
    workEmail: value.workEmail,
    company: value.company,
    jobTitle: value.jobTitle,
    employeeCountRange: value.employeeCountRange,
    country: value.country,
    goal: value.goal,
    startWindow: value.startWindow,
    message: value.message,
    sourceCta: value.sourceCta,
  };
}
