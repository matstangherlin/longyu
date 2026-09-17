import { Link, useParams } from "react-router-dom";
import {
  CULTURE_COLLECTIONS,
  cultureItemsInCollection,
  type CultureCollectionId,
} from "../../data/cultureCollections";
import { localizedCulture } from "../../data/culture";
import { HubHeader, HubPage } from "../../components/layout/HubLayout";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";
import type { MessageKey } from "../../locales/pt-BR";
import { CultureCard } from "./CultureCard";

function isCollectionId(value: string | undefined): value is CultureCollectionId {
  return Boolean(value && CULTURE_COLLECTIONS.some((collection) => collection.id === value));
}

export function CultureCollectionPage() {
  const { collectionId } = useParams();
  const { t, instructionLocale } = useTranslation();
  const completedIds = useStore((s) => s.cultureCompletedIds);
  const savedIds = useStore((s) => s.cultureSavedIds);
  const startedIds = useStore((s) => s.cultureStartedIds);
  const saveCultureItem = useStore((s) => s.saveCultureItem);

  if (!isCollectionId(collectionId)) {
    return (
      <HubPage data-testid="culture-collection-missing">
        <HubHeader eyebrow={t("culture.eyebrow")} title={t("culture.missingTitle")} desc={t("culture.missingBody")} />
        <Link to="/cultura" className="text-sm text-accent underline-offset-2 hover:underline">
          {t("culture.backToHub")}
        </Link>
      </HubPage>
    );
  }

  const collection = CULTURE_COLLECTIONS.find((entry) => entry.id === collectionId)!;
  const items = cultureItemsInCollection(collectionId);
  const done = items.filter((item) => completedIds.includes(item.id)).length;
  const total = items.length;
  const empty = total === 0;

  return (
    <HubPage data-testid="culture-collection-page" data-collection-id={collectionId}>
      <p className="text-sm">
        <Link to="/cultura" className="text-accent underline-offset-2 hover:underline" data-testid="culture-collection-back">
          ← {t("culture.backToHub")}
        </Link>
      </p>
      <HubHeader
        eyebrow={t("culture.eyebrow")}
        title={t(collection.titleKey as MessageKey)}
        desc={t(collection.blurbKey as MessageKey)}
      />

      {empty ? (
        <div
          className="rounded-2xl border border-dashed border-line bg-surface px-4 py-8 text-center"
          data-testid="culture-collection-preparing"
        >
          <p className="font-serif text-lg font-semibold text-ink">{t("culture.collectionPreparing")}</p>
          <p className="mt-2 text-sm text-ink-soft">{t("culture.collectionPreparingBody")}</p>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-ink" data-testid="culture-collection-progress">
            {t("culture.collectionProgress", { done, total })}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.round((done / Math.max(total, 1)) * 100)}%` }}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {items.map((item) => (
              <CultureCard
                key={item.id}
                item={item}
                title={localizedCulture(item, instructionLocale).title}
                completedIds={completedIds}
                savedIds={savedIds}
                startedIds={startedIds}
                to={`/cultura/${item.id}`}
                cta={t("culture.learn")}
                onSave={(itemId) => saveCultureItem(itemId, true)}
              />
            ))}
          </div>
        </>
      )}
    </HubPage>
  );
}
