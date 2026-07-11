/** Valida monitoramento de erros e recuperação de crashes. */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!existsSync(full)) {
    errors.push(`Falta arquivo: ${rel}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

const migration = read("supabase/migrations/006_app_error_reports.sql");
const boundary = read("src/components/system/AppErrorBoundary.tsx");
const routeError = read("src/components/system/RouteErrorPage.tsx");
const service = read("src/services/errorReportingService.ts");
const errorLib = read("src/lib/errorReport.ts");
const main = read("src/main.tsx");
const routes = read("src/routes.tsx");
const e2e = read("e2e/errors.spec.ts");
const adminHealth = read("src/features/admin/ErrorHealthAdminPage.tsx");
const edgeFn = read("supabase/functions/submit-app-error/index.ts");

if (migration) {
  if (!/app_error_reports/.test(migration)) errors.push("migration sem tabela app_error_reports");
  if (!/enable row level security/.test(migration)) errors.push("migration sem RLS");
  if (!/fingerprint/.test(migration)) errors.push("migration sem fingerprint");
  if (!/report_app_error/.test(migration)) errors.push("migration sem RPC report_app_error");
}

if (boundary) {
  if (!/O Longyu encontrou um problema/.test(boundary)) errors.push("AppErrorBoundary sem copy principal");
  if (!/Tentar novamente/.test(boundary)) errors.push("AppErrorBoundary sem retry");
  if (!/Voltar à Jornada/.test(boundary)) errors.push("AppErrorBoundary sem voltar jornada");
  if (!/Enviar relatório/.test(boundary)) errors.push("AppErrorBoundary sem enviar relatório");
}

if (routeError && !/errorElement/.test(routes)) {
  errors.push("routes sem errorElement");
}

if (service) {
  if (!/OFFLINE_QUEUE_MAX = 20/.test(service)) errors.push("fila offline não limitada a 20");
  if (!/sessionFingerprints/.test(service)) errors.push("service sem dedup de sessão");
  if (!/installGlobalErrorCapture/.test(service)) errors.push("service sem captura global");
  if (!/fingerprint/.test(service)) errors.push("service sem fingerprint");
}

if (errorLib && !/buildErrorFingerprint/.test(errorLib)) {
  errors.push("errorReport sem fingerprint");
}

if (main && !/AppErrorBoundary/.test(main)) errors.push("main não envolve AppErrorBoundary");
if (main && !/installGlobalErrorCapture/.test(main)) errors.push("main não instala captura global");
if (main && !/E2eCrashProbe/.test(main)) errors.push("main não inclui probe E2E no boundary global");

if (adminHealth && !/app_error_reports/.test(adminHealth)) {
  errors.push("painel admin sem consulta app_error_reports");
}

if (edgeFn && !/report_app_error/.test(edgeFn)) {
  errors.push("submit-app-error sem RPC report_app_error");
}

if (e2e && !/e2e-force-crash/.test(e2e)) errors.push("e2e sem crash controlado");

if (errors.length > 0) {
  console.error("ERRO: validate:error-monitoring falhou:");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("OK: validate:error-monitoring passou.");
