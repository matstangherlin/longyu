/**
 * test:conversation-vocabulary
 *
 * Testa o Conversation Vocabulary Loop (src/data/conversationVocabulary.ts):
 * o manifesto do vocabulário realmente EXIBIDO por uma conversa resolvida.
 *
 * Transpila o módulo + dependências e roda os casos obrigatórios: cena V1/V2,
 * ramificada, variantes beginner/intermediate/advanced, ramo de erro, opcional
 * ausente, item novo/antigo, texto sem referência, deduplicação, chunk com
 * vários hànzì e mesma palavra repetida — além de determinismo nas cenas reais.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const errors = [];
const fail = (m) => errors.push(m);
const assert = (c, m) => {
  if (!c) fail(m);
};

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-conv-vocab-"));
try {
  const program = ts.createProgram(
    [
      "src/data/conversationVocabulary.ts",
      "src/data/conversationScenes.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/types.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error("Falha ao compilar o grafo para test:conversation-vocabulary.");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const { buildConversationVocabularyManifest, reusableRefsFromManifest } = load(
    "src/data/conversationVocabulary.js"
  );
  const { CONVERSATION_SCENES } = load("src/data/conversationScenes.js");

  const CHARS = [
    { id: "lin", name: "Lin", avatar: "lin", side: "left" },
    { id: "mei", name: "Mei", avatar: "mei", side: "right" },
  ];
  const node = (id, hanzi, pinyin, extra = {}) => ({ id, speakerId: "lin", hanzi, pinyin, ...extra });
  const v1Scene = (over) => ({
    kind: "conversation_scene",
    title: "t",
    sceneId: "syn-v1",
    setting: "classroom",
    characters: CHARS,
    lines: [],
    intent: "cumprimentar",
    learnedRefs: [],
    ...over,
  });

  const itemsByRef = (m) => Object.fromEntries(m.items.map((i) => [i.ref, i]));

  // ── 1. Cena V1 (lines + checkpoint) ───────────────────────────────────────
  {
    const scene = v1Scene({
      sceneId: "v1",
      lines: [
        { speakerId: "lin", hanzi: "你好", pinyin: "nǐ hǎo" },
        { speakerId: "mei", hanzi: "你好", pinyin: "nǐ hǎo" },
      ],
      checkpoint: { type: "choose_reply", prompt: "Responda", options: ["你好", "谢谢"], correctAnswer: "你好" },
      learnedRefs: ["chunk:nihao"],
    });
    const m = buildConversationVocabularyManifest(scene);
    assert(m.format === "v1", "V1: formato deve ser v1");
    const items = itemsByRef(m);
    assert(items["chunk:nihao"], "V1: deve extrair chunk:nihao");
    assert(items["chunk:nihao"].roles.includes("required"), "V1: chunk:nihao é obrigatório");
    assert(m.coverage.missingRefs.length === 0, "V1: sem refs obrigatórios faltando");
  }

  // ── 2. Cena V2 (nodes + interaction) ──────────────────────────────────────
  {
    const scene = v1Scene({
      sceneId: "v2",
      entryNodeId: "a",
      nodes: [
        node("a", "你好", "nǐ hǎo", {
          interaction: { type: "choose_reply", prompt: "Responda", options: ["谢谢", "你好"], correctAnswer: "谢谢", correctNextNodeId: "b" },
        }),
        node("b", "谢谢", "xièxie"),
      ],
      learnedRefs: ["chunk:nihao", "chunk:xiexie"],
    });
    const m = buildConversationVocabularyManifest(scene);
    assert(m.format === "v2", "V2: formato deve ser v2");
    const items = itemsByRef(m);
    assert(items["chunk:nihao"] && items["chunk:xiexie"], "V2: extrai chunks das falas");
    assert(items["chunk:xiexie"].roles.includes("response"), "V2: 谢谢 aparece na resposta esperada → response");
    assert(items["chunk:xiexie"].sources.includes("expected_answer"), "V2: fonte expected_answer");
  }

  // ── 3 & 7. Cena ramificada + ramo de erro ─────────────────────────────────
  {
    const scene = v1Scene({
      sceneId: "branch",
      entryNodeId: "a",
      nodes: [
        node("a", "你好", "nǐ hǎo", {
          interaction: {
            type: "choose_reply",
            prompt: "Responda",
            options: ["谢谢", "再见"],
            correctAnswer: "谢谢",
            correctNextNodeId: "ok",
            wrongNextNodeId: "err",
          },
        }),
        node("ok", "谢谢", "xièxie"),
        node("err", "再见", "zàijiàn", { nextNodeId: "a" }),
      ],
      learnedRefs: ["chunk:nihao", "chunk:xiexie", "chunk:zaijian"],
    });
    const m = buildConversationVocabularyManifest(scene);
    const items = itemsByRef(m);
    assert(items["chunk:zaijian"], "Ramo: extrai vocabulário do ramo de erro");
    assert(items["chunk:zaijian"].sources.includes("wrong_branch"), "Ramo: 再见 vem do wrong_branch");
    assert(items["chunk:xiexie"].sources.includes("main_line"), "Ramo: 谢谢 (ok) vem do caminho principal");
  }

  // ── 4/5/6. Variantes beginner / intermediate / advanced ───────────────────
  {
    const variantScene = v1Scene({
      sceneId: "variants",
      // base = advanced
      entryNodeId: "a",
      nodes: [node("a", "你好吗", "nǐ hǎo ma")],
      learnedRefs: ["chunk:nihaoma"],
      variants: [
        { stage: "beginner", learnedRefs: ["chunk:nihao"], entryNodeId: "b", nodes: [node("b", "你好", "nǐ hǎo")] },
        {
          stage: "intermediate",
          learnedRefs: ["chunk:nihao", "chunk:xiexie"],
          entryNodeId: "c",
          nodes: [node("c", "你好", "nǐ hǎo", { nextNodeId: "c2" }), node("c2", "谢谢", "xièxie")],
        },
      ],
    });
    const beginner = buildConversationVocabularyManifest(variantScene, {});
    assert(beginner.stage === "beginner", "Variante: sem refs disponíveis → beginner");
    assert(itemsByRef(beginner)["chunk:nihao"] && !itemsByRef(beginner)["chunk:nihaoma"], "Beginner: mostra só 你好");

    const intermediate = buildConversationVocabularyManifest(variantScene, {
      availableRefs: new Set(["chunk:nihao", "chunk:xiexie"]),
    });
    assert(intermediate.stage === "intermediate", "Variante: refs intermediários → intermediate");
    assert(itemsByRef(intermediate)["chunk:xiexie"], "Intermediate: inclui 谢谢");

    const advanced = buildConversationVocabularyManifest(variantScene, {
      availableRefs: new Set(["chunk:nihao", "chunk:xiexie", "chunk:nihaoma"]),
    });
    assert(advanced.stage === "advanced", "Variante: todos os refs → advanced");
    assert(itemsByRef(advanced)["chunk:nihaoma"], "Advanced: mostra 你好吗 (variante efetivamente exibida)");
    assert(!itemsByRef(advanced)["chunk:nihao"], "Advanced: 你好 vira parte de 你好吗, não item separado");
  }

  // ── 8. Vocabulário opcional ausente ───────────────────────────────────────
  {
    const scene = v1Scene({
      sceneId: "optional",
      lines: [{ speakerId: "lin", hanzi: "你好", pinyin: "nǐ hǎo" }],
      learnedRefs: ["chunk:nihao"],
      optionalRefs: ["chunk:xiexie"], // não aparece no texto
    });
    const m = buildConversationVocabularyManifest(scene);
    assert(!itemsByRef(m)["chunk:xiexie"], "Opcional ausente: não vira item");
    assert(!m.warnings.some((w) => w.includes("chunk:xiexie")), "Opcional ausente: não gera aviso");
    assert(m.coverage.missingRefs.length === 0, "Opcional ausente: não conta como obrigatório faltando");
  }

  // ── 9 & 10. Item novo e item antigo ───────────────────────────────────────
  {
    const scene = v1Scene({
      sceneId: "newold",
      lines: [
        { speakerId: "lin", hanzi: "你好", pinyin: "nǐ hǎo" },
        { speakerId: "mei", hanzi: "谢谢", pinyin: "xièxie" },
      ],
      learnedRefs: ["chunk:nihao"], // antigo (reused)
      newRefs: ["chunk:xiexie"], // novo
    });
    const m = buildConversationVocabularyManifest(scene);
    const items = itemsByRef(m);
    assert(items["chunk:nihao"].roles.includes("reused") && items["chunk:nihao"].roles.includes("required"), "Antigo: reused+required");
    assert(!items["chunk:nihao"].roles.includes("new"), "Antigo: não é new");
    assert(items["chunk:xiexie"].roles.includes("new"), "Novo: role new");
    assert(m.coverage.requiredRefs.includes("chunk:xiexie"), "Novo entra em requiredRefs");
  }

  // ── 11. Texto sem referência cadastrada ───────────────────────────────────
  {
    const scene = v1Scene({
      sceneId: "unresolved",
      lines: [{ speakerId: "lin", hanzi: "你好龘", pinyin: "nǐ hǎo ?" }],
      learnedRefs: ["chunk:nihao"],
    });
    const m = buildConversationVocabularyManifest(scene);
    assert(m.coverage.unresolvedTexts.includes("龘"), "Sem ref: 龘 registrado como não resolvido");
    const unresolvedItem = m.items.find((i) => i.ref === "unresolved:龘");
    assert(unresolvedItem && unresolvedItem.resolved === false, "Sem ref: item não resolvido presente");
    assert(m.warnings.some((w) => w.includes("龘")), "Sem ref: gera aviso (não é ignorado silenciosamente)");
  }

  // ── 12 & 14. Deduplicação + mesma palavra repetida ────────────────────────
  {
    const scene = v1Scene({
      sceneId: "dedup",
      lines: [
        { speakerId: "lin", hanzi: "你好", pinyin: "nǐ hǎo" },
        { speakerId: "mei", hanzi: "你好", pinyin: "nǐ hǎo" },
        { speakerId: "lin", hanzi: "你好", pinyin: "nǐ hǎo" },
      ],
      learnedRefs: ["chunk:nihao"],
    });
    const m = buildConversationVocabularyManifest(scene);
    const nihao = m.items.filter((i) => i.ref === "chunk:nihao");
    assert(nihao.length === 1, "Dedup: 你好 repetido vira um único item");
    assert(nihao[0].occurrences === 3, "Dedup: occurrences conta as 3 aparições");
  }

  // ── 13. Chunk que contém vários hànzì ─────────────────────────────────────
  {
    const scene = v1Scene({
      sceneId: "multichar",
      lines: [{ speakerId: "lin", hanzi: "你好", pinyin: "nǐ hǎo" }],
      learnedRefs: ["chunk:nihao"],
    });
    const m = buildConversationVocabularyManifest(scene);
    const items = itemsByRef(m);
    assert(items["chunk:nihao"], "Multi-hànzì: chunk:nihao é um único item");
    assert(!items["char:ni"] && !items["char:hao"], "Multi-hànzì: hànzì não são extraídos como itens isolados");
    assert(
      Array.isArray(items["chunk:nihao"].charRefs) &&
        items["chunk:nihao"].charRefs.includes("char:ni") &&
        items["chunk:nihao"].charRefs.includes("char:hao"),
      "Multi-hànzì: os hànzì do chunk ficam em charRefs"
    );
    // reusableRefs inclui o chunk e seus hànzì (para reúso em SRS).
    const reusable = reusableRefsFromManifest(m);
    assert(reusable.includes("chunk:nihao") && reusable.includes("char:ni") && reusable.includes("char:hao"), "reusableRefs expande hànzì do chunk");
  }

  // ── Determinismo em TODAS as cenas reais (V1 e V2) ────────────────────────
  {
    let v1 = 0;
    let v2 = 0;
    for (const scene of CONVERSATION_SCENES) {
      const a = buildConversationVocabularyManifest(scene, {});
      const b = buildConversationVocabularyManifest(scene, {});
      if (JSON.stringify(a) !== JSON.stringify(b)) fail(`Determinismo: manifesto instável em ${scene.sceneId}`);
      if (a.format === "v1") v1 += 1;
      else v2 += 1;
      // Todo item resolvido deve ter ref canônico chunk:/char:.
      for (const item of a.items) {
        if (item.resolved && !/^(chunk|char):/.test(item.ref)) fail(`Ref não canônico em ${scene.sceneId}: ${item.ref}`);
      }
    }
    assert(v1 > 0, "Deve haver ao menos uma cena V1 real coberta");
    assert(v2 > 0, "Deve haver ao menos uma cena V2 real coberta");
  }

  if (errors.length > 0) {
    console.error("ERRO: test:conversation-vocabulary falhou.");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("OK: test:conversation-vocabulary passou (14 casos + determinismo em cenas reais).");
} finally {
  await rm(outDir, { recursive: true, force: true });
}
