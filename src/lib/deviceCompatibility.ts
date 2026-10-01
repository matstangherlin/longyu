/**
 * RC2.2.22 — compatibilidade por aparelho (sem generalizar).
 *
 * Fala e ciclo de vida variam muito por fabricante e versão do Android. Aqui
 * ficam só DEFINIÇÕES e funções puras:
 *  - classes de aparelho (sem PII: nunca serial, IMEI, nome do aparelho);
 *  - o que se registra por aparelho testado (TTS zh-CN, SpeechRecognizer…);
 *  - a classificação de uma falha (bug do Longyu × limite do aparelho/serviço/
 *    rede/configuração), que exige EVIDÊNCIA — nunca é automática para
 *    nenhum dos lados;
 *  - o estado de reconhecimento por aparelho (FULL/NETWORK_ONLY/NO_ZH_CN/
 *    UNAVAILABLE);
 *  - o resumo por fabricante, que só existe para aparelhos REALMENTE testados.
 *
 * Nada de `if (brand === "Samsung")`: o app decide por capacidade/serviço
 * detectado, nunca por marca.
 */
export const DEVICE_CLASSES = ["OWNER_DEVICE", "SMALL_ANDROID", "MID_ANDROID", "LARGE_ANDROID", "OLD_SUPPORTED_ANDROID", "CURRENT_ANDROID"] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

export const DEVICE_CAPABILITIES = [
  "ttsZhCn",
  "speechRecognizer",
  "onDeviceRecognizer",
  "networkRecognizer",
  "modelDownload",
  "microphone",
  "audioOutputRoute",
  "notifications",
  "haptics",
] as const;
export type DeviceCapability = (typeof DEVICE_CAPABILITIES)[number];
export type CapabilityResult = "WORKS" | "FAILS" | "UNAVAILABLE" | "NOT_TESTED";

export interface DeviceRecord {
  /** ID opaco (D01, D02…); nunca nome, serial ou conta. */
  deviceId: string;
  classes: DeviceClass[];
  androidApi: number | null;
  /** Fabricante como o Android informa (Build.MANUFACTURER), só para agrupar. */
  manufacturer: string | null;
  screenClass: "SMALL" | "MEDIUM" | "LARGE" | null;
  webViewMajor: number | null;
  ramClass?: "LOW" | "MID" | "HIGH" | null;
  tested: boolean;
  capabilities: Partial<Record<DeviceCapability, CapabilityResult>>;
}

export const FAILURE_CLASSES = [
  "LONGYU_BUG",
  "DEVICE_CAPABILITY_LIMITATION",
  "ANDROID_SERVICE_LIMITATION",
  "NETWORK_DEPENDENCY",
  "CONFIGURATION_ERROR",
] as const;
export type FailureClass = (typeof FAILURE_CLASSES)[number];

/** O que o aparelho informou no momento da falha (diagnóstico do /qa/device). */
export interface CapabilityProbe {
  recognitionServiceAvailable?: boolean | null;
  onDeviceAvailable?: boolean | null;
  zhCnSupported?: boolean | null;
  zhCnInstalledOnDevice?: boolean | null;
  online?: boolean | null;
  micPermission?: "granted" | "denied" | "prompt" | null;
  mediaVolumeZero?: boolean | null;
  ttsZhCnInstalled?: boolean | null;
}

export interface FailureEvidence {
  area: "speech" | "tts" | "self_compare" | "auth" | "lesson" | "navigation" | "lifecycle" | "layout" | "other";
  code: string | null;
  probe?: CapabilityProbe | null;
}

/**
 * Classificação honesta. Sem evidência de limite (probe), a falha é do
 * Longyu até prova em contrário — e Gravar e comparar, cadastro, lição,
 * navegação e ciclo de vida nunca podem virar "limite do aparelho": eles
 * precisam funcionar em qualquer Android suportado.
 */
export function classifyFailure(evidence: FailureEvidence): FailureClass {
  const probe = evidence.probe ?? null;
  const code = String(evidence.code ?? "");
  if (evidence.area !== "speech" && evidence.area !== "tts") {
    // Configuração do usuário (volume zerado / microfone negado) é orientável, não bug.
    if (probe?.mediaVolumeZero === true && code === "MEDIA_VOLUME_ZERO") return "CONFIGURATION_ERROR";
    if (probe?.micPermission === "denied" && /PERMISSION/.test(code)) return "CONFIGURATION_ERROR";
    return "LONGYU_BUG";
  }
  if (!probe) return "LONGYU_BUG";
  if (probe.micPermission === "denied" && /PERMISSION/.test(code)) return "CONFIGURATION_ERROR";
  if (evidence.area === "tts") {
    if (probe.ttsZhCnInstalled === false && /TTS_LANGUAGE/.test(code)) return "DEVICE_CAPABILITY_LIMITATION";
    return "LONGYU_BUG";
  }
  if (probe.recognitionServiceAvailable === false && probe.onDeviceAvailable === false && /RECOGNITION_UNAVAILABLE|SERVICE_UNAVAILABLE/.test(code))
    return "ANDROID_SERVICE_LIMITATION";
  if (probe.zhCnSupported === false && /LANGUAGE/.test(code)) return "DEVICE_CAPABILITY_LIMITATION";
  if (probe.online === false && /NETWORK/.test(code)) return "NETWORK_DEPENDENCY";
  return "LONGYU_BUG";
}

/** Estado do reconhecimento de mandarim NESTE aparelho. */
export type RecognizerMatrixState = "FULL" | "NETWORK_ONLY" | "NO_ZH_CN" | "UNAVAILABLE";

export function recognizerMatrixState(probe: CapabilityProbe): RecognizerMatrixState {
  if (!probe.recognitionServiceAvailable && !probe.onDeviceAvailable) return "UNAVAILABLE";
  if (probe.onDeviceAvailable && probe.zhCnInstalledOnDevice) return "FULL";
  if (probe.zhCnSupported) return "NETWORK_ONLY";
  return "NO_ZH_CN";
}

/**
 * Resumo por fabricante: SÓ aparelhos testados, e cada linha diz quantos.
 * Nunca existe uma linha "todos os Androids".
 */
export function manufacturerSummary(devices: readonly DeviceRecord[]): { manufacturer: string; devicesTested: number; scope: "TESTED_DEVICES_ONLY" }[] {
  const counts = new Map<string, number>();
  for (const device of devices) {
    if (!device.tested || !device.manufacturer) continue;
    counts.set(device.manufacturer, (counts.get(device.manufacturer) ?? 0) + 1);
  }
  return [...counts.entries()].map(([manufacturer, devicesTested]) => ({ manufacturer, devicesTested, scope: "TESTED_DEVICES_ONLY" as const }));
}

/** Rótulos que nunca podem aparecer como fabricante (seriam generalização). */
export const GENERALIZED_MANUFACTURER = /^(all|any|todos|all[_ ]?android|android|\*)$/i;
