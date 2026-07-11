export type ReleaseChannel = "development" | "beta" | "production";

export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "0.0.0";
export const COMMIT_SHA = import.meta.env.VITE_COMMIT_SHA ?? "dev";
export const BUILD_TIME = import.meta.env.VITE_BUILD_TIME ?? "";
export const RELEASE_CHANNEL = (import.meta.env.VITE_RELEASE_CHANNEL ?? "development") as ReleaseChannel;

export function releaseChannelLabel(channel: ReleaseChannel = RELEASE_CHANNEL): string {
  if (channel === "production") return "Longyu";
  if (channel === "beta") return "Longyu Beta";
  return "Longyu Dev";
}

export function formatBuildTimestamp(iso = BUILD_TIME): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatAppVersionLabel(): string {
  return `${releaseChannelLabel()} ${APP_VERSION}`;
}

export function shortCommitSha(sha = COMMIT_SHA): string {
  return sha.slice(0, 7);
}

export function buildInfoLines(): string[] {
  return [
    formatAppVersionLabel(),
    `Build ${shortCommitSha()}`,
    formatBuildTimestamp(),
  ];
}

export function buildInfoForReports(): Record<string, string> {
  return {
    app_version: APP_VERSION,
    build_sha: shortCommitSha(),
    build_time: BUILD_TIME,
    release_channel: RELEASE_CHANNEL,
  };
}
