/**
 * Smoke comportamental da economia de Pérolas em um Supabase de staging.
 *
 * O teste cria dois usuários temporários, produz evidência pelas RPCs públicas,
 * valida forja/replay/11->12 e executa claims/ativações concorrentes.
 * Ele falha fechado contra o projeto de produção conhecido.
 *
 * Variáveis obrigatórias:
 *   LONGYU_STAGING_PROJECT_ID   # nunca MandarimProject
 *   STAGING_SUPABASE_URL
 *   STAGING_SUPABASE_ANON_KEY
 *   STAGING_SUPABASE_SERVICE_ROLE_KEY
 *   ALLOW_STAGING_SECURITY_TESTS=true
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { mergedEnv } from "./lib/env-local.mjs";
import {
  assertStagingUrlMatches,
  failClosed,
  requireStagingProjectId,
} from "./lib/staging-guard.mjs";

const env = mergedEnv();
const stagingUrl = String(env.STAGING_SUPABASE_URL ?? "").replace(/\/$/, "");
const anonKey = String(env.STAGING_SUPABASE_ANON_KEY ?? "");
const serviceRoleKey = String(env.STAGING_SUPABASE_SERVICE_ROLE_KEY ?? "");

function invariant(condition, message, details) {
  if (condition) return;
  const suffix = details === undefined ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`${message}${suffix}`);
}

if (env.ALLOW_STAGING_SECURITY_TESTS !== "true") {
  console.error("Defina ALLOW_STAGING_SECURITY_TESTS=true para autorizar fixtures temporárias no staging.");
  process.exit(2);
}
if (!stagingUrl || !anonKey || !serviceRoleKey) {
  console.error(
    "Configure STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY e " +
      "STAGING_SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(2);
}
try {
  const stagingId = requireStagingProjectId(env);
  assertStagingUrlMatches(stagingUrl, stagingId);
} catch (error) {
  failClosed(error);
}
invariant(
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(stagingUrl),
  "STAGING_SUPABASE_URL inválida"
);

const authOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const admin = createClient(stagingUrl, serviceRoleKey, authOptions);
const createdUserIds = [];

function phaseOneLessons() {
  const root = path.resolve(import.meta.dirname, "..");
  const migration = fs.readFileSync(
    path.join(root, "supabase/migrations/20260813180000_pearl_pro_economy.sql"),
    "utf8"
  );
  const phase = migration.match(/\('p1', array\[([\s\S]*?)\]::text\[\]\)/)?.[1] ?? "";
  const lessons = [...phase.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  invariant(lessons.length > 0, "Catálogo local da fase p1 não foi encontrado");
  return lessons;
}

async function createTestIdentity(label) {
  const nonce = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;
  const email = `longyu-security-${label}-${nonce}@example.com`;
  const password = `Longyu!${crypto.randomBytes(18).toString("base64url")}9a`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: `Security staging ${label}` },
  });
  invariant(!error && data.user?.id, `Falha ao criar usuário temporário ${label}`, error);
  createdUserIds.push(data.user.id);
  return { id: data.user.id, email, password };
}

async function signIn(identity) {
  const client = createClient(stagingUrl, anonKey, authOptions);
  const { data, error } = await client.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  });
  invariant(!error && data.user?.id === identity.id, "Falha no login do usuário temporário", error);
  return client;
}

async function rpc(client, name, args = {}) {
  const { data, error } = await client.rpc(name, args);
  invariant(!error, `RPC ${name} falhou no transporte`, error);
  return data;
}

async function economy(client) {
  const result = await rpc(client, "get_server_economy");
  invariant(result?.ok && result.economy, "get_server_economy não retornou snapshot", result);
  return result.economy;
}

async function seedElevenPearls(client, identity) {
  const result = await rpc(client, "migrate_local_economy", {
    p_payload: {
      qi: 0,
      dragon_pearls: 11,
      streak_shields: 0,
      current_charges: 5,
      max_charges: 5,
    },
    p_idempotency_key: `staging-security:${identity.id}`,
  });
  invariant(result?.ok && result.economy?.dragon_pearls === 11, "Fixture 11 Pérolas falhou", result);
}

async function createVerifiedPhaseEvidence(client, lessons) {
  const starts = await Promise.all(
    lessons.map((lessonId) => rpc(client, "start_referral_lesson_session", { p_lesson_id: lessonId }))
  );
  for (const [index, result] of starts.entries()) {
    invariant(result?.ok && result.session_id, `Sessão não iniciou para ${lessons[index]}`, result);
  }

  const latestNotBefore = Math.max(...starts.map((result) => Date.parse(result.not_before)));
  const waitMs = Math.max(0, latestNotBefore - Date.now() + 1_500);
  console.log(`Aguardando ${Math.ceil(waitMs / 1000)}s pela janela autoritativa das lições...`);
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const completions = await Promise.all(
    starts.map((result) =>
      rpc(client, "complete_referral_lesson_session", { p_session_id: result.session_id })
    )
  );
  for (const [index, result] of completions.entries()) {
    invariant(result?.ok && (result.verified || result.already_completed), `Evidência falhou para ${lessons[index]}`, result);
  }
}

async function validateInvalidAndForgedClaims(client) {
  const arbitrary = await rpc(client, "claim_pearl_milestone", {
    p_milestone_id: "journey_phase:qualquer-id-unico",
  });
  invariant(!arbitrary.ok && arbitrary.error === "unknown_milestone", "Milestone arbitrário foi aceito", arbitrary);

  const oldMonth = new Date();
  oldMonth.setUTCMonth(oldMonth.getUTCMonth() - 1);
  const oldMonthId = `monthly_challenge:${oldMonth.toISOString().slice(0, 7)}`;
  const invalidMonth = await rpc(client, "claim_pearl_milestone", { p_milestone_id: oldMonthId });
  invariant(
    !invalidMonth.ok && ["invalid_month", "unknown_milestone"].includes(invalidMonth.error),
    "Desafio mensal fora do mês atual foi aceito",
    invalidMonth
  );

  const forged = await client.rpc("claim_pearl_milestone", {
    p_milestone_id: "journey_phase:p1",
    p_evidence: { monthly_complete: true, verified_metric: 999999 },
  });
  invariant(Boolean(forged.error), "RPC ainda aceitou p_evidence fornecido pelo navegador", forged.data);
  invariant((await economy(client)).dragon_pearls === 11, "Claim inválido/forjado alterou o saldo");
}

async function main() {
  console.log("== test:pearl-staging (staging isolado) ==");
  const [identityA, identityB] = await Promise.all([
    createTestIdentity("a"),
    createTestIdentity("b"),
  ]);
  const [clientA1, clientA2, clientB1, clientB2] = await Promise.all([
    signIn(identityA),
    signIn(identityA),
    signIn(identityB),
    signIn(identityB),
  ]);
  const lessons = phaseOneLessons();

  await Promise.all([
    seedElevenPearls(clientA1, identityA),
    seedElevenPearls(clientB1, identityB),
  ]);

  const insufficient = await rpc(clientA1, "activate_pearl_pro_pass", {
    p_idempotency_key: `staging-insufficient:${crypto.randomUUID()}`,
  });
  invariant(
    !insufficient.ok && insufficient.error === "insufficient_pearls" &&
      insufficient.economy?.dragon_pearls === 11,
    "11 Pérolas ativaram Pro",
    insufficient
  );

  await validateInvalidAndForgedClaims(clientA1);
  await Promise.all([
    createVerifiedPhaseEvidence(clientA1, lessons),
    createVerifiedPhaseEvidence(clientB1, lessons),
  ]);

  const claimA = await rpc(clientA1, "claim_pearl_milestone", {
    p_milestone_id: "journey_phase:p1",
  });
  invariant(
    claimA.ok && !claimA.already_applied && claimA.economy?.dragon_pearls === 12,
    "Fluxo autoritativo 11 -> 12 falhou",
    claimA
  );
  const replayClaimA = await rpc(clientA2, "claim_pearl_milestone", {
    p_milestone_id: "journey_phase:p1",
  });
  invariant(
    replayClaimA.ok && replayClaimA.already_applied && replayClaimA.economy?.dragon_pearls === 12,
    "Replay de milestone creditou novamente",
    replayClaimA
  );

  const activationKeys = [
    `staging-pro:${crypto.randomUUID()}`,
    `staging-pro:${crypto.randomUUID()}`,
  ];
  const [activationOne, activationTwo] = await Promise.all([
    rpc(clientA1, "activate_pearl_pro_pass", { p_idempotency_key: activationKeys[0] }),
    rpc(clientA2, "activate_pearl_pro_pass", { p_idempotency_key: activationKeys[1] }),
  ]);
  const activations = [activationOne, activationTwo];
  invariant(
    activations.every((result) => result.ok && result.is_pro) &&
      activations.filter((result) => result.already_applied !== true).length === 1,
    "Ativação concorrente não convergiu para um único débito e Pro confirmado",
    activations
  );
  invariant((await economy(clientA1)).dragon_pearls === 0, "Ativação concorrente fez double spend");

  const appliedKey = activationKeys[activations.findIndex((result) => result.already_applied !== true)];
  const replayActivation = await rpc(clientA2, "activate_pearl_pro_pass", {
    p_idempotency_key: appliedKey,
  });
  invariant(
    replayActivation.ok && replayActivation.already_applied && replayActivation.is_pro,
    "Replay da ativação perdeu o entitlement confirmado",
    replayActivation
  );

  const concurrentClaims = await Promise.all([
    rpc(clientB1, "claim_pearl_milestone", { p_milestone_id: "journey_phase:p1" }),
    rpc(clientB2, "claim_pearl_milestone", { p_milestone_id: "journey_phase:p1" }),
  ]);
  invariant(
    concurrentClaims.every((result) => result.ok) &&
      concurrentClaims.filter((result) => result.already_applied !== true).length === 1 &&
      (await economy(clientB1)).dragon_pearls === 12,
    "Claims simultâneos creditaram mais de uma vez",
    concurrentClaims
  );

  console.log("OK: staging recusou forja/replay e serializou claims/ativações concorrentes.");
}

try {
  await main();
} finally {
  const cleanup = await Promise.allSettled(
    createdUserIds.map((userId) => admin.auth.admin.deleteUser(userId))
  );
  const failedCleanup = cleanup.filter(
    (result) => result.status === "rejected" || result.value?.error
  );
  if (failedCleanup.length > 0) {
    console.error(`ATENÇÃO: ${failedCleanup.length} usuário(s) temporário(s) não foram removidos.`);
    process.exitCode = 1;
  }
}
