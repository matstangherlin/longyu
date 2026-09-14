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
  const found = new Set();
  for (const columnPattern of columnPatterns) {
    const re = new RegExp(
      `\\b${columnPattern}\\b\\s*(?:=|<>|!=|is distinct from|not in|in)\\s*(\\([^)]*\\)|'[^']*')`,
      "gi"
    );
    for (const match of sql.matchAll(re)) {
      for (const literal of match[1].matchAll(/'([^']*)'/g)) found.add(literal[1]);
    }
  }
  return [...found];
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

  // REGRA 5 — estados do banco.
  const allowedStatuses = new Set([...ORGANIZATION_STATUSES, ...MEMBERSHIP_STATUSES, ...INVITE_STATUSES]);
  for (const column of ["seat_status", "status"]) {
    for (const status of literalsNear(sql, column)) {
      if (!allowedStatuses.has(status)) {
        fail(failures, "UNKNOWN_STATUS", `estado '${status}' em ${column} não existe no banco`);
      }
    }
  }
  if (/'cancell?ed'/i.test(sql)) {
    fail(failures, "CANCELED_INVENTED", "'canceled' não existe: uma organização que sai fica 'churned'");
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
  const EXPECTED = { fingerprint: "38e70062857d", lessons: 134, topics: 113 };

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
