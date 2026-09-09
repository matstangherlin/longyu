import { Link } from "react-router-dom";
import type { CultureCategory, CultureItem } from "../../data/culture";
import { cultureCardStatus, type CultureCardStatus } from "../../lib/cultureProgress";
import { Card, Pill } from "../../components/ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";
import type { MessageKey } from "../../locales/pt-BR";

const CATEGORY_KEYS: Record<CultureCategory, MessageKey> = {
  home_visits: "culture.categoryHomeVisits",
  table_food: "culture.categoryTableFood",
  social_etiquette: "culture.categorySocialEtiquette",
  gifts: "culture.categoryGifts",
  school_work: "culture.categorySchoolWork",
  festivals: "culture.categoryFestivals",
  contemporary_china: "culture.categoryContemporaryChina",
  daily_life: "culture.categoryDailyLife",
  transport_public: "culture.categoryTransportPublic",
  communication_relations: "culture.categoryCommunication",
};

const STATUS_KEYS: Record<CultureCardStatus, MessageKey> = {
  new: "culture.statusNew",
  in_progress: "culture.statusInProgress",
  completed: "culture.statusCompleted",
};

const STATUS_TONE: Record<CultureCardStatus, "accent" | "gold" | "good"> = {
  new: "accent",
  in_progress: "gold",
  completed: "good",
};

export function cultureCategoryLabel(
  category: CultureCategory,
  t: (key: MessageKey) => string
): string {
  return t(CATEGORY_KEYS[category]);
}

export function CultureCard({
  item,
  title,
  completedIds,
  savedIds,
  startedIds,
  to,
  cta,
}: {
  item: CultureItem;
  title: string;
  completedIds: readonly string[];
  savedIds: readonly string[];
  startedIds: readonly string[];
  to: string;
  cta: string;
}) {
  const { t } = useTranslation();
  const status = cultureCardStatus(item.id, completedIds, savedIds, startedIds);
  return (
    <Link
      to={to}
      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      data-testid="culture-card"
      data-culture-id={item.id}
      data-culture-status={status}
    >
      <Card variant="interactive" className="flex h-full min-h-[7.5rem] flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            {cultureCategoryLabel(item.category, t)}
          </p>
          <Pill tone={STATUS_TONE[status]}>{t(STATUS_KEYS[status])}</Pill>
        </div>
        <h3 className="mt-2 text-balance font-serif text-base font-semibold leading-snug text-ink">{title}</h3>
        <p className="mt-auto pt-3 text-xs text-ink-soft">
          {t("culture.minutes", { n: item.estimatedMinutes })}
          <span className="ml-2 font-medium text-accent">{cta}</span>
        </p>
      </Card>
    </Link>
  );
}
