#!/usr/bin/env node
/**
 * RC2.2 — Auditoria do backend QA do candidate (P3 · P4 · P5).
 *
 * Responde três perguntas, nesta ordem:
 *   1. Quais migrations o repositório tem?              (inventário)
 *   2. Quais o projeto QA realmente aplicou?            (histórico remoto)
 *   3. Onde as duas listas divergem?                    (drift)
 *
 * Migration no Git ≠ migration aplicada (P3.1). Sem histórico remoto este
 * script NÃO diz "aplicado": diz BLOCKED_CREDENTIALS e mantém o candidate
 * bloqueado.
 *
 * Só LÊ. Aplicar migrations continua sendo `npm run migrate:staging` com
 * LONGYU_TARGET_PROJECT_ID=<ref QA> — o mecanismo oficial já adotado pelo
 * projeto (P3.2). Não existe segunda estratégia de migrations aqui.
 *
 * Nunca imprime service_role, senha, JWT nem token. O project ref sai mascarado.
 */
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";
import { localMigrationFiles, localSchemaHash } from "./lib/migration-drift.mjs";
import { edgeFunctionCatalog } from "./lib/edge-functions.mjs";
import {
  BLOCKED_CREDENTIALS,
  LONGYU_PRODUCTION_PROJECT_NAME,
  extractProjectRef,
  isProductionProjectId,
  maskProjectRef,
} from "./lib/rc2-candidate-infra.mjs";

/**
 * Edge Functions necessárias ao PUBLIC_BETA_CORE.
 *
 * Comercial (Stripe) fica de fora: Pro/Family continuam "planned" e o checkout
 * público não completa, então essas funções não bloqueiam a beta gratuita (P25).
 */
const PUBLIC_BETA_CORE_FUNCTIONS = [
  "create-account",
  "delete-account",
  "commit-placement",
  "finalize-onboarding",
  "issue-anon-ingestion-session",
];

const COMMERCIAL_FUNCTIONS = [
  "create-checkout-session",
  "create-billing-portal",
  "stripe-webhook",
  "submit-business-lead",
];

const root = projectRoot();
const env = mergedEnv();
const token = String(env.SUPABASE_ACCESS_TOKEN ?? "").trim();

// O ref QA pode vir do alvo de rehearsal já existente ou da URL do candidate.
const qaRefRaw = String(
  env.RC2_QA_PROJECT_REF ?? env.LONGYU_TARGET_PROJECT_ID ?? env.LONGYU_STAGING_PROJECT_ID ?? ""
).trim();
const qaRef = extractProjectRef(qaRefRaw);

const local = localMigrationFiles(root);
const blockers = [];

const report = {
  generatedAt: new Date().toISOString(),
  qaProject: {
    // Identificador não secreto / mascarado (P2.2).
    refMasked: qaRef ? maskProjectRef(qaRef) : null,
    configured: Boolean(qaRef),
    isProduction: qaRef ? isProductionProjectId(qaRef) : null,
  },
  migrations: {
    expected: local.length,
    applied: null,
    drift: null,
    errors: [],
    schemaVersion: localSchemaHash(local),
    latestLocalVersion: local.at(-1)?.version ?? null,
  },
  edgeFunctions: {
    publicBetaCore: edgeFunctionCatalog().filter((fn) => PUBLIC_BETA_CORE_FUNCTIONS.includes(fn.slug)),
    commercialDeferred: COMMERCIAL_FUNCTIONS,
    deployedToQa: null,
  },
};

// P1.3 / P2.1 — nunca auditar (nem aplicar) contra produção.
if (qaRef && isProductionProjectId(qaRef)) {
  console.error(
    `HARD FAIL: alvo QA resolveu para ${LONGYU_PRODUCTION_PROJECT_NAME} (produção). ` +
      "RC2 não testa contra o banco de produção."
  );
  process.exit(2);
}

async function fetchQaMigrations(ref) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/migrations`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao listar migrations do QA`);
  }
  const body = text ? JSON.parse(text) : [];
  return Array.isArray(body) ? body : body.migrations ?? [];
}

function normalizeName(name) {
  return String(name ?? "")
    .replace(/^\d+_/, "")
    .replace(/\.sql$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

if (!qaRef) {
  blockers.push({
    code: BLOCKED_CREDENTIALS,
    missing: "RC2_QA_PROJECT_REF (ou LONGYU_TARGET_PROJECT_ID)",
    why: "Sem projeto Supabase QA não há histórico remoto para comparar.",
  });
} else if (!token) {
  blockers.push({
    code: BLOCKED_CREDENTIALS,
    missing: "SUPABASE_ACCESS_TOKEN",
    why: "Sem token da Management API não dá para ler o histórico aplicado no QA.",
  });
} else {
  try {
    const remote = await fetchQaMigrations(qaRef);
    const remoteVersions = new Set(remote.map((row) => String(row.version ?? "")));
    const remoteNames = new Set(remote.map((row) => normalizeName(row.name)));

    const missingInQa = local.filter(
      (file) => !remoteVersions.has(file.version) && !remoteNames.has(normalizeName(file.name))
    );
    const localVersions = new Set(local.map((file) => file.version));
    const localNames = new Set(local.map((file) => normalizeName(file.name)));
    const unknownInQa = remote.filter(
      (row) => !localVersions.has(String(row.version ?? "")) && !localNames.has(normalizeName(row.name))
    );

    report.migrations.applied = remote.length;
    report.migrations.drift = {
      missingInQa: missingInQa.map((file) => file.file),
      unknownInQa: unknownInQa.map((row) => String(row.version ?? row.name ?? "?")),
    };

    // P4.1 — drift em qualquer direção mantém o candidate BLOCKED.
    if (missingInQa.length > 0) {
      blockers.push({
        code: "MIGRATION_MISSING_IN_QA",
        missing: `${missingInQa.length} migration(s) do repo não aplicadas no QA`,
        why: "Rode: LONGYU_TARGET_PROJECT_ID=<ref QA> npm run migrate:staging",
      });
    }
    if (unknownInQa.length > 0) {
      blockers.push({
        code: "MIGRATION_UNKNOWN_IN_QA",
        missing: `${unknownInQa.length} migration(s) no QA que o repo não conhece`,
        why: "Entender a origem antes de seguir. NÃO resetar o banco QA só para ficar verde (P4.2).",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.migrations.errors.push(message);
    blockers.push({ code: "QA_HISTORY_UNREADABLE", missing: "histórico de migrations do QA", why: message });
  }
}

report.blockers = blockers;
console.log(JSON.stringify(report, null, 2));

if (blockers.length > 0) {
  console.error(`\nBLOCKED audit:rc2-qa-backend — ${blockers.length} bloqueio(s).`);
  for (const blocker of blockers) console.error(`  - [${blocker.code}] ${blocker.missing}: ${blocker.why}`);
  process.exit(2);
}

console.log(
  `\nPASS audit:rc2-qa-backend — ${report.migrations.expected} migrations esperadas, ` +
    `${report.migrations.applied} aplicadas no QA, sem drift.`
);
