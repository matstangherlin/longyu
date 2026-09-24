import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../../lib/store";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../locales/pt-BR";
import { HubSection } from "../layout/HubLayout";
import { Button, Card } from "../ui/primitives";
import { SettingSwitch } from "../ui/SettingSwitch";
import { isProductionBetaEnv } from "../../lib/appEnvironment";
import { speak, refreshNativeTtsStatus } from "../../lib/tts";
import { recognizeOnce, speechErrorMessage, type RecognizeHandle } from "../../lib/speech";
import { devTestReminder } from "../../lib/studyReminderPlan";
import {
  hasNativeNotifications,
  notificationPermission,
  pendingReminderIds,
  requestNotificationPermission,
  scheduleSingleReminder,
  type NotificationPermission,
} from "../../lib/platform/nativeNotifications";
import {
  nativeRecognitionStatus,
  openNativeAppSettings,
  openNativeNotificationSettings,
  openNativeTtsSettings,
  requestNativeMicrophone,
  type NativePermission,
} from "../../lib/platform/nativeSpeech";
import { subscribeAppLifecycle } from "../../lib/platform/appLifecycle";

type PermissionView = "granted" | "denied" | "prompt" | "unavailable";

const PERMISSION_LABEL: Record<PermissionView, MessageKey> = {
  granted: "nativeApp.permissionGranted",
  denied: "nativeApp.permissionDenied",
  prompt: "nativeApp.permissionPrompt",
  unavailable: "nativeApp.permissionUnavailable",
};

function micView(state: NativePermission | null): PermissionView {
  if (state === "granted" || state === "denied") return state;
  return state ? "prompt" : "unavailable";
}

type NativeStatus = {
  notifications: NotificationPermission;
  microphone: PermissionView;
  tts: "unknown" | "available" | "missing";
  recognition: "unknown" | "available" | "onDevice" | "missing";
  pending: number;
};

const INITIAL: NativeStatus = { notifications: "prompt", microphone: "prompt", tts: "unknown", recognition: "unknown", pending: 0 };

/**
 * RC2.2.13 — Configurações do Android: Permissões do app, Notificações e
 * Áudio e fala. Tudo lido do SO (ao montar e toda vez que o app volta ao
 * primeiro plano): o toggle do Longyu nunca finge que o Android permitiu.
 * Na Web não renderiza nada.
 */
export function NativeSettingsSections() {
  const android = hasNativeNotifications();
  const { t } = useI18n();
  const prefs = useStore((s) => s.notificationPrefs) ?? { enabled: true, streak: true, comeback: true };
  const setPrefs = useStore((s) => s.setNotificationPrefs);
  const streak = useStore((s) => s.streak);
  const locale = useI18n().locale;
  const [status, setStatus] = useState<NativeStatus>(INITIAL);
  const [micTest, setMicTest] = useState<{ state: "idle" | "listening" | "done"; text: string }>({ state: "idle", text: "" });
  const [devNote, setDevNote] = useState(false);
  const recognitionRef = useRef<RecognizeHandle | null>(null);

  const refresh = useCallback(async () => {
    const [notifications, recognition, tts, pending] = await Promise.all([
      notificationPermission(),
      nativeRecognitionStatus(),
      refreshNativeTtsStatus(),
      pendingReminderIds(),
    ]);
    setStatus({
      notifications,
      microphone: micView(recognition.microphone),
      tts: tts ? (tts.available ? "available" : "missing") : "unknown",
      recognition: recognition.available ? (recognition.onDevice ? "onDevice" : "available") : "missing",
      pending: pending.length,
    });
  }, []);

  useEffect(() => {
    if (!android) return undefined;
    void refresh();
    const unsubscribe = subscribeAppLifecycle((state) => {
      if (state === "active") void refresh();
    });
    return () => {
      unsubscribe();
      recognitionRef.current?.stop();
    };
  }, [android, refresh]);

  if (!android) return null;

  const notificationsView: PermissionView = status.notifications;
  const askNotifications = async () => {
    if (notificationsView === "denied") await openNativeNotificationSettings();
    else await requestNotificationPermission();
    await refresh();
  };
  const askMicrophone = async () => {
    if (status.microphone === "denied") await openNativeAppSettings();
    else await requestNativeMicrophone();
    await refresh();
  };
  const testMicrophone = () => {
    if (micTest.state === "listening") return;
    setMicTest({ state: "listening", text: "" });
    recognitionRef.current = recognizeOnce(
      (heard) => setMicTest({ state: "done", text: heard ? t("nativeApp.testHeard", { text: heard }) : t("nativeApp.testNothing") }),
      (code) => {
        setMicTest({ state: "done", text: speechErrorMessage(code) });
        void refresh();
      }
    );
  };
  const scheduleDevReminder = async () => {
    await scheduleSingleReminder(devTestReminder(Date.now(), streak, locale === "en" ? "en" : "pt-BR"));
    setDevNote(true);
    await refresh();
  };

  return (
    <>
      <HubSection id="permissoes" className="scroll-mt-6" title={t("nativeApp.permissionsTitle")} desc={t("nativeApp.permissionsLead")}>
        <Card className="space-y-3 rounded-xl border-line/70 p-3.5 shadow-none" data-testid="native-permissions-card">
          <PermissionRow
            label={t("nativeApp.notificationsPermission")}
            state={notificationsView}
            actionLabel={notificationsView === "denied" ? t("nativeApp.openNotificationSettings") : t("nativeApp.askAgain")}
            onAction={notificationsView === "granted" || notificationsView === "unavailable" ? undefined : () => void askNotifications()}
            testId="native-permission-notifications"
            t={t}
          />
          <PermissionRow
            label={t("nativeApp.microphonePermission")}
            state={status.microphone}
            actionLabel={status.microphone === "denied" ? t("nativeApp.openAndroidSettings") : t("nativeApp.askAgain")}
            onAction={status.microphone === "granted" || status.microphone === "unavailable" ? undefined : () => void askMicrophone()}
            testId="native-permission-microphone"
            t={t}
          />
        </Card>
      </HubSection>

      <HubSection id="notificacoes" className="scroll-mt-6" title={t("nativeApp.notificationsTitle")} desc={t("nativeApp.notificationsLead")}>
        <Card className="space-y-4 rounded-xl border-line/70 p-3.5 shadow-none" data-testid="native-notifications-card">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{t("nativeApp.androidStatus")}</span>
            <span data-testid="native-notifications-os-status" className="text-ink-soft">
              {t(PERMISSION_LABEL[notificationsView])}
            </span>
          </div>
          {notificationsView === "denied" && (
            <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-sm text-ink-soft">
              <p>{t("nativeApp.remindersBlocked")}</p>
              <Button variant="outline" size="sm" className="min-h-12" onClick={() => void openNativeNotificationSettings()}>
                {t("nativeApp.openNotificationSettings")}
              </Button>
            </div>
          )}
          <SettingSwitch
            label={t("nativeApp.remindersEnabled")}
            desc={t("nativeApp.notificationsLead")}
            checked={prefs.enabled}
            onChange={() => setPrefs({ enabled: !prefs.enabled })}
          />
          {prefs.enabled && (
            <>
              <SettingSwitch
                label={t("nativeApp.streakReminders")}
                desc={t("nativeApp.streakRemindersLead")}
                checked={prefs.streak}
                onChange={() => setPrefs({ streak: !prefs.streak })}
              />
              <SettingSwitch
                label={t("nativeApp.comebackReminders")}
                desc={t("nativeApp.comebackRemindersLead")}
                checked={prefs.comeback}
                onChange={() => setPrefs({ comeback: !prefs.comeback })}
              />
            </>
          )}
          <p className="text-xs text-ink-faint">{t("nativeApp.localOnlyNote")}</p>
        </Card>
      </HubSection>

      <HubSection id="audio-fala" className="scroll-mt-6" title={t("nativeApp.audioTitle")} desc={t("nativeApp.audioLead")}>
        <Card className="space-y-4 rounded-xl border-line/70 p-3.5 shadow-none" data-testid="native-audio-card">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{t("nativeApp.ttsStatus")}</span>
            <span data-testid="native-tts-status" className="text-ink-soft">
              {status.tts === "available"
                ? t("nativeApp.ttsAvailable")
                : status.tts === "missing"
                  ? t("nativeApp.ttsMissing")
                  : t("nativeApp.ttsUnknown")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="min-h-12" data-testid="native-test-audio" onClick={() => speak("你好，我在学中文")}>
              {t("nativeApp.testAudio")}
            </Button>
            {status.tts === "missing" && (
              <Button variant="ghost" size="sm" className="min-h-12" onClick={() => void openNativeTtsSettings()}>
                {t("nativeApp.openTtsSettings")}
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
            <span className="font-medium text-ink">{t("nativeApp.recognitionStatus")}</span>
            <span data-testid="native-recognition-status" className="text-ink-soft">
              {status.recognition === "onDevice"
                ? t("nativeApp.recognitionOnDevice")
                : status.recognition === "available"
                  ? t("nativeApp.recognitionAvailable")
                  : status.recognition === "missing"
                    ? t("nativeApp.recognitionMissing")
                    : t("nativeApp.ttsUnknown")}
            </span>
          </div>
          <div className="space-y-2">
            {status.microphone === "denied" ? (
              <Button variant="outline" size="sm" className="min-h-12" onClick={() => void openNativeAppSettings()}>
                {t("nativeApp.openAndroidSettings")}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="min-h-12"
                data-testid="native-test-microphone"
                disabled={status.recognition === "missing" || micTest.state === "listening"}
                onClick={testMicrophone}
              >
                {micTest.state === "listening" ? t("nativeApp.testListening") : t("nativeApp.testMicrophone")}
              </Button>
            )}
            {micTest.state === "done" && (
              <p className="text-sm text-ink-soft" role="status" data-testid="native-mic-test-result">
                {micTest.text}
              </p>
            )}
          </div>
          <p className="text-xs text-ink-faint" data-testid="native-speech-privacy">
            {t("nativeApp.speechPrivacy")}
          </p>
        </Card>
      </HubSection>

      {!isProductionBetaEnv() && (
        <HubSection id="diagnostico-nativo" className="scroll-mt-6" title={t("nativeApp.diagnosticsTitle")}>
          <Card className="space-y-3 rounded-xl border-line/70 p-3.5 shadow-none" data-testid="native-diagnostics-card">
            <p className="text-sm text-ink-soft">{t("nativeApp.pendingReminders", { count: status.pending })}</p>
            <Button
              variant="outline"
              size="sm"
              className="min-h-12"
              data-testid="native-dev-test-reminder"
              disabled={notificationsView !== "granted"}
              onClick={() => void scheduleDevReminder()}
            >
              {t("nativeApp.devTestReminder")}
            </Button>
            {devNote && <p className="text-xs text-ink-faint">{t("nativeApp.devTestScheduled")}</p>}
          </Card>
        </HubSection>
      )}
    </>
  );
}

function PermissionRow({
  label,
  state,
  actionLabel,
  onAction,
  testId,
  t,
}: {
  label: string;
  state: PermissionView;
  actionLabel: string;
  onAction?: () => void;
  testId: string;
  t: (key: MessageKey) => string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2" data-testid={testId} data-state={state}>
      <div>
        <div className="font-medium text-ink">{label}</div>
        <div className="text-sm text-ink-soft">{t(PERMISSION_LABEL[state])}</div>
      </div>
      {onAction && (
        <Button variant="outline" size="sm" className="min-h-12" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
