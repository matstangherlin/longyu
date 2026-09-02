import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  MANDARIMPROJECT_READONLY_MIGRATIONS,
  MANDARIMPROJECT_READONLY_CAPTURED_AT,
} from "./mandarimproject-readonly-snapshot.mjs";
import { V476_OPERATIONAL_MIGRATIONS, V476_PRODUCTION_WATERMARK } from "./v476-constants.mjs";

export function localMigrationFiles(root) {
  const dir = path.join(root, "supabase", "migrations");
  return fs
    .readdirSync(dir)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort()
    .map((file) => {
      const version = file.replace(/\.sql$/, "").split("_")[0];
      const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "");
      // Git may check text files out as CRLF on Windows. Backend identities must
      // describe the repository content, not the workstation line-ending mode.
      const contents = fs
        .readFileSync(path.join(dir, file), "utf8")
        .replace(/\r\n/g, "\n");
      return {
        file,
        version,
        name,
        sha256: crypto.createHash("sha256").update(contents).digest("hex"),
      };
    });
}

export function localSchemaHash(files) {
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file.file);
    hash.update("\0");
    hash.update(file.sha256);
    hash.update("\n");
  }
  return hash.digest("hex");
}

function normalizeName(name) {
  return String(name ?? "")
    .replace(/^\d+_/, "")
    .replace(/\.sql$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

export function classifyMigrationDrift(localFiles, remoteRows = MANDARIMPROJECT_READONLY_MIGRATIONS) {
  const localByVersion = new Map(localFiles.map((row) => [row.version, row]));
  const localByName = new Map();
  for (const row of localFiles) {
    localByName.set(normalizeName(row.name), row);
  }

  const localAndRemote = [];
  const remoteOnly = [];
  const matchedLocal = new Set();

  for (const remote of remoteRows) {
    const byVersion = localByVersion.get(remote.version);
    const byName = localByName.get(normalizeName(remote.name));
    if (byVersion) {
      localAndRemote.push({
        kind: "LOCAL_AND_REMOTE",
        match: "version",
        remote,
        local: byVersion,
      });
      matchedLocal.add(byVersion.file);
    } else if (byName) {
      localAndRemote.push({
        kind: "LOCAL_AND_REMOTE",
        match: "name_only",
        remote,
        local: byName,
        note: "Version timestamps differ. Do not add empty files with the remote timestamp.",
      });
      matchedLocal.add(byName.file);
    } else {
      remoteOnly.push({ kind: "REMOTE_ONLY", remote });
    }
  }

  const localOnly = localFiles
    .filter((row) => !matchedLocal.has(row.file))
    .map((local) => ({ kind: "LOCAL_ONLY", local }));

  return {
    captured_at: MANDARIMPROJECT_READONLY_CAPTURED_AT,
    production_watermark: V476_PRODUCTION_WATERMARK,
    operational_local_only: V476_OPERATIONAL_MIGRATIONS.filter((file) =>
      localOnly.some((row) => row.local.file === file)
    ),
    counts: {
      local: localFiles.length,
      remote: remoteRows.length,
      LOCAL_AND_REMOTE: localAndRemote.length,
      REMOTE_ONLY: remoteOnly.length,
      LOCAL_ONLY: localOnly.length,
    },
    localAndRemote,
    remoteOnly,
    localOnly,
  };
}
