/**
 * Garante que o canal de diagnóstico do cliente (crash/sync → feedback)
 * permanece ligado e sanitizado.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const diagnostics = readFileSync("src/lib/clientDiagnostics.ts", "utf8");
const boundary = readFileSync("src/components/system/ErrorBoundary.tsx", "utf8");
const feedback = readFileSync("src/lib/feedback.ts", "utf8");
const sync = readFileSync("src/services/cloudSyncCoordinator.ts", "utf8");
const pwa = readFileSync("src/components/system/PwaUpdateBanner.tsx", "utf8");
const html = readFileSync("index.html", "utf8");

assert.match(diagnostics, /recordClientDiagnostic/, "exporta recordClientDiagnostic");
assert.match(diagnostics, /requestFeedbackOpen/, "exporta requestFeedbackOpen");
assert.match(diagnostics, /sanitizeFeedbackMessage/, "reusa sanitização de feedback");
assert.match(boundary, /Reportar problema/, "ErrorBoundary oferece CTA de reportar");
assert.match(boundary, /recordClientDiagnostic/, "ErrorBoundary grava diagnóstico");
assert.match(sync, /sync_error/, "falha de sync grava diagnóstico");
assert.match(sync, /opsCorrelation/, "sync anexa correlation id sem PII");

const ops = readFileSync("src/lib/opsCorrelation.ts", "utf8");
assert.match(ops, /x-longyu-correlation-id/, "header de correlação");
assert.match(ops, /Nunca registra email/, "contrato sem PII");
assert.doesNotMatch(ops, /password|authorization|access_token/i, "opsCorrelation não menciona segredos");

const signup = readFileSync("src/services/authService.ts", "utf8");
assert.match(signup, /edgeOpsInit\("signup"\)/, "signup envia correlação");
const placement = readFileSync("src/services/placementCommit.ts", "utf8");
assert.match(placement, /edgeOpsInit\("placement"\)/, "placement envia correlação");
const finalize = readFileSync("src/services/finalizeOnboarding.ts", "utf8");
assert.match(finalize, /edgeOpsInit\("finalize"\)/, "finalize envia correlação");
const checkout = readFileSync("src/services/subscriptionService.ts", "utf8");
assert.match(checkout, /edgeOpsInit\("checkout"\)/, "checkout envia correlação");
assert.match(feedback, /displayMode/, "contexto técnico inclui displayMode");
assert.match(feedback, /appEnv/, "contexto técnico inclui appEnv");
assert.match(pwa, /Nova versão/, "banner PWA de atualização existe");
assert.doesNotMatch(html, /user-scalable=no/, "viewport não bloqueia zoom (a11y)");
assert.match(html, /apple-mobile-web-app-capable/, "meta PWA iOS presente");
assert.match(html, /viewport-fit=cover/, "safe-area habilitada");

console.log("OK: validate:client-diagnostics");
