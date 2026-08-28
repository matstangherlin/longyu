import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CloudLoginForm } from "../../components/auth/CloudLoginForm";
import { Mascot } from "../../components/brand/Mascot";
import { Card, Pill } from "../../components/ui/primitives";
import { useCloudSignIn } from "../../hooks/useCloudSignIn";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { BACKEND_UNAVAILABLE_MESSAGE } from "../../lib/auth/localAuthPolicy";
import { localizeUserMessage } from "../../i18n/errors";
import { useTranslation } from "../../i18n/useTranslation";
import { resolvePostAuthPath } from "../../lib/subscribeAuthRedirect";
import { confirmEmailPath } from "../../lib/authRedirect";
import { finalizeOnboardingPath } from "../../lib/auth/publicRoutes";
import { canEnterJourney, resolveSessionAudience } from "../../lib/auth/sessionAudience";
import { useStore } from "../../lib/store";
import { restoreCloudSessionIfPresent } from "../../services/cloudSyncCoordinator";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const postAuthPath = resolvePostAuthPath(searchParams);
  const createAccountHref = (() => {
    const params = new URLSearchParams();
    if (searchParams.get("intent") === "subscribe") params.set("intent", "subscribe");
    if (searchParams.get("next")) params.set("next", postAuthPath);
    if (searchParams.get("plan")) params.set("plan", searchParams.get("plan") ?? "");
    if (searchParams.get("migrate")) params.set("migrate", "1");
    const query = params.toString();
    return query ? `/comecar?${query}` : "/comecar";
  })();
  const { signIn } = useCloudSignIn();
  const activeAccount = useStore((s) => s.accounts[s.currentAccountId]);
  const setAccountSetupComplete = useStore((s) => s.setAccountSetupComplete);

  const [email, setEmail] = useState(activeAccount?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cloudEnabled = isSupabaseBackendEnabled();

  useEffect(() => {
    if (activeAccount?.email && !email) setEmail(activeAccount.email);
  }, [activeAccount?.email, email]);

  useEffect(() => {
    if (!cloudEnabled) return;
    void restoreCloudSessionIfPresent().then(async (result) => {
      if (!result.ok) return;
      const audience = await resolveSessionAudience();
      if (canEnterJourney(audience)) {
        setAccountSetupComplete(true);
        navigate(postAuthPath, { replace: true });
        return;
      }
      navigate(finalizeOnboardingPath(postAuthPath), { replace: true });
    });
  }, [cloudEnabled, navigate, postAuthPath, setAccountSetupComplete]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const formEmail = String(form.get("email") ?? email).trim();
    const formPassword = String(form.get("password") ?? password);
    setEmail(formEmail);
    setPassword(formPassword);
    if (!cloudEnabled) {
      setError(localizeUserMessage(BACKEND_UNAVAILABLE_MESSAGE));
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signIn(formEmail, formPassword);
    if (!result.ok) {
      setLoading(false);
      if (result.pendingConfirmation) {
        navigate(confirmEmailPath(formEmail), { replace: true });
        return;
      }
      setError(localizeUserMessage(result.message));
      return;
    }
    const audience = await resolveSessionAudience();
    setLoading(false);
    if (canEnterJourney(audience)) {
      setAccountSetupComplete(true);
      navigate(postAuthPath, { replace: true });
      return;
    }
    navigate(finalizeOnboardingPath(postAuthPath), { replace: true });
  }

  if (!cloudEnabled) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <Mascot size={96} variant="wave" />
        <h1 className="font-serif text-2xl font-semibold text-ink">{t("auth.loginUnavailable")}</h1>
        <p className="text-sm text-ink-soft">{t("errors.backendUnavailable")}</p>
        <Link to="/comecar" className="font-semibold text-accent hover:underline">
          {t("auth.backToStart")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col justify-center py-6 sm:py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <Mascot size={88} variant="wave" />
        </div>
        <Pill tone="accent">{t("auth.product")}</Pill>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-ink sm:text-3xl">{t("auth.signInTitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          {t("auth.signInLead")}
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <CloudLoginForm
          email={email}
          password={password}
          error={error}
          loading={loading}
          onEmail={(value) => {
            setEmail(value);
            setError(null);
          }}
          onPassword={(value) => {
            setPassword(value);
            setError(null);
          }}
          onSubmit={(event) => void handleSubmit(event)}
        />
      </Card>

      <div className="mt-5 flex flex-col items-center gap-2 text-center text-sm text-ink-soft">
        <p className="flex flex-wrap items-center justify-center gap-1">
          <span>{t("auth.firstTime")}</span>
          <Link
            to={createAccountHref}
            className="inline-flex min-h-11 items-center rounded-lg px-2 font-semibold text-accent hover:bg-accent-soft hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
          >
            {t("auth.signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
