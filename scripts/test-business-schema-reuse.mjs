#!/usr/bin/env node
/**
 * Mutações do gate de reuso de schema.
 *
 * Cada mutação aqui é um defeito que a spec original teria produzido se
 * seguida ao pé da letra. `seat_limit` em organizations, `member` como papel e
 * `canceled` como estado estavam todos escritos na V4.10A.1 antes da auditoria
 * do P0 mostrar que o banco já dizia outra coisa.
 */
import assert from "node:assert/strict";
import { validateBusinessSchemaReuse } from "./lib/v410a1-gates.mjs";
import { businessFoundationSource, businessMigrationSource } from "./lib/v410a1-sources.mjs";

const migrationSource = businessMigrationSource();
const foundationSource = businessFoundationSource();

assert.deepEqual(
  validateBusinessSchemaReuse({ migrationSource, foundationSource }).failures,
  [],
  "controle positivo: a migration real precisa passar"
);

const mutations = [
  [
    "tabela Business paralela nasce",
    `${migrationSource}\ncreate table if not exists public.business_members (id uuid primary key);`,
    "PARALLEL_TABLE",
  ],
  [
    "tabela nova qualquer aparece",
    `${migrationSource}\ncreate table if not exists public.organization_seat_audit (id uuid primary key);`,
    "NEW_TABLE",
  ],
  [
    "seat_limit volta para organizations",
    migrationSource.replace("add column if not exists timezone text;", "add column if not exists seat_limit integer;"),
    "SEAT_LIMIT_ON_ORGANIZATION",
  ],
  [
    "licença deixa de sair da assinatura",
    migrationSource.replace(/public\.organization_seat_entitlement\([^)]*\)/g, "5"),
    "LICENSE_NOT_FROM_ENTITLEMENT",
  ],
  [
    "billing_email recriado",
    migrationSource.replace(
      "add column if not exists contract_reference text;",
      "add column if not exists billing_email text;"
    ),
    "BILLING_EMAIL_DUPLICATED",
  ],
  [
    "'member' entra como papel",
    migrationSource.replaceAll("'manager'", "'member'"),
    "UNKNOWN_ROLE",
  ],
  [
    "estado paralelo em seat_status",
    migrationSource.replaceAll("'invited'", "'pending_member'"),
    "UNKNOWN_STATUS",
  ],
  [
    "'canceled' inventado",
    migrationSource.replaceAll("'removed'", "'canceled'"),
    "CANCELED_INVENTED",
  ],
  [
    // A assinatura tem vocabulário próprio, mas não é vale-tudo: um estado que
    // o Stripe não emite continua sendo recusado.
    "estado que a assinatura não tem",
    migrationSource.replace("s.status in ('trialing', 'active')", "s.status in ('pausada', 'active')"),
    "UNKNOWN_STATUS",
  ],
];

for (const [label, mutated, expected] of mutations) {
  const codes = validateBusinessSchemaReuse({
    migrationSource: mutated,
    foundationSource,
  }).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

console.log("PASS test:business-schema-reuse");
