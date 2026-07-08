/**
 * Busca a anon key real do projeto Supabase e atualiza .env.production + netlify.toml.
 * Requer SUPABASE_ACCESS_TOKEN em .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const env = mergedEnv();
const token = env.SUPABASE_ACCESS_TOKEN;
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN ausente em .env.local");
  process.exit(1);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
  headers: { Authorization: `Bearer ${token}` },
});

if (!response.ok) {
  console.error(`Management API falhou: HTTP ${response.status}`);
  process.exit(1);
}

const keys = await response.json();
const anon = keys.find((k) => k.name === "anon" || k.type === "legacy" && k.name === "anon")?.api_key
  ?? keys.find((k) => k.name === "anon")?.api_key;

if (!anon) {
  console.error("Anon key não encontrada na resposta da Management API.");
  process.exit(1);
}

const prodPath = path.join(root, ".env.production");
const netlifyPath = path.join(root, "netlify.toml");
const currentProd = env.VITE_SUPABASE_ANON_KEY ?? readKeyFromFile(prodPath);

function readKeyFromFile(filePath) {
  if (!fs.existsSync(filePath)) return "";
  const match = fs.readFileSync(filePath, "utf8").match(/VITE_SUPABASE_ANON_KEY\s*=\s*"?([^"\n]+)"?/);
  return match?.[1] ?? "";
}

console.log(`Anon key atual: ${currentProd.length} chars`);
console.log(`Anon key remota: ${anon.length} chars`);

if (currentProd === anon) {
  console.log("Chave já está correta em .env.production — nada a atualizar.");
} else {
  let prodText = fs.readFileSync(prodPath, "utf8");
  prodText = prodText.replace(
    /VITE_SUPABASE_ANON_KEY=.*/,
    `VITE_SUPABASE_ANON_KEY=${anon}`
  );
  fs.writeFileSync(prodPath, prodText);

  let netlifyText = fs.readFileSync(netlifyPath, "utf8");
  netlifyText = netlifyText.replace(
    /VITE_SUPABASE_ANON_KEY = "[^"]+"/g,
    `VITE_SUPABASE_ANON_KEY = "${anon}"`
  );
  fs.writeFileSync(netlifyPath, netlifyText);
  console.log("Atualizado .env.production e netlify.toml com a anon key correta.");
}

const localPath = path.join(root, ".env.local");
if (fs.existsSync(localPath)) {
  const localKey = readKeyFromFile(localPath);
  if (localKey && localKey !== anon) {
    let localText = fs.readFileSync(localPath, "utf8");
    localText = localText.replace(
      /VITE_SUPABASE_ANON_KEY=.*/,
      `VITE_SUPABASE_ANON_KEY=${anon}`
    );
    fs.writeFileSync(localPath, localText);
    console.log("Atualizado .env.local com a anon key correta.");
  }
}

// Testa signup endpoint (sem criar conta real — só valida a chave)
const url = (env.VITE_SUPABASE_URL ?? `https://${ref}.supabase.co`).replace(/\/$/, "");
const probe = await fetch(`${url}/auth/v1/signup`, {
  method: "POST",
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email: "key-probe@longyu.invalid", password: "probe-only-123456" }),
});
const body = await probe.json().catch(() => ({}));
const msg = String(body?.msg ?? body?.message ?? "").toLowerCase();
const invalidKey = msg.includes("invalid api key");

if (invalidKey) {
  console.error("ERRO: Supabase ainda retorna Invalid API key após sync.");
  process.exit(1);
}

console.log(`Auth signup probe: HTTP ${probe.status} — chave aceita pelo Supabase.`);
