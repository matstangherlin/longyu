import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/primitives";
import { CourseDirectionCards } from "../../components/i18n/CourseDirectionCards";
import { recommendedCourseDirection, type CourseDirectionId } from "../../i18n/courseDirection";
import { activeCourseDirection, chooseCourseDirection } from "../../lib/courseDirectionState";
import { systemLanguageTags } from "../../lib/platform/systemLocale";
import { isSafeInternalPath } from "../../lib/navigation/smartBack";
import { haptic } from "../../lib/haptics";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * RC2.2.14B · J–R — "Como você quer aprender mandarim?".
 *
 * Aparece uma vez, antes do teste guiado ou do onboarding. A interface já
 * está no idioma do sistema; aqui a pessoa escolhe o CURSO (idioma das
 * explicações). A recomendação vem do idioma do sistema quando há curso
 * correspondente — e é só um destaque: nada fica selecionado sem o toque.
 */
export function CoursePickerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedNext = params.get("next");
  const next = requestedNext && isSafeInternalPath(requestedNext) ? requestedNext : "/teste-guiado";
  const current = useMemo(() => activeCourseDirection(), []);
  const recommended = useMemo(() => recommendedCourseDirection(systemLanguageTags()), []);
  const [selected, setSelected] = useState<CourseDirectionId | null>(current);

  return (
    <div className="flex min-h-dvh flex-col bg-bg" data-testid="course-picker">
      <header className="flex items-center px-4 pb-2 pt-[calc(var(--app-safe-top)+0.5rem)]">
        <Link to="/" className="inline-flex min-h-12 items-center gap-1.5 font-serif text-xl font-semibold text-accent">
          <span aria-hidden="true">🐉</span> Longyu
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">🐉 {t("course.pickerEyebrow")}</p>
        <h1 className="mt-2 font-serif text-[1.7rem] font-semibold leading-tight text-ink">{t("course.pickerTitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{t("course.pickerLead")}</p>
        <div className="mt-5">
          <CourseDirectionCards value={selected} recommended={recommended} onSelect={setSelected} />
        </div>
      </main>
      <div className="mx-auto w-full max-w-md px-5 pb-[calc(var(--app-safe-bottom)+1rem)]">
        <Button
          size="lg"
          className="w-full shadow-lift"
          disabled={!selected}
          data-testid="course-picker-confirm"
          onClick={() => {
            if (!selected) return;
            chooseCourseDirection(selected);
            haptic("answerCorrect");
            navigate(next, { replace: true });
          }}
        >
          {t("course.continue")}
        </Button>
      </div>
    </div>
  );
}
