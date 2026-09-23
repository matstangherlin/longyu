/**
 * RC2.2.9 — BETA_PEDAGOGY_FREEZE: recusa expansão silenciosa do escopo
 * pedagógico da Public Beta. Função pura: o validate:* passa o estado real, o
 * test:* passa estados mutados.
 */
import fs from "node:fs";
import path from "node:path";

export const SYSTEM_MODULE_PATTERN = /(srs|challenge|achievement|progression|mastery|streak|league|economy|pearl|currency|reward|exam|coin|gem|wallet)/i;
export const SYSTEM_MODULE_DIRS = ["src/lib", "src/data", "src/features/challenge"];

export function listSystemModules(root) {
  const out = [];
  for (const dir of SYSTEM_MODULE_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && SYSTEM_MODULE_PATTERN.test(entry.name)) {
        out.push(`${dir}/${entry.name}`);
      }
    }
  }
  return out.sort();
}

export function economyExportNames(source) {
  return [...source.matchAll(/^export (?:const|function|type|interface) ([A-Za-z0-9_]+)/gm)].map((match) => match[1]);
}

/**
 * @param {object} data
 * @param {object} data.freeze        BETA_PEDAGOGY_FREEZE
 * @param {string} data.frozenFingerprint RC_BASE_FINGERPRINT
 * @param {string} data.fingerprint   fingerprint calculado da Jornada
 * @param {object} data.counts        contagens reais (mesmas chaves de freeze.counts)
 * @param {string[]} data.systemModules
 * @param {string[]} data.economyExports
 * @param {string[]} data.featureTruthIds
 */
export function validateBetaPedagogyFreeze(data) {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  const { freeze } = data;
  if (freeze?.id !== "RC2_2_9_BETA_PEDAGOGY_FREEZE") fail("FREEZE_ID", "curriculumFreeze", `id ${freeze?.id}`);
  if (freeze.fingerprint !== data.frozenFingerprint) {
    fail("FREEZE_FINGERPRINT", "curriculumFreeze", `${freeze.fingerprint} ≠ RC_BASE_FINGERPRINT ${data.frozenFingerprint}`);
  }
  if (data.fingerprint !== freeze.fingerprint) {
    fail("FINGERPRINT_DRIFT", "journey", `currículo mudou (${data.fingerprint} ≠ ${freeze.fingerprint}) sem atualizar o freeze`);
  }
  const codeFor = {
    lessons: "NEW_LESSON",
    teachingTopics: "NEW_TEACHING_TOPIC",
    cultureItems: "NEW_CULTURE_ITEM",
    cultureNativeLessons: "NEW_CULTURE_LESSON",
    journeyCultureNodes: "NEW_JOURNEY_CULTURE_NODE",
    cultureMoments: "NEW_CULTURE_MOMENT",
    toneTransferPlayable: "TONE_TRANSFER_DRIFT",
    conversationCapabilities: "CAPABILITY_COUNT_DRIFT",
    conversationCapabilitiesRuntimeReady: "CAPABILITY_READY_DRIFT",
  };
  for (const [key, expected] of Object.entries(freeze.counts)) {
    if (data.counts[key] !== expected) fail(codeFor[key] ?? "COUNT_DRIFT", key, `${data.counts[key]} ≠ ${expected}`);
  }
  const frozenModules = new Set(freeze.systemModules);
  for (const file of data.systemModules) {
    if (!frozenModules.has(file)) {
      const code = /srs/i.test(file)
        ? "NEW_SRS"
        : /challenge|exam/i.test(file)
          ? "NEW_CHALLENGE_ENGINE"
          : /achievement/i.test(file)
            ? "NEW_ACHIEVEMENT_ENGINE"
            : /economy|pearl|currency|coin|gem|wallet|reward/i.test(file)
              ? "NEW_CURRENCY"
              : "NEW_PROGRESSION_SYSTEM";
      fail(code, file, "módulo de sistema novo sem atualizar BETA_PEDAGOGY_FREEZE");
    }
  }
  const frozenEconomy = new Set(freeze.economyExports);
  for (const name of data.economyExports) {
    if (!frozenEconomy.has(name)) fail("NEW_CURRENCY", `economy.ts:${name}`, "export novo na economia sem atualizar o freeze");
  }
  const frozenFeatures = new Set(freeze.featureTruthIds);
  for (const id of data.featureTruthIds) {
    if (!frozenFeatures.has(id)) fail("NEW_PUBLIC_FEATURE", id, "feature pública nova sem atualizar o freeze");
  }
  return failures;
}
