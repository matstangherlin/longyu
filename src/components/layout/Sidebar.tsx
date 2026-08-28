import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { FocusEvent as ReactFocusEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  desktopNavForStage,
  moreFlyoutGroups,
  practiceFlyoutItems,
  profileFlyoutItems,
  isNavItemActive,
  navLabel,
} from "./nav";
import type { NavGroup, NavItem } from "./nav";
import { BrandLockup } from "./Brand";
import { useLearnerProfile } from "../../hooks/useLearnerProfile";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";

const FLYOUT_FALLBACK_HEIGHT = 320;
const FLYOUT_CLOSE_DELAY = 160;
const FLYOUT_LEFT = "14.35rem";

function linkClass(active: boolean) {
  return [
    "flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    active
      ? "border-2 border-accent/70 bg-accent-soft text-accent"
      : "border-2 border-transparent text-ink-soft hover:bg-surface-2 hover:text-ink",
  ].join(" ");
}

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const profile = useLearnerProfile();
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const canUseReferral = authMode === "cloud";
  const items = desktopNavForStage(profile.stage);
  const routeKey = `${location.pathname}${location.hash}`;

  // Perfil sempre imediatamente acima de Mais, fixos no rodapé da rail.
  const primaryItems = items.filter((item) => item.to !== "/perfil" && item.to !== "/mais");
  const bottomItems = items.filter((item) => item.to === "/perfil" || item.to === "/mais");

  function renderItem(item: NavItem) {
    const active = isNavItemActive(item, location.pathname);

    if (item.to === "/treino") {
      return (
        <FlyoutNavItem
          key={item.to}
          item={item}
          active={active}
          pathname={location.pathname}
          routeKey={routeKey}
          menuLabel={t("navigation.practice")}
          shortcuts={practiceFlyoutItems()}
          footer={{ to: item.to, label: t("navigation.openPractice") }}
        />
      );
    }

    if (item.to === "/perfil") {
      const profileShortcuts = canUseReferral
        ? profileFlyoutItems()
        : profileFlyoutItems().filter((shortcut) => shortcut.to !== "/convide");
      return (
        <FlyoutNavItem
          key={item.to}
          item={item}
          active={active}
          pathname={location.pathname}
          routeKey={routeKey}
          menuLabel={t("navigation.profile")}
          shortcuts={profileShortcuts}
          footer={{ to: item.to, label: t("navigation.openProfile") }}
        />
      );
    }

    if (item.to === "/mais") {
      return (
        <FlyoutNavItem
          key={item.to}
          item={item}
          active={active}
          pathname={location.pathname}
          routeKey={routeKey}
          menuLabel={t("navigation.moreOptions")}
          groups={moreFlyoutGroups(items)}
          footer={{ to: item.to, label: t("navigation.seeFullMenu") }}
          triggerAsButton
        />
      );
    }

    return <SidebarLink key={item.to} item={item} active={active} />;
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-[14rem] shrink-0 flex-col border-r border-line/60 bg-surface px-3 py-5 lg:flex">
      <div className="px-2 pb-4">
        <BrandLockup tagline={t("marketing.tagline")} />
      </div>

      <nav className="mt-1 flex flex-1 flex-col overflow-y-auto" aria-label={t("navigation.primary")}>
        <div className="space-y-1.5">{primaryItems.map(renderItem)}</div>
        <div className="mt-auto space-y-1.5 border-t border-line/50 pt-3">
          {bottomItems.map(renderItem)}
        </div>
      </nav>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={linkClass(active)}
      aria-current={active ? "page" : undefined}
    >
      <Icon width={22} height={22} aria-hidden="true" />
      <span className="truncate">{navLabel(item, t)}</span>
    </Link>
  );
}

type FlyoutGroup = Pick<NavGroup, "title" | "items"> & Partial<Pick<NavGroup, "id" | "titleKey">>;

function FlyoutNavItem({
  item,
  active,
  pathname,
  routeKey,
  menuLabel,
  shortcuts,
  groups,
  footer,
  triggerAsButton = false,
}: {
  item: NavItem;
  active: boolean;
  pathname: string;
  routeKey: string;
  menuLabel: string;
  shortcuts?: NavItem[];
  groups?: FlyoutGroup[];
  footer: { to: string; label: string };
  /** Mais usa botão (página opcional); Praticar/Perfil usam link + hover. */
  triggerAsButton?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(12);
  const closeTimerRef = useRef<number>();
  const itemRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dropdownRef = useRef<HTMLElement | null>(null);
  const dropdownId = useId();
  const { t } = useTranslation();
  const Icon = item.icon;

  const resolvedGroups: FlyoutGroup[] =
    groups ??
    (shortcuts?.length
      ? [{ title: menuLabel, items: shortcuts }]
      : []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== undefined) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  }, []);

  const syncDropdownPosition = useCallback(() => {
    const itemRect = itemRef.current?.getBoundingClientRect();
    if (!itemRect) return;

    const dropdownHeight = dropdownRef.current?.offsetHeight ?? FLYOUT_FALLBACK_HEIGHT;
    const viewportGutter = 12;
    const lowestTop = Math.max(viewportGutter, window.innerHeight - dropdownHeight - viewportGutter);
    const nextTop = Math.min(Math.max(viewportGutter, itemRect.top - 8), lowestTop);
    setDropdownTop(nextTop);
  }, []);

  const closeNow = useCallback(() => {
    clearCloseTimer();
    setIsOpen(false);
  }, [clearCloseTimer]);

  const openNow = useCallback(() => {
    clearCloseTimer();
    syncDropdownPosition();
    setIsOpen(true);
  }, [clearCloseTimer, syncDropdownPosition]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = undefined;
    }, FLYOUT_CLOSE_DELAY);
  }, [clearCloseTimer]);

  useLayoutEffect(() => {
    if (isOpen) syncDropdownPosition();
  }, [isOpen, syncDropdownPosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && itemRef.current?.contains(target)) return;
      if (target instanceof Node && dropdownRef.current?.contains(target)) return;
      closeNow();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeNow();
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeNow, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const nav = itemRef.current?.closest("nav");
    window.addEventListener("resize", syncDropdownPosition);
    window.addEventListener("scroll", syncDropdownPosition, { passive: true });
    nav?.addEventListener("scroll", syncDropdownPosition, { passive: true });
    return () => {
      window.removeEventListener("resize", syncDropdownPosition);
      window.removeEventListener("scroll", syncDropdownPosition);
      nav?.removeEventListener("scroll", syncDropdownPosition);
    };
  }, [isOpen, syncDropdownPosition]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);
  useEffect(() => {
    closeNow();
  }, [closeNow, routeKey]);

  function handleBlur(event: ReactFocusEvent<HTMLDivElement>) {
    const nextFocus = event.relatedTarget;
    if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) return;
    if (nextFocus instanceof Node && dropdownRef.current?.contains(nextFocus)) return;
    scheduleClose();
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openNow();
    }
  }

  const triggerClass = `${linkClass(active || isOpen)} w-full text-left`;

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
      onFocus={openNow}
      onBlur={handleBlur}
    >
      {triggerAsButton ? (
        <button
          ref={triggerRef as React.RefObject<HTMLButtonElement>}
          type="button"
          className={triggerClass}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={dropdownId}
          onClick={openNow}
          onKeyDown={handleTriggerKeyDown}
        >
          <Icon width={22} height={22} aria-hidden="true" />
          <span className="truncate">{navLabel(item, t)}</span>
        </button>
      ) : (
        <Link
          ref={triggerRef as React.RefObject<HTMLAnchorElement>}
          to={item.to}
          className={triggerClass}
          aria-current={active ? "page" : undefined}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={dropdownId}
          onKeyDown={handleTriggerKeyDown}
        >
          <Icon width={22} height={22} aria-hidden="true" />
          <span className="truncate">{navLabel(item, t)}</span>
        </Link>
      )}

      {isOpen && (
        <nav
          id={dropdownId}
          ref={dropdownRef}
          role="menu"
          aria-label={menuLabel}
          className="fixed z-50 w-56 overflow-y-auto rounded-2xl border border-line/70 bg-surface p-2 text-ink shadow-lift animate-pop max-h-[min(24rem,calc(100vh-1.5rem))]"
          style={{ top: dropdownTop, left: FLYOUT_LEFT }}
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
        >
          {resolvedGroups.map((group, groupIndex) => (
            <div
              key={group.id || group.title}
              className={groupIndex === 0 ? "" : "mt-2 border-t border-line/70 pt-2"}
            >
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                {group.titleKey ? t(group.titleKey) : group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((shortcut) => {
                  const ShortcutIcon = shortcut.icon;
                  const shortcutActive = isNavItemActive(shortcut, pathname);

                  return (
                    <Link
                      key={`${group.id || group.title}:${shortcut.to}`}
                      role="menuitem"
                      to={shortcut.to}
                      className={[
                        "flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
                        shortcutActive
                          ? "bg-accent-soft text-accent"
                          : "text-ink-soft hover:bg-surface-2 hover:text-ink",
                      ].join(" ")}
                      onClick={closeNow}
                    >
                      <ShortcutIcon width={18} height={18} aria-hidden="true" />
                      <span className="truncate">{navLabel(shortcut, t)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className={resolvedGroups.length ? "mt-2 border-t border-line/70 pt-2" : ""}>
            <Link
              role="menuitem"
              to={footer.to}
              className="flex min-h-10 items-center justify-center rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold text-accent transition hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
              onClick={closeNow}
            >
              {footer.label}
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
