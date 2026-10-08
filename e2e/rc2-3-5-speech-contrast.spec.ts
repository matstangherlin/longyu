/**
 * RC2.3.5 — Speech & Contrast (WEB evidence only).
 *
 * Chromium (engine fake device) and Firefox/WebKit (synthetic in-page microphone) prove the web flow: contrast drill gated by
 * canonical voice, then OUÇA → GRAVE → OUÇA VOCÊ → CONTINUE with no dead end,
 * and a local speech-evidence record that carries no audio or transcript.
 * WEB_PASS ≠ ANDROID / OWNER_AUDIO_ACCEPTANCE.
 */
import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

const STORE_VERSION = 21;
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
];

// Chromium: fake capture device of the engine itself feeding the app's real
// MediaRecorder. Firefox/WebKit reject the Chromium flags and the "microphone"
// permission, so they get a deterministic capture double
// (installSyntheticMicrophone): Chromium proves the capture pipeline, the other
// engines prove the same UI flow and evidence contract.
test.use({
  permissions: async ({ browserName }, use) => use(browserName === "chromium" ? ["microphone"] : []),
  launchOptions: [
    async ({ browserName }, use) =>
      use(
        browserName === "chromium"
          ? {
              args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
              ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
            }
          : {}
      ),
    { scope: "worker" },
  ],
});

/**
 * Firefox/WebKit capture double.
 *
 * getUserMedia returns a real MediaStream (oscillator → MediaStreamDestination)
 * without awaiting AudioContext.resume(): under the engine's autoplay policy that
 * promise can stay pending, leaving the app on "Preparando…" forever. Hosted CI
 * showed exactly that on both engines (no "Gravando…" in 15 s) while the same
 * flow passes in Chromium. MediaRecorder is replaced by a double that yields a
 * short valid WAV on stop, so the result never depends on the engine's encoder
 * for a synthetic stream.
 */
async function installSyntheticMicrophone(page: Page) {
  await page.addInitScript(() => {
    const devices = navigator.mediaDevices;
    if (!devices) return;
    devices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      if (!constraints?.audio) throw new DOMException("Only audio is faked", "NotSupportedError");
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const out = ctx.createMediaStreamDestination();
      osc.connect(out);
      osc.start();
      void ctx.resume().catch(() => undefined);
      return out.stream;
    };

    /** 0.5 s mono 16-bit 220 Hz WAV. */
    const wavBlob = () => {
      const rate = 8000;
      const samples = rate / 2;
      const view = new DataView(new ArrayBuffer(44 + samples * 2));
      const text = (offset: number, value: string) => {
        for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
      };
      text(0, "RIFF");
      view.setUint32(4, 36 + samples * 2, true);
      text(8, "WAVE");
      text(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, rate, true);
      view.setUint32(28, rate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      text(36, "data");
      view.setUint32(40, samples * 2, true);
      for (let i = 0; i < samples; i += 1) view.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 8000), true);
      return new Blob([view], { type: "audio/wav" });
    };

    class SyntheticMediaRecorder {
      static isTypeSupported() {
        return true;
      }
      state: RecordingState = "inactive";
      readonly mimeType = "audio/wav";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor(readonly stream: MediaStream) {}
      start() {
        this.state = "recording";
      }
      stop() {
        if (this.state === "inactive") return;
        this.state = "inactive";
        setTimeout(() => {
          this.ondataavailable?.({ data: wavBlob() });
          this.onstop?.();
        }, 0);
      }
    }
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = SyntheticMediaRecorder;
  });
}

async function seed(page: Page, browserName: string) {
  if (browserName !== "chromium") await installSyntheticMicrophone(page);
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const payload = JSON.stringify({
    state: {
      accountSetupComplete: true,
      courseDirection: "pt-zh",
      holdAchievementModals: true,
      guidance: { version: 2, enabled: false, initialized: true, records: {} },
      completedLessons: THROUGH_L2,
    },
    version: STORE_VERSION,
  });
  await page.addInitScript((value: string) => {
    if (sessionStorage.getItem("rc235-seeded")) return;
    sessionStorage.setItem("rc235-seeded", "1");
    localStorage.setItem("longyu-v1", value);
  }, payload);
}

async function openContrast(page: Page, id: string) {
  await page.goto("/pinyin");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await page.getByRole("button", { name: "Iniciais", exact: true }).first().click();
  const section = page.getByTestId("pronunciation-core-br");
  await section.scrollIntoViewIfNeeded();
  await section.locator(`[data-contrast-open="${id}"]`).click();
  return page.getByTestId("contrast-drill");
}

/** Walk see → hear → compare → identify until the produce stage. */
async function walkToProduce(page: Page) {
  const drill = page.getByTestId("contrast-drill");
  await page.getByTestId("contrast-next").click();
  for (let guard = 0; guard < 8; guard += 1) {
    const stage = await drill.getAttribute("data-stage");
    if (stage === "identify" || stage === "produce") break;
    await page.getByTestId("contrast-play").click();
    await expect(page.getByTestId("contrast-next")).toBeEnabled({ timeout: 15_000 });
    await page.getByTestId("contrast-next").click();
  }
  for (let round = 0; round < 3; round += 1) {
    await page.getByTestId("contrast-play").click();
    const option = drill.locator("[data-contrast-option]").first();
    await expect(option).toBeEnabled({ timeout: 15_000 });
    await option.click();
    await page.getByTestId("contrast-next").click();
  }
  await expect(drill).toHaveAttribute("data-stage", "produce");
}

for (const viewport of VIEWPORTS) {
  test.describe(`RC2.3.5 speech @ ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test("contrast → record → hear myself → continue; evidence has no audio", async ({ page, browserName }) => {
      await seed(page, browserName);
      const drill = await openContrast(page, "j-q-x");
      await expect(drill).toHaveAttribute("data-audio-ready", "true");
      await walkToProduce(page);

      const self = page.getByTestId("self-compare");
      await expect(self).toBeVisible();
      await expect(page.getByTestId("self-compare-privacy")).toBeVisible();
      await page.getByTestId("self-compare-record").click();
      // "Gravando…" only once capture really started.
      await expect(page.getByTestId("self-compare-recording-label")).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(900);
      await page.getByTestId("self-compare-stop").click();
      await expect(page.getByTestId("self-compare-recorded")).toBeVisible({ timeout: 15_000 });

      // Re-record is immediate and cheap.
      await expect(page.getByRole("button", { name: /Gravar novamente|Record again/i })).toBeVisible();

      await page.getByTestId("self-compare-play-mine").click();
      await page.getByTestId("self-compare-continue").click();

      // RC2.3.8: evidence lives in the account namespace (`<key>::local` for an anonymous learner).
      const events = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu:speech-evidence-v1::local") ?? "{}").events ?? []);
      const perception = events.find((e: { mode: string }) => e.mode === "PERCEPTION");
      const compare = events.find((e: { mode: string }) => e.mode === "SELF_COMPARE");
      expect(perception?.conceptId).toBe("contrast:j-q-x");
      expect(compare?.recordingCaptured).toBe(true);
      expect(compare?.completed).toBe(true);
      for (const e of events) {
        expect(Object.keys(e).some((k) => /transcript|audio(Url|Blob)|score|tone/i.test(k))).toBe(false);
      }

      // No horizontal overflow on the speech screen.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test("cannot speak is always an exit", async ({ page, browserName }) => {
      await seed(page, browserName);
      await openContrast(page, "g-k");
      await walkToProduce(page);
      await page.getByRole("button", { name: /Não posso falar agora|I can.t speak now/i }).first().click();
      await expect(page.getByTestId("contrast-drill")).toHaveCount(0);
    });
  });
}
