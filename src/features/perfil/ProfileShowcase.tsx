import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../lib/store";
import { ACHIEVEMENTS, isMedalAchievementId } from "../../data/achievements";
import { CULTURE_SEALS, cultureText } from "../../data/cultureQuest";
import { PROFILE_COSMETICS, getProfileCosmetic, type ProfileCosmeticSlot } from "../../data/profileCosmetics";
import { FEATURED_ACHIEVEMENTS_MAX, normalizeFeaturedAchievementIds } from "../../lib/profileShowcase";
import { CompactCard } from "../../components/ui/page";
import { Button } from "../../components/ui/primitives";
import { IconChevron } from "../../components/ui/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { localizedAchievementDesc, localizedAchievementTitle } from "../../i18n/achievements";

/**
 * RC2.2.8 · G5 — vitrine de medalhas. Até 3, só desbloqueadas, na ordem que o
 * aluno escolheu. Medalha bloqueada nem aparece no seletor, e a store recusa
 * destacá-la mesmo por chamada direta (G5.4).
 */
export function FeaturedMedals() {
  const { t } = useTranslation();
  const unlocked = useStore((s) => s.achievementsUnlocked ?? {});
  const featuredRaw = useStore((s) => s.featuredAchievementIds);
  const toggleFeatured = useStore((s) => s.toggleFeaturedAchievement);
  const [choosing, setChoosing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // RC2.2.11 — vitrine só de MEDALHAS (marcos e conquistas ficam em /conquistas).
  const featured = normalizeFeaturedAchievementIds(featuredRaw, unlocked, undefined, isMedalAchievementId);
  const featuredDefs = featured
    .map((id) => ACHIEVEMENTS.find((def) => def.id === id))
    .filter((def): def is (typeof ACHIEVEMENTS)[number] => Boolean(def));
  const unlockedDefs = ACHIEVEMENTS.filter((def) => unlocked[def.id] && isMedalAchievementId(def.id)).sort(
    (a, b) => (unlocked[b.id] ?? 0) - (unlocked[a.id] ?? 0)
  );

  function toggle(id: string) {
    const result = toggleFeatured(id, isMedalAchievementId);
    setNotice(
      result.reason === "full"
        ? t("hub.featuredFull")
        : result.reason === "locked"
          ? t("hub.featuredLockedHint")
          : result.reason === "not_medal"
            ? t("hub.featuredNotMedal")
            : null
    );
  }

  return (
    <CompactCard>
      <div data-testid="profile-featured-medals" data-featured-count={featured.length}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{t("hub.featuredMedals")}</div>
          <span className="text-[11px] tabular-nums text-ink-faint">
            {featured.length}/{FEATURED_ACHIEVEMENTS_MAX}
          </span>
        </div>
        {featuredDefs.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {featuredDefs.map((def) => (
              <div
                key={def.id}
                data-testid={`profile-featured-${def.id}`}
                className="flex min-w-0 flex-col items-center rounded-xl border border-gold/30 bg-gold/10 px-2 py-2.5 text-center"
              >
                <span className="hanzi text-3xl leading-none text-gold" aria-hidden>
                  {def.glyph}
                </span>
                <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-ink">
                  {localizedAchievementTitle(def.id, def.title)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-ink-soft">{t("hub.featuredEmpty")}</p>
        )}

        {unlockedDefs.length > 0 && (
          <Button
            size="sm"
            variant={choosing ? "primary" : "outline"}
            className="mt-3 w-full"
            data-testid="profile-choose-medals"
            onClick={() => setChoosing((open) => !open)}
          >
            {choosing ? t("hub.doneChoosing") : t("hub.chooseMedals")}
          </Button>
        )}

        {choosing && (
          <div className="mt-3 space-y-1.5" data-testid="profile-medal-picker">
            <p className="text-[11px] text-ink-faint">{t("hub.featuredMedalsHint")}</p>
            {unlockedDefs.map((def) => {
              const active = featured.includes(def.id);
              return (
                <button
                  key={def.id}
                  type="button"
                  aria-pressed={active}
                  data-testid={`profile-medal-toggle-${def.id}`}
                  onClick={() => toggle(def.id)}
                  className={[
                    "flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition",
                    active ? "border-gold bg-gold/10" : "border-line/60 bg-surface-2/60 hover:border-accent/40",
                  ].join(" ")}
                >
                  <span className="hanzi w-7 shrink-0 text-center text-xl text-gold" aria-hidden>
                    {def.glyph}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">
                      {localizedAchievementTitle(def.id, def.title)}
                    </span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      {localizedAchievementDesc(def.id, def.desc)}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-accent">{active ? "★" : "☆"}</span>
                </button>
              );
            })}
            {notice && (
              <p role="status" className="text-[11px] font-medium text-accent">
                {notice}
              </p>
            )}
          </div>
        )}

        <Link
          to="/conquistas"
          className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          data-testid="profile-see-all-medals"
        >
          {t("hub.seeAllMedals")} <IconChevron width={13} height={13} />
        </Link>
      </div>
    </CompactCard>
  );
}

/**
 * RC2.2.8 · G7 — Passaporte Cultural. Selo ≠ medalha: aqui mora o progresso
 * cultural funcional (selos abrem marcos da Jornada). Não há como "destacar"
 * um selo na vitrine de medalhas, nem medalha aparece aqui.
 */
export function CulturePassportCard() {
  const { t, instructionLocale } = useTranslation();
  const seals = useStore((s) => s.cultureSeals ?? []);
  const earned = CULTURE_SEALS.filter((seal) => seals.includes(seal.id)).length;
  return (
    <CompactCard>
      <div data-testid="profile-culture-passport" data-seal-count={earned}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{t("hub.culturePassport")}</div>
          <span className="text-[11px] tabular-nums text-ink-faint">
            {t("hub.culturePassportCount", { n: earned, total: CULTURE_SEALS.length })}
          </span>
        </div>
        <p className="mb-2 text-[11px] text-ink-faint">{t("hub.culturePassportHint")}</p>
        <div className="flex flex-wrap gap-1.5">
          {CULTURE_SEALS.map((seal) => {
            const has = seals.includes(seal.id);
            return (
              <span
                key={seal.id}
                data-testid={`profile-seal-${seal.id}`}
                data-earned={has ? "true" : "false"}
                className={[
                  "inline-flex min-h-9 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]",
                  has ? "border-gold bg-gold/10 text-ink" : "border-line bg-surface text-ink-faint opacity-70",
                ].join(" ")}
              >
                <span aria-hidden>{seal.emoji}</span>
                {cultureText({ pt: seal.titlePt, en: seal.titleEn }, instructionLocale)}
              </span>
            );
          })}
        </div>
        <Link to="/cultura" className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
          {t("culture.title")} <IconChevron width={13} height={13} />
        </Link>
      </div>
    </CompactCard>
  );
}

/** RC2.2.8 · H5 — equipar moldura e título comprados com Pérolas. */
export function CustomizeProfileCard() {
  const { t, instructionLocale } = useTranslation();
  const owned = useStore((s) => s.ownedCosmetics ?? []);
  const frameId = useStore((s) => s.profileFrameId ?? null);
  const titleId = useStore((s) => s.profileTitleId ?? null);
  const equip = useStore((s) => s.equipProfileCosmetic);
  const ownedCosmetics = PROFILE_COSMETICS.filter((cosmetic) => owned.includes(cosmetic.id));

  function equippedFor(slot: ProfileCosmeticSlot) {
    return slot === "frame" ? frameId : titleId;
  }

  return (
    <CompactCard>
      <div data-testid="profile-customize">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{t("hub.customizeProfile")}</div>
        {ownedCosmetics.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-ink-soft">{t("hub.customizeEmpty")}</p>
            <Link to="/loja" className="text-xs font-semibold text-accent hover:underline">
              {t("hub.goToShop")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-2">
            {ownedCosmetics.map((cosmetic) => {
              const isEquipped = equippedFor(cosmetic.slot) === cosmetic.id;
              return (
                <div
                  key={cosmetic.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2"
                  data-testid={`profile-cosmetic-${cosmetic.id}`}
                  data-equipped={isEquipped ? "true" : "false"}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-ink">
                      {instructionLocale === "en" ? cosmetic.nameEn : cosmetic.namePt}
                    </div>
                    <div className="text-[11px] text-ink-faint">
                      {cosmetic.slot === "frame" ? t("hub.frameSlot") : t("hub.titleSlot")}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isEquipped ? "outline" : "primary"}
                    data-testid={`profile-equip-${cosmetic.id}`}
                    onClick={() => equip(cosmetic.slot, isEquipped ? null : cosmetic.id)}
                  >
                    {isEquipped ? t("hub.unequip") : t("hub.equip")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CompactCard>
  );
}

/** Classes da moldura equipada (ou vazio). */
export function useProfileFrameClass(): string {
  const frameId = useStore((s) => s.profileFrameId ?? null);
  const owned = useStore((s) => s.ownedCosmetics ?? []);
  const cosmetic = getProfileCosmetic(frameId);
  return cosmetic && cosmetic.slot === "frame" && owned.includes(cosmetic.id) ? cosmetic.className : "";
}

/** Título equipado, já no idioma da interface (ou null). */
export function useProfileTitle(): { text: string; className: string } | null {
  const { instructionLocale } = useTranslation();
  const titleId = useStore((s) => s.profileTitleId ?? null);
  const owned = useStore((s) => s.ownedCosmetics ?? []);
  const cosmetic = getProfileCosmetic(titleId);
  if (!cosmetic || cosmetic.slot !== "title" || !owned.includes(cosmetic.id)) return null;
  const text = instructionLocale === "en" ? cosmetic.titleEn : cosmetic.titlePt;
  return text ? { text, className: cosmetic.className } : null;
}
