import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button } from "../../components/ui/primitives";
import { LanguageSwitcher } from "../../components/i18n/LanguageSwitcher";
import {
  FINALIZE_ONBOARDING_BUSY,
  FINALIZE_ONBOARDING_HEADING,
  FINALIZE_ONBOARDING_MISSING_DRAFT,
  FINALIZE_ONBOARDING_TEMP_ERROR,
  FINALIZE_REDO_PLACEMENT_LABEL,
  FINALIZE_RETRY_LABEL,
} from "../../lib/auth/onboardingCopy";
import { redoPlacementPath } from "../../lib/auth/publicRoutes";
import { canEnterJourney, resolveSessionAudience } from "../../lib/auth/sessionAudience";
import { resolvePostAuthPath } from "../../lib/subscribeAuthRedirect";
import { completeAuthenticatedOnboarding } from "../../services/postAuthOnboarding";
import { localizeUserMessage } from "../../i18n/errors";
import { useTranslation } from "../../i18n/useTranslation";

type FinalizeState = "busy" | "ready" | "missing_draft" | "temp_error";

export function FinalizeCadastroPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const postAuthPath = resolvePostAuthPath(searchParams, "/jornada");
  const [state, setState] = useState<FinalizeState>("busy");
  const [message, setMessage] = useState(FINALIZE_ONBOARDING_BUSY);

  const run = useCallback(async () => {
    setState("busy");
    setMessage(t("onboarding.pendingBusy"));
    const audience = await resolveSessionAudience();
    if (canEnterJourney(audience)) {
      navigate(postAuthPath, { replace: true });
      return;
    }
    if (audience === "anonymous") {
      navigate("/login", { replace: true });
      return;
    }
    if (audience === "legacy") {
      navigate("/salvar-progresso", { replace: true });
      return;
    }

    const result = await completeAuthenticatedOnboarding();
    if (result.ok) {
      navigate(postAuthPath, { replace: true });
      return;
    }
    if (result.code === "missing_draft") {
      setState("missing_draft");
      setMessage(localizeUserMessage(result.message || FINALIZE_ONBOARDING_MISSING_DRAFT));
      return;
    }
    setState("temp_error");
    setMessage(localizeUserMessage(result.message || FINALIZE_ONBOARDING_TEMP_ERROR));
  }, [navigate, postAuthPath, t]);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col items-center justify-center text-center" data-testid="finalize-onboarding">
      <div className="mb-4 self-end">
        <LanguageSwitcher compact id="finalize-interface-locale" />
      </div>
      <Mascot size={96} variant="wave" />
      {state === "busy" && (
        <>
          <h1 className="mt-5 font-serif text-2xl font-semibold text-ink">{t("onboarding.pendingBusy") || FINALIZE_ONBOARDING_BUSY}</h1>
          <p className="mt-3 text-sm text-ink-soft">{t("onboarding.pendingBusyLead")}</p>
        </>
      )}
      {state === "temp_error" && (
        <>
          <h1 className="mt-5 font-serif text-2xl font-semibold text-ink">{t("onboarding.pendingTitle") || FINALIZE_ONBOARDING_HEADING}</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{message}</p>
          <Button size="lg" className="mt-6 w-full" onClick={() => void run()}>
            {t("onboarding.retry") || FINALIZE_RETRY_LABEL}
          </Button>
        </>
      )}
      {state === "missing_draft" && (
        <>
          <h1 className="mt-5 font-serif text-2xl font-semibold text-ink">{t("onboarding.pendingTitle") || FINALIZE_ONBOARDING_HEADING}</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{message}</p>
          <Button size="lg" className="mt-6 w-full" onClick={() => void run()}>
            {t("onboarding.retry") || FINALIZE_RETRY_LABEL}
          </Button>
          <Link
            to={redoPlacementPath()}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-line text-sm font-semibold text-ink"
          >
            {t("onboarding.redoPlacement") || FINALIZE_REDO_PLACEMENT_LABEL}
          </Link>
        </>
      )}
    </div>
  );
}
