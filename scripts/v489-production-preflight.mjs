#!/usr/bin/env node
import process from "node:process";
import {
  V489_BACKEND_RC,
  V489_BASE_MAIN_SHA,
  V489_DECISION,
  V489_PENDING_MIGRATIONS,
  V489_PRODUCTION_PROJECT_ID,
  V489_PRODUCTION_WATERMARK,
  V489_PRODUCTION_WRITE_BOUNDARY,
  V489_SCOREBOARD,
} from "./lib/v489-production-preflight.mjs";

const forbidden = new Set(["--apply", "--deploy", "--write", "--push", "--set-secret", "--create-user"]);
const requested = process.argv.slice(2).filter((arg) => forbidden.has(arg));
if (requested.length) {
  console.error(`REFUSED: V4.8.9 is preflight-only; hosted mutation flags are forbidden: ${requested.join(", ")}`);
  console.error(V489_PRODUCTION_WRITE_BOUNDARY);
  process.exit(2);
}

console.log(JSON.stringify({
  remessa: "V4.8.9",
  backend_rc: V489_BACKEND_RC,
  base_main_sha: V489_BASE_MAIN_SHA,
  production_project_id: V489_PRODUCTION_PROJECT_ID,
  production_watermark: V489_PRODUCTION_WATERMARK,
  pending_migrations: V489_PENDING_MIGRATIONS.length,
  production_writes: 0,
  stripe_live_writes: 0,
  decision: V489_DECISION,
  scoreboard: V489_SCOREBOARD,
  boundary: V489_PRODUCTION_WRITE_BOUNDARY,
}, null, 2));
