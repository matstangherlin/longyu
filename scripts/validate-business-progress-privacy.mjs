#!/usr/bin/env node
/**
 * validate:business-progress-privacy — P5.3 e P17.2.
 *
 * O dono vê a conta, não a pessoa. Resposta livre, texto digitado, fala
 * transcrita, resposta de saúde, erro individual e snapshot bruto não são
 * filtrados no painel: eles não são lidos.
 */
import { validateBusinessProgressPrivacy } from "./lib/v410a1-gates.mjs";
import { businessClientSources, businessMigrationSource } from "./lib/v410a1-sources.mjs";

const { failures } = validateBusinessProgressPrivacy({
  migrationSource: businessMigrationSource(),
  clientSources: businessClientSources(),
});

if (failures.length > 0) {
  console.error(`validate:business-progress-privacy falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.message}`);
  process.exit(1);
}

console.log(
  "OK: validate:business-progress-privacy — as RPCs do painel não leem dado pedagógico privado e o browser " +
    "não consulta tabela de progresso direto."
);
