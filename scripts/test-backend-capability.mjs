#!/usr/bin/env node
/**
 * RC2.3.10B — client gates for backends production does not have.
 *
 * Checks (no network, no database):
 *   1. runtime behaviour of src/lib/cloud/backendCapability.ts per environment;
 *   2. src/lib/cloud/knownMissingBackend.json matches the committed call graph
 *      (every gated MISSING object is listed, nothing listed is present in the
 *      production snapshot);
 *   3. the social / family / business / pearl call sites actually consult the gate.
 *
 * Run: npm run test:backend-capability
 */
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (rel) => fs.readFile(path.join(root, rel), "utf8");
const readJson = async (rel) => JSON.parse(await read(rel));

const GATED_DOMAINS = ["social", "family", "business", "pearl"];

const known = await readJson("src/lib/cloud/knownMissingBackend.json");
const callGraph = await readJson("docs/launch/rc2-3-10b-client-backend-call-graph.json");
const snapshot = await readJson("docs/launch/production-snapshot.json");

// --- 2. committed JSON versus call graph and snapshot -----------------------
const normalizeName = (entry) => entry.backendObject.replace(/^functions\//, "");
const missingByDomain = new Map();
for (const entry of callGraph.entries) {
  if (entry.productionStatus !== "MISSING") continue;
  const list = missingByDomain.get(entry.domain) ?? [];
  list.push({ kind: entry.kind, name: normalizeName(entry) });
  missingByDomain.set(entry.domain, list);
}

const key = (o) => `${o.kind}:${o.name}`;
for (const domain of GATED_DOMAINS) {
  const expected = new Set((missingByDomain.get(domain) ?? []).map(key));
  const listed = new Set((known.domains[domain]?.missing ?? []).map(key));
  for (const item of expected) assert(listed.has(item), `call graph says ${domain} is missing ${item}, knownMissingBackend.json does not list it`);
  for (const item of listed) assert(expected.has(item), `knownMissingBackend.json lists ${domain} ${item} but the call graph does not report it MISSING`);
}
assert(
  Object.keys(known.domains).every((d) => GATED_DOMAINS.includes(d)),
  "knownMissingBackend.json has a domain that backendCapability.ts does not know"
);
for (const item of known.notGatedHere.placement.missing) {
  assert(
    (missingByDomain.get("placement") ?? []).some((o) => key(o) === key(item)),
    `placement ${key(item)} listed under notGatedHere but not MISSING in the call graph`
  );
}

const present = {
  table: new Set(snapshot.tables.map((t) => t.name)),
  view: new Set(snapshot.views.map((v) => v.name)),
  rpc: new Set(snapshot.functions.map((f) => f.name)),
  edge: new Set(snapshot.edgeFunctions.map((f) => f.slug)),
};
for (const domain of Object.values(known.domains)) {
  for (const item of domain.missing) {
    const bucket = present[item.kind] ?? new Set();
    assert(!bucket.has(item.name), `${key(item)} is PRESENT in the production snapshot; remove it from knownMissingBackend.json and the call sites' gate`);
  }
}

// --- 1. runtime behaviour ---------------------------------------------------
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "longyu-backend-capability-"));
try {
  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    strict: false,
  };
  const emit = async (rel) => {
    const source = (await read(rel)).replaceAll("= import.meta.env", "= {}");
    const out = path.join(tmp, rel.replace(/^src\//, "").replace(/\.ts$/, ".js"));
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, ts.transpileModule(source, { compilerOptions, fileName: path.basename(rel) }).outputText);
  };
  await fs.writeFile(path.join(tmp, "package.json"), JSON.stringify({ type: "commonjs" }));
  await emit("src/lib/appEnvironment.ts");
  await emit("src/lib/featureFlags.ts");
  await emit("src/lib/cloud/backendCapability.ts");
  await fs.mkdir(path.join(tmp, "lib/cloud"), { recursive: true });
  await fs.writeFile(path.join(tmp, "lib/cloud/knownMissingBackend.json"), JSON.stringify(known));

  const require = createRequire(import.meta.url);
  const cap = require(path.join(tmp, "lib/cloud/backendCapability.js"));
  const { isBackendDomainAvailable, isKnownMissingBackendDomain, BACKEND_CAPABILITY_MISSING } = cap;

  assert(BACKEND_CAPABILITY_MISSING === "backend_capability_missing", "stable error code");
  for (const domain of GATED_DOMAINS) {
    assert(isKnownMissingBackendDomain(domain), `${domain} is a known-missing domain`);
    assert(!isBackendDomainAvailable(domain, { VITE_APP_ENV: "production_beta" }), `${domain} unavailable in production_beta`);
    assert(!isBackendDomainAvailable(domain, { VITE_APP_ENV: "qa_candidate" }), `${domain} unavailable in qa_candidate`);
    assert(!isBackendDomainAvailable(domain, { MODE: "production" }), `${domain} unavailable in a production build with no VITE_APP_ENV`);
    assert(isBackendDomainAvailable(domain, { VITE_APP_ENV: "preview" }), `${domain} available in preview (staging has the full schema)`);
    assert(isBackendDomainAvailable(domain, { DEV: true }), `${domain} available in development`);
  }

  const flag = (domain) => `VITE_BACKEND_${domain.toUpperCase()}_ENABLED`;
  for (const domain of GATED_DOMAINS) {
    assert(known.domains[domain].flag === flag(domain), `${domain} flag name in JSON`);
    assert(isBackendDomainAvailable(domain, { VITE_APP_ENV: "production_beta", [flag(domain)]: "true" }), `${domain} can be re-enabled in production by flag`);
    assert(!isBackendDomainAvailable(domain, { VITE_APP_ENV: "preview", [flag(domain)]: "false" }), `${domain} can be forced off in preview`);
    assert(!isBackendDomainAvailable(domain, { VITE_APP_ENV: "production_beta", [flag(domain)]: "maybe" }), `${domain} unparseable flag fails closed`);
  }
  // A blank flag is treated as unset: still unavailable in production-like while known-missing.
  assert(!isBackendDomainAvailable("social", { VITE_APP_ENV: "production_beta", VITE_BACKEND_SOCIAL_ENABLED: "" }), "blank flag falls back to the default (unavailable)");
  // Other domains stay independent.
  assert(
    isBackendDomainAvailable("family", { VITE_APP_ENV: "production_beta", VITE_BACKEND_SOCIAL_ENABLED: "true" }) === false,
    "enabling social does not enable family"
  );
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}

// --- 3. call sites consult the gate ----------------------------------------
const [social, family, businessWs, businessLead, businessEvents, bridge, amigos] = await Promise.all([
  read("src/services/socialService.ts"),
  read("src/services/familyService.ts"),
  read("src/services/businessWorkspaceService.ts"),
  read("src/services/businessLeadService.ts"),
  read("src/services/businessEvents.ts"),
  read("src/lib/economyServerBridge.ts"),
  read("src/features/amigos/AmigosPage.tsx"),
]);

const functionBody = (text, name) => {
  const start = text.search(new RegExp(`(async )?function ${name}\\b`));
  if (start < 0) return "";
  const next = text.slice(start + 1).search(/\n(export )?(async )?function /);
  return next < 0 ? text.slice(start) : text.slice(start, start + 1 + next);
};

for (const fn of [
  "searchProfiles",
  "getProfileByUsername",
  "followUser",
  "unfollowUser",
  "listFollowProfiles",
  "fetchFriendsRanking",
  "fetchFriendActivity",
  "recordSocialActivity",
]) {
  assert(functionBody(social, fn).includes("socialClientOrError()"), `socialService.${fn} goes through the social gate`);
}
for (const fn of ["fetchMySocialSettings", "updateUsername", "updateShowInSearch"]) {
  assert(!functionBody(social, fn).includes("socialClientOrError()"), `socialService.${fn} stays on profiles and is not gated`);
}
assert(social.includes('isBackendDomainAvailable("social")'), "socialService reads the social capability");

for (const fn of ["fetchFamilyOverview", "createFamilyInvite", "revokeFamilyInvite", "removeFamilyMember", "acceptFamilyInvite"]) {
  assert(functionBody(family, fn).includes('isBackendDomainAvailable("family")'), `familyService.${fn} is gated`);
}
for (const fn of ["fetchBusinessOverview", "fetchBusinessMembers"]) {
  assert(functionBody(businessWs, fn).includes('isBackendDomainAvailable("business")'), `businessWorkspaceService.${fn} is gated`);
}
assert(businessLead.includes('isBackendDomainAvailable("business")'), "submitBusinessLead is gated");
assert(businessEvents.includes('isBackendDomainAvailable("business")'), "trackBusinessEvent skips the Edge call when gated");
for (const fn of ["serverActivatePearlProPass", "serverClaimPearlMilestone"]) {
  const body = functionBody(bridge, fn);
  assert(body.includes('isBackendDomainAvailable("pearl")'), `economyServerBridge.${fn} is gated`);
  assert(
    body.indexOf('isBackendDomainAvailable("pearl")') < body.indexOf("enqueueEconomyIntent"),
    `${fn} checks the gate before it can enqueue a retry`
  );
}
assert(bridge.includes('isPearlIntent && !isBackendDomainAvailable("pearl")'), "flushEconomyIntentQueue skips pearl intents while gated");
assert(amigos.includes("friends-unavailable"), "AmigosPage shows a calm unavailable state");

if (failures.length > 0) {
  console.error(`test-backend-capability FAILED (${failures.length}):`);
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}
console.log("test-backend-capability PASS");
