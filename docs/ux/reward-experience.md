# Reward Experience — RC2.3.13R.3.2.5

A reward feels like a moment, not a slot machine. It is also always the truth:
the ritual only presents a claim that has already happened. The gate
`validate:reward-ux-contract` **runs** the ritual component (hooks, timers, taps)
on every check.

## Claim before ritual

- `ChestOpeningRitual` is the only opening ritual, used by the Loja, Missões and
  Jornada chests. The two hand copies drifted (haptics, timers, copy).
- `claim()` runs **at most once per modal**. A synchronous ref guards it, so two
  taps in one frame (chest + CTA, or a double tap) cannot claim twice. The store
  still dedupes: `openChest` decrements a counted inventory and `openJourneyChest`
  records `journeyChestsOpened`.
- The rewards shown are the claim's result. Nothing waits for an animation event.
  The reveal timer is cleared on unmount.
- A claim that returns nothing (no chest left, already opened) shows an honest
  **Baú indisponível · Nada foi gasto**. It no longer closes silently.

## Ritual

A short sequence, once per claim and never looped (~760 ms):

| Step | Timing |
| --- | --- |
| press (the tap "lands") | 0–240 ms, `scale .95 → 1.03 → 1` |
| lid opens | 120–480 ms |
| warm light (gold aura, behind the chest via `isolate`) | 200–620 ms |
| sparks rise | 0–760 ms (5 sparks, 60 ms apart, 520 ms each) |
| rewards appear | `CHEST_REVEAL_MS` = 680 ms |

The ready chest's idle "breath" is transform-only. Its drop-shadow is static, so
nothing repaints a filter every frame. It runs on `--motion-ambient` (7 s) and
counts against the ambient budget. Opened chests on the Journey are the static
open pose: they no longer replay the lid and sparks every time the trail mounts.

## Reduced motion

With reduced motion the rewards appear **at once**, with no timer, no press, no
lid, no aura and no sparks. The resting poses hold even without animation: the
aura is centred at 35 % opacity and the sparks are invisible. The reveal, the
sound and the haptic still happen.

## Honest summary

- Reward rows use catalog names (`chestRewardName`). EN learners saw
  "+1 Escudo de Sequência".
- Each reward has its own icon, matching the chrome. Qi uses the TopBar star.
  A charge uses the TopBar energy shield. A streak shield uses the streak flame.
  Breath uses recover, XP the trophy, the focus pass the target, and the pearl 珠.
- "Pode conter" copy matches the roll. Small adds the shield and Recuperar Vidas.
  Dragon adds Recuperar Vidas. Legendary is "Qi alto, Pérola de Jade, Escudo e
  chance de uma segunda Pérola" (it never promised XP).
- The Legendary seal is 珍. It used to repeat the Monthly 玉.
- After the reveal the CTA reads **Continuar**. "Receber recompensas" implied the
  rewards were not yet the learner's. Victory keeps "Receber recompensas", because
  there the tap really claims.
- Victory shows only Qi the store will pay. `lessonCompletionQi` is the store's
  formula: nothing below 3★, and the no-skip and Pro bonuses only at 3★. The gate
  executes both across every star, no-skip and Pro combination. The "+N Qi" chip
  stays after claiming instead of vanishing.
- Missões shows the monthly chest as **opened** after the claim, never a padlock.
- Claim toasts (Loja, Missões) are announced (`role="status"`). One timer runs at
  a time (`useTransientMessage`).
- The reveal is announced ("Você recebeu: +35 Qi"). Focus moves to the result
  heading, and the dialog is named by its heading.

## Escalated to the economy owner

Out of scope for a presentation wave (no economy, schema or grant-timing change).
Recorded in the certification.

1. **Back on Victory forfeits the first-completion Qi.** The non-guided shell grants
   it only from the CTA. The proposed fix is to claim on exit, idempotent by
   `lesson:<id>:qi`.
2. **Cloud chest summary vs server roll.** `openChest` shows the local roll while the
   server rolls its own table.
3. **Journey chests in cloud accounts are local-only.** The next economy snapshot can
   take back the Qi or pearl the reveal celebrated.
