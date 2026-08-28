import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStore, type MandarinDisplayMode, type SoundTheme, type ThemeName, type TranslationMode } from "../../lib/store";
import { hasChineseVoice, isTTSAvailable, speak } from "../../lib/tts";
import { playSoundFx, type SoundKind } from "../../lib/soundFx";
import { Card, Button, ButtonLink } from "../../components/ui/primitives";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { BetaBadge } from "../../components/feedback/BetaBadge";
import { FeedbackPrompt } from "../../components/feedback/FeedbackPrompt";
import { MandarinText } from "../../components/hanzi/MandarinText";
import { COURSE_PROFILE } from "../../data/course";
import { DOMAIN_META, DOMAIN_ORDER, type DomainTrack } from "../../data/domains";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { isDevLocalAuthAllowed } from "../../lib/auth/localAuthPolicy";
import { isDevPreviewAllowed } from "../../lib/entitlements";
import { suggestUsernameFromName } from "../../lib/social/username";
import {
  fetchMySocialSettings,
  updateShowInSearch,
  updateUsername,
} from "../../services/socialService";
import {
  clearPedagogyEventQueue,
  getTelemetryConsent,
  pedagogyEventQueueSize,
  setTelemetryConsent,
} from "../../services/telemetryConsent";
import { buildPrivacyExportBundle, requestAccountDeletion } from "../../services/privacyService";
import { ACCOUNT_DELETION_CONFIRMATION_TEXT } from "../../../supabase/functions/_shared/accountDeletion";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { TelemetryDataDetails } from "../../components/privacy/TelemetryDataDetails";
import { LanguageSwitcher } from "../../components/i18n/LanguageSwitcher";
import { useTranslation } from "../../i18n/useTranslation";
import { localizeUserMessage } from "../../i18n/errors";
import type { MessageKey } from "../../locales/pt-BR";

const THEMES: { id: ThemeName; nameKey: "settings.themeClay" | "settings.themeChina" | "settings.themeDark"; descKey: "settings.themeClayDesc" | "settings.themeChinaDesc" | "settings.themeDarkDesc"; swatch: string[] }[] = [
  { id: "clay", nameKey: "settings.themeClay", descKey: "settings.themeClayDesc", swatch: ["#F7F6F3", "#FFFFFF", "#B9412E"] },
  { id: "china", nameKey: "settings.themeChina", descKey: "settings.themeChinaDesc", swatch: ["#FFF9F7", "#FFFFFF", "#B42318"] },
  { id: "dark", nameKey: "settings.themeDark", descKey: "settings.themeDarkDesc", swatch: ["#0C0D0F", "#1F1F1F", "#CD4432"] },
];

const MANDARIN_DISPLAY_OPTIONS: { id: MandarinDisplayMode; labelKey: "settings.displayPinyinHanzi" | "settings.displayHanziPinyin" | "settings.displayHanziOnly" | "settings.displayPinyinOnly"; example: string }[] = [
  { id: "pinyin_hanzi", labelKey: "settings.displayPinyinHanzi", example: "nǐ hǎo · 你好" },
  { id: "hanzi_pinyin", labelKey: "settings.displayHanziPinyin", example: "你好 · nǐ hǎo" },
  { id: "hanzi_only", labelKey: "settings.displayHanziOnly", example: "你好" },
  { id: "pinyin_only", labelKey: "settings.displayPinyinOnly", example: "nǐ hǎo" },
];

const TRANSLATION_OPTIONS: { id: TranslationMode; labelKey: "settings.translationAlways" | "settings.translationTap" | "settings.translationHidden" }[] = [
  { id: "always", labelKey: "settings.translationAlways" },
  { id: "tap", labelKey: "settings.translationTap" },
  { id: "hidden", labelKey: "settings.translationHidden" },
];

const DISPLAY_OPTION_EXAMPLE: Partial<Record<MandarinDisplayMode, string>> = {
  pinyin_only: "wǒ men xué hànyǔ",
  hanzi_only: "我们学汉语",
  pinyin_hanzi: "wǒ men xué hànyǔ · 我们学汉语",
};

const SOUND_THEME_OPTIONS: { id: SoundTheme; label: string; descKey: "settings.soundClassicDesc" | "settings.soundSoftDesc" | "settings.soundGameDesc" }[] = [
  { id: "longyu_classic", label: "Longyu Classic", descKey: "settings.soundClassicDesc" },
  { id: "longyu_soft", label: "Longyu Soft", descKey: "settings.soundSoftDesc" },
  { id: "longyu_game", label: "Longyu Game", descKey: "settings.soundGameDesc" },
];

const SOUND_TEST_ITEMS: { kind: SoundKind; labelKey: MessageKey }[] = [
  { kind: "tap", labelKey: "settings.soundTap" },
  { kind: "pieceSelect", labelKey: "settings.soundPieceSelect" },
  { kind: "step", labelKey: "settings.soundStep" },
  { kind: "success", labelKey: "settings.soundSuccess" },
  { kind: "error", labelKey: "settings.soundError" },
  { kind: "streak", labelKey: "settings.soundStreak" },
  { kind: "missionComplete", labelKey: "settings.soundMissionComplete" },
  { kind: "qiGain", labelKey: "settings.soundQiGain" },
  { kind: "qiSpend", labelKey: "settings.soundQiSpend" },
  { kind: "chestReady", labelKey: "settings.soundChestReady" },
  { kind: "chestOpenCommon", labelKey: "settings.soundChestOpenCommon" },
  { kind: "chestOpenRare", labelKey: "settings.soundChestOpenRare" },
  { kind: "chestOpenEpic", labelKey: "settings.soundChestOpenEpic" },
  { kind: "chestOpenLegendary", labelKey: "settings.soundChestOpenLegendary" },
  { kind: "medal", labelKey: "settings.soundMedal" },
  { kind: "lessonComplete", labelKey: "settings.soundLessonComplete" },
  { kind: "moduleComplete", labelKey: "settings.soundModuleComplete" },
  { kind: "blocked", labelKey: "settings.soundBlocked" },
];

const PRO_ENGINE_KEYS: Record<DomainTrack, { titleKey: "settings.proSomTitle" | "settings.proFalaTitle" | "settings.proHanziTitle" | "settings.proLeituraTitle"; featuresKey: "settings.proSomFeatures" | "settings.proFalaFeatures" | "settings.proHanziFeatures" | "settings.proLeituraFeatures" }> = {
  som: { titleKey: "settings.proSomTitle", featuresKey: "settings.proSomFeatures" },
  fala: { titleKey: "settings.proFalaTitle", featuresKey: "settings.proFalaFeatures" },
  hanzi: { titleKey: "settings.proHanziTitle", featuresKey: "settings.proHanziFeatures" },
  leitura: { titleKey: "settings.proLeituraTitle", featuresKey: "settings.proLeituraFeatures" },
};

export function SettingsPage() {
  const { t } = useTranslation();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const createAccount = useStore((s) => s.createAccount);
  const switchAccount = useStore((s) => s.switchAccount);
  const ttsRate = useStore((s) => s.ttsRate);
  const setTtsRate = useStore((s) => s.setTtsRate);
  const ttsVolume = useStore((s) => s.ttsVolume);
  const setTtsVolume = useStore((s) => s.setTtsVolume);
  const soundEffects = useStore((s) => s.soundEffects);
  const setSoundEffects = useStore((s) => s.setSoundEffects);
  const soundFxVolume = useStore((s) => s.soundFxVolume);
  const setSoundFxVolume = useStore((s) => s.setSoundFxVolume);
  const soundTheme = useStore((s) => s.soundTheme);
  const setSoundTheme = useStore((s) => s.setSoundTheme);
  const mandarinDisplayMode = useStore((s) => s.mandarinDisplayMode);
  const setMandarinDisplayMode = useStore((s) => s.setMandarinDisplayMode);
  const translationMode = useStore((s) => s.translationMode);
  const setTranslationMode = useStore((s) => s.setTranslationMode);
  const toneColors = useStore((s) => s.toneColors);
  const setToneColors = useStore((s) => s.setToneColors);
  const toneColorIntensity = useStore((s) => s.toneColorIntensity);
  const setToneColorIntensity = useStore((s) => s.setToneColorIntensity);
  const autoPlayAudio = useStore((s) => s.autoPlayAudio);
  const setAutoPlayAudio = useStore((s) => s.setAutoPlayAudio);
  const slowAudio = useStore((s) => s.slowAudio);
  const setSlowAudio = useStore((s) => s.setSlowAudio);
  const isPremium = useStore((s) => s.isPremium);

  function testSoundSignature() {
    // Tour da assinatura sonora: interação -> recompensa -> clímax.
    const sequence: [SoundKind, number][] = [
      ["tap", 0],
      ["pieceSelect", 260],
      ["step", 560],
      ["success", 1000],
      ["streak", 1600],
      ["qiGain", 2500],
      ["medal", 3400],
      ["chestOpenLegendary", 4400],
      ["moduleComplete", 6600],
    ];
    sequence.forEach(([kind, delay]) => {
      window.setTimeout(() => playSoundFx(kind, soundEffects), delay);
    });
  }
  const setPremium = useStore((s) => s.setPremium);
  const points = useStore((s) => s.points);
  const completedLessons = useStore((s) => s.completedLessons);
  const [newAccountName, setNewAccountName] = useState("");
  const [socialUsername, setSocialUsername] = useState("");
  const [socialShowInSearch, setSocialShowInSearch] = useState(true);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [telemetryConsent, setTelemetryConsentState] = useState(() => getTelemetryConsent());
  const [queueSize, setQueueSize] = useState(() => pedagogyEventQueueSize());
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);
  const [showDataDetails, setShowDataDetails] = useState(false);
  const [privacyBusy, setPrivacyBusy] = useState(false);

  const voiceOk = isTTSAvailable() && hasChineseVoice();
  const accountList = Object.values(accounts).sort((a, b) => a.createdAt - b.createdAt);
  const activeAccount = accounts[currentAccountId];
  const cloudReady = isSupabaseBackendEnabled() && activeAccount?.authMode === "cloud";
  const location = useLocation();

  useEffect(() => {
    if (!cloudReady) return;
    let cancelled = false;
    void fetchMySocialSettings().then((result) => {
      if (cancelled || !result.ok) return;
      setSocialUsername(result.data.username ?? "");
      setSocialShowInSearch(result.data.show_in_search);
    });
    return () => {
      cancelled = true;
    };
  }, [cloudReady, currentAccountId]);

  // Permite que o hub Meu (/config#exibicao, #tema, #sons, #dados) role até a seção.
  useEffect(() => {
    const id = location.hash.replace("#", "");
    if (!id) return;
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  function handleCreateAccount() {
    if (newAccountName.trim().length < 2) return;
    createAccount(newAccountName);
    setNewAccountName("");
  }

  async function handleSaveUsername() {
    setSocialLoading(true);
    setSocialNotice(null);
    const result = await updateUsername(socialUsername);
    setSocialLoading(false);
    if (!result.ok) {
      setSocialNotice(localizeUserMessage(result.message));
      return;
    }
    setSocialUsername(result.data.username ?? "");
    setSocialNotice(t("settings.usernameSaved"));
  }

  async function handleToggleShowInSearch() {
    const next = !socialShowInSearch;
    setSocialLoading(true);
    setSocialNotice(null);
    const result = await updateShowInSearch(next);
    setSocialLoading(false);
    if (!result.ok) {
      setSocialNotice(localizeUserMessage(result.message));
      return;
    }
    setSocialShowInSearch(result.data.show_in_search);
    setSocialNotice(next ? t("settings.profileVisible") : t("settings.profileHidden"));
  }

  function handleSuggestUsername() {
    setSocialUsername(suggestUsernameFromName(activeAccount?.name ?? "aluno"));
  }

  return (
    <HubPage className="space-y-5">
      <HubHeader
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        desc={t("settings.lead")}
        badge={<BetaBadge className="shrink-0" />}
      />

      <HubSection
        id="idioma"
        className="scroll-mt-6"
        title={t("settings.language")}
        desc={t("settings.languageLead")}
      >
        <Card className="rounded-xl border-line/70 p-3.5 shadow-none">
          <LanguageSwitcher id="settings-interface-locale" />
        </Card>
      </HubSection>

      <HubSection
        id="idioma-alvo"
        className="scroll-mt-6"
        title={t("settings.learningMandarin")}
        desc={t("settings.learningMandarinLead")}
      >
        <Card className="rounded-xl border-line/70 p-3.5 shadow-none" data-testid="target-language-card">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            {COURSE_PROFILE.targetLanguage.code}
          </div>
          <div className="mt-1 font-serif text-lg font-semibold text-ink">
            {COURSE_PROFILE.targetLanguage.nativeName} · {t("settings.targetLanguageName")}
          </div>
        </Card>
      </HubSection>

      <HubSection title={t("settings.course")}>
        <Card className="rounded-xl border-line/70 p-3.5 shadow-none">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            {t("settings.courseFocus")}
          </div>
          <div className="mt-1 font-serif text-lg font-semibold text-ink">
            {t("settings.sourceLanguageName")} → {t("settings.targetLanguageName")}
          </div>
          <p className="mt-1 text-xs text-ink-soft">{t("settings.coursePromise")}</p>
        </Card>
      </HubSection>

      <HubSection id="dados" className="scroll-mt-6" title={t("settings.accountProgress")} desc={t("settings.accountProgressLead")}>
        <Card className="space-y-3 rounded-xl border-line/70 p-3.5 shadow-none">
          <div className="grid gap-2">
            {accountList.map((account) => {
              const isCurrent = account.id === currentAccountId;
              const lessons = isCurrent ? completedLessons.length : account.completedLessons.length;
              const accountPoints = isCurrent ? points : account.points;
              return (
                <button key={account.id} onClick={() => switchAccount(account.id)} className="text-left">
                  <div
                    className={[
                      "rounded-xl border px-3 py-2.5 transition",
                      isCurrent ? "border-accent bg-accent-soft/60" : "border-line/70 bg-surface-2 hover:bg-surface",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-ink">{account.name}</div>
                        <div className="text-xs text-ink-faint">
                          {t("settings.lessonsQiStreak", { lessons, qi: accountPoints, streak: account.longestStreak })}
                        </div>
                      </div>
                      {isCurrent && <span className="text-xs font-semibold text-accent">{t("common.active")}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {isDevLocalAuthAllowed() ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newAccountName}
              onChange={(event) => setNewAccountName(event.target.value)}
              placeholder={t("settings.newStudentPlaceholder")}
              className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
            />
            <Button onClick={handleCreateAccount} disabled={newAccountName.trim().length < 2}>
              {t("settings.createTestProfile")}
            </Button>
          </div>
          ) : null}

          <Link
            to="/conta"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-4 text-[15px] font-medium text-ink transition hover:bg-surface-2"
          >
            {t("settings.openAccountHub")}
          </Link>

          <div className="rounded-lg bg-surface-2 px-3 py-2 text-[11px] text-ink-faint">
            {isSupabaseBackendEnabled()
              ? t("settings.progressInAccount")
              : t("settings.progressOnDevice")}
          </div>
        </Card>
      </HubSection>

      <HubSection
        id="privacidade"
        className="scroll-mt-6"
        title={t("settings.friendsPrivacy")}
        desc={t("settings.friendsPrivacyLead")}
      >
        <Card className="space-y-4 rounded-xl border-line/70 p-3.5 shadow-none">
          {!cloudReady ? (
            <p className="text-sm text-ink-soft">
              {t("settings.needCloudForFriends")}
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="social-username" className="text-sm font-medium text-ink">
                  {t("settings.usernameLabel")}
                </label>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {t("settings.usernameHint", { username: socialUsername || t("settings.usernameFallback") })}
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="social-username"
                    value={socialUsername}
                    onChange={(event) => setSocialUsername(event.target.value.replace(/^@/, ""))}
                    placeholder={t("settings.usernamePlaceholder")}
                    className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                  />
                  <Button type="button" variant="outline" onClick={handleSuggestUsername} disabled={socialLoading}>
                    {t("common.suggested")}
                  </Button>
                  <Button type="button" onClick={() => void handleSaveUsername()} disabled={socialLoading || socialUsername.trim().length < 3}>
                    {t("common.save")}
                  </Button>
                </div>
              </div>

              <SettingSwitch
                label={t("settings.showInSearch")}
                desc={t("settings.showInSearchLead")}
                checked={socialShowInSearch}
                onChange={() => void handleToggleShowInSearch()}
              />

              {socialNotice && <p className="text-sm text-ink-soft">{socialNotice}</p>}
            </>
          )}
        </Card>
      </HubSection>

      <HubSection
        id="privacidade-dados"
        className="scroll-mt-6"
        title={t("settings.privacyData")}
        desc={t("settings.privacyDataLead")}
      >
        <Card className="space-y-4 rounded-xl border-line/70 p-3.5 shadow-none">
          <SettingSwitch
            label={t("settings.pedagogyData")}
            desc={t("settings.pedagogyDataLead")}
            checked={telemetryConsent}
            onChange={() => {
              const next = !telemetryConsent;
              void (async () => {
                await setTelemetryConsent(next);
                setTelemetryConsentState(next);
                setQueueSize(pedagogyEventQueueSize());
                setPrivacyNotice(next ? t("settings.consentOn") : t("settings.consentOff"));
              })();
            }}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowDataDetails(true)}>
              {t("settings.seeCollectedData")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                clearPedagogyEventQueue();
                setQueueSize(0);
                setPrivacyNotice(t("settings.queueCleared"));
              }}
            >
              {t("settings.clearEventQueue", { count: queueSize })}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={privacyBusy}
              onClick={() => {
                void (async () => {
                  setPrivacyBusy(true);
                  try {
                    const bundle = await buildPrivacyExportBundle();
                    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `longyu-dados-${bundle.exportedAt.slice(0, 10)}.json`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                    setPrivacyNotice(t("settings.exportDownloaded"));
                  } finally {
                    setPrivacyBusy(false);
                  }
                })();
              }}
            >
              {t("settings.requestExport")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={privacyBusy}
              onClick={() => {
                void (async () => {
                  const confirmationText = window.prompt(
                    t("settings.deletionPrompt", { phrase: ACCOUNT_DELETION_CONFIRMATION_TEXT })
                  );
                  if (confirmationText === null) return;
                  setPrivacyBusy(true);
                  const result = await requestAccountDeletion(confirmationText);
                  setPrivacyBusy(false);
                  setPrivacyNotice(localizeUserMessage(result.message));
                })();
              }}
            >
              {t("settings.requestDeletion")}
            </Button>
          </div>

          <Link
            to="/privacidade#politica"
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-accent hover:bg-accent-soft hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
          >
            {t("settings.privacyPolicy")}
          </Link>

          {privacyNotice && <p className="text-sm text-ink-soft">{privacyNotice}</p>}
        </Card>
      </HubSection>

      {showDataDetails && (
        <ModalOverlay label={t("settings.collectedData")} onBackdropClick={() => setShowDataDetails(false)}>
          <div
            className="max-h-[calc(100dvh_-_env(safe-area-inset-top))] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card sm:max-h-[90dvh] sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <TelemetryDataDetails />
            <Button type="button" className="mt-5 w-full" onClick={() => setShowDataDetails(false)}>
              {t("common.close")}
            </Button>
          </div>
        </ModalOverlay>
      )}

      <HubSection id="tema" className="scroll-mt-6" title={t("settings.theme")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {THEMES.map((themeOption) => (
            <button
              key={themeOption.id}
              type="button"
              onClick={() => setTheme(themeOption.id)}
              aria-pressed={theme === themeOption.id}
              className="group min-h-11 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
            >
              <Card
                variant="interactive"
                className={[
                  "flex items-center gap-4 p-4 transition",
                  theme === themeOption.id ? "ring-2 ring-accent" : "hover:bg-surface-2",
                ].join(" ")}
              >
                <div className="flex gap-1.5">
                  {themeOption.swatch.map((c) => (
                    <span
                      key={c}
                      className="h-9 w-9 rounded-lg border border-line"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div>
                  <div className="font-medium text-ink">{t(themeOption.nameKey)}</div>
                  <div className="text-sm text-ink-soft">{t(themeOption.descKey)}</div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </HubSection>

      <HubSection
        id="exibicao"
        className="scroll-mt-6"
        title={t("settings.howToSeeMandarin")}
        desc={t("settings.howToSeeMandarinLead")}
      >
        <Card className="space-y-4 overflow-hidden rounded-xl border-line/70 p-3.5 shadow-none">
          <div className="rounded-2xl bg-surface-2 p-4 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{t("settings.visualPreview")}</div>
            <MandarinText
              hanzi="我们学汉语"
              pinyin="wǒ men xué hànyǔ"
              meaning={t("settings.previewGloss")}
              size="xl"
              audio
              align="center"
              className="mt-3"
            />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              {t("settings.display")}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {MANDARIN_DISPLAY_OPTIONS.filter((option) => option.id !== "hanzi_pinyin").map((option) => {
                const active = mandarinDisplayMode === option.id;
                const example = DISPLAY_OPTION_EXAMPLE[option.id] ?? option.example;
                return (
                  <button
                    key={option.id}
                    onClick={() => setMandarinDisplayMode(option.id)}
                    className={[
                      "min-h-[92px] rounded-2xl border px-4 py-3 text-left transition",
                      active ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line bg-surface-2 hover:bg-surface",
                    ].join(" ")}
                  >
                    <div className="font-medium text-ink">{t(option.labelKey)}</div>
                    <div className="mt-1 font-serif text-sm text-ink-soft">{example}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              {t("settings.translation")}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {TRANSLATION_OPTIONS.map((option) => {
                const active = translationMode === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setTranslationMode(option.id)}
                    className={[
                      "h-11 rounded-xl border px-3 text-sm font-medium transition",
                      active ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface-2 text-ink-soft hover:text-ink",
                    ].join(" ")}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 border-t border-line pt-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
                <div className="font-medium text-ink">{t("settings.pinyinWithMarks")}</div>
                <div className="mt-0.5 text-sm leading-5 text-ink-soft">
                  {t("settings.pinyinWithMarksLead")}
                </div>
              </div>
              <SettingSwitch
                label={t("settings.toneColors")}
                desc={t("settings.toneColorsLead")}
                checked={toneColors}
                onChange={() => setToneColors(!toneColors)}
              />
              <div className={toneColors ? "" : "opacity-45"}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-ink">{t("settings.pinyinColor")}</div>
                  <div className="font-serif text-lg text-ink">{Math.round(toneColorIntensity * 100)}%</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={toneColorIntensity}
                  disabled={!toneColors}
                  onChange={(event) => setToneColorIntensity(Number(event.target.value))}
                  className="mt-2 w-full accent-[rgb(var(--accent))]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <SettingSwitch
                label={t("settings.autoPlay")}
                desc={t("settings.autoPlayLead")}
                checked={autoPlayAudio}
                onChange={() => setAutoPlayAudio(!autoPlayAudio)}
              />
              <SettingSwitch
                label={t("settings.slowMode")}
                desc={t("settings.slowModeLead")}
                checked={slowAudio}
                onChange={() => setSlowAudio(!slowAudio)}
              />
            </div>
          </div>

          <div className="hidden">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              {t("settings.preview")}
            </div>
            <MandarinText
              hanzi="你好"
              pinyin="nǐ hǎo"
              meaning={t("settings.previewHello")}
              size="lg"
              audio
            />
          </div>
        </Card>
      </HubSection>

      <HubSection
        title={t("pro.badge")}
        count={
          <ButtonLink to="/pro" size="sm" variant="outline">
            {t("settings.seePro")}
          </ButtonLink>
        }
      >
        <Card className="rounded-xl border-line/70 p-3.5 shadow-none">
          <div className="text-sm text-ink-soft">
            {t("settings.proLead")}
          </div>
          <ButtonLink to="/pro" size="sm" className="mt-3">{t("settings.seeProPlans")}</ButtonLink>
        </Card>

        {/* Ferramenta interna: simular Pro sem assinatura real (só dev / flag explícita). */}
        {isDevPreviewAllowed() && (
          <Card className="mt-2 flex flex-col gap-3 rounded-xl border-dashed border-accent/40 p-3.5 shadow-none sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium text-ink">{t("settings.localPreview")}</div>
              <div className="text-sm text-ink-soft">
                {t("settings.localPreviewLead")}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={isPremium}
                aria-label={t("settings.localPreviewAria")}
                onClick={() => setPremium(!isPremium)}
                className="flex h-11 w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
              >
                <span
                  aria-hidden="true"
                  className={[
                    "relative block h-7 w-12 rounded-full transition",
                    isPremium ? "bg-accent" : "bg-line",
                  ].join(" ")}
                >
                  <span className={[
                    "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                    isPremium ? "translate-x-5" : "translate-x-0",
                  ].join(" ")} />
                </span>
              </button>
              {isPremium ? (
                <Button size="sm" variant="outline" onClick={() => setPremium(false)}>
                  {t("settings.deactivate")}
                </Button>
              ) : null}
            </div>
          </Card>
        )}

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {DOMAIN_ORDER.map((track) => {
            const meta = DOMAIN_META[track];
            const Icon = meta.icon;
            const pro = PRO_ENGINE_KEYS[track];
            return (
              <Card key={track} className="rounded-xl border-line/70 p-3 shadow-none">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${meta.color}1a`, color: meta.color }}
                  >
                    <Icon width={20} height={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">{meta.label} Pro</div>
                    <div className="text-xs font-medium text-accent">{t(pro.titleKey)}</div>
                    <p className="mt-1 text-xs text-ink-soft">{t(pro.featuresKey)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="mt-2 rounded-xl border-line/70 p-3 shadow-none">
          <div className="text-sm font-semibold text-ink">{t("settings.reviewPro")}</div>
          <p className="mt-1 text-xs text-ink-soft">
            {t("settings.reviewProLead")}
          </p>
        </Card>
      </HubSection>

      <HubSection id="sons" className="scroll-mt-6" title={t("settings.audioAndQi")}>
        <Card className="space-y-4 rounded-xl border-line/70 p-3.5 shadow-none">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <div className="font-medium text-ink">{t("settings.progressSounds")}</div>
              <div className="text-sm text-ink-soft">
                {t("settings.progressSoundsLead")}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundEffects}
              aria-label={t("settings.progressSounds")}
              onClick={() => setSoundEffects(!soundEffects)}
              className="flex h-11 w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
            >
              <span
                aria-hidden="true"
                className={[
                  "relative block h-7 w-12 rounded-full transition",
                  soundEffects ? "bg-accent" : "bg-line",
                ].join(" ")}
              >
                <span className={[
                  "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                  soundEffects ? "translate-x-5" : "translate-x-0",
                ].join(" ")} />
              </span>
            </button>
          </div>

          <div className="border-b border-line pb-4">
            <div className="font-medium text-ink">{t("settings.soundTheme")}</div>
            <div className="mt-1 text-sm text-ink-soft">
              {t("settings.soundThemeLead")}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {SOUND_THEME_OPTIONS.map((option) => {
                const active = soundTheme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSoundTheme(option.id);
                      window.setTimeout(() => playSoundFx("tap", soundEffects), 0);
                    }}
                    className={[
                      "min-h-11 rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
                      active ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface-2 text-ink hover:bg-surface",
                    ].join(" ")}
                  >
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className="mt-1 text-xs text-ink-soft">{t(option.descKey)}</div>
                  </button>
                );
              })}
            </div>
            <Button className="mt-3 w-full" variant="soft" disabled={!soundEffects} onClick={testSoundSignature}>
              {t("settings.testSound")}
            </Button>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SOUND_TEST_ITEMS.map((item) => (
                <Button
                  key={item.kind}
                  variant="outline"
                  disabled={!soundEffects}
                  onClick={() => playSoundFx(item.kind, soundEffects)}
                >
                  {t(item.labelKey)}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-b border-line pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-ink">{t("settings.fxVolume")}</div>
                <div className="text-sm text-ink-soft">
                  {t("settings.fxVolumeLead")}
                </div>
              </div>
              <span className="font-serif text-lg text-ink">{Math.round(soundFxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={soundFxVolume}
              disabled={!soundEffects}
              onChange={(e) => setSoundFxVolume(Number(e.target.value))}
              onMouseUp={() => playSoundFx("tap", soundEffects)}
              onTouchEnd={() => playSoundFx("tap", soundEffects)}
              className="mt-3 w-full accent-[rgb(var(--accent))] disabled:opacity-40"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-ink">{t("settings.speechRate")}</div>
              <div className="text-sm text-ink-soft">
                {t("settings.speechRateLead")}
              </div>
            </div>
            <span className="font-serif text-lg text-ink">{ttsRate.toFixed(2)}×</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={1.2}
            step={0.05}
            value={ttsRate}
            onChange={(e) => setTtsRate(Number(e.target.value))}
            className="w-full accent-[rgb(var(--accent))]"
          />

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-ink">{t("settings.voiceVolume")}</div>
              <div className="text-sm text-ink-soft">
                {t("settings.voiceVolumeLead")}
              </div>
            </div>
            <span className="font-serif text-lg text-ink">{Math.round(ttsVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={ttsVolume}
            onChange={(e) => setTtsVolume(Number(e.target.value))}
            className="w-full accent-[rgb(var(--accent))]"
          />

          <Button variant="outline" onClick={() => speak("你好，我在学中文", { rate: ttsRate, volume: ttsVolume })}>
            {t("settings.testVoice")}
          </Button>

          <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-soft">
            {t("settings.qiExplainer")}
          </div>

          <p
            className={[
              "rounded-xl px-3 py-2 text-sm",
              voiceOk
                ? "bg-[rgb(var(--good)/0.1)] text-[rgb(var(--good))]"
                : "bg-accent-soft text-accent",
            ].join(" ")}
          >
            {voiceOk
              ? t("settings.voiceOk")
              : t("settings.voiceMissing")}
          </p>
        </Card>
      </HubSection>

      <FeedbackPrompt context={{ screen: "/config" }} compact />

      <p className="text-center text-xs text-ink-faint">
        {t("settings.footer")}
      </p>
    </HubPage>
  );
}

function SettingSwitch({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium text-ink">{label}</div>
        <div className="mt-0.5 text-sm leading-5 text-ink-soft">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className="flex h-11 w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
      >
        <span
          aria-hidden="true"
          className={[
            "relative block h-7 w-12 rounded-full transition",
            checked ? "bg-accent" : "bg-line",
          ].join(" ")}
        >
          <span
            className={[
              "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
              checked ? "translate-x-5" : "translate-x-0",
            ].join(" ")}
          />
        </span>
      </button>
    </div>
  );
}
