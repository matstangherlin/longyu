import ts from "typescript";

/**
 * Gates da RC1.5 — verdade do produto e verdade da telemetria.
 *
 * As RC1.1–RC1.4 fecharam a verdade PEDAGÓGICA: o que a tarefa pergunta é o
 * que ela avalia e o que ela corrige. Faltavam duas.
 *
 * A verdade do PRODUTO: o que a interface diz que existe é o que existe. A
 * /fala vendia "Fala com IA · Pro" com "correção de pronúncia frase por
 * frase" e abria paywall no usuário grátis — para um recurso que o assinante
 * também não tinha. Quem pagasse recebia o mesmo botão dizendo "Em breve".
 *
 * A verdade da TELEMETRIA: o que a métrica diz que aconteceu é o que
 * aconteceu. Clicar "Já sabia" num flashcard gravava `phrasesSpoken`, que
 * alimentava medalha de "Fale 50 frases em voz alta", missão de frases e
 * contagem de produção. Ninguém tinha falado.
 *
 * Como nos gates anteriores, cada função recebe o fonte por parâmetro: é assim
 * que a mutação ataca o CONTRATO, e não o disco.
 */

function failList() {
  const failures = [];
  return {
    failures,
    fail: (code, where, message) => failures.push({ code, where, message }),
  };
}

/**
 * Tira comentário de TS/TSX preservando as linhas.
 *
 * Sem isto, a prosa entra no gate — e a prosa que mais entra é justamente a
 * que documenta o bug removido. O comentário no topo da FalaPage explica que a
 * tela vendia "Praticar com IA"; um scanner ingênuo leria isso como a tela
 * ainda vendendo, e a punição por escrever a história seria apagá-la.
 *
 * Quem interpreta o arquivo é o parser do próprio TypeScript, e não uma
 * máquina de estados escrita à mão. A versão manual derivava em 17 arquivos do
 * `src`: uma regex como `/['"]/` abre uma string que nunca fecha, e a partir
 * dali o resto do arquivo vira "conteúdo de string" — comentário não é
 * removido (falso positivo) e código de verdade deixa de ser lido (falso
 * negativo, que é o que deixaria um claim passar).
 *
 * As linhas são preservadas (cada comentário vira espaço) porque os achados
 * citam `arquivo:linha`, e um número errado manda a pessoa para o lugar errado.
 */
export function tsCode(source, fileName = "scan.tsx") {
  const text = String(source ?? "");
  const file = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    /\.tsx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const out = text.split("");
  const blank = (from, to) => {
    for (let i = from; i < to && i < out.length; i += 1) {
      if (out[i] !== "\n") out[i] = " ";
    }
  };

  // Todo comentário é trivia à frente de ALGUM token — inclusive do EOF, o
  // que cobre comentário no fim do arquivo. Percorrer a árvore é o que faz
  // template literal, JSX e regex serem interpretados corretamente: foi
  // exatamente aí que a versão anterior deste gate se perdeu.
  const visit = (node) => {
    for (const range of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []) {
      blank(range.pos, range.end);
    }
    for (const child of node.getChildren(file)) visit(child);
  };
  visit(file);

  return out.join("");
}

/** Aplica `tsCode` em um mapa de fontes, mantendo os caminhos. */
export function stripComments(sources) {
  return Object.fromEntries(
    Object.entries(sources ?? {}).map(([file, source]) => [
      file,
      /\.(ts|tsx|js|mjs)$/.test(file) ? tsCode(source, file) : String(source ?? ""),
    ])
  );
}

// ————————————————————————————————————————————————————————————————
// P1 / P22 — FEATURE TRUTH REGISTRY
// ————————————————————————————————————————————————————————————————

export const FEATURE_STATUSES = ["available", "beta", "coming_soon", "internal", "disabled"];

/** Estados em que a capacidade realmente existe para o aluno hoje. */
export const LIVE_STATUSES = ["available", "beta"];

/** Capacidades que a RC1.5 exige ver declaradas — as que geraram o bug. */
export const REQUIRED_CAPABILITIES = [
  "journey_learning",
  "review_remediation",
  "tone_contrast_training",
  "tts_playback",
  "speech_recognition",
  "ai_roleplay",
  "pronunciation_feedback",
  "tone_scoring",
];

/**
 * Capacidades que NÃO PODEM estar no ar nesta remessa.
 *
 * Não é pessimismo: é o "NÃO FAZER" da remessa virando verificação. Nada aqui
 * pode subir para available/beta sem código real de conversação, de análise
 * acústica e de pontuação tonal — que esta PR explicitamente não escreve.
 */
export const MUST_STAY_UNBUILT = ["ai_roleplay", "pronunciation_feedback", "tone_scoring"];

export function validateFeatureTruth(data = {}) {
  const { fail, failures } = failList();
  const {
    registry = {},
    paywallCapability = {},
    paywallKinds = [],
    productTruth = {},
    surfaceSources = {},
  } = data;

  const entries = Object.entries(registry);
  if (entries.length === 0) {
    fail("EMPTY_REGISTRY", "featureTruth", "registro de capacidades vazio — a UI não teria a quem perguntar");
    return { failures };
  }

  for (const [id, entry] of entries) {
    if (entry.id !== id) {
      fail("ID_MISMATCH", id, `a chave do registro (${id}) não bate com entry.id (${entry.id})`);
    }
    if (!FEATURE_STATUSES.includes(entry.status)) {
      fail("UNKNOWN_STATUS", id, `estado inventado: ${entry.status}`);
    }
    if (!entry.because || String(entry.because).trim().length < 20) {
      fail(
        "NO_REASON",
        id,
        "toda capacidade declara POR QUE está nesse estado — sem isso ninguém audita a decisão depois"
      );
    }
    // P11.1 — uma capacidade não inventa estado comercial por conta própria.
    if (entry.offer && !productTruth[entry.offer]) {
      fail("UNKNOWN_OFFER", id, `aponta para oferta inexistente no PRODUCT_TRUTH: ${entry.offer}`);
    }
    // Só quem existe pode cobrar por si.
    if (entry.gatedBy && !LIVE_STATUSES.includes(entry.status)) {
      fail(
        "PAYWALL_ON_UNBUILT",
        id,
        `capacidade ${entry.status} declara paywall ${entry.gatedBy} — recurso que não existe não cobra`
      );
    }
  }

  for (const id of REQUIRED_CAPABILITIES) {
    if (!registry[id]) fail("MISSING_CAPABILITY", id, "capacidade obrigatória ausente do registro");
  }

  for (const id of MUST_STAY_UNBUILT) {
    const entry = registry[id];
    if (!entry) continue;
    if (LIVE_STATUSES.includes(entry.status)) {
      fail(
        "CLAIMS_BEYOND_IMPLEMENTATION",
        id,
        `declarada "${entry.status}" sem motor real — esta remessa não implementa IA, análise acústica nem pontuação tonal`
      );
    }
  }

  // P3 — todo paywall aponta para capacidade que existe.
  for (const kind of paywallKinds) {
    const capabilityId = paywallCapability[kind];
    if (!capabilityId) {
      fail("PAYWALL_WITHOUT_CAPABILITY", kind, "paywall sem capacidade correspondente no registro");
      continue;
    }
    const entry = registry[capabilityId];
    if (!entry) {
      fail("PAYWALL_UNKNOWN_CAPABILITY", kind, `aponta para capacidade inexistente: ${capabilityId}`);
      continue;
    }
    if (!LIVE_STATUSES.includes(entry.status)) {
      fail(
        "PAYWALL_FOR_GHOST",
        kind,
        `cobra por ${capabilityId} que está ${entry.status} — foi exatamente isso que o paywall "speech" fazia`
      );
    }
  }
  for (const kind of Object.keys(paywallCapability)) {
    if (!paywallKinds.includes(kind)) {
      fail("STALE_PAYWALL_MAPPING", kind, "mapeamento para um paywall que não existe mais");
    }
  }

  // P10.1 — disponibilidade não se deriva de assinatura.
  for (const [file, source] of Object.entries(surfaceSources)) {
    if (/\bisPro\b[^\n]*\b(available|coming_soon|featureStatus)\b/.test(source)) {
      fail("PRO_IMPLIES_FEATURE", file, "deriva disponibilidade de capacidade a partir do estado Pro — são eixos diferentes");
    }
  }

  return { failures };
}

// ————————————————————————————————————————————————————————————————
// P12 — PRODUCT CLAIM SWEEP
// ————————————————————————————————————————————————————————————————

/**
 * Classes de afirmação que a RC1.5 caça nas superfícies públicas.
 *
 * O padrão é deliberadamente amplo. Um falso positivo custa uma linha de copy
 * reescrita; um falso negativo devolve ao produto a promessa que ele não
 * cumpre — e é o falso negativo que leva alguém a pagar por nada.
 */
export const CLAIM_CLASSES = [
  {
    id: "AI_CLAIM",
    capability: "ai_roleplay",
    pattern: /\b(com IA|com A\.?I\.?|conversa[çc][ãa]o com IA|AI conversation|AI tutor|AI chat|roleplays?)\b/i,
  },
  {
    id: "PRONUNCIATION_CLAIM",
    capability: "pronunciation_feedback",
    // Inclui a forma que mais engana: a NOTA. "87% correta" afirma medição
    // acústica que nenhum código do Longyu faz — comparar texto reconhecido
    // com o alvo não mede pronúncia, e a RC1.3 já tinha decidido isso.
    pattern:
      /corre[çc][ãa]o de pron[úu]ncia|corrigimos sua pron[úu]ncia|feedback de pron[úu]ncia|pronunciation (feedback|correction|scoring|score)|corre[çc][ãa]o de [áa]udio|audio correction|feedback fon[ée]tico|sua pron[úu]ncia|pron[úu]ncia (correta|perfeita|precisa)|\d+\s?%\s?(correto|correta|de acerto|correct|accurate)/i,
  },
  {
    id: "TONE_SCORE_CLAIM",
    capability: "tone_scoring",
    pattern:
      /tone (analy[sz]er|analysis|scoring|score)|an[áa]lise (dos )?seus tons|nota de tom|seu tom est[áa] (errado|certo)|diagn[óo]stico tonal|weak-tone map|mapa de tons fracos/i,
  },
  {
    id: "REALTIME_CLAIM",
    capability: "ai_roleplay",
    // Nas duas ordens: "feedback de voz em tempo real" e "correção da sua
    // fala em tempo real" prometem a mesma coisa inexistente.
    pattern:
      /\b(em tempo real|real-?time)\b.{0,40}\b(fala|voz|speech|voice|pron[úu]ncia|pronunciation)\b|\b(fala|voz|speech|voice|pron[úu]ncia|pronunciation)\b.{0,40}\b(em tempo real|real-?time)\b/i,
  },
  {
    /**
     * "Disponível agora" dito sobre o que não existe.
     *
     * Sozinha, a palavra "disponível" aparece em toda parte legítima — daí o
     * `near`: só reprova quando a frase de disponibilidade está na MESMA linha
     * que um termo da capacidade fantasma.
     */
    id: "AVAILABLE_CLAIM",
    capability: "ai_roleplay",
    pattern:
      /\b(dispon[íi]vel agora|j[áa] dispon[íi]vel|available now|now available|dispon[íi]vel no app|use agora|comece agora)\b/i,
    near: /\bIA\b|\bAI\b|roleplays?|pron[úu]ncia|pronunciation|conversa[çc][ãa]o/i,
  },
  {
    /**
     * Recurso inexistente vendido como entitlement do Pro.
     *
     * Era literalmente o "Fala com IA · Pro" da /fala: o selo Pro ao lado de
     * algo que o Pro não entrega transforma a assinatura em promessa.
     */
    id: "PRO_CLAIM",
    capability: "ai_roleplay",
    pattern: /\bPro\b/,
    near: /\bcom IA\b|\bAI\b|roleplays?|corre[çc][ãa]o de pron[úu]ncia|pronunciation (feedback|correction)/i,
  },
];

/** Copy de roadmap: declara explicitamente que ainda não dá para usar. */
const ROADMAP_MARKERS =
  /em desenvolvimento|em breve|coming soon|ainda n[ãa]o (existe|est[áa]|temos|tem)|n[ãa]o existe no app|in development|not (yet )?available|depende de um analisador|nada no app mede/i;

/**
 * Uma afirmação é honesta quando a capacidade existe, OU quando o texto ao
 * redor declara que ela ainda não existe. O que não passa é o meio-termo: a
 * frase que soa disponível para um recurso que não está no ar.
 */
export function validateProductClaims(data = {}) {
  const { fail, failures } = failList();
  const { registry = {}, roadmapAllowlist = [] } = data;
  // Só o que o produto realmente diz ao usuário. Comentário é documentação
  // interna: contar a história do bug não pode reintroduzir o bug.
  const surfaceSources = stripComments(data.surfaceSources);

  for (const [file, source] of Object.entries(surfaceSources)) {
    const lines = String(source ?? "").split("\n");
    for (const claim of CLAIM_CLASSES) {
      const entry = registry[claim.capability];
      const live = entry ? LIVE_STATUSES.includes(entry.status) : false;
      if (live) continue;

      lines.forEach((line, index) => {
        if (!claim.pattern.test(line)) return;
        // Classes de gatilho genérico ("Pro", "disponível agora") só valem
        // quando a MESMA linha nomeia a capacidade fantasma — senão o gate
        // reprovaria toda menção legítima ao plano Pro.
        if (claim.near && !claim.near.test(line)) return;
        // Contexto: a própria linha e as duas vizinhas podem marcar roadmap.
        const context = lines.slice(Math.max(0, index - 2), index + 3).join("\n");
        if (ROADMAP_MARKERS.test(context)) return;
        if (roadmapAllowlist.some((allowed) => line.includes(allowed))) return;
        fail(
          claim.id,
          `${file}:${index + 1}`,
          `afirma "${line.trim().slice(0, 100)}" mas ${claim.capability} está ${entry?.status ?? "ausente do registro"}`
        );
      });
    }
  }

  return { failures };
}

// ————————————————————————————————————————————————————————————————
// P13 — GHOST FEATURE GATE
// ————————————————————————————————————————————————————————————————

/** CTA que promete uso imediato. */
const ACQUISITION_CTA =
  /Praticar com IA|Usar( a)? IA agora|Usar agora|Come[çc]ar agora|Assinar para (usar|falar)|Desbloquear (IA|conversa)/i;

/** Handler que responde "em breve" — o botão que existe para frustrar. */
const COMING_SOON_HANDLER = /(setSpeechNotice|alert|setNotice|setMessage)\s*\(\s*["'`][^"'`]*(Em breve|em breve|Coming soon)/;

export function validateGhostFeatures(data = {}) {
  const { fail, failures } = failList();
  const { registry = {}, paywallCapability = {} } = data;
  const surfaceSources = stripComments(data.surfaceSources);

  const ghostIds = Object.values(registry)
    .filter((entry) => entry.status === "coming_soon" || entry.status === "disabled")
    .map((entry) => entry.id);

  for (const [file, source] of Object.entries(surfaceSources)) {
    const text = String(source ?? "");

    // 1. CTA de aquisição para recurso que não existe.
    if (ACQUISITION_CTA.test(text)) {
      fail(
        "GHOST_CTA",
        file,
        "CTA promete uso imediato de um recurso que o registro não declara no ar"
      );
    }

    // 2. Botão cujo handler responde "em breve": o usuário clica e leva não.
    if (COMING_SOON_HANDLER.test(text)) {
      fail(
        "COMING_SOON_HANDLER",
        file,
        'handler responde "em breve" atrás de um botão — se não dá para usar, não se oferece o botão'
      );
    }

    // 3. Paywall aberto na mesma tela que anuncia o recurso fantasma.
    const paywallKinds = [...text.matchAll(/setPaywallKind\(\s*["']([a-z_]+)["']/g)].map((m) => m[1]);
    for (const kind of paywallKinds) {
      const capabilityId = paywallCapability[kind];
      const entry = capabilityId ? registry[capabilityId] : null;
      if (!entry || !LIVE_STATUSES.includes(entry.status)) {
        fail(
          "GHOST_PAYWALL",
          file,
          `abre paywall "${kind}" para capacidade ${capabilityId ?? "desconhecida"} que não está no ar`
        );
      }
    }

    // 4. A tela decidiu sozinha: nomeou o fantasma sem consultar o registro.
    for (const ghostId of ghostIds) {
      if (!text.includes(ghostId)) continue;
      const asksRegistry =
        /featureStatus|isRoadmapOnly|isFeatureLive|FeatureRoadmapNote|featureCapability|canOpenPaywall/.test(text);
      if (!asksRegistry) {
        fail(
          "HARDCODED_AVAILABILITY",
          file,
          `cita ${ghostId} sem consultar o registro — a tela não decide sozinha o que existe`
        );
      }
    }
  }

  return { failures };
}

// ————————————————————————————————————————————————————————————————
// P14 / P7 — LEARNING EVENT SEMANTICS
// ————————————————————————————————————————————————————————————————

/** O que nunca pode disparar um evento de fala (P5.1). */
export const NON_SPEECH_TRIGGERS = [
  { id: "SELF_RATING", pattern: /Já sabia|Ainda não|knew|self-?rating/i },
  { id: "TTS_PLAYBACK", pattern: /SpeakButton|speakText|playTts|autoPlay/i },
  { id: "TYPED_ANSWER", pattern: /shortAnswer|typedText|fill_hanzi|fill_pinyin/i },
  { id: "OPTION_CHOICE", pattern: /selectedAnswer|choice/i },
];

export function validateLearningEventSemantics(data = {}) {
  const { fail, failures } = failList();
  const { events = {}, dailyTaskKeys = [], speechEventIds = [] } = data;
  const sourceFiles = stripComments(data.sourceFiles);

  // 1. Todo evento diário tem significado declarado.
  for (const key of dailyTaskKeys) {
    if (!events[key]) {
      fail("UNDECLARED_EVENT", key, "chave diária sem entrada no inventário de eventos");
      continue;
    }
    if (!events[key].meaning || !events[key].trigger) {
      fail("EVENT_WITHOUT_MEANING", key, "evento sem significado ou sem gatilho declarado");
    }
  }

  // 2. Evento de fala nunca é alcançável por recordDailyTask.
  for (const id of speechEventIds) {
    if (dailyTaskKeys.includes(id)) {
      fail(
        "SPEECH_EVENT_IS_DAILY_TASK",
        id,
        "evento de fala exposto como tarefa diária — qualquer tela poderia declarar fala cumprida"
      );
    }
  }

  // 3. Nenhuma fonte emite evento de fala por caminho de clique.
  for (const [file, source] of Object.entries(sourceFiles)) {
    const text = String(source ?? "");
    for (const id of speechEventIds) {
      const direct = new RegExp(`recordDailyTask\\(\\s*["']${id}["']`);
      if (direct.test(text)) {
        fail("SPEECH_VIA_DAILY_TASK", file, `emite ${id} por recordDailyTask — fala não é tarefa declarável`);
      }
    }
    // 4. recordSpeechAttempt só em superfície que realmente escuta.
    // A evidência tem de ser de MICROFONE. Procurar "SpeechAttempt" aqui seria
    // circular: `recordSpeechAttempt` contém o próprio termo, e toda chamada
    // se autoautorizaria.
    const opensMicrophone = /recognizeOnce|ensureMicPermission|isRecognitionAvailable|getUserMedia/.test(text);
    if (/recordSpeechAttempt\s*\(/.test(text) && !opensMicrophone) {
      fail(
        "SPEECH_ATTEMPT_WITHOUT_MIC",
        file,
        "registra tentativa de fala sem abrir microfone nem reconhecer voz"
      );
    }
  }

  return { failures };
}

// ————————————————————————————————————————————————————————————————
// P5 / P15 — SPEECH ATTEMPT INTEGRITY
// ————————————————————————————————————————————————————————————————

/**
 * Simulador do contrato de tentativa de fala.
 *
 * Reproduz a regra do store sem depender dele: captura obrigatória, chave
 * idempotente, e nenhuma via de clique. A mutação ataca este contrato.
 */
export function simulateSpeechAttempts(attempts, initial = {}) {
  const seen = new Set(initial.speechAttemptKeys ?? []);
  let phrasesSpoken = initial.phrasesSpoken ?? 0;
  let counted = 0;
  for (const attempt of attempts) {
    const key = typeof attempt?.id === "string" ? attempt.id.trim() : "";
    if (!key) continue;
    if (!attempt.captured) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    phrasesSpoken += 1;
    counted += 1;
  }
  return { phrasesSpoken, counted, speechAttemptKeys: [...seen] };
}

export function validateSpeechAttemptIntegrity(data = {}) {
  const { fail, failures } = failList();
  const { storeSource = "", speechSurfaceSource = "", falaSource = "" } = data;

  // 1. O store exige captura real.
  if (!/captured/.test(storeSource) || !/if \(!key \|\| !attempt\.captured\) return false;/.test(storeSource)) {
    fail("NO_CAPTURE_REQUIREMENT", "store", "recordSpeechAttempt não exige captura real de voz");
  }
  // 2. O store é idempotente por tentativa.
  if (!/speechAttemptKeys/.test(storeSource) || !/seen\.includes\(key\)/.test(storeSource)) {
    fail("NOT_IDEMPOTENT", "store", "a mesma tentativa poderia contar duas vezes");
  }
  // 3. `phrasesSpoken` saiu de DailyTaskKey — o tipo é a trava.
  const taskKeyBlock = /export type DailyTaskKey =([\s\S]*?);/.exec(storeSource)?.[1] ?? "";
  if (/phrasesSpoken/.test(taskKeyBlock)) {
    fail(
      "SPEECH_STILL_A_DAILY_TASK",
      "store",
      "phrasesSpoken continua em DailyTaskKey — recordDailyTask voltaria a compilar"
    );
  }
  if (!/phrasesReviewed/.test(taskKeyBlock)) {
    fail("NO_REVIEW_METRIC", "store", "phrasesReviewed ausente de DailyTaskKey");
  }
  // 4. Compatibilidade: snapshot antigo não vira fala nem revisão inventada.
  if (!/phrasesReviewed: Math\.max\(0, tasks\.phrasesReviewed \?\? 0\)/.test(storeSource)) {
    fail(
      "UNSAFE_MIGRATION",
      "store",
      "snapshot antigo precisa começar com phrasesReviewed = 0, sem herdar phrasesSpoken"
    );
  }
  if (/phrasesReviewed:\s*[^,\n]*phrasesSpoken/.test(storeSource)) {
    fail("HISTORY_REWRITE", "store", "converte phrasesSpoken antigo em phrasesReviewed — reescreve histórico");
  }

  // 5. A superfície de fala registra de verdade; a /fala não registra fala.
  if (speechSurfaceSource && !/recordSpeechAttempt/.test(speechSurfaceSource)) {
    fail("SPEECH_SURFACE_SILENT", "speechSurface", "a única tela que escuta não registra tentativa de fala");
  }
  if (/recordSpeechAttempt/.test(falaSource)) {
    fail("FALA_FAKES_SPEECH", "FalaPage", "a /fala registra fala sem microfone");
  }
  if (!/recordDailyTask\(["']phrasesReviewed["']\)/.test(falaSource)) {
    fail("FALA_WITHOUT_REVIEW_METRIC", "FalaPage", "a autoavaliação da /fala não registra revisão");
  }

  return { failures };
}

// ————————————————————————————————————————————————————————————————
// P8 / P16 — MISSION SPEECH INTEGRITY
// ————————————————————————————————————————————————————————————————

export function validateMissionSpeechIntegrity(data = {}) {
  const { fail, failures } = failList();
  const {
    missions = [],
    speechMetrics = [],
    speakingPattern,
    aggregates = {},
    platformCapableMetrics = {},
  } = data;

  const claimsSpeaking = (mission) =>
    speakingPattern ? speakingPattern.test(`${mission.title} ${mission.desc}`) : false;

  for (const mission of missions) {
    const usesSpeech = speechMetrics.includes(mission.metric);

    // P8.1 — copy de fala precisa de métrica de fala.
    if (claimsSpeaking(mission) && !usesSpeech) {
      fail(
        "SPEAKING_MISSION_WITHOUT_SPEECH_METRIC",
        mission.id,
        `promete fala ("${mission.title}") mas avança por ${mission.metric} — cliques em "Já sabia" concluiriam a missão`
      );
    }
    // Espelho: métrica de fala com copy que não fala é confusão de contrato.
    if (usesSpeech && !claimsSpeaking(mission)) {
      fail(
        "SPEECH_METRIC_WITHOUT_SPEAKING_COPY",
        mission.id,
        `usa ${mission.metric} sem prometer fala — o aluno não saberia o que fazer`
      );
    }
    // P8.2 — missão de fala sem capacidade declarada é missão impossível.
    if (usesSpeech && mission.requiresPlatform !== "speech_recognition") {
      fail(
        "IMPOSSIBLE_MISSION",
        mission.id,
        "missão de fala sem requiresPlatform — apareceria em navegador sem microfone"
      );
    }
  }

  // A métrica de fala existe nos agregados e vem do contador certo.
  for (const metric of speechMetrics) {
    if (!(metric in aggregates)) {
      fail("MISSING_AGGREGATE", metric, "métrica de fala ausente dos agregados de missão");
      continue;
    }
    if (platformCapableMetrics[metric] && aggregates[metric] !== platformCapableMetrics[metric]) {
      fail(
        "AGGREGATE_WRONG_SOURCE",
        metric,
        `agregado lê ${aggregates[metric]} em vez de ${platformCapableMetrics[metric]}`
      );
    }
  }

  return { failures };
}

// ————————————————————————————————————————————————————————————————
// P17 — PARIDADE PT-BR / EN
// ————————————————————————————————————————————————————————————————

/**
 * A verdade da capacidade é comum; a copy é localizada.
 *
 * O caso que isto pega: PT-BR honesto e EN dizendo "AI pronunciation feedback
 * available now" — o mesmo produto mentindo em um idioma só.
 */
export function validateClaimLocaleParity(data = {}) {
  const { fail, failures } = failList();
  const { registry = {} } = data;
  const locales = stripComments(data.locales);

  for (const claim of CLAIM_CLASSES) {
    const entry = registry[claim.capability];
    if (entry && LIVE_STATUSES.includes(entry.status)) continue;

    for (const [locale, source] of Object.entries(locales)) {
      // Linha a linha, e com a mesma regra de `near` da varredura de
      // superfície: um arquivo de locale tem milhares de linhas, e casar o
      // arquivo inteiro faria "Pro" numa linha e "IA" em outra virarem um
      // claim que ninguém escreveu.
      const lines = String(source ?? "").split("\n");
      const hit = lines.findIndex(
        (line) => claim.pattern.test(line) && (!claim.near || claim.near.test(line))
      );
      if (hit < 0) continue;
      fail(
        `LOCALE_${claim.id}`,
        `${locale}:${hit + 1}`,
        `afirma "${lines[hit].trim().slice(0, 100)}" mas ${claim.capability} está ${
          entry?.status ?? "ausente"
        } — verdade de capacidade é comum aos idiomas`
      );
    }
  }

  return { failures };
}

// ————————————————————————————————————————————————————————————————
// P20 / P21 — FREEZE
// ————————————————————————————————————————————————————————————————

export const RC15_FREEZE = {
  fingerprint: "a2ed1a0c1c6d",
  lessons: 134,
  teachingTopics: 113,
};

export function validateRc15Freeze(data = {}) {
  const { fail, failures } = failList();
  const { fingerprint, counts = {}, forbiddenPaths = [] } = data;

  if (fingerprint !== RC15_FREEZE.fingerprint) {
    fail("FINGERPRINT", "journey", `esperado ${RC15_FREEZE.fingerprint}, obtido ${fingerprint}`);
  }
  if (counts.lessons !== RC15_FREEZE.lessons) {
    fail("LESSONS", "journey", `esperado ${RC15_FREEZE.lessons}, obtido ${counts.lessons}`);
  }
  if (counts.teachingTopics !== RC15_FREEZE.teachingTopics) {
    fail("TOPICS", "journey", `esperado ${RC15_FREEZE.teachingTopics}, obtido ${counts.teachingTopics}`);
  }
  for (const rel of forbiddenPaths) {
    fail("SCOPE", rel, "a RC1.5 não abre Groups/Programs/Reports nem implementa IA — escopo é verdade, não feature");
  }

  return { failures };
}
