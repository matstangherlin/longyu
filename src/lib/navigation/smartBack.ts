/**
 * RC2.2.11 · BD–BL — SmartBack: UMA política de "voltar" para web, mobile e
 * o botão VOLTAR do Android.
 *
 * Nunca `navigate(-1)` às cegas. A ordem (a primeira que se aplica vence):
 * 1. guarda ativa (prova em andamento, sair perde a tentativa) → pergunta;
 * 2. destino explícito (`state.backTo` / `?from=`) interno → vai para ele;
 * 3. a trilha in-app CONFIRMA que a entrada anterior do histórico é deste app
 *    nesta aba → volta no histórico (preserva scroll/estado);
 * 4. sem histórico confiável (deep link, aba nova, reload) → pai lógico da
 *    rota, pelo mapa abaixo (`replace`, para não criar loop);
 * 5. raiz → nada (web) / minimizar (Android, em backNavigation.ts).
 *
 * O inventário cobre TODA rota de `src/routes.tsx`; o validador
 * `smart-back-navigation` falha se aparecer rota sem entrada aqui.
 */

export type RouteBackEntry = {
  /** Padrão react-router (`:param` casa um segmento). */
  pattern: string;
  /** Pai lógico; `null` = rota raiz (destino primário de navegação). */
  parent: string | null;
  /** A página já desenha o próprio "voltar" contextual (a casca não duplica). */
  ownBack?: boolean;
  /** Modo foco (lição/prova): a própria tela decide como sair (guarda/saída). */
  focus?: boolean;
  /** Fora da casca do app (landing, auth, público). */
  public?: boolean;
};

export const SMART_BACK_HOME = "/jornada";

export const ROUTE_BACK_INVENTORY: readonly RouteBackEntry[] = [
  // Raízes: destinos primários (tab bar / sidebar). Sem botão de voltar.
  { pattern: "/", parent: null, public: true },
  { pattern: "/jornada", parent: null },
  { pattern: "/treino", parent: null },
  { pattern: "/praticar", parent: null },
  { pattern: "/revisao", parent: null },
  { pattern: "/cultura", parent: null },
  { pattern: "/missoes", parent: null },
  { pattern: "/ligas", parent: null },
  { pattern: "/loja", parent: null },
  { pattern: "/perfil", parent: null },
  { pattern: "/mais", parent: null },
  { pattern: "/imersao", parent: null },

  // Jornada e lições.
  { pattern: "/jornada/capsula/:capsuleId", parent: "/jornada", ownBack: true },
  { pattern: "/jornada/reforco/:nodeId", parent: "/jornada", ownBack: true },
  { pattern: "/licao/:lessonId", parent: "/jornada", ownBack: true },
  { pattern: "/licao/:lessonId/player", parent: "/jornada", focus: true },
  { pattern: "/teste/:unitId", parent: "/jornada", focus: true },
  { pattern: "/teste/fase/:phaseId", parent: "/jornada", focus: true },
  { pattern: "/arcade/blitz", parent: "/treino", ownBack: true },

  // Prática.
  { pattern: "/som", parent: "/treino", ownBack: true },
  { pattern: "/pinyin", parent: "/treino", ownBack: true },
  { pattern: "/hanzi", parent: "/treino", ownBack: true },
  { pattern: "/ideogramas", parent: "/treino" },
  { pattern: "/hanzi/atlas", parent: "/ideogramas" },
  { pattern: "/fala", parent: "/treino" },
  { pattern: "/leitura", parent: "/treino" },
  { pattern: "/biblioteca", parent: "/treino" },

  // Cultura.
  { pattern: "/cultura/revisao", parent: "/cultura", ownBack: true },
  { pattern: "/cultura/colecao/:collectionId", parent: "/cultura", ownBack: true },
  { pattern: "/cultura/:id", parent: "/cultura", ownBack: true },

  // Perfil, social e conta.
  { pattern: "/conquistas", parent: "/perfil" },
  { pattern: "/amigos", parent: "/perfil" },
  { pattern: "/convide", parent: "/perfil" },
  { pattern: "/familia", parent: "/perfil" },
  { pattern: "/conta", parent: "/perfil" },
  { pattern: "/pro", parent: "/jornada" },
  { pattern: "/plano", parent: "/jornada" },
  { pattern: "/config", parent: "/mais" },
  { pattern: "/config/:category", parent: "/config" },
  { pattern: "/ajustes", parent: "/mais" },
  { pattern: "/dados-locais", parent: "/ajustes" },
  { pattern: "/admin/feedback", parent: "/mais", ownBack: true },
  { pattern: "/business/dashboard", parent: "/mais" },
  { pattern: "/business/members", parent: "/business/dashboard", ownBack: true },

  // QA interno.
  { pattern: "/qa", parent: "/mais" },
  { pattern: "/qa/player", parent: "/qa" },
  { pattern: "/qa/audio-discrimination", parent: "/qa" },
  { pattern: "/qa/hanzi-builder", parent: "/qa" },
  { pattern: "/qa/conversation-scene", parent: "/qa" },
  { pattern: "/qa/:scenario", parent: "/qa" },

  // Público / auth (fora da casca; o Android ainda usa o mapa).
  { pattern: "/comecar", parent: "/", public: true },
  { pattern: "/teste-guiado", parent: "/", public: true, ownBack: true },
  { pattern: "/login", parent: "/", public: true, ownBack: true },
  { pattern: "/esqueci-senha", parent: "/login", public: true, ownBack: true },
  { pattern: "/redefinir-senha", parent: "/login", public: true, ownBack: true },
  { pattern: "/confirmar-email", parent: "/login", public: true, ownBack: true },
  { pattern: "/finalizar-cadastro", parent: "/login", public: true },
  { pattern: "/salvar-progresso", parent: "/", public: true },
  { pattern: "/privacidade", parent: "/", public: true },
  { pattern: "/termos", parent: "/", public: true },
  { pattern: "/sobre", parent: "/", public: true },
  { pattern: "/aprender-mandarim", parent: "/", public: true },
  { pattern: "/curso-de-mandarim-online", parent: "/", public: true },
  { pattern: "/tons-do-mandarim", parent: "/", public: true },
  { pattern: "/aprender-pinyin", parent: "/", public: true },
  { pattern: "/aprender-hanzi", parent: "/", public: true },
  { pattern: "/mandarim-para-brasileiros", parent: "/", public: true },
  { pattern: "/como-funciona", parent: "/", public: true },
  { pattern: "/metodo-longyu", parent: "/", public: true },
  { pattern: "/business", parent: "/", public: true },
  { pattern: "/business/login", parent: "/business", public: true },
  { pattern: "/convite/:code", parent: "/", public: true },
  { pattern: "/familia/convite/:token", parent: "/", public: true },
];

function normalizePath(pathname: string): string {
  let clean = String(pathname ?? "/").split(/[?#]/)[0] ?? "/";
  // Laço em vez de /\/+$/ (regex com âncora final em entrada de URL = ReDoS polinomial).
  while (clean.length > 1 && clean.endsWith("/")) clean = clean.slice(0, -1);
  return clean || "/";
}

function patternMatches(pattern: string, path: string): boolean {
  const a = pattern.split("/");
  const b = path.split("/");
  if (a.length !== b.length) return false;
  return a.every((segment, i) => segment.startsWith(":") ? Boolean(b[i]) : segment === b[i]);
}

/** Estático vence dinâmico (`/cultura/revisao` antes de `/cultura/:id`). */
export function matchRouteBackEntry(pathname: string): RouteBackEntry | null {
  const path = normalizePath(pathname);
  let best: RouteBackEntry | null = null;
  let bestScore = -1;
  for (const entry of ROUTE_BACK_INVENTORY) {
    if (!patternMatches(entry.pattern, path)) continue;
    const score = entry.pattern.split("/").filter((s) => s && !s.startsWith(":")).length;
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}

export function isRootRoute(pathname: string): boolean {
  const entry = matchRouteBackEntry(pathname);
  return entry ? entry.parent === null : false;
}

/** Pai lógico; rota desconhecida cai na Jornada, nunca "sai do app". */
export function smartBackFallback(pathname: string): string {
  const entry = matchRouteBackEntry(pathname);
  if (!entry) return SMART_BACK_HOME;
  return entry.parent ?? SMART_BACK_HOME;
}

/** A casca desenha o botão só onde a página não tem o próprio voltar. */
export function shouldShowShellBack(pathname: string): boolean {
  const entry = matchRouteBackEntry(pathname);
  if (!entry) return false;
  return entry.parent !== null && !entry.ownBack && !entry.focus && !entry.public;
}

/** Destino interno seguro (sem `//host`, sem esquema). */
export function isSafeInternalPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !/^\/*[a-z]+:/i.test(value);
}

// ── Trilha in-app (esta aba) ────────────────────────────────────────────────

const TRAIL_KEY = "longyu:nav-trail:v1";
const TRAIL_MAX = 30;
let trail: string[] | null = null;

function loadTrail(): string[] {
  if (trail) return trail;
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(TRAIL_KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    trail = Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string").slice(-TRAIL_MAX) : [];
  } catch {
    trail = [];
  }
  return trail;
}

function saveTrail(next: string[]): void {
  trail = next.slice(-TRAIL_MAX);
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
  } catch {
    // sem storage: a trilha vive só na memória desta carga
  }
}

export type NavigationKind = "PUSH" | "POP" | "REPLACE";

/** Chamado a cada troca de rota (AppShell). */
export function recordNavigation(pathname: string, kind: NavigationKind): void {
  const path = normalizePath(pathname);
  const current = [...loadTrail()];
  const last = current[current.length - 1];
  if (last === path) return;
  if (kind === "REPLACE") {
    if (current.length) current[current.length - 1] = path;
    else current.push(path);
  } else if (kind === "POP" && current[current.length - 2] === path) {
    current.pop();
  } else {
    current.push(path);
  }
  saveTrail(current);
}

/** Entrada anterior confirmada pela trilha (ou null). */
export function previousInAppPath(pathname: string): string | null {
  const current = loadTrail();
  const path = normalizePath(pathname);
  if (current[current.length - 1] !== path) return null;
  const previous = current[current.length - 2];
  return previous && previous !== path ? previous : null;
}

/** Só para testes. */
export function resetNavigationTrail(): void {
  saveTrail([]);
}

// ── Guardas (ex.: prova em andamento) ───────────────────────────────────────

type BackGuard = () => boolean;
const guards: BackGuard[] = [];

/**
 * Registra uma guarda. Ela devolve `true` quando SEGURA o voltar (o aluno
 * desistiu de sair ou a tela tratou a saída). Devolve o "desregistrar".
 */
export function registerBackGuard(guard: BackGuard): () => void {
  guards.push(guard);
  return () => {
    const i = guards.lastIndexOf(guard);
    if (i >= 0) guards.splice(i, 1);
  };
}

/** A guarda mais recente decide; `true` = o voltar foi segurado/tratado. */
export function runBackGuard(): boolean {
  const guard = guards[guards.length - 1];
  return guard ? guard() : false;
}

export function hasBackGuard(): boolean {
  return guards.length > 0;
}

// ── Decisão ────────────────────────────────────────────────────────────────

export type SmartBackDecision =
  | { kind: "history" }
  | { kind: "navigate"; to: string; replace: true }
  | { kind: "none" };

export function resolveSmartBack(input: {
  pathname: string;
  backTo?: unknown;
  canGoBack: boolean;
  previousPath?: string | null;
}): SmartBackDecision {
  const path = normalizePath(input.pathname);
  if (isSafeInternalPath(input.backTo) && normalizePath(input.backTo) !== path) {
    return { kind: "navigate", to: input.backTo, replace: true };
  }
  if (input.canGoBack && input.previousPath && input.previousPath !== path) {
    return { kind: "history" };
  }
  if (isRootRoute(path)) return { kind: "none" };
  return { kind: "navigate", to: smartBackFallback(path), replace: true };
}
