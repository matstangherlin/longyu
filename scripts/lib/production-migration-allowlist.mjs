/**
 * Single-file production migrations allowed through apply:production-migration.
 * Pending paths stay outside supabase/migrations/ so rehearsal/db:apply-api never
 * picks them up. Remote names use underscores (Management API).
 */
export const PRODUCTION_MIGRATION_ALLOWLIST = Object.freeze({
  "rc2-3-10-league-memberships-policy-recursion": {
    file: "supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql",
    remoteName: "rc2_3_10_league_memberships_policy_recursion",
    readyPath: "docs/launch/rc2-3-10c-batch-a-ready.json",
    batch: "A",
  },
});

export function lookupProductionMigration(migrationId) {
  return PRODUCTION_MIGRATION_ALLOWLIST[migrationId] ?? null;
}
