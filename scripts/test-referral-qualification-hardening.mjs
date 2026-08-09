import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (condition) console.log(`ok: ${message}`);
  else errors.push(message);
}

const migration = read(
  "supabase/migrations/20260808093000_harden_referral_qualification.sql"
);
const rewardReview = read(
  "supabase/migrations/20260809160306_require_referral_reward_review.sql"
);
const reviewIndex = read(
  "supabase/migrations/20260809161134_index_referral_review_reviewer.sql"
);
const pipelineStart = rewardReview.indexOf(
  "create or replace function public.process_referral_pipeline"
);
const pipelineEnd = rewardReview.indexOf(
  "-- Preserve and queue any legacy qualified row",
  pipelineStart
);
const browserPipeline = rewardReview.slice(pipelineStart, pipelineEnd);
const client = read("src/services/referralLearningAttestation.ts");
const lessonPlayer = read("src/features/lesson/LessonPlayer.tsx");
const smoke = read("scripts/sql/referral-qualification-hardening-smoke.sql");

const qualifyStart = migration.indexOf(
  "create or replace function public._referral_try_qualify"
);
const qualifyEnd = migration.indexOf(
  "revoke all on function public.start_referral_lesson_session",
  qualifyStart
);
const qualify = migration.slice(qualifyStart, qualifyEnd);
const catalog = migration.slice(
  migration.indexOf("from unnest(array["),
  migration.indexOf("]::text[]) as catalog")
);
const catalogIds = catalog.match(/'[^']+'/g) ?? [];

assert(qualifyStart >= 0, "current qualification function is replaced");
assert(!qualify.includes("client_snapshot"), "qualification ignores client_snapshot");
assert(
  !qualify.includes("_referral_progress_from_snapshot"),
  "qualification no longer calls the snapshot helper"
);
assert(
  qualify.includes("_referral_verified_progress(r.invitee_id, r.attributed_at)"),
  "qualification counts only post-attribution verified progress"
);
assert(catalogIds.length >= 120, "server catalog covers the current lesson journey");
assert(
  migration.includes("create table if not exists public.referral_lesson_sessions") &&
    migration.includes("create table if not exists public.referral_verified_lesson_completions"),
  "server-owned attempt and completion evidence tables exist"
);
assert(
  migration.includes("alter table public.referral_lesson_sessions enable row level security") &&
    migration.includes("revoke all on table public.referral_lesson_sessions") &&
    migration.includes("revoke all on table public.referral_verified_lesson_completions"),
  "evidence tables are deny-by-default"
);
assert(
  migration.includes("pg_advisory_xact_lock") && migration.includes("v_started_today >= 24"),
  "lesson-session issuance has a race-safe daily ceiling"
);
assert(
  migration.includes("now() + interval '45 seconds'") &&
    migration.includes("if v_session.not_before > now()"),
  "completion requires server-observed elapsed time"
);
assert(
  migration.includes("where session.id = p_session_id and session.user_id = v_uid") &&
    migration.includes("where completion.user_id = p_user_id"),
  "attempt completion and progress are bound to the authenticated user"
);
assert(
  migration.includes("primary key (user_id, lesson_id)") &&
    migration.includes("count(distinct completion.lesson_id)"),
  "one lesson can contribute only once"
);
assert(
  migration.includes("referral_lesson_sessions_lesson_idx") &&
    migration.includes("referral_verified_completion_lesson_idx"),
  "foreign-key columns have dedicated indexes"
);
assert(
  migration.includes("count(distinct (timezone('utc', completion.completed_at))::date)"),
  "active days come from server timestamps"
);
assert(
  migration.includes("grant execute on function public.start_referral_lesson_session(text) to authenticated") &&
    migration.includes("grant execute on function public.complete_referral_lesson_session(uuid) to authenticated"),
  "only authenticated clients can use the narrow attestation RPCs"
);
assert(
  client.includes('rpc("start_referral_lesson_session"') &&
    client.includes('rpc("complete_referral_lesson_session"') &&
    client.includes('rpc("process_referral_pipeline"'),
  "browser uses the server attestation and then reprocesses referrals"
);
assert(
  client.includes("session.notBefore - Date.now()") &&
    client.includes("retry_after_seconds") &&
    !client.includes("localStorage"),
  "client tolerates clock skew while server time remains authoritative"
);
assert(
  lessonPlayer.includes("beginReferralLessonAttestation(foundLesson.id)") &&
    (lessonPlayer.match(/completeReferralLessonAttestation\(lesson\.id\)/g) ?? []).length >= 2,
  "normal and recovered lesson completions report the attestation"
);
assert(
  smoke.includes("forged snapshot qualified referral") &&
    smoke.includes("(result ->> 'error') <> 'too_soon'") &&
    smoke.includes("referral_verified_lesson_completions"),
  "SQL smoke covers forged snapshots, early completion and legitimate evidence"
);
assert(
  rewardReview.includes("create table if not exists public.referral_qualification_reviews") &&
    rewardReview.includes("alter table public.referral_qualification_reviews enable row level security") &&
    rewardReview.includes("revoke all on table public.referral_qualification_reviews"),
  "manual referral reviews have a deny-by-default audit table"
);
assert(
  reviewIndex.includes("referral_qualification_reviews_reviewer_idx") &&
    reviewIndex.includes("where reviewer_id is not null"),
  "manual review audit foreign keys have a covering index"
);
assert(
  rewardReview.includes("'learning_attestation_review'") &&
    rewardReview.includes("'review_required', true") &&
    !rewardReview.includes("'qualified', true"),
  "client-driven qualification stops at independent review"
);
assert(
  rewardReview.includes("create or replace function public.review_referral_qualification") &&
    /grant execute on function public\.review_referral_qualification\(uuid, boolean, text\)\s+to service_role/.test(rewardReview) &&
    /revoke all on function public\.review_referral_qualification\(uuid, boolean, text\)\s+from public, anon, authenticated/.test(rewardReview) &&
    !/review_referral_qualification\(uuid, boolean, text\)\s+to authenticated/.test(rewardReview),
  "only service_role can approve a referral reward"
);
assert(
  pipelineStart >= 0 &&
    pipelineEnd > pipelineStart &&
    browserPipeline.includes("public._referral_try_qualify") &&
    !browserPipeline.includes("public._referral_grant_reward"),
  "authenticated pipeline cannot reach the reward sink"
);
assert(
  smoke.includes("authenticated pipeline bypassed independent review") &&
    smoke.includes("review_referral_qualification") &&
    smoke.includes("independently reviewed referral was not rewarded"),
  "SQL smoke rejects the original RPC exploit and preserves reviewed rewards"
);

if (errors.length) {
  console.error("test:referral-qualification-hardening failed:");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log("OK: referral rewards require server evidence plus independent service-role review.");
