/** Valida sistema de feedback interno (tabela, RLS, UI e serviço). */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function read(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}

function requireFile(rel, label) {
  if (!existsSync(path.join(root, rel))) {
    errors.push(`Falta ${label}: ${rel}`);
    return "";
  }
  return read(rel);
}

const migration = requireFile("supabase/migrations/005_feedback_reports.sql", "migration feedback");
const feedbackTs = requireFile("src/lib/feedback.ts", "feedback lib");
const feedbackService = requireFile("src/services/feedbackService.ts", "feedback service");
const feedbackModal = requireFile("src/components/feedback/FeedbackModal.tsx", "FeedbackModal");
const feedbackButton = requireFile("src/components/feedback/FeedbackButton.tsx", "FeedbackButton");
const morePage = requireFile("src/features/more/MorePage.tsx", "MorePage");
const edgeFn = requireFile("supabase/functions/submit-feedback/index.ts", "submit-feedback function");

if (migration) {
  if (!/create table.*feedback_reports/is.test(migration)) errors.push("migration sem tabela feedback_reports");
  if (!/enable row level security/is.test(migration)) errors.push("migration sem RLS em feedback_reports");
  if (!/feedback_reports_insert_own/is.test(migration)) errors.push("migration sem policy de insert próprio");
  if (!/feedback_reports_select_admin/is.test(migration)) errors.push("migration sem policy admin select");
  if (!/is_admin/is.test(migration)) errors.push("migration sem flag is_admin");
}

if (feedbackButton) {
  if (/href=\{buildFeedbackMailto/.test(feedbackButton)) {
    errors.push("FeedbackButton ainda usa apenas mailto");
  }
  if (!/openFeedback/.test(feedbackButton)) errors.push("FeedbackButton não abre modal interno");
}

if (feedbackService) {
  if (!/route/.test(feedbackService)) errors.push("feedbackService não envia rota");
  if (!/app_version/.test(feedbackService)) errors.push("feedbackService não envia versão");
  if (!/from\("feedback_reports"\)/.test(feedbackService)) errors.push("feedbackService não grava em feedback_reports");
  if (!/submit-feedback/.test(feedbackService)) errors.push("feedbackService sem edge function anônima");
}

if (feedbackModal) {
  if (!/Relato #/.test(feedbackModal)) errors.push("FeedbackModal sem código curto do relato");
  if (!/openFeedbackMailto/.test(feedbackModal)) errors.push("FeedbackModal sem fallback mailto");
}

if (morePage && !/FeedbackPrompt/.test(morePage)) {
  errors.push("MorePage sem acesso mobile ao formulário de feedback");
}

if (edgeFn && !/RATE_LIMIT/.test(edgeFn)) {
  errors.push("submit-feedback sem rate limit");
}

if (feedbackTs && !/formatFeedbackReportCode/.test(feedbackTs)) {
  errors.push("feedback.ts sem formatador de código do relato");
}

if (errors.length > 0) {
  console.error("ERRO: validate:feedback falhou:");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("OK: validate:feedback passou.");
