#!/usr/bin/env node
/**
 * RC2.2.12 · Z — versionCode desta árvore vs. todo upload real já registrado.
 *
 *   npm run android:version:check
 *
 * Mesmo guard do play-upload (assertVersionCodeIncreases): sai 6 com
 * VERSION_CODE_NOT_INCREASING se o versionCode não superar o maior do ledger
 * (docs/release/android-release-ledger.json). Ledger vazio = nenhum upload
 * ainda; qualquer versionCode ≥ 1 passa.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertVersionCodeIncreases, computeVersionCode, readGitState, readVersionFloor } from "./lib/release-identity.mjs";

export function ledgerVersionCodes(ledger) {
  return (ledger?.releases ?? []).map((release) => Number(release.versionCode)).filter(Number.isInteger);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const ledger = JSON.parse(fs.readFileSync(path.join(root, "docs/release/android-release-ledger.json"), "utf8"));
  const git = readGitState(root);
  const candidate = computeVersionCode({ floor: readVersionFloor(root), firstParentCount: git.firstParentCount });
  const previous = ledgerVersionCodes(ledger);
  try {
    assertVersionCodeIncreases(candidate, previous);
    console.log(`android:version:check OK · versionCode ${candidate} · maior já enviado ${previous.length ? Math.max(...previous) : "— (nenhum upload real)"}`);
  } catch (error) {
    console.error(String(error.message));
    process.exit(6);
  }
}
