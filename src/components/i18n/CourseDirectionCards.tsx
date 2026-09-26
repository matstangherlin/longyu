import { IconCheck } from "../ui/Icon";
import { haptic } from "../../lib/haptics";
import { availableCourseDirections, courseDirectionById, type CourseDirectionId } from "../../i18n/courseDirection";
import { useTranslation } from "../../i18n/useTranslation";

/** "Português" / "Inglês" / "English"… no idioma da INTERFACE, com inicial maiúscula. */
function languageName(code: string, uiLocale: string, fallback: string): string {
  try {
    const name = new Intl.DisplayNames([uiLocale], { type: "language" }).of(code);
    if (name && name !== code) return name.charAt(0).toLocaleUpperCase(uiLocale) + name.slice(1);
  } catch {
    // Intl.DisplayNames ausente: usa o nome nativo do registro.
  }
  return fallback;
}

/** "Português → Mandarim" na interface atual (dados do registro, não lista fixa). */
export function useCourseDirectionLabel() {
  const { t, locale } = useTranslation();
  return (id: CourseDirectionId) => {
    const direction = courseDirectionById(id);
    if (!direction) return id;
    const source = languageName(direction.sourceLanguage, locale, direction.sourceNativeName);
    return `${source} → ${t("course.targetName")}`;
  };
}

/**
 * RC2.2.14B · J/O/Y — cartões de curso (radiogroup). Renderiza
 * COURSE_DIRECTIONS.filter(available): um curso novo não exige mexer aqui.
 * Bandeira é apoio; o texto identifica o idioma. Nada vem selecionado sem o
 * toque da pessoa — "Recomendado" é só um destaque.
 */
export function CourseDirectionCards({
  value,
  recommended,
  onSelect,
  name = "course-direction",
}: {
  value: CourseDirectionId | null;
  recommended: CourseDirectionId | null;
  onSelect: (id: CourseDirectionId) => void;
  name?: string;
}) {
  const { t } = useTranslation();
  const label = useCourseDirectionLabel();
  return (
    <div role="radiogroup" aria-label={t("course.pickerTitle")} className="grid gap-3" data-testid="course-direction-cards">
      {availableCourseDirections().map((direction) => {
        const selected = value === direction.id;
        const isRecommended = recommended === direction.id;
        const text = label(direction.id);
        const aria = [
          text.replace(" → ", ` ${t("course.ariaTo")} `),
          isRecommended ? t("course.recommended") : null,
          selected ? t("course.ariaSelected") : t("course.ariaNotSelected"),
        ]
          .filter(Boolean)
          .join(", ");
        return (
          <button
            key={direction.id}
            type="button"
            role="radio"
            name={name}
            aria-checked={selected}
            aria-label={aria}
            data-course-choice={direction.id}
            data-recommended={isRecommended ? "true" : "false"}
            onClick={() => {
              haptic("selection");
              onSelect(direction.id);
            }}
            className={[
              "flex min-h-[4.75rem] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
              selected ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line bg-surface hover:bg-surface-2",
            ].join(" ")}
          >
            <span className="text-3xl leading-none" aria-hidden="true">
              {direction.flag}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{direction.sourceNativeName}</span>
              <span className="block text-sm text-ink-soft">{text}</span>
              {isRecommended && (
                <span className="mt-1 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                  {t("course.recommended")}
                </span>
              )}
            </span>
            {selected && <IconCheck width={20} height={20} className="shrink-0 text-accent" />}
          </button>
        );
      })}
    </div>
  );
}
