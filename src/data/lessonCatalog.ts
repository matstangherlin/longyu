import type { JourneyNode } from "./journeyOrchestrator";
import type { LessonCapsule } from "./lessonCapsules";
import { LESSON_CAPSULES } from "./lessonCapsules";
import type { LessonMediaAsset } from "./lessonMediaAssets";
import { LESSON_MEDIA_ASSETS } from "./lessonMediaAssets";
import { parseLessonCatalog, type CatalogProblem } from "./lessonCatalogSchema";

/**
 * V4.9.2B — o objetivo central da remessa, em um arquivo.
 *
 * "Adicionar uma aula nova ao Longyu não deve exigir nova reconstrução da
 * aplicação." Enquanto o catálogo for um array TypeScript, toda aula é um
 * build e um deploy — e quem escreve a aula depende de quem escreve código.
 * Aqui o catálogo passa a ser um arquivo estático buscado em runtime:
 * publicar uma aula vira subir um JSON.
 *
 * Três decisões sustentam isso:
 *
 * 1. O embutido nunca sai. `LESSON_CAPSULES` continua compilado e continua
 *    sendo a fonte da cápsula de Pinyin. O catálogo remoto ACRESCENTA. Se o
 *    arquivo sumir, for corrompido ou o aluno estiver sem rede, a aplicação
 *    volta exatamente ao que era antes desta remessa — nunca a menos.
 *
 * 2. Falha de rede não é falha de aula. O último catálogo válido fica em
 *    cache local (Parte P): quem já abriu o app uma vez continua com as aulas
 *    no avião. O cache só é substituído por um catálogo que passou na
 *    validação, então um deploy quebrado não envenena quem estava bem.
 *
 * 3. Nada é confiado. O JSON atravessa `parseLessonCatalog` — a mesma função
 *    do gate de autoria — antes de virar objeto de domínio. URL fora da
 *    allowlist, locale faltando, asset inexistente: o item cai sozinho e o
 *    resto do catálogo segue.
 */

const CATALOG_URL = "/lessons/catalog.v1.json";
const CACHE_KEY = "longyu:lesson-catalog:v1";

export type LessonCatalogStatus = "IDLE" | "LOADING" | "READY" | "CACHED" | "UNAVAILABLE";

interface CatalogState {
  status: LessonCatalogStatus;
  capsules: LessonCapsule[];
  assets: LessonMediaAsset[];
  problems: CatalogProblem[];
}

let state: CatalogState = { status: "IDLE", capsules: [], assets: [], problems: [] };
const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;
let settled = false;

function publish(next: CatalogState): void {
  state = next;
  for (const listener of listeners) listener();
}

function readCache(): unknown {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(raw: unknown): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(raw));
  } catch {
    // Cota cheia ou storage bloqueado: o catálogo online continua valendo.
  }
}

/**
 * Busca o catálogo. Idempotente — chamadas concorrentes compartilham a mesma
 * promessa, para que montar duas telas não dispare dois downloads.
 */
export function loadLessonCatalog(): Promise<void> {
  if (inFlight) return inFlight;
  // Sem esta linha, cada bloco de módulo que o aluno expande na Jornada monta
  // um assinante novo e dispara outro download do mesmo arquivo.
  if (settled) return Promise.resolve();

  inFlight = (async () => {
    publish({ ...state, status: "LOADING" });

    let raw: unknown = null;
    let fromNetwork = false;
    try {
      const response = await fetch(CATALOG_URL, { credentials: "omit", cache: "no-cache" });
      // Um 404 é uma resposta legítima: significa "esta instalação não publica
      // catálogo externo", e não um erro a ser mostrado ao aluno.
      if (response.ok) {
        raw = await response.json();
        fromNetwork = true;
      }
    } catch {
      // Offline, DNS, CORS: cai no cache abaixo.
    }

    if (raw === null) raw = readCache();
    if (raw === null) {
      publish({ status: "UNAVAILABLE", capsules: [], assets: [], problems: [] });
      return;
    }

    const parsed = parseLessonCatalog(raw);
    // Só um catálogo que produziu conteúdo entra no cache. Guardar um
    // manifesto que não gerou nenhuma aula transformaria um deploy ruim em
    // problema permanente do aluno.
    if (fromNetwork && parsed.capsules.length) writeCache(raw);

    publish({
      status: fromNetwork ? "READY" : "CACHED",
      capsules: parsed.capsules,
      assets: parsed.assets,
      problems: parsed.problems,
    });
  })().finally(() => {
    inFlight = null;
    settled = true;
  });

  return inFlight;
}

export function getLessonCatalogState(): Readonly<CatalogState> {
  return state;
}

export function subscribeLessonCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Resolve uma cápsula por id: embutida primeiro, catálogo depois.
 *
 * A ordem importa. Se um manifesto declarasse o id de uma cápsula embutida, o
 * embutido vence — publicar conteúdo não pode sobrescrever silenciosamente o
 * que foi revisado e testado no repositório.
 */
export function resolveLessonCapsule(id: string): LessonCapsule | undefined {
  return (
    LESSON_CAPSULES.find((capsule) => capsule.id === id) ??
    state.capsules.find((capsule) => capsule.id === id)
  );
}

export function resolveLessonMediaAsset(id: string | undefined): LessonMediaAsset | undefined {
  if (!id) return undefined;
  return (
    LESSON_MEDIA_ASSETS.find((asset) => asset.id === id) ?? state.assets.find((asset) => asset.id === id)
  );
}

/**
 * Cápsulas publicadas que pedem lugar depois de um tópico, como nodes da
 * Jornada.
 *
 * Sempre `OPTIONAL` e sempre sem pré-requisito, e isso é deliberado: conteúdo
 * publicado sem code review pode ACRESCENTAR à Jornada, nunca barrar o
 * caminho de ninguém. Um manifesto malfeito — ou malicioso — no máximo põe um
 * card a mais na tela; não consegue trancar um aluno fora do próximo tópico
 * nem reivindicar mastery. Por isso `affectsCoreMastery` é falso e nenhum
 * campo de requisito é lido daqui.
 */
export function publishedCapsuleNodesAfterTopic(topicId: string): JourneyNode[] {
  return state.capsules
    .filter((capsule) => capsule.afterTopicId === topicId)
    .map((capsule) => ({
      id: `node:published:${capsule.id}`,
      type: "LESSON_CAPSULE",
      priority: "OPTIONAL",
      sourceThemeId: `theme:published`,
      sourceId: capsule.id,
      afterTopicId: topicId,
      affectsCoreMastery: false,
    }));
}

/** Todas as cápsulas conhecidas agora — embutidas e publicadas. */
export function allKnownCapsules(): LessonCapsule[] {
  const builtInIds = new Set(LESSON_CAPSULES.map((capsule) => capsule.id));
  return [...LESSON_CAPSULES, ...state.capsules.filter((capsule) => !builtInIds.has(capsule.id))];
}

/** Somente para testes: devolve o módulo ao estado de app recém-aberto. */
export function resetLessonCatalogForTests(): void {
  inFlight = null;
  settled = false;
  publish({ status: "IDLE", capsules: [], assets: [], problems: [] });
}
