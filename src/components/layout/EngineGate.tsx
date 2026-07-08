import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useStore } from "../../lib/store";
import {
  ENGINE_UNLOCK_COPY,
  TREINO_UNLOCK_COPY,
  type EngineTrack,
} from "../../lib/journeyUnlocks";
import { canUsePracticeTool, useIsPro } from "../../lib/proAccess";
import { Card, Button } from "../ui/primitives";
import { IconLock } from "../ui/Icon";

interface EngineGateProps {
  track?: EngineTrack;
  /** Treino livre (página /treino) — regra diferente das competências. */
  mode?: "engine" | "treino";
  children: ReactNode;
}

export function EngineGate({ track, mode = "engine", children }: EngineGateProps) {
  const completed = useStore((s) => s.completedLessons);
  const isPremium = useIsPro();
  const access =
    mode === "treino"
      ? canUsePracticeTool("treino", { isPremium, completedLessons: completed })
      : track
      ? canUsePracticeTool(track, { isPremium, completedLessons: completed })
      : { allowed: true };

  if (access.allowed) return <>{children}</>;

  const copy =
    mode === "treino"
      ? TREINO_UNLOCK_COPY
      : track
      ? ENGINE_UNLOCK_COPY[track]
      : TREINO_UNLOCK_COPY;
  const hub = hubForLockedTool(track, mode);

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 text-ink-faint">
        <IconLock width={32} height={32} />
      </div>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">{copy.title} bloqueado</h1>
        <p className="mt-2 text-sm text-ink-soft">{copy.desc}</p>
        <p className="mt-1 text-xs text-ink-faint">Libera após: {copy.after}</p>
      </div>
      <Card className="p-4 text-left text-sm text-ink-soft">
        A jornada é a trilha principal. Cada competência abre quando você já praticou o básico na ordem certa —
        som depois das primeiras frases, hànzì depois dos tons, leitura depois do vocabulário fechado.
      </Card>
      <Link to="/">
        <Button size="lg" className="w-full sm:w-auto">
          Continuar na jornada
        </Button>
      </Link>
      {hub && (
        <Link to={hub.to}>
          <Button size="lg" variant="outline" className="w-full sm:w-auto">
            {hub.label}
          </Button>
        </Link>
      )}
    </div>
  );
}

function hubForLockedTool(track: EngineTrack | undefined, mode: "engine" | "treino") {
  if (mode === "treino") return { to: "/treino", label: "Abrir Praticar" };
  if (track === "hanzi") return { to: "/ideogramas", label: "Abrir Ideogramas" };
  if (track === "som" || track === "fala" || track === "leitura") return { to: "/treino", label: "Abrir Praticar" };
  return undefined;
}
