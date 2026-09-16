/**
 * Gates da V4.10A.1 — fechamento comercial sobre o schema que já existe.
 *
 * A auditoria do P0 mostrou que o Business não precisava de tabela nenhuma: a
 * V4.4 já tinha organizations, organization_members, organization_invites e
 * organization_subscriptions de pé. O que faltava era integridade de licença e
 * uma porta de leitura para o painel. Estes gates guardam exatamente isso, e
 * guardam também as decisões que a auditoria tomou contra a spec — porque uma
 * decisão bem tomada que ninguém protege volta na versão seguinte.
 *
 * Como nos gates da V4.10A, as funções recebem o fonte por parâmetro: é assim
 * que as mutações conseguem atacar o contrato em vez de atacar o disco.
 */

/** Papéis reais do banco (REGRA 4). `member` nunca existiu aqui. */
export const BUSINESS_ROLES = ["owner", "admin", "manager", "learner"];

/** Papéis que enxergam o painel. Um learner é colaborador, não gestor. */
export const BUSINESS_ADMIN_ROLES = ["owner", "admin", "manager"];

/** Estados reais (REGRA 5). Não existe `canceled`: uma empresa que sai é `churned`. */
export const ORGANIZATION_STATUSES = ["pending", "active", "suspended", "churned"];
export const MEMBERSHIP_STATUSES = ["invited", "active", "suspended", "removed"];
export const INVITE_STATUSES = ["pending", "accepted", "revoked", "expired"];

/**
 * A assinatura tem vocabulário próprio, e é o do Stripe.
 *
 * Aqui `canceled` existe e é correto: quem cancela um pagamento cancela. A
 * REGRA 5 proíbe `canceled` como estado de ORGANIZAÇÃO — uma empresa que sai
 * fica `churned` — e misturar as duas coisas fazia o gate recusar
 * `s.status = 'canceled'` numa consulta legítima de licença.
 */
export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "canceled",
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
];
export const GRANT_STATUSES = ["active", "expired", "revoked"];

/** Qual vocabulário vale, por tabela. */
const STATUS_VOCABULARY = {
  organizations: ORGANIZATION_STATUSES,
  organization_members: MEMBERSHIP_STATUSES,
  organization_invites: INVITE_STATUSES,
  organization_subscriptions: SUBSCRIPTION_STATUSES,
  organization_entitlement_grants: GRANT_STATUSES,
};

/** Tabelas paralelas que a REGRA 1 proíbe de nascer. */
export const FORBIDDEN_BUSINESS_TABLES = [
  "business_organizations",
  "business_members",
  "business_invites",
  "organizations_v2",
  "organization_memberships",
];

/**
 * Campos que nenhuma RPC de painel pode ler. A lista é de dado pedagógico
 * privado: resposta livre, fala transcrita, erro individual, telemetria.
 */
export const PRIVATE_LEARNER_FIELDS = [
  "client_snapshot",
  "free_answer",
  "answer_text",
  "typed_text",
  "transcript",
  "speech_result",
  "srs_state",
  "health_answer",
  "conversation_text",
  "error_detail",
  "beta_feedback",
];

/**
 * Tira comentário de SQL sem estragar literal que contenha dois hífens.
 *
 * Sem isto, a prosa do arquivo entra no gate: o comentário que explica por que
 * `seat_limit` não volta para organizations contém a palavra `seat_limit`, e um
 * gate ingênuo acusaria o próprio texto que documenta a decisão.
 */
export function sqlCode(source) {
  const withoutBlocks = String(source ?? "").replace(/\/\*[\s\S]*?\*\//g, " ");
  return withoutBlocks
    .split("\n")
    .map((line) => {
      let quoted = false;
      for (let i = 0; i < line.length; i += 1) {
        if (line[i] === "'") quoted = !quoted;
        else if (!quoted && line[i] === "-" && line[i + 1] === "-") return line.slice(0, i);
      }
      return line;
    })
    .join("\n");
}

function fail(failures, code, message) {
  failures.push({ code, message });
}

/** Corpo de uma função SQL, do cabeçalho até o `$$` de fechamento. */
export function functionBody(sql, name) {
  const header = new RegExp(`create or replace function public\\.${name}\\s*\\(`, "i");
  const start = sql.search(header);
  if (start < 0) return null;
  const open = sql.indexOf("$$", start);
  if (open < 0) return null;
  const close = sql.indexOf("$$", open + 2);
  if (close < 0) return null;
  return { signature: sql.slice(start, open), body: sql.slice(open + 2, close) };
}

function literalsNear(sql, ...columnPatterns) {
  return [...new Set(comparisonsOn(sql, ...columnPatterns).map((row) => row.value))];
}

/**
 * Comparações contra uma coluna, com a tabela a que pertencem.
 *
 * A tabela sai do `public.<tabela>` mais próximo antes da comparação. É
 * heurística, e é a heurística certa aqui: sem ela o gate não distingue
 * `s.status = 'canceled'` (assinatura Stripe, legítimo) de
 * `o.status = 'canceled'` (organização, proibido pela REGRA 5) — e passou a
 * recusar a consulta de licença que ele mesmo exige.
 */
function comparisonsOn(sql, ...columnPatterns) {
  const rows = [];
  for (const columnPattern of columnPatterns) {
    const re = new RegExp(
      `\\b${columnPattern}\\b\\s*(?:=|<>|!=|is distinct from|not in|in)\\s*(\\([^)]*\\)|'[^']*')`,
      "gi"
    );
    for (const match of sql.matchAll(re)) {
      const before = sql.slice(Math.max(0, match.index - 400), match.index);
      const tables = [...before.matchAll(/public\.(\w+)/g)];
      const table = tables.length > 0 ? tables[tables.length - 1][1].toLowerCase() : null;
      for (const literal of match[1].matchAll(/'([^']*)'/g)) {
        rows.push({ value: literal[1], table });
      }
    }
  }
  return rows;
}

/**
 * REGRA 1 a 5 — o Business reusa o que existe.
 *
 * Este é o gate que a auditoria do P0 pediu. Ele não confere estilo: confere
 * que ninguém recriou estrutura paralela, que `seat_limit` não voltou para
 * organizations (a V4.4.1 o removeu justamente para não ter duas fontes de
 * licença), que `billing_email` não foi duplicado e que papel e estado
 * continuam com os nomes do banco, não com os nomes da spec.
 */
export function validateBusinessSchemaReuse(input) {
  const failures = [];
  const sql = sqlCode(input.migrationSource);
  const known = new Set(
    [...sqlCode(input.foundationSource ?? "").matchAll(/create table if not exists public\.(\w+)/gi)].map(
      (match) => match[1].toLowerCase()
    )
  );

  // REGRA 1 — nenhuma tabela nova, e muito menos uma cópia paralela.
  for (const match of sql.matchAll(/create table(?: if not exists)? public\.(\w+)/gi)) {
    const table = match[1].toLowerCase();
    if (FORBIDDEN_BUSINESS_TABLES.includes(table)) {
      fail(failures, "PARALLEL_TABLE", `${table} duplica estrutura Business que já existe`);
    } else if (!known.has(table)) {
      fail(failures, "NEW_TABLE", `tabela nova ${table}: a V4.10A.1 reusa o schema da V4.4`);
    }
  }

  // REGRA 2 — a licença mora na assinatura, em um lugar só.
  if (/alter table public\.organizations[\s\S]{0,200}?add column[^;]*\bseat_limit\b/i.test(sql)) {
    fail(failures, "SEAT_LIMIT_ON_ORGANIZATION", "seat_limit de volta em organizations: duas fontes de licença");
  }
  if (!/organization_seat_entitlement\s*\(/.test(sql)) {
    fail(failures, "LICENSE_NOT_FROM_ENTITLEMENT", "licença não é lida por organization_seat_entitlement()");
  }

  // REGRA 3 — billing_email já existe nas duas tabelas.
  if (/add column(?: if not exists)?\s+billing_email/i.test(sql)) {
    fail(failures, "BILLING_EMAIL_DUPLICATED", "billing_email recriado: a coluna já existe desde a V4.4");
  }

  // REGRA 4 — papéis do banco.
  // `role` pega a coluna; `v_role` pega a checagem de papel dentro das RPCs.
  const roles = literalsNear(sql, "role", "v_role");
  for (const role of roles) {
    if (!BUSINESS_ROLES.includes(role)) {
      fail(failures, "UNKNOWN_ROLE", `papel '${role}' não existe no banco (use ${BUSINESS_ROLES.join("/")})`);
    }
  }

  // REGRA 5 — estados do banco, cada tabela com o seu vocabulário.
  const anyKnownStatus = new Set(Object.values(STATUS_VOCABULARY).flat());
  for (const column of ["seat_status", "status"]) {
    for (const { value, table } of comparisonsOn(sql, column)) {
      const allowed = new Set(
        column === "seat_status"
          ? MEMBERSHIP_STATUSES
          : (STATUS_VOCABULARY[table] ?? [...anyKnownStatus])
      );
      if (!allowed.has(value)) {
        fail(
          failures,
          "UNKNOWN_STATUS",
          `estado '${value}' em ${table ? `${table}.` : ""}${column} não existe no banco`
        );
      }
      // `canceled` só vale para assinatura. Em organização, quem sai é 'churned'.
      if (/^cancell?ed$/i.test(value) && table !== "organization_subscriptions") {
        fail(
          failures,
          "CANCELED_INVENTED",
          `'${value}' em ${table ?? "status"} não existe: uma organização que sai fica 'churned'`
        );
      }
    }
  }

  return { failures };
}

/**
 * REGRA 6 — convite pendente reserva assento.
 *
 * O defeito concreto: `organization_active_seat_count()` conta só `active`,
 * então dez convites cabiam numa empresa com cinco vagas e o limite estourava
 * no aceite. A correção não é mudar aquela função — ela conta ativos e deve
 * continuar contando — é passar a guarda de licença a olhar o reservado.
 */
export function validateBusinessSeatReservation(input) {
  const failures = [];
  const sql = sqlCode(input.migrationSource);

  const reserved = functionBody(sql, "organization_reserved_seat_count");
  if (!reserved) {
    fail(failures, "NO_RESERVED_COUNT", "organization_reserved_seat_count ausente");
  } else {
    if (!/seat_status\s+in\s*\([^)]*'active'[^)]*'invited'[^)]*\)/i.test(reserved.body)) {
      fail(failures, "INVITED_MEMBER_FREE_SEAT", "membro 'invited' não ocupa lugar na contagem");
    }
    if (!/organization_invites[\s\S]*?status\s*=\s*'pending'/i.test(reserved.body)) {
      fail(failures, "PENDING_INVITE_FREE_SEAT", "convite pendente não ocupa lugar");
    }
    if (!/expires_at\s*>\s*now\(\)/i.test(reserved.body)) {
      fail(failures, "EXPIRED_INVITE_RESERVES", "convite vencido continua segurando assento");
    }
  }

  // P4.1 — a função antiga não muda de significado.
  if (/create or replace function public\.organization_active_seat_count/i.test(sql)) {
    fail(failures, "ACTIVE_COUNT_REDEFINED", "organization_active_seat_count redefinida: ela conta ativos, e só");
  }

  const guard = functionBody(sql, "organization_seats_within_entitlement");
  if (!guard) {
    fail(failures, "NO_SEAT_GUARD", "organization_seats_within_entitlement ausente");
  } else {
    if (!/organization_reserved_seat_count/.test(guard.body)) {
      fail(failures, "GUARD_USES_ACTIVE_ONLY", "a guarda de licença ainda compara só os ativos");
    }
    if (!/organization_seat_entitlement/.test(guard.body)) {
      fail(failures, "GUARD_WITHOUT_LICENSE", "a guarda não lê a licença contratada");
    }
  }

  return { failures };
}

/**
 * P3 — a disputa do último assento.
 *
 * Duas requisições simultâneas passam pelas duas checagens feitas antes da
 * escrita. Só o servidor resolve: advisory lock por organização e uma função
 * VOLATILE, para que a segunda transação pegue snapshot novo depois do lock e
 * enxergue a linha que a primeira commitou. Marcada STABLE, ela herdaria o
 * snapshot da instrução externa, contaria a menos, e as duas passariam. Isso
 * foi medido em Postgres real, não deduzido do código.
 */
export function validateBusinessSeatConcurrency(input) {
  const failures = [];
  const sql = sqlCode(input.migrationSource);

  if (!/create constraint trigger organization_members_seat_limit/i.test(sql)) {
    fail(failures, "NO_MEMBER_SEAT_TRIGGER", "gravação de membro não passa pelo limite de licença");
  }
  if (!/create constraint trigger organization_invites_seat_limit/i.test(sql)) {
    fail(failures, "NO_INVITE_SEAT_TRIGGER", "convite não passa pelo limite de licença");
  }

  const enforcer = functionBody(sql, "enforce_organization_seat_limit");
  if (!enforcer) {
    fail(failures, "NO_SEAT_ENFORCER", "enforce_organization_seat_limit ausente");
    return { failures };
  }

  if (/\b(stable|immutable)\b/i.test(enforcer.signature)) {
    fail(failures, "SEAT_ENFORCER_NOT_VOLATILE", "trigger de assento STABLE/IMMUTABLE: a corrida volta");
  }
  if (!/pg_advisory_xact_lock/.test(enforcer.body)) {
    fail(failures, "NO_SEAT_LOCK", "escrita de assento não é serializada por organização");
  }

  // Organização ainda sem licença não é medida, senão o primeiro membro de
  // toda empresa nova é recusado: o provisionamento cria a organização, coloca
  // o dono e só depois anexa a assinatura. O ensaio efêmero do CI encontrou
  // isso com a mesma sequência que produção usa.
  if (!/organization_has_seat_license/.test(enforcer.body)) {
    fail(
      failures,
      "NO_UNLICENSED_BYPASS",
      "o trigger não distingue organização sem licença: o primeiro membro de toda empresa nova é recusado"
    );
  }
  if (!/BUSINESS_SEATS_FULL/.test(enforcer.body)) {
    fail(failures, "NO_SEAT_ERROR", "recusa sem código próprio: o cliente não sabe o que aconteceu");
  }
  if (!/errcode\s*=\s*'check_violation'/.test(enforcer.body)) {
    fail(failures, "NO_SEAT_ERROR_CODE", "recusa sem errcode: quem chama não consegue tratar");
  }

  // As duas tabelas nomeiam o estado diferente — seat_status e status — e o
  // PL/pgSQL avalia o acesso ao campo mesmo quando o ramo é falso. Numa
  // condição só, gravar um membro estoura com "record new has no field status".
  // Isso aconteceu de verdade e só apareceu ao executar.
  if (!/tg_table_name\s*=\s*'organization_members'/.test(enforcer.body)) {
    fail(failures, "NO_MEMBER_BRANCH", "o trigger não separa o ramo de organization_members");
  }
  if (!/tg_table_name\s*=\s*'organization_invites'/.test(enforcer.body)) {
    fail(failures, "NO_INVITE_BRANCH", "o trigger não separa o ramo de organization_invites");
  }
  for (const line of enforcer.body.split("\n")) {
    if (/new\.seat_status/.test(line) && /new\.status/.test(line)) {
      fail(
        failures,
        "FIELD_GUARD_COLLAPSED",
        "new.seat_status e new.status na mesma condição: PL/pgSQL avalia os dois e a gravação estoura"
      );
      break;
    }
  }

  return { failures };
}

/**
 * REGRA 7 e P5 — o painel lê por RPC, e a RPC valida por dentro.
 *
 * As funções internas de assento são `service_role` desde a V4.4.1. A saída
 * fácil seria conceder execute a `authenticated` e deixar o painel chamá-las
 * direto; isso entregaria contagem de assento de qualquer organização a
 * qualquer pessoa logada. As duas RPCs de leitura existem para não precisar
 * disso: shape mínimo, papel conferido dentro da função.
 */
export function validateBusinessOverviewRpc(input) {
  const failures = [];
  const sql = sqlCode(input.migrationSource);

  for (const name of ["get_business_overview", "get_business_members"]) {
    const fn = functionBody(sql, name);
    if (!fn) {
      fail(failures, "NO_PANEL_RPC", `${name} ausente`);
      continue;
    }
    if (!/security definer/i.test(fn.signature)) {
      fail(failures, "RPC_NOT_DEFINER", `${name} não é security definer`);
    }
    if (!/set search_path\s*=\s*''/.test(fn.signature)) {
      fail(failures, "RPC_SEARCH_PATH_OPEN", `${name} sem search_path vazio`);
    }
    if (!/auth\.uid\(\)\s+is null/.test(fn.body) || !/UNAUTHENTICATED/.test(fn.body)) {
      fail(failures, "NO_AUTH_CHECK", `${name} não recusa chamada anônima`);
    }
    const rolesChecked = literalsNear(fn.body, "v_role");
    const checksAdminRoles = BUSINESS_ADMIN_ROLES.every((role) => rolesChecked.includes(role));
    if (!checksAdminRoles || rolesChecked.includes("learner")) {
      fail(failures, "NO_ROLE_CHECK", `${name} não restringe a ${BUSINESS_ADMIN_ROLES.join("/")}`);
    }
    if (!/FORBIDDEN/.test(fn.body)) {
      fail(failures, "NO_FORBIDDEN", `${name} não recusa quem não é gestor daquela organização`);
    }
    // O organization_id vem do browser: sem casar com auth.uid(), qualquer
    // pessoa logada lê o painel de qualquer empresa.
    if (!/user_id\s*=\s*auth\.uid\(\)/.test(fn.body)) {
      fail(failures, "ORG_ID_TRUSTED", `${name} aceita organization_id do cliente sem casar com o usuário`);
    }
    if (!new RegExp(`grant execute on function public\\.${name}\\(`).test(sql)) {
      fail(failures, "RPC_NOT_GRANTED", `${name} sem grant: o painel não consegue chamar`);
    }
    if (new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to [^;]*\\banon\\b`).test(sql)) {
      fail(failures, "RPC_OPEN_TO_ANON", `${name} concedida a anon`);
    }
  }

  // Menor privilégio preservado: as funções internas continuam fora do browser.
  for (const internal of [
    "organization_reserved_seat_count",
    "organization_active_seat_count",
    "organization_seat_entitlement",
    "organization_seats_within_entitlement",
  ]) {
    const granted = new RegExp(
      `grant execute on function public\\.${internal}\\([^)]*\\) to [^;]*\\bauthenticated\\b`
    );
    if (granted.test(sql)) {
      fail(failures, "SEAT_FN_EXPOSED", `${internal} concedida a authenticated: assento de qualquer empresa`);
    }
  }

  // O teto de página precisa estar na conta que usa p_limit, e não em
  // qualquer least() perdido no corpo — o cálculo de progresso também usa um.
  const members = functionBody(sql, "get_business_members");
  if (members) {
    const limitAssignment = members.body.match(/:=\s*([^;]*\bp_limit\b[^;]*);/);
    if (!limitAssignment || !/least\s*\(/.test(limitAssignment[1])) {
      fail(failures, "UNBOUNDED_PAGE", "get_business_members sem teto de página: o cliente escolhe quantas linhas leva");
    }
  }

  return { failures };
}

/**
 * P5.3 e P17.2 — o dono vê a conta, não a pessoa.
 *
 * O painel pode mostrar quem entrou, quanto avançou e quando apareceu pela
 * última vez. Não pode mostrar resposta livre, texto digitado, fala
 * transcrita, erro individual nem snapshot bruto. Aqui a proteção não é filtro:
 * esses campos simplesmente não são lidos.
 */
export function validateBusinessProgressPrivacy(input) {
  const failures = [];
  const sql = sqlCode(input.migrationSource);

  for (const name of ["get_business_overview", "get_business_members"]) {
    const fn = functionBody(sql, name);
    if (!fn) continue;
    for (const field of PRIVATE_LEARNER_FIELDS) {
      if (new RegExp(`\\b${field}\\b`).test(fn.body)) {
        fail(failures, "RPC_LEAKS_PRIVATE_FIELD", `${name} lê ${field}`);
      }
    }
    if (/select\s+\*\s+from\s+public\.user_progress/i.test(fn.body)) {
      fail(failures, "RPC_SELECT_STAR", `${name} traz a linha inteira de progresso`);
    }
    if (/sqlerrm/i.test(fn.body)) {
      fail(failures, "RAW_ERROR_LEAKED", `${name} devolve erro cru do banco`);
    }
  }

  for (const [file, source] of Object.entries(input.clientSources ?? {})) {
    const clean = String(source ?? "");
    for (const table of ["user_progress", "user_srs", "beta_feedback", "economy_ledger"]) {
      if (new RegExp(`from\\(\\s*["'\`]${table}["'\`]`).test(clean)) {
        fail(failures, "CLIENT_READS_PRIVATE_TABLE", `${file}: painel lendo ${table} direto do browser`);
      }
    }
  }

  return { failures };
}

/**
 * P36 — o congelamento continua valendo.
 *
 * A V4.10A.1 é comercial. Nenhuma lição, nenhum chunk, nenhum caractere, nenhum
 * Culture Item, nenhuma Conversation Scene. Se o fingerprint andar, foi porque
 * alguém mexeu no currículo em nome de uma tela de preço.
 */
export function validateV410a1Freeze(input) {
  const failures = [];
  const EXPECTED = { fingerprint: "7c054f2255e7", lessons: 134, topics: 113 };

  if (input.fingerprint && input.fingerprint !== EXPECTED.fingerprint) {
    fail(failures, "FINGERPRINT", `fingerprint ${input.fingerprint} ≠ ${EXPECTED.fingerprint}`);
  }
  if (input.counts) {
    if (input.counts.lessons !== EXPECTED.lessons) {
      fail(failures, "LESSON_COUNT", `${input.counts.lessons} lições (esperado ${EXPECTED.lessons})`);
    }
    if (input.counts.teachingTopics !== EXPECTED.topics) {
      fail(failures, "TOPIC_COUNT", `${input.counts.teachingTopics} temas (esperado ${EXPECTED.topics})`);
    }
  }

  for (const [file, source] of Object.entries(input.commercialSources ?? {})) {
    const sql = sqlCode(source);
    if (/insert into public\.(lessons|journey|culture_items|conversation_scenes)/i.test(sql)) {
      fail(failures, "CURRICULUM_TOUCHED", `${file} escreve conteúdo de currículo`);
    }
  }

  for (const [file, source] of Object.entries(input.moduleSources ?? {})) {
    if (/from\s+["']\.\.\/data\//.test(String(source ?? ""))) {
      fail(failures, "COMMERCIAL_IMPORTS_CURRICULUM", `${file} importa dado de currículo`);
    }
  }

  return { failures };
}

/**
 * P22–P24 — o registro de verdade do produto.
 *
 * A regra que dá sentido a este gate: uma oferta que depende de pagamento não
 * pode se declarar `available` enquanto o check operacional correspondente não
 * passou de verdade. O P26.1 é explícito — implementação verde não vira
 * stripe_test_mode_e2e = true. Aqui isso deixa de ser combinado e passa a ser
 * verificado contra o próprio documento de evidência.
 */
export function validateCommercialProductTruth(input) {
  const failures = [];
  const registry = input.registry ?? {};
  const checks = input.operationalChecks?.checks ?? {};
  const allowed = new Set(["available", "pilot", "planned"]);

  const ids = Object.keys(registry);
  if (ids.length === 0) {
    fail(failures, "EMPTY_REGISTRY", "registro de verdade vazio");
  }

  for (const [id, entry] of Object.entries(registry)) {
    if (!entry || typeof entry !== "object") {
      fail(failures, "BAD_ENTRY", `${id} não é uma entrada válida`);
      continue;
    }
    if (!allowed.has(entry.availability)) {
      fail(failures, "UNKNOWN_AVAILABILITY", `${id}: estado '${entry.availability}' não existe`);
    }
    if (!entry.because || String(entry.because).trim().length < 10) {
      fail(failures, "NO_REASON", `${id} não diz por que está nesse estado`);
    }
    if (entry.gatedBy) {
      const check = checks[entry.gatedBy];
      if (!check) {
        fail(failures, "UNKNOWN_CHECK", `${id} depende de ${entry.gatedBy}, que não existe na evidência operacional`);
      } else if (entry.availability === "available" && check.pass !== true) {
        fail(
          failures,
          "CLAIMS_BEYOND_EVIDENCE",
          `${id} se declara disponível, mas ${entry.gatedBy} não passou: pass=${check.pass}`
        );
      }
    }
  }

  // O que cobra dinheiro precisa de um check operacional atrás. Sem isso a
  // regra acima vira decorativa: basta não declarar gatedBy para escapar dela.
  for (const id of input.paidCapabilities ?? []) {
    const entry = registry[id];
    if (!entry) {
      fail(failures, "MISSING_PAID_CAPABILITY", `${id} não está no registro`);
    } else if (!entry.gatedBy) {
      fail(failures, "PAID_WITHOUT_GATE", `${id} cobra e não aponta nenhum check operacional`);
    }
  }

  // As telas leem do registro em vez de afirmarem por conta própria.
  for (const [file, source] of Object.entries(input.surfaceSources ?? {})) {
    if (!/productTruth/.test(String(source ?? ""))) {
      fail(failures, "SURFACE_IGNORES_REGISTRY", `${file} anuncia plano sem ler o registro de verdade`);
    }
  }

  return { failures };
}

/**
 * P7 e P10–P13 — a experiência Family de ponta a ponta.
 *
 * O gate cobre o caminho inteiro porque cada peça isolada parecia pronta e o
 * conjunto não funcionava: as tabelas existiam desde a V4.10A, e aceitar um
 * convite não dava Pro a ninguém porque get_server_entitlement() não conhecia
 * família. Esse buraco específico tem verificação própria abaixo.
 */
export function validateFamilyExperience(input) {
  const failures = [];
  const flow = sqlCode(input.inviteFlowSource ?? "");
  const entitlement = sqlCode(input.entitlementSource ?? "");

  for (const fn of [
    "create_family_invite",
    "accept_family_invite",
    "revoke_family_invite",
    "remove_family_member",
    "get_family_overview",
  ]) {
    if (!functionBody(flow, fn)) {
      fail(failures, "NO_FLOW_RPC", `${fn} ausente: a tela não tem por onde fazer isso`);
    }
  }

  const create = functionBody(flow, "create_family_invite");
  if (create) {
    if (!/gen_random_uuid\(\)/.test(create.body)) {
      fail(failures, "TOKEN_NOT_SERVER_MINTED", "o token do convite não nasce no servidor");
    }
    if (!/encode\(\s*sha256\(/.test(create.body)) {
      fail(failures, "TOKEN_NOT_HASHED", "o convite guarda o token sem passar por hash");
    }
    if (!/expires_at/.test(create.body)) {
      fail(failures, "INVITE_WITHOUT_EXPIRY", "convite criado sem prazo");
    }
  }

  const accept = functionBody(flow, "accept_family_invite");
  if (accept) {
    if (!/encode\(\s*sha256\(/.test(accept.body)) {
      fail(failures, "ACCEPT_COMPARES_PLAINTEXT", "o aceite compara token em claro");
    }
    if (!/status\s*=\s*'accepted'/.test(accept.body)) {
      fail(failures, "TOKEN_REUSABLE", "o convite não sai de pendente: o link vira multiuso");
    }
  }

  // Nenhuma policy de escrita nas tabelas de família: se o browser puder
  // inserir o convite, ele escolhe o token_hash e o convite vale o que ele quiser.
  if (/create policy[^;]*on public\.family_(invites|memberships)[^;]*for (insert|update|delete|all)/i.test(flow)) {
    fail(failures, "CLIENT_WRITES_FAMILY", "policy de escrita direta nas tabelas de família");
  }

  // O buraco real da V4.10A: participar de família tinha que conceder acesso.
  const server = functionBody(entitlement, "get_server_entitlement");
  if (!server) {
    fail(failures, "NO_ENTITLEMENT_FN", "get_server_entitlement ausente");
  } else {
    if (!/family_membership/.test(server.body)) {
      fail(failures, "FAMILY_GRANTS_NOTHING", "entitlement do servidor não conhece família: o membro entra e continua grátis");
    }
    if (!/_user_family_entitlement/.test(server.body)) {
      fail(failures, "FAMILY_NOT_RESOLVED", "entitlement não resolve a participação em família");
    }
  }

  const familyEntitlement = functionBody(entitlement, "_user_family_entitlement");
  if (familyEntitlement) {
    if (!/m\.status\s*=\s*'active'/.test(familyEntitlement.body)) {
      fail(failures, "REMOVED_MEMBER_KEEPS_ACCESS", "participação removida continuaria concedendo acesso");
    }
    if (!/_user_stripe_pro_active|user_has_entitlement_grant/.test(familyEntitlement.body)) {
      fail(failures, "FREE_FAMILY_GRANTS_PRO", "família concede Pro sem ninguém estar pagando");
    }
  }

  const economy = functionBody(entitlement, "economy_user_is_pro");
  if (economy && !/_user_family_entitlement/.test(economy.body)) {
    fail(failures, "ECONOMY_IGNORES_FAMILY", "a economia não enxerga o Pro de família: bônus somem sem explicação");
  }

  // A tela precisa existir e passar pelas RPCs, não pelas tabelas.
  for (const [file, source] of Object.entries(input.clientSources ?? {})) {
    const clean = String(source ?? "");
    if (/from\(\s*["'`]family_(invites|memberships|accounts)["'`]/.test(clean)) {
      fail(failures, "CLIENT_QUERIES_FAMILY_TABLES", `${file}: a tela consulta tabela de família direto`);
    }
  }
  for (const required of input.requiredClientFiles ?? []) {
    if (!(required in (input.clientSources ?? {}))) {
      fail(failures, "MISSING_FAMILY_SCREEN", `${required} ausente`);
    }
  }

  return { failures };
}
