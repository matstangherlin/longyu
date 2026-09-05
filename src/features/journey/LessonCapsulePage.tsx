import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ButtonLink, Card } from "../../components/ui/primitives";
import { getLessonCapsule } from "../../data/lessonCapsules";
import { JOURNEY_NODES } from "../../data/journeyOrchestrator";
import { useTranslation } from "../../i18n/useTranslation";
import { completeJourneyNode } from "../../lib/journeyNodeProgress";
import { LessonCapsulePlayer } from "./capsule/LessonCapsulePlayer";

/**
 * A rota ficou fina de propósito: resolve a cápsula, decide o que acontece na
 * conclusão e entrega o resto ao player unificado (Parte G). A cápsula de
 * Pinyin continua `ANIMATED_CAPSULE` e com o mesmo conteúdo — a Parte V pede
 * migrá-la para o player, não trocá-la por um vídeo que não existe.
 */
export function LessonCapsulePage() {
  const { capsuleId = "" } = useParams();
  const navigate = useNavigate();
  const { instructionLocale } = useTranslation();
  const capsule = useMemo(() => getLessonCapsule(decodeURIComponent(capsuleId)), [capsuleId]);

  if (!capsule) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <Card className="p-6 text-center">
          <h1 className="font-serif text-2xl font-semibold text-ink">
            {instructionLocale === "en" ? "Lesson capsule unavailable" : "Cápsula indisponível"}
          </h1>
          <ButtonLink className="mt-5 w-full" to="/jornada">
            {instructionLocale === "en" ? "Back to Journey" : "Voltar à Jornada"}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const finish = () => {
    const node = JOURNEY_NODES.find(
      (candidate) => candidate.type === "LESSON_CAPSULE" && candidate.sourceId === capsule.id
    );
    // Progresso auxiliar local-only (contrato da V4.9.1): concluir a cápsula
    // decora a Jornada e nunca toca em mastery, SRS ou progresso core.
    if (node) completeJourneyNode(node.id);
    navigate(`/licao/${capsule.topicId}`);
  };

  return (
    <main
      className="mx-auto max-w-xl px-1 py-4 sm:py-7"
      data-testid="lesson-capsule"
      data-capsule-id={capsule.id}
    >
      <LessonCapsulePlayer capsule={capsule} locale={instructionLocale} onComplete={finish} />
    </main>
  );
}
