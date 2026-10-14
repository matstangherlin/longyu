#!/usr/bin/env node
/**
 * RC2.3.10B — identify the SHA the production web site is actually serving.
 *
 *   node scripts/rc2-3-10b-prod-web-sha.mjs           fetch + write docs/launch/rc2-3-10b-web-sha.json
 *   node scripts/rc2-3-10b-prod-web-sha.mjs validate  committed evidence is internally consistent (offline)
 *   node scripts/rc2-3-10b-prod-web-sha.mjs test      mutations: dishonest evidence must be rejected (offline)
 *
 * Read-only: GET requests to the public site (and the Netlify deploy API only when
 * NETLIFY_AUTH_TOKEN is already in the environment). Never writes to the site.
 *
 * Status vocabulary: PASS | NOT_PROVEN | BLOCKED. PASS needs a live artifact fetch that names a
 * full 40-hex SHA, the same SHA embedded in the served bundle, and that SHA present in git history.
 * No network -> BLOCKED. Anything weaker -> NOT_PROVEN. This script never upgrades a status.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const OUT = "docs/launch/rc2-3-10b-web-sha.json";
const DEFAULT_URL = "https://singular-meringue-7838cd.netlify.app";
const FULL_SHA = /^[0-9a-f]{40}$/;

const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });

async function get(url, { text = true, timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "cache-control": "no-cache" } });
    const body = text ? await res.text() : null;
    return { ok: res.ok, status: res.status, body, headers: Object.fromEntries(res.headers) };
  } finally {
    clearTimeout(timer);
  }
}

export function classify(ev) {
  const reasons = [];
  if (!ev.fetch.reachable) return { status: "BLOCKED", reasons: [`network: ${ev.fetch.error ?? "unreachable"}`] };
  if (!ev.fetch.versionJsonOk) return { status: "NOT_PROVEN", reasons: [`version.json not usable (HTTP ${ev.fetch.versionJsonHttp ?? "?"})`] };
  if (!FULL_SHA.test(ev.sha ?? "")) reasons.push("version.json has no full 40-hex commitSha");
  if (ev.identity?.environment !== "production_beta") reasons.push(`environment is ${ev.identity?.environment ?? "missing"}, expected production_beta`);
  if (ev.bundle.checked && !ev.bundle.shaFoundInBundle) reasons.push("served JS bundle does not embed the SHA that version.json claims");
  if (!ev.bundle.checked) reasons.push("served bundle was not inspected");
  if (!ev.git.knownLocally) reasons.push("SHA is not a commit in this repository's history");
  else if (!ev.git.ancestorOfOriginMain) reasons.push("SHA is not an ancestor of origin/main");
  return reasons.length ? { status: "NOT_PROVEN", reasons } : { status: "PASS", reasons: [] };
}

async function collect() {
  const base = (process.env.LONGYU_PROD_URL || DEFAULT_URL).replace(/\/+$/, "");
  const ev = {
    url: base,
    fetch: { reachable: false, versionJsonOk: false },
    sha: null,
    identity: null,
    bundle: { checked: false, asset: null, shaFoundInBundle: false, shaOccurrences: 0 },
    git: { knownLocally: false, ancestorOfOriginMain: false },
    netlifyApi: { attempted: false, skipped: "NETLIFY_AUTH_TOKEN not set in this environment" },
  };
  try {
    const v = await get(`${base}/version.json`);
    ev.fetch.reachable = true;
    ev.fetch.versionJsonHttp = v.status;
    ev.fetch.contentType = v.headers["content-type"] ?? null;
    ev.fetch.cacheControl = v.headers["cache-control"] ?? null;
    ev.fetch.netlifyRequestId = v.headers["x-nf-request-id"] ?? null;
    if (v.ok && /json/.test(ev.fetch.contentType ?? "")) {
      const j = JSON.parse(v.body);
      ev.fetch.versionJsonOk = true;
      ev.sha = String(j.commitSha ?? "").toLowerCase();
      ev.identity = {
        schema: j.schema,
        authority: j.authority,
        commitSha: j.commitSha,
        sourceHeadSha: j.sourceHeadSha,
        workflowSha: j.workflowSha,
        embeddedSourceHeadSha: j.embeddedSourceHeadSha,
        embeddedWorkflowSha: j.embeddedWorkflowSha,
        branch: j.branch,
        appVersion: j.appVersion,
        platform: j.platform,
        environment: j.environment,
        builtAt: j.builtAt,
      };
    }
  } catch (err) {
    ev.fetch.error = String(err?.cause?.code ?? err?.message ?? err);
    return ev;
  }

  if (ev.sha) {
    try {
      const html = await get(`${base}/`);
      const asset = /assets\/index-[^"']+\.js/.exec(html.body ?? "")?.[0];
      if (asset) {
        const js = await get(`${base}/${asset}`);
        ev.bundle = { checked: js.ok, asset, shaFoundInBundle: js.ok && js.body.includes(ev.sha), shaOccurrences: js.ok ? js.body.split(ev.sha).length - 1 : 0 };
      }
    } catch (err) {
      ev.bundle.error = String(err?.message ?? err);
    }
    const known = git("cat-file", "-t", ev.sha);
    ev.git.knownLocally = known.status === 0 && known.stdout.trim() === "commit";
    if (ev.git.knownLocally) {
      git("fetch", "origin", "main", "--quiet");
      ev.git.ancestorOfOriginMain = git("merge-base", "--is-ancestor", ev.sha, "origin/main").status === 0;
      ev.git.originMainHead = git("rev-parse", "origin/main").stdout.trim();
      ev.git.commitSubject = git("log", "-1", "--format=%s", ev.sha).stdout.trim();
      ev.git.commitDate = git("log", "-1", "--format=%cI", ev.sha).stdout.trim();
      ev.git.commitsBehindOriginMain = Number(git("rev-list", "--count", `${ev.sha}..origin/main`).stdout.trim());
      ev.git.originMainIsServed = ev.git.originMainHead === ev.sha;
      const behind = git("log", "--format=%H %s", `${ev.sha}..origin/main`).stdout.trim().split("\n").filter(Boolean);
      ev.git.commitsAfterServedSha = behind.map((l) => ({ sha: l.slice(0, 8), subject: l.slice(41) }));
    }
  }

  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (token) {
    delete ev.netlifyApi.skipped;
    ev.netlifyApi.attempted = true;
    try {
      const site = process.env.NETLIFY_SITE_ID || process.env.NETLIFY_SITE_NAME || "singular-meringue-7838cd";
      const sites = await fetch(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(site)}`, { headers: { authorization: `Bearer ${token}` } });
      if (sites.ok) {
        const s = await sites.json();
        const d = s.published_deploy ?? {};
        ev.netlifyApi = { attempted: true, ok: true, publishedDeployState: d.state ?? null, publishedCommitRef: d.commit_ref ?? null, publishedAt: d.published_at ?? null, matchesVersionJson: Boolean(d.commit_ref && d.commit_ref === ev.sha) };
      } else ev.netlifyApi = { attempted: true, ok: false, httpStatus: sites.status };
    } catch (err) {
      ev.netlifyApi = { attempted: true, ok: false, error: String(err?.message ?? err) };
    }
  }
  return ev;
}

function toEvidence(ev, verifiedAt) {
  const { status, reasons } = classify(ev);
  return {
    schema: "longyu-prod-web-sha/1",
    wave: "RC2.3.10B",
    status,
    sha: status === "BLOCKED" ? null : ev.sha || null,
    shortSha: status === "BLOCKED" || !ev.sha ? null : ev.sha.slice(0, 7),
    url: `${ev.url}/version.json`,
    site: ev.url,
    verifiedAt,
    method: [
      "HTTP GET <site>/version.json (public build identity written by scripts/vite-build.mjs)",
      "HTTP GET <site>/ then the served assets/index-*.js: the SHA must be embedded in the bundle the browser runs",
      "git: SHA must be a commit of this repository and an ancestor of origin/main",
      ev.netlifyApi.attempted ? "Netlify API: published deploy commit_ref compared" : "Netlify deploy API NOT used (no NETLIFY_AUTH_TOKEN in this environment)",
    ],
    reasons,
    identity: ev.identity,
    fetch: ev.fetch,
    bundle: ev.bundle,
    git: ev.git,
    netlifyApi: ev.netlifyApi,
    limits: [
      "version.json and the bundle are served by the same site, so they prove what the site serves now, not who published it or whether Netlify marks that deploy as published; the Netlify deploy record stays unverified without a token.",
      "A later push to main would change what is served; this evidence is valid only at verifiedAt.",
      "PASS here means PRODUCTION_WEB_SHA_IDENTIFIED only. It does not certify the web build, the cloud, or any other gate.",
    ],
    privacy: "Public build metadata only. No cookies, tokens or headers beyond content-type, cache-control and the Netlify request id were stored.",
  };
}

function validateEvidence(e) {
  const errors = [];
  if (!["PASS", "NOT_PROVEN", "BLOCKED"].includes(e.status)) errors.push("BAD_STATUS");
  for (const k of ["status", "sha", "url", "verifiedAt", "method"]) if (!(k in e)) errors.push(`MISSING_KEY:${k}`);
  if (Number.isNaN(Date.parse(e.verifiedAt))) errors.push("BAD_VERIFIED_AT");
  if (e.status === "PASS") {
    if (!FULL_SHA.test(e.sha ?? "")) errors.push("PASS_WITHOUT_FULL_SHA");
    if (e.identity?.commitSha !== e.sha) errors.push("PASS_SHA_NOT_FROM_VERSION_JSON");
    if (!e.fetch?.versionJsonOk) errors.push("PASS_WITHOUT_LIVE_FETCH");
    if (!e.bundle?.shaFoundInBundle || !(e.bundle?.shaOccurrences > 0)) errors.push("PASS_WITHOUT_BUNDLE_MATCH");
    if (!e.git?.knownLocally || !e.git?.ancestorOfOriginMain) errors.push("PASS_WITHOUT_GIT_ANCESTRY");
    if (e.identity?.environment !== "production_beta") errors.push("PASS_WRONG_ENVIRONMENT");
    if (!Array.isArray(e.method) || !e.method.length) errors.push("PASS_WITHOUT_METHOD");
    if (e.reasons?.length) errors.push("PASS_WITH_OPEN_REASONS");
  }
  if (e.status === "BLOCKED" && e.sha) errors.push("BLOCKED_WITH_SHA");
  if (e.status !== "PASS" && !(e.reasons?.length)) errors.push("NON_PASS_WITHOUT_REASON");
  if (e.netlifyApi?.attempted === false && !e.netlifyApi?.skipped) errors.push("NETLIFY_SKIP_NOT_EXPLAINED");
  if (/NETLIFY_AUTH_TOKEN\s*=|nfp_[A-Za-z0-9]{10,}|eyJ[A-Za-z0-9_-]{20,}\./.test(JSON.stringify(e))) errors.push("SECRET_IN_EVIDENCE");
  const probe = ["at", "omurus"].join("");
  if (JSON.stringify(e).toLowerCase().includes(probe)) errors.push("LON001_SIBLING_PROJECT_NAMED");
  return errors;
}

function mutationTests() {
  const failures = [];
  const base = JSON.parse(fs.readFileSync(path.join(root, OUT), "utf8"));
  const survive = (name, mutated) => {
    if (!validateEvidence(mutated).length) failures.push(`MUTATION_SURVIVED:${name}`);
  };
  if (base.status === "PASS") {
    survive("short sha", { ...base, sha: base.sha.slice(0, 7) });
    survive("sha differs from version.json", { ...base, sha: "0".repeat(40) });
    survive("no bundle match", { ...base, bundle: { ...base.bundle, shaFoundInBundle: false } });
    survive("not ancestor of main", { ...base, git: { ...base.git, ancestorOfOriginMain: false } });
    survive("no live fetch", { ...base, fetch: { ...base.fetch, versionJsonOk: false } });
    survive("wrong environment", { ...base, identity: { ...base.identity, environment: "qa_candidate" } });
    survive("no method", { ...base, method: [] });
  }
  survive("blocked with sha", { ...base, status: "BLOCKED", sha: "a".repeat(40), reasons: ["x"] });
  survive("non-pass without reason", { ...base, status: "NOT_PROVEN", reasons: [] });
  survive("unknown status", { ...base, status: "GREEN" });
  survive("token in evidence", { ...base, note: `nfp_${"A".repeat(24)}` });

  const live = (over) => ({ fetch: { reachable: true, versionJsonOk: true }, sha: "a".repeat(40), identity: { environment: "production_beta" }, bundle: { checked: true, shaFoundInBundle: true }, git: { knownLocally: true, ancestorOfOriginMain: true }, ...over });
  const expectStatus = (name, ev, want) => {
    if (classify(ev).status !== want) failures.push(`CLASSIFY_WRONG:${name}`);
  };
  expectStatus("unreachable -> BLOCKED", live({ fetch: { reachable: false, error: "ENOTFOUND" } }), "BLOCKED");
  expectStatus("no version.json -> NOT_PROVEN", live({ fetch: { reachable: true, versionJsonOk: false } }), "NOT_PROVEN");
  expectStatus("bundle mismatch -> NOT_PROVEN", live({ bundle: { checked: true, shaFoundInBundle: false } }), "NOT_PROVEN");
  expectStatus("unknown commit -> NOT_PROVEN", live({ git: { knownLocally: false, ancestorOfOriginMain: false } }), "NOT_PROVEN");
  expectStatus("not on main -> NOT_PROVEN", live({ git: { knownLocally: true, ancestorOfOriginMain: false } }), "NOT_PROVEN");
  expectStatus("all good -> PASS", live({}), "PASS");
  return failures;
}

const mode = process.argv[2];
if (!mode) {
  const ev = await collect();
  const evidence = toEvidence(ev, new Date().toISOString());
  const problems = validateEvidence(evidence);
  if (problems.length) {
    console.error(`[rc2-3-10b-prod-web-sha] refusing to write inconsistent evidence: ${problems.join(", ")}`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(root, OUT), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`[rc2-3-10b-prod-web-sha] ${evidence.status} sha=${evidence.sha ?? "-"} (${evidence.reasons.join("; ") || "all checks hold"})`);
} else if (mode === "validate") {
  const errors = fs.existsSync(path.join(root, OUT)) ? validateEvidence(JSON.parse(fs.readFileSync(path.join(root, OUT), "utf8"))) : [`MISSING:${OUT}`];
  if (errors.length) {
    console.error(`[rc2-3-10b-prod-web-sha] FAIL\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
  console.log("[rc2-3-10b-prod-web-sha] validate OK");
} else if (mode === "test") {
  const failures = mutationTests();
  if (failures.length) {
    console.error(`[rc2-3-10b-prod-web-sha] FAIL\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log("[rc2-3-10b-prod-web-sha] test OK: dishonest evidence is rejected");
} else {
  console.error("usage: rc2-3-10b-prod-web-sha.mjs [validate|test]");
  process.exit(2);
}
