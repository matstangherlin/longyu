import { useEffect, useRef, type ReactNode } from "react";
import { acquireModalBodyScrollLock, releaseModalBodyScrollLock } from "../../lib/bodyScrollLock";
import { zLayerClass } from "./layers";
import { isTopModal, popModal, pushModal } from "../../lib/modalStack";

function useBodyScrollLock() {
  useEffect(() => {
    acquireModalBodyScrollLock();
    return () => {
      releaseModalBodyScrollLock();
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
  // RC2.2.21 — pilha: um VOLTAR fecha só o modal do topo.
  const stackIdRef = useRef<number | null>(null);
  useEffect(() => {
    const id = pushModal(role);
    stackIdRef.current = id;
    return () => popModal(id, role);
  }, [role]);
  // Toque que COMEÇOU no fundo; fechar no click (não no mousedown) evita que
  // o "click" do mesmo toque atravesse para o que está embaixo (tap-through).
  const downOnBackdropRef = useRef(false);

  useEffect(() => {
    if (role !== "dialog") return undefined;

    const overlay = overlayRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = Array.from(overlay?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
    (focusable[0] ?? overlay)?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onBackdropClickRef.current) {
        if (stackIdRef.current != null && !isTopModal(stackIdRef.current)) return;
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
        "fixed inset-0 flex items-end justify-center overflow-y-auto overscroll-contain bg-ink/65 p-0 backdrop-blur-md sm:items-center sm:p-4",
        zLayerClass.modal,
        className,
      ].filter(Boolean).join(" ")}
      role={role}
      aria-modal={role === "dialog" ? true : undefined}
      aria-labelledby={labelledBy}
      aria-label={label}
      onMouseDown={(event) => {
        event.stopPropagation();
        downOnBackdropRef.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        const startedOnBackdrop = downOnBackdropRef.current;
        downOnBackdropRef.current = false;
        if (event.target !== event.currentTarget) return;
        event.stopPropagation();
        event.preventDefault();
        if (startedOnBackdrop) onBackdropClick?.();
      }}
    >
      {children}
    </div>
  );
}
