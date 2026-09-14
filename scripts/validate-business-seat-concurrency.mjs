#!/usr/bin/env node
/**
 * validate:business-seat-concurrency — P3.
 *
 * Duas requisições simultâneas passam pelas duas checagens feitas antes da
 * escrita. O que resolve é servidor: advisory lock por organização e função de
 * trigger VOLATILE, para que a segunda transação pegue snapshot novo depois do
 * lock. Marcada STABLE, as duas passam — foi medido em Postgres real.
 */
import { validateBusinessSeatConcurrency } from "./lib/v410a1-gates.mjs";
import { businessMigrationSource } from "./lib/v410a1-sources.mjs";

const { failures } = validateBusinessSeatConcurrency({ migrationSource: businessMigrationSource() });

if (failures.length > 0) {
  console.error(`validate:business-seat-concurrency falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.message}`);
  process.exit(1);
}

console.log(
  "OK: validate:business-seat-concurrency — constraint trigger nas duas tabelas, advisory lock por organização, " +
    "função volátil e ramos separados por tg_table_name."
);
