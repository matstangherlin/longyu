console.warn(
  "apply:beta-feedback-sql agora aplica somente migrations pendentes pelo ledger oficial."
);
await import("./apply-migrations-api.mjs");
