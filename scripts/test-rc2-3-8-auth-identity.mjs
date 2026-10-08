#!/usr/bin/env node
/**
 * test:rc2-3-8-auth-identity — mutation testing for gate:rc2-3-8-auth-identity.
 * Each mutation reintroduces ONE forbidden behaviour; the right code must fire.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAuthRuntime, runAuthGate } from "./lib/auth-identity-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = loadAuthRuntime(root);
assert.deepEqual(runAuthGate(base), [], "estado real precisa passar");

const swap = (text, from, to) => {
  assert.ok(String(text).includes(from), `mutação vazia: ${String(from).slice(0, 90)}`);
  return String(text).split(from).join(to);
};
const src = (key, from, to) => ({ src: { ...base.src, [key]: swap(base.src[key], from, to) } });
const file = (rel, text) => ({ srcFiles: { ...base.srcFiles, [rel]: text } });
const svc = base.srcFiles["src/services/oauthService.ts"];

const cases = [
  ["1. e-mail como ID canônico", { ...src("store", "return `cloud:${userId}`;", "return `cloud:${email}`;"), ...file("src/services/oauthService.ts", svc.replace("export function maskEmail", "const acc = cloudAccountId(user.email);\nexport function maskEmail")) }, "CANONICAL_ID"],
  ["2. access token logado", file("src/services/oauthService.ts", svc + "\nconsole.log(session.access_token);"), "NO_TOKEN_LOGGING"],
  ["3. service role no bundle", { shipped: { ...base.shipped, "dist/assets/x.js": "const k='eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UifQ.c2lnbmF0dXJlc2ln'" } }, "NO_SERVICE_ROLE"],
  ["4. client secret no bundle", { shipped: { ...base.shipped, "android/app/src/main/assets/public/x.js": "const cfg={client_secret:'GOCSPX-abcdefghijklmnop'}" } }, "NO_CLIENT_SECRET"],
  ["5. redirect arbitrário aceito", { parseOAuthCallback: (url) => ({ ok: true, code: "x" }) }, "REDIRECT_ALLOWLIST"],
  ["6. callback processado duas vezes", { markCodeProcessed: () => true }, "CALLBACK_ONCE"],
  ["7. progresso local descartado no login", { classifyClaim: (i) => (i.remoteMeaningful ? { case: "DIVERGENT", action: "RESTORE_CLOUD" } : base.classifyClaim(i)) }, "PROGRESS_NEVER_LOST"],
  ["8. evidência de A vaza para B", { readScoped: (key) => localStorage.getItem(`${key}::cloud:A`) }, "ACCOUNT_ISOLATION"],
  ["9. entitlement decidido no cliente", { ECONOMY_MERGE_POLICY: { ...base.ECONOMY_MERGE_POLICY, serverIsPro: "MAX" } }, "ENTITLEMENT_SERVER"],
  ["10. identidade ligada só pelo e-mail", file("src/lib/auth/autoLink.ts", "export async function auto(c, user, identity){ if (identity.email === user.email) await c.auth.linkIdentity({ provider: 'google' }); }"), "NO_EMAIL_LINKING"],
  ["11. remover o último método", { canUnlink: () => true }, "LAST_METHOD_KEPT"],
  ["12. falha OAuth fica carregando para sempre", src("callbackPage", 'setTimeout(() => setPhase((p) => (p === "working" ? "error" : p)), OAUTH_CALLBACK_TIMEOUT_MS', "setTimeout(() => undefined, OAUTH_CALLBACK_TIMEOUT_MS"), "NO_INFINITE_LOADING"],
  ["13. provedor fora do ar remove o e-mail", { providerAvailability: (e, p, o) => base.providerAvailability(e, p, o).map((a) => (a.provider.id === "email" && o?.size ? { ...a, offered: false } : a)) }, "EMAIL_ALWAYS_OFFERED"],
  ["14. Apple sem e-mail quebra o perfil", { maskEmail: (email) => email.split("@")[1] }, "APPLE_NO_EMAIL_OK"],
  ["15. logout mantém domínio do anterior visível", { namespaceForAccount: (id) => (id === "local" ? "cloud:A" : base.namespaceForAccount(id)) }, "LOGOUT_ISOLATION"],
  ["16. claim anônimo duplicado", { recordClaim: (ledger, id, outcome) => ({ ledger: { ...ledger, claimed: [...ledger.claimed, id] }, changed: true }) }, "CLAIM_IDEMPOTENT"],
  ["17. economia somada às cegas", { mergeWalletField: (policy, a, b) => (policy === "SERVER" ? null : a + b) }, "WALLET_NOT_SUMMED"],
  ["18. Jev decide vínculo de identidade", file("src/lib/auth/linkAdvisor.ts", "import { askJev } from '../jev'; export const shouldLink = () => askJev('link?');"), "NO_JEV_IN_AUTH"],
  ["19. OAuth sem PKCE", src("oauthService", 'flowType: "pkce"', 'flowType: "implicit"'), "PKCE_AND_PROVIDERS"],
];

let killed = 0;
for (const [label, patch, code] of cases) {
  const got = new Set(runAuthGate({ ...base, ...patch }).map((f) => f.code));
  assert.ok(got.has(code), `mutação "${label}" deveria falhar com ${code}; veio ${[...got].join(", ") || "nada"}`);
  killed += 1;
  console.log(`KILLED ${label}: ${code}`);
}
console.log(`PASS test:rc2-3-8-auth-identity (${killed}/${cases.length} mutações mortas)`);
