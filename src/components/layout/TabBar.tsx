import { Link, useLocation } from "react-router-dom";
import { NAV_MOBILE, isNavItemActive } from "./nav";
import { useStore } from "../../lib/store";
import { useIsPro } from "../../lib/proAccess";
import { dueItems } from "../../lib/srs";
import { buildMissionViews, isMissionActionable } from "../../data/missions";

export function TabBar() {
  const location = useLocation();
  const srs = useStore((s) => s.srs);
  const chests = useStore((s) => s.chests);
  const aggregates = useStore((s) => s.getMissionAggregates());
  const dailyMissions = useStore((s) => s.dailyMissions);
  const isPro = useIsPro();
  const due = dueItems(srs).length;
  const readyChests = (chests.small ?? 0) + (chests.dragon ?? 0) + (chests.monthly ?? 0) + (chests.legendary ?? 0);
  const readyMissions = buildMissionViews("daily", aggregates, dailyMissions.claimed).filter(
    (mission) => mission.complete && !mission.claimed && isMissionActionable(mission, isPro)
  ).length;
  const badges: Record<string, number> = {
    "/treino": due,
    "/missoes": readyMissions,
    "/mais": readyChests,
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-surface/95 shadow-[0_-4px_20px_rgb(0_0_0/0.05)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex min-h-16 max-w-md items-stretch justify-around px-1 py-1">
        {NAV_MOBILE.map((item) => {
          const active = isNavItemActive(item, location.pathname);
          const badge = badges[item.to] ?? 0;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/45 active:scale-[0.98]",
                active ? "text-accent" : "text-ink-faint",
              ].join(" ")}
            >
              <span
                className={[
                  "relative flex h-9 w-12 items-center justify-center rounded-full transition sm:w-14",
                  active ? "bg-accent text-white shadow-card" : "",
                ].join(" ")}
              >
                <item.icon width={20} height={20} />
                {badge > 0 && !active && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 text-[8px] font-bold leading-none text-white">
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
