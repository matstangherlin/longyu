import { MandarinText } from "./MandarinText";
import { VisualConceptImage } from "./VisualConceptImage";
import { VisualSceneImage } from "./VisualSceneImage";
import { SpeakButton } from "../ui/SpeakButton";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import type { VisualSceneId } from "../../data/visualScenes";
import type { VisualConceptId } from "../../data/visualVocabulary";

interface VisualExerciseFeedbackProps {
  correct: boolean;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  conceptId?: VisualConceptId | string;
  visualSceneId?: VisualSceneId | string;
  wrongPrefix?: string;
}

export function VisualExerciseFeedback({
  correct,
  hanzi,
  pinyin,
  meaningPt,
  conceptId,
  visualSceneId,
  wrongPrefix,
}: VisualExerciseFeedbackProps) {
  const wrongMessage =
    wrongPrefix ?? `Esta imagem representa ${meaningPt}: ${hanzi}, ${formatPinyinForDisplay(pinyin)}.`;

  return (
    <div
      className={[
        "mt-4 rounded-2xl border px-4 py-4",
        correct ? "border-[rgb(var(--good)/0.25)] bg-[rgb(var(--good)/0.08)]" : "border-wrong-soft bg-wrong-soft",
      ].join(" ")}
    >
      <p className="text-sm font-semibold text-ink">{correct ? "Correto!" : "Quase — reveja a associação."}</p>
      {!correct && <p className="mt-1 text-sm text-ink-soft">{wrongMessage}</p>}

      <div className="mt-4 flex flex-col items-center gap-3">
        {visualSceneId ? (
          <VisualSceneImage sceneId={visualSceneId} size="md" />
        ) : conceptId ? (
          <VisualConceptImage conceptId={conceptId} size="md" />
        ) : null}
        <MandarinText hanzi={hanzi} pinyin={pinyin} size="md" align="center" />
        <p className="text-sm text-ink-soft">{meaningPt}</p>
        <SpeakButton text={hanzi} size="md" label="Ouvir" />
      </div>
    </div>
  );
}
