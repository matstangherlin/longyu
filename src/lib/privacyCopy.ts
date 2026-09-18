/** Textos estáveis da privacidade / telemetria pedagógica (UI + validador). */

export const TELEMETRY_CONSENT_TITLE = "Ajude a melhorar o Longyu";

/** Honesto: pode incluir identificador de conta/perfil quando aplicável — não chamar de anônimo. */
export const TELEMETRY_CONSENT_BODY =
  "O Longyu pode coletar dados pedagógicos e de uso, como lições concluídas, tipos de exercício com mais erros e telas abandonadas. Quando você tem conta, isso pode incluir um identificador de conta/perfil. Não coletamos senhas nem o texto livre das suas respostas.";

export const TELEMETRY_COLLECTED = [
  "identificador da conta/perfil",
  "lição",
  "tipo do exercício",
  "acerto ou erro",
  "abandono",
  "versão do app",
  "data",
] as const;

export const TELEMETRY_NOT_COLLECTED = [
  "senha",
  "tokens",
  "áudio bruto",
  "texto digitado livre",
  "dados de cartão",
  "conteúdo completo do armazenamento local",
] as const;

export const PRIVACY_POLICY_PATH = "/privacidade#politica";
export const PRIVACY_DATA_DETAILS_PATH = "/privacidade#dados-coletados";
export const TERMS_PATH = "/termos";
export const SUPPORT_EMAIL = "beta@longyu.app";
