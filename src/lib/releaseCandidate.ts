/**
 * Identidade imutável da Release Candidate.
 *
 * QA posterior deve citar `LONGYU_RC_VERSION` **e** o SHA de `npm run rc:identity`.
 * Se o código do produto mudar, subir o sufixo (rc.1 → rc.2). Não reutilizar o
 * rótulo para HEADs diferentes.
 *
 * Os números abaixo são cópia explícita das fontes de verdade; `test:rc-hardening`
 * recusa drift.
 */
export const LONGYU_RC_VERSION = "v4.7.4-rc.1";
export const LONGYU_RC_CHANNEL = "closed-beta-hardening";
/** src/lib/placement/types.ts `PLACEMENT_VERSION`. */
export const EXPECTED_PLACEMENT_VERSION = 2;
/** src/lib/progressSnapshot.ts `PROGRESS_SNAPSHOT_SCHEMA_VERSION`. */
export const EXPECTED_PROGRESS_SCHEMA_VERSION = 1;
/** src/lib/store.ts persist `version`. */
export const EXPECTED_STORE_VERSION = 20;

export const EXPECTED_EDGE_FUNCTIONS = [
  "create-account",
  "commit-placement",
  "finalize-onboarding",
  "submit-business-lead",
  "create-checkout-session",
  "create-billing-portal",
  "stripe-webhook",
  "delete-account",
  "issue-anon-ingestion-session",
] as const;
