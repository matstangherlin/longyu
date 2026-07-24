import { useEffect, useRef, type ReactNode } from "react";

export type ExerciseHotkeyMode = "choice" | "pairs" | "builder" | "story" | "disabled";

const OPTION_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const LEFT_PAIR_KEYS = ["1", "2", "3", "4", "5"];
const RIGHT_PAIR_KEYS = ["6", "7", "8", "9", "0"];

export function shortcutKeyForIndex(index: number): string {
  if (index < 0 || index >= OPTION_KEYS.length) return "";
  return index === 9 ? "0" : String(index + 1);
}

export function leftPairShortcut(index: number): string {
  return LEFT_PAIR_KEYS[index] ?? "";
}

export function rightPairShortcut(index: number): string {
  return RIGHT_PAIR_KEYS[index] ?? "";
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return true;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"], [role="textbox"]')) return true;

  return false;
}

function isNativeEnterTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, a[href], summary, [role="button"], [role="link"]'));
}

function hasBlockingDialog(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[aria-modal="true"], [role="dialog"]'));
}

export interface UseExerciseHotkeysOptions {
  enabled?: boolean;
  optionCount?: number;
  onSelectOption?: (index: number) => void;
  onSubmit?: () => void;
  onContinue?: () => void;
  mode?: ExerciseHotkeyMode;
  isAnswered?: boolean;
  hasSelection?: boolean;
  allowNumberKeys?: boolean;
  allowEnter?: boolean;
  leftCount?: number;
  rightCount?: number;
  onSelectLeft?: (index: number) => void;
  onSelectRight?: (index: number) => void;
  onMissingSelection?: () => void;
}

export function useExerciseHotkeys(options: UseExerciseHotkeysOptions) {
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const current = optionsRef.current;
      const mode = current.mode ?? "choice";

      if (!current.enabled || mode === "disabled") return;
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      if (hasBlockingDialog()) return;

      if (event.key === "Enter" && current.allowEnter !== false) {
        if (isNativeEnterTarget(event.target)) return;

        if (current.isAnswered && current.onContinue) {
          event.preventDefault();
          current.onContinue();
          return;
        }

        if (current.hasSelection && current.onSubmit) {
          event.preventDefault();
          current.onSubmit();
          return;
        }

        if (current.onMissingSelection) {
          event.preventDefault();
          current.onMissingSelection();
        }
        return;
      }

      if (current.allowNumberKeys === false) return;

      if (mode === "pairs") {
        const leftIndex = LEFT_PAIR_KEYS.indexOf(event.key);
        if (leftIndex >= 0 && leftIndex < (current.leftCount ?? 0) && current.onSelectLeft) {
          event.preventDefault();
          current.onSelectLeft(leftIndex);
          return;
        }

        const rightIndex = RIGHT_PAIR_KEYS.indexOf(event.key);
        if (rightIndex >= 0 && rightIndex < (current.rightCount ?? 0) && current.onSelectRight) {
          event.preventDefault();
          current.onSelectRight(rightIndex);
        }
        return;
      }

      const optionIndex = OPTION_KEYS.indexOf(event.key);
      if (optionIndex >= 0 && optionIndex < (current.optionCount ?? 0) && current.onSelectOption) {
        event.preventDefault();
        current.onSelectOption(optionIndex);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

export function ShortcutBadge({ children, className = "" }: { children: ReactNode; className?: string }) {
  if (children == null || children === "") return null;

  return (
    <span
      aria-hidden="true"
      className={[
        // Inline com o texto (nunca absolute por cima da primeira letra).
        "hidden h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 px-1.5 text-[10px] font-bold leading-none text-ink-faint ring-1 ring-line/60 sm:inline-flex",
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </span>
  );
}

export function KeyboardShortcutHint({ pairs = false }: { pairs?: boolean }) {
  return (
    <p className="mt-2 hidden text-[11px] font-medium text-ink-faint sm:block">
      {pairs ? "Atalhos: 1-5 na esquerda, 6-0 na direita." : "Atalhos: use 1-9 para responder."}
    </p>
  );
}
