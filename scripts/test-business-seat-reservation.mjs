#!/usr/bin/env node
/**
 * Mutações da reserva de assento.
 *
 * A primeira delas é o estado do mundo antes desta versão: contar só `active`.
 * O gate precisa recusar exatamente esse código, porque ele parecia correto e
 * estava em produção.
 */
import assert from "node:assert/strict";
import { validateBusinessSeatReservation } from "./lib/v410a1-gates.mjs";
import { businessMigrationSource } from "./lib/v410a1-sources.mjs";

const migrationSource = businessMigrationSource();

assert.deepEqual(
  validateBusinessSeatReservation({ migrationSource }).failures,
  [],
  "controle positivo: a migration real precisa passar"
);

const mutations = [
  [
    "volta a contar só membros ativos",
    migrationSource.replace("m.seat_status in ('active', 'invited')", "m.seat_status = 'active'"),
    "INVITED_MEMBER_FREE_SEAT",
  ],
  [
    "convite pendente deixa de ocupar lugar",
    migrationSource.replace("and i.status = 'pending'\n        and i.expires_at > now()", "and i.status = 'accepted'"),
    "PENDING_INVITE_FREE_SEAT",
  ],
  [
    "convite vencido continua segurando assento",
    migrationSource.replace("and i.expires_at > now()", ""),
    "EXPIRED_INVITE_RESERVES",
  ],
  [
    "a contagem de reservados some",
    migrationSource.replaceAll("organization_reserved_seat_count", "organization_active_seat_count"),
    "NO_RESERVED_COUNT",
  ],
  [
    "a guarda volta a comparar só os ativos",
    migrationSource.replace(
      "  select public.organization_reserved_seat_count(p_org_id)\n      <= public.organization_seat_entitlement(p_org_id);",
      "  select public.organization_active_seat_count(p_org_id)\n      <= public.organization_seat_entitlement(p_org_id);"
    ),
    "GUARD_USES_ACTIVE_ONLY",
  ],
  [
    "organization_active_seat_count muda de significado",
    `${migrationSource}\ncreate or replace function public.organization_active_seat_count(p_org_id uuid)\nreturns integer language sql stable as $$ select 0; $$;`,
    "ACTIVE_COUNT_REDEFINED",
  ],
];

for (const [label, mutated, expected] of mutations) {
  const codes = validateBusinessSeatReservation({ migrationSource: mutated }).failures.map(
    (failure) => failure.code
  );
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

console.log("PASS test:business-seat-reservation");
