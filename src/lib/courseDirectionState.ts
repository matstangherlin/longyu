import { useStore } from "./store";
import {
  applyCourseDirection,
  isAvailableCourseDirection,
  legacyInstructionLocale,
  readPendingCourseDirection,
  resolveCourseDirection,
  writePendingCourseDirection,
  type CourseDirectionId,
} from "../i18n/courseDirection";
import { readPersistedInstructionLocale } from "../i18n/instructionLocale";
import { DEFAULT_LOCALE } from "../i18n/config";
import { getInterfaceLocaleSource, readPersistedInterfaceLocale } from "../i18n/locale";
import { trackFunnelEvent } from "../services/funnelEvents";
import { syncCourseDirectionToProfile } from "../services/courseDirectionSync";

/**
 * RC2.2.14B — curso ativo, com a conta como autoridade.
 *
 *   conta configurada (onboarded/cloud) → store.courseDirection (por conta)
 *   antes da conta                      → escolha pendente deste aparelho
 *   conta local antiga sem curso        → migra do instructionLocale que já usava
 *   nada disso                          → null (a pessoa escolhe; nunca pelo sistema)
 *
 * Conta cloud nova não herda o idioma de instrução que outra conta deixou no
 * aparelho: o curso dela vem do perfil (profiles.instruction_locale).
 */
export function activeCourseDirection(): CourseDirectionId | null {
  const state = useStore.getState();
  const account = state.accounts?.[state.currentAccountId];
  const onboarded = state.accountSetupComplete === true;
  return resolveCourseDirection({
    accountDirection: onboarded ? state.courseDirection : null,
    pendingDirection: readPendingCourseDirection(),
    legacyInstructionLocale: onboarded && account?.authMode !== "cloud" ? legacyEffectiveInstructionLocale() : null,
  });
}

/**
 * O curso que a pessoa JÁ usava antes da RC2.2.14B: o instructionLocale salvo;
 * senão a interface que ela mesma escolheu (o curso acompanhava a interface
 * até alguém escolher o curso à mão); senão o padrão pt-BR. Nunca o idioma
 * detectado do sistema — isso não existia antes e não é escolha dela.
 */
function legacyEffectiveInstructionLocale() {
  return (
    legacyInstructionLocale() ??
    readPersistedInstructionLocale() ??
    (getInterfaceLocaleSource() === "user" ? readPersistedInterfaceLocale() : null) ??
    DEFAULT_LOCALE
  );
}

/** O aluno já escolheu (ou herdou por migração) um curso? */
export function hasCourseDirection(): boolean {
  return activeCourseDirection() != null;
}

/**
 * Escolha explícita (picker, Configurações, cadastro). Grava na conta quando
 * ela existe; antes disso, só neste aparelho. Nunca mexe em progresso.
 */
export function chooseCourseDirection(id: CourseDirectionId): void {
  if (!isAvailableCourseDirection(id)) return;
  const state = useStore.getState();
  if (state.accountSetupComplete === true) {
    state.setCourseDirection(id);
    writePendingCourseDirection(null);
    void syncCourseDirectionToProfile(id);
  } else {
    writePendingCourseDirection(id);
  }
  applyCourseDirection(id);
  trackFunnelEvent("course_direction_selected", { course_direction: id });
}

/**
 * Síncrono, antes do primeiro render e a cada troca de conta: aplica o curso
 * ativo à instrução (sem "piscar" PT → EN) e leva a escolha pendente/migrada
 * para dentro da conta configurada.
 */
export function bootstrapCourseDirection(): CourseDirectionId | null {
  const direction = activeCourseDirection();
  if (!direction) return null;
  const state = useStore.getState();
  if (state.accountSetupComplete === true && state.courseDirection !== direction) {
    state.setCourseDirection(direction);
    writePendingCourseDirection(null);
  }
  applyCourseDirection(direction);
  return direction;
}
