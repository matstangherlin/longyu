/**
 * Valida a ofensiva: zera após 24h (um dia inteiro) sem estudo e a janela de
 * recuperação de 24h (aviso ao abrir + recuperar fazendo um exercício).
 *
 * Testa a lógica PURA real (src/lib/streak.ts), empacotada com esbuild — sem
 * espelho que possa divergir.
 */
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
const { reconcileStreak, computeStudyStreak } = mod;

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

// Recupera estudando no dia da quebra: a sequência anterior volta + o dia de hoje.
{
  const broken = {
    ...base,
    streak: 0,
    lastStudyDate: MON,
    streakRecovery: { streak: 5, brokenOn: WED },
    pendingStreakRecovery: 5,
  };
  const r = computeStudyStreak(broken, WED);
  assert(r.streak === 6, "recuperar estudando deve restaurar a ofensiva (5) + hoje = 6");
  assert(r.streakRecovery === null, "recuperar deve fechar a janela");
  assert(r.pendingStreakRecovery === null, "estudar deve limpar o aviso pendente");
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

// ── Resultado ───────────────────────────────────────────────────────────────
if (errors.length) {
  console.error("FALHOU: validate:streak-recovery");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("OK: validate:streak-recovery passou.");
