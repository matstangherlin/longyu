#!/usr/bin/env node
/**
 * Preflight somente OPTIONS. Sem apikey, sem corpo, sem outro método.
 *   SUPABASE_URL=https://<ref>.supabase.co npm run smoke:edge-preflight
 *   node scripts/smoke-edge-preflight.mjs --self-test
 */
import process from "node:process";

const REQUIRED = ["x-longyu-correlation-id", "x-longyu-session-id", "x-longyu-op"];
const FUNCTIONS = [
  "delete-account",
  "create-checkout-session",
  "create-billing-portal",
  "issue-anon-ingestion-session",
  "create-account",
  "sign-in-identifier",
  "triage-feedback",
  "finalize-onboarding",
  "commit-placement",
  "submit-business-lead",
];
const DEFAULT_ORIGIN = "https://singular-meringue-7838cd.netlify.app";

export function assertOptionsOnly(method) {
  if (String(method).toUpperCase() !== "OPTIONS") {
    throw new Error(`smoke:edge-preflight recusa ${method}`);
  }
}

export function classifyPreflight(status, allowHeaders) {
  if (status === 404) return "not_published";
  if (status >= 200 && status < 300) {
    const allow = String(allowHeaders || "").toLowerCase();
    return REQUIRED.every((name) => allow.includes(name)) ? "ok" : "cors_broken";
  }
  return "unexpected";
}

function selfTest() {
  let failed = false;
  const check = (name, cond) => {
    if (cond) console.log(`ok: ${name}`);
    else {
      failed = true;
      console.error(`FALHOU: ${name}`);
    }
  };
  check("200 com os três headers é ok", classifyPreflight(200, REQUIRED.join(", ")) === "ok");
  check("200 sem x-longyu-op é CORS quebrado", classifyPreflight(200, "authorization, x-longyu-correlation-id, x-longyu-session-id") === "cors_broken");
  check("404 é função não publicada", classifyPreflight(404, "") === "not_published");
  try {
    assertOptionsOnly("POST");
    check("POST é recusado", false);
  } catch (error) {
    check("POST é recusado", /recusa POST/.test(error.message));
  }
  if (failed) process.exit(1);
  console.log("OK: smoke:edge-preflight self-test");
}

async function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  const base = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  if (!base) {
    console.error("smoke:edge-preflight exige SUPABASE_URL. Não usa chave.");
    process.exit(1);
  }
  const origin = process.env.LONGYU_PREFLIGHT_ORIGIN || DEFAULT_ORIGIN;
  const rows = [];
  for (const name of FUNCTIONS) {
    assertOptionsOnly("OPTIONS");
    const response = await fetch(`${base}/functions/v1/${name}`, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": `authorization, content-type, ${REQUIRED.join(", ")}`,
      },
    });
    const allow = response.headers.get("access-control-allow-headers");
    const state = classifyPreflight(response.status, allow);
    rows.push({ name, status: response.status, state });
    console.log(`${state.padEnd(14)} ${response.status}  ${name}`);
  }
  const broken = rows.filter((row) => row.state === "cors_broken" || row.state === "unexpected");
  if (broken.length) process.exit(1);
}

const invoked = process.argv[1] && process.argv[1].endsWith("smoke-edge-preflight.mjs");
if (invoked) main();
