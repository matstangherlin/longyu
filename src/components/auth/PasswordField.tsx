import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { IconEye, IconEyeOff } from "../ui/Icon";
import { cx } from "../ui/primitives";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
  labelTrailing?: ReactNode;
  showLabel?: string;
  hideLabel?: string;
};

/** Password input with an accessible show/hide control sized for touch. */
export function PasswordField({
  label,
  labelTrailing,
  showLabel,
  hideLabel,
  className,
  id,
  name,
  ...inputProps
}: PasswordFieldProps) {
  const { t } = useTranslation();
  const generatedId = useId();
  const inputId = id ?? name ?? `password-${generatedId.replace(/:/g, "")}`;
  const [visible, setVisible] = useState(false);
  const showText = showLabel ?? t("auth.showPassword");
  const hideText = hideLabel ?? t("auth.hidePassword");

  return (
    <div>
      {(label || labelTrailing) && (
        <div className="flex items-center justify-between gap-2">
          {label && <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</label>}
          {labelTrailing}
        </div>
      )}
      <div className={cx("relative", label || labelTrailing ? "mt-1.5" : undefined)}>
        <input
          {...inputProps}
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          className={cx(
            "h-12 w-full rounded-xl border border-line bg-surface px-4 pr-12 text-base text-ink outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/20",
            className
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? hideText : showText}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-ink-faint transition hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
        >
          {visible ? <IconEyeOff width={19} height={19} /> : <IconEye width={19} height={19} />}
        </button>
      </div>
    </div>
  );
}

export function PasswordRequirements({
  password,
  confirmation,
  className,
}: {
  password: string;
  confirmation?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const rules = [
    { id: "length", required: true, ok: password.length >= 6, label: t("auth.passwordRuleLength") },
    ...(confirmation !== undefined
      ? [{ id: "match", required: true, ok: password.length > 0 && password === confirmation, label: t("auth.passwordRuleMatch") }]
      : []),
    { id: "uppercase", required: false, ok: /[A-Z]/.test(password), label: t("auth.passwordRuleUppercase") },
    { id: "lowercase", required: false, ok: /[a-z]/.test(password), label: t("auth.passwordRuleLowercase") },
    { id: "number", required: false, ok: /\d/.test(password), label: t("auth.passwordRuleNumber") },
    { id: "special", required: false, ok: /[^A-Za-z0-9]/.test(password), label: t("auth.passwordRuleSpecial") },
  ];

  return (
    <div className={cx("rounded-xl border border-line/70 bg-surface-2/60 px-3 py-2.5", className)} data-testid="password-requirements">
      <p className="text-xs font-semibold text-ink">{t("auth.passwordRequirements")}</p>
      <ul className="mt-1.5 grid gap-1 text-xs" aria-live="polite">
        {rules.map((rule) => (
          <li key={rule.id} className={cx("flex items-center gap-2", rule.ok ? "text-good" : rule.required ? "text-ink-soft" : "text-ink-faint")}>
            <span aria-hidden="true" className="w-3 text-center font-bold">{rule.ok ? "✓" : "○"}</span>
            <span>{rule.label}</span>
            {!rule.required && <span className="text-[10px] uppercase tracking-[0.08em]">{t("auth.passwordRecommended")}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
