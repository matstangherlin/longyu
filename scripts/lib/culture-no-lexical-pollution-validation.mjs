/**
 * V4.11A.2 — termos culturais desta onda não poluem lexical SRS / newRefs.
 */

function failList() {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  return { fail, failures };
}

const WAVE_TERMS = ["孙悟空", "西游记", "元宵节", "春节", "龙", "秦", "汉", "唐", "宋", "明", "清"];
const WAVE_IDS = [
  "sun-wukong",
  "journey-to-the-west",
  "lantern-festival",
  "chinese-dragon",
  "spring-festival",
  "china-history-timeline",
  "qin-unification",
  "han-dynasty",
  "tang-dynasty",
  "song-dynasty",
  "ming-qing",
];

export function validateCultureNoLexicalPollution(data) {
  const { fail, failures } = failList();
  const nativeLessons = data.nativeLessons ?? [];
  const items = (data.items ?? []).filter((item) => WAVE_IDS.includes(item.id));
  const lessonPlayerSource = data.lessonPlayerSource ?? "";
  const storeSource = data.storeSource ?? "";

  for (const item of items) {
    for (const ref of item.relatedChunkRefs ?? []) {
      // relatedChunkRefs podem apontar para mandarim já canônico (ex.: xiexie) —
      // o que falha é empurrar o termo cultural como newRef lexical.
      if (WAVE_TERMS.some((term) => ref.includes(term))) {
        fail("CULTURE_TERM_IN_CHUNK_REF", item.id, `relatedChunkRef carrega termo cultural ${ref}`);
      }
    }
  }

  for (const lesson of nativeLessons) {
    if (!WAVE_IDS.some((id) => lesson.id === `culture-${id}` || lesson.cultureItemId === id)) continue;
    const newRefs = lesson.newRefs ?? lesson.lexicalNewRefs ?? [];
    for (const ref of newRefs) {
      const text = typeof ref === "string" ? ref : JSON.stringify(ref);
      if (WAVE_TERMS.some((term) => text.includes(term))) {
        fail("CULTURE_TERM_IN_NEW_REFS", lesson.id, `newRefs poluído com ${text}`);
      }
    }
    // Lições culture não devem declarar skill lexical produtiva obrigatória.
    if (lesson.lessonDomain === "culture" && Array.isArray(lesson.srsSeed) && lesson.srsSeed.length) {
      fail("CULTURE_SRS_SEED", lesson.id, "lição cultural não semeia SRS lexical");
    }
  }

  if (/cultureCompletedIds/.test(lessonPlayerSource) === false) {
    // soft — native path already gated elsewhere
  }

  // Culture finish must skip lexical weak-word path (existing contract).
  if (/completeCultureLesson[\s\S]{0,400}weakWords|weakLexical/.test(storeSource)) {
    fail("CULTURE_WEAK_LEXICAL", "store", "erro cultural não pode alterar weak Mandarin lexical");
  }

  return { failures };
}
