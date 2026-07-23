import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { FocusEvent as ReactFocusEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { desktopNavForStage, moreFlyoutGroups, isNavItemActive } from "./nav";
import type { NavItem } from "./nav";
import { BrandLockup } from "./Brand";
import { COURSE_PROFILE } from "../../data/course";
import { useLearnerProfile } from "../../hooks/useLearnerProfile";

const MORE_DROPDOWN_FALLBACK_HEIGHT = 280;
const MORE_DROPDOWN_CLOSE_DELAY = 160;

function linkClass(active: boolean) {
  return [
    "flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    active
      ? "border-2 border-accent/70 bg-accent-soft text-accent"
      : "border-2 border-transparent text-ink-soft hover:bg-surface-2 hover:text-ink",
  ].join(" ");
}

export function Sidebar() {
  const location = useLocation();
  const profile = useLearnerProfile();
  const items = desktopNavForStage(profile.stage);

  return (
    <aside className="sticky top-0 hidden h-screen w-[14rem] shrink-0 flex-col border-r border-line/60 bg-surface px-3 py-5 lg:flex">
      <div className="px-2 pb-4">
        <BrandLockup tagline={COURSE_PROFILE.shortTagline} />
      </div>

      <nav className="mt-1 flex-1 space-y-1.5 overflow-y-auto" aria-label="Principal">
        {items.map((item) => {
          const active = isNavItemActive(item, location.pathname);
          if (item.to === "/mais") {
            return (
              <MoreSidebarItem
                key={item.to}
                item={item}
                active={active}
                primaryNav={items}
                routeKey={`${location.pathname}${location.hash}`}
              />
            );
          }

          return <SidebarLink key={item.to} item={item} active={active} />;
        })}
      </nav>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={linkClass(active)}
      aria-current={active ? "page" : undefined}
    >
      <Icon width={22} height={22} aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function MoreSidebarItem({
  item,
  active,
  primaryNav,
  routeKey,
}: {
  item: NavItem;
  active: boolean;
  primaryNav: NavItem[];
  routeKey: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(12);
  const closeTimerRef = useRef<number>();
  const itemRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLElement | null>(null);
  const dropdownId = useId();
  const Icon = item.icon;
  const flyoutGroups = moreFlyoutGroups(primaryNav);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== undefined) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  }, []);

  const syncDropdownPosition = useCallback(() => {
    const itemRect = itemRef.current?.getBoundingClientRect();
    if (!itemRect) return;

    const dropdownHeight = dropdownRef.current?.offsetHeight ?? MORE_DROPDOWN_FALLBACK_HEIGHT;
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
    }, MORE_DROPDOWN_CLOSE_DELAY);
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
      buttonRef.current?.focus();
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

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  useEffect(() => {
    closeNow();
  }, [closeNow, routeKey]);

  function handleBlur(event: ReactFocusEvent<HTMLDivElement>) {
    const nextFocus = event.relatedTarget;
    if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) return;
    if (nextFocus instanceof Node && dropdownRef.current?.contains(nextFocus)) return;
    scheduleClose();
  }

  function handleButtonKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openNow();
    }
  }

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
      onFocus={openNow}
      onBlur={handleBlur}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`${linkClass(active || isOpen)} w-full text-left`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        onClick={openNow}
        onKeyDown={handleButtonKeyDown}
      >
        <Icon width={22} height={22} aria-hidden="true" />
        <span className="truncate">{item.label}</span>
      </button>

      {isOpen && (
        <nav
          id={dropdownId}
          ref={dropdownRef}
          role="menu"
          aria-label="Mais opções"
          className="fixed z-50 w-56 overflow-y-auto rounded-2xl border border-line/70 bg-surface p-2 text-ink shadow-lift animate-pop max-h-[min(22rem,calc(100vh-1.5rem))]"
          style={{ top: dropdownTop, left: "14.35rem" }}
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
        >
          {flyoutGroups.map((group, groupIndex) => (
            <div
              key={group.title}
              className={groupIndex === 0 ? "" : "mt-2 border-t border-line/70 pt-2"}
            >
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((shortcut) => {
                  const ShortcutIcon = shortcut.icon;

                  return (
                    <Link
                      key={`${group.title}:${shortcut.label}`}
                      role="menuitem"
                      to={shortcut.to}
                      className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
                      onClick={closeNow}
                    >
                      <ShortcutIcon width={18} height={18} aria-hidden="true" />
                      <span className="truncate">{shortcut.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className={flyoutGroups.length ? "mt-2 border-t border-line/70 pt-2" : ""}>
            <Link
              role="menuitem"
              to={item.to}
              className="flex min-h-10 items-center justify-center rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold text-accent transition hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
              onClick={closeNow}
            >
              Ver menu completo
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
