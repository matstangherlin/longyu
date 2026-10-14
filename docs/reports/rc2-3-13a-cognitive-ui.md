# RC2.3.13A — Cognitive UI Foundation (before / after)

Parent: PR #330 @ `0ca1098d`. Learner UI changed → **RC1 does not certify this UI**.

**RC2 artifact (BUILT):** `RC2.3.12-RC2` / `0.2.0-rc.2` / versionCode `596` · sourceSha `529d2cd4…` · APK `b4c2a846…` · AAB `d77b9350…` · run [37908317177](https://github.com/matstangherlin/longyu/actions/runs/37908317177). RC1 provenance frozen in `docs/release/rc1-artifacts.json`.

## More Options sheet

**Problem:** 2-column card grid + filled accent “Ver menu completo” + full-width Sair competed as primary actions (Hick + hierarchy).

**Principles:** Hick, Visual hierarchy, Card policy, Fitts.

**Change:** Grouped rows (VOCÊ · PROGRESSO · AJUDA); tertiary “Ver todas as opções →”; compact destructive Sair at bottom with confirm.

**Effect:** Attention stays on secondary destinations; logout is available but not preferred.

## Logout

**Problem:** Full-width Sair looked like a major product CTA.

**Principles:** Hierarchy, Fitts, Error prevention.

**Change:** `SignOutControl` — compact wrong-text row → confirmation modal → loading “Saindo…” → auth landing. Not filled danger (reserved for Excluir).

**Effect:** Logout remains discoverable (≤2 levels) without dominating learning CTAs.

## Account

**Problem:** Mixed cards/rows; Sair inside first-fold action list.

**Principles:** Gestalt proximity/similarity, Recognition over recall, Consistency.

**Change:** Conventional grouped settings rows (profile, security, notifications, appearance+current mode, language, help, privacy/terms) + Sair last; Excluir remains danger zone.

**Effect:** Predictable phone-settings IA.

## CTA / tokens

**Problem:** Same high-emphasis treatment risk for learning vs destructive.

**Principles:** Consistency, Color semantics.

**Change:** Explicit `data-cta-hierarchy` on sheet footer / logout; keep Button variants; settings rows shared component.

**Effect:** One primary per context; destructive semantics reserved.

## Explicit non-claims

| Item | Status |
| --- | --- |
| Home redesign | Audit only → 13B |
| Lesson/Speech/Hànzì/Review redesign | Audit only → 13C |
| Physical RC / Sentry / rollback / cloud smoke / OAuth | Still OWNER_ACTION_REQUIRED |
| JEV learner/shadow runtime | OFF |
| Curriculum / Mastery / economy features | Unchanged |

## Gate

`gate:rc2-3-13a-cognitive-ui` — 20 mutation kills covering hierarchy, logout, delete, see-all, affordance, touch, a11y, safe area, sheet dismiss, account IA, nav active, order, confirmation, version, JEV, docs, sibling project, sheet handle.
