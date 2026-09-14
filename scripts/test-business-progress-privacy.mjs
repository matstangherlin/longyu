#!/usr/bin/env node
/**
 * Mutações da privacidade do colaborador.
 *
 * O contrato é assimétrico de propósito: a empresa paga a licença, mas o que a
 * pessoa respondeu, digitou ou falou não é da empresa. As mutações introduzem
 * exatamente os campos que a V4.10A proibiu por escrito.
 */
import assert from "node:assert/strict";
import { validateBusinessProgressPrivacy } from "./lib/v410a1-gates.mjs";
import { businessClientSources, businessMigrationSource } from "./lib/v410a1-sources.mjs";

const migrationSource = businessMigrationSource();
const clientSources = businessClientSources();

assert.deepEqual(
  validateBusinessProgressPrivacy({ migrationSource, clientSources }).failures,
  [],
  "controle positivo: a migration real e o cliente atual precisam passar"
);

const mutations = [
  [
    "o painel passa a ler o snapshot bruto",
    {
      migrationSource: migrationSource.replace(
        "      up.last_active,",
        "      up.last_active,\n      up.client_snapshot,"
      ),
    },
    "RPC_LEAKS_PRIVATE_FIELD",
  ],
  [
    "o painel passa a ler fala transcrita",
    {
      migrationSource: migrationSource.replace(
        "    'active_learners_7d', coalesce(v_active_7d, 0),",
        "    'transcript', (select transcript from public.user_progress limit 1),\n    'active_learners_7d', coalesce(v_active_7d, 0),"
      ),
    },
    "RPC_LEAKS_PRIVATE_FIELD",
  ],
  [
    "a linha inteira de progresso é trazida",
    {
      migrationSource: migrationSource.replace(
        "  select count(*) into v_total",
        "  perform (select * from public.user_progress limit 1);\n  select count(*) into v_total"
      ),
    },
    "RPC_SELECT_STAR",
  ],
  [
    "erro cru do banco vaza para o painel",
    {
      migrationSource: migrationSource.replace(
        "    'viewer_role', v_role,",
        "    'viewer_role', v_role,\n    'debug', sqlerrm,"
      ),
    },
    "RAW_ERROR_LEAKED",
  ],
  [
    "o browser consulta progresso direto",
    {
      migrationSource,
      clientSources: { "src/pages/BusinessDashboard.tsx": 'supabase.from("user_progress").select("*")' },
    },
    "CLIENT_READS_PRIVATE_TABLE",
  ],
];

for (const [label, override, expected] of mutations) {
  const codes = validateBusinessProgressPrivacy({
    migrationSource,
    clientSources,
    ...override,
  }).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

console.log("PASS test:business-progress-privacy");
