/**
 * RC2.3.9 — Release truth on /qa/device (QA only; never in the learner UI).
 * Reads the generated Product Truth Manifest: build identity, fingerprint,
 * release statuses, provider truth and pending owner actions.
 */
import productTruth from "../../../docs/release/product-truth.json";
import { getBuildIdentity } from "../../lib/platform/buildIdentity";

type Truth = typeof productTruth;

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-[var(--ink-muted)]">{label}</span>
      <span className="font-mono text-right break-all">{value ?? "—"}</span>
    </div>
  );
}

export function ReleaseTruthPanel({ truth = productTruth }: { truth?: Truth }) {
  const build = getBuildIdentity();
  return (
    <section data-testid="qa-release-truth" className="rounded-2xl border border-[var(--line)] p-4 space-y-3">
      <h2 className="text-sm font-semibold">Release truth</h2>
      <div className="space-y-1">
        <Row label="Build SHA" value={build.commitSha?.slice(0, 12) ?? build.build} />
        <Row label="Environment" value={build.environment} />
        <Row label="App version" value={truth.product.version} />
        <Row label="Application id" value={truth.product.applicationId} />
        <Row label="Curriculum fingerprint" value={truth.product.curriculumFingerprint} />
        <Row label="Product Truth schema" value={truth.schemaVersion} />
        <Row label="Product Truth from" value={truth.generatedFromSha?.slice(0, 12)} />
        <Row label="Gate registry" value="RC2.3.9" />
      </div>
      <div className="space-y-1">
        {Object.entries(truth.release).map(([id, status]) => (
          <Row key={id} label={id} value={status} />
        ))}
      </div>
      <div className="space-y-1">
        {Object.entries(truth.identity.providers).map(([id, row]) => (
          <Row key={id} label={`auth · ${id}`} value={row.status} />
        ))}
      </div>
      <Row label="Owner actions pending" value={truth.pendingOwnerActions.length} />
    </section>
  );
}
