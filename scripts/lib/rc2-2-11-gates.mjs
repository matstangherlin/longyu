/**
 * RC2.2.11 — Learning Coherence, Immersion, Identity & Navigation Hardening.
 *
 * Gates compartilhados. Cada `gateX(src)` recebe o mapa arquivo → texto e
 * devolve a lista de falhas (vazia = passa). Os `test:*` reaplicam o mesmo
 * gate sobre fontes MUTADAS e exigem que ele falhe, além de rodar os módulos
 * puros de verdade (rcRequire transpila TS).
 *
 * Regra da remessa (BX): nenhum motor novo. Cada gate também recusa
 * AchievementEngineV2, MedalEngine, CultureGlossEngine, ImmersionSRS,
 * SocialAccountStore, NavigationEngineV2 e LeagueSyncV2.
 */

import fs from "node:fs";
import path from "node:path";
import { rcRequire, stripComments } from "./rc2-2-8-gates.mjs";

export { rcRequire, stripComments };
export { expectMutationCaught, it, mutate, runCases } from "./rc2-2-8-gates.mjs";

const ROOT = process.cwd();

export const FILES = {
  // Cultura
  proseGloss: "src/lib/proseGloss.ts",
  proseGlossText: "src/components/hanzi/ProseGlossText.tsx",
  guideDialogue: "src/components/guide/GuideDialogue.tsx",
  steps: "src/features/lesson/steps.tsx",
  lessonPlayer: "src/features/lesson/LessonPlayer.tsx",
  cultureDragon: "src/lib/cultureDragon.ts",
  cultureRecall: "src/lib/cultureJourneyRecall.ts",
  recallCard: "src/features/journey/JourneyCultureRecallCard.tsx",
  momentCard: "src/features/journey/JourneyCultureMomentCard.tsx",
  journeyPage: "src/features/journey/JourneyPage.tsx",
  phaseChallengePage: "src/features/challenge/PhaseChallengePage.tsx",
  moduleChallengePage: "src/features/challenge/ModuleChallengePage.tsx",
  examBuilder: "src/features/challenge/examBuilder.ts",
  store: "src/lib/store.ts",
  // Imersão / identidade
  immersion: "src/features/immersion/ImmersionPage.tsx",
  stories: "src/data/interactiveStories.ts",
  storyCast: "src/data/storyCast.ts",
  charactersData: "src/data/characters.ts",
  conversationStep: "src/features/lesson/ConversationSceneStep.tsx",
  reportMeta: "scripts/lib/report-meta.mjs",
  // Sync / Liga
  syncUx: "src/lib/syncUx.ts",
  cloudSync: "src/services/cloudSyncCoordinator.ts",
  economyBanner: "src/components/economy/EconomySyncBanner.tsx",
  leagueView: "src/lib/leagueLiveView.ts",
  leagueHook: "src/hooks/useLeagueData.ts",
  ligasPage: "src/features/ligas/LigasPage.tsx",
  // Conquistas / Perfil
  achievements: "src/data/achievements.ts",
  achievementsPage: "src/features/conquistas/AchievementsPage.tsx",
  achievementsWatcher: "src/components/achievements/AchievementsWatcher.tsx",
  profileShowcase: "src/features/perfil/ProfileShowcase.tsx",
  profileShowcaseLib: "src/lib/profileShowcase.ts",
  profilePage: "src/features/perfil/ProfilePage.tsx",
  e2eSpec: "e2e/rc2-2-11-experience-coherence.spec.ts",
  // Username
  username: "src/lib/username.ts",
  authService: "src/services/authService.ts",
  cloudSignIn: "src/hooks/useCloudSignIn.ts",
  loginForm: "src/components/auth/CloudLoginForm.tsx",
  comecar: "src/features/onboarding/ComecarPage.tsx",
  edgeFn: "supabase/functions/sign-in-identifier/index.ts",
  edgeRules: "supabase/functions/sign-in-identifier/usernameRules.ts",
  pendingSql: "supabase/pending/rc2-2-11-username-identifier.sql",
  edgeCatalog: "scripts/lib/edge-functions.mjs",
  ptBR: "src/locales/pt-BR.ts",
  // Navegação
  smartBack: "src/lib/navigation/smartBack.ts",
  smartBackButton: "src/components/navigation/SmartBackButton.tsx",
  appShell: "src/components/layout/AppShell.tsx",
  nativeShell: "src/lib/platform/nativeShell.ts",
  routes: "src/routes.tsx",
  proPage: "src/features/pro/ProPage.tsx",
};

export function readSources(root = ROOT) {
  const src = {};
  for (const [key, rel] of Object.entries(FILES)) src[key] = fs.readFileSync(path.join(root, rel), "utf8");
  // Árvore de arquivos relevante para "nenhum motor novo" e "migration não aplicada".
  src.__files = listFiles(root, ["src", "supabase"]);
  // BF — todo arquivo de src/ com voltar cego (o gate permite só os dois donos).
  src.__blindBack = src.__files
    .filter((file) => /^src\/.*\.(ts|tsx)$/.test(file))
    .filter((file) => /navigate\(-1\)|history\.back\(\)/.test(stripComments(fs.readFileSync(path.join(root, file), "utf8"))))
    .filter((file) => file !== FILES.smartBackButton && file !== FILES.nativeShell);
  return src;
}

function listFiles(root, dirs) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".temp") continue;
        walk(rel);
      } else out.push(rel);
    }
  };
  for (const dir of dirs) if (fs.existsSync(path.join(root, dir))) walk(dir);
  return out;
}

function collect(checks) {
  const failures = [];
  for (const [ok, message] of checks) if (!ok) failures.push(message);
  return failures;
}

const code = (text) => stripComments(text ?? "");

/** BX — motores proibidos, por nome de arquivo ou de símbolo exportado. */
export const FORBIDDEN_ENGINES = [
  "AchievementEngineV2",
  "MedalEngine",
  "CultureGlossEngine",
  "ImmersionSRS",
  "SocialAccountStore",
  "NavigationEngineV2",
  "LeagueSyncV2",
];

function noNewEngine(src, names) {
  const hits = [];
  for (const file of src.__files ?? []) {
    const base = path.basename(file).replace(/\.[a-z]+$/i, "");
    if (names.some((name) => base.toLowerCase() === name.toLowerCase())) hits.push(file);
  }
  const exported = Object.entries(src)
    .filter(([key]) => !key.startsWith("__"))
    .filter(([, text]) => names.some((name) => new RegExp(`export\\s+(?:const|function|class|type)\\s+${name}\\b`).test(text ?? "")));
  return [hits.length === 0 && exported.length === 0, `BX: motor proibido (${names.join("/")}): ${[...hits, ...exported.map(([k]) => k)].join(", ")}`];
}

// ── A–C — Culture gloss ─────────────────────────────────────────────────────
export function gateCultureGloss(src) {
  const glossBranch = code(src.guideDialogue).match(/\{gloss && state\.phase === "complete" \? \(([\s\S]*?)\) : \(/);
  const examSources = `${src.phaseChallengePage}\n${src.moduleChallengePage}\n${src.examBuilder}`;
  return collect([
    [/from "\.\/GlossText"/.test(src.proseGlossText) && /<GlossText\b/.test(src.proseGlossText), "A1: ProseGlossText reusa o GlossText existente"],
    [/getGlossaryEntry\(run\) !== null/.test(src.proseGlossText), "A2: só referência lexical CONHECIDA vira consulta"],
    [/part\.kind === "hanzi" && part\.known \?/.test(code(src.proseGlossText)), "A2: Hànzì sem entrada fica texto simples"],
    [/examMode=\{examMode\}/.test(src.proseGlossText), "A3: ProseGlossText respeita examMode"],
    [Boolean(glossBranch) && /<ProseGlossText\b/.test(glossBranch?.[1] ?? ""), "A1: GuideDialogue só glossa com o texto completo (fora do typewriter)"],
    [/role="group"/.test(glossBranch?.[1] ?? "") && !/<button\b/.test(glossBranch?.[1] ?? ""), "A1: gloss no dragão sem botão dentro de botão"],
    [/gloss=\{step\.pedagogicalEvidence\?\.domain === "culture"\}/.test(src.steps), "A1: StepIntro liga gloss só em Cultura"],
    [/<ProseGlossText\b/.test(src.momentCard) && /<ProseGlossText\b/.test(src.recallCard), "A1: momentos e lembretes de Cultura na Jornada usam o gloss"],
    [!/ProseGlossText|gloss=\{true\}/.test(examSources), "A3: prova (Placement/Module/Phase Challenge) sem gloss"],
    noNewEngine(src, ["CultureGlossEngine"]),
  ]);
}

// ── D–F — Dragon na aula de Cultura ─────────────────────────────────────────
export function gateCultureDragon(src) {
  return collect([
    [/cultureStepForDisplay\(lesson, idx,/.test(code(src.lessonPlayer)), "D: LessonPlayer passa o passo pela camada de não-duplicação"],
    [/<GuideDialogue\b/.test(src.steps) && /guideMessagesFromExistingBody\(step\.body\)/.test(src.steps), "D: a fala do dragão vem do corpo do passo via GuideDialogue"],
    [/guideTextBlip\(/.test(src.guideDialogue), "D: voz do dragão = guideTextBlip existente"],
    [/CULTURE_DRAGON_ROLES_BY_POSITION[\s\S]{0,60}"orient", "notice", "why"/.test(src.cultureDragon), "E: contrato de função pedagógica orient/notice/why"],
    [/maxExclamations: 0/.test(src.cultureDragon) && /maxSentencesPerMessage: 3/.test(src.cultureDragon), "BN: estilo de voz calmo e curto"],
    [!/from "\.\.\/data\/cultureLessons"/.test(src.cultureDragon), "F: a camada de exibição não reescreve os dados da aula"],
  ]);
}

export function auditAllCultureDragon() {
  globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
  const { CULTURE_NATIVE_LESSONS } = rcRequire("../../src/data/cultureLessons.ts");
  const dragon = rcRequire("../../src/lib/cultureDragon.ts");
  const report = [];
  for (const lesson of CULTURE_NATIVE_LESSONS) {
    const findings = dragon.auditCultureDragon(lesson);
    const displayed = { ...lesson, steps: lesson.steps.map((_, i) => dragon.cultureStepForDisplay(lesson, i, (title) => `↺ ${title}`)) };
    const afterDisplay = dragon.auditCultureDragon(displayed);
    report.push({ lesson, findings, afterDisplay });
  }
  return { report, dragon };
}

// ── G–J — Cultura → Jornada ─────────────────────────────────────────────────
export function gateCultureRecall(src) {
  const plan = code(src.cultureRecall);
  return collect([
    [/buildCultureReviewSession\(eligible/.test(plan), "G: usa a mesma sessão da Revisão de Cultura (sem agendador novo)"],
    [/if \(!taught\.has\(row\.cultureItemId\)\) continue;/.test(plan), "H: ensinar antes de testar — só item concluído"],
    [/unknownHanziIn\(candidate, input\.knownHanzi\)\.length === 0/.test(plan), "I: sem poluição lexical — pula pergunta com Hànzì não visto"],
    [!/\bdue\s*[:=]|stage\s*[:=]/.test(plan), "G: o planner não escreve agenda própria"],
    [/reviewCultureMemory\(task\.targetId, option\.preferred, "journey"\)/.test(src.recallCard), "J: resposta alimenta a memória de Cultura com fonte journey"],
    [/source = "mission"\) =>/.test(src.store) && /\bsource,\n/.test(src.store), "J: store registra a fonte (journey|mission)"],
    [/<JourneyCultureRecallCard\b/.test(src.journeyPage) && /cultureRecall\?\.anchorLessonId === lesson\.id/.test(src.journeyPage), "G: um lembrete, na fronteira do aluno"],
    noNewEngine(src, ["CultureRecallEngine", "CultureSrs"]),
  ]);
}

// ── K–U — Imersão ───────────────────────────────────────────────────────────
export function gateImmersion(src) {
  const player = code(src.immersion);
  return collect([
    [/<StoryContextCard\b/.test(player) && /story-context-start/.test(player), "Q: cartão de contexto antes da cena"],
    [/<StoryTurn\b/.test(player) && /data-side=\{cast\.side\}/.test(player), "K: bolhas com lado fixo por personagem"],
    [/<StoryTranscript\b/.test(player) && /mode=\{storyTranscriptMode\(step, interactive, revealed\)\}/.test(player), "P: histórico multi-turno"],
    [/if \(!interactive \|\| revealed\) return "full";\s*return "hidden";/.test(player), "O: pergunta aberta esconde o histórico (não entrega resposta)"],
    [/step\.type !== "listen_choice" \|\| revealed/.test(player), "O: ouvir primeiro — Hànzì do listen_choice só depois de responder"],
    [/gradeSrs\(target\.type, target\.itemId/.test(player) && /recordActivityError\(error\)/.test(player), "R: erro da imersão alimenta o SRS e o perfil de fraquezas existentes"],
    [/<StoryRecap\b/.test(player) && /story-recap-review/.test(player) && /navigate\("\/revisao"\)/.test(player), "Q: recap com 'Rever palavras'"],
    [/max-w-\[85%\]/.test(player) && /min-w-0/.test(player), "BP: bolha cabe em 360px"],
    noNewEngine(src, ["ImmersionSRS"]),
  ]);
}

export function loadStoriesAndCast() {
  const { INTERACTIVE_STORIES } = rcRequire("../../src/data/interactiveStories.ts");
  const cast = rcRequire("../../src/data/storyCast.ts");
  return { INTERACTIVE_STORIES, cast };
}

/** Falhas de dados das histórias contra o elenco (usado por validate e test). */
export function auditStoriesAgainstCast(stories, cast) {
  const failures = [];
  for (const story of stories) {
    if (!story.context?.wherePt || !story.context?.goalPt) failures.push(`Q: ${story.id} sem cartão de contexto`);
    const turns = story.steps.filter((step) => step.speaker && step.speaker !== "Narrador").length;
    if (turns < 2 || turns > 6) failures.push(`P: ${story.id} tem ${turns} falas (2–6)`);
    for (const step of story.steps) {
      if (!step.speaker) continue;
      const member = cast.castForStorySpeaker(step.speaker);
      if (!member) failures.push(`M: ${story.id}/${step.id} speaker "${step.speaker}" fora do elenco`);
    }
  }
  return failures;
}

// ── M–N — Identidade de personagem ──────────────────────────────────────────
export function gateCharacterIdentity(src) {
  const cast = code(src.storyCast);
  return collect([
    [!/nameLatin|STORY_CAST/.test(src.charactersData), "M: pessoas não moram em characters.ts (registro de Hànzì)"],
    [!/storyCast/.test(src.reportMeta), "M: elenco não é CURRICULUM_SOURCE"],
    [/learnerDisplayName\(\{ firstName: studentName, username \}\)/.test(src.immersion), "N: linha do aluno usa nome/@username/Você"],
    [!/email/i.test(cast), "N: identidade de personagem/aluno nunca usa email"],
    [/castNameForSceneCharacter\(character\)/.test(src.conversationStep), "M: conversas da Jornada usam o nome canônico"],
    [/\[LEARNER_CAST_ID\]: \{[^}]*side: "right"/.test(cast), "K: aluno sempre à direita"],
  ]);
}

export function auditCast(cast) {
  const failures = [];
  for (const member of Object.values(cast.STORY_CAST)) {
    if (member.learner) {
      if (member.side !== "right") failures.push(`K: aluno precisa ficar à direita (${member.side})`);
      continue;
    }
    if (member.narrator) continue;
    if (member.side !== "left") failures.push(`K: ${member.id} precisa ficar à esquerda`);
    if (!member.nameHanzi || !/[㐀-鿿]/u.test(member.nameHanzi)) failures.push(`M: ${member.id} sem nome em Hànzì`);
    if (!member.nameLatin || /[㐀-鿿]/u.test(member.nameLatin)) failures.push(`M: ${member.id} sem romanização`);
  }
  const latin = Object.values(cast.STORY_CAST).map((m) => m.nameLatin);
  if (new Set(latin).size !== latin.length) failures.push("M: dois personagens com o mesmo nome");
  return failures;
}

// ── V–Y — Sync notice policy ────────────────────────────────────────────────
export function gateSyncNoticePolicy(src) {
  const coordinator = code(src.cloudSync);
  return collect([
    [/applySyncNoticePolicy\(/.test(coordinator), "V: o coordenador passa pela política central"],
    [/if \(decision\.surface === "global"\) useStore\.getState\(\)\.setEconomySyncMessage\(message\);/.test(coordinator), "W: só 'global' vira aviso de tela"],
    [/scheduleTransientRetry\(\)/.test(coordinator), "W: falha transitória re-tenta sozinha"],
    [/if \(!persistent\) \{\s*return \{ status: "pending", surface: "silent", message: null, retry: true/.test(code(src.syncUx)), "W: transitório = silencioso + retry"],
    [/track\.notifiedAt != null && event\.now - track\.notifiedAt < SYNC_ERROR_DEDUPE_MS/.test(code(src.syncUx)), "Y: dedupe por tipo + recurso + janela"],
    [/Seu progresso está salvo neste dispositivo/.test(src.syncUx), "X: mensagem persistente calma"],
    [!/Erro ao sincronizar/.test(`${src.economyBanner}\n${src.ligasPage}`), "V: nenhuma superfície monta erro de sync cru"],
  ]);
}

// ── Z–AD — Liga ─────────────────────────────────────────────────────────────
export function gateLeagueFastPath(src) {
  const hook = code(src.leagueHook);
  const flushAt = hook.indexOf("const pendingFlush = flushPendingLeagueXpSync()");
  const fetchAt = hook.indexOf("await fetchLiveLeagueData(");
  return collect([
    [flushAt >= 0 && fetchAt > flushAt && !/await flushPendingLeagueXpSync\(/.test(hook), "AA: flush de XP não bloqueia a classificação"],
    [/readPersistedLeagueCache\(accountKey\)/.test(hook) && /writePersistedLeagueCache\(/.test(hook), "Z: cache primeiro (persistido por conta)"],
    [/data-league-first-content=/.test(src.ligasPage) && /markFirstContent\(/.test(hook), "AD: mede tempo até o primeiro conteúdo"],
    [!/Sincronizando XP/.test(code(src.ligasPage)), "AC: sem faixa rotineira 'Sincronizando XP'"],
    [/parsed\?\.accountKey !== accountKey/.test(src.leagueView), "Z: cache de outra conta nunca aparece"],
    noNewEngine(src, ["LeagueSyncV2"]),
  ]);
}

// ── AE–AL — Raridade de conquistas ──────────────────────────────────────────
export function gateAchievementRarity(src) {
  return collect([
    [/export type AchievementPresentationKind = "milestone" \| "achievement" \| "medal"/.test(src.achievements), "AE: camada de apresentação milestone/achievement/medal"],
    [/"missoes-medalha-mensal": "medal"/.test(src.achievements), "AK: medalha mensal é medalha"],
    [/small: "milestone",\s*medium: "achievement",\s*large: "medal",/.test(src.achievements), "AG: raridade por tier (pequena = marco, média = conquista, grande = medalha)"],
    [/isMedalAchievementId/.test(src.profileShowcase) && /"not_medal"/.test(src.profileShowcaseLib), "AI: vitrine aceita só medalhas"],
    [/KIND_ORDER[^=]*= \["medal", "achievement", "milestone"\]/.test(src.achievementsPage), "AJ: página seccionada, medalhas primeiro"],
    [/achievementPresentationKind\(/.test(src.achievementsWatcher), "AF: modal de desbloqueio adapta à raridade"],
    [!/delete\s+[\w.]*achievementsUnlocked\[|achievementsUnlocked\s*:\s*\{\s*\}\s*,?\s*\/\/\s*revoke/i.test(code(src.store)), "AH: sem revogação"],
    noNewEngine(src, ["AchievementEngineV2", "MedalEngine"]),
  ]);
}

export function auditAchievements() {
  const mod = rcRequire("../../src/data/achievements.ts");
  const kinds = mod.ACHIEVEMENTS.map((def) => mod.achievementPresentationKind(def));
  const medals = kinds.filter((kind) => kind === "medal").length;
  return { total: kinds.length, medals, kinds, mod };
}

// ── AM–AO — Perfil ──────────────────────────────────────────────────────────
export function gateProfileLayout(src) {
  return collect([
    [/PROFILE_RECENT_ACHIEVEMENTS_MAX = 3/.test(src.profilePage) && /PROFILE_RECENT_HISTORY_MAX = 3/.test(src.profilePage), "AO: teto de densidade (3 + 3)"],
    [/\[&>\*\]:min-w-0/.test(src.profilePage), "AM: grade de recentes com min-w-0 (não estoura)"],
    [/relative isolate min-w-0 overflow-hidden/.test(src.profilePage), "AM: bloco recolhível isolado"],
    [/profile-recent-achievements/.test(src.profilePage) && /profile-recent-history/.test(src.profilePage), "AN: ids de geometria no Perfil"],
    [/1366, height: 768/.test(src.e2eSpec) && /390, height: 844/.test(src.e2eSpec) && /expectNoOverlap/.test(src.e2eSpec), "AN: teste de geometria 1366×768 … 390×844"],
    [!/`@\$\{first/.test(src.profilePage), "AQ: Perfil não inventa @apelido"],
  ]);
}

// ── AP–BC — Username ────────────────────────────────────────────────────────
export function gateUsername(src) {
  const edge = code(src.edgeFn);
  const edgeJsonBodies = [...edge.matchAll(/json\(req, (\{[\s\S]*?\})(?:, \d+)?\)/g)].map((m) => m[1]).join("\n");
  const clientPattern = src.username.match(/export const USERNAME_PATTERN = (\/.*\/);/)?.[1];
  const edgePattern = src.edgeRules.match(/export const USERNAME_PATTERN = (\/.*\/);/)?.[1];
  const sqlPattern = src.username.match(/export const USERNAME_SQL_PATTERN = "(.*)";/)?.[1];
  const reservedClient = [...(src.username.match(/RESERVED_USERNAMES[^=]*= \[([\s\S]*?)\];/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
  const reservedSql = [...(src.pendingSql.match(/insert into public\.reserved_usernames \(name\) values([\s\S]*?)on conflict/)?.[1] ?? "").matchAll(/\('([^']+)'\)/g)].map((m) => m[1]).sort();
  const grants = src.pendingSql.match(/grant execute on function public\.resolve_login_identity\(text\) to ([a-z_]+);/g) ?? [];
  return collect([
    [/USERNAME_MIN_LENGTH = 3/.test(src.username) && /USERNAME_MAX_LENGTH = 20/.test(src.username), "AP: 3–20 caracteres"],
    [/if \(!isPlainAscii\(username\)\) return \{ ok: false, reason: "non_ascii" \}/.test(src.username) && !/normalize\("NFK?[CD]"\)/.test(code(src.username)), "AP: Unicode falha fechado (nada de normalizar para ASCII)"],
    [Boolean(clientPattern) && clientPattern === edgePattern, "AP: mesmo padrão no cliente e na Edge"],
    [Boolean(sqlPattern) && src.pendingSql.split(sqlPattern).length >= 3, "AP: mesmo padrão na constraint e no claim da migration pendente"],
    [reservedClient.length > 0 && JSON.stringify(reservedClient) === JSON.stringify(reservedSql), "AQ: registro de reservados idêntico no cliente e no SQL"],
    [/update public\.profiles set username/.test(src.pendingSql) && !/create table if not exists public\.(users|user_accounts|usernames|accounts|user_profiles)\b/i.test(src.pendingSql), "AZ: reusa public.profiles (sem segunda tabela de usuário)"],
    [/t\("auth\.identifier"\)/.test(src.loginForm) && /name="identifier"/.test(src.loginForm) && /identifier: "Email ou nome de usuário"/.test(src.ptBR), "AT: um campo 'Email ou nome de usuário'"],
    [/<UsernameField\b/.test(src.comecar) && !/dispon[ií]vel!|isAvailable|checkAvailability/.test(code(src.comecar)), "AR: campo no cadastro só com validação estrutural (sem disponibilidade falsa)"],
    [/GENERIC_LOGIN_ERROR = "Usuário\/email ou senha incorretos\."/.test(src.username) && /return \{ status: "error", message: GENERIC_LOGIN_ERROR \}/.test(src.authService), "AW: erro genérico anti-enumeração"],
    [!/\bemail\b/.test(edgeJsonBodies) && !/\buser\s*:/.test(edgeJsonBodies), "AV: a Edge nunca devolve email nem o objeto user"],
    [/MIN_RESPONSE_MS/.test(edge) && /check_and_record_login_rate/.test(edge), "AX: rate limit + tempo mínimo igual"],
    [grants.length === 1 && /to service_role;/.test(grants[0]) && /revoke all on function public\.resolve_login_identity\(text\) from anon;/.test(src.pendingSql), "AV: username → id só para service_role"],
    [/create or replace function public\.resolve_login_identity\(p_username text\)\s*returns uuid/.test(src.pendingSql) && !/returns (text|table)[\s\S]{0,300}\bemail\b/i.test(src.pendingSql), "AV: nunca existe username → email"],
    [!/ilike[^;]*email|where[^;]*email\s*=/i.test(src.pendingSql), "BA: sem endpoint que liste perfis por email"],
    [!(src.__files ?? []).some((f) => /^supabase\/migrations\/.*username/i.test(f)), "BB: migration NÃO aplicada (fora de supabase/migrations)"],
    [!/"sign-in-identifier"/.test(src.edgeCatalog), "BB: Edge fora do catálogo de deploy"],
    [/USERNAME_LOGIN_CLOUD_STATUS = "CLOUD_APPLIED_FLAG_OFF"/.test(src.username) && /env\.VITE_USERNAME_LOGIN_ENABLED === "true"/.test(src.username), "BB: status CLOUD_APPLIED_FLAG_OFF + flag desligada por padrão"],
    [/if \(!usernameLoginCloudEnabled\(\)\)/.test(src.authService), "BB: sem backend aplicado, o cliente não chama a Edge"],
    noNewEngine(src, ["SocialAccountStore"]),
  ]);
}

// ── BD–BL — SmartBack ───────────────────────────────────────────────────────
export function routePathsFromSource(routesText) {
  const out = new Set();
  for (const match of routesText.matchAll(/\bpath:\s*"([^"]+)"/g)) {
    const raw = match[1];
    if (raw === "*") continue;
    out.add(raw.startsWith("/") ? raw : `/${raw}`);
  }
  return [...out];
}

export function gateSmartBack(src) {
  const inventory = [...src.smartBack.matchAll(/\{ pattern: "([^"]+)"/g)].map((m) => m[1]);
  const missing = routePathsFromSource(src.routes).filter((route) => !inventory.includes(route));
  const blind = [
    ...Object.entries(src)
      .filter(([key]) => !key.startsWith("__") && !["smartBackButton", "nativeShell", "e2eSpec"].includes(key))
      .filter(([, text]) => /navigate\(-1\)|history\.back\(\)/.test(code(text)))
      .map(([key]) => key),
    ...(src.__blindBack ?? []).filter((file) => !Object.values(FILES).includes(file)),
  ];
  return collect([
    [missing.length === 0, `BD: rota sem entrada no inventário: ${missing.join(", ")}`],
    [blind.length === 0, `BF: navigate(-1) cego fora do SmartBack: ${blind.join(", ")}`],
    [/if \(decision\.kind === "history"\) navigate\(-1\);/.test(code(src.smartBackButton)) && /if \(runBackGuard\(\)\) return;/.test(src.smartBackButton), "BF: histórico só pela decisão verificada"],
    [/shouldShowShellBack\(location\.pathname\)/.test(src.appShell) && /<SmartBackButton \/>/.test(src.appShell), "BE: SmartBackButton na casca (desktop = mobile)"],
    [/recordNavigation\(location\.pathname, navigationType\)/.test(src.appShell), "BF: trilha in-app registrada"],
    [/smartBackFallback\(pathname\)/.test(src.nativeShell) && /previousInAppPath\(pathname\) !== null/.test(src.nativeShell), "BH: VOLTAR do Android usa a mesma política"],
    [/if \(!overlayOpen && runBackGuard\(\)\) return;/.test(src.nativeShell), "BJ: modal primeiro, depois guarda"],
    [/useBackGuard\(Boolean\(attemptId\) && !grade/.test(src.phaseChallengePage) && /useBackGuard\(attemptPaid && !finished/.test(src.moduleChallengePage), "BK: prova em andamento pergunta antes de sair"],
    [/registerBackGuard\(/.test(src.lessonPlayer), "BK: lição sai pela própria saída (sem perda silenciosa)"],
    [/!value\.startsWith\("\/\/"\)/.test(src.smartBack), "BF: destino externo (//host) recusado"],
    noNewEngine(src, ["NavigationEngineV2"]),
  ]);
}

export const GATES = {
  "culture-gloss-integration": gateCultureGloss,
  "culture-dragon-lesson": gateCultureDragon,
  "culture-journey-reactivation": gateCultureRecall,
  "immersion-dialogue-ux": gateImmersion,
  "character-identity": gateCharacterIdentity,
  "sync-notice-policy": gateSyncNoticePolicy,
  "league-fast-path": gateLeagueFastPath,
  "achievement-rarity": gateAchievementRarity,
  "profile-layout": gateProfileLayout,
  "username-contract": gateUsername,
  "smart-back-navigation": gateSmartBack,
};

export function formatReport(name, failures) {
  return failures.length
    ? `FAIL ${name}\n${failures.map((f) => `  - ${f}`).join("\n")}`
    : `PASS ${name}`;
}
