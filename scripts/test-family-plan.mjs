#!/usr/bin/env node
/**
 * Mutações 6–9 e 17 do contrato V4.10A, mais as do schema.
 *
 * A mutação SEAT_ENFORCER_NOT_VOLATILE merece nota: ela não saiu de leitura de
 * código. Com o Postgres 16 rodando localmente, duas transações disputando o
 * último assento foram executadas de verdade — a segunda foi recusada com
 * "FAMILY_FULL: 7 lugares ocupados, limite é 6" e a família terminou com 6.
 * Isso só funciona porque a função do trigger é VOLATILE e portanto pega
 * snapshot novo depois do advisory lock. Marcada STABLE, a segunda transação
 * não enxerga a linha recém-commitada e as duas passam.
 */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { validateFamilyPlanSchema, validateFamilySeats, loadSource } from "./lib/v410a-gates.mjs";

const root = path.resolve(import.meta.dirname, "..");
const temp = await mkdtemp(path.join(os.tmpdir(), "longyu-family-test-"));
const require = createRequire(import.meta.url);

const relative = "src/commercial/family.ts";
const familySource = await readFile(path.join(root, relative), "utf8");
const output = ts.transpileModule(familySource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  fileName: relative,
}).outputText;
const target = path.join(temp, "family.js");
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, output);
const family = require(target);

const migrationSource = loadSource("supabase/migrations/20260914120000_family_plan_foundation.sql");
const copySources = Object.fromEntries(
  ["src/locales/pt-BR.ts", "src/locales/en.ts"].map((file) => [file, loadSource(file)])
);

const seatBase = {
  maxMembers: family.FAMILY_MAX_MEMBERS,
  maxInvitees: family.FAMILY_MAX_INVITEES,
  familySource,
  copySources,
};

assert.deepEqual(validateFamilySeats(seatBase).failures, [], "controle positivo: assentos");
assert.deepEqual(validateFamilyPlanSchema({ migrationSource }).failures, [], "controle positivo: schema");

const seatMutations = [
  ["FAMILY_MAX_MEMBERS volta a 5", { ...seatBase, maxMembers: 5 }, "FAMILY_MAX_NOT_SIX"],
  ["convidados viram 4", { ...seatBase, maxInvitees: 4 }, "FAMILY_INVITEES_NOT_FIVE"],
  [
    "convite pendente deixa de ocupar lugar",
    { ...seatBase, familySource: familySource.replaceAll("pendingInvites", "ignorado") },
    "PENDING_INVITE_FREE_SEAT",
  ],
  [
    "copy promete 5 contas",
    { ...seatBase, copySources: { "src/locales/pt-BR.ts": 'const x = "Você e mais 5 pessoas";' } },
    "COPY_SAYS_FIVE",
  ],
];

for (const [label, input, expectedCode] of seatMutations) {
  const codes = validateFamilySeats(input).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expectedCode),
    `mutação "${label}" não detectada (esperado ${expectedCode}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expectedCode}`);
}

const schemaMutations = [
  [
    "limite do servidor volta a 5",
    migrationSource.replace("as $$ select 6; $$", "as $$ select 5; $$"),
    "SERVER_LIMIT_NOT_SIX",
  ],
  [
    "trigger de assento em participações some",
    migrationSource.replaceAll("create constraint trigger family_memberships_seat_limit", "-- removido"),
    "NO_SEAT_TRIGGER",
  ],
  [
    "trigger de assento em convites some",
    migrationSource.replaceAll("create constraint trigger family_invites_seat_limit", "-- removido"),
    "NO_INVITE_SEAT_TRIGGER",
  ],
  [
    "trigger de assento vira STABLE e a corrida volta",
    migrationSource.replace(
      "create or replace function public.enforce_family_seat_limit()\nreturns trigger\nlanguage plpgsql",
      "create or replace function public.enforce_family_seat_limit()\nreturns trigger\nlanguage plpgsql\nstable"
    ),
    "SEAT_ENFORCER_NOT_VOLATILE",
  ],
  [
    "convite pendente deixa de contar no servidor",
    migrationSource.replace(/and i\.status = 'pending'/, "and i.status = 'accepted'"),
    "PENDING_INVITE_FREE_SEAT",
  ],
  [
    "convite passa a guardar token em claro",
    migrationSource.replace("token_hash text not null unique", "token text not null unique"),
    "PLAINTEXT_TOKEN",
  ],
  [
    "a coluna de hash some inteira",
    migrationSource.replaceAll("token_hash", "identificador"),
    "NO_TOKEN_HASH",
  ],
  [
    "convite perde a expiração",
    migrationSource.replaceAll("expires_at", "sem_prazo"),
    "NO_INVITE_EXPIRY",
  ],
  [
    "convite deixa de poder ser revogado",
    migrationSource.replaceAll("'revoked'", "'cancelado_nao_revogavel'"),
    "NO_INVITE_REVOKE",
  ],
  [
    "RLS desligada nas participações",
    migrationSource.replace("alter table public.family_memberships enable row level security;", ""),
    "RLS_DISABLED",
  ],
  [
    "família passa a carregar progresso do membro",
    migrationSource.replace(
      "  joined_at timestamptz,\n  created_at timestamptz not null default now(),\n  primary key (family_id, user_id)",
      "  joined_at timestamptz,\n  progress jsonb,\n  created_at timestamptz not null default now(),\n  primary key (family_id, user_id)"
    ),
    "FAMILY_TOUCHES_PROGRESS",
  ],
];

for (const [label, mutated, expectedCode] of schemaMutations) {
  const codes = validateFamilyPlanSchema({ migrationSource: mutated }).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expectedCode),
    `mutação "${label}" não detectada (esperado ${expectedCode}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expectedCode}`);
}

// Mutações 7 e 8 do contrato, direto no comportamento e não no texto.
function membership(familyId, userId, role = "member") {
  return { familyId, userId, role, status: "active", joinedAt: 1 };
}
let account = {
  id: "fam",
  ownerUserId: "owner",
  memberships: [membership("fam", "owner", "owner")],
};
for (const userId of ["u1", "u2", "u3", "u4", "u5"]) {
  account = family.addFamilyMember(account, membership("fam", userId));
}
assert.equal(family.activeFamilyMembers(account).length, 6, "dono + 5 convidados precisa ser aceito");
assert.throws(() => family.addFamilyMember(account, membership("fam", "u6")), /limit/i, "sexto convidado é recusado");
console.log("KILLED owner + 5 convidados recusado / owner + 6 aceito: FAMILY_FULL");

// Convite pendente reserva lugar também no contrato do cliente.
assert.equal(family.familySeatUsage({ activeMembers: 4, pendingInvites: 2 }).full, true);
assert.equal(family.familySeatUsage({ activeMembers: 4, pendingInvites: 1 }).remaining, 1);
assert.throws(
  () => family.assertCanInviteToFamily({ activeMembers: 3, pendingInvites: 3 }),
  /FAMILY_FULL|limit/i,
  "convite além dos seis lugares precisa ser recusado"
);
console.log("OK convite pendente reserva lugar no contrato do cliente");

console.log("PASS test:family-plan");
