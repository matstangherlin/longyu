import assert from "node:assert/strict";
import process from "node:process";
import {
  compareMigrations,
  coverageByUnion,
  extractStructuralSignature,
  isPlaceholderSql,
  normalizeSql,
  structuralHash,
} from "./lib/migration-semantic-reconcile.mjs";

const LARGE = `
-- hardening bundle
begin;

create or replace function public.claim_mission(p_user uuid, p_mission text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- grant once only
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.claim_mission(uuid, text) from public;
grant execute on function public.claim_mission(uuid, text) to authenticated;

create or replace function public.grant_story_energy(p_user uuid)
returns void
language sql
as $$ select 1 $$;

create index if not exists idx_missions_user on public.missions (user_id);
commit;
`;

const LARGE_REFORMATTED = `
/* hardening bundle, reformatted */
begin;
create or replace function public.claim_mission(
    p_user uuid,
    p_mission text
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
      return jsonb_build_object('ok',   true);
end;
$$;
REVOKE ALL ON FUNCTION public.claim_mission(uuid, text) FROM PUBLIC;;
GRANT EXECUTE ON FUNCTION public.claim_mission(uuid, text) TO authenticated;
create or replace function public.grant_story_energy(p_user uuid) returns void language sql as $$ select 1 $$;
create index if not exists idx_missions_user on public.missions(user_id);
commit;
`;

const ONE_FUNCTION = `
create or replace function public.claim_mission(p_user uuid, p_mission text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', true);
end;
$$;
`;

const SAME_NAME_OTHER_CONTENT = `
create table public.completely_unrelated (id uuid primary key, label text not null);
create policy "own rows" on public.completely_unrelated for select to authenticated using (id = auth.uid());
`;

const cases = [
  ["identical SQL is MATCH_EXACT", () => {
    const r = compareMigrations(LARGE, LARGE);
    assert.equal(r.status, "MATCH_EXACT");
    assert.equal(r.confidence, 1);
  }],
  ["whitespace and comment differences are MATCH_SEMANTIC", () => {
    const r = compareMigrations(LARGE, LARGE_REFORMATTED);
    assert.equal(r.status, "MATCH_SEMANTIC");
    assert.ok(r.confidence < 1 && r.confidence >= 0.9);
    assert.equal(structuralHash(LARGE), structuralHash(LARGE_REFORMATTED));
  }],
  ["a function extracted from a larger file is PARTIAL_EQUIVALENT in both directions", () => {
    const r = compareMigrations(ONE_FUNCTION, LARGE);
    assert.equal(r.status, "PARTIAL_EQUIVALENT");
    assert.equal(r.structuralDiff.subset, "a_subset_of_b");
    assert.equal(compareMigrations(LARGE, ONE_FUNCTION).structuralDiff.subset, "b_subset_of_a");
  }],
  ["placeholder SQL is UNKNOWN even against itself", () => {
    for (const placeholder of ["select 1;", "", "-- applied via execute_sql", "/* nothing */ ;"]) {
      assert.ok(isPlaceholderSql(placeholder), placeholder);
      assert.equal(compareMigrations(placeholder, LARGE).status, "UNKNOWN");
      assert.equal(compareMigrations(placeholder, placeholder).status, "UNKNOWN");
    }
    assert.ok(!isPlaceholderSql(ONE_FUNCTION));
  }],
  ["name-only similarity without structural overlap is UNKNOWN", () => {
    const r = compareMigrations(ONE_FUNCTION, SAME_NAME_OTHER_CONTENT);
    assert.equal(r.status, "UNKNOWN");
    assert.ok(r.confidence < 0.5);
  }],
  ["same function name with a different body is UNKNOWN, not equivalent", () => {
    const changed = ONE_FUNCTION.replace("'ok', true", "'ok', false");
    const r = compareMigrations(ONE_FUNCTION, changed);
    assert.equal(r.status, "UNKNOWN");
    assert.equal(r.structuralDiff.changed.length, 1);
  }],
  ["same objects in a different statement order are not claimed equivalent", () => {
    const a = "revoke all on table public.t from anon; grant select on table public.t to anon;";
    const b = "grant select on table public.t to anon; revoke all on table public.t from anon;";
    assert.equal(compareMigrations(a, b).status, "UNKNOWN");
  }],
  ["comment markers inside string literals are preserved", () => {
    assert.match(normalizeSql("select '-- not a comment'; -- real comment"), /'-- not a comment'/);
    assert.equal(normalizeSql("select  1 ;;\n;  select 2"), "select 1;\nselect 2;");
  }],
  ["signature covers tables, columns, policies, grants, types, triggers, views, extensions", () => {
    const sig = extractStructuralSignature(`
      create extension if not exists pgcrypto with schema extensions;
      create type public.mood as enum ('a', 'b');
      create table public.t (id uuid primary key default gen_random_uuid(), n int not null);
      alter table public.t add column if not exists extra text;
      alter table public.t enable row level security;
      create policy p on public.t for select to authenticated using (true);
      create trigger trg before insert on public.t for each row execute function public.f();
      create view public.v as select id from public.t;
      grant select on public.t to authenticated;
    `);
    const kinds = new Set(sig.map((o) => o.kind));
    for (const kind of ["extension", "type", "table", "column", "rls", "policy", "trigger", "view", "grant"]) assert.ok(kinds.has(kind), kind);
  }],
  ["union coverage reports objects missing from the pool", () => {
    const coverage = coverageByUnion(LARGE, [ONE_FUNCTION]);
    assert.ok(coverage.covered >= 1 && coverage.covered < coverage.total);
    assert.ok(coverage.missing.length > 0);
  }],
];

let failed = 0;
for (const [name, run] of cases) {
  try {
    run();
    console.log(`ok: ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL: ${name}\n  ${error.message}`);
  }
}
if (failed) {
  console.error(`${failed} of ${cases.length} migration-semantic-reconcile checks failed`);
  process.exit(1);
}
console.log(`migration-semantic-reconcile: ${cases.length} checks passed`);
