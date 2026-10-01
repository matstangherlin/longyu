/**
 * RC2.2.20 — registro de QA FÍSICO (Android real).
 *
 * CODE PASS, WEB/E2E PASS, screenshot automatizado e emulador não são
 * PHYSICAL PASS. Um teste só vira PASS quando alguém o executou num aparelho
 * Android físico e registrou, à mão, a evidência:
 *
 *   testedAt · buildSha · versionCode · deviceClass · evidenceType
 *
 * Nada neste módulo promove um teste sozinho: não existe caminho automático
 * para PASS. O registro fica só neste aparelho (localStorage) e é exportado
 * como JSON para `docs/release/rc2-2-20-device-matrix.json`.
 *
 * Nunca guardar: e-mail, senha, OTP, gravação de voz, token ou PII. Notas com
 * cara de e-mail, código de 6 dígitos ou token são recusadas.
 */
import { resolveAppEnvironment, type AppEnvironmentInput } from "./appEnvironment";

export const DEVICE_QA_SCHEMA = "longyu-device-qa/1";

export const DEVICE_QA_STATUSES = ["NOT_RUN", "PASS", "FAIL", "BLOCKED", "NOT_APPLICABLE"] as const;
export type DeviceQaStatus = (typeof DEVICE_QA_STATUSES)[number];

export const DEVICE_QA_EVIDENCE_TYPES = [
  "OWNER_OBSERVED",
  "SCREENSHOT",
  "SCREEN_RECORDING",
  "DIAGNOSTIC_TRACE",
  "PLAY_INSTALL_EVIDENCE",
] as const;
export type DeviceQaEvidenceType = (typeof DEVICE_QA_EVIDENCE_TYPES)[number];

/** Nunca fingir um segundo aparelho: cada resultado diz em qual classe rodou. */
export const DEVICE_QA_DEVICE_CLASSES = ["OWNER_DEVICE", "SECOND_ANDROID", "PLAY_BUILD", "DEBUG_DIAGNOSTIC_BUILD"] as const;
export type DeviceQaDeviceClass = (typeof DEVICE_QA_DEVICE_CLASSES)[number];

export type DeviceQaArea = "guidance" | "audio" | "progression" | "speech" | "auth" | "review" | "immersion" | "profile" | "pronunciation";

export interface DeviceQaTest {
  id: string;
  area: DeviceQaArea;
  /** Crítico = entra na matriz física crítica que decide CLOSED_BETA_READY. */
  critical: boolean;
  title: string;
  /** Passos curtos que o owner segue no aparelho. */
  steps: readonly string[];
  /** O que precisa acontecer para PASS (o que ele VÊ/OUVE, não o que o código diz). */
  expect: string;
}

/** Os 12 testes físicos da RC2.2.19 que esta onda precisa tirar de NOT_RUN. */
export const DEVICE_QA_TESTS: readonly DeviceQaTest[] = [
  {
    id: "guidanceShownOnDevice",
    area: "guidance",
    critical: true,
    title: "Orientação aparece de verdade (conta nova)",
    steps: ["Criar conta nova", "Chegar à Jornada", "Esperar a 1ª orientação", "Tocar Entendi", "Fechar e reabrir o app"],
    expect: "Coachmark visível, dentro da área segura, botões tocáveis, Voltar do Android fecha; depois de Entendi não volta.",
  },
  {
    id: "guidanceMatureAccountNoRelock",
    area: "guidance",
    critical: true,
    title: "Conta madura: nada tranca, orientação nunca vista ainda aparece",
    steps: ["Entrar na conta antiga (antes do Guidance v2)", "Conferir abas e áreas liberadas", "Abrir uma área liberada nunca explicada"],
    expect: "Nenhuma área volta a trancar; no máx. 1 orientação automática por sessão; orientação nunca vista aparece.",
  },
  {
    id: "guidedTryAudioDevice",
    area: "audio",
    critical: true,
    title: "Áudio do Teste guiado toca no aparelho",
    steps: ["Abrir o Teste guiado", "Tocar 🔊", "Ouvir", "Tocar Continuar"],
    expect: "Som audível em mandarim; o texto só aparece depois do som começar; se falhar, aparece Tentar novamente / Configurar voz chinesa / Continuar sem áudio.",
  },
  {
    id: "conversationContinueDevice",
    area: "progression",
    critical: true,
    title: "Conversa avança depois de Continuar",
    steps: ["Abrir a lição com \"Como você se chama?\"", "Escolher a resposta", "Ouvir o áudio", "Tocar Continuar"],
    expect: "Chega na etapa seguinte. Trilha: continue_pressed → completion_started → completion_finished → advanced.",
  },
  {
    id: "nativeSpeechRecognitionZhCn",
    area: "speech",
    critical: true,
    title: "Reconhecimento de fala zh-CN",
    steps: ["Abrir um passo de fala", "Permitir microfone", "Falar a frase", "Ver o resultado"],
    expect: "Permissão ≠ reconhecimento: recognitionStarted, speechDetected e recognitionResult precisam aparecer. Sem zh-CN: Baixar suporte / Gravar e comparar / Continuar sem falar.",
  },
  {
    id: "selfCompareRecordingPlayback",
    area: "speech",
    critical: true,
    title: "Gravar e ouvir a própria voz",
    steps: ["Tocar Gravar minha voz", "Falar", "Parar", "Tocar Ouvir minha voz"],
    expect: "Duração > 0, arquivo temporário com bytes > 0, reprodução começa e termina, e você OUVE a própria voz.",
  },
  {
    id: "mobileSignupDevice",
    area: "auth",
    critical: true,
    title: "Cadastro no Android",
    steps: ["Instalar limpo", "Criar conta com e-mail novo", "Confirmar e-mail", "Voltar ao app", "Chegar à Jornada"],
    expect: "Sem spinner infinito; erro com estágio e ação (Tentar novamente / Voltar); termina na Jornada.",
  },
  {
    id: "passwordRecoveryOtpDevice",
    area: "auth",
    critical: true,
    title: "Recuperar senha com código de 6 dígitos",
    steps: ["Esqueci minha senha", "E-mail", "Código recebido", "Digitar 6 dígitos", "Nova senha", "Login com a nova senha"],
    expect: "Mensagem neutra; código errado recusado; reenviar com espera; senha nova entra, a antiga não. Exige o modelo de e-mail aplicado pelo owner.",
  },
  {
    id: "reviewRoundsDevice",
    area: "review",
    critical: true,
    title: "Revisão curta e clara",
    steps: ["Abrir a Revisão", "Fazer uma rodada", "Errar um item de propósito"],
    expect: "Rodada de 5–8; hànzì grande; feedback curto; mesmo alvo não volta colado; ao voltar, muda o formato.",
  },
  {
    id: "storySceneDevice",
    area: "immersion",
    critical: false,
    title: "Imersão parece cena",
    steps: ["Abrir uma cena de Imersão", "Ouvir falas", "Escolher respostas", "Terminar"],
    expect: "Onde/Com quem/Objetivo; quem fala é óbvio; balões legíveis; áudio toca; recap \"Você conseguiu\" antes das recompensas.",
  },
  {
    id: "profileAccountLogoutDevice",
    area: "profile",
    critical: true,
    title: "Perfil, Conta, Aparência e Sair fáceis de achar",
    steps: ["Tocar no avatar", "Voltar", "Abrir Mais", "Achar Conta, Aparência e Sair"],
    expect: "Avatar → /perfil; Sair visível sem rolar muito; Excluir conta separado e com cara de ação destrutiva.",
  },
  {
    id: "articulationDiagramsDevice",
    area: "pronunciation",
    critical: false,
    title: "Diagramas de articulação legíveis",
    steps: ["Abrir o Pinyin Lab", "Ver j/q/x, zh/ch/sh, z/c/s, r, ü, e, i apical"],
    expect: "Diagramas grandes e simples; nenhum usado para explicar tom.",
  },
];

export const DEVICE_QA_TEST_IDS: readonly string[] = DEVICE_QA_TESTS.map((test) => test.id);

export interface DeviceQaResult {
  status: DeviceQaStatus;
  testedAt?: string | null;
  buildSha?: string | null;
  versionCode?: number | null;
  deviceClass?: DeviceQaDeviceClass | null;
  evidenceType?: DeviceQaEvidenceType | null;
  /** Nota curta: o que foi visto. Sem PII. */
  note?: string | null;
}

export type DeviceQaRegistry = Record<string, DeviceQaResult>;

export function emptyDeviceQaRegistry(): DeviceQaRegistry {
  return Object.fromEntries(DEVICE_QA_TEST_IDS.map((id) => [id, { status: "NOT_RUN" as DeviceQaStatus }]));
}

/**
 * Texto que parece PII/segredo: e-mail, código de 6 dígitos (OTP), JWT/token
 * longo. Na dúvida, recusa — a nota é para descrever o que foi visto.
 */
export function looksLikePiiOrSecret(text: string | null | undefined): boolean {
  const value = String(text ?? "");
  if (!value) return false;
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)) return true;
  if (/(^|\D)\d{6}(\D|$)/.test(value)) return true;
  if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(value)) return true;
  if (/[A-Za-z0-9_-]{32,}/.test(value)) return true;
  return false;
}

export type DeviceQaResultError =
  | "UNKNOWN_STATUS"
  | "PASS_WITHOUT_TESTED_AT"
  | "PASS_WITHOUT_BUILD_SHA"
  | "PASS_WITHOUT_VERSION_CODE"
  | "PASS_WITHOUT_DEVICE_CLASS"
  | "PASS_WITHOUT_EVIDENCE"
  | "PASS_ON_WEB_OR_EMULATOR"
  | "FAIL_WITHOUT_NOTE"
  | "NOTE_HAS_PII";

/**
 * Contrato de um resultado. PASS exige as cinco evidências; FAIL exige a nota
 * que reproduz o bug. Nada é aceito com PII.
 */
export function validateDeviceQaResult(result: DeviceQaResult, context: { native?: boolean; emulator?: boolean } = {}): DeviceQaResultError[] {
  const errors: DeviceQaResultError[] = [];
  if (!DEVICE_QA_STATUSES.includes(result.status)) errors.push("UNKNOWN_STATUS");
  if (result.status === "PASS") {
    if (!result.testedAt) errors.push("PASS_WITHOUT_TESTED_AT");
    if (!result.buildSha) errors.push("PASS_WITHOUT_BUILD_SHA");
    if (!Number.isInteger(result.versionCode) || (result.versionCode ?? 0) <= 0) errors.push("PASS_WITHOUT_VERSION_CODE");
    if (!result.deviceClass || !DEVICE_QA_DEVICE_CLASSES.includes(result.deviceClass)) errors.push("PASS_WITHOUT_DEVICE_CLASS");
    if (!result.evidenceType || !DEVICE_QA_EVIDENCE_TYPES.includes(result.evidenceType)) errors.push("PASS_WITHOUT_EVIDENCE");
    // Navegador e emulador nunca são PHYSICAL PASS.
    if (context.native === false || context.emulator === true) errors.push("PASS_ON_WEB_OR_EMULATOR");
  }
  if (result.status === "FAIL" && !String(result.note ?? "").trim()) errors.push("FAIL_WITHOUT_NOTE");
  if (looksLikePiiOrSecret(result.note)) errors.push("NOTE_HAS_PII");
  return errors;
}

/** Só a ação explícita do owner grava; um resultado inválido nunca entra. */
export function recordDeviceQaResult(
  registry: DeviceQaRegistry,
  testId: string,
  result: DeviceQaResult,
  context: { native?: boolean; emulator?: boolean } = {}
): { registry: DeviceQaRegistry; errors: DeviceQaResultError[] } {
  if (!DEVICE_QA_TEST_IDS.includes(testId)) return { registry, errors: ["UNKNOWN_STATUS"] };
  const errors = validateDeviceQaResult(result, context);
  if (errors.length) return { registry, errors };
  const clean: DeviceQaResult = {
    status: result.status,
    testedAt: result.testedAt ?? null,
    buildSha: result.buildSha ?? null,
    versionCode: result.versionCode ?? null,
    deviceClass: result.deviceClass ?? null,
    evidenceType: result.evidenceType ?? null,
    note: result.note?.trim() ? result.note.trim().slice(0, 280) : null,
  };
  return { registry: { ...registry, [testId]: clean }, errors: [] };
}

/**
 * Matriz física crítica: PASS só quando TODO teste crítico é PASS válido.
 * NOT_APPLICABLE não conta como PASS para testes críticos.
 */
export function physicalCriticalMatrixPass(registry: DeviceQaRegistry): boolean {
  return DEVICE_QA_TESTS.filter((test) => test.critical).every((test) => {
    const result = registry[test.id];
    return result?.status === "PASS" && validateDeviceQaResult(result).length === 0;
  });
}

export function summarizeDeviceQa(registry: DeviceQaRegistry): Record<DeviceQaStatus, number> {
  const counts = Object.fromEntries(DEVICE_QA_STATUSES.map((status) => [status, 0])) as Record<DeviceQaStatus, number>;
  for (const id of DEVICE_QA_TEST_IDS) counts[registry[id]?.status ?? "NOT_RUN"] += 1;
  return counts;
}

// --- Onde a superfície existe ------------------------------------------------

/**
 * /qa/device e as trilhas de diagnóstico: DEV, Preview, QA Candidate, builds de
 * fixtures (E2E) ou um build com `VITE_DEVICE_QA=true` explícito (APK de
 * diagnóstico / build interno). Production Beta sem a flag: nunca.
 */
export function deviceQaEnabled(env: AppEnvironmentInput & { VITE_DEVICE_QA?: string } = import.meta.env): boolean {
  if (env.DEV === true) return true;
  if (env.VITE_USE_TEST_FIXTURES === "true") return true;
  if (env.VITE_DEVICE_QA === "true") return true;
  const appEnv = resolveAppEnvironment(env);
  return appEnv === "preview" || appEnv === "qa_candidate";
}

// --- Aparelho (sanitizado) ---------------------------------------------------

export interface SanitizedDevice {
  androidVersion: string | null;
  /** Modelo comercial (ex.: "Pixel 7"); nunca serial, IMEI ou nome do aparelho. */
  model: string | null;
  /** WebView/emulador reportado pelo próprio UA ("sdk_gphone"/"Emulator"). */
  emulator: boolean;
}

export function sanitizeDeviceFromUserAgent(userAgent: string | null | undefined): SanitizedDevice {
  const ua = String(userAgent ?? "");
  const android = ua.match(/Android\s+([\d.]+)/);
  const modelMatch = ua.match(/Android\s+[\d.]+;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?[;)]/);
  let model = modelMatch?.[1]?.trim() ?? null;
  if (model && (/^(wv|K|Mobile)$/i.test(model) || looksLikePiiOrSecret(model))) model = null;
  if (model) model = model.replace(/[^\w .+-]/g, "").slice(0, 40) || null;
  const emulator = /sdk_gphone|Emulator|Android SDK built for/i.test(ua);
  return { androidVersion: android?.[1] ?? null, model, emulator };
}

// --- Persistência local (só neste aparelho) --------------------------------

export const DEVICE_QA_STORAGE_KEY = "longyu:device-qa:v1";

export function loadDeviceQaRegistry(): DeviceQaRegistry {
  const base = emptyDeviceQaRegistry();
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(DEVICE_QA_STORAGE_KEY) : null;
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Record<string, DeviceQaResult>;
    for (const id of DEVICE_QA_TEST_IDS) {
      const result = parsed?.[id];
      // Um PASS salvo que não cumpre o contrato volta a NOT_RUN (nunca "vira" PASS).
      if (result && validateDeviceQaResult(result).length === 0) base[id] = result;
    }
    return base;
  } catch {
    return base;
  }
}

export function saveDeviceQaRegistry(registry: DeviceQaRegistry): void {
  try {
    localStorage.setItem(DEVICE_QA_STORAGE_KEY, JSON.stringify(registry));
  } catch {
    /* sem armazenamento: o owner exporta o JSON na hora */
  }
}

// --- Observações (sem status) ----------------------------------------------

/**
 * Observação automática (ex.: uma etapa que não avançou). Nunca muda status:
 * é pista para o owner, que decide o FAIL/PASS.
 */
export interface DeviceQaObservation {
  at: number;
  kind: "step_stalled" | "audio_failed" | "speech_failed" | "signup_failed" | "reported";
  /** Só metadados: lição, índice, tipo, código. */
  detail: string;
}

const observations: DeviceQaObservation[] = [];

export function recordDeviceQaObservation(kind: DeviceQaObservation["kind"], detail: string): void {
  const safe = looksLikePiiOrSecret(detail) ? "[redigido]" : detail.slice(0, 160);
  observations.push({ at: Date.now(), kind, detail: safe });
  if (observations.length > 50) observations.splice(0, observations.length - 50);
}

export function deviceQaObservations(): readonly DeviceQaObservation[] {
  return observations.slice();
}

// --- Exportação --------------------------------------------------------------

export interface DeviceQaBuildInfo {
  buildSha: string | null;
  versionName: string | null;
  versionCode: number | null;
  packageName: string | null;
  runtime: "native" | "web";
  androidVersion: string | null;
  deviceModel: string | null;
  emulator: boolean;
}

export function exportDeviceQaReport(registry: DeviceQaRegistry, build: DeviceQaBuildInfo, exportedAt = new Date().toISOString()) {
  return {
    schema: DEVICE_QA_SCHEMA,
    exportedAt,
    build,
    summary: summarizeDeviceQa(registry),
    physicalCriticalMatrix: physicalCriticalMatrixPass(registry) ? "PASS" : "NOT_PASS",
    results: Object.fromEntries(DEVICE_QA_TEST_IDS.map((id) => [id, registry[id] ?? { status: "NOT_RUN" }])),
    observations: deviceQaObservations(),
  };
}
