#!/usr/bin/env node
/**
 * Mutações da disputa do último assento.
 *
 * Duas delas não saíram de leitura de código.
 *
 * SEAT_ENFORCER_NOT_VOLATILE: com Postgres 16 rodando de verdade, duas
 * transações disputaram o último assento de uma licença de seis. A segunda foi
 * recusada com "BUSINESS_SEATS_FULL: 7 reservados, licenca e 6" e a empresa
 * terminou com 6/6. Isso só acontece porque a função é VOLATILE e pega
 * snapshot novo depois do advisory lock.
 *
 * FIELD_GUARD_COLLAPSED: a primeira versão do trigger usava uma condição só
 * para as duas tabelas. Gravar um membro estourava com "record new has no
 * field status", porque o PL/pgSQL avalia o acesso ao campo mesmo quando o
 * ramo é falso — e organization_members chama o campo de seat_status. Só
 * apareceu ao executar.
 */
import assert from "node:assert/strict";
import { validateBusinessSeatConcurrency } from "./lib/v410a1-gates.mjs";
import { businessMigrationSource } from "./lib/v410a1-sources.mjs";

const migrationSource = businessMigrationSource();

assert.deepEqual(
  validateBusinessSeatConcurrency({ migrationSource }).failures,
  [],
  "controle positivo: a migration real precisa passar"
);

const mutations = [
  [
    "gravação de membro sai do limite",
    migrationSource.replace("create constraint trigger organization_members_seat_limit", "-- removido"),
    "NO_MEMBER_SEAT_TRIGGER",
  ],
  [
    "convite sai do limite",
    migrationSource.replace("create constraint trigger organization_invites_seat_limit", "-- removido"),
    "NO_INVITE_SEAT_TRIGGER",
  ],
  [
    "trigger vira STABLE e a corrida volta",
    migrationSource.replace(
      "create or replace function public.enforce_organization_seat_limit()\nreturns trigger\nlanguage plpgsql",
      "create or replace function public.enforce_organization_seat_limit()\nreturns trigger\nlanguage plpgsql\nstable"
    ),
    "SEAT_ENFORCER_NOT_VOLATILE",
  ],
  [
    "escrita deixa de ser serializada",
    migrationSource.replace("perform pg_advisory_xact_lock(hashtextextended(v_org_id::text, 0));", ""),
    "NO_SEAT_LOCK",
  ],
  [
    "recusa perde o errcode",
    migrationSource.replace("      using errcode = 'check_violation';", "      ;"),
    "NO_SEAT_ERROR_CODE",
  ],
  [
    "os dois ramos viram uma condição só",
    migrationSource.replace(
      /  if tg_table_name = 'organization_members' then[\s\S]*?  end if;\n/,
      "  if new.seat_status not in ('active', 'invited') and new.status is distinct from 'pending' then\n    return new;\n  end if;\n"
    ),
    "FIELD_GUARD_COLLAPSED",
  ],
];

for (const [label, mutated, expected] of mutations) {
  const codes = validateBusinessSeatConcurrency({ migrationSource: mutated }).failures.map(
    (failure) => failure.code
  );
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

console.log("PASS test:business-seat-concurrency");
