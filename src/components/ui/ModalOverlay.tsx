import { useEffect, type ReactNode } from "react";

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
  useBodyScrollLock();

  // ESC fecha o modal (mesmo comportamento do clique no backdrop). Centraliza a
  // acessibilidade de teclado para todos os modais que usam este overlay.
  useEffect(() => {
    if (!onBackdropClick) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBackdropClick();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBackdropClick]);

  return (
    <div
      className={[
        "fixed inset-0 z-[80] flex items-end justify-center overscroll-contain bg-ink/65 p-0 backdrop-blur-md sm:items-center sm:p-4",
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
