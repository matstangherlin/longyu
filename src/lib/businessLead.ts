/** Contrato do lead comercial (form + Edge Function). Sem CRM nesta versão. */

export const BUSINESS_EMPLOYEE_COUNT_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

export type BusinessEmployeeCountRange = (typeof BUSINESS_EMPLOYEE_COUNT_RANGES)[number];

export const BUSINESS_GOALS = [
  "work_with_chinese_teams",
  "travel_to_china",
  "relocation",
  "industry_operations",
  "export_import",
  "custom",
] as const;

export type BusinessGoal = (typeof BUSINESS_GOALS)[number];

export const BUSINESS_START_WINDOWS = ["asap", "this_quarter", "this_year", "exploring"] as const;

export type BusinessStartWindow = (typeof BUSINESS_START_WINDOWS)[number];

export const BUSINESS_LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "pilot",
  "won",
  "lost",
] as const;

export type BusinessLeadStatus = (typeof BUSINESS_LEAD_STATUSES)[number];

export const BUSINESS_FUNNEL_EVENTS = [
  "business_page_view",
  "business_cta_clicked",
  "business_lead_started",
  "business_lead_submitted",
] as const;

export type BusinessFunnelEvent = (typeof BUSINESS_FUNNEL_EVENTS)[number];

export const BUSINESS_LEAD_LIMITS = {
  firstName: 80,
  lastName: 80,
  name: 160,
  workEmail: 254,
  company: 160,
  jobTitle: 120,
  country: 80,
  message: 4000,
  sourceCta: 64,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface BusinessLeadDraft {
  firstName: string;
  lastName: string;
  workEmail: string;
  company: string;
  jobTitle: string;
  employeeCountRange: string;
  country: string;
  goal: string;
  startWindow: string;
  message: string;
  /** Honeypot — precisa ficar vazio. */
  website?: string;
  sourceCta?: string;
}

export type BusinessLeadField =
  | "firstName"
  | "lastName"
  | "workEmail"
  | "company"
  | "jobTitle"
  | "employeeCountRange"
  | "country"
  | "goal"
  | "startWindow"
  | "message";

export type BusinessLeadErrors = Partial<Record<BusinessLeadField, string>>;

export interface ValidatedBusinessLead {
  name: string;
  workEmail: string;
  company: string;
  jobTitle: string;
  employeeCountRange: BusinessEmployeeCountRange;
  country: string;
  goal: BusinessGoal;
  startWindow: BusinessStartWindow;
  message: string;
  sourceCta: string;
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function asRange(value: string): BusinessEmployeeCountRange | null {
  return (BUSINESS_EMPLOYEE_COUNT_RANGES as readonly string[]).includes(value)
    ? (value as BusinessEmployeeCountRange)
    : null;
}

function asGoal(value: string): BusinessGoal | null {
  return (BUSINESS_GOALS as readonly string[]).includes(value) ? (value as BusinessGoal) : null;
}

function asStartWindow(value: string): BusinessStartWindow | null {
  return (BUSINESS_START_WINDOWS as readonly string[]).includes(value)
    ? (value as BusinessStartWindow)
    : null;
}

export function isBusinessHoneypotTriggered(draft: Pick<BusinessLeadDraft, "website">): boolean {
  return Boolean(String(draft.website ?? "").trim());
}

export function validateBusinessLead(draft: BusinessLeadDraft): {
  ok: boolean;
  errors: BusinessLeadErrors;
  value: ValidatedBusinessLead | null;
} {
  const errors: BusinessLeadErrors = {};
  const firstName = clip(draft.firstName ?? "", BUSINESS_LEAD_LIMITS.firstName);
  const lastName = clip(draft.lastName ?? "", BUSINESS_LEAD_LIMITS.lastName);
  const workEmail = clip(draft.workEmail ?? "", BUSINESS_LEAD_LIMITS.workEmail).toLowerCase();
  const company = clip(draft.company ?? "", BUSINESS_LEAD_LIMITS.company);
  const jobTitle = clip(draft.jobTitle ?? "", BUSINESS_LEAD_LIMITS.jobTitle);
  const country = clip(draft.country ?? "", BUSINESS_LEAD_LIMITS.country);
  const message = clip(draft.message ?? "", BUSINESS_LEAD_LIMITS.message);
  const sourceCta = clip(draft.sourceCta ?? "", BUSINESS_LEAD_LIMITS.sourceCta);
  const employeeCountRange = asRange(String(draft.employeeCountRange ?? "").trim());
  const goal = asGoal(String(draft.goal ?? "").trim());
  const startWindow = asStartWindow(String(draft.startWindow ?? "").trim());

  if (firstName.length < 2) errors.firstName = "Informe o nome.";
  if (lastName.length < 2) errors.lastName = "Informe o sobrenome.";
  if (!EMAIL_RE.test(workEmail)) errors.workEmail = "Informe um e-mail de trabalho válido.";
  if (company.length < 2) errors.company = "Informe o nome da empresa.";
  if (jobTitle.length < 2) errors.jobTitle = "Informe o cargo.";
  if (!employeeCountRange) errors.employeeCountRange = "Escolha o número de colaboradores.";
  if (country.length < 2) errors.country = "Informe o país.";
  if (!goal) errors.goal = "Escolha o objetivo do programa.";
  if (!startWindow) errors.startWindow = "Escolha quando pretende começar.";
  if (message.length > BUSINESS_LEAD_LIMITS.message) errors.message = "A mensagem é longa demais.";

  const name = clip(`${firstName} ${lastName}`, BUSINESS_LEAD_LIMITS.name);
  if (name.length < 3) errors.firstName = errors.firstName ?? "Informe nome e sobrenome.";

  if (Object.keys(errors).length > 0 || !employeeCountRange || !goal || !startWindow) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: {},
    value: {
      name,
      workEmail,
      company,
      jobTitle,
      employeeCountRange,
      country,
      goal,
      startWindow,
      message,
      sourceCta,
    },
  };
}

export const EMPLOYEE_COUNT_LABELS: Record<BusinessEmployeeCountRange, string> = {
  "1-10": "1 a 10",
  "11-50": "11 a 50",
  "51-200": "51 a 200",
  "201-500": "201 a 500",
  "501-1000": "501 a 1.000",
  "1000+": "Mais de 1.000",
};

export const GOAL_LABELS: Record<BusinessGoal, string> = {
  work_with_chinese_teams: "Comunicar-se com equipes chinesas no dia a dia",
  travel_to_china: "Preparar viagens de trabalho à China",
  relocation: "Apoiar relocation / expatriação",
  industry_operations: "Operações industriais Brasil–China",
  export_import: "Comércio exterior / importação e exportação",
  custom: "Outro objetivo (conto na mensagem)",
};

export const START_WINDOW_LABELS: Record<BusinessStartWindow, string> = {
  asap: "O quanto antes",
  this_quarter: "Neste trimestre",
  this_year: "Neste ano",
  exploring: "Ainda estamos explorando",
};
