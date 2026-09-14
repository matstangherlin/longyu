#!/usr/bin/env node
/**
 * Mutações da experiência Family.
 *
 * FAMILY_GRANTS_NOTHING é o estado real em que a V4.10A parou: tabelas, RLS,
 * trigger de assento e contrato TypeScript prontos, e aceitar o convite não
 * dava acesso a ninguém porque get_server_entitlement() não conhecia família.
 * Passou despercebido porque cada peça, isolada, estava certa.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validateFamilyExperience } from "./lib/v410a1-gates.mjs";
import { readSource } from "./lib/v410a1-sources.mjs";

const root = path.resolve(import.meta.dirname, "..");
const CLIENT_FILES = [
  "src/services/familyService.ts",
  "src/features/familia/FamilyPage.tsx",
  "src/features/familia/FamilyInvitePage.tsx",
];

const inviteFlowSource = readSource("supabase/migrations/20260914200000_family_invite_flow.sql");
const entitlementSource = readSource("supabase/migrations/20260914210000_family_entitlement.sql");
const clientSources = Object.fromEntries(
  CLIENT_FILES.filter((file) => fs.existsSync(path.join(root, file))).map((file) => [file, readSource(file)])
);

const base = { inviteFlowSource, entitlementSource, clientSources, requiredClientFiles: CLIENT_FILES };

assert.deepEqual(validateFamilyExperience(base).failures, [], "controle positivo");

const mutations = [
  [
    "aceitar convite volta a não conceder nada",
    { ...base, entitlementSource: entitlementSource.replaceAll("'family_membership'", "'none'") },
    "FAMILY_GRANTS_NOTHING",
  ],
  [
    "o token do convite passa a vir do cliente",
    { ...base, inviteFlowSource: inviteFlowSource.replace(/v_token :=[^;]*;/, "v_token := p_email;") },
    "TOKEN_NOT_SERVER_MINTED",
  ],
  [
    "o convite passa a guardar o token em claro",
    {
      ...base,
      inviteFlowSource: inviteFlowSource.replace(
        "encode(sha256(v_token::bytea), 'hex'), auth.uid(), v_expires",
        "v_token, auth.uid(), v_expires"
      ),
    },
    "TOKEN_NOT_HASHED",
  ],
  [
    "o aceite deixa o convite pendente e o link vira multiuso",
    {
      ...base,
      inviteFlowSource: inviteFlowSource.replace(
        "update public.family_invites set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()",
        "update public.family_invites set accepted_by = auth.uid(), accepted_at = now()"
      ),
    },
    "TOKEN_REUSABLE",
  ],
  [
    "o browser ganha escrita direta na tabela de convites",
    {
      ...base,
      inviteFlowSource: `${inviteFlowSource}\ncreate policy family_invites_insert on public.family_invites for insert to authenticated with check (true);`,
    },
    "CLIENT_WRITES_FAMILY",
  ],
  [
    "membro removido continua com acesso",
    { ...base, entitlementSource: entitlementSource.replace("and m.status = 'active'", "and m.status is not null") },
    "REMOVED_MEMBER_KEEPS_ACCESS",
  ],
  [
    "família passa a conceder Pro sem ninguém pagar",
    {
      ...base,
      entitlementSource: entitlementSource.replace(
        /\(\s*public\._user_stripe_pro_active\(f\.owner_user_id\)[\s\S]*?\)\n/,
        "(true)\n"
      ),
    },
    "FREE_FAMILY_GRANTS_PRO",
  ],
  [
    "a economia deixa de enxergar o Pro de família",
    {
      ...base,
      entitlementSource: entitlementSource.replace(
        "      or exists (select 1 from public._user_family_entitlement(p_user_id));",
        "      ;"
      ),
    },
    "ECONOMY_IGNORES_FAMILY",
  ],
  [
    "a tela volta a consultar a tabela direto",
    {
      ...base,
      clientSources: { ...clientSources, "src/features/familia/FamilyPage.tsx": 'supabase.from("family_invites").select("*")' },
    },
    "CLIENT_QUERIES_FAMILY_TABLES",
  ],
  [
    "a tela de aceite some",
    {
      ...base,
      clientSources: Object.fromEntries(
        Object.entries(clientSources).filter(([file]) => !file.includes("FamilyInvitePage"))
      ),
    },
    "MISSING_FAMILY_SCREEN",
  ],
];

for (const [label, input, expected] of mutations) {
  const codes = validateFamilyExperience(input).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

console.log("PASS test:family-experience");
