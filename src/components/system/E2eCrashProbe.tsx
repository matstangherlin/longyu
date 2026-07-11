/** Dispara erro controlado quando localStorage e2e-force-crash=1 (testes). */
export function E2eCrashProbe() {
  if (typeof window !== "undefined" && window.localStorage.getItem("longyu:e2e-force-crash") === "1") {
    throw new Error("E2E controlled crash probe");
  }
  return null;
}
