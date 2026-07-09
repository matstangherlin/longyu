import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FocusEvent as ReactFocusEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { DESKTOP_NAV, MORE_DROPDOWN_GROUPS, isNavItemActive } from "./nav";
import type { NavItem } from "./nav";
import { BrandLockup } from "./Brand";
import { COURSE_PROFILE } from "../../data/course";

const MORE_DROPDOWN_ID = "desktop-more-dropdown";
const MORE_DROPDOWN_LEFT = "13.75rem";
const MORE_DROPDOWN_FALLBACK_HEIGHT = 420;
const MORE_DROPDOWN_CLOSE_DELAY = 180;

function linkClass(active: boolean) {
  return [
    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
    active
      ? "bg-accent-soft text-accent"
      : "text-ink-soft hover:bg-surface-2 hover:text-ink",
  ].join(" ");
}

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sticky top-0 hidden h-screen w-[13.5rem] shrink-0 flex-col border-r border-line/60 bg-surface px-2.5 py-4 lg:flex">
      <div className="px-2 pb-2">
        <BrandLockup tagline={COURSE_PROFILE.shortTagline} />
      </div>

      <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto">
        {DESKTOP_NAV.map((item) => {
          const active = isNavItemActive(item, location.pathname);
          if (item.to === "/mais") {
            return (
              <MoreSidebarItem
                key={item.to}
                item={item}
                active={active}
                routeKey={`${location.pathname}${location.hash}`}
              />
            );
          }

          return (
            <SidebarLink key={item.to} item={item} active={active} />
          );
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
      <Icon width={18} height={18} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function MoreSidebarItem({
  item,
  active,
  routeKey,
}: {
  item: NavItem;
  active: boolean;
  routeKey: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(12);
  const closeTimerRef = useRef<number>();
  const itemRef = useRef<HTMLDivElement | null>(null);
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const dropdownRef = useRef<HTMLElement | null>(null);
  const Icon = item.icon;

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
    const nextTop = Math.min(
      Math.max(viewportGutter, itemRect.top - 8),
      lowestTop
    );

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
      closeNow();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeNow();
      linkRef.current?.focus();
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
    scheduleClose();
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
      <Link
        ref={linkRef}
        to={item.to}
        className={linkClass(active)}
        aria-current={active ? "page" : undefined}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={MORE_DROPDOWN_ID}
        aria-label="Mais: abrir página completa"
        onClick={closeNow}
      >
        <Icon width={18} height={18} />
        <span className="truncate">{item.label}</span>
      </Link>

      {isOpen && (
        <nav
          id={MORE_DROPDOWN_ID}
          ref={dropdownRef}
          aria-label="Atalhos de Mais"
          className="fixed z-50 w-56 overflow-y-auto rounded-xl border border-line/70 bg-surface/95 p-1.5 text-ink shadow-lift backdrop-blur-xl animate-pop max-h-[calc(100vh-1.5rem)]"
          style={{ top: dropdownTop, left: MORE_DROPDOWN_LEFT }}
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
        >
          {MORE_DROPDOWN_GROUPS.map((group, groupIndex) => (
            <div
              key={group.title}
              className={groupIndex === 0 ? "" : "mt-2 border-t border-line/70 pt-2"}
            >
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((shortcut) => {
                  const ShortcutIcon = shortcut.icon;

                  return (
                    <Link
                      key={`${group.title}:${shortcut.label}`}
                      to={shortcut.to}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                      onClick={closeNow}
                    >
                      <ShortcutIcon width={17} height={17} aria-hidden="true" />
                      <span className="truncate">{shortcut.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
