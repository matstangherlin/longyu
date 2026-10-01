/**
 * RC2.2.28 — BUILD PROVENANCE (verdade dos dois SHAs).
 *
 * PR build é válido quando:
 *   embeddedSourceHeadSha == github.event.pull_request.head.sha
 *   embeddedWorkflowSha    == GITHUB_SHA
 *
 * NÃO comparar simplesmente GITHUB_SHA == PR HEAD.
 * O merge sintético de CI (workflowSha) é NORMAL — não significa APK antigo.
 */
export type BuildProvenanceVerdict = "MATCH" | "TEST_INVALID" | "UNKNOWN";

export interface BuildProvenanceInput {
  /** HEAD real da branch/PR (source). */
  sourceHeadSha?: string | null;
  /** GITHUB_SHA do workflow (pode ser merge sintético). */
  workflowSha?: string | null;
  /** SHA de fonte embutido no APK/web. */
  embeddedSourceHeadSha?: string | null;
  /** SHA de workflow embutido no APK/web. */
  embeddedWorkflowSha?: string | null;
  /** SHA reportado pelo APK instalado (App.getInfo / version.json). */
  installedSourceHeadSha?: string | null;
  installedWorkflowSha?: string | null;
  /** Compat RC2.2.27: aliases antigos. */
  prHead?: string | null;
  workflowHead?: string | null;
  embeddedSha?: string | null;
  installedSha?: string | null;
}

const MIN_SHA = 7;

function norm(sha?: string | null): string | null {
  const value = String(sha ?? "").trim().toLowerCase();
  return /^[0-9a-f]{7,40}$/.test(value) ? value : null;
}

/** Dois SHAs batem se um é prefixo do outro (≥ 7 caracteres). */
export function shaMatches(a?: string | null, b?: string | null): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  const n = Math.min(x.length, y.length);
  return n >= MIN_SHA && x.slice(0, n) === y.slice(0, n);
}

/**
 * Fonte e workflow são eixos INDEPENDENTES.
 * - Sem source HEAD + installed source → UNKNOWN
 * - Source diverge → TEST_INVALID
 * - Workflow embutido, se presente, deve bater com workflowSha (não com source)
 * - NUNCA exige workflowSha == sourceHeadSha (merge sintético é válido)
 */
export function buildProvenanceVerdict(input: BuildProvenanceInput): BuildProvenanceVerdict {
  const sourceHead = norm(input.sourceHeadSha ?? input.prHead);
  const workflow = norm(input.workflowSha ?? input.workflowHead);
  const embeddedSource = norm(input.embeddedSourceHeadSha ?? input.embeddedSha);
  const embeddedWorkflow = norm(input.embeddedWorkflowSha);
  const installedSource = norm(input.installedSourceHeadSha ?? input.installedSha);
  const installedWorkflow = norm(input.installedWorkflowSha);

  if (!sourceHead || !installedSource) return "UNKNOWN";
  if (!shaMatches(sourceHead, installedSource)) return "TEST_INVALID";
  if (embeddedSource && !shaMatches(sourceHead, embeddedSource)) return "TEST_INVALID";

  // Workflow: só valida quando ambos os lados existem. Divergência de workflow
  // ≠ “APK antigo”; divergência de SOURCE sim.
  if (workflow && embeddedWorkflow && !shaMatches(workflow, embeddedWorkflow)) return "TEST_INVALID";
  if (workflow && installedWorkflow && !shaMatches(workflow, installedWorkflow)) return "TEST_INVALID";

  // Regra explícita: NÃO falhar só porque merge SHA ≠ source HEAD.
  if (workflow && sourceHead && !shaMatches(workflow, sourceHead)) {
    // Isso é ESPERADO em PR builds. Continua MATCH se source bateu.
  }

  return "MATCH";
}

/** Compat: o painel forense antigo ainda chama buildIdentityVerdict. */
export type BuildIdentityVerdict = BuildProvenanceVerdict;
export type BuildIdentityInput = BuildProvenanceInput;

export function buildIdentityVerdict(input: BuildIdentityInput): BuildIdentityVerdict {
  return buildProvenanceVerdict(input);
}

export function physicalResultAcceptable(verdict: BuildProvenanceVerdict): boolean {
  return verdict === "MATCH";
}

export interface PublicBuildProvenance {
  sourceHeadSha: string;
  workflowSha: string;
  baseSha?: string;
  versionName: string;
  versionCode?: number | null;
  shortSourceHeadSha: string;
  shortWorkflowSha: string;
}

export function formatBuildProvenance(p: PublicBuildProvenance): string {
  return [
    `SOURCE HEAD: ${p.shortSourceHeadSha || p.sourceHeadSha.slice(0, 7)}`,
    `CI MERGE: ${p.shortWorkflowSha || p.workflowSha.slice(0, 7)}`,
    p.baseSha ? `BASE: ${p.baseSha.slice(0, 7)}` : null,
    `VERSION: ${p.versionName}${p.versionCode != null ? ` (${p.versionCode})` : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
