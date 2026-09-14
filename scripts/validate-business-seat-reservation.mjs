#!/usr/bin/env node
/**
 * validate:business-seat-reservation — REGRA 6.
 *
 * Antes desta versão dez convites cabiam numa empresa com cinco vagas: a
 * contagem só olhava `seat_status='active'`, e o limite estourava quando todos
 * aceitassem. O gate protege a correção, não o número.
 */
import { validateBusinessSeatReservation } from "./lib/v410a1-gates.mjs";
import { businessMigrationSource } from "./lib/v410a1-sources.mjs";

const { failures } = validateBusinessSeatReservation({ migrationSource: businessMigrationSource() });

if (failures.length > 0) {
  console.error(`validate:business-seat-reservation falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.message}`);
  process.exit(1);
}

console.log(
  "OK: validate:business-seat-reservation — ativos, convidados e convites pendentes válidos ocupam lugar; " +
    "vencido e revogado liberam; organization_active_seat_count continua contando só ativos."
);
