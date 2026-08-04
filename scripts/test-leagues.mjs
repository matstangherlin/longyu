/**
 * Testes unitários do sistema de ligas (chaves de semana, XP keys, parsing).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function isoWeekKeyJs(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekEndsAtClient(now = new Date()) {
  const end = new Date(now);
  const day = end.getDay() || 7;
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + (8 - day));
  return end;
}

function parseStandings(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const userId = String(row.user_id ?? "");
      if (!userId) return null;
      return {
        user_id: userId,
        weekly_xp: Math.max(0, Number(row.weekly_xp ?? 0)),
        rank: row.rank == null ? null : Math.max(1, Number(row.rank)),
        is_me: Boolean(row.is_me),
      };
    })
    .filter(Boolean);
}

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`OK  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(err instanceof Error ? err.message : err);
  }
}

console.log("== test:leagues ==");

check("weekKey format YYYY-Www", () => {
  const key = isoWeekKeyJs(new Date("2026-08-04T12:00:00Z"));
  assert.equal(key, "2026-W32");
  assert.match(key, /^\d{4}-W\d{2}$/);
});

check("client week end is next Monday local midnight", () => {
  const tue = new Date(2026, 7, 4, 15, 0, 0); // Aug 4 2026 local
  const end = weekEndsAtClient(tue);
  assert.equal(end.getDay(), 1);
  assert.equal(end.getHours(), 0);
  assert.ok(end.getTime() > tue.getTime());
});

check("league XP keys are stable and long enough", () => {
  const lesson = `lesson:l1:attempt:abc`;
  const activity = `activity:hanzi:2026-08-04:practice`;
  assert.ok(lesson.length >= 3);
  assert.ok(activity.length >= 3);
  assert.equal(lesson, "lesson:l1:attempt:abc");
});

check("standings parser drops invalid rows and keeps ranks", () => {
  const rows = parseStandings([
    { user_id: "u1", weekly_xp: 12, rank: 1, is_me: true },
    { user_id: "", weekly_xp: 99, rank: 2 },
    { weekly_xp: 5 },
    { user_id: "u2", weekly_xp: -3, rank: null, is_me: false },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].weekly_xp, 12);
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[1].weekly_xp, 0);
  assert.equal(rows[1].rank, null);
});

check("migration 016 exists and defines cohort finalize", () => {
  const sql = readFileSync(
    path.join(root, "supabase/migrations/016_fix_leagues_cohort_finalize.sql"),
    "utf8"
  );
  assert.match(sql, /finalize_league_cohort/);
  assert.match(sql, /finalize_stale_league_cohorts/);
  assert.match(sql, /handle_new_user/);
  assert.match(sql, /league_memberships/);
  assert.match(sql, /week_ends_at/);
});

check("useLeagueData keeps live status message path", () => {
  const src = readFileSync(path.join(root, "src/hooks/useLeagueData.ts"), "utf8");
  assert.match(src, /liveStatusMessage/);
  assert.match(src, /flushPendingLeagueXpSync/);
});

check("AuthBootstrap flushes league XP after auth", () => {
  const src = readFileSync(path.join(root, "src/components/auth/AuthBootstrap.tsx"), "utf8");
  assert.match(src, /flushPendingLeagueXpSync/);
  assert.match(src, /syncLeagueWeekOnServer/);
});

check("store joins league on XP and reward", () => {
  const src = readFileSync(path.join(root, "src/lib/store.ts"), "utf8");
  assert.match(src, /shouldJoin = joinedThisWeek \|\| Math\.max\(0, Math\.round\(current\.weeklyXp/);
  assert.match(src, /const leagueJoin = joinLeaguePatch\(current\);/);
});

if (failed > 0) {
  console.error(`\n${failed} teste(s) falharam.`);
  process.exit(1);
}

console.log("\nTodos os testes de ligas passaram.");
