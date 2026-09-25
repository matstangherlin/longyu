import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import type { MessageKey } from "../../locales/pt-BR";
import { routerCanGoBack } from "../../lib/platform/backNavigation";
import {
  previousInAppPath,
  registerBackGuard,
  resolveSmartBack,
  runBackGuard,
  smartBackFallback,
} from "../../lib/navigation/smartBack";
import { IconChevron } from "../ui/Icon";

/** Nome do destino para o rótulo acessível ("Voltar para Perfil"). */
const TARGET_LABEL: Record<string, MessageKey> = {
  "/jornada": "navigation.journey",
  "/treino": "navigation.practice",
  "/perfil": "navigation.profile",
  "/mais": "navigation.more",
  "/cultura": "navigation.culture",
  "/ideogramas": "navigation.hanzi",
  "/ajustes": "navigation.settings",
  "/config": "navigation.settings",
};

/**
 * RC2.2.11 — a ÚNICA ação de voltar da interface. Botões de página, o botão
 * da casca e o VOLTAR do Android passam pela mesma `resolveSmartBack`.
 * Voltar no histórico só quando a trilha in-app confirma a entrada anterior.
 */
export function useSmartBack(): () => void {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    if (runBackGuard()) return;
    const stateBackTo = (location.state as { backTo?: unknown } | null)?.backTo;
    const backTo = stateBackTo ?? new URLSearchParams(location.search).get("from");
    const decision = resolveSmartBack({
      pathname: location.pathname,
      backTo,
      canGoBack: routerCanGoBack(),
      previousPath: previousInAppPath(location.pathname),
    });
    if (decision.kind === "history") navigate(-1);
    else if (decision.kind === "navigate") navigate(decision.to, { replace: decision.replace });
  }, [location.pathname, location.search, location.state, navigate]);
}

export function SmartBackButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const goBack = useSmartBack();
  const fallback = smartBackFallback(location.pathname);
  const targetKey = TARGET_LABEL[fallback];
  const label = targetKey ? t("navigation.backTo", { target: t(targetKey) }) : t("common.back");
  return (
    <button
      type="button"
      data-testid="smart-back"
      data-smart-back-fallback={fallback}
      aria-label={label}
      onClick={goBack}
      className={[
        "inline-flex min-h-11 items-center gap-1 rounded-full px-2 pr-3 text-sm font-semibold text-ink-soft transition hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <IconChevron width={16} height={16} className="rotate-180" aria-hidden />
      <span>{t("common.back")}</span>
    </button>
  );
}

/**
 * Enquanto `active`, voltar (botão da casca, Android) pergunta antes de sair.
 * Usado onde sair tem custo real (prova em andamento conta como tentativa).
 */
export function useBackGuard(active: boolean, message: string): void {
  useEffect(() => {
    if (!active) return undefined;
    return registerBackGuard(() => {
      const leave = typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(message) : true;
      return !leave;
    });
  }, [active, message]);
}
