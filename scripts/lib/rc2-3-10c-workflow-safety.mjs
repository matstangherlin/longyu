/**
 * RC2.3.10C — production workflow safety. Pure checks so mutations can kill them.
 * Nothing here talks to production.
 */

export function checkApplyBetaFeedback(text) {
  const errors = [];
  if (/npm run db:apply-api/.test(text)) errors.push("APPLY_ALL_PATH");
  if (!/WILDCARD_REFUSED/.test(text)) errors.push("WILDCARD_NOT_REFUSED");
  if (!/EXPECTED_SHA/.test(text)) errors.push("EXPECTED_SHA_IGNORED");
  if (!/environment:\s*production/.test(text)) errors.push("NO_PRODUCTION_ENVIRONMENT");
  if (!/refs\/heads\/main/.test(text)) errors.push("ARBITRARY_BRANCH");
  if (!/workflow_dispatch/.test(text)) errors.push("NOT_MANUAL");
  if (/(^|\n)\s*push:/.test(text) || /(^|\n)\s*pull_request:/.test(text)) errors.push("AUTO_TRIGGER");
  return errors;
}

export function checkDeployLeagues(text) {
  const errors = [];
  if (/npm run deploy:leagues/.test(text)) errors.push("OLD_LEAGUES_DEPLOY");
  if (!/004_leagues\.sql must not be reapplied|DEPLOY_LEAGUES_REFUSED/.test(text)) errors.push("OLD_LEAGUES_NOT_REFUSED");
  if (!/workflow_dispatch/.test(text)) errors.push("NOT_MANUAL");
  if (/(^|\n)\s*push:/.test(text)) errors.push("AUTO_TRIGGER");
  return errors;
}

export function checkConfigureAuthWorkflow(text) {
  const errors = [];
  if (!/--confirm-merge/.test(text)) errors.push("AUTH_REPLACE_ALL");
  if (!/longyu\.noba\.com:\/\/auth\/callback/.test(text) && !/configure:supabase-auth/.test(text)) {
    errors.push("ANDROID_CALLBACK_OMITTED");
  }
  if (!/EXPECTED_SHA/.test(text)) errors.push("EXPECTED_SHA_IGNORED");
  if (/(^|\n)\s*push:/.test(text)) errors.push("AUTO_TRIGGER");
  if (!/refs\/heads\/main/.test(text)) errors.push("ARBITRARY_BRANCH");
  return errors;
}

export function checkConfigureAuthScript(text) {
  const errors = [];
  if (!/confirm-merge/.test(text)) errors.push("AUTH_REPLACE_ALL");
  if (!/uri_allow_list/.test(text) || !/existing/.test(text)) errors.push("AUTH_DOES_NOT_READ_CURRENT");
  if (!/longyu\.noba\.com:\/\/auth\/callback/.test(text)) errors.push("ANDROID_CALLBACK_OMITTED");
  return errors;
}

export function checkApplyMigrationsScript(text) {
  const errors = [];
  if (!/não reaplica o histórico inteiro em produção/.test(text)) errors.push("APPLY_ALL_PATH");
  if (!/process\.exit\(6\)/.test(text)) errors.push("APPLY_ALL_PATH");
  return errors;
}

export function checkDeployLeaguesScript(text) {
  const errors = [];
  if (!/RECUSADO: deploy:leagues/.test(text)) errors.push("OLD_LEAGUES_DEPLOY");
  if (!/process\.exit\(6\)/.test(text)) errors.push("OLD_LEAGUES_DEPLOY");
  return errors;
}

export function checkStripeWebhook(text) {
  const errors = [];
  if (!/RETRYABLE_FAILURE/.test(text)) errors.push("WEBHOOK_SWALLOWS_RPC");
  if (!/PERMANENT_REJECT/.test(text)) errors.push("WEBHOOK_NO_PERMANENT_CLASS");
  if (!/ALREADY_PROCESSED/.test(text)) errors.push("WEBHOOK_NO_IDEMPOTENT_CLASS");
  if (!/assertRpc\(error/.test(text)) errors.push("WEBHOOK_SWALLOWS_RPC");
  if (/sk_live_/.test(text)) errors.push("STRIPE_LIVE_KEY");
  if (!/constructEventAsync/.test(text)) errors.push("WEBHOOK_SIGNATURE_DISABLED");
  return errors;
}
