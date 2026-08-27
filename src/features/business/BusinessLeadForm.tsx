import { useId, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/primitives";
import {
  EMPLOYEE_COUNT_LABELS,
  GOAL_LABELS,
  START_WINDOW_LABELS,
  validateBusinessLead,
  type BusinessLeadDraft,
  type BusinessLeadErrors,
} from "../../lib/businessLead";
import { trackBusinessEvent } from "../../services/businessEvents";
import { submitBusinessLead } from "../../services/businessLeadService";
import { CountrySelect } from "../../components/auth/CountrySelect";
import { LAUNCH_COUNTRY_CODE } from "../../lib/i18n/identity";

const FIELD_CLASS =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/45";

const LABEL_CLASS = "mb-1 block text-xs font-semibold text-ink";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-[rgb(var(--wrong))]">
      {message}
    </p>
  );
}

const EMPTY: BusinessLeadDraft = {
  firstName: "",
  lastName: "",
  workEmail: "",
  company: "",
  jobTitle: "",
  employeeCountRange: "",
  country: LAUNCH_COUNTRY_CODE,
  goal: "",
  startWindow: "",
  message: "",
  website: "",
  sourceCta: "form",
};

export function BusinessLeadForm({ sourceCta = "form" }: { sourceCta?: string }) {
  const formId = useId();
  const [draft, setDraft] = useState<BusinessLeadDraft>({ ...EMPTY, sourceCta });
  const [errors, setErrors] = useState<BusinessLeadErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [started, setStarted] = useState(false);

  const errorIds = useMemo(
    () => ({
      firstName: `${formId}-firstName-error`,
      lastName: `${formId}-lastName-error`,
      workEmail: `${formId}-workEmail-error`,
      company: `${formId}-company-error`,
      jobTitle: `${formId}-jobTitle-error`,
      employeeCountRange: `${formId}-employee-error`,
      country: `${formId}-country-error`,
      goal: `${formId}-goal-error`,
      startWindow: `${formId}-start-error`,
      message: `${formId}-message-error`,
    }),
    [formId]
  );

  function markStarted() {
    if (started) return;
    setStarted(true);
    trackBusinessEvent("business_lead_started", sourceCta);
  }

  function patch<K extends keyof BusinessLeadDraft>(key: K, value: BusinessLeadDraft[K]) {
    markStarted();
    setDraft((current) => ({ ...current, [key]: value, sourceCta }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...draft, sourceCta };
    const validated = validateBusinessLead(next);
    setErrors(validated.errors);
    if (!validated.ok) {
      setStatus("error");
      setNotice("Revise os campos destacados e tente de novo.");
      return;
    }

    setStatus("loading");
    setNotice(null);
    const result = await submitBusinessLead(next);
    if (result.status === "opened") {
      setStatus("success");
      setNotice(result.message);
      trackBusinessEvent("business_lead_submitted", sourceCta);
      setDraft({ ...EMPTY, sourceCta, country: next.country });
      setErrors({});
      return;
    }
    if (result.status === "not_implemented") {
      setStatus("error");
      setNotice(result.message);
      return;
    }
    if (result.status === "captcha_failed") {
      setStatus("error");
      setNotice(result.message);
      return;
    }
    setStatus("error");
    setNotice(result.message);
  }

  return (
    <form
      id="contato"
      data-business-form
      onSubmit={(event) => void onSubmit(event)}
      className="space-y-3"
      noValidate
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor={`${formId}-firstName`}>
            Nome
          </label>
          <input
            id={`${formId}-firstName`}
            name="firstName"
            autoComplete="given-name"
            required
            minLength={2}
            maxLength={80}
            value={draft.firstName}
            onChange={(event) => patch("firstName", event.target.value)}
            aria-invalid={Boolean(errors.firstName) || undefined}
            aria-describedby={errors.firstName ? errorIds.firstName : undefined}
            className={FIELD_CLASS}
          />
          <FieldError id={errorIds.firstName} message={errors.firstName} />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor={`${formId}-lastName`}>
            Sobrenome
          </label>
          <input
            id={`${formId}-lastName`}
            name="lastName"
            autoComplete="family-name"
            required
            minLength={2}
            maxLength={80}
            value={draft.lastName}
            onChange={(event) => patch("lastName", event.target.value)}
            aria-invalid={Boolean(errors.lastName) || undefined}
            aria-describedby={errors.lastName ? errorIds.lastName : undefined}
            className={FIELD_CLASS}
          />
          <FieldError id={errorIds.lastName} message={errors.lastName} />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor={`${formId}-workEmail`}>
          E-mail corporativo
        </label>
        <input
          id={`${formId}-workEmail`}
          name="workEmail"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={254}
          value={draft.workEmail}
          onChange={(event) => patch("workEmail", event.target.value)}
          aria-invalid={Boolean(errors.workEmail) || undefined}
          aria-describedby={errors.workEmail ? errorIds.workEmail : undefined}
          className={FIELD_CLASS}
        />
        <FieldError id={errorIds.workEmail} message={errors.workEmail} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor={`${formId}-company`}>
            Empresa
          </label>
          <input
            id={`${formId}-company`}
            name="company"
            autoComplete="organization"
            required
            maxLength={160}
            value={draft.company}
            onChange={(event) => patch("company", event.target.value)}
            aria-invalid={Boolean(errors.company) || undefined}
            aria-describedby={errors.company ? errorIds.company : undefined}
            className={FIELD_CLASS}
          />
          <FieldError id={errorIds.company} message={errors.company} />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor={`${formId}-jobTitle`}>
            Cargo
          </label>
          <input
            id={`${formId}-jobTitle`}
            name="jobTitle"
            autoComplete="organization-title"
            required
            maxLength={120}
            value={draft.jobTitle}
            onChange={(event) => patch("jobTitle", event.target.value)}
            aria-invalid={Boolean(errors.jobTitle) || undefined}
            aria-describedby={errors.jobTitle ? errorIds.jobTitle : undefined}
            className={FIELD_CLASS}
          />
          <FieldError id={errorIds.jobTitle} message={errors.jobTitle} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor={`${formId}-employee`}>
            Número de colaboradores
          </label>
          <select
            id={`${formId}-employee`}
            name="employeeCountRange"
            required
            value={draft.employeeCountRange}
            onChange={(event) => patch("employeeCountRange", event.target.value)}
            aria-invalid={Boolean(errors.employeeCountRange) || undefined}
            aria-describedby={errors.employeeCountRange ? errorIds.employeeCountRange : undefined}
            className={FIELD_CLASS}
          >
            <option value="">Selecione</option>
            {Object.entries(EMPLOYEE_COUNT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <FieldError id={errorIds.employeeCountRange} message={errors.employeeCountRange} />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor={`${formId}-country`}>
            País
          </label>
          <CountrySelect
            id={`${formId}-country`}
            name="country"
            required
            value={draft.country}
            onChange={(value) => patch("country", value)}
            aria-invalid={Boolean(errors.country) || undefined}
            aria-describedby={errors.country ? errorIds.country : undefined}
            className={FIELD_CLASS}
          />
          <FieldError id={errorIds.country} message={errors.country} />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor={`${formId}-goal`}>
          Objetivo
        </label>
        <select
          id={`${formId}-goal`}
          name="goal"
          required
          value={draft.goal}
          onChange={(event) => patch("goal", event.target.value)}
          aria-invalid={Boolean(errors.goal) || undefined}
          aria-describedby={errors.goal ? errorIds.goal : undefined}
          className={FIELD_CLASS}
        >
          <option value="">Selecione</option>
          {Object.entries(GOAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <FieldError id={errorIds.goal} message={errors.goal} />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor={`${formId}-start`}>
          Quando pretende começar?
        </label>
        <select
          id={`${formId}-start`}
          name="startWindow"
          required
          value={draft.startWindow}
          onChange={(event) => patch("startWindow", event.target.value)}
          aria-invalid={Boolean(errors.startWindow) || undefined}
          aria-describedby={errors.startWindow ? errorIds.startWindow : undefined}
          className={FIELD_CLASS}
        >
          <option value="">Selecione</option>
          {Object.entries(START_WINDOW_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <FieldError id={errorIds.startWindow} message={errors.startWindow} />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor={`${formId}-message`}>
          Mensagem
        </label>
        <textarea
          id={`${formId}-message`}
          name="message"
          rows={4}
          maxLength={4000}
          value={draft.message}
          onChange={(event) => patch("message", event.target.value)}
          aria-describedby={errors.message ? errorIds.message : `${formId}-message-hint`}
          className="min-h-[6.5rem] w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
        />
        <p id={`${formId}-message-hint`} className="mt-1 text-[11px] text-ink-faint">
          Opcional. Não envie dados pessoais de colaboradores.
        </p>
        <FieldError id={errorIds.message} message={errors.message} />
      </div>

      <div className="hidden" aria-hidden="true">
        <label htmlFor={`${formId}-website`}>Website</label>
        <input
          id={`${formId}-website`}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={draft.website}
          onChange={(event) => patch("website", event.target.value)}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={status === "loading"}
        data-business-cta="form-submit"
      >
        Falar com vendas
      </Button>

      <p className="text-[11px] leading-4 text-ink-faint">
        Usamos estes dados só para contato comercial sobre o Longyu Business. Não pedimos dados pessoais de
        colaboradores. Veja a{" "}
        <Link
          className="inline-flex min-h-11 items-center font-semibold text-ink underline-offset-2 hover:underline"
          to="/privacidade"
        >
          Política de Privacidade
        </Link>
        .
      </p>

      {notice && (
        <p
          role="status"
          aria-live="polite"
          data-business-lead-status={status}
          className={
            status === "success"
              ? "text-sm font-medium text-[rgb(var(--good))]"
              : "text-sm text-ink-soft"
          }
        >
          {notice}
        </p>
      )}
    </form>
  );
}
