import { useState } from "react";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n";
import { ModalOverlay } from "../ui/ModalOverlay";
import { Button } from "../ui/primitives";
import { requestNotificationPermission } from "../../lib/platform/nativeNotifications";
import { requestNativeMicrophone } from "../../lib/platform/nativeSpeech";
import { refreshNativeSpeechStatus } from "../../lib/speech";

/** Sobe quando o intro mudar de conteúdo (ex.: nova permissão explicada). */
export const NATIVE_PERMISSION_INTRO_VERSION = 1;

/**
 * RC2.2.13 — "Prepare o Longyu": UMA tela no primeiro launch do Android.
 *
 * Explica as duas permissões opcionais e, só depois do toque em Continuar,
 * pede em sequência: 1) notificações, 2) microfone. Negar qualquer uma nunca
 * bloqueia o app; o intro é marcado como visto de qualquer forma e não volta.
 * Nada de localização, câmera ou contatos.
 */
export function NativePermissionIntro({ onFinished }: { onFinished?: () => void }) {
  const { t } = useTranslation();
  const markSeen = useStore((s) => s.markNativePermissionIntroSeen);
  const [working, setWorking] = useState(false);

  const finish = () => {
    markSeen(NATIVE_PERMISSION_INTRO_VERSION);
    onFinished?.();
  };

  const requestSequentially = async () => {
    setWorking(true);
    try {
      await requestNotificationPermission();
      await requestNativeMicrophone();
      await refreshNativeSpeechStatus();
    } finally {
      setWorking(false);
      finish();
    }
  };

  return (
    <ModalOverlay labelledBy="native-intro-title">
      <div
        data-testid="native-permission-intro"
        className="w-full max-w-md rounded-t-3xl bg-surface px-5 pb-[calc(var(--app-safe-bottom,0px)+1.25rem)] pt-6 shadow-card sm:rounded-3xl sm:pb-6"
      >
        <h2 id="native-intro-title" className="text-xl font-bold text-ink">
          {t("nativeApp.introTitle")}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{t("nativeApp.introLead")}</p>
        <ul className="mt-4 space-y-3">
          <li className="flex gap-3 rounded-2xl bg-surface-2 p-3">
            <span aria-hidden="true" className="text-2xl leading-none">🔔</span>
            <div>
              <p className="font-semibold text-ink">{t("nativeApp.introNotificationsTitle")}</p>
              <p className="text-sm text-ink-soft">{t("nativeApp.introNotificationsBody")}</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-2xl bg-surface-2 p-3">
            <span aria-hidden="true" className="text-2xl leading-none">🎙</span>
            <div>
              <p className="font-semibold text-ink">{t("nativeApp.introMicTitle")}</p>
              <p className="text-sm text-ink-soft">{t("nativeApp.introMicBody")}</p>
            </div>
          </li>
        </ul>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            size="lg"
            data-testid="native-intro-continue"
            loading={working}
            onClick={() => void requestSequentially()}
          >
            {working ? t("nativeApp.introWorking") : t("nativeApp.introContinue")}
          </Button>
          <Button variant="ghost" size="lg" data-testid="native-intro-later" disabled={working} onClick={finish}>
            {t("nativeApp.introLater")}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
