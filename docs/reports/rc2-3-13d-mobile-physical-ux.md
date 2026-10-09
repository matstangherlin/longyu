# RC2.3.13D — Mobile Accessibility & Physical UX Hardening

## Status

Scaffold on parent **#333** `e8f4090`. Broad physical hardening waits until #333 Chromium E2E + cross-engine are SUCCESS.

## RC4 truth

| Item | Value |
| --- | --- |
| Designated identity | `RC2.3.12-RC4` / `0.2.0-rc.4` (13C cert) |
| Canonical artifacts | **NOT_BUILT** — see `docs/release/rc2-3-12-rc4-identity.json` |
| Live candidate | still `RC2.3.12-RC2` / `0.2.0-rc.2` / vc 596 |

Do not invent APK/AAB/checksums. Device QA builds are labeled **DEVICE-QA — NOT FINAL BETA**.

## Vocabulary

`CODE_PASS` · `EMULATED_PASS` · `PHYSICAL_PASS` — never promote code → physical.

## Delivered (scaffold)

- Device matrix + Back/IME contracts — `docs/ux/mobile-device-matrix.md`
- Device QA JSON — `docs/release/rc2-3-13d-device-qa.json`
- UX cert (physical rows NOT_RUN) — `docs/release/rc2-3-13d-ux-certification.json`
- Gate `gate:rc2-3-13d-mobile-physical-ux` (20 kills)
- Emulated E2E 360/375/390 + keyboard-like height

## Next (after #333 hosted green)

1. QA APK from exact 13D SHA  
2. Physical matrix (audio×20, Guided Try×10, Speech×5, conversations×5, Hànzì)  
3. Fix P0/P1 only — no pedagogy/Mastery/JEV/billing  
4. Mark PHYSICAL_PASS only with device evidence  

## Freeze

Curriculum · Mastery math · SRS · JEV OFF · billing · sibling projects unchanged.
