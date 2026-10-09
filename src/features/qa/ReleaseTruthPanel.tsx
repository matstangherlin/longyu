/**
 * RC2.3.9 — Release truth on /qa/device (QA only; never in the learner UI).
 * Reads the generated Product Truth Manifest: build identity, fingerprint,
 * release statuses, provider truth and pending owner actions.
 *
 * RC2.3.10 — artifact provenance: the tester types (or opens /qa/device?expect=<sha>)
 * the SHA being certified; the panel says MATCH or MISMATCH for this install,
 * and a physical PASS on the wrong build is refused (PHYSICAL_QA_INVALID_WRONG_BUILD).
 * Cloud rows are diagnostics only — no credential, token or secret is ever shown.
 */
import { useEffect, useState } from "react";
import productTruth from "../../../docs/release/product-truth.json";
import { RC_BASE_FINGERPRINT } from "../../lib/curriculumFreeze";
import { getNativeAppInfo } from "../../lib/platform/buildIdentity";
import { getAppEnvironmentLabel } from "../../lib/feedback";
import { errorReportingStatus, sendErrorReportingTestEvent } from "../../lib/observability/errorReporting";
import {
  QA_EXPECTED_SHA_KEY,
  compareProvenance,
  readBuildProvenance,
  readExpectedSha,
  type BuildProvenance,
} from "../../lib/releaseProvenance";

type Truth = typeof productTruth;

function storedExpectedSha(): string | null {
  try {
    return window.localStorage.getItem(QA_EXPECTED_SHA_KEY);
  } catch {
    return null;
  }
}

/** The SHA the tester is certifying right now (URL ?expect= wins over the stored value). */
export function currentExpectedSha(): string | null {
  if (typeof window === "undefined") return null;
  return readExpectedSha(window.location.search, storedExpectedSha());
}

function Row({ label, value, testId }: { label: string; value: string | number | null | undefined; testId?: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs" data-testid={testId}>
      <span className="text-[var(--ink-muted)]">{label}</span>
      <span className="font-mono text-right break-all">{value ?? "—"}</span>
    </div>
  );
}

function cloudRows(truth: Truth): Array<[string, string]> {
  const cloud = truth.cloud as Record<string, unknown>;
  const out: Array<[string, string]> = [];
  for (const [section, value] of Object.entries(cloud)) {
    if (section === "providers" || section === "certificationWave") continue;
    if (typeof value === "string") out.push([section, value]);
    else if (value && typeof value === "object") {
      for (const [key, row] of Object.entries(value as Record<string, unknown>)) {
        const status = typeof row === "string" ? row : (row as { status?: string })?.status;
        if (status) out.push([`${section}.${key}`, status]);
      }
    }
  }
  return out;
}

export function ReleaseTruthPanel({ truth = productTruth }: { truth?: Truth }) {
  const [native, setNative] = useState<{ versionName?: string | null; versionCode?: number | null }>({});
  const [expected, setExpected] = useState<string>(() => currentExpectedSha() ?? "");
  const [sentryTest, setSentryTest] = useState<"idle" | "sent" | "off">("idle");

  useEffect(() => {
    let alive = true;
    void getNativeAppInfo().then((info) => {
      if (alive && info) setNative({ versionName: info.versionName, versionCode: info.versionCode });
    });
    return () => {
      alive = false;
    };
  }, []);

  const build: BuildProvenance = readBuildProvenance(import.meta.env, native);
  const verdict = compareProvenance(build, { sha: expected, fingerprint: RC_BASE_FINGERPRINT });

  function updateExpected(value: string) {
    const clean = value.trim().toLowerCase();
    setExpected(clean);
    try {
      if (clean) window.localStorage.setItem(QA_EXPECTED_SHA_KEY, clean);
      else window.localStorage.removeItem(QA_EXPECTED_SHA_KEY);
    } catch {
      /* QA convenience only */
    }
  }

  return (
    <section data-testid="qa-release-truth" className="rounded-2xl border border-[var(--line)] p-4 space-y-3">
      <h2 className="text-sm font-semibold">Release truth</h2>

      <div className="space-y-1" data-testid="qa-provenance" data-provenance={verdict.verdict}>
        <Row label="BUILD SHA" value={build.buildSha?.slice(0, 12)} testId="qa-provenance-build-sha" />
        <label className="flex items-center justify-between gap-3 text-xs">
          <span className="text-[var(--ink-muted)]">EXPECTED/CERTIFIED SHA</span>
          <input
            value={expected}
            onChange={(event) => updateExpected(event.target.value)}
            placeholder="sha do relatório"
            spellCheck={false}
            autoCapitalize="off"
            className="w-40 rounded border border-[var(--line)] bg-transparent px-1 py-0.5 text-right font-mono"
            data-testid="qa-provenance-expected"
          />
        </label>
        <Row label="CURRICULUM FINGERPRINT" value={`${build.curriculumFingerprint ?? "—"} (cert. ${RC_BASE_FINGERPRINT})`} />
        <Row label="VERSION" value={[build.versionName, build.versionCode != null ? `(${build.versionCode})` : null].filter(Boolean).join(" ")} />
        <Row label="BUILD CHANNEL" value={build.channel} />
        <Row label="QA BUILD" value={build.qaBuild ? "VITE_DEVICE_QA" : "não"} />
        <Row label="Environment" value={getAppEnvironmentLabel()} />
        <p
          className={`text-sm font-semibold ${verdict.verdict === "MATCH" ? "text-correct" : verdict.verdict === "MISMATCH" ? "text-wrong" : "text-ink-soft"}`}
          data-testid="qa-provenance-verdict"
        >
          {verdict.verdict}
          {verdict.verdict === "MISMATCH" ? " · PHYSICAL_QA_INVALID_WRONG_BUILD" : ""}
          {verdict.reasons.length ? ` — ${verdict.reasons.join(", ")}` : ""}
        </p>
      </div>

      <div className="space-y-1">
        <Row label="App version (truth)" value={truth.product.version} />
        <Row label="Application id" value={truth.product.applicationId} />
        <Row label="Product Truth from" value={truth.generatedFromSha?.slice(0, 12)} />
      </div>
      <div className="space-y-1">
        {Object.entries(truth.release).flatMap(([id, status]) => {
          if (typeof status === "string" || typeof status === "number") {
            return [<Row key={id} label={id} value={status} />];
          }
          if (status && typeof status === "object") {
            // RC2.3.12 — release.rcCandidate is structured (phase NOT_BUILT…BETA_READY).
            return Object.entries(status as Record<string, string | number | null>).map(([k, v]) => (
              <Row key={`${id}.${k}`} label={`${id}.${k}`} value={v} />
            ));
          }
          return [];
        })}
      </div>
      <div className="space-y-1" data-testid="qa-cloud-truth">
        <h3 className="text-xs font-semibold">Cloud</h3>
        <Row label="certification" value={truth.cloud.certification} />
        {cloudRows(truth).map(([id, status]) => (
          <Row key={id} label={id} value={status} />
        ))}
        <Row label="sentry · this build" value={errorReportingStatus().reason} />
        <button
          type="button"
          className="min-h-9 text-xs font-semibold text-accent"
          onClick={() => setSentryTest(sendErrorReportingTestEvent() ? "sent" : "off")}
          data-testid="qa-sentry-test"
        >
          Enviar SENTRY_TEST_EVENT {sentryTest === "sent" ? "· enviado (confirme no Sentry)" : sentryTest === "off" ? "· Sentry desligado neste build" : ""}
        </button>
        <Row label="jev · learner runtime" value={truth.jev.learnerRuntimeEnabled ? "ENABLED" : "off"} />
        <Row label="jev · server triage" value={truth.jev.serverSideTriage} />
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
