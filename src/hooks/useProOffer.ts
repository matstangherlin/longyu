import { useCallback, useRef, useState } from "react";
import { useIsPro } from "../lib/proAccess";
import {
  evaluateProOffer,
  recordProOfferDismissed,
  recordProOfferShown,
  type ProOfferContext,
  type ProOfferCopy,
  type ProOfferStrength,
} from "../lib/proOfferEngine";

export function useProOffer() {
  const isPro = useIsPro();
  const [offer, setOffer] = useState<ProOfferCopy | null>(null);
  const shownRef = useRef<ProOfferCopy | null>(null);

  const consider = useCallback(
    (ctx: Omit<ProOfferContext, "isPro">, strength: ProOfferStrength = "strong") => {
      if (isPro) return;
      const next = evaluateProOffer({ ...ctx, isPro }, strength);
      if (!next) return;
      // Registra "shown" e atualiza os limites de frequência (banners e ofertas
      // solicitadas não contam contra o teto de modais — tratado no engine).
      recordProOfferShown(next);
      shownRef.current = next;
      setOffer(next);
    },
    [isPro]
  );

  const dismiss = useCallback(() => {
    // Fechar registra "dismissed" e arma o cooldown de 24h para a mesma oferta.
    if (shownRef.current) recordProOfferDismissed(shownRef.current);
    shownRef.current = null;
    setOffer(null);
  }, []);

  return {
    offer,
    open: offer !== null,
    consider,
    dismiss,
  };
}
