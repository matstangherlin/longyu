/**
 * RC2.3.4A — curriculum fingerprint chain.
 *
 * A fingerprint may only advance through a typed record in
 * src/lib/curriculumFreeze.ts that carries `previousFingerprint`,
 * `fingerprint`, `id` and `gate`. Starting from the last fingerprint a gate
 * certified (`anchor`), the advancing records must form one unbroken, linear
 * path ending at the live Journey fingerprint. Forks, cycles, orphan records
 * and undocumented jumps all fail.
 */

/** Typed advance records exported by curriculumFreeze.ts. */
export function fingerprintRecords(freezeModule) {
  return Object.entries(freezeModule)
    .filter(
      ([, value]) =>
        value &&
        typeof value === "object" &&
        typeof value.previousFingerprint === "string" &&
        typeof value.fingerprint === "string"
    )
    .map(([exportName, value]) => ({
      exportName,
      id: value.id,
      gate: value.gate,
      previousFingerprint: value.previousFingerprint,
      fingerprint: value.fingerprint,
    }));
}

/**
 * @returns {{ errors: string[], path: string[], advances: object[] }}
 */
export function verifyFingerprintChain({ anchor, declared, live, records, knownScripts }) {
  const errors = [];
  if (declared !== live) {
    errors.push(`RC_BASE_FINGERPRINT ${declared} ≠ fingerprint da Jornada ${live}`);
  }

  const advances = records.filter((r) => r.previousFingerprint !== r.fingerprint);
  for (const r of records) {
    if (typeof r.id !== "string" || !r.id) errors.push(`${r.exportName}: registro sem id`);
    if (typeof r.gate !== "string" || !r.gate) errors.push(`${r.exportName}: registro sem gate`);
    else if (knownScripts && !knownScripts.has(r.gate)) {
      errors.push(`${r.exportName}: gate ${r.gate} não existe em package.json`);
    }
  }

  const outgoing = new Map();
  for (const r of advances) {
    const list = outgoing.get(r.previousFingerprint) ?? [];
    list.push(r);
    outgoing.set(r.previousFingerprint, list);
  }

  const path = [anchor];
  const used = new Set();
  let node = anchor;
  while (outgoing.has(node)) {
    const next = outgoing.get(node);
    if (next.length > 1) {
      errors.push(`fork em ${node}: ${next.map((r) => r.exportName).join(", ")}`);
      break;
    }
    const [edge] = next;
    if (used.has(edge.exportName) || path.includes(edge.fingerprint)) {
      errors.push(`ciclo em ${node} → ${edge.fingerprint} (${edge.exportName})`);
      break;
    }
    used.add(edge.exportName);
    path.push(edge.fingerprint);
    node = edge.fingerprint;
  }

  if (node !== live) {
    errors.push(
      `cadeia documentada termina em ${node}, não em ${live}: avanço sem registro tipado (EXPECTED_FINGERPRINT_ADVANCE ausente)`
    );
  }
  for (const r of advances) {
    if (!used.has(r.exportName)) {
      errors.push(`${r.exportName}: avanço ${r.previousFingerprint} → ${r.fingerprint} fora da cadeia`);
    }
  }
  for (const r of records) {
    if (r.previousFingerprint === r.fingerprint && !path.includes(r.fingerprint)) {
      errors.push(`${r.exportName}: registro sem avanço cita ${r.fingerprint}, que não está na cadeia`);
    }
  }

  return { errors, path, advances: advances.filter((r) => used.has(r.exportName)) };
}
