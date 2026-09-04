import type { ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getJourneyNode } from "../../data/journeyOrchestrator";
import { useJourneyNodeAccess } from "../../hooks/useJourneyNodeAccess";
import { JourneyNodeLocked } from "./JourneyNodeLocked";

/**
 * Portão de rota para engines abertos como reforço da Jornada.
 *
 * Fica na rota, não dentro das páginas, por dois motivos. Primeiro, uniformidade:
 * `/som`, `/pinyin`, `/hanzi`, `/revisao` e `/imersao` recebem o node por query
 * e `/jornada/reforco/:nodeId` por path — um único componente cobre as duas
 * formas. Segundo, ordem de hooks: RevisaoPage e ImmersionPage têm dezenas de
 * hooks antes do primeiro return, e enfiar um early-return no meio delas é
 * como se introduz bug de renderização.
 *
 * Sem node na URL o gate é transparente: a rota livre continua livre.
 */
export function JourneyNodeGate({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const rawId = searchParams.get("journeyNode") ?? (params.nodeId ? decodeURIComponent(params.nodeId) : null);
  const node = getJourneyNode(rawId);
  const access = useJourneyNodeAccess(node);

  if (access && !access.ready) return <JourneyNodeLocked readiness={access} />;
  return <>{children}</>;
}
