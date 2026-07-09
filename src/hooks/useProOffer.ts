import { useCallback, useState } from "react";
import { useIsPro } from "../lib/proAccess";
import {
  evaluateProOffer,
  recordProOfferShown,
  type ProOfferContext,
  type ProOfferCopy,
  type ProOfferStrength,
} from "../lib/proOfferEngine";

export function useProOffer() {
  const isPro = useIsPro();
  const [offer, setOffer] = useState<ProOfferCopy | null>(null);

  const consider = useCallback(
    (ctx: Omit<ProOfferContext, "isPro">, strength: ProOfferStrength = "strong") => {
      if (isPro) return;
      const next = evaluateProOffer({ ...ctx, isPro }, strength);
      if (!next) return;
      if (strength === "strong") recordProOfferShown(next);
      setOffer(next);
    },
    [isPro]
  );

  const dismiss = useCallback(() => setOffer(null), []);

  return {
    offer,
    open: offer !== null,
    consider,
    dismiss,
  };
}
