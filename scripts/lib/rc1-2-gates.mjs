/**
 * RC1.2 — Release Closure.
 *
 * O ponto destes gates é um só: impedir que um check operacional fique verde
 * porque "o código parece certo". Um `pass: true` aqui significa que alguém
 * executou o procedimento contra um candidate identificado — e o gate recusa
 * qualquer coisa menos que isso.
 */
import fs from "node:fs";
import path from "node:path";

function failList() {
  const failures = [];
  return {
    failures,
    fail(code, ref, message) {
      failures.push({ code, ref, message });
    },
  };
}

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(process.cwd(), rel));
}

export const OPERATIONAL_CHECKS_PATH = "docs/release/rc1-operational-checks.json";

export function loadOperationalChecks(data = {}) {
  return data.checksJson ?? JSON.parse(read(OPERATIONAL_CHECKS_PATH));
}

// ── validate:operational-evidence (P26) ────────────────────────────────────

const ISO_DATE = /\d{4}-\d{2}-\d{2}/;

/**
 * P26 — o contrato de um check operacional.
 *
 * Falha se `pass: true` vier sem evidência, com evidência apontando para
 * arquivo inexistente, ou com um arquivo de evidência que não diz quando, onde
 * e com que resultado foi executado.
 *
 * Também falha o caminho oposto, que é mais sutil: um arquivo de evidência que
 * ainda se declara `NOT_RUN` não pode sustentar um `pass: true`.
 */
export function validateOperationalEvidence(data = {}) {
  const { fail, failures } = failList();
  let doc;
  try {
    doc = loadOperationalChecks(data);
  } catch (error) {
    fail("UNREADABLE", OPERATIONAL_CHECKS_PATH, `não foi possível ler: ${error.message}`);
    return { failures };
  }

  const checks = doc.checks ?? {};
  if (Object.keys(checks).length === 0) {
    fail("EMPTY", OPERATIONAL_CHECKS_PATH, "nenhum check declarado");
  }

  for (const [name, check] of Object.entries(checks)) {
    const evidence = String(check?.evidence ?? "").trim();

    // Todo check precisa apontar para um runbook, mesmo estando false: é ele
    // que diz a quem executar o que fazer.
    if (!evidence) {
      fail("NO_EVIDENCE_PATH", name, "check sem arquivo de evidência/runbook");
      continue;
    }
    const evidenceExists = data.evidenceFiles
      ? Object.prototype.hasOwnProperty.call(data.evidenceFiles, evidence)
      : exists(evidence);
    if (!evidenceExists) {
      fail("EVIDENCE_MISSING", name, `evidência aponta para arquivo inexistente: ${evidence}`);
      continue;
    }

    const body = data.evidenceFiles ? data.evidenceFiles[evidence] : read(evidence);
    for (const field of ["date", "environment", "result"]) {
      if (!new RegExp(`\\b${field}\\b`, "i").test(body)) {
        fail("EVIDENCE_INCOMPLETE", name, `arquivo de evidência sem campo "${field}": ${evidence}`);
      }
    }

    if (check?.pass !== true) continue;

    // A partir daqui o check se declara executado.
    for (const field of ["testedAt", "environment", "commitSha"]) {
      const value = String(check?.[field] ?? "").trim();
      if (!value) {
        fail("PASS_WITHOUT_PROOF", name, `pass: true sem "${field}"`);
      }
    }
    if (check?.testedAt && !ISO_DATE.test(String(check.testedAt))) {
      fail("BAD_TESTED_AT", name, `testedAt não parece uma data ISO: ${check.testedAt}`);
    }
    if (/NOT_RUN/i.test(body)) {
      fail(
        "PASS_ON_NOT_RUN",
        name,
        `pass: true mas ${evidence} ainda se declara NOT_RUN — o runbook não foi executado`
      );
    }
    // P30 mutação 7 — device real precisa dizer QUAL device.
    if (/android|ios/i.test(name) && !/version|versão|modelo|model/i.test(body)) {
      fail("DEVICE_UNIDENTIFIED", name, "evidência de device real sem modelo/versão");
    }
    // P30 mutação 9 — rollback precisa do antes e do depois.
    if (/rollback/i.test(name) && !/sha/i.test(body)) {
      fail("ROLLBACK_NO_SHA", name, "evidência de rollback sem SHA antes/depois");
    }
  }

  // P9.1 — Test Mode não é produção.
  if (checks.stripe_test_mode_e2e?.pass === true && checks.stripe_production_config?.pass !== true) {
    if (checks.stripe_live?.pass === true) {
      fail(
        "STRIPE_TEST_IS_NOT_LIVE",
        "stripe_live",
        "Test Mode passou mas a configuração de produção não: 'live' não pode ficar true"
      );
    }
  }

  // O veredito precisa refletir os checks, não a vontade de lançar.
  const allPass = Object.values(checks).every((check) => check?.pass === true);
  if (doc.verdict === "GO" && !allPass) {
    fail("VERDICT", "verdict", "verdict GO com check operacional pendente");
  }
  if (doc.verdict !== "GO" && allPass) {
    fail("VERDICT", "verdict", "todos os checks passaram mas o verdict não é GO");
  }

  return { failures };
}

// ── validate:release-evidence-freshness (P27) ──────────────────────────────

/**
 * P27 — evidência velha não sustenta candidate novo.
 *
 * Um check executado contra outro SHA descreve outro produto. Auth, sync,
 * Stripe, device, rollback e PWA dependem do bundle publicado, então a
 * evidência precisa citar o SHA do candidate.
 */
export function validateReleaseEvidenceFreshness(data = {}) {
  const { fail, failures } = failList();
  let doc;
  try {
    doc = loadOperationalChecks(data);
  } catch (error) {
    fail("UNREADABLE", OPERATIONAL_CHECKS_PATH, error.message);
    return { failures };
  }

  const candidate = String(doc.release_candidate_sha ?? "").trim();
  const checks = doc.checks ?? {};
  const passing = Object.entries(checks).filter(([, check]) => check?.pass === true);

  if (passing.length > 0 && !candidate) {
    fail(
      "NO_CANDIDATE_SHA",
      "release_candidate_sha",
      "há check passando mas nenhum candidate declarado: não dá para saber o que foi testado"
    );
  }

  for (const [name, check] of passing) {
    const sha = String(check?.commitSha ?? "").trim();
    if (!sha || !candidate) continue;
    // Aceita SHA curto ou longo, desde que um seja prefixo do outro.
    const compatible = sha.startsWith(candidate) || candidate.startsWith(sha);
    if (!compatible) {
      fail(
        "STALE_EVIDENCE",
        name,
        `evidência é do SHA ${sha}, o candidate é ${candidate} — reexecutar ou justificar compatibilidade`
      );
    }
  }

  // O SHA do freeze de currículo é história e não pode ser sobrescrito pelo
  // candidate da vez (P22.1).
  if (!String(doc.curriculum_base_sha ?? "").trim()) {
    fail("NO_CURRICULUM_BASE", "curriculum_base_sha", "SHA do freeze de currículo ausente");
  }
  if (candidate && doc.curriculum_base_sha === candidate) {
    fail(
      "HISTORY_LOST",
      "curriculum_base_sha",
      "curriculum_base_sha foi sobrescrito com o candidate: a história do freeze se perdeu"
    );
  }

  return { failures };
}

// ── validate:navigation-history-integrity (P25) ────────────────────────────

/**
 * P1 — o boot do app não pode depender de um recurso de terceiro.
 *
 * Era isso que derrubava o `page.goForward()`: um `<link rel="stylesheet">`
 * externo bloqueia a execução dos scripts seguintes e o evento `load`. Com o
 * CDN pendurado, o módulo do app nunca roda.
 */
export function validateNavigationHistoryIntegrity(data = {}) {
  const { fail, failures } = failList();
  const html = data.indexHtml ?? read("index.html");
  const main = data.mainSource ?? read("src/main.tsx");
  const csp = data.netlifyToml ?? read("netlify.toml");

  // Nenhuma folha de estilo externa render-blocking no head.
  const blockingExternal = [...html.matchAll(/<link\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => /rel=["']stylesheet["']/.test(tag))
    .filter((tag) => /https?:\/\//.test(tag));
  // O <noscript> é aceitável: sem JS não há app para bloquear.
  const noscriptBlocks = [...html.matchAll(/<noscript>[\s\S]*?<\/noscript>/g)].map((m) => m[0]).join("\n");
  for (const tag of blockingExternal) {
    if (noscriptBlocks.includes(tag)) continue;
    fail(
      "BLOCKING_EXTERNAL_CSS",
      "index.html",
      `folha de estilo externa render-blocking trava o boot: ${tag.slice(0, 90)}`
    );
  }

  // A promoção da fonte precisa existir e ser esperada pelo `load`.
  if (/rel=["']preload["'][^>]*as=["']style["']/.test(html) || /longyu-fonts/.test(html)) {
    if (!/longyu-fonts/.test(main)) {
      fail("NO_PROMOTION", "main.tsx", "fonte pré-carregada nunca é promovida a stylesheet");
    }
    if (!/addEventListener\(\s*["']load["']/.test(main) && !/readyState/.test(main)) {
      fail(
        "SYNC_PROMOTION",
        "main.tsx",
        "promoção síncrona volta a segurar o evento load: precisa esperar o load"
      );
    }
  }

  // P30 — a CSP proíbe handler inline, então `onload=` no HTML seria ignorado
  // em produção sem erro visível.
  if (/script-src-attr\s+'none'/.test(csp) && /<link\b[^>]*\sonload=/.test(html)) {
    fail(
      "CSP_INLINE_HANDLER",
      "index.html",
      "onload inline em <link> é bloqueado por script-src-attr 'none' em produção"
    );
  }

  // O e2e que guarda o contrato precisa existir.
  const specPath = "e2e/navigation-history-integrity.spec.ts";
  if (!(data.specSource ? true : exists(specPath))) {
    fail("NO_SPEC", specPath, "contrato de history sem e2e");
  } else {
    const spec = data.specSource ?? read(specPath);
    for (const needle of ["goForward", "goBack", "reload", "fonts.googleapis.com"]) {
      if (!spec.includes(needle)) fail("SPEC_INCOMPLETE", specPath, `e2e não cobre ${needle}`);
    }
    // P1.3 — não esconder o bug no teste.
    if (/test\.fixme|test\.skip\(\s*true/.test(spec)) {
      fail("SPEC_HIDES_BUG", specPath, "P1.3: o contrato não pode ser pulado");
    }
  }

  return { failures };
}

// ── validate:rc1-2-freeze (P0) ─────────────────────────────────────────────

export function validateRc12Freeze(data = {}) {
  const { fail, failures } = failList();
  const fingerprint = data.fingerprint;
  const counts = data.counts;
  const EXPECTED = { fingerprint: "7c054f2255e7", lessons: 134, topics: 113 };

  if (fingerprint && fingerprint !== EXPECTED.fingerprint) {
    fail("FINGERPRINT", "journey", `fingerprint ${fingerprint} ≠ ${EXPECTED.fingerprint}`);
  }
  if (counts) {
    if (counts.lessons !== EXPECTED.lessons) {
      fail("LESSON_COUNT", "journey", `${counts.lessons} lições (esperado ${EXPECTED.lessons})`);
    }
    if (counts.teachingTopics !== EXPECTED.topics) {
      fail("TOPIC_COUNT", "journey", `${counts.teachingTopics} temas (esperado ${EXPECTED.topics})`);
    }
  }

  const doc = (() => {
    try {
      return loadOperationalChecks(data);
    } catch {
      return null;
    }
  })();
  if (doc && doc.base_fingerprint !== EXPECTED.fingerprint) {
    fail("CHECKS_FINGERPRINT", OPERATIONAL_CHECKS_PATH, "base_fingerprint divergente");
  }

  return { failures };
}
