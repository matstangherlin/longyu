import { BETA_LABEL, getAppEnvironmentLabel, getAppVersion, getCommitSha } from "../feedback";
import { getPlatform, isNativePluginAvailable, type LongyuPlatform } from "./nativePlatform";

/**
 * RC2.2.10 — identidade pública do build (sem segredos): o mesmo contrato do
 * dist/version.json do web, acrescido da plataforma. O versionName do Android
 * é o próprio package.json (android/app/build.gradle), então a versão exibida
 * é a mesma nos dois clientes.
 *
 * RC2.2.10B — o SHA é a autoridade (o mesmo commit de `main` gera web e
 * Android). No Android, versionName/versionCode vêm do PRÓPRIO APK instalado
 * (App.getInfo), não de uma cópia no bundle — assim o que aparece é o que
 * está de fato no aparelho.
 */
export type BuildIdentity = {
  label: string;
  appVersion: string;
  platform: LongyuPlatform;
  commitSha: string;
  build: string;
  environment: string;
};

const PLATFORM_LABEL: Record<LongyuPlatform, string> = { web: "Web", android: "Android", ios: "iOS" };

export function platformLabel(platform: LongyuPlatform = getPlatform()): string {
  return PLATFORM_LABEL[platform];
}

export function getBuildIdentity(): BuildIdentity {
  const commitSha = getCommitSha();
  return {
    label: BETA_LABEL,
    appVersion: getAppVersion(),
    platform: getPlatform(),
    commitSha,
    build: commitSha ? commitSha.slice(0, 7) : "local",
    environment: getAppEnvironmentLabel(),
  };
}

export type NativeAppVersion = { versionName: string; versionCode: number };

/** Android: versionName/versionCode do APK instalado. Web: null. */
export async function getNativeAppVersion(): Promise<NativeAppVersion | null> {
  if (!isNativePluginAvailable("App")) return null;
  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    const versionCode = Number(info.build);
    return Number.isInteger(versionCode) ? { versionName: info.version, versionCode } : null;
  } catch {
    return null;
  }
}
