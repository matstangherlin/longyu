import { useEffect, useId, useRef, useState } from "react";
import { haptic } from "../../lib/haptics";
import { useStore, type ChestRewardItem, type ChestType } from "../../lib/store";
import { chestOpenSound, playSoundFx } from "../../lib/soundFx";
import { Button, Pill } from "../ui/primitives";
import { IconX } from "../ui/Icon";
import { ModalOverlay } from "../ui/ModalOverlay";
import { ChineseOrnamentalFrame } from "../ornaments/chinese/ChineseOrnamentalFrame";
import { chestRewardName, localizedChestVisual } from "./chestMeta";
import { LongyuChest } from "./LongyuChest";
import { RewardReveal } from "./RewardReveal";
import { useTranslation } from "../../i18n/useTranslation";
import { CHEST_REVEAL_MS, prefersReducedMotion } from "../../lib/motion/livingUiMotion";

export type ChestRitualPhase = "closed" | "opening" | "revealed" | "unavailable";

/**
 * RC2.3.13R.3.2.5 — the one chest-opening ritual (Loja, Missões and Jornada).
 *
 * The claim is the truth and the ritual is only its presentation:
 * - `claim()` runs at most once per modal. A synchronous ref guards it, so two
 *   taps in one frame (chest + CTA, or a double tap) cannot claim twice.
 * - The rewards come from the claim's result, never from the animation, and
 *   nothing waits on an animation event. The reveal timer is cleared on unmount.
 * - Reduced motion reveals at once: no press, no lid, no aura, no sparks.
 * - A claim that returns nothing (no chest left, already opened) shows an
 *   honest "unavailable" state instead of silently closing.
 * - Sequence (~760 ms): press 0–240 ms · lid 120–480 · aura 200–620 ·
 *   sparks 0–760 · reveal at CHEST_REVEAL_MS. One time per claim, no loop.
 *
 * RC2.3.13R.3.2.6 — the panel is the reward hero: a Ceremony frame (gilt rule
 * + ruyi-cloud corners) sits under its content, decorative and inert, drawn
 * once per mount (never under reduced motion). It frames every phase the same
 * way, so it never signals the claim's result — the copy and the status do.
 */
export function ChestOpeningRitual({
  type,
  title,
  claim,
  onClose,
}: {
  type: ChestType;
  title: string;
  claim: () => ChestRewardItem[] | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const soundEffects = useStore((s) => s.soundEffects);
  const [phase, setPhase] = useState<ChestRitualPhase>("closed");
  const [rewards, setRewards] = useState<ChestRewardItem[]>([]);
  const claimed = useRef(false);
  const revealTimer = useRef<number | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const visual = localizedChestVisual(type);

  useEffect(
    () => () => {
      if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
    },
    [],
  );

  // The result is announced and focused once, so a screen-reader or keyboard
  // learner lands on "You received" instead of a button that vanished.
  useEffect(() => {
    if (phase === "revealed" || phase === "unavailable") resultHeading.current?.focus({ preventScroll: true });
  }, [phase]);

  function handleOpen() {
    if (claimed.current || phase !== "closed") return;
    claimed.current = true;
    const result = claim();
    if (!result || result.length === 0) {
      setPhase("unavailable");
      return;
    }
    const reveal = () => {
      revealTimer.current = null;
      setRewards(result);
      setPhase("revealed");
      playSoundFx("qiGain", soundEffects);
    };
    playSoundFx(chestOpenSound(type), soundEffects);
    haptic("chestOpen");
    if (prefersReducedMotion()) {
      reveal();
      return;
    }
    setPhase("opening");
    revealTimer.current = window.setTimeout(reveal, CHEST_REVEAL_MS);
  }

  const closable = phase !== "opening";
  const opened = phase === "opening" || phase === "revealed";
  const openingLabel = phase === "opening" ? t("player.chestOpening") : t("player.chestTapToOpen");
  const summary = rewards.map((reward) => `+${reward.amount} ${chestRewardName(reward.kind, reward.amount)}`).join(", ");

  return (
    <ModalOverlay
      className="items-stretch sm:items-center"
      labelledBy={headingId}
      onBackdropClick={() => closable && onClose()}
    >
      <div
        className="surface-reward relative isolate flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden border px-5 pb-[calc(var(--app-safe-bottom)+2rem)] pt-[calc(var(--app-safe-top)+1.5rem)] text-center sm:min-h-0 sm:rounded-4xl sm:p-6 sm:pb-9"
        data-chest-ritual={phase}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Ceremony frame (RC2.3.13R.3.2.6): 8 px in from the safe areas on the
            full-screen sheet, 10 px inside the card's curve from sm. pb +2rem
            (sm:pb-9 on the card) lifts the CTA clear of the lower 24 px hooks;
            the close button sits 36 px in (right-9, top +2.25rem), past the
            top-right hook (which ends 32/34 px in), so its hit area and focus
            ring never land on the cloud. */}
        <ChineseOrnamentalFrame motif="ruyi" intensity="milestone" tone="gold" animated surface="reward-hero" level="ceremony" />
        {closable && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="absolute right-9 top-[calc(var(--app-safe-top)+2.25rem)] z-10 sm:top-9"
            aria-label={t("common.close")}
          >
            <IconX width={18} height={18} />
          </Button>
        )}

        {/* RC2.3.13R.3.2.6 — the panel itself never scrolls (the Ceremony frame
            stays on it); long reward lists scroll here, clipped inside the
            frame's band, with the CTA still pushed to the bottom (mt-auto). */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain" data-chest-ritual-scroll>
        <div className="mx-auto mt-6 flex justify-center sm:mt-2">
          <button
            type="button"
            disabled={phase !== "closed"}
            onClick={handleOpen}
            className={[
              "relative isolate rounded-2xl px-8 py-5 transition active:scale-[0.98] disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
              phase === "opening" ? "longyu-chest-press" : "",
            ].join(" ")}
            aria-label={phase === "closed" ? t("player.chestTapToOpen") : title}
            data-testid="chest-ritual-chest"
          >
            <span className={opened ? "longyu-chest-aura" : ""} aria-hidden />
            <LongyuChest type={type} state={opened ? "opened" : "unlocked"} size="lg" animated />
          </button>
        </div>

        <p role="status" aria-live="polite" className="sr-only" data-testid="chest-ritual-status">
          {phase === "revealed" ? `${t("player.chestYouReceived")}: ${summary}` : phase === "unavailable" ? t("player.chestUnavailableBody") : ""}
        </p>

        {phase === "closed" || phase === "opening" ? (
          <div className="flex flex-1 flex-col">
            <Pill tone="gold" className="mx-auto mt-4 uppercase tracking-[0.16em]">
              {visual.rarity}
            </Pill>
            <h2 id={headingId} className="mt-3 font-serif text-3xl font-semibold text-ink">
              {title}
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-soft">{visual.tagline}</p>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-ink-soft">
              {t("player.chestMayContain", { items: visual.contains })}
            </p>
            <Button
              size="lg"
              className="mt-auto w-full sm:mt-6"
              loading={phase === "opening"}
              onClick={handleOpen}
              data-testid="chest-ritual-open"
            >
              {openingLabel}
            </Button>
          </div>
        ) : phase === "revealed" ? (
          <div className="flex flex-1 flex-col">
            <Pill tone="gold" className="mx-auto mt-3 uppercase tracking-[0.16em]">
              {t("player.chestRewards")}
            </Pill>
            <h2
              id={headingId}
              ref={resultHeading}
              tabIndex={-1}
              className="mt-4 font-serif text-3xl font-semibold text-ink focus:outline-none"
            >
              {t("player.chestYouReceived")}
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft">{t("player.chestRewardsApplied")}</p>
            <div className="mt-5" data-testid="chest-ritual-rewards">
              <RewardReveal rewards={rewards} large />
            </div>
            <Button size="lg" className="mt-auto w-full sm:mt-6" onClick={onClose} data-testid="chest-ritual-continue">
              {t("player.chestContinue")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <h2
              id={headingId}
              ref={resultHeading}
              tabIndex={-1}
              className="mt-4 font-serif text-2xl font-semibold text-ink focus:outline-none"
            >
              {t("player.chestUnavailableTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-soft">{t("player.chestUnavailableBody")}</p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-auto w-full sm:mt-6"
              onClick={onClose}
              data-testid="chest-ritual-continue"
            >
              {t("player.chestContinue")}
            </Button>
          </div>
        )}
        </div>
      </div>
    </ModalOverlay>
  );
}
