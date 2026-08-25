/**
 * Gramática visual de /missoes.
 *
 * MissionSurface  página
 * MissionSection  bloco diário/semanal/coleção
 * MissionCard     card de missão
 * MissionProgress barra + rótulo
 * MissionReward   pill de recompensa
 * MissionAction   CTA único (primário) + opcional secundário
 * MissionStatus   incomplete | progress | complete | claimed | premium
 *
 * Tokens (alinhados a primitives):
 * - card radius: rounded-2xl (16px)
 * - card padding: p-3.5
 * - section gap: gap-2
 * - title: text-sm font-semibold
 * - description: text-xs leading-4
 * - icon tile: 36×36 rounded-xl
 * - CTA: Button sm no card, md no hero, lg no modal
 * - CTA min height: 44px (min-h-11)
 */
import { cx, type ButtonVariant } from "../../components/ui/primitives";

export type MissionUiStatus = "incomplete" | "progress" | "complete" | "claimed" | "premium";

export const missionUi = {
  surface: "relative min-w-0 space-y-5 lg:pr-[var(--app-feedback-fab-gutter)]",
  card: "flex min-h-[var(--mission-card-min-height)] min-w-0 flex-col p-3.5 shadow-none",
  hero: "min-w-0 overflow-hidden p-3.5 shadow-none sm:p-4",
  iconTile:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
  title: "min-w-0 break-words text-sm font-semibold leading-5 text-ink",
  desc: "mt-0.5 min-w-0 break-words text-xs leading-4 text-ink-soft",
  reward:
    "inline-flex max-w-full items-center rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold leading-4 text-accent",
  progressWrap: "mt-4 min-w-0",
  actionWrap: "mt-auto grid w-full min-w-0 grid-cols-1 gap-2 pt-4",
  grid: "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3",
  collectionGrid: "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",
  chestRow:
    "grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center",
} as const;

export function missionCardVariant(
  status: MissionUiStatus
): "basic" | "progress" | "reward" | "premium" {
  if (status === "complete") return "progress";
  if (status === "claimed") return "reward";
  if (status === "premium") return "premium";
  return "basic";
}

export function missionStatusOf(input: {
  complete: boolean;
  claimed: boolean;
  lockedPro: boolean;
  progress: number;
}): MissionUiStatus {
  if (input.claimed) return "claimed";
  if (input.complete && input.lockedPro) return "premium";
  if (input.complete) return "complete";
  if (input.progress > 0) return "progress";
  return "incomplete";
}

export function missionCta(status: MissionUiStatus): {
  label: string;
  variant: ButtonVariant;
  disabled?: boolean;
} {
  switch (status) {
    case "claimed":
      return { label: "Resgatada", variant: "outline", disabled: true };
    case "premium":
      return { label: "Resgatar com Pro", variant: "premium" };
    case "complete":
      return { label: "Resgatar", variant: "primary" };
    case "progress":
      return { label: "Praticar", variant: "soft" };
    default:
      return { label: "Praticar", variant: "primary" };
  }
}

export function missionIconTileClass(status: MissionUiStatus): string {
  return cx(
    missionUi.iconTile,
    status === "claimed" && "bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]",
    status === "complete" && "bg-accent text-white",
    status === "premium" && "bg-gold/15 text-gold",
    (status === "incomplete" || status === "progress") && "bg-accent-soft text-accent"
  );
}
