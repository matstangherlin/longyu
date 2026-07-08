import type { ChestRewardItem } from "../../lib/store";
import { ChestRewardIcon, chestRewardCaption } from "./chestMeta";

// Revela as recompensas de um baú com um "subir" suave e escalonado.
export function RewardReveal({ rewards, large = false }: { rewards: ChestRewardItem[]; large?: boolean }) {
  return (
    <div className={large ? "grid gap-3" : "grid gap-2"}>
      {rewards.map((reward, index) => (
        <div
          key={`${reward.kind}-${index}`}
          className={[
            "longyu-reward-rise flex items-center gap-3 border border-line bg-surface text-left shadow-card",
            large ? "rounded-[24px] px-4 py-4" : "rounded-2xl px-4 py-3",
          ].join(" ")}
          style={{ animationDelay: `${index * 140}ms` }}
        >
          <span
            className={[
              "flex shrink-0 items-center justify-center bg-accent-soft text-accent",
              large ? "h-14 w-14 rounded-[20px]" : "h-11 w-11 rounded-2xl",
            ].join(" ")}
          >
            <ChestRewardIcon kind={reward.kind} />
          </span>
          <div className="min-w-0">
            <div className={large ? "font-serif text-lg font-semibold text-ink" : "font-semibold text-ink"}>
              {reward.kind === "spark" ? reward.label : `+${reward.amount} ${reward.label}`}
            </div>
            <div className="text-xs text-ink-faint">{chestRewardCaption(reward.kind)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
