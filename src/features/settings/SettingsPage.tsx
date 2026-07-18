import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStore, type MandarinDisplayMode, type SoundTheme, type ThemeName, type TranslationMode } from "../../lib/store";
import { hasChineseVoice, isTTSAvailable, speak } from "../../lib/tts";
import { playSoundFx, type SoundKind } from "../../lib/soundFx";
import { Card, Button } from "../../components/ui/primitives";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { BetaBadge } from "../../components/feedback/BetaBadge";
import { FeedbackPrompt } from "../../components/feedback/FeedbackPrompt";
import { MandarinText } from "../../components/hanzi/MandarinText";
import { COURSE_PROFILE } from "../../data/course";
import { DOMAIN_META, DOMAIN_ORDER, type DomainTrack } from "../../data/domains";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
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
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { TelemetryDataDetails } from "../../components/privacy/TelemetryDataDetails";

const THEMES: { id: ThemeName; name: string; desc: string; swatch: string[] }[] = [
  { id: "clay", name: "Notion Clay", desc: "Branco quente, calmo, focado.", swatch: ["#F7F6F3", "#FFFFFF", "#B9412E"] },
  { id: "china", name: "China Modern", desc: "Off-white rosado, vermelho mais profundo.", swatch: ["#FFF9F7", "#FFFFFF", "#B42318"] },
  { id: "dark", name: "Longyu Dark", desc: "Quase preto, premium, foco em hànzì.", swatch: ["#0C0D0F", "#1F1F1F", "#CD4432"] },
];

const MANDARIN_DISPLAY_OPTIONS: { id: MandarinDisplayMode; label: string; example: string }[] = [
  { id: "pinyin_hanzi", label: "Pinyin + caracteres", example: "nǐ hǎo · 你好" },
  { id: "hanzi_pinyin", label: "Caracteres + pinyin", example: "你好 · nǐ hǎo" },
  { id: "hanzi_only", label: "Somente caracteres", example: "你好" },
  { id: "pinyin_only", label: "Somente pinyin", example: "nǐ hǎo" },
];

const TRANSLATION_OPTIONS: { id: TranslationMode; label: string }[] = [
  { id: "always", label: "Mostrar sempre" },
  { id: "tap", label: "Mostrar ao tocar" },
  { id: "hidden", label: "Ocultar por padrão" },
];

const DISPLAY_OPTION_COPY: Partial<Record<MandarinDisplayMode, { label: string; example: string }>> = {
  pinyin_only: { label: "Somente pinyin", example: "wǒ men xué hànyǔ" },
  hanzi_only: { label: "Somente caracteres", example: "我们学汉语" },
  pinyin_hanzi: { label: "Pinyin e caracteres", example: "wǒ men xué hànyǔ · 我们学汉语" },
};

const SOUND_THEME_OPTIONS: { id: SoundTheme; label: string; desc: string }[] = [
  { id: "longyu_classic", label: "Longyu Classic", desc: "Sino, jade e madeira em equilibrio." },
  { id: "longyu_soft", label: "Longyu Soft", desc: "Mais discreto para estudo longo." },
  { id: "longyu_game", label: "Longyu Game", desc: "Mais brilhante para treino rapido." },
];

// Um botão de teste por evento sonoro importante do app.
const SOUND_TEST_ITEMS: { kind: SoundKind; label: string }[] = [
  { kind: "tap", label: "Toque" },
  { kind: "pieceSelect", label: "Selecionar peça" },
  { kind: "step", label: "Etapa" },
  { kind: "success", label: "Acerto" },
  { kind: "error", label: "Erro" },
  { kind: "streak", label: "Sequência" },
  { kind: "missionComplete", label: "Missão concluída" },
  { kind: "qiGain", label: "Qi ganho" },
  { kind: "qiSpend", label: "Qi gasto" },
  { kind: "chestReady", label: "Baú pronto" },
  { kind: "chestOpenCommon", label: "Baú comum" },
  { kind: "chestOpenRare", label: "Baú raro" },
  { kind: "chestOpenEpic", label: "Baú épico" },
  { kind: "chestOpenLegendary", label: "Baú lendário" },
  { kind: "medal", label: "Medalha" },
  { kind: "lessonComplete", label: "Lição concluída" },
  { kind: "moduleComplete", label: "Módulo concluído" },
  { kind: "blocked", label: "Sem carga/Qi" },
];

const PRO_ENGINES: Record<DomainTrack, { title: string; features: string[] }> = {
  som: {
    title: "Diagnóstico tonal",
    features: ["pares mínimos avançados", "áudio lento neural", "mapa de tons fracos"],
  },
  fala: {
    title: "Produção oral guiada",
    features: ["roleplays", "feedback de pronúncia", "chunks ilimitados"],
  },
  hanzi: {
    title: "Famílias gráficas",
    features: ["radicais avançados", "decomposição extra", "modo sem pinyin"],
  },
  leitura: {
    title: "Biblioteca graduada",
    features: ["histórias maiores", "leitura sem pinyin", "shadowing por linha"],
  },
};

export function SettingsPage() {
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
      setSocialNotice(result.message);
      return;
    }
    setSocialUsername(result.data.username ?? "");
    setSocialNotice("Apelido atualizado.");
  }

  async function handleToggleShowInSearch() {
    const next = !socialShowInSearch;
    setSocialLoading(true);
    setSocialNotice(null);
    const result = await updateShowInSearch(next);
    setSocialLoading(false);
    if (!result.ok) {
      setSocialNotice(result.message);
      return;
    }
    setSocialShowInSearch(result.data.show_in_search);
    setSocialNotice(next ? "Seu perfil aparece na busca de amigos." : "Seu perfil ficou oculto na busca.");
  }

  function handleSuggestUsername() {
    setSocialUsername(suggestUsernameFromName(activeAccount?.name ?? "aluno"));
  }

  return (
    <HubPage className="space-y-5">
      <HubHeader
        eyebrow="Ajustes"
        title="Configurações"
        desc="Leitura, áudio, tema e conta local."
        badge={<BetaBadge className="shrink-0" />}
      />

      <HubSection title="Curso">
        <Card className="rounded-xl border-line/70 p-3.5 shadow-none">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            Foco atual
          </div>
          <div className="mt-1 font-serif text-lg font-semibold text-ink">
            {COURSE_PROFILE.sourceLanguage.name} → {COURSE_PROFILE.targetLanguage.name}
          </div>
          <p className="mt-1 text-xs text-ink-soft">{COURSE_PROFILE.learningPromise}</p>
        </Card>
      </HubSection>

      <HubSection id="dados" className="scroll-mt-6" title="Conta e progresso" desc="Perfis locais neste dispositivo.">
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
                          {lessons} lições · {accountPoints} Qi · melhor sequência {account.longestStreak} dias
                        </div>
                      </div>
                      {isCurrent && <span className="text-xs font-semibold text-accent">ativa</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newAccountName}
              onChange={(event) => setNewAccountName(event.target.value)}
              placeholder="Nome do novo aluno"
              className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
            />
            <Button onClick={handleCreateAccount} disabled={newAccountName.trim().length < 2}>
              Criar conta local
            </Button>
          </div>

          <Link
            to="/conta"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-4 text-[15px] font-medium text-ink transition hover:bg-surface-2"
          >
            Abrir central de conta
          </Link>

          <div className="rounded-lg bg-surface-2 px-3 py-2 text-[11px] text-ink-faint">
            {isSupabaseBackendEnabled()
              ? "Com conta na nuvem, o progresso sincroniza automaticamente entre dispositivos."
              : "Dados salvos só neste dispositivo. Sincronização em nuvem pode entrar depois."}
          </div>
        </Card>
      </HubSection>

      <HubSection
        id="privacidade"
        className="scroll-mt-6"
        title="Amigos e privacidade"
        desc="Apelido público e visibilidade na busca."
      >
        <Card className="space-y-4 rounded-xl border-line/70 p-3.5 shadow-none">
          {!cloudReady ? (
            <p className="text-sm text-ink-soft">
              Crie uma conta na nuvem para definir @apelido, controlar busca e seguir amigos.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="social-username" className="text-sm font-medium text-ink">
                  @apelido
                </label>
                <p className="mt-0.5 text-xs text-ink-soft">Amigos podem te encontrar por nome ou @{socialUsername || "apelido"}.</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="social-username"
                    value={socialUsername}
                    onChange={(event) => setSocialUsername(event.target.value.replace(/^@/, ""))}
                    placeholder="seu_apelido"
                    className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                  />
                  <Button type="button" variant="outline" onClick={handleSuggestUsername} disabled={socialLoading}>
                    Sugerir
                  </Button>
                  <Button type="button" onClick={() => void handleSaveUsername()} disabled={socialLoading || socialUsername.trim().length < 3}>
                    Salvar
                  </Button>
                </div>
              </div>

              <SettingSwitch
                label="Mostrar meu perfil em busca"
                desc="Desligado: só aparece por link direto com @apelido."
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
        title="Privacidade e dados"
        desc="Controle o que o Longyu pode coletar para melhorar o curso."
      >
        <Card className="space-y-4 rounded-xl border-line/70 p-3.5 shadow-none">
          <SettingSwitch
            label="Dados pedagógicos de melhoria"
            desc="Lições, tipos de exercício, acertos/erros e abandonos. Sem senhas nem texto livre."
            checked={telemetryConsent}
            onChange={() => {
              const next = !telemetryConsent;
              void (async () => {
                await setTelemetryConsent(next);
                setTelemetryConsentState(next);
                setQueueSize(pedagogyEventQueueSize());
                setPrivacyNotice(
                  next
                    ? "Consentimento ativado. Eventos pedagógicos podem ser enviados."
                    : "Consentimento desligado. Fila local de eventos foi apagada. Seu progresso permanece."
                );
              })();
            }}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowDataDetails(true)}>
              Ver quais dados são coletados
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                clearPedagogyEventQueue();
                setQueueSize(0);
                setPrivacyNotice("Fila de eventos pendentes apagada neste dispositivo.");
              }}
            >
              Limpar fila de eventos ({queueSize})
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
                    setPrivacyNotice("Exportação dos seus dados baixada neste dispositivo.");
                  } finally {
                    setPrivacyBusy(false);
                  }
                })();
              }}
            >
              Solicitar exportação dos meus dados
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={privacyBusy}
              onClick={() => {
                void (async () => {
                  const ok = window.confirm(
                    "Solicitar exclusão da conta na nuvem? Progresso local neste aparelho não é apagado automaticamente."
                  );
                  if (!ok) return;
                  setPrivacyBusy(true);
                  const result = await requestAccountDeletion();
                  setPrivacyBusy(false);
                  setPrivacyNotice(result.message);
                })();
              }}
            >
              Solicitar exclusão da conta
            </Button>
          </div>

          <Link
            to="/privacidade#politica"
            className="inline-flex text-sm font-semibold text-accent hover:underline"
          >
            Política de privacidade
          </Link>

          {privacyNotice && <p className="text-sm text-ink-soft">{privacyNotice}</p>}
        </Card>
      </HubSection>

      {showDataDetails && (
        <ModalOverlay label="Dados coletados" onBackdropClick={() => setShowDataDetails(false)}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-card sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <TelemetryDataDetails />
            <Button type="button" className="mt-5 w-full" onClick={() => setShowDataDetails(false)}>
              Fechar
            </Button>
          </div>
        </ModalOverlay>
      )}

      <HubSection id="tema" className="scroll-mt-6" title="Tema">
        <div className="grid gap-2 sm:grid-cols-2">
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => setTheme(t.id)} className="text-left">
              <Card
                className={[
                  "flex items-center gap-4 p-4 transition",
                  theme === t.id ? "ring-2 ring-accent" : "hover:bg-surface-2",
                ].join(" ")}
              >
                <div className="flex gap-1.5">
                  {t.swatch.map((c) => (
                    <span
                      key={c}
                      className="h-9 w-9 rounded-lg border border-line"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div>
                  <div className="font-medium text-ink">{t.name}</div>
                  <div className="text-sm text-ink-soft">{t.desc}</div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </HubSection>

      <HubSection
        id="exibicao"
        className="scroll-mt-6"
        title="Como ver o mandarim"
        desc="Comece com pinyin e hànzì. Depois esconda o pinyin para leitura real."
      >
        <Card className="space-y-4 overflow-hidden rounded-xl border-line/70 p-3.5 shadow-none">
          <div className="rounded-2xl bg-surface-2 p-4 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Prévia visual</div>
            <MandarinText
              hanzi="我们学汉语"
              pinyin="wǒ men xué hànyǔ"
              meaning="Nós estudamos chinês."
              size="xl"
              audio
              align="center"
              className="mt-3"
            />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Exibição
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {MANDARIN_DISPLAY_OPTIONS.filter((option) => option.id !== "hanzi_pinyin").map((option) => {
                const active = mandarinDisplayMode === option.id;
                const copy = DISPLAY_OPTION_COPY[option.id] ?? option;
                return (
                  <button
                    key={option.id}
                    onClick={() => setMandarinDisplayMode(option.id)}
                    className={[
                      "min-h-[92px] rounded-2xl border px-4 py-3 text-left transition",
                      active ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line bg-surface-2 hover:bg-surface",
                    ].join(" ")}
                  >
                    <div className="font-medium text-ink">{copy.label}</div>
                    <div className="mt-1 font-serif text-sm text-ink-soft">{copy.example}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Tradução
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
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 border-t border-line pt-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
                <div className="font-medium text-ink">Pinyin com acentos</div>
                <div className="mt-0.5 text-sm leading-5 text-ink-soft">
                  O app sempre mostra marcas de tom para o aluno.
                </div>
              </div>
              <SettingSwitch
                label="Cores dos tons"
                desc="Diferencia visualmente os quatro tons e o tom neutro."
                checked={toneColors}
                onChange={() => setToneColors(!toneColors)}
              />
              <div className={toneColors ? "" : "opacity-45"}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-ink">Cor do pinyin</div>
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
                label="Tocar automaticamente"
                desc="Reproduz o áudio quando um novo bloco compatível aparece."
                checked={autoPlayAudio}
                onChange={() => setAutoPlayAudio(!autoPlayAudio)}
              />
              <SettingSwitch
                label="Modo lento"
                desc="Limita a velocidade da voz para destacar sílabas e tons."
                checked={slowAudio}
                onChange={() => setSlowAudio(!slowAudio)}
              />
            </div>
          </div>

          <div className="hidden">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Prévia
            </div>
            <MandarinText
              hanzi="你好"
              pinyin="nǐ hǎo"
              meaning="Olá"
              size="lg"
              audio
            />
          </div>
        </Card>
      </HubSection>

      <HubSection
        title="Longyu Pro"
        count={
          <Link to="/pro">
            <Button size="sm" variant="outline">
              Ver Pro
            </Button>
          </Link>
        }
      >
        <Card className="rounded-xl border-line/70 p-3.5 shadow-none">
          <div className="text-sm text-ink-soft">
            O Longyu Pro remove os limites diários, libera a revisão inteligente e as ferramentas avançadas. A Jornada
            e a revisão essencial continuam grátis para sempre.
          </div>
          <Link to="/pro" className="mt-3 inline-block">
            <Button size="sm">Ver planos Pro</Button>
          </Link>
        </Card>

        {/* Ferramenta interna: simular Pro sem assinatura real (só dev / flag explícita). */}
        {isDevPreviewAllowed() && (
          <Card className="mt-2 flex flex-col gap-3 rounded-xl border-dashed border-accent/40 p-3.5 shadow-none sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium text-ink">Preview local — não é assinatura real</div>
              <div className="text-sm text-ink-soft">
                Alterna o entitlement local para testar telas Pro. Não vale em produção beta.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                role="switch"
                aria-checked={isPremium}
                onClick={() => setPremium(!isPremium)}
                className={[
                  "relative h-7 w-12 shrink-0 rounded-full transition",
                  isPremium ? "bg-accent" : "bg-line",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                    isPremium ? "left-5" : "left-0.5",
                  ].join(" ")}
                />
              </button>
              {isPremium ? (
                <Button size="sm" variant="outline" onClick={() => setPremium(false)}>
                  Desativar
                </Button>
              ) : null}
            </div>
          </Card>
        )}

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {DOMAIN_ORDER.map((track) => {
            const meta = DOMAIN_META[track];
            const Icon = meta.icon;
            const pro = PRO_ENGINES[track];
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
                    <div className="text-xs font-medium text-accent">{pro.title}</div>
                    <p className="mt-1 text-xs text-ink-soft">{pro.features.join(" · ")}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="mt-2 rounded-xl border-line/70 p-3 shadow-none">
          <div className="text-sm font-semibold text-ink">Revisão Pro</div>
          <p className="mt-1 text-xs text-ink-soft">
            Grátis: revisão diária essencial. Pro: fila ilimitada, foco por fraqueza e refazer sem Qi.
          </p>
        </Card>
      </HubSection>

      <HubSection id="sons" className="scroll-mt-6" title="Áudio e Qi">
        <Card className="space-y-4 rounded-xl border-line/70 p-3.5 shadow-none">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <div className="font-medium text-ink">Sons de progresso</div>
              <div className="text-sm text-ink-soft">
                Assinatura sonora original inspirada em escalas chinesas: tarefa, acerto, bônus e uso de Qi.
              </div>
            </div>
            <button
              role="switch"
              aria-checked={soundEffects}
              onClick={() => setSoundEffects(!soundEffects)}
              className={[
                "relative h-7 w-12 shrink-0 rounded-full transition",
                soundEffects ? "bg-accent" : "bg-line",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                  soundEffects ? "left-5" : "left-0.5",
                ].join(" ")}
              />
            </button>
          </div>

          <div className="border-b border-line pb-4">
            <div className="font-medium text-ink">Tema sonoro</div>
            <div className="mt-1 text-sm text-ink-soft">
              Longyu Classic e o pacote original de sino leve, jade, madeira, chama de Qi e brilho de baú.
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {SOUND_THEME_OPTIONS.map((option) => {
                const active = soundTheme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSoundTheme(option.id);
                      window.setTimeout(() => playSoundFx("tap", soundEffects), 0);
                    }}
                    className={[
                      "rounded-2xl border px-3 py-3 text-left transition",
                      active ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface-2 text-ink hover:bg-surface",
                    ].join(" ")}
                  >
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className="mt-1 text-xs text-ink-soft">{option.desc}</div>
                  </button>
                );
              })}
            </div>
            <Button className="mt-3 w-full" variant="soft" disabled={!soundEffects} onClick={testSoundSignature}>
              Testar som
            </Button>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SOUND_TEST_ITEMS.map((item) => (
                <Button
                  key={item.kind}
                  variant="outline"
                  disabled={!soundEffects}
                  onClick={() => playSoundFx(item.kind, soundEffects)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-b border-line pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-ink">Volume dos efeitos</div>
                <div className="text-sm text-ink-soft">
                  Ajuste a força dos acertos, sequências e conclusões.
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
              <div className="font-medium text-ink">Velocidade da fala</div>
              <div className="text-sm text-ink-soft">
                Mais devagar ajuda a captar os tons.
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
              <div className="font-medium text-ink">Volume da voz</div>
              <div className="text-sm text-ink-soft">
                Controla a voz do Web Speech quando o navegador permite.
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
            Testar voz
          </Button>

          <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-soft">
            Qi: tarefa +2, acerto +3, lição +10 e bônus por boa pontuação. Use Qi para refazer; no Pro, retries são inclusos sem gastar Qi.
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
              ? "Voz em chinês (zh-CN) disponível neste dispositivo."
              : "Nenhuma voz em chinês detectada — instale um pacote de voz zh-CN no sistema para melhor áudio. (Web Speech API)"}
          </p>
        </Card>
      </HubSection>

      <FeedbackPrompt context={{ screen: "/config" }} compact />

      <p className="text-center text-xs text-ink-faint">
        Longyu Beta (龙语) · áudio via Web Speech API · dados salvos só neste dispositivo.
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
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={[
          "relative h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-accent" : "bg-line",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
            checked ? "left-5" : "left-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
