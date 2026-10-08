/**
 * RC2.3.6 — Jev EVIDENCE SEMANTIC AUDITOR (DEV_AUDIT only).
 *
 * Asks Jev, offline and in development only, whether each kind of learner
 * evidence means what the deterministic rules say it means. Jev never runs in
 * the learner bundle and never sets mastery: its answers only flag rules for a
 * human to look at. Fail-open: no key / no network → status UNAVAILABLE and the
 * product is unaffected.
 *
 * Cost controls: one item per evidence skill (deduped by input hash), cache by
 * inputHash + model, hard item limit, changed-first sampling.
 */
import crypto from "node:crypto";

export const JEV_MODEL = "jev-latest";
export const JEV_AUDIT_ITEM_LIMIT = 40;

/** Plain description of what each evidence skill observes (input to Jev). */
export const SKILL_DESCRIPTIONS = {
  MEANING_CHOICE: "The learner picks the Portuguese meaning of a Chinese word from 3-4 options.",
  LISTENING_CHOICE: "The learner hears a Chinese word and picks which written option they heard.",
  FORM_RECOGNITION: "The learner identifies the correct pinyin or written form among options.",
  PRODUCTION_STEP: "The learner types the Chinese answer for a prompt with no options shown.",
  SRS_REVIEW: "Spaced-repetition review: the learner recalls the meaning of a word they studied days ago.",
  HANZI_RECOGNITION: "The learner recognizes a Chinese character among similar-looking options.",
  HANZI_ASSEMBLY: "The learner assembles a character by choosing its components in the right positions.",
  HANZI_COMPLETE: "The learner completes a character where one component is missing.",
  HANZI_TRACE: "The learner traces a character over a visible guide that shows every stroke.",
  HANZI_MEMORY_WRITE: "The learner handwrites a character from memory with no guide visible.",
  HANZI_CONTEXT_USE: "The learner handwrites a character from memory to fill a blank inside a sentence.",
  SPEECH_PERCEPTION: "The learner hears two Chinese syllables that differ in one sound or tone and identifies which one was played, over several rounds.",
  SPEECH_SELF_COMPARE: "The learner records their own voice saying a word and listens to it next to a native model. Nothing is graded.",
  ASR_TEXT: "A speech recognizer transcribes what the learner said and the transcription matches the target words. The recognizer does not evaluate tones.",
  CONTEXTUAL_CHOICE: "In a short everyday situation, the learner chooses the right Chinese phrase from options.",
  DIALOGUE_COMPLETION: "The learner completes a missing line in a short dialogue, choosing or ordering pieces.",
  SENTENCE_PRODUCTION: "The learner builds a full Chinese sentence for a situation by ordering words.",
  FREE_PRODUCTION: "The learner writes their own Chinese answer to an open situation with no options.",
  CONVERSATIONAL_TRANSFER: "The learner completes a multi-turn conversation in a new situation, answering each turn.",
  CULTURE_OBSERVED: "The learner reads a short culture note.",
  CULTURE_PRACTICE: "The learner answers one question right after reading a culture note.",
  CULTURE_SCENARIO: "The learner applies a cultural concept to decide what to do in a realistic scenario.",
  CULTURE_RECALL: "Days later, the learner recalls a cultural concept without seeing the note.",
  LEGACY_PRIOR: "Before this system existed, the learner had already met this word in some lesson; no details were kept.",
};

export const AUDIT_QUESTIONS = {
  competency: {
    type: "choice",
    instructions: "Which language competency does a correct answer in this activity mainly show",
    criteria: {
      meaning: "Understanding what it means",
      listening: "Recognizing it by ear",
      form: "Recognizing its written form (characters or pinyin)",
      production: "Producing it: writing, typing, building or saying it",
    },
  },
  strength: {
    type: "score",
    instructions: "How strongly ONE correct answer in this activity proves the learner can do it independently in real use",
    criteria: ["Proves almost nothing", "Weak evidence", "Moderate evidence", "Strong evidence"],
  },
  ambiguous: {
    type: "noul",
    instructions: "A correct answer could easily happen without the skill (guessing, copying a visible guide, or the activity not checking it)",
  },
  remediation: {
    type: "choice",
    instructions: "After the learner fails this activity several times, what is the best next step",
    criteria: {
      easier_same_skill: "An easier activity on the same skill",
      perception_first: "Go back to listening and perception before producing",
      model_and_retry: "Show a model again and retry",
      meaning_first: "Review the meaning first",
    },
  },
};

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function inputHash(state, questions = AUDIT_QUESTIONS, model = JEV_MODEL) {
  return crypto.createHash("sha256").update(stableJson({ model, state, questions })).digest("hex").slice(0, 16);
}

/** Items to audit: one per skill, deduped by input hash, changed-first, capped. */
export function auditItems(skills, { previousHashes = new Set(), limit = JEV_AUDIT_ITEM_LIMIT } = {}) {
  const items = [];
  const seen = new Set();
  for (const [skill, rule] of Object.entries(skills)) {
    const description = SKILL_DESCRIPTIONS[skill];
    if (!description) continue;
    const state = `Activity in a Mandarin learning app for Portuguese speakers.\n${description}`;
    const hash = inputHash(state);
    if (seen.has(hash)) continue;
    seen.add(hash);
    items.push({ skill, rule, state, hash, changed: !previousHashes.has(hash) });
  }
  items.sort((a, b) => Number(b.changed) - Number(a.changed) || a.skill.localeCompare(b.skill));
  return items.slice(0, limit);
}

/** Map our 0–1 strength to Jev's 0–3 scale band. */
export const strengthBand = (s) => (s < 0.25 ? 0 : s < 0.5 ? 1 : s < 0.8 ? 2 : 3);

/**
 * Calibration against the human-authored rules (EVIDENCE_SKILLS + ceilings).
 * Status: NOT_CALIBRATED (<10 answered) · EXPERIMENTAL (<30 or agreement <0.8) · CALIBRATED.
 */
export function calibrate(items, answers) {
  const rows = [];
  for (const item of items) {
    const a = answers[item.hash];
    if (!a) continue;
    const jevCompetency = a.competency?.choice ?? null;
    const jevStrength = typeof a.strength?.score === "number" ? a.strength.score : null;
    const ourBand = strengthBand(item.rule.strength);
    rows.push({
      skill: item.skill,
      ourCompetency: item.rule.dimension,
      jevCompetency,
      competencyAgrees: jevCompetency === item.rule.dimension,
      ourStrength: item.rule.strength,
      ourBand,
      jevStrength,
      strengthWithinOneBand: jevStrength === null ? null : Math.abs(jevStrength - ourBand) <= 1,
      jevAmbiguous: typeof a.ambiguous?.noul === "number" ? a.ambiguous.noul : null,
      jevRemediation: a.remediation?.choice ?? null,
      confidence: Math.min(a.competency?.confidence ?? 1, a.strength?.confidence ?? 1),
    });
  }
  const n = rows.length;
  // Jev's score scale is compressed (rarely > 2), so strength is compared by
  // RANK ORDER (Spearman) — does Jev order the kinds of evidence like we do?
  const ranked = rows.filter((r) => r.jevStrength !== null);
  const rank = (vals) => {
    const order = vals.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const out = new Array(vals.length);
    for (let i = 0; i < order.length; ) {
      let j = i;
      while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j += 1;
      for (let k = i; k <= j; k += 1) out[order[k][1]] = (i + j) / 2 + 1;
      i = j + 1;
    }
    return out;
  };
  const ra = rank(ranked.map((r) => r.ourStrength));
  const rb = rank(ranked.map((r) => r.jevStrength));
  const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const ma = mean(ra), mb = mean(rb);
  const cov = ra.reduce((acc, v, i) => acc + (v - ma) * (rb[i] - mb), 0);
  const sd = (a, m) => Math.sqrt(a.reduce((acc, v) => acc + (v - m) ** 2, 0));
  const strengthRankCorrelation = ranked.length > 2 ? cov / (sd(ra, ma) * sd(rb, mb) || 1) : 0;
  ranked.forEach((r, i) => (r.rankGap = Math.abs(ra[i] - rb[i])));
  const competencyAgreement = n ? rows.filter((r) => r.competencyAgrees).length / n : 0;
  const strengthAgreement = n ? rows.filter((r) => r.strengthWithinOneBand).length / n : 0;
  const status = n < 10 ? "NOT_CALIBRATED" : n < 30 || competencyAgreement < 0.8 ? "EXPERIMENTAL" : "CALIBRATED";
  const disagreements = rows.filter((r) => !r.competencyAgrees || (r.rankGap ?? 0) >= 8);
  return { n, competencyAgreement, strengthAgreement, strengthRankCorrelation, status, rows, disagreements };
}
