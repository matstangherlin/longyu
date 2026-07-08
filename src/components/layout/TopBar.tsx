import { Link, useLocation } from "react-router-dom";
import { useStore } from "../../lib/store";
import { IconFlame, IconShield, IconStar, IconUser } from "../ui/Icon";
import { BrandWordmark } from "./Brand";
import { useCloudSignOut } from "../../hooks/useCloudSignOut";

// Barra superior fina: marca + indicadores essenciais.
export function TopBar() {
  const location = useLocation();
  const streak = useStore((s) => s.streak);
  const points = useStore((s) => s.points);
  const dailyEnergy = useStore((s) => s.getActiveDailyEnergy());
  const isPremium = useStore((s) => s.isPremium);
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const account = accounts?.[currentAccountId];
  const activityFocus = /^\/(licao|teste)\//.test(location.pathname);
  const { signOut, canSignOut } = useCloudSignOut();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-line bg-bg/85 px-3 backdrop-blur sm:px-6">
      <div className="min-w-0 shrink lg:hidden">
        <Link to="/" aria-label="Longyu">
          <BrandWordmark className="text-[1.35rem] sm:text-[1.45rem]" />
        </Link>
      </div>

      {/* Mobile mostra só Cargas + sequência; Conta e Qi ficam no desktop
          (no mobile, perfil e Qi vivem em Meu e na Loja). */}
      <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap sm:gap-2">
        <Link
          to="/perfil"
          className="hidden h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:bg-surface-2 lg:flex"
          aria-label="Conta"
        >
          <IconUser width={16} height={16} className="text-accent" />
          <span className="max-w-[120px] truncate">
            {account?.name ?? "Conta"}
          </span>
        </Link>
        {/* Ultra-compacto no mobile: sempre visível, até em 360px. */}
        <div
          className={[
            "items-center gap-1 rounded-full border border-line bg-surface px-2 py-1 text-xs font-semibold tabular-nums text-accent sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm",
            activityFocus ? "hidden lg:flex" : "flex",
          ].join(" ")}
          aria-label={isPremium ? "Cargas infinitas" : `Cargas: ${dailyEnergy.charges} de ${dailyEnergy.maxCharges}`}
        >
          <IconShield width={14} height={14} className="sm:h-4 sm:w-4" />
          {isPremium ? "∞" : `${dailyEnergy.charges}/${dailyEnergy.maxCharges}`}
          <span className="hidden font-normal text-ink-faint sm:inline">Cargas</span>
        </div>
        <div className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-accent lg:flex">
          <IconStar width={16} height={16} />
          {points}
          <span className="font-normal text-ink-faint">Qi</span>
        </div>
        <div
          className={[
            "items-center gap-1 rounded-full border border-line bg-surface px-2 py-1 text-xs font-semibold tabular-nums text-accent sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm",
            activityFocus ? "hidden lg:flex" : "flex",
          ].join(" ")}
          aria-label={`Sequência: ${streak} ${streak === 1 ? "dia" : "dias"}`}
        >
          <IconFlame width={14} height={14} className="sm:h-4 sm:w-4" />
          {streak}
          <span className="hidden font-normal text-ink-faint sm:inline">{streak === 1 ? "dia" : "dias"}</span>
        </div>
        {canSignOut && (
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex h-9 shrink-0 items-center rounded-full border border-wrong/30 bg-wrong-soft px-3 text-xs font-bold text-wrong transition hover:bg-wrong/15 sm:px-4 sm:text-sm"
          >
            Sair
          </button>
        )}
      </div>
    </header>
  );
}
