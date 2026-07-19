/**
 * Portão estático + espelho JS da whitelist/sanitize de eventos pedagógicos.
 * Cobertura de cenários: válido, metadata proibida, nested, tamanho, migration SQL.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

/** Espelho mínimo de sanitize_pedagogy_metadata (SQL). */
function sanitizePedagogyMetadata(eventType, metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const allowedByType = {
    lesson_started: ["appVersion"],
    lesson_completed: ["appVersion", "stars", "reason"],
    lesson_abandoned: ["appVersion", "reason"],
    exercise_answered: [
      "appVersion",
      "correct",
      "attempt",
      "stage",
      "responseTimeBucket",
      "imageId",
      "imageChoiceMode",
      "mode",
    ],
    exercise_mistake: [
      "appVersion",
      "correct",
      "attempt",
      "stage",
      "responseTimeBucket",
      "imageId",
      "imageChoiceMode",
      "mode",
    ],
    exercise_skipped: ["appVersion", "stage"],
    conversation_shown: ["appVersion", "sceneId", "intent", "variantLevel"],
    conversation_completed: [
      "appVersion",
      "sceneId",
      "intent",
      "variantLevel",
      "mistakes",
      "repeated",
    ],
    conversation_repeated: [
      "appVersion",
      "sceneId",
      "intent",
      "variantLevel",
      "mistakes",
      "repeated",
    ],
    conversation_error: [
      "appVersion",
      "sceneId",
      "intent",
      "variantLevel",
      "mistakes",
      "repeated",
    ],
    image_exercise_answered: ["appVersion", "imageId", "mode", "correct", "imageChoiceMode"],
  };
  const allowed = new Set(allowedByType[eventType] ?? ["appVersion"]);
  const out = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!allowed.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue;
    if (typeof value === "string") {
      out[key] = value.slice(0, 80);
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

function payloadTooLarge(meta) {
  return Buffer.byteLength(JSON.stringify(meta ?? {}), "utf8") > 2048;
}

// ——— Casos de teste espelhados ———
const valid = sanitizePedagogyMetadata("exercise_answered", {
  correct: true,
  attempt: 1,
  stage: "practice",
  responseTimeBucket: "0-2s",
  freeTextAnswer: "não deve passar",
  nested: { evil: true },
});
assert(valid.correct === true, "evento válido preserva correct");
assert(valid.attempt === 1, "evento válido preserva attempt");
assert(valid.freeTextAnswer === undefined, "metadata proibida removida");
assert(valid.nested === undefined, "objeto aninhado removido");

const conv = sanitizePedagogyMetadata("conversation_completed", {
  sceneId: "pedir-agua",
  intent: "request",
  variantLevel: "guided",
  mistakes: 1,
  password: "x",
});
assert(conv.sceneId === "pedir-agua", "conversation_completed mantém sceneId");
assert(conv.password === undefined, "password nunca passa na whitelist");

const img = sanitizePedagogyMetadata("image_exercise_answered", {
  imageId: "img-1",
  mode: "word_to_image",
  correct: false,
});
assert(img.imageId === "img-1" && img.mode === "word_to_image", "image_exercise whitelist");

const longStr = sanitizePedagogyMetadata("lesson_abandoned", {
  reason: "x".repeat(200),
});
assert(longStr.reason.length === 80, "strings limitadas a 80");

assert(payloadTooLarge({ blob: "y".repeat(3000) }), "payload > 2KB detectado");
assert(!payloadTooLarge({ correct: true, appVersion: "0.2.0" }), "payload pequeno ok");

// ——— Migration SQL ———
const mig = read("supabase/migrations/013_pedagogy_rpc_hardening.sql");
assert(mig.includes("beta_pedagogy_event_rate_limited"), "migration define rate limit geral");
assert(mig.includes("120"), "limite autenticado / minuto");
assert(mig.includes("3000"), "limite autenticado / dia");
assert(mig.includes("beta_pedagogy_event_type_rate_limited"), "rate limit por tipo");
assert(mig.includes("lesson_started"), "limite lesson_started");
assert(mig.includes("exercise_answered"), "limite exercise_answered");
assert(mig.includes("lesson_completed"), "limite lesson_completed");
assert(mig.includes("conversation_completed"), "limite conversation_completed");
assert(mig.includes("sanitize_pedagogy_metadata"), "whitelist sanitize");
assert(mig.includes("payload_too_large"), "limite de tamanho");
assert(mig.includes("client_context_digest"), "digest anônimo sem IP");
assert(!/client_ip|remote_addr|ip_address/i.test(mig), "não deve armazenar IP");
assert(mig.includes("issue_beta_pedagogy_anon_session"), "sessão anônima opcional");
assert(mig.includes("cleanup_beta_pedagogy_events"), "limpeza/retenção");
assert(mig.includes("beta_pedagogy_daily_metrics"), "métricas agregadas");
assert(mig.includes("p_client_context"), "RPC aceita client context");
assert(mig.includes("rate_limited"), "exceção rate_limited");
assert(mig.includes("event_rate_limited"), "exceção event_rate_limited");

// RLS: select admin only on raw events (já em 010) + metrics admin
assert(
  mig.includes("beta_pedagogy_daily_metrics_select_admin"),
  "admin pode ler agregados"
);
assert(
  !/create policy.*beta_pedagogy_events.*for insert/i.test(mig),
  "sem policy de insert direto em eventos"
);

// Cliente alinhado
const client = read("src/services/pedagogyEvents.ts");
assert(client.includes("p_client_context"), "cliente envia p_client_context");
assert(client.includes("pedagogyClientContext"), "cliente monta contexto UA resumido");
assert(client.includes("issue_beta_pedagogy_anon_session"), "cliente pode pedir sessão anônima");
assert(client.includes("payload_too_large"), "cliente descarta payload_too_large");
assert(client.includes("invalid_anon_session"), "cliente trata sessão anônima inválida");
assert(client.includes("fetchAdminPedagogyDailyMetrics"), "cliente lê agregados admin");
assert(client.includes("typeof value === \"object\""), "safeMetadata rejeita nested");

// Feedback não é limpo pela retenção pedagógica
assert(
  !/delete from public\.beta_feedback/i.test(mig),
  "cleanup pedagógico não apaga feedback manual"
);

if (errors.length) {
  console.error("ERRO: validate:pedagogy-rpc-hardening falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:pedagogy-rpc-hardening — rate limit, whitelist, retenção e cliente.");
