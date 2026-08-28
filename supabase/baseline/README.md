# Canonical schema baseline (V4.7.7)

This directory holds the **reconstructed** Longyu backend schema from
`supabase/migrations` on an ephemeral stack. It is **not** a dump of
MandarimProject (`drjcfalvlbbeblmmyhwj`) and it is **not** applied to production.

## What to generate

With a local/CI `supabase start` already up:

```bash
node scripts/dump-canonical-schema.mjs
```

or as part of:

```bash
npm run rehearse:backend-contract
```

Outputs (gitignored; CI uploads them as artifacts):

- `canonical-schema.json` — tables, columns, indexes, policies, functions, grants
- `LONGYU_BACKEND_SCHEMA_HASH` — sha256 of the normalized JSON payload

## Freeze vs dump

- **Migration freeze:** `docs/backend/migration-manifest.json` hashes every SQL file.
  Editing a frozen file without updating the manifest fails `test:backend-contract`.
- **Schema dump hash:** `LONGYU_BACKEND_SCHEMA_HASH` is the live catalog after
  `supabase db reset`. It is the audit artifact for “can we reproduce this backend.”

Do not copy these files into MandarimProject. Do not treat a matching hash as
authorization to apply pending `NOT_YET_DEPLOYED` migrations.
