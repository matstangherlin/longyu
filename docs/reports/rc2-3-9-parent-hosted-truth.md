# RC2.3.9 — Parent hosted truth (Prompt 0)

| Item | Value |
|---|---|
| Parent PR | matstangherlin/longyu#319 — RC2.3.8 Account Access, Social Identity & Progress Claim |
| HEAD named in the RC2.3.9 brief | `3c3aa812…` — **stale**, not used |
| Parent real HEAD (exact parent SHA) | `dbb6f11c…` (#319 head after the inherited-E2E fixes below) |
| #319 base | #318 `cursor/rc2-3-7-sensory-guidance-polish` @ `838ff7f` |
| RC2.3.9 branch | `cursor/rc2-3-9-stack-convergence` (fast-forward from `dbb6f11`) |

## Hosted checks on #319 (8a1b763 → dbb6f11)

| Check | 8a1b763 | dbb6f11 (at branch time) |
|---|---|---|
| Portão de qualidade (validate:beta + build) | success | in progress |
| RC2.3 stack gates | success | success |
| Android foundation / runtime | success / success | in progress |
| Secret scan (gitleaks), CodeQL, npm audit | success | success |
| Ephemeral DB / Edge rehearsal (backend-rehearsal) | success | success |
| Testes E2E (Playwright) | **failure — 4** | re-running |
| E2E cross-engine (WebKit + Firefox) | **failure** | re-running |

## The inherited E2E family — real causes, fixed at the origin (not skipped)

| Failure | Real cause | Fixed in | How |
|---|---|---|---|
| 29 specs (pedagogy, v490, v491, beta-smoke, …) | RC2.3.0 Pedagogy V6 inserted Discovery steps; specs assumed the old first step. Two real teach-before-test bugs in V6 planning | #315 `8a06040` | product fix (perceptualRepetition, applyVisualFirst) + navigation helpers; no assertion weakened |
| `culture-hub.spec.ts:236` (chromium + firefox) | RC2.2.18 gates the Culture Hub on reaching the 你好 node (after l2); V6 Discovery made l2 longer than the spec's 8-step walk, so the learner was still mid-l2 and the Hub correctly showed "Ainda não" | #315 `e1b3b7a` | Hub assertion runs with its own honest precondition (`CULTURE_DISCOVERED_LESSONS`); merged up #316→#319 |
| `rc2-3-5-speech-contrast` ×3 (chromium) | RC2.3.8 moved evidence to `<key>::<namespace>`; the spec read the unscoped speech key | #319 `dbb6f11` | read `::local` |
| `rc2-3-6-personal-mastery` privacy check | same move made it read an empty key → **vacuous pass** | #319 `dbb6f11` | reads every namespace and requires the record to exist |

Remaining E2E noise on 8a1b763 was `conversation-scene-advance` **flaky** (passed on retry; 120 s load timeouts), not failures.
