import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, ButtonLink, Card, PageHeader } from "../../components/ui/primitives";
import { IconCheck } from "../../components/ui/Icon";
import { acceptFamilyInvite, type FamilyErrorCode } from "../../services/familyService";
import { loginNextPath } from "../../lib/auth/publicRoutes";
import { useTranslation } from "../../i18n/useTranslation";

const ERROR_KEYS: Record<FamilyErrorCode, string> = {
  UNAUTHENTICATED: "familia.acceptLoginFirst",
  NO_FAMILY: "familia.errorNoFamily",
  INVALID_EMAIL: "familia.errorInvalidEmail",
  INVITE_ALREADY_PENDING: "familia.errorInvitePending",
  FAMILY_FULL: "familia.errorFamilyFull",
  INVALID_INVITE: "familia.errorInvalidInvite",
  ALREADY_IN_ANOTHER_FAMILY: "familia.errorAlreadyInFamily",
  OWNER_CANNOT_LEAVE: "familia.errorOwnerCannotLeave",
  BACKEND_OFF: "familia.errorBackendOff",
  UNKNOWN: "familia.errorUnknown",
};

/**
 * Tela de aceite do convite.
 *
 * O token vem da URL e não sai dela: não é copiado para o estado global, para
 * o armazenamento local nem para nenhum evento. Ele vai uma vez para a RPC,
 * que compara por hash, e acabou.
 */
export function FamilyInvitePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token = "" } = useParams<{ token: string }>();
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<FamilyErrorCode | null>(null);

  async function handleAccept() {
    setState("working");
    setError(null);
    const result = await acceptFamilyInvite(token);
    if (!result.ok) {
      setError(result.code);
      setState("idle");
      return;
    }
    setState("done");
  }

  return (
    <div className="mx-auto max-w-md space-y-4" data-family-invite-page>
      <PageHeader eyebrow={t("familia.eyebrow")} title={t("familia.acceptTitle")} desc={t("familia.acceptLead")} />
      <Card className="p-4">
        {state === "done" ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-good">
              <IconCheck width={14} height={14} /> {t("familia.accepted")}
            </p>
            <Button className="w-full" onClick={() => navigate("/jornada")}>
              {t("familia.goToJourney")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-5 text-ink-soft">{t("familia.privacy")}</p>
            {error && <p className="text-xs text-bad">{t(ERROR_KEYS[error])}</p>}
            <Button className="w-full" disabled={state === "working" || token.length === 0} onClick={() => void handleAccept()}>
              {t("familia.acceptCta")}
            </Button>
            {error === "UNAUTHENTICATED" && (
              // Com o next, o token sobrevive ao login: a pessoa volta para
              // esta mesma URL em vez de cair no onboarding sem o convite.
              <ButtonLink to={loginNextPath(`/familia/convite/${token}`)} variant="outline" className="w-full">
                {t("auth.signIn")}
              </ButtonLink>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
