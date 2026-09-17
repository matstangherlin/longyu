/**
 * V4.11A.2 — política de datas de festival + holiday anual.
 */

import { isEvergreen, isYearSpecific } from "./culture-source-coverage-validation.mjs";

function failList() {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  return { fail, failures };
}

export function validateCultureFestivalDatePolicy(data) {
  const { fail, failures } = failList();
  const items = (data.items ?? []).filter((item) => item.kind === "festival");

  for (const item of items) {
    const sources = item.sources ?? [];
    const evergreen = sources.filter(isEvergreen);
    const onlyAnnual = sources.length > 0 && evergreen.length === 0 && sources.every(isYearSpecific);

    if (onlyAnnual) {
      fail(
        "EVERGREEN_ONLY_ANNUAL",
        item.id,
        "festival evergreen não pode ter só holiday anual como fonte"
      );
    }

    for (const fact of item.yearFacts ?? []) {
      if (!String(fact.verifiedAt ?? "").trim()) {
        fail("YEAR_FACT_NO_VERIFIED", item.id, "yearFact sem verifiedAt");
      }
      const src = fact.source;
      if (src && isYearSpecific(src) && Number(src.year) !== Number(fact.year)) {
        fail(
          "YEAR_FACT_WRONG_YEAR",
          item.id,
          `fato ${fact.year} com fonte year=${src.year}`
        );
      }
    }

    // Body evergreen não deve depender de uma única data gregoriana fixa como definição.
    const body = `${item.bodyPt ?? ""} ${item.bodyEn ?? ""}`;
    if (/\b(sempre em 1[ºo] de janeiro|always on january 1)\b/i.test(body)) {
      fail("FIXED_GREGORIAN_DEFINITION", item.id, "não definir festival por data gregoriana fixa");
    }
  }

  return { failures };
}
