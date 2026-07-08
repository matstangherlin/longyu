import { Link, useLocation } from "react-router-dom";
import { NAV_MOBILE, isNavItemActive } from "./nav";
import { useStore } from "../../lib/store";
import { dueItems } from "../../lib/srs";
import { buildMissionViews } from "../../data/missions";

export function TabBar() {
  const location = useLocation();
  const srs = useStore((s) => s.srs);
  const chests = useStore((s) => s.chests);
  const aggregates = useStore((s) => s.getMissionAggregates());
  const dailyMissions = useStore((s) => s.dailyMissions);
  const due = dueItems(srs).length;
  const readyChests = (chests.small ?? 0) + (chests.dragon ?? 0) + (chests.monthly ?? 0) + (chests.legendary ?? 0);
  const readyMissions = buildMissionViews("daily", aggregates, dailyMissions.claimed).filter(
    (mission) => mission.complete && !mission.claimed
  ).length;
  const badges: Record<string, number> = {
    "/treino": due,
    "/missoes": readyMissions,
    "/mais": readyChests,
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/92 shadow-[0_-12px_34px_rgb(0_0_0/0.08)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-1 pt-1">
        {NAV_MOBILE.map((item) => {
          const active = isNavItemActive(item, location.pathname);
          const badge = badges[item.to] ?? 0;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold transition active:scale-[0.98]",
                active ? "text-accent" : "text-ink-faint hover:text-ink-soft",
              ].join(" ")}
            >
              <span
                className={[
                  "relative flex h-10 w-14 items-center justify-center rounded-full transition",
                  active ? "bg-accent text-white shadow-card" : "bg-transparent",
                ].join(" ")}
              >
                <item.icon width={22} height={22} />
                {badge > 0 && !active && (
                  <span className="absolute -top-0.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-white shadow-card">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
