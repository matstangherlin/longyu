# RC2.3.8 — Parent hosted truth (Prompt 0)

| Item | Value |
|---|---|
| Parent PR | matstangherlin/longyu#318 — RC2.3.7 Sensory, Guidance & Completion Polish |
| Parent branch | `cursor/rc2-3-7-sensory-guidance-polish` |
| Parent real HEAD | `5df0d1f72ce0356ee2076423e2d0e303ad88bb13` |
| RC2.3.8 branch | `cursor/rc2-3-8-account-access-identity` (stacked on 5df0d1f) |

## Hosted checks on 5df0d1f (last read)

| Check | Status |
|---|---|
| Android runtime | SUCCESS |
| Android native foundation | SUCCESS |
| RC2.3 stack gates | SUCCESS |
| CodeQL | SUCCESS |
| gitleaks | SUCCESS |
| npm audit | SUCCESS |
| quality gate (validate:beta + E2E) | IN_PROGRESS at last read |

## `/treino/tons` vs `/tons` TODO from #318

**RESOLVED causally in 5df0d1f.** The obsolete guidance surfaces were removed and SG3 now
requires every guidance surface to resolve to a real route (`gate:rc2-3-7-sensory-guidance`,
22/22 mutations killed). The `/tons` route is the canonical one; `/treino/tons` is no longer
referenced by any guidance surface.

## Inherited E2E family (not this wave)

The pedagogy / compare-with-image E2E failures reported on #316 come from RC2.3.0–2.3.2
(Discovery step "Um cumprimento real" + lesson plan order) and are tracked at #315. They are
not caused by RC2.3.7 or RC2.3.8.
