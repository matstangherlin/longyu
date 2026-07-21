import { validateConversationPedagogy } from "./lib/conversation-pedagogy-core.mjs";
import { INVALID_CONVERSATION_PEDAGOGY_FIXTURES } from "./fixtures/conversation-pedagogy-invalid.mjs";

const errors = [];
for (const fixture of INVALID_CONVERSATION_PEDAGOGY_FIXTURES) {
  const result = validateConversationPedagogy(fixture.model());
  const codes = new Set(result.failures.map((failure) => failure.code));
  for (const expected of fixture.expected) {
    if (!codes.has(expected)) errors.push(fixture.name + ": não detectou " + expected);
  }
}

if (errors.length) {
  console.error("Fixtures de conversation-pedagogy falharam:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log(
    "OK: " + INVALID_CONVERSATION_PEDAGOGY_FIXTURES.length +
      " fixtures inválidas foram rejeitadas pelos critérios esperados."
  );
}
