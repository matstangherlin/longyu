/**
 * Smoke HTTP do create-account (anti-enumeração + resposta genérica).
 * Usa VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY de .env.local quando presentes.
 * Sem credenciais: exit 0 com skip (não quebra CI offline).
 */
import process from "node:process";
import { mergedEnv } from "./lib/env-local.mjs";

const env = mergedEnv();
const url = String(env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const anon = String(env.VITE_SUPABASE_ANON_KEY ?? "");

if (!url || !anon) {
  console.log("SKIP: test:create-account-hardening — sem VITE_SUPABASE_URL/ANON_KEY");
  process.exit(0);
}

const endpoint = `${url}/functions/v1/create-account`;
const genericSnippet = "Se o endereço puder ser utilizado";

async function invoke(body, extraHeaders = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
      Origin: "http://localhost:5173",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { status: response.status, json, text };
}

const errors = [];

// Conta conhecida (seed QA) — sem captcha: deve falhar com captcha_failed
// (Turnstile enforced via Vault) OU, se secret ausente, responder genérico.
{
  const { status, json, text } = await invoke({
    email: "teste@longyu.app",
    password: "WrongPassForEnumCheck1!",
    displayName: "Enum Check",
    emailRedirectTo: "https://evil.example/phish",
  });
  if (status === 400 && json?.code === "captcha_failed") {
    console.log("OK: create-account exige Turnstile (captcha_failed sem token).");
  } else {
    if (status !== 200) errors.push(`existing email HTTP ${status}: ${text.slice(0, 200)}`);
    if (!json?.ok || !json?.pendingConfirmation) {
      errors.push(`existing email sem pending genérico: ${text.slice(0, 200)}`);
    }
    if (json?.code === "already_exists" || /already_exists/i.test(text)) {
      errors.push("existing email vazou already_exists");
    }
    if (!String(json?.message ?? "").includes(genericSnippet)) {
      errors.push("existing email sem mensagem genérica");
    }
    if (json?.userId) errors.push("existing email não deveria retornar userId");
  }
}

// Redirect maligno + sem captcha: captcha_failed (enforced) ou ok genérico (dev).
{
  const email = `harden-live-${Date.now()}@example.com`;
  const { status, json, text } = await invoke({
    email,
    password: "ProbeTest1234!",
    displayName: "Harden Live",
    emailRedirectTo: "https://evil.example/steal",
  });
  if (status === 400 && json?.code === "captcha_failed") {
    // Turnstile ligado — esperado em produção.
  } else if (![200, 429].includes(status)) {
    errors.push(`new signup HTTP ${status}: ${text.slice(0, 200)}`);
  } else if (status === 200) {
    if (!json?.ok || !json?.pendingConfirmation) {
      errors.push(`new signup sem pending: ${text.slice(0, 200)}`);
    }
    if (!String(json?.message ?? "").includes(genericSnippet)) {
      errors.push("new signup sem mensagem genérica");
    }
  }
}

if (errors.length) {
  console.error("test:create-account-hardening FALHOU:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:create-account-hardening — anti-enumeração e mensagem genérica.");
