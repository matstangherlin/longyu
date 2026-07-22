/**
 * featureDiscovery — memória local de apresentações já vistas.
 *
 * Fica FORA do store de contas de propósito: são dicas de interface, não
 * progresso, então não entram na sincronização/merge nem exigem migração do
 * store. Persistem por aparelho em uma única chave localStorage.
 *
 * Migração de usuários antigos: `initializeDiscovery` roda uma única vez e
 * marca como vistas todas as áreas já relevantes para o estágio atual do
 * aluno. Assim, quem já tem progresso não recebe uma enxurrada de "novidades"
 * ao atualizar; apenas o que for liberado DEPOIS é anunciado.
 */

const KEY = "longyu:seen-intros";
const INIT_FLAG = "__init__";

function read(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function write(set: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    // Modo privado / cota cheia: dicas são não-essenciais, então ignoramos.
  }
}

export function isDiscoveryInitialized(): boolean {
  return read().has(INIT_FLAG);
}

/**
 * Semente única. `seedIds` deve conter as áreas já relevantes agora, para que
 * usuários existentes não vejam apresentações do que já usam.
 */
export function initializeDiscovery(seedIds: readonly string[]): void {
  const set = read();
  if (set.has(INIT_FLAG)) return;
  set.add(INIT_FLAG);
  for (const id of seedIds) set.add(id);
  write(set);
}

export function isIntroSeen(id: string): boolean {
  return read().has(id);
}

export function markIntroSeen(id: string): void {
  const set = read();
  if (set.has(id)) return;
  set.add(id);
  write(set);
}

export function getSeenIntros(): Set<string> {
  return read();
}
