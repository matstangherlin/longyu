# RC2.3.7 — Sensory, Guidance & Completion Polish — Closure

Parent: [matstangherlin/longyu#317](https://github.com/matstangherlin/longyu/pull/317) @ `7c1e339` (merged into this branch) · Branch `cursor/rc2-3-7-sensory-guidance-polish` · 2026-10-07

No new big systems: one pure sensory policy, two guidance entries in the existing orchestrator, copy fixes, completion wiring, one QA panel, one gate.

| Status | Result | Evidence |
|---|---|---|
| PARENT_HOSTED_TRUTH | **CODE_READY** | #317 quality gate red → causal fix `7c1e339` (SmartBack `/dominio`); re-run pending — [`rc2-3-7-parent-hosted-truth.md`](rc2-3-7-parent-hosted-truth.md) |
| SURFACE_AUDIT_PASS | **PASS** | 20 surfaces from source — [`rc2-3-7-surface-polish-audit.md`](rc2-3-7-surface-polish-audit.md) |
| SENSORY_CONTRACT_PASS | **PASS** | `hapticPolicy` / `sfxPolicy` executed by gate — [`rc2-3-7-sensory-audit.md`](rc2-3-7-sensory-audit.md) |
| HAPTIC_PASS | **PASS** (web/code) | no stacked vibration; no haptic on navigation/scroll/audio |
| SOUND_PASS | **PASS** (web/code) | SFX yields to Mandarin audio/recording; decorative taps removed; fatigue softening |
| GUIDANCE_PASS | **PASS** | 25 definitions audited; tone-trace anchor fixed; Seu Domínio/Praticar first use — [`rc2-3-7-guidance-audit.md`](rc2-3-7-guidance-audit.md) |
| MOTION_PASS / REDUCED_MOTION_PASS | **PASS** | micro ≤ 150 ms, ceremony ≤ 500 ms/stage; reduced motion gated (SG12) |
| COMPLETION_PASS | **PASS** | every lesson opens with "Você aprendeu"; real mastery promotion shown once |
| RETURN_CONTEXT_PASS | **PASS** | Journey anchor restore gated; mastery practice → Seu Domínio; `/dominio` back → Revisão |
| COPY_PASS | **PASS** | no engine words in learner copy; canonical CTAs; concrete "Por que" — [`rc2-3-7-copy-audit.md`](rc2-3-7-copy-audit.md) |
| PERSONAL_MASTERY_UX_PASS | **PASS** (web) | no numbers; empty state "Continue praticando…" |
| SPEECH_UX_PASS / HANZI_UX_PASS / CULTURE_UX_PASS | **CODE_READY** | no engine change; inherited gates pass; owner device pending |
| WEB_PASS | **PASS** | E2E RC2.3.7 3/3 + RC2.3.6 4/4 at 360/375/390 |
| Gate | **PASS** | `gate:rc2-3-7-sensory-guidance` 21/21 mutations (17 mandatory + 4) |
| Full `validate:beta` (local) | **RUNNING** at PR creation | result posted on the PR |
| ANDROID_BUILD_PASS / APK_PASS | **NOT_RUN** (this head) | this PR's Android workflow |
| OWNER_UX_ACCEPTANCE | **OWNER_ACTION_REQUIRED** | [`rc2-3-7-owner-ux-acceptance.md`](rc2-3-7-owner-ux-acceptance.md) — never automatic |

Jev: copy DEV_AUDIT only (25 strings, 7 flagged REVIEW, nothing rewritten); `JEV_RUNTIME_ENABLED=false` gated.

Pending in this PR: drop obsolete guidance surfaces `/treino/tons`, `/tons` (no such routes) after the full local run.
