import { Link } from "react-router-dom";
import { activeCourseDirection } from "../../lib/courseDirectionState";
import { useCourseDirectionLabel } from "./CourseDirectionCards";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * RC2.2.14B · AU/AV — o curso já escolhido, com "Alterar" discreto. No
 * onboarding/cadastro a pergunta não se repete: só se mostra a escolha.
 */
export function CourseDirectionChip({ next }: { next: string }) {
  const { t } = useTranslation();
  const label = useCourseDirectionLabel();
  const direction = activeCourseDirection();
  if (!direction) return null;
  return (
    <Link
      to={`/curso?next=${encodeURIComponent(next)}`}
      data-testid="course-direction-chip"
      data-course-direction={direction}
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink-soft transition hover:text-ink"
      aria-label={`${t("course.current")}: ${label(direction)}. ${t("course.change")}`}
    >
      <span className="max-w-[9.5rem] truncate">{label(direction)}</span>
      <span className="text-accent">{t("course.change")}</span>
    </Link>
  );
}
