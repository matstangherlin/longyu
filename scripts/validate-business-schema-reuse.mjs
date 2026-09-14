#!/usr/bin/env node
/**
 * validate:business-schema-reuse — REGRA 1 a 5 da V4.10A.1.
 *
 * A auditoria do P0 encontrou o Business inteiro já de pé desde a V4.4:
 * organizations, organization_members, organization_invites,
 * organization_subscriptions, entitlement e RLS. Este gate existe para que a
 * próxima versão não recrie nada disso em paralelo — e para que `seat_limit`
 * não volte para organizations, de onde a V4.4.1 o tirou de propósito.
 */
import { validateBusinessSchemaReuse } from "./lib/v410a1-gates.mjs";
import { businessFoundationSource, businessMigrationSource } from "./lib/v410a1-sources.mjs";

const { failures } = validateBusinessSchemaReuse({
  migrationSource: businessMigrationSource(),
  foundationSource: businessFoundationSource(),
});

if (failures.length > 0) {
  console.error(`validate:business-schema-reuse falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.message}`);
  process.exit(1);
}

console.log(
  "OK: validate:business-schema-reuse — nenhuma tabela nova, licença só em organization_subscriptions, " +
    "papéis owner/admin/manager/learner e estados do banco preservados."
);
