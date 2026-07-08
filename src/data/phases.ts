import type { Phase } from "./types";
import { JOURNEY } from "./journey";

/** Metadados das fases — status real vem do progresso na jornada. */
export const PHASES: Phase[] = JOURNEY.map((p) => ({
  id: p.id,
  order: p.order,
  title: p.title,
  subtitle: p.why,
  goal: p.units.map((u) => u.goal).join(" · "),
  status: "locked" as const,
}));
