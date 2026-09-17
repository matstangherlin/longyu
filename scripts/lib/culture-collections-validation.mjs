/**
 * V4.11A — regras das Culture Collections.
 *
 * O que este gate protege, em uma frase: a aba Cultura tem coleções reais,
 * todo item mora em exatamente uma, e a prateleira nunca contradiz o tipo do
 * item (lenda não aparece em História).
 */

function failList() {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  return { fail, failures };
}

export function validateCultureCollections(data) {
  const { fail, failures } = failList();
  const collections = data.collections ?? [];
  const items = data.items ?? [];
  const kinds = data.kinds ?? [];
  const collectionForItem = data.collectionForItem;

  if (collections.length < 2) {
    fail("NO_COLLECTIONS", "catalog", "a aba precisa de coleções, não de uma lista única");
  }

  // Toda coleção declara título e blurb por chave i18n — nunca literal.
  for (const collection of collections) {
    if (!collection.titleKey?.startsWith("culture.")) {
      fail("I18N", collection.id, "titleKey deve ser chave i18n culture.*");
    }
    if (!collection.blurbKey?.startsWith("culture.")) {
      fail("I18N", collection.id, "blurbKey deve ser chave i18n culture.*");
    }
    if (!Array.isArray(collection.kinds) || collection.kinds.length === 0) {
      fail("EMPTY_KINDS", collection.id, "coleção sem kinds não pode receber item");
    }
  }

  // Um kind não pode morar em duas prateleiras: seria item em dois lugares.
  const seen = new Map();
  for (const collection of collections) {
    for (const kind of collection.kinds ?? []) {
      if (seen.has(kind)) {
        fail("KIND_IN_TWO_COLLECTIONS", kind, `${seen.get(kind)} e ${collection.id}`);
      }
      seen.set(kind, collection.id);
    }
  }

  // Cobertura total: todo kind declarado tem casa. Sem isto, um item novo de
  // kind novo some da aba sem ninguém perceber.
  for (const kind of kinds) {
    if (!seen.has(kind)) fail("KIND_WITHOUT_COLLECTION", kind, "nenhuma coleção aceita este kind");
  }

  // Todo item cai em exatamente uma coleção, e ela existe.
  const ids = new Set(collections.map((c) => c.id));
  for (const item of items) {
    if (!item.kind) {
      fail("ITEM_WITHOUT_KIND", item.id, "CultureItem precisa declarar kind");
      continue;
    }
    if (!kinds.includes(item.kind)) {
      fail("UNKNOWN_KIND", item.id, `kind fora do registro: ${item.kind}`);
      continue;
    }
    let resolved;
    try {
      resolved = collectionForItem ? collectionForItem(item) : seen.get(item.kind);
    } catch {
      fail("UNRESOLVED", item.id, "collectionForItem lançou");
      continue;
    }
    if (!resolved || !ids.has(resolved)) {
      fail("UNRESOLVED", item.id, `coleção inexistente: ${resolved}`);
    }
  }

  // História e Lenda/Literatura nunca dividem prateleira — é o ponto da P2.
  const historyHome = seen.get("history");
  for (const narrative of ["legend", "literature"]) {
    if (seen.has(narrative) && historyHome && seen.get(narrative) === historyHome) {
      fail(
        "LEGEND_AS_HISTORY",
        narrative,
        `${narrative} não pode morar na mesma coleção que history`
      );
    }
  }

  return { failures };
}

/** Progresso por coleção: X de Y, sem mastery novo. */
export function validateCultureCollectionProgress(data) {
  const { fail, failures } = failList();
  const progressFor = data.cultureCollectionProgress;
  const items = data.items ?? [];

  if (typeof progressFor !== "function") {
    fail("NO_PROGRESS", "catalog", "cultureCollectionProgress ausente");
    return { failures };
  }

  const empty = progressFor([]);
  const covered = empty.reduce((n, row) => n + row.total, 0);
  if (covered !== items.length) {
    fail("COVERAGE", "catalog", `coleções cobrem ${covered} itens, catálogo tem ${items.length}`);
  }
  for (const row of empty) {
    if (row.done !== 0) fail("PROGRESS", row.id, "sem concluídas, done deve ser 0");
    if (row.total < 0) fail("PROGRESS", row.id, "total negativo");
  }

  // Concluir um item move exatamente uma coleção, e só em +1.
  const sample = items[0];
  if (sample) {
    const after = progressFor([sample.id]);
    const moved = after.filter((row) => row.done > 0);
    if (moved.length !== 1 || moved[0].done !== 1) {
      fail("PROGRESS", sample.id, "concluir 1 item deve mover exatamente 1 coleção em +1");
    }
    const totalsBefore = empty.map((r) => r.total).join(",");
    const totalsAfter = after.map((r) => r.total).join(",");
    if (totalsBefore !== totalsAfter) {
      fail("PROGRESS", "catalog", "concluir item não pode mudar o total da coleção");
    }
  }

  // Id desconhecido não infla progresso.
  const bogus = progressFor(["nao-existe-no-catalogo"]);
  if (bogus.some((row) => row.done > 0)) {
    fail("PROGRESS", "catalog", "id desconhecido não pode contar como concluído");
  }

  return { failures };
}
