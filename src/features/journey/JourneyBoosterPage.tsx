import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Card, Button } from "../../components/ui/primitives";
import { conversationSceneStepFromId } from "../../data/conversationScenes";
import { FIRST_CONVERSATION_NODE, getJourneyNode } from "../../data/journeyOrchestrator";
import { completeJourneyNode } from "../../lib/journeyNodeProgress";
import { useTranslation } from "../../i18n/useTranslation";
import { ConversationSceneStep } from "../lesson/ConversationSceneStep";

const CJK_OPTION = /[\u3400-\u9fff]/u;
const CONTROLLED_UNKNOWN_DISTRACTORS = ["…", "？", "—"] as const;

/**
 * The canonical scene is reused, but its early Journey presentation must not
 * teach 谢谢/再见/不客气 accidentally through distractors. Meaning choices are
 * kept because they do not introduce a new Mandarin target; unknown CJK
 * replies become language-neutral controlled distractors.
 */
function constrainSceneToKnownTargets(step: ReturnType<typeof conversationSceneStepFromId>) {
  if (!step?.nodes) return step;
  return {
    ...step,
    nodes: step.nodes.map((node) => {
      const interaction = node.interaction;
      if (!interaction?.options) return node;
      let replacementIndex = 0;
      return {
        ...node,
        interaction: {
          ...interaction,
          options: interaction.options.map((option) => {
            if (option === interaction.correctAnswer || !CJK_OPTION.test(option)) return option;
            const replacement = CONTROLLED_UNKNOWN_DISTRACTORS[
              replacementIndex % CONTROLLED_UNKNOWN_DISTRACTORS.length
            ];
            replacementIndex += 1;
            return replacement;
          }),
        },
      };
    }),
  };
}

/** Thin Journey wrapper around an existing engine; it owns no learning state. */
export function JourneyBoosterPage() {
  const { nodeId = "" } = useParams();
  const navigate = useNavigate();
  const { instructionLocale } = useTranslation();
  const [done, setDone] = useState(false);
  const node = getJourneyNode(decodeURIComponent(nodeId));
  const step = useMemo(
    () => node?.type === "CONVERSATION" && node.sourceId
      ? constrainSceneToKnownTargets(conversationSceneStepFromId(node.sourceId))
      : null,
    [node]
  );
  const copy = instructionLocale === "en"
    ? {
        eyebrow: "Journey booster",
        title: "Your first conversation",
        body: "You already know 你好. Now use it with Mei in a short guided exchange.",
        complete: "Conversation complete",
        back: "Back to Journey",
        unavailable: "This booster is not available yet.",
      }
    : {
        eyebrow: "Reforço da Jornada",
        title: "Sua primeira conversa",
        body: "Você já conhece 你好. Agora use o cumprimento com Mei numa troca guiada curta.",
        complete: "Conversa concluída",
        back: "Voltar à Jornada",
        unavailable: "Este reforço ainda não está disponível.",
      };

  if (!node || node.id !== FIRST_CONVERSATION_NODE.id || !step) {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center">
        <p className="text-ink-soft">{copy.unavailable}</p>
        <Link className="mt-4 inline-block font-semibold text-accent" to="/jornada">{copy.back}</Link>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-xl p-7 text-center" data-testid="journey-conversation-complete">
        <Mascot size={84} variant="celebrate" />
        <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">{copy.complete}</h1>
        <p className="mt-2 text-sm text-ink-soft">{copy.body}</p>
        <Button className="mt-6 w-full" onClick={() => navigate("/jornada")}>{copy.back}</Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-accent-soft bg-accent-soft/30 p-4">
        <Mascot size={58} variant="wave" />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{copy.eyebrow}</div>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">{copy.title}</h1>
          <p className="mt-1 text-sm leading-6 text-ink-soft">{copy.body}</p>
        </div>
      </div>
      <Card className="p-4 sm:p-6" data-testid="journey-conversation-booster">
        <ConversationSceneStep
          step={step}
          onDone={() => {
            completeJourneyNode(node.id);
            setDone(true);
          }}
          onSkip={() => navigate("/jornada")}
        />
      </Card>
    </div>
  );
}
