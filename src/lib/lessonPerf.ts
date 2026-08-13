/**
 * PERF-011 — lesson start instrumentation.
 * Near-zero overhead when disabled (DEV, localStorage flag, or VITE_LESSON_PERF).
 */

export const LESSON_PERF_MARKS = {
  startClick: "lesson_start_click",
  routeMounted: "lesson_route_mounted",
  dataReady: "lesson_data_ready",
  firstActivityPainted: "lesson_first_activity_painted",
  interactive: "lesson_interactive",
} as const;

export type LessonPerfMarkName = (typeof LESSON_PERF_MARKS)[keyof typeof LESSON_PERF_MARKS];

const STORAGE_KEY = "longyu_lesson_perf";

function readLocalStorageFlag(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readViteFlag(): boolean {
  try {
    return import.meta.env?.VITE_LESSON_PERF === "true";
  } catch {
    return false;
  }
}

/** True in DEV, when localStorage.longyu_lesson_perf === '1', or VITE_LESSON_PERF=true. */
export function isLessonPerfEnabled(): boolean {
  try {
    if (import.meta.env?.DEV) return true;
  } catch {
    /* ignore */
  }
  return readViteFlag() || readLocalStorageFlag();
}

export function markLessonPerf(name: LessonPerfMarkName | string): void {
  if (!isLessonPerfEnabled()) return;
  try {
    performance.mark(name);
  } catch {
    /* ignore */
  }
}

export function measureLessonPerf(name: string, start: string, end: string): void {
  if (!isLessonPerfEnabled()) return;
  try {
    performance.measure(name, start, end);
  } catch {
    /* ignore — missing marks */
  }
}

export type LessonLongTaskCallback = (entry: PerformanceEntry) => void;

/**
 * Observe long tasks when PerformanceObserver supports them.
 * Returns a disconnect helper (no-op when disabled / unsupported).
 */
export function observeLessonLongTasks(cb: LessonLongTaskCallback): () => void {
  if (!isLessonPerfEnabled()) return () => undefined;
  if (typeof PerformanceObserver === "undefined") return () => undefined;
  try {
    const supported =
      typeof PerformanceObserver.supportedEntryTypes === "undefined" ||
      PerformanceObserver.supportedEntryTypes.includes("longtask");
    if (!supported) return () => undefined;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) cb(entry);
    });
    observer.observe({ type: "longtask", buffered: true });
    return () => {
      try {
        observer.disconnect();
      } catch {
        /* ignore */
      }
    };
  } catch {
    return () => undefined;
  }
}
