import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./env-local.mjs";

/** Edge Functions necessárias ao fluxo real (staging + deploy backend). */
export const LONGYU_EDGE_FUNCTIONS = [
  "create-account",
  "commit-placement",
  "finalize-onboarding",
  "submit-business-lead",
  "create-checkout-session",
  "create-billing-portal",
  "stripe-webhook",
  "delete-account",
  "issue-anon-ingestion-session",
];

export function readSupabaseConfig() {
  return fs.readFileSync(path.join(projectRoot(), "supabase/config.toml"), "utf8");
}

/** Default da CLI: verify_jwt = true se o bloco não existir. */
export function verifyJwtForSlug(slug, configText = readSupabaseConfig()) {
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = configText.match(
    new RegExp(`\\[functions\\.${escaped}\\][\\s\\S]*?(?=\\n\\[|$)`)
  );
  if (!block) return true;
  const match = block[0].match(/verify_jwt\s*=\s*(true|false)/i);
  return match ? match[1].toLowerCase() === "true" : true;
}

export function edgeFunctionCatalog(configText = readSupabaseConfig()) {
  return LONGYU_EDGE_FUNCTIONS.map((slug) => ({
    slug,
    verify_jwt: verifyJwtForSlug(slug, configText),
  }));
}
