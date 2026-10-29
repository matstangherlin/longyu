import { useLayoutEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/primitives";
import { ConversationSceneStep } from "../lesson/ConversationSceneStep";
import { ALL_LESSONS, type LessonStep } from "../../data/journey";
import { conversationSceneStepFromId } from "../../data/conversationScenes";
import { isPlaceholderDisplayName } from "../../lib/displayName";
import { useStore } from "../../lib/store";

/**
 * Fixture DEV/QA da cena de conversa — atrás do QaFastPathGate, como as demais.
 *
 * A cena que interessa aqui é a de produção livre (`produce_reply`): o aluno escreve
 * ou fala a própria resposta, sem alternativas. Chegar nela pela Jornada
 * depende do planner adaptativo e do progresso, então o Playwright encontraria
 * a tela em execuções diferentes — ou não encontraria. Aqui ele encontra o
 * componente REAL, sempre no mesmo estado.
 *
 * `identificar-pessoa` é a cena padrão porque todos os seus turnos são
 * produção livre: é exatamente a tela que, na V4.9.5A, só aceitava digitação.
 *
 * Nome do aluno: cenas como `como-se-chama` pedem o nome antes do grafo
 * (AskLearnerName). No APK instrumentado a conta nasce com placeholder e o
 * nó `data-conversation-current-node` nunca aparece — então a fixture
 * materializa um nome real antes de montar a cena.
 */
const DEFAULT_SCENE = "identificar-pessoa";
const QA_LEARNER_NAME = "Matheus";

export function QaConversationScenePage() {
  const [params] = useSearchParams();
  const requested = params.get("scene") ?? DEFAULT_SCENE;
  const [status, setStatus] = useState<"open" | "done">("open");
  const [mistakes, setMistakes] = useState(0);
  const accountId = useStore((s) => s.currentAccountId);
  const accountName = useStore((s) => s.accounts[s.currentAccountId]?.name);
  const renameAccount = useStore((s) => s.renameAccount);

  useLayoutEffect(() => {
    if (!accountId || !isPlaceholderDisplayName(accountName)) return;
    renameAccount(accountId, QA_LEARNER_NAME);
  }, [accountId, accountName, renameAccount]);

  // O passo vem da Jornada, com fallback no catálogo canônico — o APK
  // instrumentado aponta sceneIds reais (`primeiro-cumprimento` /
  // `como-se-chama`) e não pode cair no default sem o grafo.
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
  const catalogStep = conversationSceneStepFromId(requested) as LessonStep | null;
  const sceneId = sceneSteps.has(requested)
    ? requested
    : catalogStep
      ? requested
      : DEFAULT_SCENE;
  const step =
    sceneSteps.get(sceneId) ??
    (conversationSceneStepFromId(sceneId) as LessonStep | null) ??
    undefined;
  const nameReady = !isPlaceholderDisplayName(accountName);

  return (
    <main className="min-h-[100dvh] bg-bg px-4 py-6" data-qa-scene-fixture>
      <Card className="mx-auto max-w-xl overflow-visible rounded-3xl p-4 shadow-lift sm:p-5">
        <div data-qa-scene-status={status} data-qa-scene-mistakes={String(mistakes)}>
          {!step ? (
            <p className="text-sm text-ink-soft">Cena {sceneId} não está em nenhuma lição.</p>
          ) : !nameReady ? (
            <p className="text-sm text-ink-soft" data-qa-scene-seeding-name>
              Preparando cena…
            </p>
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
