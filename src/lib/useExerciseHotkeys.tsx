import { useEffect, useRef, type ReactNode } from "react";
import { t } from "../i18n/catalog";

export type ExerciseHotkeyMode = "choice" | "pairs" | "builder" | "story" | "disabled";

const OPTION_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const LEFT_PAIR_KEYS = ["1", "2", "3", "4", "5"];
const RIGHT_PAIR_KEYS = ["6", "7", "8", "9", "0"];
const DIGIT_CODES = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0"];
const NUMPAD_CODES = ["Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5", "Numpad6", "Numpad7", "Numpad8", "Numpad9", "Numpad0"];

/** Índice 0–9 a partir de `key` ou `code` (DigitN / NumpadN). Firefox nem sempre entrega `key` "1". */
export function optionIndexFromKeyboardEvent(event: Pick<KeyboardEvent, "key" | "code">): number {
  const fromKey = OPTION_KEYS.indexOf(event.key);
  if (fromKey >= 0) return fromKey;
  const fromDigit = DIGIT_CODES.indexOf(event.code);
  if (fromDigit >= 0) return fromDigit;
  return NUMPAD_CODES.indexOf(event.code);
}

function indexInDigitKeys(keys: readonly string[], event: Pick<KeyboardEvent, "key" | "code">): number {
  const byKey = keys.indexOf(event.key);
  if (byKey >= 0) return byKey;
  const optionIndex = optionIndexFromKeyboardEvent(event);
  if (optionIndex < 0) return -1;
  const digit = OPTION_KEYS[optionIndex];
  return digit ? keys.indexOf(digit) : -1;
}

/** Atributos estáveis para opções de escolha — não depender só de `border-accent`. */
export function optionChoiceDomProps(index: number, selected: boolean, label?: string) {
  return {
    "data-option-index": String(index),
    "data-selected": selected ? "true" : "false",
    ...(label ? { "data-option-label": label } : {}),
    "aria-pressed": selected,
  } as const;
}

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
        const leftIndex = indexInDigitKeys(LEFT_PAIR_KEYS, event);
        if (leftIndex >= 0 && leftIndex < (current.leftCount ?? 0) && current.onSelectLeft) {
          event.preventDefault();
          current.onSelectLeft(leftIndex);
          return;
        }

        const rightIndex = indexInDigitKeys(RIGHT_PAIR_KEYS, event);
        if (rightIndex >= 0 && rightIndex < (current.rightCount ?? 0) && current.onSelectRight) {
          event.preventDefault();
          current.onSelectRight(rightIndex);
        }
        return;
      }

      const optionIndex = optionIndexFromKeyboardEvent(event);
      if (optionIndex >= 0 && optionIndex < (current.optionCount ?? 0) && current.onSelectOption) {
        event.preventDefault();
        current.onSelectOption(optionIndex);
      }
    }

    // capture no document: Playwright/Firefox às vezes não entrega keydown em window.
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
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
      {pairs ? t("player.shortcutHintPairs") : t("player.shortcutHint")}
    </p>
  );
}
