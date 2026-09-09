import { getCultureItem, localizedCulture } from "../../data/culture";
import { Button, ButtonLink } from "../../components/ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";
import type { SupportedLocale } from "../../i18n/config";

export function CultureTouchpoint({
  cultureItemId,
  lessonId,
  from,
  onSave,
  onContinue,
  saved,
}: {
  cultureItemId: string;
  lessonId: string;
  from: string;
  onSave: () => void;
  onContinue: () => void;
  saved: boolean;
}) {
  const { t, instructionLocale } = useTranslation();
  const item = getCultureItem(cultureItemId);
  if (!item) return null;
  const copy = localizedCulture(item, instructionLocale as SupportedLocale);
  const href = `/cultura/${item.id}?from=${encodeURIComponent(from)}&src=journey&lesson=${encodeURIComponent(lessonId)}`;
  return (
    <aside
      className="mt-4 rounded-2xl border border-accent/25 bg-accent-soft/20 p-3 text-left"
      data-testid="culture-touchpoint"
      data-culture-id={item.id}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{t("culture.touchpointEyebrow")}</p>
      <p className="mt-1 font-serif text-base font-semibold text-ink">{copy.title}</p>
      <p className="mt-1 text-sm leading-5 text-ink-soft">{copy.summary}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <ButtonLink to={href} className="min-h-11 w-full" data-testid="culture-touchpoint-open">
          {t("culture.startMission")}
        </ButtonLink>
        <Button variant="outline" className="min-h-11 w-full" onClick={onSave} disabled={saved} data-testid="culture-touchpoint-save">
          {saved ? t("culture.saved") : t("culture.saveForLater")}
        </Button>
        <Button variant="ghost" className="min-h-11 w-full" onClick={onContinue} data-testid="culture-touchpoint-continue">
          {t("culture.keepGoing")}
        </Button>
      </div>
      <p className="mt-2 text-xs text-ink-faint">{t("culture.touchpointHint")}</p>
    </aside>
  );
}
