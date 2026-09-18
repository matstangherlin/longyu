/**
 * Structural invariants for RC2.2.2A mobile/PWA preflight.
 * Behavioral coverage lives in Playwright; this gate refuses missing contracts.
 */
import fs from "node:fs";
import path from "node:path";

export function read(root, rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function assertMobileBetaReadiness(root = process.cwd()) {
  const failures = [];
  const push = (ok, msg) => {
    if (!ok) failures.push(msg);
  };

  const sticky = read(root, "src/features/lesson/steps.tsx");
  push(
    /safe-area-inset-bottom/.test(sticky) && /data-lesson-sticky-actions|StickyActionBar/.test(sticky),
    "sticky CTA must remain safe-area aware"
  );
  push(
    /function StepDialogueChoice[\s\S]{0,4500}optionChoiceDomProps/.test(sticky),
    "dialogue_choice options must publish data-option-index (keyboard + touch contract)"
  );

  const freeAnswer = read(root, "src/features/lesson/FreeAnswerField.tsx");
  push(/isRecognitionAvailable/.test(freeAnswer), "speech availability gate required");
  push(/speechSupported/.test(freeAnswer), "mic CTA must depend on speechSupported");
  push(/scrollIntoView/.test(freeAnswer), "focused free-answer field must scroll into view");

  const speech = read(root, "src/lib/speech.ts");
  push(/not-allowed|denied/.test(speech), "mic deny path must map to user-facing error");

  const audioPolicy = read(root, "src/features/lesson/feedbackAudioPolicy.ts");
  push(/replay|Replay|always/.test(audioPolicy), "autoplay must not be required — replay affordance");

  const guide = read(root, "src/components/guide/GuideDialogue.tsx");
  push(/prefersReducedMotion|reduced|GUIDE_ENTRANCE|data-guide-motion/.test(guide), "GuideDialogue motion contract");
  push(/compact|size === \"compact\"|size=\{/.test(guide), "GuideDialogue compact mobile size");

  const viewport = read(root, "src/hooks/useVisualViewportFrame.ts");
  push(/visualViewport/.test(viewport), "VisualViewport frame hook required for keyboard-safe layout");

  const stale = read(root, "src/lib/staleBundle.ts");
  push(/reloadOnceForStaleBundle/.test(stale), "stale chunk recovery must reload at most once");
  push(/STALE_BUNDLE_RELOAD_KEY/.test(stale), "stale reload must be single-shot keyed");
  push(/isAutomatedBrowser|webdriver/.test(stale), "stale reload must not loop under Playwright");

  const routes = read(root, "src/routes.tsx");
  push(/importWithStaleBundleRetry/.test(routes), "lazy routes must use stale-bundle retry");

  const errorBoundary = read(root, "src/components/system/ErrorBoundary.tsx");
  push(/isStaleBundleError/.test(errorBoundary), "ErrorBoundary must recover stale chunks");
  push(/Algo saiu|genericTitle|errors\.genericTitle/.test(errorBoundary), "blank-screen recovery UI required");

  const pwaBanner = read(root, "src/components/system/PwaUpdateBanner.tsx");
  push(/onNeedRefresh|registerSW/.test(pwaBanner), "PWA update must be user-controlled, not reload loop");
  push(/setNeedRefresh\(true\)/.test(pwaBanner), "onNeedRefresh must set banner state, not auto-reload");
  push(/updateSWRef\.current\?\.\(true\)/.test(pwaBanner), "single controlled reload on update click");
  push(!/onNeedRefresh\(\)\s*\{[^}]*location\.reload/.test(pwaBanner), "onNeedRefresh must not call location.reload");

  const vite = read(root, "vite.config.ts");
  push(/registerType:\s*[\"']autoUpdate[\"']/.test(vite), "PWA registerType autoUpdate");
  push(/skipWaiting:\s*true/.test(vite), "workbox skipWaiting");
  push(/clientsClaim:\s*true/.test(vite), "workbox clientsClaim");
  push(/cleanupOutdatedCaches:\s*true/.test(vite), "cleanup outdated caches");

  const netlify = read(root, "netlify.toml");
  push(/\/sw\.js[\s\S]*no-cache|Cache-Control.*no-cache[\s\S]*sw\.js/.test(netlify) || /sw\.js[\s\S]{0,200}no-cache/.test(netlify), "sw.js Cache-Control no-cache");
  push(/manifest\.webmanifest[\s\S]{0,200}no-cache|webmanifest[\s\S]{0,120}no-cache/.test(netlify), "manifest Cache-Control no-cache");

  const matrix = read(root, "docs/release/device-test-matrix.md");
  push(/EMULATED|WEBKIT|CHROMIUM/.test(matrix), "matrix must label emulation honestly");
  push(/android_real_device/.test(matrix), "matrix must not replace formal android check");

  const preflight = JSON.parse(read(root, "docs/release/device-preflight.json"));
  push(preflight.kind === "PRE_CERTIFICATION", "device-preflight must be PRE_CERTIFICATION");
  for (const key of ["android", "ios", "pwa", "rollback"]) {
    push(preflight[key]?.formalPass === false, `${key}.formalPass must stay false`);
  }

  const ops = JSON.parse(read(root, "docs/release/rc1-operational-checks.json"));
  for (const id of ["android_real_device", "ios_real_device", "pwa_upgrade", "rollback_drill"]) {
    push(ops.checks?.[id]?.pass === false, `formal ${id} must remain false during preflight`);
  }

  const locales = read(root, "src/locales/pt-BR.ts") + read(root, "src/locales/en.ts");
  push(!/funciona sem (internet|conexão)|works offline|download lessons/i.test(locales) || /sync when|sincronizado quando|saved on this device|salvo neste dispositivo/i.test(locales), "offline copy must stay honest (local continue ≠ full offline product)");

  return { ok: failures.length === 0, failures };
}
