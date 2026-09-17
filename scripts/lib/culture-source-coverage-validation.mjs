/**
 * V4.11A.2 — cobertura de fontes + papel evergreen vs year_specific.
 */

function failList() {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  return { fail, failures };
}

function isYearSpecific(source) {
  return source?.role === "year_specific";
}

function isEvergreen(source) {
  return !isYearSpecific(source);
}

export function validateCultureSourceCoverage(data) {
  const { fail, failures } = failList();
  const items = data.items ?? [];

  for (const item of items) {
    const sources = item.sources ?? [];
    if (!sources.length) {
      fail("MISSING_SOURCE", item.id, "todo CultureItem publicado precisa de ≥1 fonte");
      continue;
    }

    const evergreen = sources.filter(isEvergreen);
    const yearSpecific = sources.filter(isYearSpecific);

    if (item.kind === "festival" && evergreen.length === 0) {
      fail(
        "FESTIVAL_NO_EVERGREEN",
        item.id,
        "festival evergreen não pode depender só de fonte anual"
      );
    }

    if ((item.kind === "history" || item.kind === "legend" || item.kind === "literature") && evergreen.length === 0) {
      fail(
        "NARRATIVE_NO_EVERGREEN",
        item.id,
        `${item.kind} precisa de fonte durável apropriada`
      );
    }

    if (item.kind === "symbol" && evergreen.length === 0) {
      fail("SYMBOL_NO_EVERGREEN", item.id, "símbolo precisa de fonte evergreen");
    }

    for (const source of yearSpecific) {
      if (!Number.isFinite(Number(source.year))) {
        fail("YEAR_SOURCE_NO_YEAR", item.id, "fonte year_specific precisa declarar year");
      }
    }

    for (const fact of item.yearFacts ?? []) {
      if (!Number.isFinite(Number(fact.year))) {
        fail("YEAR_FACT_NO_YEAR", item.id, "yearFact.year obrigatório");
      }
      if (!String(fact.verifiedAt ?? "").trim()) {
        fail("YEAR_FACT_NO_VERIFIED", item.id, "yearFact.verifiedAt obrigatório");
      }
      if (!fact.source) {
        fail("YEAR_FACT_NO_SOURCE", item.id, "yearFact.source obrigatório");
      } else if (isYearSpecific(fact.source) && Number(fact.source.year) !== Number(fact.year)) {
        fail(
          "YEAR_FACT_SOURCE_MISMATCH",
          item.id,
          `yearFact ${fact.year} não pode usar fonte do ano ${fact.source.year}`
        );
      }
      if (!String(fact.labelPt ?? "").trim() || !String(fact.labelEn ?? "").trim()) {
        fail("YEAR_FACT_I18N", item.id, "yearFact precisa de labelPt e labelEn");
      }
    }
  }

  return { failures };
}

export { isEvergreen, isYearSpecific };
