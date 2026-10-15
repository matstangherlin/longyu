# Living UI Motion System — RC2.3.13R.3.2.4

One motion language for the whole app: a handful of duration tokens, four
easing curves, one reduced-motion signal and a hard budget for looping
("ambient") animation. Motion **confirms** what the learner just did; it never
carries meaning alone, never blocks input, never replays old news and never
touches lessons, mastery, SRS, XP, Fôlego, unlocks, audio or navigation.

> **State first, motion second.** Every state change is already readable from
> text, icon, color and position. Motion only makes the change feel physical.

Sources of truth:

| What | Where |
| --- | --- |
| Duration tokens (CSS) | `src/index.css` — `:root { --motion-instant/fast/normal/emphasis }` and the Living UI block (`--motion-ambient*`, `--motion-celebrate`) |
| Duration tokens (TS mirror) | `src/lib/motion/livingUiMotion.ts` — `MOTION_MS`, `AMBIENT_MS` |
| Reduced motion | `prefersReducedMotion()` / `subscribeReducedMotion()` in `livingUiMotion.ts`, plus the Living UI `@media (prefers-reduced-motion: reduce)` block |
| Ambient budget | `src/lib/motion/ambientBudget.ts` — `useAmbientMotion(ref, kind)` |
| Delta-only motion | `src/lib/motion/valueDelta.ts`, `components/motion/AnimatedCounter.tsx`, `components/motion/ProgressFill.tsx` |
| Celebration | `components/motion/CompletionBurst.tsx` (Victory only) |

---

## Philosophy

1. **Calm, not busy.** Most of the screen is still. A few things breathe
   slowly; nothing flashes, bounces or spins.
2. **Responsive.** A press answers in 80–140 ms. Input is never queued behind
   an animation, and a rapid second tap always wins.
3. **Earned.** Celebration happens once, on a real completion, under 1.2 s.
   No casino: no coin rain, no looping confetti, no sound.
4. **Delta-only.** Progress bars and counters animate only when the value
   really changed since the learner last saw it. A remount, a tab switch or a
   reload shows the true value immediately.
5. **Chinese, quietly.** Motion borrows from embroidery — a thread drawing
   itself once, a seal pressed, plum petals drifting — never a dragon chase.

## Motion

### Tokens

| Token | Value | Band (spec) | Used for |
| --- | --- | --- | --- |
| `--motion-instant` | 80 ms | INSTANT 80–120 | press, release, button `:active` |
| `--motion-fast` | 140 ms | FAST 130–170 | colour/transform responses, select press, builder snap |
| `--motion-normal` | 220 ms | NORMAL 190–240 | segment slide, topic transitions, modal/sheet, Home entrance |
| `--motion-emphasis` | 280 ms | EMPHASIS 260–360 | correct pop, counter pop, stitch draw, Hànzì stage label, progress fill |
| `--motion-ambient-current` | 5 s | AMBIENT 5–10 s | current-node halo |
| `--motion-ambient` | 7 s | AMBIENT 5–10 s | ornament / mascot / chest loops |
| `--motion-ambient-slow` | 10 s | AMBIENT 5–10 s | Journey scene drift |
| `--motion-celebrate` | 1100 ms | < 1.2 s | upper bound of the whole Victory burst |

Easing: `--ease-standard` (state changes), `--ease-enter` (things arriving),
`--ease-exit` (things leaving), `--ease-spring-soft`
(`cubic-bezier(0.34, 1.12, 0.64, 1)` — a single soft settle, used for the
correct check and builder snap) and `--ease-ambient`
(`cubic-bezier(0.37, 0, 0.63, 1)` — symmetrical breathing for loops).

Components never invent a duration: CSS uses `var(--motion-*)`, TypeScript
uses `MOTION_MS`. `validate:living-ui-motion` rejects literal durations in the
Living UI block and any token outside its band.

### Interaction map

| Surface | Motion | Notes |
| --- | --- | --- |
| Buttons (`[data-button-variant]`) | press scale via the canonical primitive, release in `--motion-instant` | `:disabled` never fakes a press |
| Topic cards (`.living-card`) | press `scale(0.985)`; hover lift 1px on a fine pointer only | layout box never changes |
| Journey ↔ Culture segment | thumb slides at `--motion-normal`, no overshoot | rapid toggles never queue (≤ 1 thumb animation alive) |
| Culture root ↔ topic | 12 px directional entrance (`data-topic-enter="forward" / "back"`) | once per tap, never on reload |
| Modal / sheet (`ModalOverlay`) | backdrop fade; sheet slides 16 px (mobile) / modal fades + `scale(0.98)` (≥ 640 px) | taps work during the entrance |
| Lesson steps | `longyu-step-in` from opacity 0.4 (never a blank frame) | |
| Answer selection | 1–2 px press on the chosen option | no verdict before the result exists |
| Correct | check pops once inside the existing success bloom | |
| Incorrect | `longyu-error-shake` capped at 3 px | restrained, never punishing |
| Audio playing | soft ring while `SpeakButton`'s own `playing` state is on | read-only: playback never waits on it |
| Speech recording | breathing dot + three level bars while recording | label carries the meaning |
| Hànzì | stage label enters once per stage; builder piece snaps | the writing canvas never animates |
| Progress bars | `ProgressFill` slides `translateX` only on a real change | first paint = true value |
| TopBar counters | `AnimatedCounter` pops once (scale 1 → 1.08 → 1) on a real increase | no pop on mount |
| Current Journey node | halo breathes (scale ≤ 1.025, opacity 0.35–0.55, 5 s) | the node itself never scales |
| Victory | `CompletionBurst`: ring + seal + 6 plum petals, ≤ 1100 ms, once | no infinite animation |
| Home | the continue card enters once (`living-enter-up`) | the rest of Home is still |

### Ambient budget

Looping animation is the expensive, distracting kind, so it is rationed:

```ts
export const MAX_VISIBLE_AMBIENT_ANIMATIONS = 4; // src/lib/motion/livingUiMotion.ts
```

- Every loop registers with `useAmbientMotion(ref, kind)`; the element gets
  `data-ambient="rest"` and only animates while the manager writes
  `data-ambient="run"`. CSS holds every other loop still:
  `[data-ambient]:not([data-ambient="run"]) { animation-play-state: paused !important; }`.
- Slots go to **visible** candidates by priority (`currentNode`, `recording`
  → `chest`, `mascot` → `scene` → `ornament`), then by registration order.
- One shared `IntersectionObserver` (48 px margin) decides visibility. No
  scroll listener, no React state: the manager writes attributes in a
  `requestAnimationFrame` batch.
- `document.visibilityState === "hidden"` or reduced motion → every loop rests.
- Status loops tied to real state (audio playing, recording) are not ambient
  decoration; they exist only while that state is on.

## Accessibility

- **Reduced motion is mandatory.** The Living UI block ends with its own
  `@media (prefers-reduced-motion: reduce)` list: loops, entrances, pops and
  the burst switch to `animation: none`; modals keep only a fade; press
  transforms are removed. `CompletionBurst` is not played at all; counters
  fade instead of popping. State stays fully visible.
- Motion never carries meaning alone: correct/incorrect keep text, icon and
  colour; the recording state keeps its label; the current node keeps its
  ring and position.
- Decorative layers are `aria-hidden`, `pointer-events: none`, never
  focusable and never in the tab order.
- No new sounds and no new haptics: haptics stay on the existing canonical
  path only.

## Performance

- `transform` and `opacity` only. No width/height/top/left/margin animation,
  no `filter`/`blur`/`backdrop-filter`, no `box-shadow` keyframes, no path
  morphing.
- No motion library (no framer-motion, GSAP, react-spring): CSS + WAAPI with a
  `typeof el.animate !== "function"` fallback.
- No scroll-driven state, no parallax via `setState`; unsupported APIs
  (`IntersectionObserver`, `matchMedia.addEventListener`) have fallbacks.
- Decoration reserves its box before paint: zero layout shift (CLS 0).
- A 30-minute emulated session (`docs/release/evidence/rc2-3-13r3-2-4/living-ui-30min-session.json`)
  records the running ambient count and heap growth; physical battery/heat
  judgement stays with the owner on device (`/qa/device`).

## Do / don't

| Do | Don't |
| --- | --- |
| Use `var(--motion-*)` / `MOTION_MS` | Write `transition: 300ms` or `setTimeout(…, 450)` for UI motion |
| Register loops with `useAmbientMotion` | Add `animate-pulse` / `infinite` outside the budget |
| Animate only real deltas | Replay progress from zero on mount or tab switch |
| Keep celebration one-shot and < 1.2 s | Loop confetti, coins or sparkles |
| Let the next tap interrupt motion | Disable input until an animation ends |
| Keep business events where they were | Fire analytics, XP or audio from an animation callback |
| Check reduced motion in the Living UI block | Hide state behind motion |
