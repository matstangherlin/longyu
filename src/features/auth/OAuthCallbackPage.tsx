/**
 * RC2.3.8 — /auth/callback: the ONE place an OAuth return is handled on web/PWA
 * (Android deep links call the same router). Never stays on "Entrando…":
 * timeout → error with "Tentar novamente" / "Usar outro método".
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button, Card } from "../../components/ui/primitives";
import { completeOAuthCallback, OAUTH_CALLBACK_TIMEOUT_MS, takeNativeCallbackUrl, type CallbackOutcome } from "../../services/oauthService";
import { inspectProgressClaim, syncAuthSessionProgress } from "../../services/cloudSyncCoordinator";
import { authErrorCopyPt } from "../../lib/auth/authError";
import { canEnterJourney, resolveSessionAudience } from "../../lib/auth/sessionAudience";
import { finalizeOnboardingPath } from "../../lib/auth/publicRoutes";
import { useStore } from "../../lib/store";
import { recordTechEvent } from "../../lib/techEvents";

type Phase = "working" | "ask_claim" | "error";

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const setAccountSetupComplete = useStore((s) => s.setAccountSetupComplete);
  const [phase, setPhase] = useState<Phase>("working");
  const [outcome, setOutcome] = useState<CallbackOutcome | null>(null);
  const claimRef = useRef<string | undefined>(undefined);
  const started = useRef(false);

  async function finish(returnTo: string, options: { keepLocalParked?: boolean } = {}) {
    setPhase("working");
    recordTechEvent("progress_claim_started", { parked: Boolean(options.keepLocalParked) });
    await syncAuthSessionProgress({ ...options, claimId: claimRef.current });
    recordTechEvent("progress_claim_completed", { parked: Boolean(options.keepLocalParked) });
    const audience = await resolveSessionAudience();
    if (canEnterJourney(audience)) {
      setAccountSetupComplete(true);
      navigate(returnTo, { replace: true });
    } else {
      navigate(finalizeOnboardingPath(returnTo), { replace: true });
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const watchdog = window.setTimeout(() => setPhase((p) => (p === "working" ? "error" : p)), OAUTH_CALLBACK_TIMEOUT_MS + 5000);
    void (async () => {
      const result = await completeOAuthCallback(takeNativeCallbackUrl() ?? window.location.href);
      setOutcome(result);
      if (result.status === "duplicate") return; // the first handler is navigating
      if (result.status === "error") {
        setPhase("error");
        return;
      }
      if (result.status === "linked") {
        navigate(result.returnTo, { replace: true });
        return;
      }
      const claim = await inspectProgressClaim();
      claimRef.current = claim.id;
      if (claim.case?.action === "ASK") {
        setPhase("ask_claim");
        return;
      }
      await finish(result.returnTo);
    })().finally(() => window.clearTimeout(watchdog));
    return () => window.clearTimeout(watchdog);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per callback
  }, []);

  const returnTo = outcome && "returnTo" in outcome ? outcome.returnTo : "/jornada";

  if (phase === "ask_claim") {
    return (
      <div className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col justify-center gap-4 py-6" data-testid="progress-claim">
        <Card className="p-5">
          <h1 className="font-serif text-xl font-semibold text-ink">Salvar este progresso na sua conta?</h1>
          <p className="mt-2 text-sm text-ink-soft">Encontramos progresso neste dispositivo.</p>
          <div className="mt-4 grid gap-2">
            <Button className="w-full" onClick={() => void finish(returnTo)} data-testid="progress-claim-save">
              Salvar na conta
            </Button>
            <Button variant="outline" className="w-full" onClick={() => void finish(returnTo, { keepLocalParked: true })} data-testid="progress-claim-later">
              Agora não
            </Button>
          </div>
          <p className="mt-3 text-xs text-ink-faint">Nada é apagado: se escolher "Agora não", o progresso deste aparelho fica guardado.</p>
        </Card>
      </div>
    );
  }

  if (phase === "error") {
    const error = outcome?.status === "error" ? outcome.error : null;
    const copy = error ? authErrorCopyPt(error) : { title: "Não foi possível concluir o acesso.", body: "Tente novamente ou use outro método.", actions: ["retry", "other_method"] };
    return (
      <div className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col justify-center gap-4 py-6" data-testid="oauth-error">
        <Card className="p-5">
          <h1 className="font-serif text-xl font-semibold text-ink">{copy.title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{copy.body}</p>
          <div className="mt-4 grid gap-2">
            <Button className="w-full" onClick={() => navigate("/login", { replace: true })}>
              Tentar novamente
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/login?metodo=email", { replace: true })}>
              Usar outro método
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center" role="status" aria-live="polite" data-testid="oauth-working">
      <Mascot size={72} variant="wave" />
      <p className="text-sm text-ink-soft">Entrando…</p>
    </div>
  );
}
