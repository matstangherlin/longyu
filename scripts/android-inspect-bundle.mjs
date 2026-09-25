#!/usr/bin/env node
/**
 * RC2.2.16 · O — inspeciona o ARTEFATO FINAL (AAB ou APK), não o build.gradle.
 *
 *   node scripts/android-inspect-bundle.mjs <arquivo.aab|apk> [--expect-package <id>] [--json]
 *
 * Lê o manifesto compilado de dentro do zip:
 *   - AAB: base/manifest/AndroidManifest.xml em protobuf (formato aapt2/bundletool);
 *   - APK: AndroidManifest.xml em XML binário (AXML).
 * Devolve package, versionCode, versionName e as authorities de <provider>, e
 * varre TODAS as entradas (dex, resources, assets) pelo package antigo
 * (LEGACY_ANDROID_APPLICATION_IDS, em forma de package e de classe dex). Sem dependências: node:zlib.
 *
 * Saídas: exit 0 PACKAGE_OK · exit 10 PACKAGE_MISMATCH / LEGACY_ID_IN_BUNDLE ·
 * exit 2 arquivo ausente/ilegível.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { ANDROID_APPLICATION_ID, LEGACY_ANDROID_APPLICATION_IDS } from "./lib/android-package-identity.mjs";

const ANDROID_NS = "http://schemas.android.com/apk/res/android";
const ATTR_RES_ID = { versionCode: 0x0101021b, versionName: 0x0101021c, authorities: 0x01010018, name: 0x01010003 };

// ---------------------------------------------------------------- zip

export function readZipEntries(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("NOT_A_ZIP: fim do diretório central não encontrado");
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("ZIP_CORRUPT: entrada do diretório central inválida");
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    entries.push({ name, method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  const read = (entry) => {
    const local = entry.localOffset;
    if (buffer.readUInt32LE(local) !== 0x04034b50) throw new Error(`ZIP_CORRUPT: cabeçalho local de ${entry.name}`);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) return data;
    if (entry.method === 8) return zlib.inflateRawSync(data);
    throw new Error(`ZIP_UNSUPPORTED: método ${entry.method} em ${entry.name}`);
  };
  return { entries, read };
}

// ---------------------------------------------------------------- protobuf (AAB)

function readVarint(buf, pos) {
  let result = 0;
  let shift = 0;
  let byte;
  do {
    byte = buf[pos];
    pos += 1;
    result += (byte & 0x7f) * 2 ** shift;
    shift += 7;
  } while (byte & 0x80);
  return [result, pos];
}

function protoFields(buf) {
  const fields = [];
  let pos = 0;
  while (pos < buf.length) {
    let key;
    [key, pos] = readVarint(buf, pos);
    const field = Math.floor(key / 8);
    const wire = key & 7;
    if (wire === 0) {
      let value;
      [value, pos] = readVarint(buf, pos);
      fields.push({ field, wire, value });
    } else if (wire === 2) {
      let length;
      [length, pos] = readVarint(buf, pos);
      fields.push({ field, wire, bytes: buf.subarray(pos, pos + length) });
      pos += length;
    } else if (wire === 5) {
      fields.push({ field, wire, value: buf.readUInt32LE(pos) });
      pos += 4;
    } else if (wire === 1) {
      pos += 8;
    } else {
      throw new Error(`PROTO_UNSUPPORTED: wire type ${wire}`);
    }
  }
  return fields;
}

const str = (fields, n) => fields.find((f) => f.field === n && f.wire === 2)?.bytes.toString("utf8") ?? "";

/** XmlNode{element=1} → XmlElement{namespace_uri=2,name=3,attribute=4,child=5}; XmlAttribute{namespace_uri=1,name=2,value=3,resource_id=5}. */
function protoElement(nodeBytes) {
  const node = protoFields(nodeBytes);
  const elementBytes = node.find((f) => f.field === 1 && f.wire === 2)?.bytes;
  if (!elementBytes) return null;
  const el = protoFields(elementBytes);
  return {
    name: str(el, 3),
    attributes: el
      .filter((f) => f.field === 4 && f.wire === 2)
      .map((f) => {
        const attr = protoFields(f.bytes);
        return { ns: str(attr, 1), name: str(attr, 2), value: str(attr, 3), resourceId: attr.find((a) => a.field === 5)?.value ?? 0 };
      }),
    children: el.filter((f) => f.field === 5 && f.wire === 2).map((f) => protoElement(f.bytes)).filter(Boolean),
  };
}

// ---------------------------------------------------------------- AXML (APK)

function axmlStringPool(buf, start) {
  const count = buf.readUInt32LE(start + 8);
  const flags = buf.readUInt32LE(start + 16);
  const stringsStart = buf.readUInt32LE(start + 20);
  const utf8 = (flags & 0x100) !== 0;
  const strings = [];
  for (let i = 0; i < count; i += 1) {
    let p = start + stringsStart + buf.readUInt32LE(start + 28 + i * 4);
    if (utf8) {
      p += buf[p] & 0x80 ? 2 : 1;
      let length = buf[p];
      if (length & 0x80) {
        length = ((length & 0x7f) << 8) | buf[p + 1];
        p += 2;
      } else p += 1;
      strings.push(buf.toString("utf8", p, p + length));
    } else {
      let length = buf.readUInt16LE(p);
      if (length & 0x8000) {
        length = ((length & 0x7fff) << 16) | buf.readUInt16LE(p + 2);
        p += 4;
      } else p += 2;
      strings.push(buf.toString("utf16le", p, p + length * 2));
    }
  }
  return strings;
}

function parseAxml(buf) {
  if (buf.readUInt16LE(0) !== 0x0003) throw new Error("AXML_INVALID: não é XML binário do Android");
  let pos = buf.readUInt16LE(2);
  let strings = [];
  let resourceIds = [];
  const root = { name: "#root", attributes: [], children: [] };
  const stack = [root];
  while (pos < buf.length) {
    const type = buf.readUInt16LE(pos);
    const headerSize = buf.readUInt16LE(pos + 2);
    const size = buf.readUInt32LE(pos + 4);
    if (type === 0x0001) strings = axmlStringPool(buf, pos);
    else if (type === 0x0180) resourceIds = Array.from({ length: (size - headerSize) / 4 }, (_, i) => buf.readUInt32LE(pos + headerSize + i * 4));
    else if (type === 0x0102) {
      const ext = pos + headerSize;
      const name = strings[buf.readUInt32LE(ext + 4)] ?? "";
      const attrStart = buf.readUInt16LE(ext + 8);
      const attrSize = buf.readUInt16LE(ext + 10);
      const attrCount = buf.readUInt16LE(ext + 12);
      const attributes = [];
      for (let i = 0; i < attrCount; i += 1) {
        const a = ext + attrStart + i * attrSize;
        const nsIndex = buf.readInt32LE(a);
        const nameIndex = buf.readUInt32LE(a + 4);
        const rawIndex = buf.readInt32LE(a + 8);
        const dataType = buf[a + 15];
        const data = buf.readUInt32LE(a + 16);
        const value = rawIndex >= 0 ? strings[rawIndex] : dataType === 0x03 ? strings[data] : dataType === 0x10 || dataType === 0x11 ? String(data) : "";
        attributes.push({ ns: nsIndex >= 0 ? strings[nsIndex] : "", name: strings[nameIndex] ?? "", value, resourceId: resourceIds[nameIndex] ?? 0 });
      }
      const element = { name, attributes, children: [] };
      stack[stack.length - 1].children.push(element);
      stack.push(element);
    } else if (type === 0x0103) stack.pop();
    pos += size;
  }
  return root.children[0] ?? null;
}

// ---------------------------------------------------------------- inspeção

function attr(element, name) {
  const found = element?.attributes.find(
    (a) => (a.name === name && (a.ns === "" || a.ns === ANDROID_NS)) || (ATTR_RES_ID[name] && a.resourceId === ATTR_RES_ID[name])
  );
  return found ? found.value : null;
}

export function summarizeManifest(manifest) {
  if (!manifest || manifest.name !== "manifest") throw new Error("MANIFEST_INVALID: raiz não é <manifest>");
  const application = manifest.children.find((child) => child.name === "application");
  const providers = (application?.children ?? []).filter((child) => child.name === "provider");
  const versionCode = Number(attr(manifest, "versionCode"));
  return {
    packageName: manifest.attributes.find((a) => a.name === "package")?.value ?? null,
    versionCode: Number.isInteger(versionCode) ? versionCode : null,
    versionName: attr(manifest, "versionName"),
    providerAuthorities: providers.map((provider) => attr(provider, "authorities")).filter(Boolean),
  };
}

/** Procura o package antigo em qualquer entrada (UTF-8, UTF-16LE e forma de classe dex). */
export function legacyIdHits(entryName, data, legacyIds = LEGACY_ANDROID_APPLICATION_IDS) {
  const needles = legacyIds.flatMap((id) => [Buffer.from(id, "utf8"), Buffer.from(id, "utf16le"), Buffer.from(id.split(".").join("/"), "utf8")]);
  return needles.some((needle) => data.indexOf(needle) >= 0) ? [entryName] : [];
}

export function inspectAndroidArtifact(buffer, fileName = "artifact") {
  const zip = readZipEntries(buffer);
  const names = zip.entries.map((entry) => entry.name);
  const aabManifest = zip.entries.find((entry) => entry.name === "base/manifest/AndroidManifest.xml");
  const apkManifest = zip.entries.find((entry) => entry.name === "AndroidManifest.xml");
  let kind;
  let manifest;
  if (aabManifest) {
    kind = "aab";
    manifest = protoElement(zip.read(aabManifest));
  } else if (apkManifest) {
    kind = "apk";
    manifest = parseAxml(zip.read(apkManifest));
  } else {
    throw new Error(`MANIFEST_MISSING: ${fileName} não tem AndroidManifest.xml`);
  }
  const summary = summarizeManifest(manifest);
  const legacyHits = zip.entries.flatMap((entry) => legacyIdHits(entry.name, zip.read(entry)));
  return {
    schema: "longyu-android-bundle-inspection/1",
    kind,
    ...summary,
    entryCount: names.length,
    legacyIdFound: legacyHits.length > 0,
    legacyHits: legacyHits.slice(0, 20),
  };
}

/** Veredito puro: package, provider e ausência do id antigo. */
export function bundleVerdict(inspection, expectedPackage = ANDROID_APPLICATION_ID) {
  if (inspection.packageName !== expectedPackage) return { ok: false, code: "PACKAGE_MISMATCH" };
  if (inspection.legacyIdFound) return { ok: false, code: "LEGACY_ID_IN_BUNDLE" };
  if (inspection.providerAuthorities.some((authority) => !authority.startsWith(`${expectedPackage}.`))) return { ok: false, code: "PROVIDER_AUTHORITY_MISMATCH" };
  return { ok: true, code: "PACKAGE_OK" };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const file = process.argv[2];
  const expectIndex = process.argv.indexOf("--expect-package");
  const expected = expectIndex > 0 ? process.argv[expectIndex + 1] : ANDROID_APPLICATION_ID;
  if (!file || !fs.existsSync(file)) {
    console.error("MISSING_ARTIFACT: informe um .aab/.apk existente");
    process.exit(2);
  }
  let inspection;
  try {
    inspection = inspectAndroidArtifact(fs.readFileSync(file), path.basename(file));
  } catch (error) {
    console.error(String(error?.message ?? error));
    process.exit(2);
  }
  const verdict = bundleVerdict(inspection, expected);
  if (process.argv.includes("--json")) console.log(JSON.stringify({ ...inspection, result: verdict.code }, null, 2));
  else {
    console.log(
      `${verdict.code} · ${path.basename(file)} (${inspection.kind}) · package ${inspection.packageName} · versionCode ${inspection.versionCode} · versionName ${inspection.versionName}` +
        ` · providers ${inspection.providerAuthorities.join(", ") || "—"} · id antigo ${inspection.legacyIdFound ? `ENCONTRADO em ${inspection.legacyHits.join(", ")}` : "ausente"}`
    );
  }
  process.exit(verdict.ok ? 0 : 10);
}
