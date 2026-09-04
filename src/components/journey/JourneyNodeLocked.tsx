import { Link } from "react-router-dom";
import { Card } from "../ui/primitives";
import { IconLock } from "../ui/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import type { JourneyNodeReadiness } from "../../lib/journeyReadiness";

/**
 * Bloqueio de reforço aberto por deep link.
 *
 * O tom aqui importa: o aluno não fez nada errado, só chegou antes da hora. A
 * mensagem diz o que falta, nunca "acesso negado" — e a saída é a Jornada, que
 * é onde o pré-requisito é construído.
 */
export function JourneyNodeLocked({ readiness }: { readiness: JourneyNodeReadiness }) {
  const { instructionLocale } = useTranslation();
  const en = instructionLocale === "en";

  const explanation: Record<JourneyNodeReadiness["reason"], string> = en
    ? {
        READY: "",
        MISSING_TARGET: "This booster reuses something the Journey has not taught yet.",
        TARGET_STAGE_TOO_LOW: "You have met this content, but not deeply enough for this booster yet.",
        INSUFFICIENT_CHUNKS: "This one opens after a larger set of known phrases.",
        INSUFFICIENT_PATTERNS: "This one opens after more sentence patterns are familiar.",
        INSUFFICIENT_RECOGNITION: "There is not enough review evidence yet to say this input would be mostly familiar.",
        NO_REVIEW_DUE: "Nothing is due for review right now.",
        CAPSULE_PREREQUISITE: "A short capsule comes before this one.",
        UNKNOWN_REQUIREMENT: "This booster declares a requirement the app cannot resolve.",
      }
    : {
        READY: "",
        MISSING_TARGET: "Este reforço reusa algo que a Jornada ainda não ensinou.",
        TARGET_STAGE_TOO_LOW: "Você já encontrou esse conteúdo, mas ainda não com profundidade suficiente para este reforço.",
        INSUFFICIENT_CHUNKS: "Este abre depois de um repertório maior de frases conhecidas.",
        INSUFFICIENT_PATTERNS: "Este abre quando mais padrões de frase estiverem familiares.",
        INSUFFICIENT_RECOGNITION: "Ainda não há evidência de revisão suficiente para afirmar que esse conteúdo seria majoritariamente conhecido.",
        NO_REVIEW_DUE: "Nada vencido para revisar agora.",
        CAPSULE_PREREQUISITE: "Uma cápsula curta vem antes desta.",
        UNKNOWN_REQUIREMENT: "Este reforço declara um requisito que o app não consegue resolver.",
      };

  return (
    <div className="mx-auto max-w-md px-4 py-10" data-testid="journey-node-locked" data-reason={readiness.reason}>
      <Card className="p-6 text-center" variant="info">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <IconLock width={22} height={22} />
        </span>
        <h1 className="mt-4 font-serif text-xl font-semibold text-ink">
          {en ? "Not yet — and that is on purpose" : "Ainda não — e isso é de propósito"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{explanation[readiness.reason]}</p>
        <p className="mt-3 text-xs leading-5 text-ink-faint">
          {en
            ? "Boosters reuse what the Journey already taught. Continuing on the Journey unlocks this one."
            : "Os reforços reusam o que a Jornada já ensinou. Seguir na Jornada destrava este aqui."}
        </p>
        <Link
          to="/jornada"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white"
        >
          {en ? "Back to the Journey" : "Voltar à Jornada"}
        </Link>
      </Card>
    </div>
  );
}
