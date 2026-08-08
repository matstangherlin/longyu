import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const migrationsDir = path.join(root, "supabase", "migrations");
const migrationName = fs
  .readdirSync(migrationsDir)
  .find((name) => name.endsWith("_secure_social_profile_boundary.sql"));

const failures = [];
const assert = (condition, message) => {
  if (condition) console.log(`ok: ${message}`);
  else failures.push(message);
};

assert(Boolean(migrationName), "migration secure_social_profile_boundary existe");

const migration = migrationName
  ? fs.readFileSync(path.join(migrationsDir, migrationName), "utf8")
  : "";
const socialService = fs.readFileSync(
  path.join(root, "src", "services", "socialService.ts"),
  "utf8"
);
const rlsSmoke = fs.readFileSync(
  path.join(root, "scripts", "test-rls-smoke.mjs"),
  "utf8"
);

assert(
  /drop policy if exists "profiles_select_social" on public\.profiles;/i.test(migration),
  "policy cross-user da tabela profiles e removida"
);
assert(
  !/create policy "profiles_select_social"/i.test(migration),
  "migration nao recria leitura cross-user na tabela-base"
);
assert(
  /revoke all privileges on table public\.public_profiles from public, anon, authenticated/i.test(
    migration
  ),
  "view historica nao fica diretamente acessivel pela Data API"
);

for (const fn of [
  "search_public_profiles",
  "get_public_profile_by_username",
  "get_public_profiles_by_ids",
]) {
  assert(
    migration.includes(`function public.${fn}(`),
    `${fn} existe como API social curada`
  );
}

for (const field of [
  "birth_date",
  "phone",
  "country",
  "signup_source",
  "marketing_opt_in",
  "pedagogy_analytics_consent",
]) {
  assert(!migration.includes(field), `RPCs sociais nao retornam ${field}`);
}

assert(
  (migration.match(/auth\.uid\(\) is not null/gi) ?? []).length >= 3,
  "todas as RPCs exigem usuario autenticado dentro do SECURITY DEFINER"
);
assert(
  (migration.match(/set search_path = ''/gi) ?? []).length >= 3,
  "RPCs privilegiadas usam search_path vazio"
);
assert(
  migration.includes("length(trim(coalesce(search_query, ''))) between 2 and 48"),
  "busca vazia ou excessiva nao permite enumeracao ampla"
);
assert(
  migration.includes("p.show_in_search = true") &&
    migration.includes("f.follower_id = auth.uid()") &&
    migration.includes("f.following_id = auth.uid()"),
  "visibilidade considera opt-in e relacoes sociais legitimas"
);
assert(
  migration.includes("coalesce(cardinality(target_user_ids), 0) between 1 and 100"),
  "batch de perfis tem limite de cardinalidade"
);
assert(
  /revoke execute on function %s from public, anon, authenticated/i.test(migration) &&
    /grant execute on function %s to authenticated/i.test(migration),
  "ACL das RPCs e fechada e reaberta apenas para authenticated"
);

assert(
  socialService.includes('"get_public_profiles_by_ids"'),
  "frontend usa RPC curada para listas sociais"
);
assert(
  !socialService.includes('.from("public_profiles")'),
  "frontend nao consulta diretamente a view publica"
);
assert(
  rlsSmoke.includes('.from("profiles")') &&
    rlsSmoke.includes('.select("*")') &&
    rlsSmoke.includes("seguir B nao libera nenhuma coluna do perfil-base"),
  "smoke RLS cobre select-* antes e depois de criar relacao social"
);
assert(
  rlsSmoke.includes("perfil oculto de B nao aparece por lookup direto") &&
    rlsSmoke.includes("busca social retorna somente colunas publicas"),
  "smoke cobre privacidade de busca e resposta curada"
);

if (failures.length) {
  console.error("validate:social-profile-security FALHOU:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: tabela profiles privada; leitura social somente por RPCs curadas.");
