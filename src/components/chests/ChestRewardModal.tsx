import { useState } from "react";
import { useStore, type ChestRewardItem, type ChestType } from "../../lib/store";
import { chestOpenSound, playSoundFx } from "../../lib/soundFx";
import { Button } from "../ui/primitives";
import { IconX } from "../ui/Icon";
import { ModalOverlay } from "../ui/ModalOverlay";
import { CHEST_VISUALS } from "./chestMeta";
import { LongyuChest } from "./LongyuChest";
import { RewardReveal } from "./RewardReveal";

type Phase = "closed" | "opening" | "revealed";

// Modal de abertura de baú: fechado -> abertura com brilho -> revelação.
// As recompensas são aplicadas no store ao abrir; o modal só revela o resultado.
export function ChestRewardModal({ type, onClose }: { type: ChestType; onClose: () => void }) {
  const openChest = useStore((s) => s.openChest);
  const soundEffects = useStore((s) => s.soundEffects);
  const [phase, setPhase] = useState<Phase>("closed");
  const [rewards, setRewards] = useState<ChestRewardItem[]>([]);

  const visual = CHEST_VISUALS[type];

  function handleOpen() {
    if (phase !== "closed") return;
    const result = openChest(type);
    if (!result) {
      onClose();
      return;
    }
    setPhase("opening");
    playSoundFx(chestOpenSound(type), soundEffects);
    window.setTimeout(() => {
      setRewards(result);
      setPhase("revealed");
      playSoundFx("qiGain", soundEffects);
    }, 680);
  }

  const closable = phase !== "opening";

  return (
    <ModalOverlay className="items-stretch sm:items-center" onBackdropClick={() => closable && onClose()}>
      <div
        className="relative flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden border border-line bg-[radial-gradient(circle_at_50%_0%,rgb(var(--accent-soft)),rgb(var(--surface))_48%,rgb(var(--bg))_100%)] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 text-center shadow-lift sm:min-h-0 sm:rounded-[34px] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        {closable && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2 hover:text-ink"
            aria-label="Fechar"
          >
            <IconX width={18} height={18} />
          </button>
        )}

        <div className="mx-auto mt-6 flex justify-center sm:mt-2">
          <button
            type="button"
            disabled={phase !== "closed"}
            onClick={handleOpen}
            className={[
              "relative rounded-[32px] px-8 py-5 transition active:scale-[0.98] disabled:cursor-default",
              phase === "opening" ? "longyu-chest-shake" : "",
            ].join(" ")}
            aria-label={phase === "closed" ? "Toque para abrir" : visual.name}
          >
            <span className={phase === "opening" || phase === "revealed" ? "longyu-chest-aura" : ""} aria-hidden />
            <LongyuChest
              type={type}
              state={phase === "revealed" || phase === "opening" ? "opened" : "unlocked"}
              size="lg"
              animated
            />
          </button>
        </div>

        {phase !== "revealed" ? (
          <div className="flex flex-1 flex-col">
            <div className="mx-auto mt-4 inline-flex rounded-full bg-surface/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent shadow-card">
              {visual.rarity}
            </div>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-ink">{visual.name}</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-soft">{visual.tagline}</p>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-ink-faint">
              Pode conter: {visual.contains}
            </p>
            <p className="mt-5 text-sm font-semibold text-accent">
              {phase === "opening" ? "Abrindo..." : "Toque para abrir"}
            </p>
            <Button
              size="lg"
              className="mt-auto w-full shadow-lift sm:mt-6"
              disabled={phase === "opening"}
              onClick={handleOpen}
            >
              {phase === "opening" ? "Abrindo..." : "Toque para abrir"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="mx-auto mt-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              Recompensas
            </div>
            <h2 className="mt-4 font-serif text-3xl font-semibold text-ink">Você recebeu</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft">
              As recompensas já entraram no seu progresso.
            </p>
            <div className="mt-5">
              <RewardReveal rewards={rewards} large />
            </div>
            <Button size="lg" className="mt-auto w-full shadow-lift sm:mt-6" onClick={onClose}>
              Receber recompensas
            </Button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
