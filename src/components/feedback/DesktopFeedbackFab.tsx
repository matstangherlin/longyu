import { useLocation } from "react-router-dom";
import { IconChat } from "../ui/Icon";
import { useFeedbackUi } from "./FeedbackContext";
import { zLayerClass } from "../ui/layers";
import { cx } from "../ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";

/** FAB compacto no canto inferior direito — só desktop, fora do modo foco.
 *  Superfície 44×44 para não cruzar CTAs; o conteúdo reserva --app-feedback-fab-gutter. */
export function DesktopFeedbackFab() {
  const { pathname } = useLocation();
  const { openFeedback } = useFeedbackUi();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      data-desktop-feedback-fab=""
      onClick={() => openFeedback({ screen: pathname, route: pathname })}
      aria-label={t("feedback.send")}
      title={t("feedback.fabTitle")}
      className={cx(
        "fixed bottom-6 right-6 hidden h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface/95 text-ink-soft shadow-card backdrop-blur transition hover:border-accent-soft hover:bg-surface hover:text-ink lg:inline-flex",
        zLayerClass.feedbackFab
      )}
    >
      <IconChat width={16} height={16} />
    </button>
  );
}
