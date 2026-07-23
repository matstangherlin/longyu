import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  isNavItemActive,
  mobileNavForStage,
  moreMobileSheetGroups,
  practiceMobileSheetItems,
  profileFlyoutItems,
  type NavGroup,
  type NavItem,
} from "./nav";
import { useStore } from "../../lib/store";
import { useIsPro } from "../../lib/proAccess";
import { useLearnerProfile } from "../../hooks/useLearnerProfile";
import { dueItems } from "../../lib/srs";
import { buildMissionViews, isMissionActionable } from "../../data/missions";

type SheetKind = "praticar" | "perfil" | "mais";

export function TabBar() {
  const location = useLocation();
  const srs = useStore((s) => s.srs);
  const chests = useStore((s) => s.chests);
  const aggregates = useStore((s) => s.getMissionAggregates());
  const dailyMissions = useStore((s) => s.dailyMissions);
  const isPro = useIsPro();
  const profile = useLearnerProfile();
  const items = mobileNavForStage(profile.stage);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const routeKey = `${location.pathname}${location.hash}`;

  const due = dueItems(srs).length;
  const readyChests =
    (chests.small ?? 0) + (chests.dragon ?? 0) + (chests.monthly ?? 0) + (chests.legendary ?? 0);
  const readyMissions = buildMissionViews("daily", aggregates, dailyMissions.claimed).filter(
    (mission) => mission.complete && !mission.claimed && isMissionActionable(mission, isPro)
  ).length;
  const badges: Record<string, number> = {
    "/revisao": due,
    "/missoes": readyMissions,
    "/mais": readyChests,
  };

  useEffect(() => {
    setSheet(null);
  }, [routeKey]);

  function sheetForItem(item: NavItem): SheetKind | null {
    if (item.to === "/treino") return "praticar";
    if (item.to === "/perfil") return "perfil";
    if (item.to === "/mais") return "mais";
    return null;
  }

  const sheetConfig = sheet
    ? {
        praticar: {
          title: "Praticar",
          groups: [{ title: "Praticar", items: practiceMobileSheetItems(items) }] as NavGroup[],
          footer: { to: "/treino", label: "Abrir Praticar" },
        },
        perfil: {
          title: "Perfil",
          groups: [{ title: "Perfil", items: profileFlyoutItems() }] as NavGroup[],
          footer: { to: "/perfil", label: "Abrir Perfil" },
        },
        mais: {
          title: "Mais opções",
          groups: moreMobileSheetGroups(items),
          footer: { to: "/mais", label: "Ver menu completo" },
        },
      }[sheet]
    : null;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-surface/95 shadow-[0_-4px_20px_rgb(0_0_0/0.05)] backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Principal"
      >
        <div className="mx-auto flex min-h-16 max-w-md items-stretch justify-around px-1 py-1">
          {items.map((item) => {
            const active = isNavItemActive(item, location.pathname);
            const badge = badges[item.to] ?? 0;
            const kind = sheetForItem(item);
            const open = kind !== null && sheet === kind;
            const className = [
              "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/45 active:scale-[0.98]",
              active || open ? "text-accent" : "text-ink-faint",
            ].join(" ");
            const iconWrap = [
              "relative flex h-9 w-12 items-center justify-center rounded-full transition sm:w-14",
              active || open ? "bg-accent text-white shadow-card" : "",
            ].join(" ");

            const content = (
              <>
                <span className={iconWrap}>
                  <item.icon width={20} height={20} />
                  {badge > 0 && !active && !open && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 text-[8px] font-bold leading-none text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </>
            );

            if (kind) {
              return (
                <button
                  key={item.to}
                  type="button"
                  className={className}
                  aria-current={active ? "page" : undefined}
                  aria-haspopup="dialog"
                  aria-expanded={open}
                  onClick={() => setSheet((current) => (current === kind ? null : kind))}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={className}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {sheetConfig && (
        <TabSheet
          title={sheetConfig.title}
          groups={sheetConfig.groups}
          footer={sheetConfig.footer}
          pathname={location.pathname}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

function TabSheet({
  title,
  groups,
  footer,
  pathname,
  onClose,
}: {
  title: string;
  groups: NavGroup[];
  footer: { to: string; label: string };
  pathname: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/55 backdrop-blur-sm lg:hidden"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-pop flex w-full max-h-[min(32rem,78dvh)] flex-col rounded-t-[28px] border border-line/70 bg-surface shadow-lift"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center px-4 pt-3 pb-2">
          <div className="h-1.5 w-10 rounded-full bg-line/80" aria-hidden="true" />
          <h2 id={titleId} className="mt-3 text-base font-bold text-ink">
            {title}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          {groups.map((group, groupIndex) => (
            <div
              key={group.title}
              className={groupIndex === 0 ? "" : "mt-3 border-t border-line/60 pt-3"}
            >
              {groups.length > 1 && (
                <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                  {group.title}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavItemActive(item, pathname);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={[
                        "flex min-h-14 items-center gap-2.5 rounded-2xl border px-3 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
                        active
                          ? "border-accent/50 bg-accent-soft text-accent"
                          : "border-line/60 bg-surface-2/80 text-ink hover:bg-surface-2",
                      ].join(" ")}
                    >
                      <Icon width={20} height={20} aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-line/60 px-3 pt-3">
          <Link
            to={footer.to}
            onClick={onClose}
            className="flex min-h-12 items-center justify-center rounded-2xl bg-accent px-4 text-sm font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
          >
            {footer.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
