import type { ChestType } from "../../lib/store";
import { Button, Card, Pill } from "../ui/primitives";
import { localizedChestVisual } from "./chestMeta";
import { LongyuChest } from "./LongyuChest";
import { useTranslation } from "../../i18n/useTranslation";

// Baú no inventário: arte com identidade Longyu (baú SVG), contagem e Abrir.
export function ChestCard({
  type,
  count,
  onOpen,
}: {
  type: ChestType;
  count: number;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const visual = localizedChestVisual(type);
  const has = count > 0;

  return (
    <Card className={["flex min-h-56 flex-col p-4 transition", has ? "shadow-card" : "bg-surface-2/70"].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <LongyuChest
          type={type}
          state={has ? "unlocked" : "locked"}
          size="md"
          animated={has}
          title={has ? undefined : t("player.chestEarnHint")}
        />
        <Pill tone={has ? "accent" : "muted"}>{t("player.chestCount", { n: count })}</Pill>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-ink">{visual.name}</h3>
        <Pill tone={has ? "gold" : "muted"}>{visual.rarity}</Pill>
      </div>
      <p className="mt-1 text-sm leading-5 text-ink-soft">{visual.tagline}</p>
      <p className="mt-2 text-xs leading-5 text-ink-faint">{t("player.chestMayContain", { items: visual.contains })}</p>

      <div className="mt-auto pt-4">
        <Button size="sm" className="w-full" disabled={!has} onClick={onOpen}>
          {has ? t("player.chestOpenCta") : t("player.chestNone")}
        </Button>
      </div>
    </Card>
  );
}
