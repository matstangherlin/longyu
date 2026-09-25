import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../lib/store";
import { useI18n } from "../../i18n";
import { planStudyReminders } from "../../lib/studyReminderPlan";
import {
  applyReminderPlan,
  hasNativeNotifications,
  notificationPermission,
  onReminderTap,
} from "../../lib/platform/nativeNotifications";
import { resolveDeepLink } from "../../lib/platform/deepLinks";
import { dailyVocabularyRouteFor } from "../../lib/dailyVocabularyRuntime";
import { subscribeAppLifecycle } from "../../lib/platform/appLifecycle";
import { refreshNativeTtsStatus } from "../../lib/tts";
import { refreshNativeSpeechStatus } from "../../lib/speech";
import { NativePermissionIntro, NATIVE_PERMISSION_INTRO_VERSION } from "./NativePermissionIntro";

/**
 * RC2.2.13 — experiência nativa do Android, montada UMA vez na raiz do router.
 *
 * - lembretes locais: a cada abertura/retorno ao app e a cada mudança de
 *   ofensiva, última atividade ou preferência, consulta a permissão REAL do SO
 *   e reaplica o plano de src/lib/studyReminderPlan.ts (IDs fixos: nunca
 *   duplica; sem permissão ou toggle off → cancela tudo);
 * - toque no lembrete: UM listener; a URL passa pelo resolveDeepLink (mesma
 *   allowlist dos deep links) e só então navega;
 * - voz: aquece o estado nativo de TTS e microfone;
 * - primeiro launch: "Prepare o Longyu" (uma vez por versão do intro).
 *
 * Na Web não faz nada e não renderiza nada.
 */
export function NativeExperienceBootstrap() {
  const android = hasNativeNotifications();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { locale } = useI18n();
  const streak = useStore((s) => s.streak);
  const lastStudyDate = useStore((s) => s.lastStudyDate);
  const prefs = useStore((s) => s.notificationPrefs);
  const introVersion = useStore((s) => s.nativePermissionIntroVersion ?? 0);
  const [resumeTick, setResumeTick] = useState(0);
  const reconcileChain = useRef<Promise<unknown>>(Promise.resolve());

  // Toque na notificação → rota aprovada. Registrado uma única vez.
  useEffect(() => {
    if (!android) return undefined;
    let disposed = false;
    let remove: (() => void) | null = null;
    void onReminderTap((url, extra) => {
      // RC2.2.15 · BX–BY — Palavra do dia: só um lexicalId que existe no pool.
      if (extra.kind === "daily_vocabulary") {
        const wordRoute = dailyVocabularyRouteFor(extra.lexicalId);
        if (wordRoute) navigateRef.current(wordRoute);
        return;
      }
      const route = url ? resolveDeepLink(url) : null;
      if (route) navigateRef.current(route);
    }).then((remover) => {
      if (disposed) remover();
      else remove = remover;
    });
    return () => {
      disposed = true;
      remove?.();
    };
  }, [android]);

  // Abrir / voltar ao app: refaz o plano e relê voz e microfone.
  useEffect(() => {
    if (!android) return undefined;
    void refreshNativeTtsStatus();
    void refreshNativeSpeechStatus();
    return subscribeAppLifecycle((state) => {
      if (state !== "active") return;
      void refreshNativeSpeechStatus();
      setResumeTick((tick) => tick + 1);
    });
  }, [android]);

  // Reconcilia os lembretes (serializado: nunca dois cancel+schedule cruzados).
  useEffect(() => {
    if (!android) return;
    const reminderLocale = locale === "en" ? "en" : "pt-BR";
    reconcileChain.current = reconcileChain.current
      .catch(() => undefined)
      .then(async () => {
        const permission = await notificationPermission();
        const plan = planStudyReminders({
          now: Date.now(),
          streak,
          lastStudyDate,
          prefs: prefs ?? { enabled: true, streak: true, comeback: true },
          permissionGranted: permission === "granted",
          locale: reminderLocale,
        });
        await applyReminderPlan(plan);
      })
      .catch(() => undefined);
  }, [android, streak, lastStudyDate, prefs, locale, resumeTick]);

  if (!android || introVersion >= NATIVE_PERMISSION_INTRO_VERSION) return null;
  return <NativePermissionIntro onFinished={() => setResumeTick((tick) => tick + 1)} />;
}
