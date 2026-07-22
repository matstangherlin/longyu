import { Button, ButtonLink, Card } from "../ui/primitives";
import { Mascot } from "../brand/Mascot";
import { useFeatureDiscovery } from "../../hooks/useFeatureDiscovery";

/**
 * Anúncio discreto de área recém-liberada. Um card por vez, dispensável e
 * persistido — nunca um modal, nunca em sequência com outro modal. Fica no hub
 * (Jornada), então não interrompe nenhuma lição.
 */
export function FeatureDiscoveryCard() {
  const { announcement, dismiss } = useFeatureDiscovery();
  if (!announcement) return null;

  return (
    <Card
      variant="info"
      className="flex items-center gap-3 p-3 sm:p-3.5"
      role="status"
      aria-live="polite"
    >
      <Mascot size={44} variant="celebrate" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[rgb(var(--good)/0.14)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[rgb(var(--good))]">
            Novo
          </span>
          <h3 className="truncate text-sm font-semibold text-ink">{announcement.title}</h3>
        </div>
        <p className="mt-0.5 text-xs leading-4 text-ink-soft">{announcement.desc}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <ButtonLink to={announcement.to} size="sm" onClick={dismiss}>
            {announcement.cta}
          </ButtonLink>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Depois
          </Button>
        </div>
      </div>
    </Card>
  );
}
