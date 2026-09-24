/** RC2.2.10B — mutações sobre estado RECARREGADO a cada caso (a lib de identidade tem funções). */
import assert from "node:assert/strict";
import { loadDeliveryState } from "./delivery-pipeline-gates.mjs";

export { swap } from "./android-mutation-runner.mjs";

export function runDeliveryMutations(name, validate, mutations) {
  assert.deepEqual(validate(loadDeliveryState()), [], `${name}: o estado real precisa passar`);
  for (const [label, mutate, code] of mutations) {
    const state = loadDeliveryState();
    mutate(state);
    const failures = validate(state);
    assert.ok(
      failures.some((item) => item.code === code),
      `${name}: mutação "${label}" deveria falhar com ${code}; veio ${failures.map((f) => f.code).join(", ") || "nada"}`
    );
    console.log(`KILLED ${label}: ${code}`);
  }
  console.log(`PASS ${name} (${mutations.length} mutações)`);
}
