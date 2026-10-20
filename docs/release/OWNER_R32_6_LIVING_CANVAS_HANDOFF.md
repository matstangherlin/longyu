# Owner handoff — RC2.3.13R.3.2.6 Chinese Living Canvas

Wave: RC2.3.13R.3.2.6 · branch `claude/journey-svg-storytelling-7amwba`
Parent: #356 (RC2.3.13R.3.2.5), merged as `98967c393de3bcf6b13611bac5ca01015fbfbee3`.
learnerRuntimeSha and fingerprint: see `docs/release/rc2-3-13r3-2-6-certification.json`.

## USE THIS APK

**NOT_BUILT yet.** ONE Device-QA APK is minted only after exact-head hosted green
(Chromium, Firefox, WebKit, Android foundation + runtime). Its SHA256 and
provenance (workflow run, artifact id) will be written here and in the
certification.

## DO NOT USE

These APKs predate the current runtime (stale for R.3.2.3 through R.3.2.6):

- `fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af`
- `fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8`

## What to judge on the phone

Open `/qa/device` › **Living Canvas Lab** and **Border Lab** for side-by-side
previews (local only, change nothing).

1. Journey: the side scenes are alive but calm. Lanterns sway a little, steam
   rises, the train glides and rests, clouds drift. The drawing itself never
   bobs. At most two scenes move at once.
2. Scroll a scene off screen and back: it is never frozen tilted or faded.
3. Scenes enter once, from their own side (left from the left, right from the
   right), then stay still.
4. Culture: the side ornaments move their own motif (lantern, cloud, blossom);
   seal, knot and moon gate stay still. Each topic opens with its own living
   scene in the header, inside a gilt double-line frame.
5. Frames: the current Journey module, the Culture topic header and Review
   start/summary have a double line with key-fret corners. Victory and the
   chest reward have ruyi-cloud corners. Ordinary cards have none. Frames never
   block a tap.
6. First Culture visit: one short orientation, then the topics. No second
   bubble fights for attention. The guide types only when you can see it.
7. Icons: the More menu lock and Culture collections use line icons, not emoji.
8. Reduced motion (Android "Remove animations"): every scene and ornament is
   still, the art stays.
9. Thirty minutes of normal use: no heat, no stutter.

Physical status stays NOT_RUN until you run it. `LONGYU_UI_UX_FREEZE` becomes
`OWNER_ACCEPTED_R326` only after you accept this APK on a device. Public Beta
and Play remain HOLD.
