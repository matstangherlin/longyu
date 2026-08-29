import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore, type ChestType, type ShopPurchaseFeedback } from "../../lib/store";
import { playSoundFx } from "../../lib/soundFx";
import {
  CATEGORY_ORDER,
  shopItemsByCategory,
  type ShopIconKey,
  type ShopItem,
} from "../../data/shop";
import { PEARL_ECONOMY_SUMMARY, PEARL_PRO_COST } from "../../data/economy";
import { MONTHLY_GOAL } from "../../data/missions";
import { buildPearlProgress } from "../../data/pearlMilestones";
import { listMasteredPhaseIds } from "../../lib/pearlEconomy";
import {
  formatPearlProUntil,
  hasActivePearlPro,
  PEARL_PRO_COPY,
} from "../../lib/pearlPro";
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
import { useIsPro } from "../../lib/proAccess";
import { EconomyExplainer } from "../../components/economy/EconomyExplainer";
import { monthKey } from "../../lib/storage";
import { useTranslation } from "../../i18n/useTranslation";
import { displayInstruction } from "../../i18n/overlays/journeyChrome";

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
  pearl: IconStar,
  pro: IconStar,
};

export function LojaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const points = useStore((s) => s.points);
  const dragonPearls = useStore((s) => s.dragonPearls);
  const inventory = useStore((s) => s.inventory);
  const ownedCosmetics = useStore((s) => s.ownedCosmetics);
  const isPremium = useIsPro();
  const canBuyShopItem = useStore((s) => s.canBuyShopItem);
  const buyShopItem = useStore((s) => s.buyShopItem);
  const useInventoryItem = useStore((s) => s.useInventoryItem);
  const chests = useStore((s) => s.chests);
  const soundEffects = useStore((s) => s.soundEffects);
  const pearlMilestonesClaimed = useStore((s) => s.pearlMilestonesClaimed);
  const pearlProExpiresAt = useStore((s) => s.pearlProExpiresAt);
  const pearlProAutoActivate = useStore((s) => s.pearlProAutoActivate);
  const pearlProAutoExplainSeen = useStore((s) => s.pearlProAutoExplainSeen);
  const pearlProPendingOffline = useStore((s) => s.pearlProPendingOffline);
  const setPearlProAutoActivate = useStore((s) => s.setPearlProAutoActivate);
  const lastShopPurchaseFeedback = useStore((s) => s.lastShopPurchaseFeedback);
  const clearShopPurchaseFeedback = useStore((s) => s.clearShopPurchaseFeedback);
  const streak = useStore((s) => s.streak);
  const correctedMistakes = useStore((s) => s.correctedMistakes);
  const recentActivityErrors = useStore((s) => s.recentActivityErrors);
  const learnedChars = useStore((s) => s.learnedChars);
  const pearlAudioExposures = useStore((s) => s.pearlAudioExposures);
  const pearlProductionCount = useStore((s) => s.pearlProductionCount);
  const lifetimeStats = useStore((s) => s.lifetimeStats);
  const completedLessons = useStore((s) => s.completedLessons);
  const lessonStarsById = useStore((s) => s.lessonStarsById);
  const lessonPendingStars = useStore((s) => s.lessonPendingStars);
  const monthlyMission = useStore((s) => s.monthlyMission);

  const [burst, setBurst] = useState<string | null>(null);
  const [openChestType, setOpenChestType] = useState<ChestType | null>(null);
  const [showAutoExplain, setShowAutoExplain] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const id = location.hash.replace("#", "");
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  const pearlProgress = useMemo(() => {
    const errorsCorrected = Math.max(
      Object.keys(correctedMistakes ?? {}).length,
      (recentActivityErrors ?? []).filter((e) => e.correctedAt).length
    );
    const month = monthlyMission;
    const monthProgress =
      month && MONTHLY_GOAL > 0 ? Math.min(1, (month.completed ?? 0) / MONTHLY_GOAL) : 0;
    return buildPearlProgress({
      streak: streak ?? 0,
      masteredPhaseIds: listMasteredPhaseIds({
        completedLessons: completedLessons ?? [],
        lessonStarsById: lessonStarsById ?? {},
        lessonPendingStars,
      }),
      errorsCorrected,
      hanziLearned: learnedChars?.length ?? 0,
      audioExposures: Math.max(pearlAudioExposures ?? 0, lifetimeStats?.audioHeard ?? 0),
      productionCount: Math.max(pearlProductionCount ?? 0, lifetimeStats?.phrasesSpoken ?? 0),
      monthlyChallengeProgress: monthProgress,
      monthlyChallengeCompleted: Boolean(month?.claimed || (month?.completed ?? 0) >= MONTHLY_GOAL),
      monthlyChallengeKey: month?.monthKey ?? monthKey(),
      claimed: pearlMilestonesClaimed ?? {},
      dragonPearls,
      proPassCost: PEARL_PRO_COST,
    });
  }, [
    streak,
    correctedMistakes,
    recentActivityErrors,
    learnedChars,
    pearlAudioExposures,
    pearlProductionCount,
    lifetimeStats,
    completedLessons,
    lessonStarsById,
    lessonPendingStars,
    monthlyMission,
    pearlMilestonesClaimed,
    dragonPearls,
  ]);

  const towardPro = pearlProgress.pearlsTowardPro;
  const pearlPassActive = isPremium && hasActivePearlPro(pearlProExpiresAt);

  function flash(message: string, sound: Parameters<typeof playSoundFx>[0] = "qiGain") {
    playSoundFx(sound, soundEffects);
    setBurst(message);
    window.setTimeout(() => setBurst(null), 1200);
  }

  async function buy(item: ShopItem) {
    if (await buyShopItem(item.id)) {
      const sound = item.kind === "chest_small" || item.kind === "chest_dragon" ? "chestReady" : "qiSpend";
      flash(t("hub.shopPurchased", { name: displayInstruction(item.name) }), sound);
    }
  }

  function use(item: ShopItem) {
    const result = useInventoryItem(item.id);
    if (result) flash(result.message, item.kind === "qi_pack" ? "qiGain" : "success");
  }

  function toggleAutoActivate() {
    if (!pearlProAutoActivate && !pearlProAutoExplainSeen) {
      setShowAutoExplain(true);
      return;
    }
    setPearlProAutoActivate(!pearlProAutoActivate);
  }

  function confirmAutoActivate() {
    setPearlProAutoActivate(true);
    setShowAutoExplain(false);
  }

  return (
    <HubPage className="relative space-y-4">
      {burst && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="longyu-claim-float rounded-full bg-[rgb(var(--good)/0.16)] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--good))] shadow-lift">
            {burst}
          </div>
        </div>
      )}

      <HubHeader
        eyebrow={t("navigation.shop")}
        title={t("hub.shopTitle")}
        desc={t("hub.shopDesc")}
        aside={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-line/70 bg-surface px-3 py-1.5 text-sm font-semibold text-accent">
              <IconStar width={16} height={16} /> {points}
              <span className="font-normal text-ink-faint">Qi</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-line/70 bg-surface px-3 py-1.5 text-sm font-semibold text-gold">
              <span aria-hidden>珠</span> {dragonPearls}
              <span className="font-normal text-ink-faint">{t("hub.pearls")}</span>
            </div>
          </div>
        }
      />

      <p className="text-xs leading-5 text-ink-faint">
        {displayInstruction(PEARL_ECONOMY_SUMMARY.qi)} {displayInstruction(PEARL_ECONOMY_SUMMARY.pearls)}
      </p>

      <section
        aria-label={t("hub.jadePearls")}
        className="rounded-xl border border-gold/25 bg-[linear-gradient(135deg,rgb(var(--gold)/0.12),rgb(var(--surface))_55%)] px-3.5 py-3"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">{t("hub.jadePearls")}</h2>
          <p className="text-lg font-semibold tabular-nums text-gold">
            {towardPro.current} / {towardPro.cost}
          </p>
        </div>
        {towardPro.needed > 0 ? (
          <p className="mt-1 text-xs text-ink-soft">
            {t("hub.pearlNeedFor", {
              n: towardPro.needed,
              goal: displayInstruction(PEARL_PRO_COPY.costLabel.replace(`${PEARL_PRO_COST} Pérolas → `, "")),
            })}
          </p>
        ) : pearlPassActive && pearlProExpiresAt ? (
          <p className="mt-1 text-xs text-good">{t("hub.pearlProActiveUntil", { date: formatPearlProUntil(pearlProExpiresAt) })}</p>
        ) : (
          <p className="mt-1 text-xs text-ink-soft">{t("hub.pearlProEnough")}</p>
        )}
        {pearlProPendingOffline && (
          <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-ink-soft">
            {t("hub.pearlProOfflineReady")}
          </p>
        )}

        <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-5 text-ink-soft">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={pearlProAutoActivate}
            onChange={toggleAutoActivate}
          />
          <span>{t("hub.pearlProAutoToggle", { n: PEARL_PRO_COST })}</span>
        </label>
      </section>

      {pearlProgress.upcoming.length > 0 && (
        <HubSection title={t("hub.nextPearls")} desc={t("hub.nextPearlsDesc")}>
          <ul className="space-y-2">
            {pearlProgress.upcoming.map((goal) => (
              <li
                key={goal.milestoneId}
                className="flex items-center justify-between gap-3 rounded-lg border border-line/50 bg-surface px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink" data-commercial-later="">
                    {displayInstruction(goal.label)}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {goal.kind === "monthly_challenge"
                      ? `${goal.current}%`
                      : `${goal.current}/${goal.target}`}
                    {" · "}
                    {goal.pearls === 1
                      ? t("hub.pearlDeltaOne", { n: goal.pearls })
                      : t("hub.pearlDeltaMany", { n: goal.pearls })}
                  </p>
                </div>
                <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${Math.round(goal.proximity * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </HubSection>
      )}

      <EconomyExplainer isPro={isPremium} context="loja" />

      <HubSection
        id="baus"
        title={t("hub.yourChests")}
        desc={isPremium ? t("hub.yourChestsDescPro") : t("hub.yourChestsDesc")}
      >
        <div className="grid gap-2 sm:grid-cols-2">
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
        const meta =
          category === "qi"
            ? { label: t("hub.shopCatQi"), desc: t("hub.shopCatQiDesc") }
            : category === "perolas"
              ? { label: t("hub.shopCatPearls"), desc: t("hub.shopCatPearlsDesc") }
              : { label: t("hub.shopCatPro"), desc: t("hub.shopCatProDesc") };
        return (
          <HubSection key={category} title={meta.label} desc={meta.desc}>
            <div className="grid gap-2 sm:grid-cols-2">
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
        {t("hub.shopNoProgress")}
      </p>

      {openChestType && (
        <ChestRewardModal type={openChestType} onClose={() => setOpenChestType(null)} />
      )}

      {lastShopPurchaseFeedback && (
        <PurchaseFeedbackModal
          feedback={lastShopPurchaseFeedback}
          onClose={() => clearShopPurchaseFeedback()}
        />
      )}

      {showAutoExplain && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-labelledby="pearl-auto-title"
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-4 shadow-lift"
          >
            <h2 id="pearl-auto-title" className="text-base font-semibold text-ink">
              {t("hub.autoActivateTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{displayInstruction(PEARL_PRO_COPY.autoExplain)}</p>
            <p className="mt-2 text-xs text-ink-faint">
              {t("hub.autoActivatePaidSafe")}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => setShowAutoExplain(false)}>
                {t("hub.autoActivateLater")}
              </Button>
              <Button onClick={confirmAutoActivate}>{t("hub.autoActivateConfirm")}</Button>
            </div>
          </div>
        </div>
      )}
    </HubPage>
  );
}

function PurchaseFeedbackModal({
  feedback,
  onClose,
}: {
  feedback: ShopPurchaseFeedback;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const item = shopItemsByCategory("qi")
    .concat(shopItemsByCategory("perolas"), shopItemsByCategory("pro"))
    .find((i) => i.id === feedback.itemId);
  const currencyLabel = item?.currency === "pearl" ? t("hub.pearls") : "Qi";
  const isProPass = item?.kind === "pearl_pro_pass";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="purchase-feedback-title"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-4 shadow-lift"
      >
        <h2 id="purchase-feedback-title" className="text-base font-semibold text-ink">
          {t("hub.purchaseConfirmed")}
        </h2>
        <dl className="mt-3 space-y-1.5 text-sm text-ink-soft">
          <div className="flex justify-between gap-3">
            <dt>{t("hub.previousBalance")}</dt>
            <dd className="font-semibold text-ink tabular-nums">
              {feedback.balanceBefore} {currencyLabel}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>{t("hub.price")}</dt>
            <dd className="font-semibold text-ink tabular-nums">
              −{feedback.cost} {currencyLabel}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>{t("hub.remainingBalance")}</dt>
            <dd className="font-semibold text-ink tabular-nums">
              {feedback.balanceAfter} {currencyLabel}
            </dd>
          </div>
          <div className="pt-1">
            <dt className="text-xs text-ink-faint">{t("hub.benefit")}</dt>
            <dd className="mt-0.5 text-ink">{displayInstruction(feedback.benefit)}</dd>
          </div>
          {feedback.durationLabel && (
            <div className="flex justify-between gap-3">
              <dt>{t("hub.duration")}</dt>
              <dd className="font-semibold text-ink">{displayInstruction(feedback.durationLabel)}</dd>
            </div>
          )}
          {isProPass && feedback.expiresAt && (
            <>
              <p className="pt-1 text-sm text-good">
                {t("hub.pearlProActiveUntil", { date: formatPearlProUntil(feedback.expiresAt) })}
              </p>
              <p className="text-xs text-ink-faint">{displayInstruction("Anúncios removidos enquanto o pass estiver ativo.")}</p>
            </>
          )}
        </dl>
        <Button className="mt-4 w-full" onClick={onClose}>
          {t("common.close")}
        </Button>
      </div>
    </div>
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
  const { t } = useTranslation();
  const Icon = SHOP_ICONS[item.iconKey];
  const currencyLabel = item.currency === "qi" ? "Qi" : t("hub.pearls");
  const insufficient = !item.cosmetic && item.kind !== "pro_link" && balance < item.cost;
  const chestType: ChestType | null =
    item.iconKey === "chest" ? "small" : item.iconKey === "chest_dragon" ? "dragon" : null;

  return (
    <Card className="flex min-h-36 flex-col rounded-xl border-line/70 p-3 shadow-none" data-commercial-later="">
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
            <Pill tone="good">{t("hub.inInventory", { n: count })}</Pill>
          )}
          {item.pro && item.kind !== "pearl_pro_pass" && <Pill tone="accent">{t("common.pro")}</Pill>}
          {item.kind === "pearl_pro_pass" && <Pill tone="accent">{t("shell.dayCountMany", { count: 7 })}</Pill>}
        </div>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-ink">{item.name}</h3>
      <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-soft">{item.desc}</p>

      {item.usageHint && count > 0 && (
        <p className="mt-2 text-xs leading-5 text-ink-faint">{item.usageHint}</p>
      )}

      <div className="mt-auto pt-3">
        {item.kind !== "pro_link" && (
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-accent">
            <IconStar width={15} height={15} />
            {item.cost} {currencyLabel}
          </div>
        )}

        {item.kind === "pro_link" ? (
          <Button size="sm" className="w-full" variant={isPremium ? "soft" : "primary"} onClick={onPro}>
            {isPremium ? t("hub.proActiveCta") : t("settings.seeProPlans")}
          </Button>
        ) : item.cosmetic && owned ? (
          <Button size="sm" variant="outline" className="w-full" disabled>
            {t("hub.acquired")}
          </Button>
        ) : (
          <div className="grid gap-2">
            <Button size="sm" className="w-full" disabled={!canBuy} onClick={onBuy}>
              {insufficient ? (
                <>
                  <IconLock width={14} height={14} />{" "}
                  {currencyLabel === "Qi" ? t("hub.insufficientQi") : t("hub.insufficientPearls")}
                </>
              ) : (
                t("hub.buy")
              )}
            </Button>
            {item.usableInShop && count > 0 && item.kind !== "pearl_pro_pass" && (
              <Button size="sm" variant="soft" className="w-full" onClick={onUse}>
                {count > 1 ? t("hub.useItemCount", { n: count }) : t("hub.useItem")}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
