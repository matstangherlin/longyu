import { useEffect, useState } from "react";

/** Mesmo corte do resto da casca (sidebar e tab bar trocam em `lg`). */
export const WIDE_LAYOUT_QUERY = "(min-width: 1024px)";

/**
 * RC2.2.14 — `true` no desktop (≥ 1024px). Usado onde o celular tem uma
 * composição própria (landing, índice de Configurações) em vez de só CSS,
 * para não montar as duas árvores ao mesmo tempo. Fora do navegador
 * (pré-render de SEO) assume desktop.
 */
export function useWideLayout(): boolean {
  const [wide, setWide] = useState(() =>
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? true
      : window.matchMedia(WIDE_LAYOUT_QUERY).matches
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(WIDE_LAYOUT_QUERY);
    const update = () => setWide(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return wide;
}
