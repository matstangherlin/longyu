import { useEffect, useState } from "react";
import { useStore, type ThemeName } from "./store";

/**
 * RC2.2.17 · CU–CV — Aparência: Sistema / Claro / Escuro.
 *
 * "Sistema" segue `prefers-color-scheme` do aparelho (escuro → "dark",
 * claro → "clay"). Claro/Escuro continuam sendo os temas de sempre; nenhum
 * tema novo. O resultado é o que vai para `data-theme`.
 */
export type AppearanceMode = "system" | "light" | "dark";

function systemPrefersDark(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function resolveTheme(theme: ThemeName, followSystem: boolean, prefersDark: boolean): ThemeName {
  if (!followSystem) return theme;
  return prefersDark ? "dark" : theme === "dark" ? "clay" : theme;
}

export function appearanceModeOf(theme: ThemeName, followSystem: boolean): AppearanceMode {
  if (followSystem) return "system";
  return theme === "dark" ? "dark" : "light";
}

export function useResolvedTheme(): ThemeName {
  const theme = useStore((s) => s.theme);
  const followSystem = useStore((s) => s.followSystemTheme === true);
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);
  useEffect(() => {
    if (!followSystem || typeof window === "undefined") return undefined;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setPrefersDark(query.matches);
    onChange();
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, [followSystem]);
  return resolveTheme(theme, followSystem, prefersDark);
}
