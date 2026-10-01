/**
 * RC2.2.31B — Canonical Media Forensics (somente /qa/device).
 */
import { useState } from "react";
import { Button } from "../../components/ui/primitives";
import { getNativeMediaPlugin, usesNativeMediaPlayer } from "../../lib/platform/nativeMedia";
import { canonicalHandlerCount, canonicalListenerBindState, playCanonicalAudio, cancelCanonicalAudio } from "../../lib/audio/canonicalPlayer";
import { audioEntryById } from "../../data/audioManifest.generated";

export function CanonicalMediaForensicsPanel() {
  const [log, setLog] = useState<string>("");
  const [state, setState] = useState<Record<string, unknown>>({});

  async function refresh() {
    const media = getNativeMediaPlugin();
    const native = media ? await media.getCanonicalPlayerState() : {};
    setState({
      ...native,
      pendingHandlers: canonicalHandlerCount(),
      listenerBind: canonicalListenerBindState(),
      usesNative: usesNativeMediaPlayer(),
    });
  }

  async function playNihao() {
    const entry = audioEntryById("audio:guided-try:nihao:v1");
    if (!entry) {
      setLog("missing nihao entry");
      return;
    }
    const outcome = await playCanonicalAudio({
      audioId: entry.audioId,
      uri: entry.uri,
      androidAssetPath: entry.androidAssetPath ?? entry.file,
      onState: (s) => setLog((prev) => `${prev}\nstate=${s}`.trim()),
    });
    setLog((prev) => `${prev}\noutcome=${JSON.stringify(outcome)}`.trim());
    await refresh();
  }

  async function raceAB() {
    const entry = audioEntryById("audio:guided-try:nihao:v1");
    const entryB = audioEntryById("audio:guided-try:hao:v1");
    if (!entry || !entryB) return;
    const a = playCanonicalAudio({
      audioId: entry.audioId,
      uri: entry.uri,
      androidAssetPath: entry.androidAssetPath ?? entry.file,
      requestId: "race-A",
    });
    await new Promise((r) => setTimeout(r, 80));
    const b = playCanonicalAudio({
      audioId: entryB.audioId,
      uri: entryB.uri,
      androidAssetPath: entryB.androidAssetPath ?? entryB.file,
      requestId: "race-B",
    });
    await cancelCanonicalAudio("race-A");
    const [oa, ob] = await Promise.all([a, b]);
    setLog(`A=${JSON.stringify(oa)}\nB=${JSON.stringify(ob)}`);
    await refresh();
  }

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4" data-testid="qa-canonical-media-forensics">
      <h2 className="font-serif text-lg font-semibold text-ink">CANONICAL MEDIA FORENSICS</h2>
      <p className="text-xs text-ink-soft">Somente /qa/device — requestId, generation, handlers, position.</p>
      <dl className="grid grid-cols-2 gap-2 text-[12px] text-ink-soft">
        {Object.entries(state).map(([k, v]) => (
          <div key={k}>
            <dt className="font-semibold text-ink">{k}</dt>
            <dd>{String(v ?? "—")}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void refresh()}>
          Refresh state
        </Button>
        <Button type="button" size="sm" onClick={() => void playNihao()}>
          Teste 你好
        </Button>
        <Button type="button" size="sm" onClick={() => void raceAB()}>
          A→B race
        </Button>
      </div>
      {log && (
        <pre className="max-h-48 overflow-auto rounded-lg bg-surface-2 p-2 text-[11px] text-ink-soft" data-testid="qa-canonical-media-log">
          {log}
        </pre>
      )}
    </section>
  );
}
