import { useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Button } from "../../components/ui/primitives";
import { clearListeningMute, listeningVisualForSession, muteListeningForSession } from "./contrastFeedback";

/** LGY-012 — "Não posso ouvir agora" vale pelo resto da sessão. */
export function useListeningFallback() {
  const [visual, setVisual] = useState(listeningVisualForSession);
  function enableVisual() {
    muteListeningForSession();
    setVisual(true);
  }
  function backToAudio() {
    clearListeningMute();
    setVisual(false);
  }
  return { visual, enableVisual, backToAudio };
}

export function CannotListenNowButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11"
      data-testid="listen-cannot-now"
      aria-label={t("player.cannotListenNow")}
      onClick={onClick}
    >
      {t("player.cannotListenNow")}
    </Button>
  );
}

export function UnevaluatedListenButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11"
      data-testid="listen-unevaluated-continue"
      onClick={onClick}
    >
      {t("player.listenSkipUnevaluated")}
    </Button>
  );
}
