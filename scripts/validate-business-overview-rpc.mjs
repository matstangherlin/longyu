#!/usr/bin/env node
/**
 * validate:business-overview-rpc — REGRA 7 e P5.
 *
 * As funções internas de assento são service_role desde a V4.4.1. O painel não
 * ganha execute nelas: chama duas RPCs de shape mínimo que conferem o papel do
 * chamador naquela organização antes de ler qualquer coisa.
 */
import { validateBusinessOverviewRpc } from "./lib/v410a1-gates.mjs";
import { businessMigrationSource } from "./lib/v410a1-sources.mjs";

const { failures } = validateBusinessOverviewRpc({ migrationSource: businessMigrationSource() });

if (failures.length > 0) {
  console.error(`validate:business-overview-rpc falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.message}`);
  process.exit(1);
}

console.log(
  "OK: validate:business-overview-rpc — anônimo recebe UNAUTHENTICATED, quem não é gestor daquela organização " +
    "recebe FORBIDDEN, e nenhuma função interna de assento foi aberta para authenticated."
);
