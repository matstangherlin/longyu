import { useLocation } from "react-router-dom";
import { IconChat } from "../ui/Icon";
import { useFeedbackUi } from "./FeedbackContext";

/** Botão discreto no canto inferior direito — só em desktop, fora do modo foco. */
export function DesktopFeedbackFab() {
  const { pathname } = useLocation();
  const { openFeedback } = useFeedbackUi();

  return (
    <button
      type="button"
      onClick={() => openFeedback({ screen: pathname, route: pathname })}
      aria-label="Enviar feedback"
      className="fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-full border border-line bg-surface/95 px-3.5 py-2 text-xs font-semibold text-ink-soft shadow-card backdrop-blur transition hover:border-accent-soft hover:bg-surface hover:text-ink lg:inline-flex"
    >
      <IconChat width={15} height={15} />
      Feedback
    </button>
  );
}
