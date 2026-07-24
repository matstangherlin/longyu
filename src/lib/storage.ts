// Helpers de data para ofensiva (streak) e metas diárias.
// O dia vira à meia-noite do fuso LOCAL do dispositivo (ex.: horário de Brasília
// se o aluno estiver no Brasil). Entrar no site não conta ofensiva — só estudo.

export function todayKey(d = new Date()): string {
  // Usa o calendário local do aluno (getFullYear/Month/Date), não UTC.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // YYYY-MM-DD, horário local
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / (24 * 60 * 60 * 1000));
}

// Chave da semana (ISO 8601, começa na segunda): "YYYY-Www".
// Usada para zerar o XP semanal quando vira a semana.
export function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Quinta-feira da semana atual decide o ano ISO.
  const day = date.getUTCDay() || 7; // domingo (0) vira 7
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Chave do mês: "YYYY-MM". Usada para zerar o XP mensal.
export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
