import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  return pkg.version ?? "0.0.0";
}

export function resolveCommitSha() {
  if (process.env.VITE_COMMIT_SHA?.trim()) return process.env.VITE_COMMIT_SHA.trim().slice(0, 12);
  if (process.env.COMMIT_REF?.trim()) return process.env.COMMIT_REF.trim().slice(0, 12);
  try {
    return execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export function resolveReleaseChannel(mode = "production") {
  if (process.env.VITE_RELEASE_CHANNEL?.trim()) return process.env.VITE_RELEASE_CHANNEL.trim();
  if (process.env.CONTEXT === "deploy-preview") return "beta";
  if (process.env.NETLIFY === "true" || process.env.CI === "true") return "beta";
  if (mode === "development") return "development";
  return "beta";
}

export function resolveBuildMeta(mode = "production") {
  return {
    VITE_APP_VERSION: readPackageVersion(),
    VITE_COMMIT_SHA: resolveCommitSha(),
    VITE_BUILD_TIME: new Date().toISOString(),
    VITE_RELEASE_CHANNEL: resolveReleaseChannel(mode),
  };
}
