#!/usr/bin/env node
/**
 * validate:effective-entitlement — P26 e P27.
 *
 * Confere a propriedade estrutural: o acesso vem do backend e nenhuma origem
 * é perdida no caminho. O comportamento (coexistência, expiração, precedência)
 * é exercitado em test:effective-entitlement.
 */
import { validateEffectiveEntitlement, loadSource } from "./lib/v410a-gates.mjs";

const CONSUMERS = [
  "src/services/entitlementService.ts",
  "src/lib/accessTier.ts",
  "src/components/auth/EntitlementBootstrap.tsx",
];

const failures = validateEffectiveEntitlement({
  entitlementSource: loadSource("src/commercial/entitlements.ts"),
  consumerSources: Object.fromEntries(CONSUMERS.map((file) => [file, loadSource(file)])),
}).failures;

if (failures.length > 0) {
  console.error(`validate:effective-entitlement falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.message}`);
  process.exit(1);
}

console.log(
  "OK: validate:effective-entitlement — origem vem do backend, todas as origens ativas preservadas, " +
    "nenhuma flag de cliente decide acesso."
);
