import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ButtonLink, Card } from "../../components/ui/primitives";
import { slotForCapsuleId } from "../../data/coreInstructionSlots";
import { resolveLessonCapsule } from "../../data/lessonCatalog";
import { JOURNEY_NODES } from "../../data/journeyOrchestrator";
import { isLessonCatalogSettling, useLessonCatalogStatus } from "../../hooks/useLessonCatalog";
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
  const catalogStatus = useLessonCatalogStatus();
  const capsule = useMemo(
    () => resolveLessonCapsule(decodeURIComponent(capsuleId)),
    // O catálogo publicado chega depois do primeiro render; sem ele na
    // dependência, uma aula recém-publicada só apareceria ao recarregar.
    [capsuleId, catalogStatus]
  );

  // Enquanto o catálogo não assentou, "não existe" seria uma mentira com
  // aparência de erro: a aula pode estar a um fetch de distância.
  if (!capsule && isLessonCatalogSettling(catalogStatus)) {
    return (
      <div className="mx-auto max-w-lg py-8" data-testid="lesson-capsule-loading">
        <Card className="p-6 text-center text-sm text-ink-soft">
          {instructionLocale === "en" ? "Loading the lesson…" : "Carregando a aula…"}
        </Card>
      </div>
    );
  }

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
    // Os slots de instrução da V4.9.3 não moram em `JOURNEY_NODES` — eles são
    // currículo, não orquestração de reforço. Sem procurá-los aqui, concluir
    // uma aula da fundação não marcava nada: a trilha nunca mostrava "Feito" e
    // o handoff do dragão nunca aparecia, porque ele depende dessa marca.
    const slot = slotForCapsuleId(capsule.id);
    const node = slot
      ? { id: `node:${slot.id}` }
      : JOURNEY_NODES.find(
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
