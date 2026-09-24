import { BETA_LABEL, getAppEnvironmentLabel, getAppVersion, getCommitSha } from "../feedback";
import { getPlatform, type LongyuPlatform } from "./nativePlatform";

/**
 * RC2.2.10 — identidade pública do build (sem segredos): o mesmo contrato do
 * dist/version.json do web, acrescido da plataforma. O versionName do Android
 * é o próprio package.json (android/app/build.gradle), então a versão exibida
 * é a mesma nos dois clientes.
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
