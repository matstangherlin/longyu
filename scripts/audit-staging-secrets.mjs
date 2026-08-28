/**
 * STG-008 — classifica secrets de staging sem imprimir valores.
 */
import process from "node:process";
import { mergedEnv } from "./lib/env-local.mjs";
import { V476_SECRET_CATALOG } from "./lib/v476-constants.mjs";
import {
  StagingGuardError,
  failClosed,
  isProductionProjectId,
} from "./lib/staging-guard.mjs";

function present(value) {
  return String(value ?? "").trim().length > 0;
}

function stripeClassification(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "MISSING";
  if (/^(sk|rk)_live_/i.test(raw)) return "LIVE_REFUSED";
  return "PRESENT";
}

function classify(entry, env) {
  const value = env[entry.name];
  if (entry.name === "STRIPE_SECRET_KEY") {
    const stripe = stripeClassification(value);
    if (stripe === "LIVE_REFUSED") {
      return { name: entry.name, status: "LIVE_REFUSED", kind: entry.kind };
    }
    if (stripe === "MISSING" && entry.kind === "test_mode_only") {
      return { name: entry.name, status: "MISSING", kind: entry.kind };
    }
    return { name: entry.name, status: stripe, kind: entry.kind };
  }
  if (!present(value)) {
    if (entry.kind === "optional" || entry.kind === "optional_until_public_signup") {
      return { name: entry.name, status: "NOT_REQUIRED", kind: entry.kind };
    }
    return { name: entry.name, status: "MISSING", kind: entry.kind };
  }
  return { name: entry.name, status: "PRESENT", kind: entry.kind };
}

try {
  const env = mergedEnv();
  const stagingId = String(env.LONGYU_STAGING_PROJECT_ID ?? "").trim();
  if (stagingId && isProductionProjectId(stagingId)) {
    throw new StagingGuardError("HARD FAIL: auditoria recusou MandarimProject.");
  }

  const rows = V476_SECRET_CATALOG.map((entry) => classify(entry, env));
  const liveRefused = rows.filter((row) => row.status === "LIVE_REFUSED");
  console.log("STG-008 secret classification (names only):");
  for (const row of rows) {
    console.log(`${row.name}=${row.status}`);
  }
  if (liveRefused.length) {
    throw new StagingGuardError(
      "STG-008 FAIL: Stripe Live recusado no staging. Use Test Mode."
    );
  }
  console.log("OK: STG-008 classificação sem valores.");
} catch (error) {
  failClosed(error);
}
