/** RC2.2.10 — executor comum das mutações dos gates Android. */
import assert from "node:assert/strict";

/** Troca `from` por `to` e FALHA se o trecho não existir (mutação vazia não vale). */
export function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: trecho não encontrado → ${from.slice(0, 80)}`);
  return String(text).split(from).join(to);
}

export function runMutations(name, base, validate, mutations) {
  assert.deepEqual(validate(base), [], `${name}: o estado real precisa passar`);
  for (const [label, mutate, code] of mutations) {
    const state = structuredClone(base);
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
