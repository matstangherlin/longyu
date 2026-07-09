import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../lib/store";
import { IconFlame, IconShield, IconStar, IconUser } from "../ui/Icon";
import { BrandWordmark } from "./Brand";
import { useCloudSignOut } from "../../hooks/useCloudSignOut";
import { useIsPro } from "../../lib/proAccess";

function StatPill({
  to,
  icon: Icon,
  value,
  label,
  className,
}: {
  to?: string;
  icon: typeof IconShield;
  value: ReactNode;
  label: string;
  className?: string;
}) {
  const inner = (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border border-line/50 bg-surface/90 px-2 py-1 text-[11px] font-semibold tabular-nums text-ink sm:gap-1.5 sm:px-2.5 sm:text-xs",
        className,
      ].join(" ")}
      aria-label={label}
    >
      <Icon width={13} height={13} className="shrink-0 text-accent sm:h-3.5 sm:w-3.5" />
      <span className="text-accent">{value}</span>
    </span>
  );
  if (!to) return inner;
  return (
    <Link to={to} className="transition hover:opacity-80">
      {inner}
    </Link>
  );
}

export function TopBar() {
  const streak = useStore((s) => s.streak);
  const points = useStore((s) => s.points);
  const dailyEnergy = useStore((s) => s.getActiveDailyEnergy());
  const isPremium = useIsPro();
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const account = accounts?.[currentAccountId];
  const { signOut, canSignOut } = useCloudSignOut();

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-2 border-b border-line/60 bg-bg/90 px-3 backdrop-blur-md sm:px-5 lg:h-14">
      <div className="min-w-0 shrink lg:hidden">
        <Link to="/jornada" aria-label="Longyu">
          <BrandWordmark className="text-[1.2rem] sm:text-[1.3rem]" />
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <StatPill
          to="/loja"
          icon={IconShield}
          value={isPremium ? "∞" : `${dailyEnergy.charges}/${dailyEnergy.maxCharges}`}
          label={isPremium ? "Cargas infinitas" : `Cargas: ${dailyEnergy.charges} de ${dailyEnergy.maxCharges}`}
        />
        <StatPill
          to="/loja"
          icon={IconStar}
          value={points}
          label={`Qi: ${points}`}
        />
        <StatPill
          icon={IconFlame}
          value={streak}
          label={`Sequência: ${streak} ${streak === 1 ? "dia" : "dias"}`}
        />
        <Link
          to="/perfil"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line/50 bg-surface text-accent transition hover:bg-surface-2 sm:h-9 sm:w-9"
          aria-label={account?.name ? `Conta: ${account.name}` : "Conta"}
        >
          <IconUser width={15} height={15} className="sm:h-4 sm:w-4" />
        </Link>
        {canSignOut && (
          <button
            type="button"
            onClick={() => void signOut()}
            className="hidden h-8 shrink-0 items-center rounded-full border border-wrong/25 bg-wrong-soft px-2.5 text-[11px] font-semibold text-wrong transition hover:bg-wrong/10 sm:flex"
          >
            Sair
          </button>
        )}
      </div>
    </header>
  );
}
