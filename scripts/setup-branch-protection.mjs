/**
 * Ativa branch protection na `main` via GitHub REST API.
 *
 * Requer token com escopo `repo` + permissão admin no repositório:
 *   export GITHUB_TOKEN=ghp_...   # PAT pessoal do owner
 *   node scripts/setup-branch-protection.mjs
 *
 * O token do agente Cloud (integração) não tem permissão admin — use o seu.
 */
import process from "node:process";

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const owner = process.env.GITHUB_OWNER ?? "matstangherlin";
const repo = process.env.GITHUB_REPO ?? "longyu";
const branch = process.env.GITHUB_BRANCH ?? "main";

const REQUIRED_CHECKS = [
  "Portão de qualidade (validate:beta + build)",
  "Testes E2E (Playwright)",
  "npm audit (prod + dev)",
  "CodeQL",
  "Secret scan (gitleaks)",
];

if (!token) {
  console.error("Defina GITHUB_TOKEN (PAT com admin no repo).");
  process.exit(1);
}

const url = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`;

const body = {
  required_status_checks: {
    strict: true,
    contexts: REQUIRED_CHECKS,
  },
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: false,
    required_approving_review_count: 0,
  },
  restrictions: null,
  required_linear_history: false,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: true,
};

const response = await fetch(url, {
  method: "PUT",
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await response.text();
if (!response.ok) {
  console.error(`Falhou (${response.status}):`, text);
  process.exit(1);
}

console.log(`Branch protection ativada em ${owner}/${repo}:${branch}`);
console.log("Checks exigidos:", REQUIRED_CHECKS.join(", "));
