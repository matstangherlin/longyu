/**
 * RC2.2.8 — Learning Experience & Gamification Core: gates compartilhados.
 *
 * Cada gate recebe um mapa `src` (arquivo → texto) e devolve a lista de
 * falhas. Os `test:*` reaplicam os mesmos gates sobre fontes MUTADAS e exigem
 * que eles falhem — é assim que as 32 mutações da remessa ficam travadas.
 *
 * Runtime: os módulos puros (phaseChallenge, reviewLookup, syncUx, …) são
 * carregados de verdade pelo `rcRequire`, que transpila TS e neutraliza
 * `import.meta.env` (Node não tem Vite).
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

export const rcRequire = createRequire(import.meta.url);
rcRequire.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8").replace(/import\.meta\.env/g, "(globalThis.__LONGYU_TEST_ENV__ ?? {})");
  module._compile(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename
  );
};

export const FILES = {
  store: "src/lib/store.ts",
  syncMerge: "src/lib/syncMerge.ts",
  guideDialogue: "src/components/guide/GuideDialogue.tsx",
  cultureHub: "src/features/culture/CultureHubPage.tsx",
  sealReveal: "src/features/culture/CultureSealReveal.tsx",
  cultureGuide: "src/lib/cultureGuide.ts",
  appShell: "src/components/layout/AppShell.tsx",
  achievementsWatcher: "src/components/achievements/AchievementsWatcher.tsx",
  streakWatcher: "src/components/achievements/StreakRecoveryWatcher.tsx",
  streakPrompt: "src/lib/streakRecoveryPrompt.ts",
  syncUx: "src/lib/syncUx.ts",
  economyBridge: "src/lib/economyServerBridge.ts",
  cloudSync: "src/services/cloudSyncCoordinator.ts",
  cloudSyncBootstrap: "src/components/auth/CloudSyncBootstrap.tsx",
  contaPage: "src/features/conta/ContaPage.tsx",
  accountPage: "src/features/account/AccountPage.tsx",
  settingsPage: "src/features/settings/SettingsPage.tsx",
  economyBanner: "src/components/economy/EconomySyncBanner.tsx",
  revisao: "src/features/revisao/RevisaoPage.tsx",
  lessonPlayer: "src/features/lesson/LessonPlayer.tsx",
  mandarinToken: "src/components/hanzi/MandarinToken.tsx",
  helpMode: "src/components/hanzi/helpMode.tsx",
  reviewLookup: "src/lib/reviewLookup.ts",
  comecar: "src/features/onboarding/ComecarPage.tsx",
  moduleChallenge: "src/features/challenge/ModuleChallengePage.tsx",
  phaseChallengePage: "src/features/challenge/PhaseChallengePage.tsx",
  phaseChallenge: "src/lib/phaseChallenge.ts",
  journeyPage: "src/features/journey/JourneyPage.tsx",
  routes: "src/routes.tsx",
  achievements: "src/data/achievements.ts",
  profilePage: "src/features/perfil/ProfilePage.tsx",
  profileShowcase: "src/features/perfil/ProfileShowcase.tsx",
  profileShowcaseLib: "src/lib/profileShowcase.ts",
  shop: "src/data/shop.ts",
  profileCosmetics: "src/data/profileCosmetics.ts",
  loja: "src/features/loja/LojaPage.tsx",
  atlasPage: "src/features/hanzi/HanziAtlasPage.tsx",
  atlasStudySet: "src/lib/atlasStudySet.ts",
  localAuthPolicy: "src/lib/auth/localAuthPolicy.ts",
  legacyMigration: "src/features/onboarding/LegacyLocalMigrationPage.tsx",
  ptBR: "src/locales/pt-BR.ts",
  en: "src/locales/en.ts",
};

export function readSources(root = process.cwd()) {
  const src = {};
  for (const [key, rel] of Object.entries(FILES)) {
    src[key] = fs.readFileSync(path.join(root, rel), "utf8");
  }
  return src;
}

/** Aplica uma mutação (substituição literal) e exige que ela tenha acontecido. */
export function mutate(src, key, from, to) {
  if (!src[key].includes(from)) throw new Error(`mutação inválida: "${from.slice(0, 60)}" não está em ${key}`);
  return { ...src, [key]: src[key].split(from).join(to) };
}

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  const end = endMarker ? text.indexOf(endMarker, start + startMarker.length) : -1;
  return end < 0 ? text.slice(start) : text.slice(start, end);
}

/** Remove comentários JS/TS (bloco e linha) — gates olham código, não prosa. */
export function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

function collect(checks) {
  const failures = [];
  for (const [ok, message] of checks) if (!ok) failures.push(message);
  return failures;
}

// ── A — Culture Dragon Voice ─────────────────────────────────────────────────
export function gateCultureGuideVoice(src) {
  const cultureSurfaces = `${src.cultureHub}\n${src.sealReveal}`;
  const continueFn = section(src.guideDialogue, "function continueDialogue()", "function onKeyDown");
  return collect([
    [/from "\.\.\/\.\.\/components\/guide\/GuideDialogue"/.test(src.cultureHub), "A1: CultureHubPage deve usar o GuideDialogue canônico"],
    [/<GuideDialogue[\s>]/.test(src.cultureHub), "A1: CultureHubPage deve renderizar <GuideDialogue>"],
    [/from "\.\.\/\.\.\/components\/guide\/GuideDialogue"/.test(src.sealReveal), "A4: CultureSealReveal deve usar o GuideDialogue canônico"],
    [!/CultureDialogue|CultureMascotDialogue|GuideV2/.test(cultureSurfaces), "A1: proibido CultureDialogue/CultureMascotDialogue/GuideV2"],
    [
      !/new\s+(AudioContext|webkitAudioContext|Audio)\s*\(|guideTextBlip\(|createOscillator/.test(cultureSurfaces),
      "A3 mutação 1: a Cultura não pode ter motor de som próprio — a voz vem do GuideDialogue",
    ],
    [/guideTextBlip\(/.test(src.guideDialogue), "A3 mutação 2: GuideDialogue sem guideTextBlip (Cultura ficaria muda)"],
    [/if \(wasTyping\) stopGuideTextVoice\(\)/.test(continueFn), "A3.2 mutação 3: antecipar o texto precisa cortar a voz na hora"],
    [/stopGuideTextVoice\(\)/.test(section(src.guideDialogue, 'if (state.phase === "done")', "return;")), "A3: DONE precisa cortar a voz"],
    [/prefersReducedMotion\(\)/.test(src.guideDialogue), "A3.4: reduced motion precisa de texto instantâneo"],
    [/CULTURE_GUIDE_INTRO_KEY|seenKeys/.test(src.cultureGuide), "A2: a fala do Hub precisa de chave (não falar toda vez)"],
    [!/setCategory[\s\S]{0,80}setMessage/.test(src.cultureHub), "A2.1: trocar filtro não pode disparar fala"],
    [/useState<CultureGuideMessage \| null>\(\(\) =>/.test(src.cultureHub), "A2: a fala é decidida uma vez ao montar"],
    [/pendingCultureSealReveals\(/.test(src.sealReveal), "A4: reveal só para selos ainda não revelados"],
    [/markCultureSealRevealed/.test(src.sealReveal), "A4.2: reveal precisa marcar o selo como revelado"],
    [/cultureSealsRevealed/.test(src.store) && /cultureSealsRevealed/.test(src.syncMerge), "A4.3: revelado persiste e sincroniza"],
    [/CultureSealRevealWatcher suspended=\{focusMode\}/.test(src.appShell), "A4: reveal montado no AppShell, suspenso no modo foco"],
    [/playSoundFx\("missionComplete"/.test(src.sealReveal), "A4.1: reveal toca um som canônico"],
  ]);
}

// ── B — Streak Recovery Anti-Spam ────────────────────────────────────────────
export function gateStreakPrompt(src) {
  const clearFn = section(src.store, "      clearStreakRecovery: () =>\n", "      completeStudySession:");
  return collect([
    [/sessionStorage/.test(src.streakPrompt), "B2.1: o prompt mostrado vive em sessionStorage"],
    [!/localStorage/.test(stripComments(src.streakPrompt)), "B2.1: proibido localStorage permanente para o prompt"],
    [/streakRecoveryEventKey\(/.test(src.streakWatcher), "B2: watcher usa streakRecoveryEventKey"],
    [/wasStreakRecoveryPromptShown\(/.test(src.streakWatcher), "B1 mutação 4: sem checar a sessão o modal reaparece a cada rota"],
    [/markStreakRecoveryPromptShown\(/.test(src.streakWatcher), "B2.1: marcar o prompt como mostrado"],
    [/data-testid="streak-recovery-not-now"/.test(src.streakWatcher), "B3: botão Agora não identificável"],
    [!/streakRecovery:\s*null/.test(clearFn), "B3.1 mutação 5: 'Agora não' não pode apagar a janela de recuperação"],
    [/brokenOn === input\.today/.test(src.streakPrompt), "B4: só lembra se a recuperação ainda valer"],
    [/window\.setTimeout\(clear, 4200\)/.test(src.streakWatcher), "B6: StreakRecoveredBanner curto e único"],
  ]);
}

// ── C — Quiet Sync UX ────────────────────────────────────────────────────────
export function gateSyncUx(src) {
  const setSyncing = section(src.economyBridge, "function setSyncing(", "\n}\n");
  const markCloud = section(src.cloudSync, "function markCloudSync(", "\n}\n");
  const errorBranch = section(markCloud, 'if (status === "error")', "}");
  const contaBanner = section(src.contaPage, "data-cloud-sync-banner", "</div>");
  return collect([
    [!/setEconomySyncMessage/.test(setSyncing), "C1/C6.1 mutação 6: sync de economia rotineiro virou toast global"],
    [
      /setEconomySyncMessage/.test(errorBranch) && (markCloud.match(/setEconomySyncMessage/g) ?? []).length === 1,
      "C3 mutação 7: só erro de sync pode chegar à UI global",
    ],
    [/admitSyncNotice\(message\)/.test(src.store), "C5: setEconomySyncMessage passa pelo dedupe"],
    [/SYNC_ERROR_DEDUPE_MS/.test(src.syncUx), "C5.1: janela de dedupe declarada"],
    [/cloudSyncState\.status === "error" && syncCopy/.test(src.contaPage), "C2: /conta só mostra faixa em erro"],
    [contaBanner.length > 0, "C: faixa de erro em /conta continua existindo (data-cloud-sync-banner)"],
    [/if \(sync\.status !== "error"\) return null;/.test(src.accountPage), "C2: AccountPage silenciosa na rotina"],
    [/<SyncStatusChip/.test(src.profilePage) && /<SyncStatusChip/.test(src.settingsPage), "C4: estado discreto em Perfil e Ajustes"],
    [/AUTO_SYNC_INTERVAL_MS = 30_000/.test(src.cloudSyncBootstrap), "C: o mecanismo técnico (30 s) foi preservado"],
  ]);
}

// ── D/E — Review Learning UX ─────────────────────────────────────────────────
export function gateReviewLearningUx(src) {
  const gradeFn = section(src.revisao, "  function grade(g: Grade) {", "verifyReviewRef.current = verifyExercise;");
  const choiceButton = section(src.revisao, "function ChoiceButton(", "function ReviewExercisePanel(");
  const panel = section(src.revisao, "function ReviewExercisePanel(", "function SentenceBuildExercise(");
  const pairs = section(src.revisao, "function MatchPairsExercise(", "function ExerciseFeedback(");
  const stimulus = section(src.moduleChallenge, "export function QuestionStimulus(", "function QuestionFeedback(");
  return collect([
    [!/examMode=\{!revealed\}/.test(src.revisao), "D1 mutação 9: a revisão não pode bloquear a consulta antes da resposta"],
    [/<GlossLookupProvider onLookup=\{markReviewLookup\}/.test(src.revisao), "D6: consulta registra reviewAssistanceUsed"],
    [/data-review-assistance-used=/.test(src.revisao), "D6: assistência exposta para E2E"],
    [/capAssistedGrade\(g, reviewAssistanceUsed\)/.test(gradeFn), "D6.2 mutação 10: acerto assistido não pode contar como independente"],
    [/gradeSuggestion\(correct, elapsed, reviewAssistanceUsed\)/.test(src.revisao), "D7: sugestão considera assistência"],
    [/lookup\.onLookup\?\.\(text\)/.test(src.mandarinToken), "D6: token avisa a consulta"],
    [/AtlasLink|gloss-atlas-link/.test(src.mandarinToken), "D4/F4: gloss com 'Ver no Atlas'"],
    [/hanzi\/atlas\?char=/.test(src.reviewLookup), "F4: rota canônica /hanzi/atlas?char="],
    [/onLookup=\{\(\) => \{\s*if \(!answeredRef\.current\) setReviewAssistanceUsed\(true\)/.test(src.lessonPlayer), "D8: remediação da Jornada permite e registra consulta"],
    [/capAssistedGrade\("good", Boolean\(meta\?\.assisted\)\)/.test(src.lessonPlayer), "D8: remediação assistida grava Hard"],
    // E — tamanhos
    [/text-5xl leading-tight text-ink sm:text-6xl/.test(panel), "E1 mutação 8: Hànzì principal da revisão precisa de text-5xl/6xl"],
    [/text-3xl leading-tight sm:text-4xl/.test(choiceButton), "E2: Hànzì nas opções >= text-3xl"],
    [/min-h-14/.test(choiceButton), "E3: opção com min-height >= 56px"],
    [/hanzi text-3xl leading-tight sm:text-4xl/.test(pairs), "E4: Hànzì dos pares maiores"],
    [!/text-\[26px\] leading-tight sm:text-\[30px\]/.test(pairs), "E4: pares não voltam ao tamanho antigo"],
    // D5 / K12 — prova continua bloqueada
    [!/GlossText|GlossLookupProvider|MandarinInlineText/.test(src.comecar), "D5 mutação 11: nivelamento não pode ter consulta"],
    [/<GlossText examMode /.test(stimulus), "D5: estímulo do teste de módulo em examMode"],
    [/<MandarinHelpProvider disabled>/.test(src.phaseChallengePage), "K12 mutação 12: Phase Challenge precisa desligar a consulta"],
    [!/GlossLookupProvider/.test(src.phaseChallengePage), "K12: Phase Challenge não pode ter provider de consulta"],
    [/"placement",\s*"phase_challenge",\s*"module_challenge",\s*"graded_assessment"/.test(src.reviewLookup), "D5: superfícies de prova declaradas"],
  ]);
}

// ── G/L/M — Achievements & Culture ───────────────────────────────────────────
export function gateAchievementCulture(src) {
  const cultureBlock = section(src.achievements, "// 8c. Cultura (RC2.2.8)", "// 9. Missões");
  const cultureHelpers = section(src.achievements, "// ——— RC2.2.8 · G2", "function dailyMissionsClaimed");
  return collect([
    [/\| "cultura"/.test(src.achievements) && /\| "atlas"/.test(src.achievements), "G1: categorias cultura/atlas"],
    [(cultureBlock.match(/category: "cultura"/g) ?? []).length >= 5, "G2: pelo menos 5 medalhas culturais"],
    [
      /cultureSeals/.test(cultureHelpers) && /cultureCompletedIds/.test(cultureHelpers) && /cultureKnowledgeById/.test(cultureHelpers),
      "G2.1 mutação 13: medalhas culturais derivam de cultureSeals/cultureCompletedIds/cultureKnowledgeById",
    ],
    [!/Math\.random|Date\.now\(\)|\bcounter\b|culturaCount/.test(cultureBlock + cultureHelpers), "G2.1 mutação 13: contador cultural inventado"],
    [!/qi: \d+[\s\S]{0,20}pearl|dragonPearl/.test(cultureBlock), "L5: medalha não paga Pérola"],
    [!/pearl/i.test(section(src.achievements, "export const ACHIEVEMENTS", "export function isAchievementComplete")), "L5.1: nenhuma medalha paga Pérola (sem pagamento duplo)"],
    [/cultureCompletedIds: cultureCompletedIds \?\? \[\]/.test(src.achievementsWatcher), "M: snapshot estendido com cultura"],
    [/cultureSeals: cultureSeals \?\? \[\]/.test(src.achievementsWatcher), "M: snapshot com cultureSeals"],
    [!/achievementsById2|AchievementStore|MedalEngineV2/.test(src.store + src.achievements), "M1: sem segundo store de achievements"],
    [/if \(!unlocked\?\.\[id\]\) continue;/.test(src.profileShowcaseLib), "G5.4 mutação 14: medalha bloqueada não pode ser destacada"],
    [/toggleFeaturedList\(s\.featuredAchievementIds, id, s\.achievementsUnlocked(?:, isMedal)?\)/.test(src.store), "G5.4: a store valida o destaque"],
    [/FEATURED_ACHIEVEMENTS_MAX = 3/.test(src.profileShowcaseLib), "G5.1: até 3 medalhas"],
    [/<FeaturedMedals \/>/.test(src.profilePage) && /<CulturePassportCard \/>/.test(src.profilePage), "G5/G7: vitrine e passaporte no Perfil"],
    [/profile-see-all-medals/.test(src.profileShowcase), "G6: link Ver todas as medalhas"],
    [
      !/featured[\s\S]{0,40}cultureSeals|cultureSeals[\s\S]{0,40}featured/i.test(src.profileShowcase),
      "G7.1 mutação 15: selo e medalha não podem virar o mesmo objeto",
    ],
  ]);
}

// ── H — Pearl shop utility ───────────────────────────────────────────────────
export function gatePearlShop(src) {
  const buy = section(src.store, "      buyShopItem: async (itemId) => {", "      useInventoryItem:");
  const cosmeticBranch = section(buy, "if (item.cosmetic) {", "if (item.kind === \"chest_small\"");
  return collect([
    [!/em breve|coming soon/i.test(stripComments(src.shop)), "H2 mutação 18: cosmético ainda diz 'em breve'"],
    [!/em breve|coming soon/i.test(stripComments(src.profileCosmetics)), "H2: catálogo de cosméticos sem 'em breve'"],
    [/\.\.\.PROFILE_COSMETICS\.map/.test(src.shop), "H3: Loja vende os cosméticos reais"],
    [/applyPearlSpend\(/.test(cosmeticBranch) && /idempotencyKey: `cosmetic:\$\{item\.id\}`/.test(cosmeticBranch), "H7: Pérola do cosmético passa pelo ledger idempotente"],
    [/equipAfterPurchase\(/.test(cosmeticBranch), "H4.2: comprar não troca o que já está equipado"],
    [/if \(\(s\.ownedCosmetics \?\? \[\]\)\.includes\(item\.id\)\) return \{\};/.test(cosmeticBranch), "H: compra idempotente (já possuído)"],
    [
      !/completedLessons|lessonStarsById|cultureSeals|achievementsUnlocked|lessonMasteryById|validatedModules|placement/.test(buy),
      "H1 mutações 16/17: Pérola não compra progresso, estrela, selo, medalha ou domínio",
    ],
    [/useProfileFrameClass\(\)/.test(src.profilePage) && /useProfileTitle\(\)/.test(src.profilePage), "H5 mutação 19: cosmético precisa de efeito visível no Perfil"],
    [/shopItemLifetime\(item\)/.test(src.loja), "H6: Loja mostra consumível/temporário/permanente"],
    [/profileFrameId/.test(src.store) && /profileTitleId/.test(src.store), "H4: profileFrameId/profileTitleId"],
  ]);
}

// ── F — Atlas study sets ─────────────────────────────────────────────────────
export function gateAtlasStudySets(src) {
  return collect([
    [/from "\.\/srs"/.test(src.atlasStudySet) && /newItem\(/.test(src.atlasStudySet), "F1.2: conjunto usa o SRS existente"],
    [!/localStorage|sessionStorage|createStore|zustand|srsV2|studySetSrs:/.test(src.atlasStudySet), "F1.2 mutação 20: segundo SRS/armazenamento no Atlas"],
    [/canPromoteAtlasItemToReview\(/.test(src.atlasStudySet), "F mutação 21: só entra caractere elegível (aprendido)"],
    [/if \(!allowedCharIds\.has\(charId\)\) continue;/.test(src.atlasStudySet), "F mutação 21: URL editada não fura a elegibilidade"],
    [/atlas-train-set/.test(src.atlasPage) && /Treinar este conjunto/.test(src.atlasPage), "F1: botão Treinar este conjunto"],
    [/\["weak", "Meus fracos"\]/.test(src.atlasPage) && /\["top50", "Top 50 disponíveis"\]/.test(src.atlasPage), "F2: smart sets"],
    [/Adicionado ao treino/.test(src.atlasPage), "F3: feedback do Adicionar à revisão"],
    [/Caracteres relacionados/.test(src.atlasPage) && /relatedAtlasCharacters/.test(src.atlasPage), "F5: família de componentes"],
    [/label="Dominados"/.test(src.atlasPage) && /label="Favoritos"/.test(src.atlasPage), "F6: metas do Atlas"],
    [/parseAtlasStudySet\(searchParams\)/.test(src.revisao), "F1: Revisão lê o conjunto do Atlas"],
    [/gradeSrs\(item\.type, item\.itemId, effectiveGrade/.test(src.revisao), "F1.2: o treino grava pelo mesmo gradeSrs"],
  ]);
}

// ── K — Phase Challenge economy ──────────────────────────────────────────────
export function gatePhaseChallengeEconomy(src) {
  const cooldownFn = section(src.phaseChallenge, "export function phaseChallengeCooldown(", "\n}\n");
  const canStartFn = section(src.phaseChallenge, "export function canStartPhaseChallenge(", "\n}\n");
  const debitFn = section(src.phaseChallenge, "export function applyPhaseChallengeDebit(", "\n}\n");
  const finishStore = section(src.store, "      finishPhaseChallengeAttempt: (", "      recordModuleSkipAttempt:");
  const startStore = section(src.store, "      startPhaseChallengeAttempt: (", "      finishPhaseChallengeAttempt:");
  return collect([
    [/next: 3,/.test(src.phaseChallenge), "K5.1 mutação 25: próxima fase = 3 Fôlegos"],
    [/advanced: 4,/.test(src.phaseChallenge), "K5.2 mutação 26: fase avançada = 4 Fôlegos"],
    [/PHASE_CHALLENGE_COOLDOWN_HOURS = 48;/.test(src.phaseChallenge), "K7 mutação 27: cooldown de 48h"],
    [
      !/premium|isPro|pearl|Pearl|\bqi\b|inventory|points/i.test(cooldownFn + canStartFn),
      "K8 mutações 28/29: cooldown/start não podem aceitar Pro, Pérola, Qi ou inventário",
    ],
    [!/isPro|serverIsPro|dragonPearls|points/.test(startStore + finishStore), "K8: store do Phase Challenge não consulta Pro/Pérola/Qi"],
    [/const existing = \(state\.phaseChallengeAttempts \?\? \[\]\)\.find/.test(debitFn) && /charged: false/.test(debitFn), "K5.3: débito único por attemptId"],
    [/folego: Math\.max\(0, state\.folego - input\.target\.cost\)/.test(debitFn), "K5: custo em Fôlego (não Carga)"],
    [!/consumeCharge|dailyEnergy|shop-module-retry/.test(src.phaseChallenge + src.phaseChallengePage), "K5/K9: nem Carga diária nem shop-module-retry"],
    [
      !/cultureSeals\s*:|completeCultureMission|completeCultureBridge|recordCultureKnowledge|unlockAchievement|markCultureSealRevealed/.test(
        stripComments(src.phaseChallenge + src.phaseChallengePage + finishStore)
      ),
      "K10.1 mutação 30: Phase Challenge não concede Selo nem medalha",
    ],
    [!/addXp|claimReward|recordLessonMasteryPass|completeLesson\(/.test(src.phaseChallengePage + finishStore), "K10.1 mutação 31: sem XP falso de lição pulada"],
    [/completeLessonViaTest\(lessonId\)/.test(finishStore), "K10: passar marca só pela via de teste existente"],
    [/FOUNDATION_LESSON_IDS\.includes\(lesson\.id\)/.test(src.phaseChallenge), "K11: fundamentos não são pulados"],
    [/isCultureLessonId\(lesson\.id\)/.test(src.phaseChallenge), "K10.1: lição cultural nunca é marcada"],
    [/cultureGateForTopic\(/.test(src.phaseChallenge), "K10.2: marco cultural trancado bloqueia o alvo"],
    [/buildModuleSkipTest\(/.test(src.phaseChallenge) && /gradeModuleSkipTest\(/.test(src.phaseChallenge), "K2: reusa o motor do teste de módulo"],
    [!/placement|ComecarPage/.test(src.phaseChallenge.replace(/\/\*[\s\S]*?\*\//g, "")), "K1: não mistura com o nivelamento"],
    [/path: "teste\/fase\/:phaseId"/.test(src.routes), "K3: rota do Phase Challenge"],
    [/phase-challenge-cta-/.test(src.journeyPage) && /listPhaseChallengeTargets\(/.test(src.journeyPage), "K3: 'Testar esta fase' na Jornada"],
    [/phase-challenge-cost/.test(src.phaseChallengePage) && /phase-challenge-balance/.test(src.phaseChallengePage), "K6: prévia com custo e saldo"],
    [/revealAnswer=\{false\}/.test(src.phaseChallengePage), "K13.1: sem gabarito na prova"],
  ]);
}

// ── J — Email-only public accounts ───────────────────────────────────────────
export function gateEmailOnly(src) {
  const createAccount = section(src.store, "      createAccount: (rawName, rawEmail) => {", "      finishLocalOnboarding:");
  const finishLocal = section(src.store, "      finishLocalOnboarding: (rawName, placement) => {", "      createCloudAccountDraft:");
  const localProfilesCard = section(src.accountPage, 'hub.localProfilesHere', "accountList.map");
  return collect([
    [/if \(!email && !isDevLocalAuthAllowed\(\)\)/.test(createAccount), "J1 mutações 22/23: createAccount sem email em produção"],
    [/if \(!isDevLocalAuthAllowed\(\)\)/.test(finishLocal), "J3: finishLocalOnboarding é LEGACY_ONLY"],
    [/\{isDevLocalAuthAllowed\(\) \? \(/.test(localProfilesCard), "J3.1: 'Criar perfil local' só em DEV/E2E"],
    [/if \(!isDevLocalAuthAllowed\(\)\) return;\s*\n\s*if \(isFinishingOnboarding/.test(src.accountPage), "J3.2: continuar sem conta só em DEV/E2E"],
    [/isDevLocalAuthAllowed\(\) \? \(/.test(src.settingsPage), "J3.1: Ajustes só cria perfil de teste em DEV/E2E"],
    [!/Continuar sem conta|Criar perfil local/.test(src.comecar), "J3.2: onboarding sem 'Continuar sem conta'"],
    [!/useStore/.test(src.comecar), "J6: nivelamento pré-cadastro não persiste aluno anônimo"],
    [
      /\.VITE_DEV_ALLOW_LOCAL_AUTH \?\? ""\) === "1"/.test(src.localAuthPolicy) &&
        /return isDevelopmentEnv\(env\) \|\| isPreviewEnv\(env\);/.test(src.localAuthPolicy) &&
        /isProductionLikeEnv\(env\)/.test(src.localAuthPolicy),
      "J4 mutação 24: bypass DEV/E2E preservado e travado em production-like",
    ],
    [src.legacyMigration.length > 0, "J5: LegacyLocalMigrationPage preservada"],
  ]);
}

export function formatReport(name, failures) {
  if (failures.length === 0) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((failure) => `  - ${failure}`).join("\n")}`;
}

export function runGate(name, gate) {
  const failures = gate(readSources());
  console.log(formatReport(name, failures));
  if (failures.length) process.exit(1);
}

/** Roda uma mutação e exige que o gate a pegue. */
export function expectMutationCaught(results, label, gate, mutatedSrc) {
  const failures = gate(mutatedSrc);
  results.push({ name: `mutação — ${label}`, ok: failures.length > 0, why: failures.length ? "" : "gate NÃO pegou a mutação" });
}

export function runCases(name, cases) {
  const failed = cases.filter((c) => !c.ok);
  for (const c of cases) console.log(`${c.ok ? "  ok  " : "  FAIL"} ${c.name}${c.ok ? "" : ` — ${c.why}`}`);
  console.log(failed.length ? `FAIL ${name} (${failed.length}/${cases.length})` : `PASS ${name} (${cases.length} casos)`);
  if (failed.length) process.exit(1);
}

export function it(cases, name, fn) {
  try {
    fn();
    cases.push({ name, ok: true });
  } catch (error) {
    cases.push({ name, ok: false, why: error?.message ?? String(error) });
  }
}
