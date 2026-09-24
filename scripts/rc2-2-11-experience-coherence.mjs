#!/usr/bin/env node
/**
 * RC2.2.11 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-11-experience-coherence.mjs validate <área>
 *   node scripts/rc2-2-11-experience-coherence.mjs test <área>
 *
 * validate = gate estático sobre as fontes reais + auditoria de dados.
 * test     = casos de runtime (módulos puros carregados de verdade) + mutações
 *            que o gate PRECISA pegar. Gates em scripts/lib/rc2-2-11-gates.mjs.
 */
import assert from "node:assert/strict";
import {
  GATES,
  auditAchievements,
  auditAllCultureDragon,
  auditCast,
  auditStoriesAgainstCast,
  expectMutationCaught,
  formatReport,
  it,
  loadStoriesAndCast,
  mutate,
  rcRequire,
  readSources,
  routePathsFromSource,
  runCases,
} from "./lib/rc2-2-11-gates.mjs";

globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.sessionStorage ??= (() => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
})();

const [mode, area] = process.argv.slice(2);
if (!GATES[area] || !["validate", "test"].includes(mode)) {
  console.error(`uso: validate|test <${Object.keys(GATES).join("|")}>`);
  process.exit(2);
}

const src = readSources();
const gate = GATES[area];
const name = `${mode}:${area}`;

// ── Auditorias de dados (validate) ──────────────────────────────────────────
const DATA_AUDITS = {
  "culture-dragon-lesson": () => {
    const { report } = auditAllCultureDragon();
    const failures = [];
    for (const { lesson, findings, afterDisplay } of report) {
      for (const finding of findings) {
        if (finding.kind === "feedback_repeats_dragon") continue; // tratado na exibição
        failures.push(`${lesson.id}: ${finding.kind}${finding.reason ? `/${finding.reason}` : ""} — ${String(finding.text).slice(0, 60)}`);
      }
      for (const finding of afterDisplay.filter((f) => f.kind === "feedback_repeats_dragon")) {
        failures.push(`${lesson.id}: explicação ainda repete o dragão depois da camada de exibição (passo ${finding.stepIndex})`);
      }
    }
    return failures;
  },
  "immersion-dialogue-ux": () => {
    const { INTERACTIVE_STORIES, cast } = loadStoriesAndCast();
    return auditStoriesAgainstCast(INTERACTIVE_STORIES, cast);
  },
  "character-identity": () => auditCast(loadStoriesAndCast().cast),
  "achievement-rarity": () => {
    const { total, medals, kinds } = auditAchievements();
    const failures = [];
    if (!kinds.every((kind) => ["milestone", "achievement", "medal"].includes(kind))) failures.push("AE: toda conquista tem tipo de apresentação");
    if (medals / total > 0.35) failures.push(`AG: medalhas precisam ser raras (${medals}/${total})`);
    if (medals < 5) failures.push(`AG: medalhas demais raras para a vitrine (${medals})`);
    return failures;
  },
  "smart-back-navigation": () => {
    const smart = rcRequire("../../src/lib/navigation/smartBack.ts");
    return routePathsFromSource(src.routes)
      .filter((route) => !smart.matchRouteBackEntry(route.replace(/:([a-zA-Z]+)/g, "x-$1")))
      .map((route) => `BD: ${route} sem entrada resolvível`);
  },
};

if (mode === "validate") {
  const failures = [...gate(src), ...(DATA_AUDITS[area]?.() ?? [])];
  console.log(formatReport(name, failures));
  process.exit(failures.length ? 1 : 0);
}

// ── Casos de runtime + mutações (test) ──────────────────────────────────────
const cases = [];
it(cases, "gate real passa", () => assert.deepEqual(gate(src), []));
const caught = (label, mutated) => expectMutationCaught(cases, label, gate, mutated);

const TESTS = {
  "culture-gloss-integration": () => {
    const { splitProseGloss, countKnownGlossTargets } = rcRequire("../../src/lib/proseGloss.ts");
    const known = new Set(["你好", "谢谢"]);
    it(cases, "prosa continua prosa; só Hànzì conhecido vira alvo", () => {
      const parts = splitProseGloss("你好 abre o contato; 龘 fica simples.", (run) => known.has(run));
      assert.equal(parts[0].kind, "hanzi");
      assert.equal(parts[0].known, true);
      assert.equal(parts[1].kind, "prose");
      assert.ok(parts[1].text.includes("abre o contato"));
      assert.equal(parts.find((p) => p.text === "龘").known, false);
      assert.equal(countKnownGlossTargets(parts), 1);
    });
    it(cases, "texto sem Hànzì = nenhum alvo", () => {
      assert.equal(countKnownGlossTargets(splitProseGloss("Só português.", () => true)), 0);
    });
    it(cases, "o gloss real conhece 你好 (referência lexical existente)", () => {
      const { getGlossaryEntry } = rcRequire("../../src/data/gloss.ts");
      assert.ok(getGlossaryEntry("你好"));
    });
    caught("1. glossa todo Hànzì, até sem entrada", mutate(src, "proseGlossText", 'part.kind === "hanzi" && part.known ?', 'part.kind === "hanzi" ?'));
    caught("2. dragão glossa durante o typewriter", mutate(src, "guideDialogue", '{gloss && state.phase === "complete" ? (', "{gloss ? ("));
    caught("3. gloss ligado fora da Cultura", mutate(src, "steps", 'gloss={step.pedagogicalEvidence?.domain === "culture"}', "gloss={true}"));
    caught("4. prova com gloss", mutate(src, "phaseChallengePage", 'import { useBackGuard }', 'import { ProseGlossText } from "../../components/hanzi/ProseGlossText";\nimport { useBackGuard }'));
    caught("5. motor paralelo CultureGlossEngine", { ...src, __files: [...src.__files, "src/lib/CultureGlossEngine.ts"] });
  },
  "culture-dragon-lesson": () => {
    const { report, dragon } = auditAllCultureDragon();
    it(cases, "30 aulas de Cultura auditadas", () => assert.equal(report.length, 30));
    it(cases, "cada aula abre com orient → notice → why", () => {
      for (const { lesson } of report) {
        const roles = dragon.cultureDragonLines(lesson).map((line) => line.role);
        assert.deepEqual([...new Set(roles)].slice(0, 3), ["orient", "notice", "why"], lesson.id);
      }
    });
    it(cases, "o dragão não repete o card nem a si mesmo", () => {
      const bad = report.flatMap(({ findings }) => findings.filter((f) => f.kind === "repeats_card_title" || f.kind === "repeats_own_line"));
      assert.deepEqual(bad, []);
    });
    it(cases, "explicação que repetia o dragão vira lembrete na exibição", () => {
      const before = report.flatMap(({ findings }) => findings.filter((f) => f.kind === "feedback_repeats_dragon")).length;
      const after = report.flatMap(({ afterDisplay }) => afterDisplay.filter((f) => f.kind === "feedback_repeats_dragon")).length;
      assert.ok(before > 0, "havia repetição real para tratar");
      assert.equal(after, 0);
    });
    it(cases, "fixture: fala repetida é pega", () => {
      const lesson = {
        steps: [
          { kind: "intro", title: "T", body: "Mesma fala.", pedagogicalEvidence: { domain: "culture" } },
          { kind: "intro", title: "U", body: "Mesma fala.", pedagogicalEvidence: { domain: "culture" } },
        ],
      };
      assert.ok(dragon.auditCultureDragon(lesson).some((f) => f.kind === "repeats_own_line"));
    });
    it(cases, "fixture: exclamação quebra o estilo", () => {
      const lesson = { steps: [{ kind: "intro", title: "T", body: "Que incrível!", pedagogicalEvidence: { domain: "culture" } }] };
      assert.ok(dragon.auditCultureDragon(lesson).some((f) => f.kind === "style"));
    });
    it(cases, "fixture: fala igual ao título do card é pega", () => {
      const lesson = { steps: [{ kind: "intro", title: "Chá", body: "Chá.", pedagogicalEvidence: { domain: "culture" } }] };
      assert.ok(dragon.auditCultureDragon(lesson).some((f) => f.kind === "repeats_card_title"));
    });
    caught("6. player sem camada de não-duplicação", mutate(src, "lessonPlayer", "cultureStepForDisplay(lesson, idx,", "((l, i) => l.steps[i])(lesson, idx,"));
    caught("7. contrato de função pedagógica removido", mutate(src, "cultureDragon", '["orient", "notice", "why"]', '["orient"]'));
    caught("8. estilo aceita exclamação", mutate(src, "cultureDragon", "maxExclamations: 0", "maxExclamations: 3"));
  },
  "culture-journey-reactivation": () => {
    const recall = rcRequire("../../src/lib/cultureJourneyRecall.ts");
    const { allCultureMemoryTargets } = rcRequire("../../src/data/cultureMissions.ts");
    const target = allCultureMemoryTargets().find((t) => t.cultureItemId === "greetings-nihao") ?? allCultureMemoryTargets()[0];
    const row = { targetId: target.id, cultureItemId: target.cultureItemId, due: 0, stage: 1, reps: 0, lapses: 0, updatedAt: 0 };
    const base = { cultureMemoryById: { [target.id]: row }, completedJourneyLessonIds: ["l1", "l2", "l3"], now: 10 };
    it(cases, "ensinar antes de testar: item não concluído não reaparece", () => {
      assert.equal(recall.planCultureJourneyRecall({ ...base, cultureCompletedIds: [] }), null);
    });
    it(cases, "item concluído e devido reaparece na fronteira", () => {
      const plan = recall.planCultureJourneyRecall({ ...base, cultureCompletedIds: [target.cultureItemId] });
      assert.equal(plan?.anchorLessonId, "l3");
      assert.equal(plan?.task.cultureItemId, target.cultureItemId);
    });
    it(cases, "espaçado: não devido não reaparece", () => {
      const notDue = { ...base, cultureMemoryById: { [target.id]: { ...row, due: 1e15 } } };
      assert.equal(recall.planCultureJourneyRecall({ ...notDue, cultureCompletedIds: [target.cultureItemId] }), null);
    });
    it(cases, "'Agora não' respeitado na sessão", () => {
      const plan = recall.planCultureJourneyRecall({ ...base, cultureCompletedIds: [target.cultureItemId], dismissedTargetIds: new Set([target.id]) });
      assert.equal(plan, null);
    });
    it(cases, "sem poluição lexical: Hànzì não visto bloqueia a pergunta", () => {
      const plan = recall.planCultureJourneyRecall({ ...base, cultureCompletedIds: [target.cultureItemId], knownHanzi: new Set() });
      const any = recall.planCultureJourneyRecall({ ...base, cultureCompletedIds: [target.cultureItemId] });
      if (recall.hanziIn(any?.task.step).length > 0) assert.equal(plan, null);
      else assert.ok(plan);
    });
    it(cases, "sem lição de mandarim concluída, sem âncora", () => {
      assert.equal(recall.planCultureJourneyRecall({ ...base, completedJourneyLessonIds: [], cultureCompletedIds: [target.cultureItemId] }), null);
    });
    caught("9. ignora teach-before-test", mutate(src, "cultureRecall", "    if (!taught.has(row.cultureItemId)) continue;\n", ""));
    caught("10. ignora poluição lexical", mutate(src, "cultureRecall", "unknownHanziIn(candidate, input.knownHanzi).length === 0", "true"));
    caught("11. agenda própria (segundo SRS)", mutate(src, "cultureRecall", "export function planCultureJourneyRecall(", "const schedule = { due: Date.now() };\nexport function planCultureJourneyRecall("));
    caught("12. resposta não volta para a memória de Cultura", mutate(src, "recallCard", 'reviewCultureMemory(task.targetId, option.preferred, "journey")', "void option.preferred"));
  },
  "immersion-dialogue-ux": () => {
    const { INTERACTIVE_STORIES, cast } = loadStoriesAndCast();
    it(cases, "toda história tem contexto, 2–6 falas e elenco resolvido", () => assert.deepEqual(auditStoriesAgainstCast(INTERACTIVE_STORIES, cast), []));
    it(cases, "fixture: história sem contexto é pega", () => {
      const broken = [{ ...INTERACTIVE_STORIES[0], context: undefined }];
      assert.ok(auditStoriesAgainstCast(broken, cast).some((f) => f.startsWith("Q:")));
    });
    it(cases, "fixture: cena de 1 fala é pega", () => {
      const broken = [{ ...INTERACTIVE_STORIES[0], steps: INTERACTIVE_STORIES[0].steps.filter((s, i) => !s.speaker || i === 0) }];
      assert.ok(auditStoriesAgainstCast(broken, cast).some((f) => f.startsWith("P:")));
    });
    caught("13. histórico aparece com pergunta aberta (entrega resposta)", mutate(src, "immersion", 'if (!interactive || revealed) return "full";\n  return "hidden";', 'return "full";'));
    caught("14. ouvir primeiro quebrado", mutate(src, "immersion", '(step.type !== "listen_choice" || revealed)', "true"));
    caught("15. erro da imersão não vai ao SRS", mutate(src, "immersion", "gradeSrs(target.type, target.itemId", "void (target.type, target.itemId"));
    caught("16. recap sem 'Rever palavras'", mutate(src, "immersion", 'data-testid="story-recap-review"', 'data-testid="story-recap-x"'));
    caught("17. bolha estoura em 360px", mutate(src, "immersion", "max-w-[85%]", "w-[420px]"));
  },
  "character-identity": () => {
    const { cast } = loadStoriesAndCast();
    it(cases, "elenco completo: Hànzì + romanização, lados fixos", () => assert.deepEqual(auditCast(cast), []));
    it(cases, "aluno: nome > @username > Você; nunca email", () => {
      assert.equal(cast.learnerDisplayName({ firstName: "Ana" }), "Ana");
      assert.equal(cast.learnerDisplayName({ username: "ana_li" }), "@ana_li");
      assert.equal(cast.learnerDisplayName({}), "Você");
    });
    it(cases, "Wang Wei/Chen Mei/Hua Laoshi na conversa; figurante mantém o papel", () => {
      assert.deepEqual(cast.castNameForSceneCharacter({ id: "mei", name: "Mei" }), { nameLatin: "Chen Mei", nameHanzi: "陈美" });
      assert.equal(cast.castNameForSceneCharacter({ id: "wang", name: "Wang", role: "Recepcionista" }).nameLatin, "Wang");
      assert.equal(cast.castNameForSceneCharacter({ id: "hua", name: "Prof. Hua" }).nameLatin, "Hua Laoshi");
    });
    it(cases, "fixture: aluno à esquerda é pego", () => {
      const bad = { ...cast, STORY_CAST: { ...cast.STORY_CAST, learner: { ...cast.STORY_CAST.learner, side: "left" } } };
      assert.ok(auditCast(bad).length > 0);
    });
    it(cases, "fixture: personagem sem Hànzì é pego", () => {
      const bad = { ...cast, STORY_CAST: { ...cast.STORY_CAST, mei: { ...cast.STORY_CAST.mei, nameHanzi: undefined } } };
      assert.ok(auditCast(bad).some((f) => f.startsWith("M:")));
    });
    caught("18. pessoas em characters.ts", mutate(src, "charactersData", "export ", "export const STORY_CAST_PEOPLE = { nameLatin: 'x' };\nexport "));
    caught("19. linha do aluno usa email", mutate(src, "storyCast", "export function learnerDisplayName(input: { firstName?: string; username?: string; fallback?: string }): string {", "export function learnerDisplayName(input: { firstName?: string; username?: string; fallback?: string; email?: string }): string {\n  if (input.email) return input.email;"));
    caught("20. conversa ignora o elenco", mutate(src, "conversationStep", "castNameForSceneCharacter(character)", "({ nameLatin: character.name, nameHanzi: undefined })"));
  },
  "sync-notice-policy": () => {
    const sync = rcRequire("../../src/lib/syncUx.ts");
    const fail = (state, now, extra = {}) => sync.syncNoticePolicy(state, { kind: "failure", resource: "cloud-progress", errorKind: "push", now, ...extra });
    it(cases, "rotina é silenciosa", () => {
      const d = sync.syncNoticePolicy({}, { kind: "routine", resource: "r", status: "loading", now: 1 });
      assert.equal(d.surface, "silent");
    });
    it(cases, "1ª e 2ª falha transitória: silêncio + retry", () => {
      const a = fail({}, 1000);
      const b = fail(a.state, 2000);
      assert.equal(a.surface, "silent");
      assert.equal(a.retry, true);
      assert.equal(b.surface, "silent");
      assert.equal(b.status, "pending");
    });
    it(cases, "3ª falha: UM aviso calmo; a próxima na janela é discreta", () => {
      const a = fail({}, 1000);
      const b = fail(a.state, 2000);
      const c = fail(b.state, 3000);
      const d = fail(c.state, 4000);
      assert.equal(c.surface, "global");
      assert.equal(c.message, sync.PERSISTENT_SYNC_MESSAGE);
      assert.equal(d.surface, "discrete");
    });
    it(cases, "janela de tempo também torna persistente", () => {
      const a = fail({}, 0);
      const b = fail(a.state, sync.SYNC_PERSISTENT_WINDOW_MS + 1);
      assert.equal(b.surface, "global");
    });
    it(cases, "sucesso zera o recurso", () => {
      const a = fail({}, 1);
      const ok = sync.syncNoticePolicy(a.state, { kind: "success", resource: "cloud-progress", now: 2 });
      assert.equal(ok.state["cloud-progress"], undefined);
    });
    it(cases, "ameaça de perda aparece na hora", () => assert.equal(fail({}, 1, { threatensLoss: true }).surface, "global"));
    it(cases, "chave de dedupe = tipo + recurso + janela", () => {
      assert.equal(sync.syncNoticeKey("push", "cloud-progress", 5), sync.syncNoticeKey("push", "cloud-progress", 6));
      assert.notEqual(sync.syncNoticeKey("push", "cloud-progress", 5), sync.syncNoticeKey("push", "economy", 5));
    });
    caught("21. transitório vira aviso", mutate(src, "syncUx", 'return { status: "pending", surface: "silent", message: null, retry: true, state: next };', 'return { status: "error", surface: "global", message: PERSISTENT_SYNC_MESSAGE, retry: false, state: next };'));
    caught("22. sem dedupe", mutate(src, "syncUx", "track.notifiedAt != null && event.now - track.notifiedAt < SYNC_ERROR_DEDUPE_MS", "false"));
    caught("23. coordenador ignora a política", mutate(src, "cloudSync", 'if (decision.surface === "global") useStore.getState().setEconomySyncMessage(message);', "useStore.getState().setEconomySyncMessage(message);"));
  },
  "league-fast-path": () => {
    const view = rcRequire("../../src/lib/leagueLiveView.ts");
    it(cases, "cache primeiro, flush nunca bloqueia", () => {
      const plan = view.planLeagueLoad({ hasCache: true, pendingXp: 50, cloud: true });
      assert.equal(plan.firstContent, "cache");
      assert.equal(plan.flushBlocksFetch, false);
    });
    it(cases, "sem cache na nuvem: carregando (não demo falso)", () => {
      assert.equal(view.planLeagueLoad({ hasCache: false, pendingXp: 0, cloud: true }).firstContent, "loading");
    });
    it(cases, "cache persistido é por conta e só modo live", () => {
      const store = new Map();
      const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
      view.writePersistedLeagueCache("acc-1", { mode: "live", standings: [] }, 1, storage);
      assert.ok(view.readPersistedLeagueCache("acc-1", storage));
      assert.equal(view.readPersistedLeagueCache("acc-2", storage), null);
      // Demo nunca é persistido: o cache continua sendo o último live.
      view.writePersistedLeagueCache("acc-1", { mode: "demo", standings: [] }, 2, storage);
      assert.equal(view.readPersistedLeagueCache("acc-1", storage)?.payload.mode, "live");
      store.set("longyu:league-cache:v1", JSON.stringify({ accountKey: "acc-1", savedAt: 3, payload: { mode: "demo", standings: [] } }));
      assert.equal(view.readPersistedLeagueCache("acc-1", storage), null);
    });
    caught("24. flush de XP volta a bloquear", mutate(src, "leagueHook", "const pendingFlush = flushPendingLeagueXpSync()", "const pendingFlush = await flushPendingLeagueXpSync()"));
    caught("25. faixa 'Sincronizando XP' de volta", mutate(src, "ligasPage", 'data-testid="league-page"', 'data-testid="league-page"\n      data-banner="Sincronizando XP com a liga…"'));
    caught("26. cache de outra conta aceito", mutate(src, "leagueView", "parsed?.accountKey !== accountKey || ", ""));
  },
  "achievement-rarity": () => {
    const { total, medals, mod } = auditAchievements();
    const showcase = rcRequire("../../src/lib/profileShowcase.ts");
    it(cases, "medalhas raras (≤ 35%)", () => assert.ok(medals / total <= 0.35, `${medals}/${total}`));
    it(cases, "medalha mensal é medalha", () => assert.equal(mod.achievementPresentationKindById("missoes-medalha-mensal"), "medal"));
    it(cases, "vitrine descarta não-medalha (legado)", () => {
      const nonMedal = mod.ACHIEVEMENTS.find((def) => mod.achievementPresentationKind(def) !== "medal");
      const medal = mod.ACHIEVEMENTS.find((def) => mod.achievementPresentationKind(def) === "medal");
      const unlocked = { [nonMedal.id]: 1, [medal.id]: 2 };
      assert.deepEqual(showcase.normalizeFeaturedAchievementIds([nonMedal.id, medal.id], unlocked, undefined, mod.isMedalAchievementId), [medal.id]);
      assert.equal(showcase.toggleFeaturedAchievement([], nonMedal.id, unlocked, mod.isMedalAchievementId).reason, "not_medal");
    });
    caught("27. tudo vira medalha", mutate(src, "achievements", 'small: "milestone"', 'small: "medal"'));
    caught("28. vitrine aceita qualquer conquista", mutate(src, "profileShowcase", "isMedalAchievementId", "isAnyAchievementId"));
    caught("29. MedalEngine paralelo", { ...src, __files: [...src.__files, "src/lib/MedalEngine.ts"] });
    caught("30. página sem seções por raridade", mutate(src, "achievementsPage", '["medal", "achievement", "milestone"]', '["achievement"]'));
  },
  "profile-layout": () => {
    const profile = { PROFILE_RECENT_ACHIEVEMENTS_MAX: Number(src.profilePage.match(/PROFILE_RECENT_ACHIEVEMENTS_MAX = (\d+)/)?.[1]) };
    it(cases, "teto de conquistas recentes = 3", () => assert.equal(profile.PROFILE_RECENT_ACHIEVEMENTS_MAX, 3));
    caught("31. densidade sem teto", mutate(src, "profilePage", "PROFILE_RECENT_ACHIEVEMENTS_MAX = 3", "PROFILE_RECENT_ACHIEVEMENTS_MAX = 12"));
    caught("32. grade sem min-w-0 (sobreposição em 1366×768)", mutate(src, "profilePage", "[&>*]:min-w-0", ""));
    caught("33. teste de geometria removido", mutate(src, "e2eSpec", "expectNoOverlap", "expectAnything"));
  },
  "username-contract": () => {
    const u = rcRequire("../../src/lib/username.ts");
    const edge = rcRequire("../../supabase/functions/sign-in-identifier/usernameRules.ts");
    const table = [
      ["ana_li", true, "ana_li"],
      ["Ana.Li", true, "ana.li"],
      ["@ana_li", true, "ana_li"],
      ["ab", false, "too_short"],
      ["a".repeat(21), false, "too_long"],
      ["аdmin", false, "non_ascii"],
      ["joão", false, "non_ascii"],
      ["ana li", false, "non_ascii"],
      [".ana", false, "dot_edges"],
      ["ana..li", false, "double_dot"],
      ["ana-li", false, "invalid_chars"],
      ["ADMIN", false, "reserved"],
      ["longyu", false, "reserved"],
    ];
    for (const [input, ok, expected] of table) {
      it(cases, `checkUsername(${JSON.stringify(input)})`, () => {
        const res = u.checkUsername(input);
        assert.equal(res.ok, ok);
        assert.equal(ok ? res.username : res.reason, expected);
        assert.equal(edge.normalizeLoginUsername(input) !== null, ok || expected === "reserved");
      });
    }
    it(cases, "identificador: email × username × inválido", () => {
      assert.equal(u.classifyLoginIdentifier("ana@x.com").kind, "email");
      assert.equal(u.classifyLoginIdentifier("ana_li").kind, "username");
      assert.equal(u.classifyLoginIdentifier("admin").kind, "username"); // resposta genérica no servidor
      assert.equal(u.classifyLoginIdentifier("a").kind, "invalid");
      assert.equal(u.classifyLoginIdentifier("ana@").kind, "invalid");
    });
    it(cases, "flag desligada por padrão (CLOUD_APPLIED_FLAG_OFF)", () => {
      assert.equal(u.usernameLoginCloudEnabled({}), false);
      assert.equal(u.USERNAME_LOGIN_CLOUD_STATUS, "CLOUD_APPLIED_FLAG_OFF");
    });
    it(cases, "@handle nunca é email", () => {
      assert.equal(u.formatUsernameHandle("ana_li"), "@ana_li");
      assert.equal(u.formatUsernameHandle("ana@x.com"), null);
    });
    caught("34. Edge devolve email", mutate(src, "edgeFn", "      ok: true,\n      session: {", "      ok: true,\n      email,\n      session: {"));
    caught("35. username → id aberto para anon", mutate(src, "pendingSql", "grant execute on function public.resolve_login_identity(text) to service_role;", "grant execute on function public.resolve_login_identity(text) to service_role;\ngrant execute on function public.resolve_login_identity(text) to anon;"));
    caught("36. Unicode 'limpo' em vez de falhar fechado", mutate(src, "username", "const trimmed = raw.trim();", 'const trimmed = raw.trim().normalize("NFKD");'));
    caught("37. erro revela se o usuário existe", mutate(src, "username", 'GENERIC_LOGIN_ERROR = "Usuário/email ou senha incorretos."', 'GENERIC_LOGIN_ERROR = "Usuário não encontrado."'));
    caught("38. migration aplicada (em supabase/migrations)", { ...src, __files: [...src.__files, "supabase/migrations/20260924000000_username_identifier_login.sql"] });
    caught("39. reservados divergem entre cliente e SQL", mutate(src, "pendingSql", "  ('admin'),\n", ""));
    caught("40. Edge no deploy automático", mutate(src, "edgeCatalog", '  "issue-anon-ingestion-session",', '  "issue-anon-ingestion-session",\n  "sign-in-identifier",'));
    caught("41. padrão da Edge diverge do cliente", mutate(src, "edgeRules", "{1,18}", "{1,30}"));
  },
  "smart-back-navigation": () => {
    const smart = rcRequire("../../src/lib/navigation/smartBack.ts");
    smart.resetNavigationTrail();
    it(cases, "deep link sem histórico → pai lógico (replace)", () => {
      assert.deepEqual(smart.resolveSmartBack({ pathname: "/conquistas", canGoBack: false }), { kind: "navigate", to: "/perfil", replace: true });
      assert.deepEqual(smart.resolveSmartBack({ pathname: "/cultura/xyz", canGoBack: false }), { kind: "navigate", to: "/cultura", replace: true });
      assert.equal(smart.smartBackFallback("/cultura/revisao"), "/cultura");
    });
    it(cases, "histórico só quando a trilha confirma", () => {
      assert.deepEqual(smart.resolveSmartBack({ pathname: "/ajustes", canGoBack: true, previousPath: null }), { kind: "navigate", to: "/mais", replace: true });
      assert.deepEqual(smart.resolveSmartBack({ pathname: "/ajustes", canGoBack: true, previousPath: "/perfil" }), { kind: "history" });
    });
    it(cases, "raiz: nada; rota desconhecida: Jornada", () => {
      assert.deepEqual(smart.resolveSmartBack({ pathname: "/jornada", canGoBack: false }), { kind: "none" });
      assert.equal(smart.smartBackFallback("/nao-existe"), "/jornada");
    });
    it(cases, "destino explícito interno vale; externo é recusado", () => {
      assert.deepEqual(smart.resolveSmartBack({ pathname: "/hanzi/atlas", backTo: "/licao/l3", canGoBack: false }), { kind: "navigate", to: "/licao/l3", replace: true });
      assert.equal(smart.resolveSmartBack({ pathname: "/hanzi/atlas", backTo: "//evil.com", canGoBack: false }).to, "/ideogramas");
      assert.equal(smart.isSafeInternalPath("https://x.com"), false);
    });
    it(cases, "trilha: PUSH/POP/REPLACE", () => {
      smart.resetNavigationTrail();
      smart.recordNavigation("/jornada", "PUSH");
      smart.recordNavigation("/perfil", "PUSH");
      smart.recordNavigation("/conquistas", "PUSH");
      assert.equal(smart.previousInAppPath("/conquistas"), "/perfil");
      smart.recordNavigation("/perfil", "POP");
      assert.equal(smart.previousInAppPath("/perfil"), "/jornada");
      smart.recordNavigation("/amigos", "REPLACE");
      assert.equal(smart.previousInAppPath("/amigos"), "/jornada");
    });
    it(cases, "guarda segura o voltar e se desregistra", () => {
      const off = smart.registerBackGuard(() => true);
      assert.equal(smart.runBackGuard(), true);
      off();
      assert.equal(smart.runBackGuard(), false);
    });
    it(cases, "casca: sem botão em raiz, foco ou página com voltar próprio", () => {
      assert.equal(smart.shouldShowShellBack("/jornada"), false);
      assert.equal(smart.shouldShowShellBack("/licao/l1/player"), false);
      assert.equal(smart.shouldShowShellBack("/cultura/abc"), false);
      assert.equal(smart.shouldShowShellBack("/conquistas"), true);
    });
    caught("42. navigate(-1) cego de volta no Pro", mutate(src, "proPage", "onClick={goBack}", "onClick={() => navigate(-1)}"));
    caught("43. rota nova sem entrada no inventário", mutate(src, "routes", '{ path: "perfil", element: <ProfilePage /> },', '{ path: "perfil", element: <ProfilePage /> },\n      { path: "perfil/nova", element: <ProfilePage /> },'));
    caught("44. Android volta sempre para a Jornada", mutate(src, "nativeShell", "smartBackFallback(pathname)", '"/jornada"'));
    caught("45. prova sem guarda", mutate(src, "phaseChallengePage", "useBackGuard(Boolean(attemptId) && !grade", "void (Boolean(attemptId) && !grade"));
    caught("46. destino externo aceito", mutate(src, "smartBack", ' && !value.startsWith("//")', ""));
  },
};

TESTS[area]();
runCases(name, cases);
