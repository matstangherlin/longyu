import type { ChestRewardItem } from "../../lib/store";
import { ChestRewardIcon, chestRewardCaption, chestRewardName } from "./chestMeta";

// Revela as recompensas de um baú com um "subir" suave e escalonado.
export function RewardReveal({ rewards, large = false }: { rewards: ChestRewardItem[]; large?: boolean }) {
  return (
    <div className={large ? "grid gap-3" : "grid gap-2"}>
      {rewards.map((reward, index) => (
        <div
          key={`${reward.kind}-${index}`}
          className={[
            "longyu-reward-rise flex items-center gap-3 border text-left",
            // RC2.3.13R.3.2.5 — a real reward wears the reward surface (gold), not a card.
            large ? "surface-reward rounded-3xl px-4 py-4" : "rounded-2xl border-line bg-surface px-4 py-3 shadow-card",
          ].join(" ")}
          style={{ animationDelay: `${index * 140}ms` }}
        >
          <span
            className={[
              "flex shrink-0 items-center justify-center bg-gold-soft text-gold",
              large ? "h-14 w-14 rounded-2xl" : "h-11 w-11 rounded-2xl",
            ].join(" ")}
          >
            <ChestRewardIcon kind={reward.kind} />
          </span>
          <div className="min-w-0">
            <div className={large ? "font-serif text-lg font-semibold text-ink" : "font-semibold text-ink"}>
              +{reward.amount} {chestRewardName(reward.kind, reward.amount)}
            </div>
            <div className="text-xs text-ink-faint">{chestRewardCaption(reward.kind)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
