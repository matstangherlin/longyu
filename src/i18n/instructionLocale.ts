import {
  DEFAULT_LOCALE,
  INSTRUCTION_LOCALE_OVERRIDE_STORAGE_KEY,
  INSTRUCTION_LOCALE_STORAGE_KEY,
  isSupportedLocale,
  type InstructionLocale,
} from "./config";
import { getInterfaceLocale, parseInterfaceLocale } from "./locale";

type Listener = (locale: InstructionLocale) => void;

let current: InstructionLocale = DEFAULT_LOCALE;
let bootstrapped = false;
const listeners = new Set<Listener>();

function read(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  if (typeof localStorage === "undefined") return;
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode/quota: the in-memory course language still works.
  }
}

function apply(locale: InstructionLocale) {
  current = locale;
  bootstrapped = true;
  if (typeof document !== "undefined") document.documentElement.dataset.instructionLocale = locale;
  for (const listener of listeners) listener(locale);
  return locale;
}

export function hasInstructionLocaleUserOverride(): boolean {
  return read(INSTRUCTION_LOCALE_OVERRIDE_STORAGE_KEY) === "1";
}

export function readPersistedInstructionLocale(): InstructionLocale | null {
  const stored = read(INSTRUCTION_LOCALE_STORAGE_KEY);
  return stored && isSupportedLocale(stored) ? stored : null;
}

export function bootstrapInstructionLocale(): InstructionLocale {
  return apply(readPersistedInstructionLocale() ?? getInterfaceLocale());
}

export function getInstructionLocale(): InstructionLocale {
  if (!bootstrapped) bootstrapInstructionLocale();
  return current;
}

export function subscribeInstructionLocale(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setInstructionLocale(next: unknown, options: { userOverride?: boolean } = {}): InstructionLocale {
  const locale = parseInterfaceLocale(next);
  write(INSTRUCTION_LOCALE_STORAGE_KEY, locale);
  if (options.userOverride !== false) write(INSTRUCTION_LOCALE_OVERRIDE_STORAGE_KEY, "1");
  return apply(locale);
}

/** App language follows course language only until the learner chooses the course explicitly. */
export function followInterfaceLocale(next: InstructionLocale): InstructionLocale {
  if (hasInstructionLocaleUserOverride()) return getInstructionLocale();
  return setInstructionLocale(next, { userOverride: false });
}

export function resetInstructionLocaleForTests(): void {
  current = DEFAULT_LOCALE;
  bootstrapped = false;
  listeners.clear();
  write(INSTRUCTION_LOCALE_STORAGE_KEY, null);
  write(INSTRUCTION_LOCALE_OVERRIDE_STORAGE_KEY, null);
  if (typeof document !== "undefined") document.documentElement.dataset.instructionLocale = DEFAULT_LOCALE;
}
