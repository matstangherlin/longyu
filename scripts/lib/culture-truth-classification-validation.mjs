/**
 * V4.11A.2 — classificação truth: legend/literature ≠ history; símbolo com escopo.
 */

function failList() {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  return { fail, failures };
}

function copyBlob(item) {
  return [
    item.titlePt,
    item.titleEn,
    item.summaryPt,
    item.summaryEn,
    item.bodyPt,
    item.bodyEn,
    item.situationPt,
    item.situationEn,
    item.noticePt,
    item.noticeEn,
    item.whyPt,
    item.whyEn,
    item.practicePt,
    item.practiceEn,
  ]
    .filter(Boolean)
    .join("\n");
}

const LITERATURE_IDS = new Set(["sun-wukong", "journey-to-the-west"]);

export function validateCultureTruthClassification(data) {
  const { fail, failures } = failList();
  const items = data.items ?? [];

  for (const item of items) {
    const blob = copyBlob(item);

    if (LITERATURE_IDS.has(item.id) && item.kind === "history") {
      fail("LITERATURE_AS_HISTORY", item.id, "obra/personagem literário não pode ser kind=history");
    }

    if (item.kind === "literature" || item.kind === "legend") {
      const signals =
        /na narrativa|na obra|personagem|literár|literary|narrative|character|tradição literária|literary tradition|lenda|legend/i.test(
          blob
        );
      if (!signals) {
        fail(
          "NARRATIVE_UNFRAMED",
          item.id,
          "copy de legend/literature precisa sinalizar narrativa/obra/personagem"
        );
      }
      if (
        item.id === "sun-wukong" &&
        /Sun Wukong nasceu|Sun Wukong was born|foi um general real|was a real general/i.test(blob) &&
        !/narrativa|obra|personagem|literary|narrative|character/i.test(blob)
      ) {
        fail("BIOGRAPHY_WITHOUT_FRAME", item.id, "biografia real sem marco narrativo");
      }
    }

    if (item.kind === "symbol") {
      if (/\b(sempre representa|always represents|SEMPRE significa|ALWAYS means)\b/i.test(blob)) {
        fail("SYMBOL_UNIVERSAL", item.id, "símbolo não pode universalizar sem escopo");
      }
    }

    if (item.kind === "festival" || item.kind === "documented_practice") {
      if (/\b(todo chinês|every Chinese person|todos os chineses sempre)\b/i.test(blob)) {
        fail("ABSOLUTE_PEOPLE", item.id, "evitar absolutizar 'todo chinês'");
      }
    }
  }

  return { failures };
}

export function validateCultureLegendVsHistory(data) {
  return validateCultureTruthClassification(data);
}
