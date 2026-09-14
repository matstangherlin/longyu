#!/usr/bin/env node
/**
 * Mutações da porta de leitura do painel.
 *
 * A mutação SEAT_FN_EXPOSED é a tentação real: o painel roda como
 * `authenticated` e as funções de assento são `service_role`, então o atalho é
 * conceder execute e seguir a vida. Isso entrega a contagem de assentos de
 * qualquer organização a qualquer pessoa logada.
 *
 * ORG_ID_TRUSTED é a outra: o organization_id chega do browser. Sem casar com
 * auth.uid(), trocar um UUID na requisição abre o painel da empresa ao lado —
 * o que foi verificado em Postgres real, com um owner tentando ler outra
 * organização e recebendo FORBIDDEN.
 */
import assert from "node:assert/strict";
import { validateBusinessOverviewRpc } from "./lib/v410a1-gates.mjs";
import { businessMigrationSource } from "./lib/v410a1-sources.mjs";

const migrationSource = businessMigrationSource();

assert.deepEqual(
  validateBusinessOverviewRpc({ migrationSource }).failures,
  [],
  "controle positivo: a migration real precisa passar"
);

const mutations = [
  [
    "a RPC do painel some",
    migrationSource.replace("create or replace function public.get_business_overview(", "create or replace function public.painel_interno("),
    "NO_PANEL_RPC",
  ],
  [
    "a RPC deixa de ser security definer",
    migrationSource.replace(
      "returns jsonb\nlanguage plpgsql\nstable\nsecurity definer",
      "returns jsonb\nlanguage plpgsql\nstable"
    ),
    "RPC_NOT_DEFINER",
  ],
  [
    "search_path deixa de ser vazio",
    migrationSource.replaceAll("set search_path = ''", "set search_path = public"),
    "RPC_SEARCH_PATH_OPEN",
  ],
  [
    "chamada anônima passa",
    migrationSource.replaceAll(
      "  if auth.uid() is null then\n    raise exception 'UNAUTHENTICATED' using errcode = 'insufficient_privilege';\n  end if;\n",
      ""
    ),
    "NO_AUTH_CHECK",
  ],
  [
    "learner passa a ver o painel",
    migrationSource.replaceAll("not in ('owner', 'admin', 'manager')", "not in ('owner', 'admin', 'manager', 'learner')"),
    "NO_ROLE_CHECK",
  ],
  [
    "o organization_id do cliente passa a valer sozinho",
    migrationSource.replaceAll("and m.user_id = auth.uid()\n", ""),
    "ORG_ID_TRUSTED",
  ],
  [
    "a RPC é aberta para anon",
    `${migrationSource}\ngrant execute on function public.get_business_overview(uuid) to anon;`,
    "RPC_OPEN_TO_ANON",
  ],
  [
    "função interna de assento é aberta para o browser",
    `${migrationSource}\ngrant execute on function public.organization_reserved_seat_count(uuid) to authenticated;`,
    "SEAT_FN_EXPOSED",
  ],
  [
    "a lista de colaboradores perde o teto de página",
    migrationSource.replace(
      "integer := least(greatest(coalesce(p_limit, 25), 1), 100)",
      "integer := coalesce(p_limit, 25)"
    ),
    "UNBOUNDED_PAGE",
  ],
];

for (const [label, mutated, expected] of mutations) {
  const codes = validateBusinessOverviewRpc({ migrationSource: mutated }).failures.map(
    (failure) => failure.code
  );
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

console.log("PASS test:business-overview-rpc");
