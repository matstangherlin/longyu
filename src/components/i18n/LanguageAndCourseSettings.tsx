import { useState, useSyncExternalStore } from "react";
import { HubSection } from "../layout/HubLayout";
import { Button } from "../ui/primitives";
import { IconCheck, IconChevron } from "../ui/Icon";
import { ModalOverlay } from "../ui/ModalOverlay";
import { CourseDirectionCards, useCourseDirectionLabel } from "./CourseDirectionCards";
import { LOCALE_DISPLAY_NAME, SUPPORTED_INTERFACE_LOCALES, type SupportedLocale } from "../../i18n/config";
import {
  followSystemInterfaceLocale,
  getInterfaceLocaleSource,
  resolveSystemInterfaceLocale,
  subscribeInterfaceLocale,
} from "../../i18n/locale";
import { courseDirectionById, type CourseDirectionId } from "../../i18n/courseDirection";
import { activeCourseDirection, chooseCourseDirection } from "../../lib/courseDirectionState";
import { useStore } from "../../lib/store";
import { haptic } from "../../lib/haptics";
import { useTranslation } from "../../i18n/useTranslation";

type Sheet = "interface" | "course" | null;

/**
 * RC2.2.14B · AH–AL — Configurações › Aprendizagem: duas linhas, cada uma abre
 * uma folha. "Idioma do aplicativo" (interface) e "Curso" (explicações e
 * traduções) são escolhas separadas; "Foco do curso" era redundante e saiu.
 */
export function LanguageAndCourseSettings() {
  const { t, locale, setLocale } = useTranslation();
  const label = useCourseDirectionLabel();
  // Re-render quando a interface muda (a fonte "sistema/usuário" acompanha).
  useSyncExternalStore(subscribeInterfaceLocale, () => getInterfaceLocaleSource(), () => "system");
  useStore((s) => s.courseDirection);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [draft, setDraft] = useState<CourseDirectionId | null>(null);
  const source = getInterfaceLocaleSource();
  const detected = resolveSystemInterfaceLocale();
  const course = activeCourseDirection();

  const interfaceValue = source === "system" ? `${LOCALE_DISPLAY_NAME[locale]} · ${t("course.systemSuffix")}` : LOCALE_DISPLAY_NAME[locale];
  const draftTarget = draft ? courseDirectionById(draft) : undefined;

  return (
    <HubSection id="idioma" className="scroll-mt-6" title={t("settings.languageAndCourse")}>
      <ul className="divide-y divide-line/70 overflow-hidden rounded-xl border border-line/70 bg-surface" data-testid="language-course-rows">
        <li>
          <button
            type="button"
            data-testid="settings-interface-locale-row"
            onClick={() => setSheet("interface")}
            className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
          >
            <span className="min-w-0">
              <span className="block font-medium text-ink">{t("course.appLanguage")}</span>
              <span className="block truncate text-sm text-ink-soft" data-interface-locale-value>{interfaceValue}</span>
            </span>
            <IconChevron width={16} height={16} className="shrink-0 text-ink-faint" aria-hidden />
          </button>
        </li>
        <li id="idioma-curso">
          <button
            type="button"
            data-testid="settings-course-row"
            onClick={() => {
              setDraft(course);
              setSheet("course");
            }}
            className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
          >
            <span className="min-w-0">
              <span className="block font-medium text-ink">{t("course.current")}</span>
              <span className="block truncate text-sm text-ink-soft" data-course-direction-value={course ?? "none"}>
                {course ? label(course) : "—"}
              </span>
            </span>
            <IconChevron width={16} height={16} className="shrink-0 text-ink-faint" aria-hidden />
          </button>
        </li>
      </ul>

      {sheet === "interface" && (
        <ModalOverlay label={t("course.appLanguage")} onBackdropClick={() => setSheet(null)}>
          <div
            data-testid="interface-locale-sheet"
            className="w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,var(--app-safe-bottom))] shadow-card sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-semibold text-ink">{t("course.appLanguage")}</h2>
            <div role="radiogroup" aria-label={t("course.appLanguage")} className="mt-3 grid gap-2">
              <LocaleOption
                id="system"
                checked={source === "system"}
                title={t("course.useSystem")}
                detail={detected ? t("course.detected", { language: LOCALE_DISPLAY_NAME[detected] }) : undefined}
                onPick={() => {
                  followSystemInterfaceLocale();
                  setSheet(null);
                }}
              />
              {SUPPORTED_INTERFACE_LOCALES.map((code: SupportedLocale) => (
                <LocaleOption
                  key={code}
                  id={code}
                  checked={source === "user" && locale === code}
                  title={LOCALE_DISPLAY_NAME[code]}
                  onPick={() => {
                    setLocale(code);
                    setSheet(null);
                  }}
                />
              ))}
            </div>
          </div>
        </ModalOverlay>
      )}

      {sheet === "course" && (
        <ModalOverlay label={t("course.current")} onBackdropClick={() => setSheet(null)}>
          <div
            data-testid="course-sheet"
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,var(--app-safe-bottom))] shadow-card sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-semibold text-ink">{t("course.current")}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t("course.settingsNote")}</p>
            <div className="mt-3">
              <CourseDirectionCards value={draft} recommended={null} onSelect={setDraft} name="settings-course" />
            </div>
            {draft && draft !== course && draftTarget && (
              <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-soft" data-testid="course-change-warning">
                {t("course.changeWarning", { language: label(draft).split(" → ")[0] ?? draftTarget.sourceNativeName })}
              </p>
            )}
            <div className="mt-4 grid gap-2">
              <Button
                size="lg"
                className="w-full"
                disabled={!draft || draft === course}
                data-testid="course-change-confirm"
                onClick={() => {
                  if (!draft) return;
                  chooseCourseDirection(draft);
                  haptic("answerCorrect");
                  setSheet(null);
                }}
              >
                {t("course.changeConfirm")}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setSheet(null)}>
                {t("course.cancel")}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </HubSection>
  );
}

function LocaleOption({
  id,
  checked,
  title,
  detail,
  onPick,
}: {
  id: string;
  checked: boolean;
  title: string;
  detail?: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-locale-choice={id}
      onClick={() => {
        haptic("selection");
        onPick();
      }}
      className={[
        "flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left transition",
        checked ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface-2 text-ink hover:bg-surface",
      ].join(" ")}
    >
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        {detail && <span className="block text-xs text-ink-soft" data-locale-detected>{detail}</span>}
      </span>
      {checked && <IconCheck width={16} height={16} />}
    </button>
  );
}
