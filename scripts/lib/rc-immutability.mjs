/**
 * RC2.3.12C — RC candidate immutability.
 *
 * Draft (never distributed / never physically accepted) may regenerate in place.
 * Once distributedOrAccepted, any code change that alters certified artifact SHA
 * must mint the next RC id (RC2, RC3, …) — never mutate the frozen identity.
 */
export function nextRcId(rcId) {
  const m = String(rcId ?? "").match(/^(RC2\.3\.12-RC)(\d+)$/);
  if (!m) throw new Error(`RC_ID_INVALID:${rcId}`);
  return `${m[1]}${Number(m[2]) + 1}`;
}

export function assertRcMutable({ candidate, changeTouchesCertifiedSha }) {
  const errors = [];
  const frozen = candidate?.distributed === true || candidate?.physicallyAccepted === true || candidate?.immutable === true;
  if (frozen && changeTouchesCertifiedSha) {
    errors.push("RC_MUTATED_AFTER_DISTRIBUTION");
  }
  return errors;
}

export function markDistributed(candidate, { channel, at } = {}) {
  return {
    ...candidate,
    distributed: true,
    immutable: true,
    distributedAt: at ?? new Date().toISOString(),
    distributionChannel: channel ?? "owner-sideload",
  };
}

export function checkGoWhileHostedRunning({ entryResult, hostedCi }) {
  const errors = [];
  if (entryResult === "GO" && (hostedCi === "PENDING" || hostedCi === "RUNNING" || hostedCi === "IN_PROGRESS")) {
    errors.push("GO_WHILE_HOSTED_RUNNING");
  }
  if (entryResult === "GO" && hostedCi === "FAIL") errors.push("GO_WHILE_HOSTED_FAIL");
  return errors;
}
