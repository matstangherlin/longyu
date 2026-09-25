import { useEffect, useRef, useState } from "react";
import { useStore } from "../../lib/store";
import { useI18n } from "../../i18n";
import { todayKey } from "../../lib/storage";
import { activeCourseDirection } from "../../lib/courseDirectionState";
import { planStudyReminders } from "../../lib/studyReminderPlan";
import {
  DAILY_VOCABULARY_DEFAULT_PREFS,
  planDailyVocabularyNotifications,
  type DailyVocabularyAssignment,
  type DailyVocabularyPlan,
} from "../../lib/dailyVocabularyPlan";
import { planWordsFor, rankedForState, todayAssignmentFor } from "../../lib/dailyVocabularyRuntime";
import {
  applyVocabularyPlan,
  cancelVocabularyNotifications,
  hasNativeNotifications,
  notificationPermission,
} from "../../lib/platform/nativeNotifications";
import { subscribeAppLifecycle } from "../../lib/platform/appLifecycle";

type PlanWindow = Window & { __longyuDailyVocabularyPlan?: (now?: number) => DailyVocabularyPlan };

function debugHooksEnabled(): boolean {
  const env = (import.meta as { env?: Record<string, unknown> }).env ?? {};
  return env.DEV === true || env.VITE_USE_TEST_FIXTURES === "true";
}

/**
 * RC2.2.15 · BP–BR — reconciliação da Palavra do dia, a cada abertura/retorno
 * e a cada mudança de preferência, curso, progresso ou lembretes:
 *
 *   1. lê as preferências (opt-in + janela) e o curso;
 *   2. desligado → cancela SÓ os IDs de vocabulário;
 *   3. Android com permissão → plano dos próximos 7 dias (IDs por dia:
 *      substitui, nunca acumula; atualização do app refaz o mesmo conjunto);
 *   4. sem notificação (Web/sem permissão) → só define a palavra de HOJE, para
 *      o card da Jornada e o Atlas.
 *
 * Não renderiza nada.
 */
export function DailyVocabularyBootstrap() {
  const android = hasNativeNotifications();
  const { locale } = useI18n();
  const prefs = useStore((s) => s.dailyVocabularyPrefs) ?? DAILY_VOCABULARY_DEFAULT_PREFS;
  const setupComplete = useStore((s) => s.accountSetupComplete);
  const accountId = useStore((s) => s.currentAccountId);
  const courseDirection = useStore((s) => s.courseDirection);
  const completed = useStore((s) => s.completedLessons.length);
  const learned = useStore((s) => s.learnedChars.length + s.learnedChunks.length);
  const streak = useStore((s) => s.streak);
  const lastStudyDate = useStore((s) => s.lastStudyDate);
  const reminderPrefs = useStore((s) => s.notificationPrefs);
  const [resumeTick, setResumeTick] = useState(0);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const interfaceLocale = locale === "en" ? "en" : "pt-BR";

  useEffect(
    () =>
      subscribeAppLifecycle((state) => {
        if (state === "active") setResumeTick((tick) => tick + 1);
      }),
    []
  );

  useEffect(() => {
    chain.current = chain.current
      .catch(() => undefined)
      .then(async () => {
        const state = useStore.getState();
        const direction = activeCourseDirection();
        const today = todayKey();
        if (!prefs.enabled || !direction || state.accountSetupComplete !== true) {
          if (android) await cancelVocabularyNotifications();
          return;
        }
        const words = planWordsFor(rankedForState(state, direction, today), direction);
        let assignments: DailyVocabularyAssignment[] = [];
        if (android) {
          const permission = await notificationPermission();
          const granted = permission === "granted";
          const now = Date.now();
          const exposures = state.dailyVocabulary?.exposures ?? [];
          const plan = planDailyVocabularyNotifications({
            now,
            enabled: prefs.enabled,
            permissionGranted: granted,
            window: { startMin: prefs.startMin, endMin: prefs.endMin },
            interfaceLocale,
            seed: state.dailyVocabulary.seed,
            candidates: words,
            assignments: exposures.filter((entry) => entry.dateKey >= today),
            history: exposures,
            studyReminders: planStudyReminders({
              now,
              streak: state.streak,
              lastStudyDate: state.lastStudyDate,
              prefs: state.notificationPrefs ?? { enabled: true, streak: true, comeback: true },
              permissionGranted: granted,
              locale: interfaceLocale,
            }),
          });
          await applyVocabularyPlan(plan.notifications, interfaceLocale);
          assignments = plan.assignments;
        }
        if (!assignments.some((entry) => entry.dateKey === today)) {
          const lexicalId = todayAssignmentFor(state, direction, today);
          if (lexicalId) assignments = [...assignments, { dateKey: today, lexicalId, scheduledAt: null }];
        }
        useStore.getState().syncDailyVocabularyAssignments(assignments, today);
      })
      .catch(() => undefined);
  }, [
    android,
    prefs.enabled,
    prefs.startMin,
    prefs.endMin,
    setupComplete,
    accountId,
    courseDirection,
    completed,
    learned,
    streak,
    lastStudyDate,
    reminderPrefs,
    interfaceLocale,
    resumeTick,
  ]);

  // DEV/QA/E2E: o plano que o Android agendaria agora (permissão simulada).
  useEffect(() => {
    if (typeof window === "undefined" || !debugHooksEnabled()) return undefined;
    const target = window as PlanWindow;
    target.__longyuDailyVocabularyPlan = (nowOverride?: number) => {
      const state = useStore.getState();
      const direction = activeCourseDirection() ?? "pt-zh";
      const now = nowOverride ?? Date.now();
      const today = todayKey(new Date(now));
      const current = state.dailyVocabularyPrefs ?? DAILY_VOCABULARY_DEFAULT_PREFS;
      const exposures = state.dailyVocabulary?.exposures ?? [];
      return planDailyVocabularyNotifications({
        now,
        enabled: current.enabled,
        permissionGranted: true,
        window: { startMin: current.startMin, endMin: current.endMin },
        interfaceLocale,
        seed: state.dailyVocabulary.seed,
        candidates: planWordsFor(rankedForState(state, direction, today), direction),
        assignments: exposures.filter((entry) => entry.dateKey >= today),
        history: exposures,
        studyReminders: planStudyReminders({
          now,
          streak: state.streak,
          lastStudyDate: state.lastStudyDate,
          prefs: state.notificationPrefs ?? { enabled: true, streak: true, comeback: true },
          permissionGranted: true,
          locale: interfaceLocale,
        }),
      });
    };
    return () => {
      delete target.__longyuDailyVocabularyPlan;
    };
  }, [interfaceLocale]);

  return null;
}
