import { getBuildIdentity, getNativeAppInfo } from "./platform/buildIdentity";
import { getPlatform, isNativeApp } from "./platform/nativePlatform";
import { hasNativeSpeech, nativeTtsBridgeInstalledAt, nativeTtsPlaybackState, nativeTtsPluginAvailable } from "./platform/nativeSpeech";

export type TtsAckSource = "event" | "direct" | "query";

export async function ttsDiagnosticSnapshot(input: {
  requestId: string | null;
  ackSources: readonly TtsAckSource[];
  guidedListenState?: string | null;
  ctaReason?: string | null;
  ctaEnabled?: boolean | null;
  audioOutcome?: string | null;
  finalDecision?: string | null;
}) {
  const identity = getBuildIdentity();
  const nativeInfo = await getNativeAppInfo();
  const state = input.requestId ? await nativeTtsPlaybackState(input.requestId) : null;
  const queryAck = state?.state === "STARTED" || state?.state === "DONE" || input.ackSources.includes("query");
  return {
    buildSha: identity.commitSha?.slice(0, 12) ?? null,
    versionName: nativeInfo?.versionName ?? identity.appVersion ?? null,
    versionCode: nativeInfo?.versionCode ?? null,
    package: nativeInfo?.packageName ?? null,
    isNativePlatform: isNativeApp(),
    nativePlatform: getPlatform(),
    hasNativeSpeech: hasNativeSpeech(),
    pluginAvailable: nativeTtsPluginAvailable(),
    ttsEngine: hasNativeSpeech() ? "native-tts" : "web-tts",
    ttsBridgeInstalled: nativeTtsBridgeInstalledAt() != null,
    requestId: input.requestId,
    utteranceId: state?.utteranceId ?? null,
    nativeState: state?.state ?? null,
    nativeErrorCode: state?.errorCode ?? null,
    directStartAck: input.ackSources.includes("direct"),
    eventStartAck: input.ackSources.includes("event"),
    stateQueryAck: queryAck,
    audioOutcome: input.audioOutcome ?? null,
    guidedListenState: input.guidedListenState ?? null,
    ctaReason: input.ctaReason ?? null,
    ctaEnabled: input.ctaEnabled ?? null,
    finalDecision: input.finalDecision ?? null,
  };
}
