import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import {
  validateCultureCollections,
  validateCultureCollectionProgress,
} from "./lib/culture-collections-validation.mjs";

const base = loadCultureRuntime();

assert.deepEqual(validateCultureCollections(base).failures, [], "positive control (structure)");
assert.deepEqual(
  validateCultureCollectionProgress(base).failures,
  [],
  "positive control (progress)"
);

function fixture() {
  return {
    ...base,
    items: structuredClone(base.items),
    collections: structuredClone(base.collections),
    kinds: [...base.kinds],
    // As funções não sobrevivem a structuredClone; as mutações que precisam
    // mexer nelas substituem explicitamente.
    collectionForItem: base.collectionForItem,
    cultureCollectionProgress: base.cultureCollectionProgress,
  };
}

function mutation(label, edit, code, validator = validateCultureCollections) {
  const data = fixture();
  edit(data);
  const failures = validator(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} sobreviveu (esperado ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

// M1 — a aba volta a ser lista única de curiosidades.
mutation(
  "M1 coleções somem e a aba vira lista única",
  (data) => {
    data.collections = [data.collections[0]];
  },
  "NO_COLLECTIONS"
);

// M2 — item publicado sem tipo semântico: não tem prateleira.
mutation(
  "M2 CultureItem sem kind",
  (data) => {
    delete data.items[0].kind;
  },
  "ITEM_WITHOUT_KIND"
);

// M3 — kind inventado fora do registro.
mutation(
  "M3 item com kind fora do registro",
  (data) => {
    data.items[0].kind = "vibes";
  },
  "UNKNOWN_KIND"
);

// M4 — kind novo entra sem ganhar coleção: o item sumiria da aba.
mutation(
  "M4 kind sem coleção que o aceite",
  (data) => {
    data.kinds = [...data.kinds, "recipe"];
  },
  "KIND_WITHOUT_COLLECTION"
);

// M5 — mesmo kind em duas prateleiras: item apareceria duas vezes.
mutation(
  "M5 kind em duas coleções",
  (data) => {
    data.collections[1].kinds = [...data.collections[1].kinds, "festival"];
  },
  "KIND_IN_TWO_COLLECTIONS"
);

// M6 — o erro que a P2 existe para impedir: lenda arquivada como história.
mutation(
  "M6 legend mora na mesma coleção que history",
  (data) => {
    const history = data.collections.find((c) => c.kinds.includes("history"));
    const legends = data.collections.find((c) => c.kinds.includes("legend"));
    legends.kinds = legends.kinds.filter((k) => k !== "legend");
    history.kinds = [...history.kinds, "legend"];
  },
  "LEGEND_AS_HISTORY"
);

// M7 — literatura arquivada como documento histórico.
mutation(
  "M7 literature mora na mesma coleção que history",
  (data) => {
    const history = data.collections.find((c) => c.kinds.includes("history"));
    const legends = data.collections.find((c) => c.kinds.includes("literature"));
    legends.kinds = legends.kinds.filter((k) => k !== "literature");
    history.kinds = [...history.kinds, "literature"];
  },
  "LEGEND_AS_HISTORY"
);

// M8 — título literal em vez de chave i18n quebra PT-BR/EN da P26.
mutation(
  "M8 coleção com título literal em vez de chave i18n",
  (data) => {
    data.collections[0].titleKey = "Festivais";
  },
  "I18N"
);

// M9 — coleção que não aceita kind nenhum: prateleira morta na aba.
mutation(
  "M9 coleção sem kinds",
  (data) => {
    data.collections[0].kinds = [];
  },
  "EMPTY_KINDS"
);

// M10 — progresso deixa de cobrir o catálogo: item some da contagem.
mutation(
  "M10 progresso não cobre todo o catálogo",
  (data) => {
    const real = base.cultureCollectionProgress;
    data.cultureCollectionProgress = (done) =>
      real(done).map((row, i) => (i === 0 ? { ...row, total: row.total - 1 } : row));
  },
  "COVERAGE",
  validateCultureCollectionProgress
);

// M11 — id desconhecido infla progresso (X/Y mentindo para o aluno).
mutation(
  "M11 id desconhecido conta como concluído",
  (data) => {
    const real = base.cultureCollectionProgress;
    data.cultureCollectionProgress = (done) =>
      real(done).map((row, i) => (i === 0 ? { ...row, done: (done ?? []).length } : row));
  },
  "PROGRESS",
  validateCultureCollectionProgress
);

// M12 — concluir um item muda o total da coleção em vez do concluído.
mutation(
  "M12 concluir item mexe no total",
  (data) => {
    const real = base.cultureCollectionProgress;
    data.cultureCollectionProgress = (done) =>
      real(done).map((row) => ({ ...row, total: row.total + (done ?? []).length }));
  },
  "PROGRESS",
  validateCultureCollectionProgress
);

console.log("OK: test:culture-collections — 12 mutações mortas.");
