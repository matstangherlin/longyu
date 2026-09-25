import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";
import type { MessageKey } from "../../locales/pt-BR";
import { HubSection } from "../layout/HubLayout";
import { Button, Card } from "../ui/primitives";
import { SettingSwitch } from "../ui/SettingSwitch";
import { isProductionBetaEnv } from "../../lib/appEnvironment";
import { activeCourseDirection } from "../../lib/courseDirectionState";
import { todayKey } from "../../lib/storage";
import {
  DAILY_VOCABULARY_DEFAULT_PREFS,
  adjustDailyVocabularyWindow,
  devTestVocabularyNotification,
  formatWindowTime,
  validateDailyVocabularyWindow,
  vocabularyNotificationCopy,
  type WindowProblem,
} from "../../lib/dailyVocabularyPlan";
import { dailyVocabularyCandidate } from "../../lib/dailyVocabulary";
import { planWordFor, rankedForState, todayExposure } from "../../lib/dailyVocabularyRuntime";
import {
  hasNativeNotifications,
  notificationPermission,
  scheduleDevVocabularyNotification,
  type NotificationPermission,
} from "../../lib/platform/nativeNotifications";
import { openNativeNotificationSettings } from "../../lib/platform/nativeSpeech";

const PROBLEM_KEY: Record<WindowProblem, MessageKey> = {
  INVALID: "dailyWord.windowInvalid",
  TOO_SHORT: "dailyWord.windowTooShort",
  CROSSES_MIDNIGHT: "dailyWord.windowCrossesMidnight",
  QUIET_HOURS: "dailyWord.windowQuiet",
};

function parseTime(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
}

/**
 * RC2.2.15 · B–F, BJ–BK, DS — Configurações › Notificações › Vocabulário diário.
 *
 * Opt-in (desligado até o aluno ligar: permissão do Android não é
 * consentimento). Janela no mesmo dia, ≥ 30 min, fora do silêncio. "Ver
 * exemplo" só mostra a prévia — nada é agendado. Sem permissão: explica e
 * leva às configurações do Android, sem insistir.
 */
export function DailyVocabularySettings() {
  const { t, locale } = useTranslation();
  const android = hasNativeNotifications();
  const prefs = useStore((s) => s.dailyVocabularyPrefs) ?? DAILY_VOCABULARY_DEFAULT_PREFS;
  const setPrefs = useStore((s) => s.setDailyVocabularyPrefs);
  const [draft, setDraft] = useState({ start: formatWindowTime(prefs.startMin), end: formatWindowTime(prefs.endMin) });
  const [preview, setPreview] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("unavailable");
  const [devNote, setDevNote] = useState(false);

  useEffect(() => {
    setDraft({ start: formatWindowTime(prefs.startMin), end: formatWindowTime(prefs.endMin) });
  }, [prefs.startMin, prefs.endMin]);

  useEffect(() => {
    if (!android) return;
    void notificationPermission().then(setPermission);
  }, [android, prefs.enabled]);

  const draftWindow = { startMin: parseTime(draft.start), endMin: parseTime(draft.end) };
  const check = validateDailyVocabularyWindow(draftWindow);
  const problem = check.ok ? null : check.reason;

  const commitWindow = (next: { start: string; end: string }) => {
    setDraft(next);
    const window = { startMin: parseTime(next.start), endMin: parseTime(next.end) };
    // Só grava janela válida; a inválida fica no rascunho com a explicação.
    if (validateDailyVocabularyWindow(window).ok) setPrefs(window);
  };

  const adjust = () => {
    const fixed = adjustDailyVocabularyWindow(draftWindow);
    setPrefs(fixed);
    setDraft({ start: formatWindowTime(fixed.startMin), end: formatWindowTime(fixed.endMin) });
  };

  // Prévia: a palavra de hoje (ou a primeira candidata segura), sem agendar nada.
  const previewCopy = useMemo(() => {
    if (!preview) return null;
    const state = useStore.getState();
    const direction = activeCourseDirection() ?? "pt-zh";
    const today = todayKey();
    const assigned = todayExposure(state, today);
    const candidate = (assigned && dailyVocabularyCandidate(assigned.lexicalId)) || rankedForState(state, direction, today)[0]?.candidate;
    const word = candidate ? planWordFor(candidate, direction) : null;
    return word ? vocabularyNotificationCopy(word, locale === "en" ? "en" : "pt-BR") : null;
  }, [preview, locale]);

  const scheduleDev = async () => {
    const state = useStore.getState();
    const direction = activeCourseDirection() ?? "pt-zh";
    const candidate = rankedForState(state, direction, todayKey())[0]?.candidate;
    const word = candidate ? planWordFor(candidate, direction) : null;
    if (!word) return;
    const interfaceLocale = locale === "en" ? "en" : "pt-BR";
    await scheduleDevVocabularyNotification(devTestVocabularyNotification(Date.now(), word, interfaceLocale), interfaceLocale);
    setDevNote(true);
  };

  return (
    <HubSection id="vocabulario-diario" className="scroll-mt-6" title={t("dailyWord.settingsTitle")}>
      <Card className="space-y-4 rounded-xl border-line/70 p-3.5 shadow-none" data-testid="daily-vocabulary-settings" data-enabled={prefs.enabled}>
        <SettingSwitch
          label={t("dailyWord.settingsTitle")}
          desc={t("dailyWord.settingsDesc")}
          checked={prefs.enabled}
          onChange={() => setPrefs({ enabled: !prefs.enabled })}
        />
        {prefs.enabled ? (
          <>
            <fieldset className="space-y-2" data-testid="daily-vocabulary-window">
              <legend className="text-sm font-medium text-ink">{t("dailyWord.window")}</legend>
              <div className="flex items-center gap-2">
                <label className="flex flex-1 flex-col text-xs text-ink-soft">
                  {t("dailyWord.windowFrom")}
                  <input
                    type="time"
                    step={300}
                    value={draft.start}
                    data-testid="daily-vocabulary-start"
                    onChange={(event) => commitWindow({ ...draft, start: event.target.value })}
                    className="mt-1 h-12 rounded-xl border border-line bg-surface-2 px-3 text-base text-ink"
                  />
                </label>
                <span aria-hidden="true" className="pt-5 text-ink-faint">—</span>
                <label className="flex flex-1 flex-col text-xs text-ink-soft">
                  {t("dailyWord.windowTo")}
                  <input
                    type="time"
                    step={300}
                    value={draft.end}
                    data-testid="daily-vocabulary-end"
                    onChange={(event) => commitWindow({ ...draft, end: event.target.value })}
                    className="mt-1 h-12 rounded-xl border border-line bg-surface-2 px-3 text-base text-ink"
                  />
                </label>
              </div>
              {problem && (
                <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-sm text-ink-soft" role="alert" data-testid="daily-vocabulary-window-problem" data-problem={problem}>
                  <p>{t(PROBLEM_KEY[problem])}</p>
                  <Button variant="outline" size="sm" className="min-h-12" onClick={adjust} data-testid="daily-vocabulary-adjust">
                    {t("dailyWord.adjust")}
                  </Button>
                </div>
              )}
            </fieldset>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink">{t("dailyWord.frequency")}</span>
              <span className="text-ink-soft">{t("dailyWord.everyDay")}</span>
            </div>
            {android && permission === "denied" && (
              <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-sm text-ink-soft" data-testid="daily-vocabulary-permission-denied">
                <p>{t("dailyWord.permissionDenied")}</p>
                <Button variant="outline" size="sm" className="min-h-12" onClick={() => void openNativeNotificationSettings()}>
                  {t("dailyWord.openSettings")}
                </Button>
              </div>
            )}
            {!android && <p className="text-xs text-ink-faint" data-testid="daily-vocabulary-web-note">{t("dailyWord.webNote")}</p>}
            <div>
              <Button variant="ghost" size="sm" className="min-h-12 px-0" onClick={() => setPreview((value) => !value)} data-testid="daily-vocabulary-preview-toggle">
                {preview ? t("dailyWord.previewHide") : t("dailyWord.preview")}
              </Button>
              {preview && (
                <div className="mt-1 rounded-2xl border border-line bg-surface-2 p-3" data-testid="daily-vocabulary-preview">
                  {previewCopy ? (
                    <>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        <img src="/longyu-mascot.png" alt="" aria-hidden="true" className="h-4 w-4 object-contain" /> Longyu · {t("dailyWord.eyebrow")}
                      </div>
                      <div className="mt-1 font-semibold text-ink" data-preview-title>{previewCopy.title}</div>
                      <div className="whitespace-pre-line text-sm text-ink-soft" data-preview-body>{previewCopy.body}</div>
                      <p className="mt-2 text-xs text-ink-faint">{t("dailyWord.previewNote")}</p>
                    </>
                  ) : (
                    <p className="text-sm text-ink-soft">{t("dailyWord.noCandidate")}</p>
                  )}
                </div>
              )}
            </div>
            {android && !isProductionBetaEnv() && (
              <div className="space-y-1 border-t border-line pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-12"
                  data-testid="daily-vocabulary-dev-test"
                  disabled={permission !== "granted"}
                  onClick={() => void scheduleDev()}
                >
                  {t("dailyWord.devTest")}
                </Button>
                {devNote && <p className="text-xs text-ink-faint">{t("dailyWord.devScheduled")}</p>}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-ink-faint">{t("dailyWord.offNote")}</p>
        )}
      </Card>
    </HubSection>
  );
}
