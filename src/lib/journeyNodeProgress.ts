const STORAGE_KEY = "longyu:journey-node-completions:v1";

function read(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function completedJourneyNodeIds(): string[] {
  return read();
}

export function isJourneyNodeComplete(id: string): boolean {
  return read().includes(id);
}

export function completeJourneyNode(id: string): void {
  if (typeof localStorage === "undefined") return;
  const next = [...new Set([...read(), id])];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The node remains safely non-blocking if private mode denies storage.
  }
}

export function clearJourneyNodeProgressForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
