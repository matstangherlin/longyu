/**
 * Guarda: scroll da página não pode ficar travado após sair do Lesson Player
 * (corrida ModalOverlay × useLessonPlayerScrollLock).
 *
 * Roda: node scripts/test-body-scroll-lock.mjs
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const lock = await readFile(path.join(rootDir, "src/lib/bodyScrollLock.ts"), "utf8");
const modal = await readFile(path.join(rootDir, "src/components/ui/ModalOverlay.tsx"), "utf8");
const playerLock = await readFile(path.join(rootDir, "src/hooks/useLessonPlayerScrollLock.ts"), "utf8");
const shell = await readFile(path.join(rootDir, "src/components/layout/AppShell.tsx"), "utf8");

assert(/acquireModalBodyScrollLock/.test(lock), "shared acquireModalBodyScrollLock");
assert(/releaseModalBodyScrollLock/.test(lock), "shared releaseModalBodyScrollLock");
assert(/releaseLessonPlayerPageScrollLock/.test(lock), "shared releaseLessonPlayerPageScrollLock");
assert(/ensurePageScrollUnlocked/.test(lock), "ensurePageScrollUnlocked safety belt");
assert(/dataset\.lessonPlayer/.test(lock), "coordinates with lessonPlayer dataset");

assert(/acquireModalBodyScrollLock/.test(modal), "ModalOverlay uses shared acquire");
assert(/releaseModalBodyScrollLock/.test(modal), "ModalOverlay uses shared release");
assert(!/previousBodyOverflow/.test(modal), "ModalOverlay no longer stores poisoned previous overflow");

assert(/releaseLessonPlayerPageScrollLock/.test(playerLock), "player lock releases via shared helper");
assert(/hasModalBodyScrollLock/.test(playerLock), "player lock respects open modal");

assert(/ensurePageScrollUnlocked/.test(shell), "AppShell clears orphan locks off player");

if (failures.length) {
  console.error("FAIL test:body-scroll-lock:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:body-scroll-lock (modal × player scroll lock coordination).");
