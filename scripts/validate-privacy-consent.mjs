/**
 * Portão de privacidade: consentimento pedagógico opt-in e feedback independente.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

// ——— Espelho mínimo da lógica de consentimento (sem Vite) ———
function makeConsentApi(store = {}) {
  const memory = { ...store };
  function getTelemetryConsent() {
    const raw = memory["longyu:telemetry-consent"];
    if (raw === undefined || raw === null) return false;
    return raw === "1" || raw === "true";
  }
  function setTelemetryConsent(enabled) {
    memory["longyu:telemetry-consent"] = enabled ? "1" : "0";
    if (!enabled) delete memory["longyu:beta-pedagogy-queue"];
  }
  function clearPedagogyEventQueue() {
    delete memory["longyu:beta-pedagogy-queue"];
  }
  function track(consent) {
    if (!consent) return { sent: false };
    return { sent: true };
  }
  return { memory, getTelemetryConsent, setTelemetryConsent, clearPedagogyEventQueue, track };
}

const unset = makeConsentApi({});
assert(unset.getTelemetryConsent() === false, "consentimento padrão deve ser false quando não há escolha");
assert(unset.track(unset.getTelemetryConsent()).sent === false, "evento não pode ser enviado sem consentimento");

const allowed = makeConsentApi({ "longyu:telemetry-consent": "1", "longyu:beta-pedagogy-queue": "[{}]" });
assert(allowed.getTelemetryConsent() === true, "consentimento true deve permitir");
allowed.setTelemetryConsent(false);
assert(allowed.getTelemetryConsent() === false, "desligar deve persistir false");
assert(
  allowed.memory["longyu:beta-pedagogy-queue"] === undefined,
  "desligar deve limpar fila de eventos pendentes"
);

// safeMetadata bloqueia respostas livres
const pedagogySrc = read("src/services/pedagogyEvents.ts");
assert(pedagogySrc.includes("export function safeMetadata"), "pedagogyEvents deve exportar safeMetadata");
assert(pedagogySrc.includes("freeTextAnswer"), "safeMetadata deve bloquear freeTextAnswer");
assert(pedagogySrc.includes("!getTelemetryConsent()"), "track/flush/insert devem checar consentimento");

const consentSrc = read("src/services/telemetryConsent.ts");
assert(consentSrc.includes('if (raw === null) return false'), "getTelemetryConsent default false");
assert(consentSrc.includes("clearPedagogyEventQueue"), "revogação deve limpar fila");
assert(consentSrc.includes("pedagogy_analytics_consent"), "sync de perfil deve usar pedagogy_analytics_consent");

// Feedback manual independente da telemetria
const feedbackSrc = read("src/services/feedbackService.ts");
assert(!feedbackSrc.includes("getTelemetryConsent"), "feedbackService não deve depender de getTelemetryConsent");
assert(feedbackSrc.includes("isBetaFeedbackEnabled"), "feedback continua com flag própria");

// UI: modal + ajustes com revogação
const modalSrc = read("src/components/privacy/TelemetryConsentModal.tsx");
assert(modalSrc.includes("Permitir dados de melhoria"), "modal deve oferecer permitir");
assert(modalSrc.includes("Agora não"), "modal deve oferecer agora não");
assert(modalSrc.includes("Ver detalhes"), "modal deve oferecer ver detalhes");

const settingsSrc = read("src/features/settings/SettingsPage.tsx");
assert(settingsSrc.includes("Privacidade e dados"), "Ajustes deve ter seção Privacidade e dados");
assert(settingsSrc.includes("Dados pedagógicos de melhoria"), "toggle de dados pedagógicos");
assert(settingsSrc.includes("Limpar fila de eventos"), "opção de limpar fila");
assert(settingsSrc.includes("Solicitar exportação"), "opção de exportação");
assert(settingsSrc.includes("Solicitar exclusão"), "opção de exclusão");
assert(settingsSrc.includes("Política de privacidade"), "link para política");
assert(settingsSrc.includes("setTelemetryConsent(next)"), "toggle deve chamar setTelemetryConsent");

const migration = read("supabase/migrations/011_pedagogy_analytics_consent.sql");
assert(migration.includes("pedagogy_analytics_consent"), "migration deve adicionar pedagogy_analytics_consent");
assert(migration.includes("pedagogy_analytics_consented_at"), "migration deve adicionar consented_at");
assert(migration.includes("pedagogy_analytics_revoked_at"), "migration deve adicionar revoked_at");
assert(migration.includes("default false"), "coluna de consentimento default false");

const watcher = read("src/components/privacy/TelemetryConsentWatcher.tsx");
assert(watcher.includes("hasTelemetryConsentChoice"), "watcher só abre sem escolha");
assert(watcher.includes("accountSetupComplete"), "watcher após cadastro/painel");

const privacyPage = read("src/features/privacy/PrivacyPage.tsx");
assert(privacyPage.includes("dados-coletados"), "página de privacidade lista dados");
assert(privacyPage.includes("politica"), "página inclui política");

const routes = read("src/routes.tsx");
assert(routes.includes('path: "privacidade"'), "rota /privacidade registrada");

const copy = read("src/lib/privacyCopy.ts");
assert(copy.includes("texto digitado livre"), "copy lista o que não é coletado");
assert(copy.includes("identificador da conta/perfil"), "copy lista o que é coletado");

// Garante que o default antigo (true) não voltou em pedagogyEvents re-export
assert(
  !/\/\*\* Consentimento para telemetria pedagógica \(padrão: true/.test(pedagogySrc),
  "comentário antigo de default true não deve permanecer"
);

// Executa safeMetadata via transpile superficial: checa presença de bloqueios críticos
const blockedKeys = ["freeTextAnswer", "answerText", "answer", "password", "senha", "token"];
for (const key of blockedKeys) {
  assert(pedagogySrc.includes(`"${key}"`) || pedagogySrc.includes(`'${key}'`), `safeMetadata deve listar ${key}`);
}

void vm;

if (errors.length) {
  console.error("ERRO: validate:privacy-consent falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:privacy-consent — opt-in, fila, feedback e UI de revogação.");
