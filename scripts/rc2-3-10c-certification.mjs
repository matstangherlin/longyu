#!/usr/bin/env node
/**
 * RC2.3.10C workflow-safety gate.
 * validate — current tree must be fail-closed.
 * test — mutations of those rules must die.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkApplyBetaFeedback,
  checkApplyMigrationsScript,
  checkApplyProductionMigrationScript,
  checkConfigureAuthScript,
  checkConfigureAuthWorkflow,
  checkDeployLeagues,
  checkDeployLeaguesScript,
  checkStripeWebhook,
} from "./lib/rc2-3-10c-workflow-safety.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const files = {
  apply: read(".github/workflows/apply-beta-feedback.yml"),
  leagues: read(".github/workflows/deploy-leagues.yml"),
  authWf: read(".github/workflows/configure-supabase-auth.yml"),
  auth: read("scripts/configure-supabase-auth.mjs"),
  applyApi: read("scripts/apply-migrations-api.mjs"),
  applyOne: read("scripts/apply-production-migration.mjs"),
  deployLeagues: read("scripts/deploy-leagues.mjs"),
  webhook: read("supabase/functions/stripe-webhook/index.ts"),
};

function validate() {
  const errors = [
    ...checkApplyBetaFeedback(files.apply).map((e) => `apply-beta-feedback:${e}`),
    ...checkApplyProductionMigrationScript(files.applyOne).map((e) => `apply-production-migration:${e}`),
    ...checkDeployLeagues(files.leagues).map((e) => `deploy-leagues:${e}`),
    ...checkConfigureAuthWorkflow(files.authWf).map((e) => `configure-auth-workflow:${e}`),
    ...checkConfigureAuthScript(files.auth).map((e) => `configure-auth:${e}`),
    ...checkApplyMigrationsScript(files.applyApi).map((e) => `db-apply-api:${e}`),
    ...checkDeployLeaguesScript(files.deployLeagues).map((e) => `deploy-leagues-script:${e}`),
    ...checkStripeWebhook(files.webhook).map((e) => `stripe-webhook:${e}`),
  ];
  if (errors.length) {
    console.error("FAIL validate:rc2-3-10c");
    for (const e of errors) console.error(" -", e);
    process.exit(1);
  }
  console.log("PASS validate:rc2-3-10c");
}

function kill(label, code, errors) {
  if (!errors.includes(code) && !errors.some((e) => e === code)) {
    console.error(`SURVIVED ${label}: expected ${code} in ${errors.join(",") || "(none)"}`);
    return false;
  }
  console.log(`KILLED ${label}: ${code}`);
  return true;
}

function test() {
  let ok = true;
  const must = (label, code, errors) => {
    if (!kill(label, code, errors)) ok = false;
  };

  must("1 arbitrary branch", "ARBITRARY_BRANCH", checkApplyBetaFeedback(files.apply.replace("refs/heads/main", "refs/heads/any")));
  must("2 expected SHA ignored", "EXPECTED_SHA_IGNORED", checkApplyBetaFeedback(files.apply.replaceAll("EXPECTED_SHA", "IGNORED_SHA")));
  must("3 apply-all path", "APPLY_ALL_PATH", checkApplyBetaFeedback(`${files.apply}\nrun: npm run db:apply-api\n`));
  must(
    "3b single apply unwired",
    "SINGLE_APPLY_NOT_WIRED",
    checkApplyBetaFeedback(files.apply.replaceAll("apply-production-migration.mjs", "noop.mjs"))
  );
  must("4 old leagues deploy", "OLD_LEAGUES_DEPLOY", checkDeployLeagues(`${files.leagues}\nrun: npm run deploy:leagues\n`));
  must("5 auth replace-all", "AUTH_REPLACE_ALL", checkConfigureAuthScript(files.auth.replaceAll("confirm-merge", "replace-all")));
  must("6 android callback omitted", "ANDROID_CALLBACK_OMITTED", checkConfigureAuthScript(files.auth.replaceAll("longyu.noba.com://auth/callback", "")));
  must("58 webhook swallows rpc", "WEBHOOK_SWALLOWS_RPC", checkStripeWebhook(files.webhook.replaceAll("assertRpc(error", "void error; //")));
  must("57 signature disabled", "WEBHOOK_SIGNATURE_DISABLED", checkStripeWebhook(files.webhook.replace("constructEventAsync", "trustBody")));
  const fakeLive = ["sk", "live", "abcdefghijklmnop"].join("_");
  must("56 live key shape", "STRIPE_LIVE_KEY", checkStripeWebhook(`${files.webhook}\nconst leak = "${fakeLive}";\n`));
  must("apply-api still hits production", "APPLY_ALL_PATH", checkApplyMigrationsScript(files.applyApi.replace("não reaplica o histórico inteiro em produção", "aplica tudo")));
  must("deploy leagues script re-enabled", "OLD_LEAGUES_DEPLOY", checkDeployLeaguesScript(files.deployLeagues.replace("RECUSADO: deploy:leagues", "ok deploy")));
  must(
    "ready gate stripped",
    "READY_GATE_MISSING",
    checkApplyProductionMigrationScript(files.applyOne.replaceAll("productionMigrationReady", "alwaysReady"))
  );
  must(
    "allowlist stripped",
    "ALLOWLIST_MISSING",
    checkApplyProductionMigrationScript(
      files.applyOne.replaceAll("lookupProductionMigration", "anyMigration").replaceAll("PRODUCTION_MIGRATION_ALLOWLIST", "NONE")
    )
  );

  if (!ok) process.exit(1);
  console.log("PASS test:rc2-3-10c");
}

const mode = process.argv[2] ?? "validate";
if (mode === "test") test();
else if (mode === "validate") validate();
else {
  console.error("use validate or test");
  process.exit(2);
}
