/**
 * Smoke HTTP do create-account (anti-enumeração + resposta genérica).
 *
 * IMPORTANTE — bounce de e-mail Supabase:
 * Não cria usuários novos nem dispara confirmation mail em produção.
 * Probes que criariam conta (@example.com) só rodam se
 * ALLOW_LIVE_USER_CREATE_PROBES=1 (dev local consciente).
 *
 * Usa VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (.env.local / env).
 * Sem credenciais: exit 0 com skip.
 */
import process from "node:process";
import { mergedEnv } from "./lib/env-local.mjs";

const env = mergedEnv();
const url = String(env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const anon = String(env.VITE_SUPABASE_ANON_KEY ?? "");
const allowCreateProbes = String(process.env.ALLOW_LIVE_USER_CREATE_PROBES ?? "").trim() === "1";

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

// Conta conhecida (seed QA) — sem captcha:
// - Turnstile on  → captcha_failed (não reenvia e-mail)
// - Turnstile off → resposta genérica (pode reenviar p/ teste@longyu.app — e-mail real do seed)
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
    if (status === 200) {
      console.log("OK: anti-enum genérico (Turnstile pausado — sem criar conta nova).");
    }
  }
}

// Probe de signup novo: por padrão NÃO chama create com e-mail fresco
// (Turnstile pausado criaria usuário + auth.resend → bounce @example.com).
{
  if (!allowCreateProbes) {
    console.log(
      "SKIP: probe de e-mail novo (evita bounce). Para forçar: ALLOW_LIVE_USER_CREATE_PROBES=1"
    );
  } else {
    const email = `harden-live-${Date.now()}@example.com`;
    const { status, json, text } = await invoke({
      email,
      password: "ProbeTest1234!",
      displayName: "Harden Live",
      emailRedirectTo: "https://evil.example/steal",
    });

    if (status === 400 && json?.code === "captcha_failed") {
      console.log("OK: probe novo e-mail bloqueado por captcha (sem bounce).");
    } else if (status === 429 && json?.code === "rate_limited") {
      console.log("OK: probe novo e-mail rate-limited (sem criar conta).");
    } else if (status === 200 && json?.ok && json?.pendingConfirmation) {
      if (!String(json?.message ?? "").includes(genericSnippet)) {
        errors.push("new signup sem mensagem genérica");
      } else {
        console.log(`OK: signup probe (ALLOW_LIVE_USER_CREATE_PROBES=1) — apague ${email} depois.`);
      }
    } else {
      errors.push(`new signup HTTP ${status}: ${text.slice(0, 200)}`);
    }
  }
}

if (errors.length) {
  console.error("test:create-account-hardening FALHOU:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:create-account-hardening — anti-enumeração sem criar bounce.");
