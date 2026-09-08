import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/primitives";
import { ConversationSceneStep } from "../lesson/ConversationSceneStep";
import { ALL_LESSONS, type LessonStep } from "../../data/journey";

/**
 * Fixture DEV/QA da cena de conversa — atrás do QaFastPathGate, como as demais.
 *
 * A cena que interessa aqui é a de PRODUÇÃO (`produce_reply`): o aluno escreve
 * ou fala a própria resposta, sem alternativas. Chegar nela pela Jornada
 * depende do planner adaptativo e do progresso, então o Playwright encontraria
 * a tela em execuções diferentes — ou não encontraria. Aqui ele encontra o
 * componente REAL, sempre no mesmo estado.
 *
 * `identificar-pessoa` é a cena padrão porque todos os seus turnos são
 * produção livre: é exatamente a tela que, na V4.9.5A, só aceitava digitação.
 */
const DEFAULT_SCENE = "identificar-pessoa";

export function QaConversationScenePage() {
  const [params] = useSearchParams();
  const requested = params.get("scene") ?? DEFAULT_SCENE;
  const [status, setStatus] = useState<"open" | "done">("open");
  const [mistakes, setMistakes] = useState(0);

  // O passo vem da Jornada, não de uma cópia montada aqui: a fixture precisa
  // mostrar exatamente o que o aluno encontra na lição.
  const sceneSteps = useMemo(() => {
    const found = new Map<string, LessonStep>();
    for (const lesson of ALL_LESSONS) {
      for (const step of lesson.steps ?? []) {
        if (step.kind === "conversation_scene" && step.sceneId && !found.has(step.sceneId)) {
          found.set(step.sceneId, step);
        }
      }
    }
    return found;
  }, []);
  const sceneId = sceneSteps.has(requested) ? requested : DEFAULT_SCENE;
  const step = sceneSteps.get(sceneId);

  return (
    <main className="min-h-[100dvh] bg-bg px-4 py-6" data-qa-scene-fixture>
      <Card className="mx-auto max-w-xl overflow-visible rounded-[24px] p-4 shadow-lift sm:p-5">
        <div data-qa-scene-status={status} data-qa-scene-mistakes={String(mistakes)}>
          {!step ? (
            <p className="text-sm text-ink-soft">Cena {sceneId} não está em nenhuma lição.</p>
          ) : (
          <ConversationSceneStep
            key={sceneId}
            step={step}
            onDone={() => setStatus("done")}
            onSkip={() => setStatus("done")}
            onMistake={() => setMistakes((count) => count + 1)}
          />
          )}
        </div>
      </Card>
    </main>
  );
}
