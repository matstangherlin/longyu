/**
 * V4.11A.3 — History integrity + chronology + editorial wording.
 */

function failList() {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  return { fail, failures };
}

const EXPECTED_HISTORY_IDS = [
  "china-history-timeline",
  "qin-unification",
  "han-dynasty",
  "tang-dynasty",
  "song-dynasty",
  "ming-qing",
];

const DYNASTY_ORDER = ["qin-unification", "han-dynasty", "tang-dynasty", "song-dynasty", "ming-qing"];

function copyBlob(item) {
  return [
    item.titlePt,
    item.titleEn,
    item.summaryPt,
    item.summaryEn,
    item.bodyPt,
    item.bodyEn,
    item.whyPt,
    item.whyEn,
    item.practicePt,
    item.practiceEn,
  ]
    .filter(Boolean)
    .join("\n");
}

export function validateCultureHistoryIntegrity(data) {
  const { fail, failures } = failList();
  const items = data.items ?? [];
  const history = items.filter((item) => item.kind === "history");
  const byId = new Map(items.map((item) => [item.id, item]));

  if (history.length === 0) {
    fail("HISTORY_EMPTY", "catalog", "coleção History não pode ficar vazia após V4.11A.3");
  }

  for (const id of EXPECTED_HISTORY_IDS) {
    const item = byId.get(id);
    if (!item) {
      fail("HISTORY_MISSING", id, "item histórico esperado ausente");
      continue;
    }
    if (item.kind !== "history") fail("HISTORY_KIND", id, `esperado kind=history, got ${item.kind}`);
    if (!(item.sources ?? []).length) fail("HISTORY_NO_SOURCE", id, "history precisa de fonte");
    if ((item.sources ?? []).some((source) => source.role === "year_specific" || /holiday2026/i.test(source.title ?? ""))) {
      fail("HISTORY_ANNUAL_SOURCE", id, "holiday anual não basta como fonte histórica");
    }
    if (!String(item.titleEn ?? "").trim() || !String(item.bodyEn ?? "").trim()) {
      fail("HISTORY_MISSING_EN", id, "EN ausente");
    }
    if (!item.miniCheck?.explanationPt || !item.miniCheck?.explanationEn) {
      fail("HISTORY_NO_EXPLANATION", id, "miniCheck sem explanation");
    }
    const prompt = `${item.miniCheck?.promptPt ?? ""} ${item.miniCheck?.promptEn ?? ""}`;
    // Exact-year trivia as primary pattern is discouraged.
    if (/^(Em que ano|In what year|Qual o ano exacto|What exact year)/i.test(prompt.trim())) {
      fail("HISTORY_YEAR_TRIVIA", id, "quiz de ano exato como padrão pedagógico");
    }
    const blob = copyBlob(item);
    if (/construiu toda a Grande Muralha atual|built all of (today'?s )?Great Wall/i.test(blob) && !/não diga|do not say|não atribu|not say/i.test(blob)) {
      fail("HISTORY_WALL_OVERCLAIM", id, "não atribuir toda a muralha atual a Qin");
    }
    if (/foi objetivamente a melhor dinastia|objectively the best dynasty/i.test(blob) && !/evitar|avoid|não diga|do not/i.test(blob)) {
      fail("HISTORY_BEST_DYNASTY", id, "não romantizar Tang como melhor absoluta");
    }
    if (/inventou tudo( isso)?( num único dia)?|invented (all of )?everything( in a single day)?/i.test(blob) && !/não|not |evitar|avoid/i.test(blob)) {
      fail("HISTORY_INVENTED_EVERYTHING", id, "não absolutizar invenções Song");
    }
  }

  // Literature / symbol must not drift into history.
  for (const id of ["sun-wukong", "journey-to-the-west"]) {
    const item = byId.get(id);
    if (item?.kind === "history") fail("LITERATURE_AS_HISTORY", id, "literatura não vira history");
  }
  if (byId.get("chinese-dragon")?.kind === "history") {
    fail("SYMBOL_AS_HISTORY", "chinese-dragon", "símbolo não vira history");
  }

  // Collection progress: history shelf must have items.
  const progress = data.cultureCollectionProgress?.([]) ?? [];
  const histProgress = progress.find((row) => row.id === "china_history");
  if (histProgress && histProgress.total === 0) {
    fail("HISTORY_SHELF_EMPTY", "china_history", "Hub ainda mostra History vazia");
  }

  // Journey node budget: history wave must not create 6 nodes.
  const hubOnly = new Set(data.hubOnlyItemIds ?? []);
  const historyNodes = EXPECTED_HISTORY_IDS.filter((id) => !hubOnly.has(id) && byId.has(id));
  if (historyNodes.length > 2) {
    fail("HISTORY_JOURNEY_FLOOD", "placement", `${historyNodes.length} history nodes (máx 2)`);
  }

  const cultureNodes = (data.nodes ?? []).filter((node) => node.type === "CULTURE_LESSON");
  if (cultureNodes.length > 22) {
    fail("JOURNEY_NODE_BUDGET", "nodes", `${cultureNodes.length} culture nodes (máx 22)`);
  }

  return { failures };
}

export function validateCultureHistoryChronology(data) {
  const { fail, failures } = failList();
  const items = data.items ?? [];
  const byId = new Map(items.map((item) => [item.id, item]));
  const timeline = data.historyTimeline ?? [];
  const dynastyOrder = data.historyDynastyOrder ?? DYNASTY_ORDER;

  // Item.order must respect dynasty sequence among history dynasty lessons.
  const orders = dynastyOrder.map((id) => byId.get(id)?.order).filter((n) => Number.isFinite(n));
  for (let i = 1; i < orders.length; i += 1) {
    if (!(orders[i - 1] < orders[i])) {
      fail(
        "CHRONOLOGY_ORDER",
        dynastyOrder[i],
        `${dynastyOrder[i - 1]} (order ${orders[i - 1]}) deve preceder ${dynastyOrder[i]} (order ${orders[i]})`
      );
    }
  }

  // Timeline entries with startYear must be non-decreasing along dynasty markers.
  const dated = timeline.filter((entry) => entry.cultureItemId && Number.isFinite(entry.startYear));
  for (let i = 1; i < dated.length; i += 1) {
    if (dated[i].startYear < dated[i - 1].startYear) {
      fail(
        "TIMELINE_REGRESSION",
        dated[i].id,
        `${dated[i].id} (${dated[i].startYear}) antes de ${dated[i - 1].id} (${dated[i - 1].startYear})`
      );
    }
  }

  // Explicit forbidden reversals via fixture mutations on order.
  const tang = byId.get("tang-dynasty");
  const han = byId.get("han-dynasty");
  if (tang && han && Number(tang.order) < Number(han.order)) {
    fail("TANG_BEFORE_HAN", "tang-dynasty", "Tang não pode preceder Han");
  }
  const song = byId.get("song-dynasty");
  if (song && tang && Number(song.order) < Number(tang.order)) {
    fail("SONG_BEFORE_TANG", "song-dynasty", "Song não pode preceder Tang");
  }

  return { failures };
}
