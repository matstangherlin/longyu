# V4.8.8 — first 20 sessions friction audit

Scope: the first five teaching topics, M1–M4, using the computed session plans in
`first-20-sessions-human-review.md`. This is a focused friction review, not a
curriculum rewrite and not physical-device certification.

## Method

- inspected every step in the existing first-20 human-review pack;
- checked instruction duplication, hidden second skills, disabled actions and
  source-language leaks;
- exercised the shared LessonPlayer geometry at 360×800, 390×844, 412×915 and
  1280×720;
- audited the listening engines programmatically across the entire 113-topic
  Journey, so shared-engine regressions affecting these sessions fail closed.

## Result

| Session | Topic / pass | Initial finding | Remediation | Final |
| ---: | --- | --- | --- | --- |
| 1 | O que é mandarim? · M1 | none | — | OK |
| 2 | O que é mandarim? · M2 | none | — | OK |
| 3 | O que é mandarim? · M3 | none | — | OK |
| 4 | O que é mandarim? · M4 | none | — | OK |
| 5 | O que é pinyin? · M1 | none | — | OK |
| 6 | O que é pinyin? · M2 | none | — | OK |
| 7 | O que é pinyin? · M3 | none | — | OK |
| 8 | O que é pinyin? · M4 | none | — | OK |
| 9 | O que é tom? · M1 | shared phonetic UI exposed too much task taxonomy | direct listening copy; two auditory choices; replay | OK |
| 10 | O que é tom? · M2 | shared phonetic feedback could compete with bottom action | measured action reserve and semantic feedback region | OK |
| 11 | O que é tom? · M3 | source-language explanation needed locale adaptation | instruction-locale overlay remains authoritative | OK |
| 12 | O que é tom? · M4 | shared phonetic UI needed an explicit replay label | localized “listen again” action | OK |
| 13 | O que é hànzì? · M1 | none | — | OK |
| 14 | O que é hànzì? · M2 | mobile bank can grow beyond one row | dynamic bottom-action reserve | OK |
| 15 | O que é hànzì? · M3 | keyboard-height risk in shared player | internal scroller + reduced-viewport sentinel | OK |
| 16 | O que é hànzì? · M4 | none | — | OK |
| 17 | Montando primeiros hànzì · M1 | dense piece bank could be hidden by CTA | HanziBuilder publishes the same measured action region | OK |
| 18 | Montando primeiros hànzì · M2 | dense piece bank could be hidden by CTA | final piece must scroll above the action | OK |
| 19 | Montando primeiros hànzì · M3 | dense piece bank under simulated keyboard | 360×420 reduced viewport regression | OK |
| 20 | Montando primeiros hànzì · M4 | none | — | OK |

## Classification summary

| Classification | Found | Remaining |
| --- | ---: | ---: |
| BLOCKER | 0 | 0 |
| HIGH_FRICTION | 8 shared-engine exposures | 0 automated |
| OK | 12 initially / 20 finally | 20 |

`PHYSICAL_DEVICE_PASS` remains **NOT_PROMOTED**. Automated viewport evidence
does not replace Android Chrome or iPhone Safari validation on hardware.
