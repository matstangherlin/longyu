#!/usr/bin/env node
/**
 * validate:v410a1-freeze — P36.
 *
 * A V4.10A.1 é comercial: preço, assento, licença, painel. Nenhuma lição,
 * nenhum chunk, nenhum caractere, nenhum Culture Item, nenhuma Conversation
 * Scene. Este gate existe porque a pressão de "só mais uma liçãozinha para a
 * demo do Business" é real, e o fingerprint é a única testemunha.
 */
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { countCurriculum } from "./lib/rc1-1-gates.mjs";
import { validateV410a1Freeze } from "./lib/v410a1-gates.mjs";
import { BUSINESS_MIGRATION, readSource } from "./lib/v410a1-sources.mjs";

// Toda migration comercial desta linha de trabalho, e não só a primeira: o
// gate só vale se cobrir as que vierem depois dela.
const COMMERCIAL_MIGRATIONS = [
  "supabase/migrations/20260914120000_family_plan_foundation.sql",
  "supabase/migrations/20260914200000_family_invite_flow.sql",
  "supabase/migrations/20260914210000_family_entitlement.sql",
];
const COMMERCIAL_MODULES = [
  "src/commercial/billing.ts",
  "src/commercial/entitlements.ts",
  "src/commercial/family.ts",
];

const fingerprint = journeyFingerprint(process.cwd());
const counts = countCurriculum();

const { failures } = validateV410a1Freeze({
  fingerprint,
  counts,
  commercialSources: Object.fromEntries(
    [BUSINESS_MIGRATION, ...COMMERCIAL_MIGRATIONS].map((file) => [file, readSource(file)])
  ),
  moduleSources: Object.fromEntries(COMMERCIAL_MODULES.map((file) => [file, readSource(file)])),
});

if (failures.length > 0) {
  console.error(`validate:v410a1-freeze falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.message}`);
  process.exit(1);
}

console.log(
  `PASS validate:v410a1-freeze — fingerprint ${fingerprint} · ${counts.lessons} lições · ` +
    `${counts.teachingTopics} temas · nenhuma migration comercial escreve currículo.`
);
