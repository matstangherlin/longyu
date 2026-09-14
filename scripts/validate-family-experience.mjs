#!/usr/bin/env node
/**
 * validate:family-experience — P7 e P10 a P13.
 *
 * O caminho inteiro, porque cada peça isolada parecia pronta e o conjunto não
 * funcionava: as tabelas existiam desde a V4.10A e aceitar um convite não dava
 * Pro a ninguém, porque o entitlement do servidor não conhecia família.
 */
import fs from "node:fs";
import path from "node:path";
import { validateFamilyExperience } from "./lib/v410a1-gates.mjs";
import { readSource } from "./lib/v410a1-sources.mjs";

const root = path.resolve(import.meta.dirname, "..");

const CLIENT_FILES = [
  "src/services/familyService.ts",
  "src/features/familia/FamilyPage.tsx",
  "src/features/familia/FamilyInvitePage.tsx",
];

const clientSources = Object.fromEntries(
  CLIENT_FILES.filter((file) => fs.existsSync(path.join(root, file))).map((file) => [file, readSource(file)])
);

const { failures } = validateFamilyExperience({
  inviteFlowSource: readSource("supabase/migrations/20260914200000_family_invite_flow.sql"),
  entitlementSource: readSource("supabase/migrations/20260914210000_family_entitlement.sql"),
  clientSources,
  requiredClientFiles: CLIENT_FILES,
});

if (failures.length > 0) {
  console.error(`validate:family-experience falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.message}`);
  process.exit(1);
}

console.log(
  "OK: validate:family-experience — convite nasce no servidor e só em hash, aceite é de uso único, " +
    "participação concede Pro no servidor e na economia, e a tela passa por RPC."
);
