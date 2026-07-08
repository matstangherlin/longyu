import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore, type ChestType } from "../../lib/store";
import { playSoundFx } from "../../lib/soundFx";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  shopItemsByCategory,
  type ShopIconKey,
  type ShopItem,
} from "../../data/shop";
import { ChestCard } from "../../components/chests/ChestCard";
import { ChestRewardModal } from "../../components/chests/ChestRewardModal";
import { LongyuChest } from "../../components/chests/LongyuChest";
import { Button, Card, Pill } from "../../components/ui/primitives";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import {
  IconFlame,
  IconLock,
  IconRefresh,
  IconShield,
  IconStar,
  IconSun,
  IconTarget,
  IconUser,
} from "../../components/ui/Icon";

const SHOP_ICONS: Record<ShopIconKey, typeof IconStar> = {
  breath: IconFlame,
  charge: IconRefresh,
  shield: IconShield,
  chest: IconStar,
  chest_dragon: IconStar,
  theme: IconSun,
  avatar: IconUser,
  retry: IconTarget,
  focus: IconTarget,
  qi: IconFlame,
  pro: IconStar,
};

export function LojaPage() {
  const navigate = useNavigate();
  const points = useStore((s) => s.points);
  const dragonPearls = useStore((s) => s.dragonPearls);
  const inventory = useStore((s) => s.inventory);
  const ownedCosmetics = useStore((s) => s.ownedCosmetics);
  const isPremium = useStore((s) => s.isPremium);
  const canBuyShopItem = useStore((s) => s.canBuyShopItem);
  const buyShopItem = useStore((s) => s.buyShopItem);
  const useInventoryItem = useStore((s) => s.useInventoryItem);
  const chests = useStore((s) => s.chests);
  const soundEffects = useStore((s) => s.soundEffects);

  const [burst, setBurst] = useState<string | null>(null);
  const [openChestType, setOpenChestType] = useState<ChestType | null>(null);
  const location = useLocation();

  // Permite chegar direto nos baús via /loja#baus (hub Meu).
  useEffect(() => {
    const id = location.hash.replace("#", "");
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  function flash(message: string, sound: Parameters<typeof playSoundFx>[0] = "qiGain") {
    playSoundFx(sound, soundEffects);
    setBurst(message);
    window.setTimeout(() => setBurst(null), 1200);
  }

  function buy(item: ShopItem) {
    if (buyShopItem(item.id)) {
      const sound = item.kind === "chest_small" || item.kind === "chest_dragon" ? "chestReady" : "qiSpend";
      flash(`Comprado: ${item.name}`, sound);
    }
  }

  function use(item: ShopItem) {
    const result = useInventoryItem(item.id);
    if (result) flash(result.message, item.kind === "qi_pack" ? "qiGain" : "success");
  }

  return (
    <HubPage className="relative space-y-5">
      {burst && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="longyu-claim-float rounded-full bg-[rgb(var(--good)/0.16)] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--good))] shadow-lift">
            {burst}
          </div>
        </div>
      )}

      <HubHeader
        eyebrow="Loja"
        title="Gaste Qi com sabedoria"
        desc="Itens para manter o ritmo — sem pular o aprendizado."
        aside={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-line/70 bg-surface px-3 py-1.5 text-sm font-semibold text-accent">
              <IconStar width={16} height={16} /> {points}
              <span className="font-normal text-ink-faint">Qi</span>
            </div>
            {dragonPearls > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-line/70 bg-surface px-3 py-1.5 text-sm font-semibold text-gold">
                <span aria-hidden>珠</span> {dragonPearls}
                <span className="font-normal text-ink-faint">Pérolas</span>
              </div>
            )}
          </div>
        }
      />

      <HubSection id="baus" title="Seus baús" desc="Recompensas aleatórias do dragão.">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {(["small", "dragon", "monthly", "legendary"] as ChestType[]).map((type) => (
            <ChestCard
              key={type}
              type={type}
              count={chests[type] ?? 0}
              onOpen={() => setOpenChestType(type)}
            />
          ))}
        </div>
      </HubSection>

      {CATEGORY_ORDER.map((category) => {
        const items = shopItemsByCategory(category);
        if (items.length === 0) return null;
        const meta = CATEGORY_META[category];
        return (
          <HubSection key={category} title={meta.label} desc={meta.desc}>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  balance={item.currency === "qi" ? points : dragonPearls}
                  count={inventory[item.id] ?? 0}
                  owned={ownedCosmetics.includes(item.id)}
                  isPremium={isPremium}
                  canBuy={canBuyShopItem(item.id)}
                  onBuy={() => buy(item)}
                  onUse={() => use(item)}
                  onPro={() => navigate("/pro")}
                />
              ))}
            </div>
          </HubSection>
        );
      })}

      <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-xs leading-5 text-ink-faint">
        A Loja não vende progresso. A revisão essencial continua sempre disponível.
      </p>

      {openChestType && (
        <ChestRewardModal type={openChestType} onClose={() => setOpenChestType(null)} />
      )}
    </HubPage>
  );
}

function ShopItemCard({
  item,
  balance,
  count,
  owned,
  isPremium,
  canBuy,
  onBuy,
  onUse,
  onPro,
}: {
  item: ShopItem;
  balance: number;
  count: number;
  owned: boolean;
  isPremium: boolean;
  canBuy: boolean;
  onBuy: () => void;
  onUse: () => void;
  onPro: () => void;
}) {
  const Icon = SHOP_ICONS[item.iconKey];
  const currencyLabel = item.currency === "qi" ? "Qi" : "Pérolas";
  const insufficient = !item.cosmetic && item.kind !== "pro_link" && balance < item.cost;
  const chestType: ChestType | null =
    item.iconKey === "chest" ? "small" : item.iconKey === "chest_dragon" ? "dragon" : null;

  return (
    <Card className="flex min-h-40 flex-col rounded-xl border-line/70 p-3 shadow-none">
      <div className="flex items-start justify-between gap-2">
        {chestType ? (
          <LongyuChest type={chestType} state="unlocked" size="sm" title={item.name} />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Icon width={18} height={18} />
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {count > 0 && !item.cosmetic && item.kind !== "pro_link" && (
            <Pill tone="good">No inventário: {count}</Pill>
          )}
          {item.pro && <Pill tone="accent">Preview</Pill>}
        </div>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-ink">{item.name}</h3>
      <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-soft">{item.desc}</p>

      {item.usageHint && count > 0 && (
        <p className="mt-2 text-xs leading-5 text-ink-faint">{item.usageHint}</p>
      )}

      <div className="mt-auto pt-4">
        {item.kind !== "pro_link" && (
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-accent">
            <IconStar width={15} height={15} />
            {item.cost} {currencyLabel}
          </div>
        )}

        {item.kind === "pro_link" ? (
          <Button size="sm" className="w-full" variant={isPremium ? "soft" : "primary"} onClick={onPro}>
            {isPremium ? "Pro Preview ativo" : "Ver Longyu Pro"}
          </Button>
        ) : item.cosmetic && owned ? (
          <Button size="sm" variant="outline" className="w-full" disabled>
            Adquirido
          </Button>
        ) : (
          <div className="grid gap-2">
            <Button size="sm" className="w-full" disabled={!canBuy} onClick={onBuy}>
              {insufficient ? (
                <>
                  <IconLock width={14} height={14} /> Qi insuficiente
                </>
              ) : (
                "Comprar"
              )}
            </Button>
            {item.usableInShop && count > 0 && (
              <Button size="sm" variant="soft" className="w-full" onClick={onUse}>
                Usar {count > 1 ? `(${count})` : ""}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
