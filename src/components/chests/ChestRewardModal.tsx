import { useStore, type ChestType } from "../../lib/store";
import { localizedChestVisual } from "./chestMeta";
import { ChestOpeningRitual } from "./ChestOpeningRitual";

// Modal de abertura de baú da Loja e das Missões: fechado -> ritual -> revelação.
// As recompensas são aplicadas no store ao abrir; o ritual só revela o resultado.
// RC2.3.13R.3.2.5 — o ritual (resgate único, revelação imediata com movimento
// reduzido, estado "indisponível" honesto) mora em ChestOpeningRitual, o mesmo
// da Jornada.
export function ChestRewardModal({ type, onClose }: { type: ChestType; onClose: () => void }) {
  const openChest = useStore((s) => s.openChest);
  const visual = localizedChestVisual(type);
  return <ChestOpeningRitual type={type} title={visual.name} claim={() => openChest(type)} onClose={onClose} />;
}
