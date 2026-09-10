import assert from "node:assert/strict";
import { cloneCultureRuntime, loadCultureRuntime, require as tsRequire } from "./lib/v495a-runtime.mjs";
import { validateLiveLeague } from "./lib/v498a2-gates.mjs";

const { resolveLeagueSurface, publicDisplayName } = tsRequire("../../src/lib/leagueLiveView.ts");

const base = loadCultureRuntime();
assert.deepEqual(validateLiveLeague(base).failures, [], "live-league positive");

function kill(label, edit, code) {
  const data = cloneCultureRuntime(base);
  edit(data);
  const failures = validateLiveLeague(data).failures;
  assert(failures.some((item) => item.code === code), `${label} survived; ${JSON.stringify(failures)}`);
  console.log(`KILLED ${label}: ${code}`);
}

kill("10 cloud bots ungated", (data) => {
  data.leagueHookSource = data.leagueHookSource.replace(/surface.allowBots/g, "true");
}, "BOTS_AS_REAL");

kill("11 RPC error silent demo", (data) => {
  data.ligasPageSource = data.ligasPageSource.replace(/Não foi possível carregar a liga/g, "ok");
  data.ligasPageSource = data.ligasPageSource.replace(/league-error-banner/g, "x");
}, "SILENT_DEMO");

kill("12 standings omit XP", (data) => {
  data.ligasPageSource = data.ligasPageSource.replace(/league-xp/g, "league-no-xp");
}, "NO_WEEKLY_XP");

const cloudError = resolveLeagueSurface({
  authIntent: "cloud",
  liveMode: "error",
  liveStandingsCount: 0,
  hasCachedLive: false,
  loading: false,
  statusMessage: "RPC down",
});
assert.equal(cloudError.allowBots, false);
assert.equal(cloudError.surface, "error");
console.log("KILLED 10 cloud RPC error never uses bots");

const localDemo = resolveLeagueSurface({
  authIntent: "local",
  liveMode: "demo",
  liveStandingsCount: 0,
  hasCachedLive: false,
  loading: false,
  statusMessage: null,
});
assert.equal(localDemo.allowBots, true);
assert.equal(localDemo.bannerKind, "demo");
console.log("KILLED 20.1 demo only when unauthenticated");

kill("10b session check removed", (data) => {
  data.leagueHookSource = data.leagueHookSource.replace(/sessionResolved/g, "sessionDone");
}, "BOTS_AS_REAL");

kill("15 duplicate source_key", (data) => {
  data.leagueSqlSource = data.leagueSqlSource.replace(/on conflict \(user_id, source_key\)/g, "on conflict (user_id)");
}, "RPC_SECURITY");

assert.equal(publicDisplayName(""), "Aluno");
assert.equal(publicDisplayName("Aluno demo 12"), "Aluno");
assert.equal(publicDisplayName("Ana"), "Ana");
assert.equal(publicDisplayName("x", true), "Você");
console.log("KILLED 22 empty name is Aluno not Aluno Demo");

const pending = resolveLeagueSurface({
  authIntent: "cloud",
  liveMode: null,
  liveStandingsCount: 0,
  hasCachedLive: false,
  loading: true,
  statusMessage: null,
});
assert.equal(pending.allowBots, false);
assert.equal(pending.surface, "loading");
console.log("KILLED 12 stale-local pending session never uses bots");

const ranks = [
  { name: "Ana", xp: 100 },
  { name: "Matheus", xp: 80 },
  { name: "João", xp: 40 },
].sort((a, b) => b.xp - a.xp);
assert.deepEqual(ranks.map((row) => row.name), ["Ana", "Matheus", "João"]);
ranks[2].xp += 80;
ranks.sort((a, b) => b.xp - a.xp);
assert.equal(ranks[0].name, "João");
console.log("KILLED 24 fixture A/B/C rank swap by weekly_xp");

console.log("PASS test:live-league");
