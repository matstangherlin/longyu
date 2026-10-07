#!/usr/bin/env node
/**
 * Netlify `ignore` hook: exit 0 = skip this build, exit 1 = build.
 * See scripts/lib/netlify-deploy-policy.mjs.
 */
import { execSync } from "node:child_process";
import { netlifyBuildDecision } from "./lib/netlify-deploy-policy.mjs";

let commitMessage;
try {
  commitMessage = execSync("git log -1 --pretty=%B", { encoding: "utf8" });
} catch {
  commitMessage = undefined;
}
const decision = netlifyBuildDecision({
  context: process.env.CONTEXT,
  commitMessage,
  force: process.env.LONGYU_FORCE_PRODUCTION_DEPLOY,
});
console.log(`[netlify-ignore] ${decision.build ? "BUILD" : "SKIP"} — ${decision.reason}`);
process.exit(decision.build ? 1 : 0);
