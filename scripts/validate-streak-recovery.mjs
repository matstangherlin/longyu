/**
 * Valida a ofensiva: zera após 24h (um dia inteiro) sem estudo e a janela de
 * recuperação de 24h (aviso ao abrir + recuperar fazendo um exercício).
 *
 * Testa a lógica PURA real (src/lib/streak.ts), empacotada com esbuild — sem
 * espelho que possa divergir.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];
const fail = (m) => errors.push(m);
const assert = (cond, m) => {
  if (!cond) fail(m);
};

// Empacota o módulo real para um ESM em memória e importa via data: URL.
const bundled = await build({
  entryPoints: [path.join(root, "src/lib/streak.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "neutral",
  logLevel: "silent",
});
const code = bundled.outputFiles[0].text;
const mod = await import(`data:text/javascript,${encodeURIComponent(code)}`);
const { reconcileStreak, computeStudyStreak, applyStreakRecovery, mergeStreakRecovery } = mod;

// Datas de apoio (calendário local, mesmo formato do app: YYYY-MM-DD).
const MON = "2026-03-02";
const TUE = "2026-03-03";
const WED = "2026-03-04";
const THU = "2026-03-05";

const base = {
  streak: 5,
  lastStudyDate: MON,
  lastActive: MON,
  streakShields: 0,
  streakRecovery: null,
  pendingStreakRecovery: null,
};

// ── reconcileStreak ─────────────────────────────────────────────────────────

// Estudou hoje (gap 0): ofensiva intacta, nada muda.
{
  const r = reconcileStreak({ ...base, lastStudyDate: MON }, MON);
  assert(r.streak === 5 && !r.changed, "gap 0 não deve mexer na ofensiva");
}

// Estudou ontem (gap 1): ainda dentro do prazo, ofensiva intacta.
{
  const r = reconcileStreak({ ...base, lastStudyDate: MON }, TUE);
  assert(r.streak === 5 && r.streakRecovery === null && !r.changed, "gap 1 não deve quebrar");
}

// 24h sem estudar (gap 2 = pulou um dia inteiro): ZERA e abre recuperação.
{
  const r = reconcileStreak({ ...base, lastStudyDate: MON }, WED);
  assert(r.streak === 0, "gap 2 deve zerar a ofensiva");
  assert(r.changed, "gap 2 deve marcar mudança");
  assert(r.streakRecovery && r.streakRecovery.streak === 5, "recuperação deve lembrar a ofensiva anterior");
  assert(r.streakRecovery && r.streakRecovery.brokenOn === WED, "recuperação deve marcar o dia da quebra");
  assert(r.pendingStreakRecovery === 5, "deve avisar recuperação de 5 ao abrir");
}

// Escudo protege a folga de exatamente 1 dia (gap 2): não zera, não avisa.
{
  const r = reconcileStreak({ ...base, lastStudyDate: MON, streakShields: 1 }, WED);
  assert(r.streak === 5 && !r.changed, "escudo deve proteger gap 2 sem zerar");
  assert(r.pendingStreakRecovery === null, "escudo não deve abrir aviso de recuperação");
}

// Perdeu 2+ dias (gap 3): zera sem oferecer recuperação (janela já passou).
{
  const r = reconcileStreak({ ...base, lastStudyDate: MON }, THU);
  assert(r.streak === 0 && r.changed, "gap 3 deve zerar");
  assert(r.streakRecovery === null && r.pendingStreakRecovery === null, "gap 3 não é recuperável");
}

// Reabrir no MESMO dia da quebra (já zerada): recuperação segue válida.
{
  const broken = {
    ...base,
    streak: 0,
    streakRecovery: { streak: 5, brokenOn: WED },
    pendingStreakRecovery: null,
  };
  const r = reconcileStreak(broken, WED);
  assert(r.streak === 0, "reabrir no dia da quebra não recria a ofensiva sozinho");
  assert(r.streakRecovery && r.streakRecovery.brokenOn === WED, "recuperação continua aberta hoje");
  assert(r.pendingStreakRecovery === 5, "reabrir deve reexibir o aviso de recuperação");
}

// Passou o dia da quebra sem recuperar (gap 3): a janela de 24h expira.
{
  const broken = {
    ...base,
    streak: 0,
    streakRecovery: { streak: 5, brokenOn: WED },
    pendingStreakRecovery: 5,
  };
  const r = reconcileStreak(broken, THU);
  assert(r.streakRecovery === null && r.pendingStreakRecovery === null, "janela de recuperação deve expirar no dia seguinte");
  assert(r.changed, "expirar a recuperação deve marcar mudança");
}

// Sem estudo registrado ainda: nada a reconciliar, sem lixo de recuperação.
{
  const r = reconcileStreak({ ...base, streak: 0, lastStudyDate: null }, WED);
  assert(!r.changed && r.streakRecovery === null, "sem lastStudyDate não deve mexer em nada");
}

// ── computeStudyStreak (estudar após a quebra) ──────────────────────────────

// Uma resposta solta NÃO recupera.
//
// Esta é a asserção que mudou de lugar na V4.9.4. Antes a recuperação morava
// dentro deste cálculo, que a revisão chama a cada item corrigido — ou seja,
// responder UMA pergunta devolvia a ofensiva inteira. Agora ela exige um
// evento de conclusão, e o que se prova aqui é que registrar estudo sozinho
// não paga: a janela continua aberta, esperando a conclusão de verdade.
{
  const broken = {
    ...base,
    streak: 0,
    lastStudyDate: MON,
    streakRecovery: { streak: 5, brokenOn: WED },
    pendingStreakRecovery: 5,
  };
  const r = computeStudyStreak(broken, WED);
  assert(r.streak === 1, "registrar estudo sem concluir não deve restaurar a ofensiva");
  assert(
    r.streakRecovery && r.streakRecovery.brokenOn === WED,
    "a janela deve sobreviver a um estudo não concluído"
  );
  assert(r.pendingStreakRecovery === 5, "o aviso deve sobreviver a um estudo não concluído");
}

// Dia seguinte normal (gap 1): a ofensiva sobe.
{
  const r = computeStudyStreak({ ...base, lastStudyDate: MON }, TUE);
  assert(r.streak === 6, "estudar no dia seguinte deve subir 5 → 6");
}

// Sem recuperação e pulou um dia (gap 2) sem escudo: recomeça em 1.
{
  const r = computeStudyStreak({ ...base, lastStudyDate: MON, streakRecovery: null }, WED);
  assert(r.streak === 1, "gap 2 sem escudo nem recuperação recomeça em 1");
}

// Gap 2 com escudo: mantém a sequência consumindo 1 escudo.
{
  const r = computeStudyStreak({ ...base, lastStudyDate: MON, streakShields: 2 }, WED);
  assert(r.streak === 6, "gap 2 com escudo deve subir 5 → 6");
  assert(r.streakShields === 1, "gap 2 com escudo deve consumir 1 escudo");
}

// ── applyStreakRecovery — os sete casos da V4.9.4 ───────────────────────────
//
// A regra da remessa: "se existe uma ofensiva recuperável pendente, estudar
// normalmente deve recuperá-la". O que segue mede as duas metades disso — o
// que recupera, e o que explicitamente não recupera.

/** Estado do dia da quebra, com a janela aberta. */
const openWindow = {
  ...base,
  streak: 0,
  lastStudyDate: MON,
  streakRecovery: { streak: 5, brokenOn: WED },
  pendingStreakRecovery: 5,
  streakRecoveredOn: null,
};

// Casos 1 e 2 — concluir atividade da Jornada / concluir Revisão.
// As duas entram pela mesma porta: um evento de conclusão. É por isso que o
// store tem UMA ação (`completeStudySession`) e não duas regras paralelas.
{
  const r = applyStreakRecovery(openWindow, WED);
  assert(r.recovered === true, "concluir uma atividade deve recuperar");
  assert(r.streak === 6, "recuperar deve restaurar a ofensiva (5) + hoje = 6");
  assert(r.streakRecovery === null, "recuperar deve fechar a janela");
  assert(r.pendingStreakRecovery === null, "recuperar deve limpar o aviso");
  assert(r.streakRecoveredOn === WED, "recuperar deve marcar o dia do consumo");
  assert(r.restored === 5, "recuperar deve informar quanto voltou, para a tela confirmar");
}

// Caso 3 — ignorou o banner e foi estudar: recupera igual.
// O aviso dispensado (pendingStreakRecovery null) não fecha a janela; só some
// da tela. Se dispensar o banner impedisse a recuperação, o botão "Agora não"
// seria uma armadilha.
{
  const dismissed = { ...openWindow, pendingStreakRecovery: null };
  const r = applyStreakRecovery(dismissed, WED);
  assert(r.recovered === true, "dispensar o aviso não pode impedir a recuperação");
  assert(r.streak === 6, "quem ignora o banner e conclui recupera do mesmo jeito");
}

// Casos 4 e 5 — abriu e abandonou / respondeu uma pergunta só.
// Nenhum dos dois chega a `applyStreakRecovery`, porque nenhum é conclusão.
// O que dá para provar aqui é a outra ponta: sem janela aberta, nada acontece.
{
  const noWindow = { ...base, streak: 0, streakRecovery: null, pendingStreakRecovery: null };
  const r = applyStreakRecovery(noWindow, WED);
  assert(r.recovered === false, "sem janela aberta não existe recuperação");
  assert(r.streak === 0, "sem janela a ofensiva não pode subir sozinha");
}

// Caso 6 — idempotência: a segunda conclusão do dia não paga de novo.
{
  const first = applyStreakRecovery(openWindow, WED);
  const after = { ...openWindow, ...first, streak: first.streak };
  const second = applyStreakRecovery(after, WED);
  assert(second.recovered === false, "a segunda conclusão do dia não pode recuperar de novo");
  assert(second.streak === 6, "a segunda conclusão não pode incrementar a ofensiva");
  assert(second.restored === null, "a segunda conclusão não pode disparar a confirmação de novo");
}

// Caso 6b — janela aberta mas já consumida hoje (estado inconsistente vindo de
// qualquer caminho): ainda assim não paga duas vezes.
{
  const weird = { ...openWindow, streakRecoveredOn: WED };
  const r = applyStreakRecovery(weird, WED);
  assert(r.recovered === false, "janela já consumida hoje não pode pagar de novo");
}

// Caso 7 — depois de recuperar, reabrir o app não desfaz nem repete.
{
  const recovered = applyStreakRecovery(openWindow, WED);
  const reopened = reconcileStreak(
    { ...openWindow, ...recovered, lastStudyDate: WED, streak: recovered.streak },
    WED
  );
  assert(reopened.streak === 6, "reabrir depois de recuperar mantém a ofensiva");
  assert(reopened.pendingStreakRecovery === null, "reabrir não pode ressuscitar o aviso");
  assert(reopened.streakRecovery === null, "reabrir não pode reabrir a janela");
}

// Uma janela de ONTEM não é recuperável hoje.
{
  const stale = { ...openWindow, streakRecovery: { streak: 5, brokenOn: TUE } };
  const r = applyStreakRecovery(stale, WED);
  assert(r.recovered === false, "janela de outro dia não recupera");
}

// ── mergeStreakRecovery — caso 7 atravessando logout/login ──────────────────
//
// O bug que isto tranca: quem recuperava ficava com a janela nula no aparelho,
// e "nulo" perdia para o valor antigo ainda guardado na nuvem. Bastava sair e
// entrar na conta para a janela voltar e a mesma ofensiva ser recuperada de
// novo — ofensiva e XP dobrados por um round-trip de sync.
{
  const local = { streakRecovery: null, pendingStreakRecovery: null, streakRecoveredOn: WED };
  const remote = {
    streakRecovery: { streak: 5, brokenOn: WED },
    pendingStreakRecovery: 5,
    streakRecoveredOn: null,
  };
  const m = mergeStreakRecovery(local, remote);
  assert(m.streakRecovery === null, "sync não pode ressuscitar uma janela já consumida");
  assert(m.pendingStreakRecovery === null, "sync não pode ressuscitar o aviso de uma janela gasta");
  assert(m.streakRecoveredOn === WED, "a marca de consumo deve sobreviver ao merge");
  // E na ordem inversa (o aparelho que recuperou é o "remoto").
  const inverse = mergeStreakRecovery(remote, local);
  assert(inverse.streakRecovery === null, "a marca de consumo vence dos dois lados do merge");
}

// Uma janela AINDA NÃO consumida sobrevive ao sync (o merge não pode ser
// zeloso demais e engolir uma recuperação legítima).
{
  const local = { streakRecovery: null, pendingStreakRecovery: null, streakRecoveredOn: null };
  const remote = {
    streakRecovery: { streak: 5, brokenOn: WED },
    pendingStreakRecovery: 5,
    streakRecoveredOn: null,
  };
  const m = mergeStreakRecovery(local, remote);
  assert(m.streakRecovery !== null, "janela não consumida deve sobreviver ao sync");
  assert(m.pendingStreakRecovery === 5, "o aviso de uma janela viva deve sobreviver ao sync");
}

// Consumo ANTIGO não invalida uma janela NOVA (quebrou de novo dias depois).
{
  const local = {
    streakRecovery: { streak: 3, brokenOn: THU },
    pendingStreakRecovery: 3,
    streakRecoveredOn: WED,
  };
  const remote = { streakRecovery: null, pendingStreakRecovery: null, streakRecoveredOn: null };
  const m = mergeStreakRecovery(local, remote);
  assert(m.streakRecovery !== null, "consumo antigo não pode matar uma janela posterior");
  assert(m.streakRecoveredOn === WED, "a marca antiga permanece registrada");
}

// ── A ligação com o produto ─────────────────────────────────────────────────
//
// As funções acima podem estar perfeitas e a ofensiva continuar sem recuperar
// se ninguém as chamar. Foi exatamente esse o defeito de origem: a lógica de
// recuperação já existia e funcionava, mas `completeLesson` só registrava
// estudo na PRIMEIRA conclusão de cada lição — quem voltava para refazer o que
// já tinha concluído não contava nada. O que segue prende os pontos de chamada.
{
  const store = await readFile(path.join(root, "src/lib/store.ts"), "utf8");
  const revisao = await readFile(path.join(root, "src/features/revisao/RevisaoPage.tsx"), "utf8");
  const sync = await readFile(path.join(root, "src/lib/syncMerge.ts"), "utf8");

  // A busca precisa começar na IMPLEMENTAÇÃO: os mesmos nomes aparecem antes,
  // na declaração da interface, e fatiar a partir dali devolve trecho vazio.
  const lessonStart = store.indexOf("completeLesson: (id)");
  const completeLesson = store.slice(lessonStart, store.indexOf("recordLessonMasteryPass: (", lessonStart));
  assert(lessonStart > 0 && completeLesson.length > 0, "não achei a implementação de completeLesson");
  assert(
    /completeStudySession\(\)/.test(completeLesson),
    "concluir uma lição deve chamar completeStudySession (opção A da remessa)"
  );
  assert(
    /recordStudyDay\(/.test(completeLesson),
    "concluir uma lição deve registrar o dia de estudo"
  );
  // O registro do dia não pode voltar para dentro do `if (!wasComplete)`:
  // refazer uma lição concluída é estudar.
  const guarded = completeLesson.slice(completeLesson.indexOf("if (!wasComplete)"));
  const closing = guarded.indexOf("\n        }");
  assert(
    closing > 0 && !/recordStudyDay\(/.test(guarded.slice(0, closing)),
    "refazer lição concluída também precisa contar: recordStudyDay fora do if (!wasComplete)"
  );

  assert(
    /review_completed[\s\S]{0,900}completeStudySession\(\)/.test(revisao),
    "concluir a revisão deve chamar completeStudySession (opção B da remessa)"
  );
  const perItem = revisao.slice(revisao.indexOf("recordStudyDay({ tasks: 1, xp, minutes: 1 })") - 400, revisao.indexOf("recordStudyDay({ tasks: 1, xp, minutes: 1 })") + 200);
  assert(
    !/completeStudySession/.test(perItem),
    "corrigir UM item não pode recuperar: completeStudySession não pertence ao loop de item"
  );

  assert(
    /mergeStreakRecovery\(local, remote\)/.test(sync),
    "o merge de sync deve usar mergeStreakRecovery (senão a janela gasta ressuscita)"
  );
  assert(
    !/pendingStreakRecovery: local\.pendingStreakRecovery \?\? remote/.test(sync),
    "o merge ingênuo de pendingStreakRecovery não pode voltar"
  );
}

// ── Resultado ───────────────────────────────────────────────────────────────
if (errors.length) {
  console.error("FALHOU: validate:streak-recovery");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("OK: validate:streak-recovery passou.");
