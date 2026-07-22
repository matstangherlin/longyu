import { useEffect, useRef, type ReactNode } from "react";

let bodyLockCount = 0;
let previousBodyOverflow = "";

function useBodyScrollLock() {
  useEffect(() => {
    if (bodyLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    bodyLockCount += 1;

    return () => {
      bodyLockCount = Math.max(0, bodyLockCount - 1);
      if (bodyLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, []);
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function ModalOverlay({
  children,
  className = "",
  role = "dialog",
  labelledBy,
  label,
  onBackdropClick,
}: {
  children: ReactNode;
  className?: string;
  role?: "dialog" | "presentation";
  labelledBy?: string;
  label?: string;
  onBackdropClick?: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const onBackdropClickRef = useRef(onBackdropClick);
  onBackdropClickRef.current = onBackdropClick;
  useBodyScrollLock();

  useEffect(() => {
    if (role !== "dialog") return undefined;

    const overlay = overlayRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = Array.from(overlay?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
    (focusable[0] ?? overlay)?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onBackdropClickRef.current) {
        event.preventDefault();
        onBackdropClickRef.current();
        return;
      }
      if (event.key !== "Tab" || !overlay) return;

      const items = Array.from(overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (item) => !item.hasAttribute("disabled") && item.getAttribute("aria-hidden") !== "true"
      );
      if (items.length === 0) {
        event.preventDefault();
        overlay.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === overlay)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [role]);

  return (
    <div
      ref={overlayRef}
      tabIndex={role === "dialog" ? -1 : undefined}
      className={[
        "fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto overscroll-contain bg-ink/65 p-0 backdrop-blur-md sm:items-center sm:p-4",
        className,
      ].filter(Boolean).join(" ")}
      role={role}
      aria-modal={role === "dialog" ? true : undefined}
      aria-labelledby={labelledBy}
      aria-label={label}
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onBackdropClick?.();
      }}
    >
      {children}
    </div>
  );
}
