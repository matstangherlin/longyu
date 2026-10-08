#!/usr/bin/env node
/**
 * RC2.3.10B — static privacy / freeze proofs (offline, read-only).
 *
 *   node scripts/rc2-3-10b-static-proofs.mjs generate [--dist] [--live]
 *   node scripts/rc2-3-10b-static-proofs.mjs validate
 *   node scripts/rc2-3-10b-static-proofs.mjs test
 *
 * Writes docs/launch/rc2-3-10b-static-proofs.json with three proofs:
 *   JEV_LEARNER_RUNTIME_FREEZE  no TypeSafe/Jev host or key anywhere a learner device can run it
 *   SPEECH_RAW_AUDIO_NOT_UPLOADED
 *   HANZI_STROKE_PATH_NOT_PERSISTED
 * `--dist` scans a local `dist/` build (informational, build SHA recorded).
 * `--live` fetches the production JS chunks and scans them (informational, needs network).
 * validate/test never touch the network.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const mode = process.argv[2];
const OUT = "docs/launch/rc2-3-10b-static-proofs.json";
const EXTRACT = "docs/launch/rc2-3-10b-schema-column-extract.json";

const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const tracked = () => git("ls-files", "-co", "--exclude-standard").stdout.split("\n").filter(Boolean);
const TEXT = /\.(ts|tsx|js|mjs|cjs|json|java|kt|xml|gradle|toml|html|md|sql|yml|yaml|txt|properties)$/;
const isTest = (f) => /(\.test\.|\.spec\.|__tests__|\/e2e\/|\/fixtures\/)/.test(f);

function readFiles(pred) {
  const out = [];
  for (const f of tracked()) {
    if (!pred(f) || !TEXT.test(f)) continue;
    const abs = path.join(root, f);
    if (!fs.existsSync(abs)) continue;
    const st = fs.statSync(abs);
    if (st.size > 3_000_000) continue;
    out.push({ file: f, text: fs.readFileSync(abs, "utf8") });
  }
  return out;
}

const lineOf = (text, idx) => text.slice(0, idx).split("\n").length;
function hits(files, re) {
  const found = [];
  for (const f of files) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    let m;
    while ((m = g.exec(f.text))) found.push(`${f.file}:${lineOf(f.text, m.index)}`);
  }
  return found;
}

/* ---------------------------------------------------------------------- */
/* Source sets                                                             */
/* ---------------------------------------------------------------------- */

function sources(overrides = {}) {
  const clientFiles =
    overrides.clientFiles ??
    readFiles((f) => /^(src\/|public\/|index\.html$|capacitor\.config\.ts$|vite\.config\.ts$|netlify\.toml$|nginx\.conf$|android\/app\/src\/main\/(java|res)\/|android\/app\/src\/main\/AndroidManifest\.xml$|android\/app\/build\.gradle$|\.env\.example$)/.test(f));
  const clientNoTests = clientFiles.filter((f) => !isTest(f.file));
  const edge = overrides.edge ?? readFiles((f) => /^supabase\/functions\/[^/]+\/.+\.ts$/.test(f) || /^supabase\/functions\/_shared\/.+\.ts$/.test(f));
  const byPath = (p) => overrides.byPath?.[p] ?? (fs.existsSync(path.join(root, p)) ? fs.readFileSync(path.join(root, p), "utf8") : "");
  return { clientFiles, clientNoTests, edge, byPath };
}

const SPEECH_FILES = [
  "src/features/lesson/PronunciationPractice.tsx",
  "src/features/lesson/SelfComparePractice.tsx",
  "src/features/pinyin/PronunciationContrastDrill.tsx",
  "src/lib/speech.ts",
  "src/lib/speechEvidence.ts",
  "src/lib/speechDiagnostics.ts",
  "src/lib/speechFailure.ts",
  "src/lib/speechPilot.ts",
];
const HANZI_DIRS = /^(src\/features\/hanzi\/|src\/lib\/hanziWriting\/|src\/components\/tone\/ToneTrace\.tsx$|src\/features\/qa\/HanziWritingQaPanel\.tsx$)/;
const NETWORK = /\bfetch\s*\(|sendBeacon|XMLHttpRequest|\bWebSocket\b|new FormData|\.upload\s*\(|\.storage\b|functions\.invoke|\.rpc\s*\(|getSupabaseClient|from\s+["'][^"']*supabase/;
const JEV = /typesafe\.ai|systemone|TYPESAFE_API_KEY|VITE_TYPESAFE|VITE_JEV|\baskJev\b|_shared\/jev|jevAllowed\s*\(/i;

/* ---------------------------------------------------------------------- */
/* Checks                                                                  */
/* ---------------------------------------------------------------------- */

function check(id, claim, violations, extra = {}) {
  return { id, claim, result: violations.length ? "FAIL" : "PASS", violations, ...extra };
}

export function jevProof(src) {
  const checks = [];
  checks.push(check("J1", "No TypeSafe/Jev host, key name or helper appears in any client source (web src/, public/, index.html, capacitor/vite config, Android java/res/manifest/gradle).", hits(src.clientNoTests, JEV)));
  checks.push(check("J2", ".env.example declares no VITE_TYPESAFE*/VITE_JEV* variable.", /^\s*VITE_(TYPESAFE|JEV)\w*\s*=/m.test(src.byPath(".env.example")) ? [".env.example"] : []));
  const hosts = src.edge.filter((f) => JEV.test(f.text)).map((f) => f.file);
  const learnerEdge = src.edge.filter((f) => !/triage-feedback\/|_shared\/jev\.ts$/.test(f.file) && /\baskJev\b|_shared\/jev|jevAllowed\s*\(/.test(f.text)).map((f) => f.file);
  checks.push(check("J3", "No Edge Function other than triage-feedback imports or calls the Jev helper (learner-facing functions cannot reach the host).", learnerEdge, { serverSideReferences: hosts }));
  const policy = src.byPath("supabase/functions/_shared/budgetPolicy.ts") || "";
  const policyFile = ["supabase/functions/_shared/budgetPolicy.ts"].find((p) => src.byPath(p)) ?? null;
  checks.push(check("J4", "Server-side Jev runtime kill switch defaults to off (JEV_RUNTIME_ENABLED: false).", /JEV_RUNTIME_ENABLED:\s*false/.test(policy) ? [] : [policyFile ?? "budget policy file not found"], { file: policyFile }));
  const csp = src.byPath("netlify.toml");
  checks.push(check("J5", "The web Content-Security-Policy connect-src exists and does not allow the TypeSafe host, so a browser could not call it even if code tried.", !/connect-src/.test(csp) ? ["netlify.toml has no connect-src directive"] : /connect-src[^"\n]*typesafe/i.test(csp) ? ["netlify.toml connect-src allows typesafe"] : []));
  const mentions = hits(src.clientNoTests, /typesafe/i);
  return { id: "JEV_LEARNER_RUNTIME_FREEZE", checks, comments: { clientMentionsOfTheWordTypeSafe: mentions, note: "words only; none is a host, key name or call" } };
}


/** Fields of AccountSnapshot (extended by LearningAccount). buildProgressSnapshot spreads ALL of them into the cloud snapshot. */
function accountFields(store) {
  const body = /\ninterface AccountSnapshot extends [\s\S]*?\n\{([\s\S]*?)\n\}\n/.exec(store)?.[1] ?? /\ninterface AccountSnapshot[^{]*\{([\s\S]*?)\n\}\n/.exec(store)?.[1] ?? "";
  const learning = /export interface LearningAccount extends AccountSnapshot \{([\s\S]*?)\n\}\n/.exec(store)?.[1] ?? "";
  const out = [];
  for (const m of `${body}\n${learning}`.matchAll(/^\s{2}([a-zA-Z_][a-zA-Z0-9_]*)\??:\s*([^;]+);/gm)) out.push({ name: m[1], type: m[2].trim() });
  return out;
}
const MEDIA_TYPE = /\b(Blob|ArrayBuffer|Uint8Array|Float32Array|File|MediaStream|AudioBuffer|Point2D|StrokeAttemptSample|HandwritingStroke)\b/;
const MEDIA_NAME = /(recording|voice|transcript|waveform|stroke|ink|pitch|handwrit)/i;

function snapshotShape(src) {
  const store = src.byPath("src/lib/store.ts");
  const snapshot = src.byPath("src/lib/progressSnapshot.ts");
  const fields = accountFields(store);
  return { fields, spreadsAll: /const \{[^}]*\.\.\.progress \} = account/.test(snapshot) || /\.\.\.progress\s*\}\s*=\s*account/.test(snapshot) };
}


export function freeTextFlow(src) {
  const free = src.byPath("src/features/lesson/FreeAnswerField.tsx");
  const steps = src.byPath("src/features/lesson/steps.tsx");
  const player = src.byPath("src/features/lesson/LessonPlayer.tsx");
  const store = src.byPath("src/lib/store.ts");
  const snap = shapeFlag(src);
  const evidence = {
    dictationFillsAnswerField: /startRecognition|recogni[sz]/i.test(free) && /onChange\(transcript\)|setPendingTranscript\(transcript\)/.test(free),
    wrongWriteAnswerSentToMistakeHandler: /onMistake\?\.\(draft\)/.test(steps),
    mistakeKeepsRawText: /selectedAnswer:\s*isStatusAnswer \? "Resposta incorreta" : rawSelected/.test(player) && /userAnswer:\s*error\.selectedAnswer/.test(player),
    mistakeFieldsInAccountState: /mistakeHistory:\s*LessonMistakeRecord\[\]/.test(store) && /userAnswer:\s*string/.test(store) && /unrecognizedProductions\?:\s*UnrecognizedProductionRecord\[\]/.test(store),
    snapshotSpreadsAccount: snap,
    pedagogyTelemetryStripsAnswers: /freeTextAnswer[\s\S]{0,200}answerText|\|answer\|/.test(src.byPath("src/services/pedagogyEvents.ts")),
  };
  return evidence;
}
function shapeFlag(src) {
  return snapshotShape(src).spreadsAll;
}

export function speechProof(src, extract) {
  const checks = [];
  const speechFiles = SPEECH_FILES.map((p) => ({ file: p, text: src.byPath(p) }));
  const missing = speechFiles.filter((f) => !f.text).map((f) => f.file);
  checks.push(check("S1", "No speech/recording source file contains a network, upload or Supabase API.", [...missing.map((m) => `MISSING_FILE:${m}`), ...hits(speechFiles, NETWORK)], { files: SPEECH_FILES }));
  const blobReaders = hits(src.clientNoTests, /FileReader|\.arrayBuffer\s*\(|readAsDataURL|blobToBase64|\.toDataURL\s*\(|createMediaStreamSource|MediaRecorder\.prototype/);
  checks.push(check("S2", "Nothing in the client reads a recorded Blob back as data (no FileReader, arrayBuffer, base64 or data-URL conversion). Recordings are only played through a local blob: object URL.", blobReaders));
  const objectUrls = hits(speechFiles.filter((f) => /SelfCompare|PronunciationPractice/.test(f.file)), /createObjectURL/);
  checks.push(check("S3", "Both recorder UIs create only local object URLs and revoke them on retry and unmount.", objectUrls.length >= 2 && hits(speechFiles, /revokeObjectURL/).length >= 3 ? [] : ["createObjectURL/revokeObjectURL pairing not found"], { createObjectURL: objectUrls, revokeObjectURL: hits(speechFiles, /revokeObjectURL/) }));
  const storageUse = hits(src.clientNoTests, /\.storage\.from\s*\(|createSignedUploadUrl|\.upload\s*\(/);
  checks.push(check("S4", "The client never calls Supabase Storage or any upload API.", storageUse));
  const plugin = src.byPath("android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java");
  const javaFiles = src.clientNoTests.filter((f) => /^android\/app\/src\/main\/java\//.test(f.file));
  checks.push(check("S5", "Android native code has no network class (HttpURLConnection, OkHttp, java.net, WebSocket, Retrofit, DownloadManager).", hits(javaFiles, /HttpURLConnection|OkHttp|okhttp|import java\.net\.|URLConnection|Retrofit|WebSocket|DownloadManager|FirebaseStorage/)));
  const writesToCache = /new File\(getContext\(\)\.getCacheDir\(\),\s*"longyu-practice\.m4a"\)/.test(plugin);
  const deletes = (plugin.match(/file\.delete\(\)/g) ?? []).length;
  const discards = (plugin.match(/discardPracticeRecording\(/g) ?? []).length;
  checks.push(check("S6", "The native practice recording is a single cache-dir file that every start, failure, interruption and teardown path deletes.", writesToCache && deletes >= 2 && discards >= 6 ? [] : [`cacheFile=${writesToCache} deletes=${deletes} discardCalls=${discards}`], { cacheFile: "cache/longyu-practice.m4a", deleteCalls: deletes, discardCalls: discards }));
  const returnedKeys = [...plugin.matchAll(/ret\.put\("([A-Za-z_]+)"/g)].map((m) => m[1]);
  const leaking = returnedKeys.filter((k) => /^(path|uri|url|file|audio|data|base64|bytes64|content|blob|transcript)$/i.test(k));
  checks.push(check("S7", "The native plugin returns metadata only to JavaScript (no path, URI, bytes or audio payload key).", leaking, { metadataKeysSample: [...new Set(returnedKeys.filter((k) => /file|peak|duration|signal|state|code/i.test(k)))].sort() }));
  const evidence = src.byPath("src/lib/speechEvidence.ts");
  const fields = /SPEECH_EVIDENCE_FIELDS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(evidence)?.[1]?.match(/"[A-Za-z]+"/g)?.map((s) => s.replace(/"/g, "")) ?? [];
  checks.push(check("S8", "The persisted speech evidence schema has no audio, URL, blob, transcript or score field.", fields.length ? fields.filter((f) => /audio|url|blob|transcript|score|pitch|voice|recording(?!Captured)/i.test(f)) : ["SPEECH_EVIDENCE_FIELDS not found"], { fields }));
  const shape = snapshotShape(src);
  const mediaFields = shape.fields.filter((f) => MEDIA_TYPE.test(f.type) || MEDIA_NAME.test(f.name)).map((f) => `${f.name}: ${f.type}`);
  checks.push(check("S9", "The cloud snapshot is NOT an allowlist (buildProgressSnapshot spreads every LearningAccount field), so the account type itself is audited: none of its fields has a media/geometry type (Blob, ArrayBuffer, File, MediaStream, AudioBuffer...) or a recording/voice/transcript/waveform/stroke/ink/pitch name.", [...(shape.fields.length > 60 ? [] : [`ACCOUNT_FIELDS_NOT_PARSED:${shape.fields.length}`]), ...(shape.spreadsAll ? [] : ["SNAPSHOT_SHAPE_CHANGED: spread no longer detected, re-audit"]), ...mediaFields], { accountFieldCount: shape.fields.length, snapshotSpreadsAllAccountFields: shape.spreadsAll }));
  const edgeAudio = hits(src.edge, /audio\/(webm|mp4|mpeg|wav|ogg)|formData\s*\(\s*\)|multipart\/form-data|\.arrayBuffer\s*\(\s*\)/i);
  checks.push(check("S10", "No Edge Function accepts audio, multipart or binary bodies.", edgeAudio));
  const cols = [];
  for (const r of extract.relations) for (const c of r.cols.split(/,\s(?=[a-z_][a-z0-9_]*:)/)) {
    const [name, type] = c.split(":");
    if (/(^|_)(audio|recording|voice|transcript|stroke|strokes|ink|waveform|blob)(_|$)/i.test(name) || /^bytea$/.test(type)) cols.push(`${r.t}.${name}:${type}`);
  }
  checks.push(check("S11", "No production table has a column that could hold audio or a transcript (name match or bytea type) across all 37 tables.", cols, { source: EXTRACT }));
  const en = src.byPath("src/locales/en.ts");
  const pt = src.byPath("src/locales/pt-BR.ts");
  const disclosed = /speechPrivacy:[^\n]*(service|serviço)/i.test(en) && /speechPrivacy:[^\n]*(serviço|service)/i.test(pt) && /selfComparePrivacy/.test(en);
  checks.push(check("S12", "User-facing copy states that Longyu does not store the recording and that recognition may be processed by the device's speech service (en and pt-BR).", disclosed ? [] : ["speechPrivacy copy missing or changed"]));
  const flow = freeTextFlow(src);
  const findings = [
    {
      id: "F-SPEECH-1",
      severity: "MEDIUM",
      status: Object.values(flow).every(Boolean) ? "OPEN" : "FLOW_CHANGED_RE_AUDIT",
      title: "Dictated free-text answers are stored as text and travel in the cloud snapshot",
      detail: "FreeAnswerField's microphone writes the recognizer transcript into the answer field. When a write-step answer is wrong, the raw text is kept as LessonMistakeRecord.userAnswer / ActivityErrorRecord.selectedAnswer (and UnrecognizedProductionRecord.answer, last 40). Those live in account state and buildProgressSnapshot spreads all account fields into user_progress.client_snapshot. This is text, not audio, and it is the same record a typed answer produces, so the 'raw recording is not uploaded' claim holds; but 'transcription of personal speech is not collected' (rc2-3-5-speech-evidence-contract.md, Not collected) is true only of the speech-evidence record, not of the account state.",
      evidence: flow,
      server: "pedagogy telemetry already strips answer/freeText keys (src/services/pedagogyEvents.ts), so these strings do not reach beta_pedagogy_events; they do reach the user's own user_progress row (RLS own-row).",
      ownerDecision: "Fold into OA-PRIVACY-SNAPSHOT-EMAIL: the RC2.3.11 snapshot change should become an allowlist that excludes mistake/answer text, or the privacy policy must name free-text answers as stored data.",
    },
  ];
  return {
    id: "SPEECH_RAW_AUDIO_NOT_UPLOADED",
    checks,
    findings,
    platformCaveat: {
      statement: "Recognition itself is delegated to the platform. The browser SpeechRecognition engine and the Android SpeechRecognizer service may stream audio to the vendor's speech service. Longyu code does not send audio anywhere; it cannot control what the platform engine does.",
      onDevicePreference: "LongyuSpeechPlugin uses SpeechRecognizer.createOnDeviceSpeechRecognizer on Android 12+ when available and preferred; otherwise the system service.",
      disclosedIn: ["src/locales/en.ts speechPrivacy + privacy block", "src/locales/pt-BR.ts speechPrivacy"],
      notProvenHere: "What a given browser or Google speech service retains is outside this repository and was not tested.",
    },
  };
}

export function hanziProof(src) {
  const checks = [];
  const hanziFiles = src.clientNoTests.filter((f) => HANZI_DIRS.test(f.file) && !/\/references\//.test(f.file));
  const persistent = hits(hanziFiles.filter((f) => f.file !== "src/lib/hanziWriting/evidence.ts"), /localStorage|sessionStorage|indexedDB|writeScoped|\.setItem\s*\(|caches\.open/);
  checks.push(check("H1", "No hànzì or tone-trace UI/engine file other than evidence.ts writes to any persistent store.", persistent));
  checks.push(check("H2", "No hànzì writing, tone-trace or QA-panel file calls a network, upload or Supabase API.", hits(hanziFiles, NETWORK)));
  const types = src.byPath("src/lib/hanziWriting/types.ts");
  const iface = (name) => new RegExp(`export interface ${name}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(types)?.[1] ?? null;
  const persistedShapes = ["HanziFormEvidence", "HanziWritingTelemetryEvent"];
  const bad = [];
  for (const n of persistedShapes) {
    const body = iface(n);
    if (body == null) bad.push(`${n}:NOT_FOUND`);
    else if (/\bpoints?\b|\bpath\b|Point2D|\bcoords?\b|\bsamples?\b|\bstrokes\b|\bx\s*:|\by\s*:/i.test(body)) bad.push(`${n}:HAS_GEOMETRY_FIELD`);
  }
  checks.push(check("H3", "The two persisted shapes (HanziFormEvidence counters, HanziWritingTelemetryEvent) contain counters, booleans and ids only: no points, path, samples or coordinates.", bad, { persistedShapes }));
  const evidence = src.byPath("src/lib/hanziWriting/evidence.ts");
  const persistedWrites = (evidence.match(/writeScoped\(/g) ?? []).length;
  const ring = /list\.slice\(-200\)/.test(evidence);
  checks.push(check("H4", "evidence.ts has exactly two writes: the form-evidence counter map and a 200-event telemetry ring buffer; the code comment forbids stroke coordinates.", persistedWrites === 2 && ring && /never store stroke coordinates/i.test(evidence) ? [] : [`writes=${persistedWrites} ring=${ring}`], { writeCalls: persistedWrites }));
  const exercise = src.byPath("src/features/hanzi/writing/HanziWritingExercise.tsx");
  const telemetryCall = /appendWritingTelemetry\(\{([\s\S]*?)\}\);/.exec(exercise)?.[1] ?? "";
  const formCall = /recordFormEvidence\(\{([\s\S]*?)\}\);/.exec(exercise)?.[1] ?? "";
  const leaks = [];
  for (const [n, body] of [["appendWritingTelemetry", telemetryCall], ["recordFormEvidence", formCall]]) {
    if (!body) leaks.push(`${n}:CALL_NOT_FOUND`);
    const stripped = body.replace(/samples\.length/g, "");
    if (/\bsamples\b|\bpoints\b|\battempts\b|\bink\b/.test(stripped)) leaks.push(`${n}:PASSES_STROKE_DATA`);
  }
  checks.push(check("H5", "The only call sites that persist writing results pass derived counts (samples.length) and flags, never the sampled points.", leaks));
  const inkConsumers = hits(src.clientNoTests, /onInkChange\s*=/);
  checks.push(check("H6", "The optional live-ink callback (onInkChange) has no consumer, so the ink path never leaves the canvas component.", inkConsumers));
  const canvas = src.byPath("src/features/hanzi/writing/HanziWritingCanvas.tsx");
  checks.push(check("H7", "Ink lives in refs of the canvas component (inkRef/committedRef) and React state of the exercise (attempts); no module-level or global store holds it.", /const inkRef = useRef<Point2D\[\]>\(\[\]\)/.test(canvas) && /const committedRef = useRef<Point2D\[\]\[\]>\(\[\]\)/.test(canvas) && /const \[attempts, setAttempts\] = useState<StrokeAttemptSample\[\]>/.test(exercise) && !/^(let|var)\s+\w*(ink|stroke|points)/im.test(canvas) ? [] : ["ink storage shape changed"]));
  const shape = snapshotShape(src);
  const geomFields = shape.fields.filter((f) => MEDIA_TYPE.test(f.type) || MEDIA_NAME.test(f.name)).map((f) => `${f.name}: ${f.type}`);
  const builder = /export interface HanziBuilderCharProgress \{([\s\S]*?)\n\}/.exec(src.byPath("src/data/hanziBuilder.ts"))?.[1] ?? null;
  const builderBad = builder == null ? ["HanziBuilderCharProgress:NOT_FOUND"] : [...builder.matchAll(/^\s+(\w+)\??:\s*([^;]+);/gm)].filter((m) => !/^(number|boolean)$/.test(m[2].trim())).map((m) => `HanziBuilderCharProgress.${m[1]}:${m[2].trim()}`);
  checks.push(check("H8", "The only hanzi data in the cloud snapshot (account field hanziBuilderProgressByChar) is counters and a boolean; no LearningAccount field has a geometry/media type or stroke/ink name. Writing evidence and telemetry live in separate device-only keys the snapshot builder never reads.", [...geomFields, ...builderBad, ...(/HANZI_FORM|hanzi-form-evidence|writing-telemetry|hanziWriting/.test(src.byPath("src/lib/progressSnapshot.ts")) ? ["progressSnapshot.ts references hanzi writing evidence"] : []), ...(shape.spreadsAll ? [] : ["SNAPSHOT_SHAPE_CHANGED"])], { hanziAccountFields: shape.fields.filter((f) => /hanzi/i.test(f.name)).map((f) => `${f.name}: ${f.type}`) }));
  const claim = src.byPath("src/lib/auth/evidenceClaim.ts");
  checks.push(check("H9", "The only cross-namespace move of hànzì evidence (anonymous to account, on device) merges counters by max and never reads points.", /mergeHanzi/.test(claim) && !/\bpoints\b|\bsamples\b/.test(claim) ? [] : ["evidenceClaim handles geometry or mergeHanzi missing"]));
  return { id: "HANZI_STROKE_PATH_NOT_PERSISTED", checks };
}

/* ---------------------------------------------------------------------- */
/* Artifact scans (informational)                                          */
/* ---------------------------------------------------------------------- */

function scanDist() {
  const dist = path.join(root, "dist");
  if (!fs.existsSync(dist)) return { scanned: false, reason: "dist/ not present" };
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|html|json|css|txt|webmanifest|map)$/.test(e.name)) files.push(p);
    }
  };
  walk(dist);
  let jev = [];
  for (const f of files) if (JEV.test(fs.readFileSync(f, "utf8"))) jev.push(path.relative(root, f));
  let version = null;
  try {
    version = JSON.parse(fs.readFileSync(path.join(dist, "version.json"), "utf8")).commitSha;
  } catch {}
  const chunks = files.filter((f) => /assets\/.*\.js$/.test(f));
  const recorderChunks = chunks.filter((f) => fs.readFileSync(f, "utf8").includes("MediaRecorder"));
  const recorderNetwork = recorderChunks.filter((f) => /\bfetch\s*\(|sendBeacon|XMLHttpRequest|new FormData|\.upload\(|\.storage\./.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(root, f));
  return { scanned: true, buildCommitSha: version, textFiles: files.length, jsChunks: chunks.length, jevHostOrKeyHits: jev, mediaRecorderChunks: recorderChunks.map((f) => path.basename(f)), mediaRecorderChunksWithNetworkApi: recorderNetwork };
}

async function scanLive() {
  const base = (process.env.LONGYU_PROD_URL || "https://singular-meringue-7838cd.netlify.app").replace(/\/+$/, "");
  try {
    const html = await (await fetch(`${base}/`)).text();
    const entry = /assets\/index-[^"']+\.js/.exec(html)?.[0];
    if (!entry) return { scanned: false, reason: "entry chunk not found" };
    const main = await (await fetch(`${base}/${entry}`)).text();
    const names = new Set([entry, ...(main.match(/assets\/[A-Za-z0-9_.-]+\.js/g) ?? [])]);
    const vendor = /assets\/react-vendor-[^"']+\.js/.exec(html)?.[0];
    if (vendor) names.add(vendor);
    let scanned = 0;
    const jev = [];
    const failed = [];
    for (const n of names) {
      const res = await fetch(`${base}/${n}`);
      const body = await res.text();
      if (!res.ok || /^<!doctype/i.test(body)) {
        failed.push(n);
        continue;
      }
      scanned += 1;
      if (JEV.test(body)) jev.push(n);
    }
    const ver = await (await fetch(`${base}/version.json`)).json();
    return { scanned: true, site: base, servedCommitSha: ver.commitSha, jsChunksScanned: scanned, chunksUnfetchable: failed.length, jevHostOrKeyHits: jev };
  } catch (err) {
    return { scanned: false, reason: String(err?.cause?.code ?? err?.message ?? err) };
  }
}

/* ---------------------------------------------------------------------- */

function build(overrides) {
  const src = sources(overrides);
  const extract = JSON.parse(fs.readFileSync(path.join(root, EXTRACT), "utf8"));
  return [jevProof(src), speechProof(src, extract), hanziProof(src)];
}

const summarize = (proofs) => Object.fromEntries(proofs.map((p) => [p.id, p.checks.every((c) => c.result === "PASS") ? "PASS" : "FAIL"]));

function validate() {
  const errors = [];
  if (!fs.existsSync(path.join(root, OUT))) return [`MISSING:${OUT}`];
  const committed = JSON.parse(fs.readFileSync(path.join(root, OUT), "utf8"));
  const fresh = build();
  const strip = (ps) => JSON.stringify(ps.map((p) => ({ id: p.id, checks: p.checks.map(({ id, result, violations }) => ({ id, result, violations })) })));
  if (strip(committed.proofs) !== strip(fresh)) errors.push("STALE: committed proofs differ from a fresh scan; run `npm run proofs:rc2-3-10b-static`");
  for (const [id, r] of Object.entries(summarize(fresh))) if (r !== "PASS") errors.push(`PROOF_FAILS:${id}`);
  const text = JSON.stringify(committed);
  if (/eyJ[A-Za-z0-9_-]{20,}\.|sk_(live|test)_[A-Za-z0-9]{8,}|nfp_[A-Za-z0-9]{10,}/.test(text)) errors.push("SECRET_IN_EVIDENCE");
  if (text.toLowerCase().includes(["at", "omurus"].join(""))) errors.push("LON001_SIBLING_PROJECT_NAMED");
  if (!committed.proofs.every((p) => p.checks.length >= 5)) errors.push("TOO_FEW_CHECKS");
  return errors;
}

function mutations() {
  const failures = [];
  const base = sources();
  const expectFail = (name, overrides, proofId, checkId) => {
    const proofs = build(overrides);
    const c = proofs.find((p) => p.id === proofId)?.checks.find((x) => x.id === checkId);
    if (!c || c.result !== "FAIL") failures.push(`MUTATION_SURVIVED:${name}`);
  };
  const withFile = (file, text) => ({ clientFiles: [...base.clientFiles.filter((f) => f.file !== file), { file, text }] });
  expectFail("jev host in client", withFile("src/lib/jevLearner.ts", "fetch('https://api.typesafe.ai/v1/systemone')"), "JEV_LEARNER_RUNTIME_FREEZE", "J1");
  expectFail("jev helper in learner edge", { edge: [...base.edge, { file: "supabase/functions/commit-placement/index.ts", text: "import { askJev } from '../_shared/jev.ts'; askJev();" }] }, "JEV_LEARNER_RUNTIME_FREEZE", "J3");
  expectFail("jev kill switch on", { byPath: { "supabase/functions/_shared/budgetPolicy.ts": "JEV_RUNTIME_ENABLED: true" } }, "JEV_LEARNER_RUNTIME_FREEZE", "J4");
  expectFail("jev csp allows host", { byPath: { "netlify.toml": 'connect-src \'self\' https://api.typesafe.ai' } }, "JEV_LEARNER_RUNTIME_FREEZE", "J5");
  expectFail("csp removed", { byPath: { "netlify.toml": "[build]" } }, "JEV_LEARNER_RUNTIME_FREEZE", "J5");
  const real = (p) => fs.readFileSync(path.join(root, p), "utf8");
  expectFail("speech fetch added", { byPath: { "src/features/lesson/SelfComparePractice.tsx": `${real("src/features/lesson/SelfComparePractice.tsx")}\nfetch('/x',{body:blob})` } }, "SPEECH_RAW_AUDIO_NOT_UPLOADED", "S1");
  expectFail("blob read back", withFile("src/lib/leak.ts", "new FileReader().readAsDataURL(blob)"), "SPEECH_RAW_AUDIO_NOT_UPLOADED", "S2");
  expectFail("storage upload", withFile("src/lib/leak2.ts", "client.storage.from('rec').upload('a', blob)"), "SPEECH_RAW_AUDIO_NOT_UPLOADED", "S4");
  expectFail("android okhttp", withFile("android/app/src/main/java/longyu/noba/com/Leak.java", "import okhttp3.OkHttpClient;"), "SPEECH_RAW_AUDIO_NOT_UPLOADED", "S5");
  expectFail("plugin returns path", { byPath: { "android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java": `${real("android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java")}\nret.put("path", f.getAbsolutePath());` } }, "SPEECH_RAW_AUDIO_NOT_UPLOADED", "S7");
  expectFail("speech evidence gains transcript", { byPath: { "src/lib/speechEvidence.ts": real("src/lib/speechEvidence.ts").replace('"conceptId",', '"conceptId",\n  "transcript",') } }, "SPEECH_RAW_AUDIO_NOT_UPLOADED", "S8");
  expectFail("account state gains a recording blob", { byPath: { "src/lib/store.ts": real("src/lib/store.ts").replace("interface AccountSnapshot extends XpBuckets {", "interface AccountSnapshot extends XpBuckets {\n  lastRecording: Blob | null;") } }, "SPEECH_RAW_AUDIO_NOT_UPLOADED", "S9");
  expectFail("account state gains a transcript field", { byPath: { "src/lib/store.ts": real("src/lib/store.ts").replace("interface AccountSnapshot extends XpBuckets {", "interface AccountSnapshot extends XpBuckets {\n  lastTranscript: string;") } }, "SPEECH_RAW_AUDIO_NOT_UPLOADED", "S9");
  expectFail("snapshot stops spreading account (shape changed, re-audit)", { byPath: { "src/lib/progressSnapshot.ts": real("src/lib/progressSnapshot.ts").replace("...progress } = account", "x } = account") } }, "SPEECH_RAW_AUDIO_NOT_UPLOADED", "S9");
  expectFail("hanzi persistence in ui", { clientFiles: [...base.clientFiles, { file: "src/features/hanzi/writing/Leak.tsx", text: "localStorage.setItem('k', JSON.stringify(points))" }] }, "HANZI_STROKE_PATH_NOT_PERSISTED", "H1");
  expectFail("hanzi network in ui", { clientFiles: [...base.clientFiles, { file: "src/features/hanzi/writing/Leak2.tsx", text: "fetch('/strokes',{body:JSON.stringify(points)})" }] }, "HANZI_STROKE_PATH_NOT_PERSISTED", "H2");
  expectFail("telemetry gains points", { byPath: { "src/lib/hanziWriting/types.ts": real("src/lib/hanziWriting/types.ts").replace("strokeCount: number;", "strokeCount: number;\n  points: Point2D[];") } }, "HANZI_STROKE_PATH_NOT_PERSISTED", "H3");
  expectFail("exercise persists samples", { byPath: { "src/features/hanzi/writing/HanziWritingExercise.tsx": real("src/features/hanzi/writing/HanziWritingExercise.tsx").replace("strokeCount: samples.length,", "strokeCount: samples.length,\n          points: samples,") } }, "HANZI_STROKE_PATH_NOT_PERSISTED", "H5");
  expectFail("ink consumer added", withFile("src/features/hanzi/writing/Consumer.tsx", "<HanziWritingCanvas onInkChange={(p) => save(p)} />"), "HANZI_STROKE_PATH_NOT_PERSISTED", "H6");
  expectFail("snapshot reads hanzi writing evidence", { byPath: { "src/lib/progressSnapshot.ts": `${real("src/lib/progressSnapshot.ts")}\nimport { loadFormEvidenceMap } from "./hanziWriting/evidence";` } }, "HANZI_STROKE_PATH_NOT_PERSISTED", "H8");
  expectFail("account state gains stroke ink", { byPath: { "src/lib/store.ts": real("src/lib/store.ts").replace("interface AccountSnapshot extends XpBuckets {", "interface AccountSnapshot extends XpBuckets {\n  lastInk: Point2D[];") } }, "HANZI_STROKE_PATH_NOT_PERSISTED", "H8");
  expectFail("builder progress gains a path", { byPath: { "src/data/hanziBuilder.ts": real("src/data/hanziBuilder.ts").replace("export interface HanziBuilderCharProgress {", "export interface HanziBuilderCharProgress {\n  path: string;") } }, "HANZI_STROKE_PATH_NOT_PERSISTED", "H8");
  {
    const proofs = build({ byPath: { "src/features/lesson/steps.tsx": real("src/features/lesson/steps.tsx").replace("onMistake?.(draft);", "") } });
    if (proofs.find((p) => p.id === "SPEECH_RAW_AUDIO_NOT_UPLOADED")?.findings?.[0]?.status !== "FLOW_CHANGED_RE_AUDIT") failures.push("MUTATION_SURVIVED:free-text flow change not flagged");
  }
  return failures;
}

if (mode === "generate") {
  const proofs = build();
  const flags = process.argv.slice(3);
  const out = {
    schema: "longyu-static-proofs/1",
    wave: "RC2.3.10B",
    generatedFromSha: git("rev-parse", "HEAD").stdout.trim(),
    safety: { productionWrites: false, rowData: false, secretValues: false },
    method: "Offline scan of tracked and untracked-unignored files (git ls-files -co --exclude-standard). Each check is a rule over file text; violations are file:line. validate recomputes and requires an identical result.",
    summary: summarize(proofs),
    proofs,
    artifactScans: {
      localBuild: flags.includes("--dist") ? scanDist() : { scanned: false, reason: "run with --dist after a build" },
      liveProduction: flags.includes("--live") ? await scanLive() : { scanned: false, reason: "run with --live (network)" },
    },
    limits: [
      "Static text rules: they prove what the code in this repository can do, not what an installed APK or a vendor speech engine does at runtime.",
      "The APK itself was not unpacked here (no APK in this environment); the web build output that Capacitor copies into the APK (dist/) was scanned when --dist was used.",
      "Vendor speech recognition (browser SpeechRecognition, Android SpeechRecognizer service) may process audio off-device; see SPEECH_RAW_AUDIO_NOT_UPLOADED.platformCaveat.",
    ],
  };
  fs.writeFileSync(path.join(root, OUT), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`[rc2-3-10b-static-proofs] wrote ${OUT}: ${JSON.stringify(out.summary)}`);
  for (const p of proofs) for (const c of p.checks) if (c.result !== "PASS") console.log(`  FAIL ${c.id}: ${c.violations.slice(0, 4).join(", ")}`);
  process.exit(Object.values(out.summary).every((v) => v === "PASS") ? 0 : 1);
} else if (mode === "validate") {
  const errors = validate();
  if (errors.length) {
    console.error(`[rc2-3-10b-static-proofs] FAIL\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
  console.log("[rc2-3-10b-static-proofs] validate OK");
} else if (mode === "test") {
  const failures = mutations();
  if (failures.length) {
    console.error(`[rc2-3-10b-static-proofs] FAIL\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log("[rc2-3-10b-static-proofs] test OK: every mutation is caught");
} else {
  console.error("usage: rc2-3-10b-static-proofs.mjs generate [--dist] [--live] | validate | test");
  process.exit(2);
}
