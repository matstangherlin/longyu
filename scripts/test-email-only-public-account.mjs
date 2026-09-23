/**
 * RC2.2.8 — test:email-only-public-account
 *
 * J: conta de aprendizagem pública exige email em production_beta e
 * qa_candidate; DEV/E2E preservam o bypass. Mutações 22–24.
 */
import assert from "node:assert/strict";
import { expectMutationCaught, gateEmailOnly, it, mutate, rcRequire, readSources, runCases } from "./lib/rc2-2-8-gates.mjs";

const cases = [];
const { isDevLocalAuthAllowed } = rcRequire("../../src/lib/auth/localAuthPolicy.ts");

it(cases, "J1 mutação 22 — production_beta: sem perfil local", () => {
  assert.equal(isDevLocalAuthAllowed({ VITE_APP_ENV: "production_beta" }), false);
  assert.equal(isDevLocalAuthAllowed({ MODE: "production" }), false);
});

it(cases, "J1 mutação 23 — qa_candidate: sem perfil local público", () => {
  assert.equal(isDevLocalAuthAllowed({ VITE_APP_ENV: "qa_candidate" }), false);
});

it(cases, "J1 — flag de bypass num build production-like é erro duro", () => {
  assert.throws(() => isDevLocalAuthAllowed({ VITE_APP_ENV: "production_beta", VITE_DEV_ALLOW_LOCAL_AUTH: "1" }));
  assert.throws(() => isDevLocalAuthAllowed({ VITE_APP_ENV: "qa_candidate", VITE_DEV_ALLOW_LOCAL_AUTH: "1" }));
});

it(cases, "J4 mutação 24 — DEV/E2E preservam o bypass explícito", () => {
  assert.equal(isDevLocalAuthAllowed({ DEV: true, VITE_DEV_ALLOW_LOCAL_AUTH: "1" }), true);
  assert.equal(isDevLocalAuthAllowed({ VITE_APP_ENV: "preview", VITE_DEV_ALLOW_LOCAL_AUTH: "1" }), true);
  assert.equal(isDevLocalAuthAllowed({ DEV: true }), false, "sem a flag nem DEV cria local");
});

const src = readSources();
it(cases, "gate real passa", () => assert.deepEqual(gateEmailOnly(src), []));
expectMutationCaught(cases, "22. produção cria conta local", gateEmailOnly,
  mutate(src, "store", "if (!email && !isDevLocalAuthAllowed()) {", "if (false) {"));
expectMutationCaught(cases, "23. QA candidate mostra 'Criar perfil local'", gateEmailOnly,
  mutate(src, "accountPage", "{isDevLocalAuthAllowed() ? (\n          <div className=\"flex flex-col gap-4 sm:flex-row sm:items-end\">", "{true ? (\n          <div className=\"flex flex-col gap-4 sm:flex-row sm:items-end\">"));
expectMutationCaught(cases, "24. bypass DEV/E2E removido", gateEmailOnly,
  mutate(src, "localAuthPolicy", "VITE_DEV_ALLOW_LOCAL_AUTH?: string }).VITE_DEV_ALLOW_LOCAL_AUTH", "LOCAL?: string }).LOCAL"));
expectMutationCaught(cases, "J3.2. 'Continuar sem conta' no onboarding", gateEmailOnly,
  mutate(src, "comecar", 'import { Button } from "../../components/ui/primitives";', 'import { Button } from "../../components/ui/primitives";\nconst SKIP = "Continuar sem conta";'));

runCases("test:email-only-public-account", cases);
