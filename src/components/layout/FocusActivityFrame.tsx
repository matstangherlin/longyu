import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Card } from "../ui/primitives";
import { IconX } from "../ui/Icon";
import { useFocusActivity } from "../../lib/focusActivity";
import { isTopModal, popModal, pushModal } from "../../lib/modalStack";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * RC2.2.25 — moldura de ATIVIDADE (Activity/Focus mode) para treinos que
 * vivem dentro de um hub (Pinyin Lab, Fala…). O hub mostra só o cartão
 * [Começar]; depois do toque a atividade ocupa a tela: X, título, atividade.
 * Sem TopBar, TabBar, logo, contadores ou streak (o AppShell esconde via
 * `useFocusActivity`). VOLTAR/Escape sai da atividade, não do app.
 */
export function FocusActivityFrame({
  title,
  testId,
  onExit,
  children,
}: {
  title: string;
  testId: string;
  onExit: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  useFocusActivity(true);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  useEffect(() => {
    const id = pushModal("focus-activity");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !isTopModal(id)) return;
      event.preventDefault();
      onExitRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      popModal(id, "focus-activity");
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-bg"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-focus-activity-frame={testId}
    >
      <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-3 pt-[calc(var(--app-safe-top)+0.5rem)]">
        <button
          type="button"
          onClick={onExit}
          aria-label={t("common.close")}
          data-testid={`${testId}-exit`}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
        >
          <IconX width={20} height={20} />
        </button>
        <span className="min-w-0 truncate text-sm font-semibold text-ink-soft">{title}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(var(--app-safe-bottom)+1rem)] pt-2">
        <div className="mx-auto w-full max-w-xl">{children}</div>
      </div>
    </div>
  );
}

/**
 * Hub → [Começar] → atividade em foco. `autoStart` para quem já chegou com
 * intenção (nó da Jornada). Sair volta ao cartão do hub.
 */
export function FocusActivityLauncher({
  title,
  desc,
  testId,
  autoStart = false,
  children,
}: {
  title: string;
  desc?: string;
  testId: string;
  autoStart?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [started, setStarted] = useState(autoStart);
  if (started) {
    return (
      <FocusActivityFrame title={title} testId={testId} onExit={() => setStarted(false)}>
        {children}
      </FocusActivityFrame>
    );
  }
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" data-focus-activity-hub={testId}>
      <div className="min-w-0">
        <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
        {desc ? <p className="mt-0.5 text-sm text-ink-soft">{desc}</p> : null}
      </div>
      <Button className="w-full sm:w-auto" onClick={() => setStarted(true)} data-testid={`${testId}-start`}>
        {t("common.startActivity")}
      </Button>
    </Card>
  );
}
