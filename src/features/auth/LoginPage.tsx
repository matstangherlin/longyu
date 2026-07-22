import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CloudLoginForm } from "../../components/auth/CloudLoginForm";
import { Mascot } from "../../components/brand/Mascot";
import { Button, Card, Pill } from "../../components/ui/primitives";
import { useCloudSignIn } from "../../hooks/useCloudSignIn";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { useStore } from "../../lib/store";
import { restoreCloudSessionIfPresent } from "../../services/cloudSyncCoordinator";

function accountAuthMode(account?: { authMode?: string; email?: string }) {
  return account?.authMode ?? (account?.email ? "cloud_pending" : "local");
}

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useCloudSignIn();
  const activeAccount = useStore((s) => s.accounts[s.currentAccountId]);
  const setAccountSetupComplete = useStore((s) => s.setAccountSetupComplete);
  const createAccount = useStore((s) => s.createAccount);
  const authMode = accountAuthMode(activeAccount);

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
    if (authMode === "cloud") {
      navigate("/jornada", { replace: true });
      return;
    }
    void restoreCloudSessionIfPresent().then((result) => {
      if (result.ok) {
        setAccountSetupComplete(true);
        navigate("/jornada", { replace: true });
      }
    });
  }, [authMode, cloudEnabled, navigate, setAccountSetupComplete]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const formEmail = String(form.get("email") ?? email).trim();
    const formPassword = String(form.get("password") ?? password);
    setEmail(formEmail);
    setPassword(formPassword);
    if (!cloudEnabled) {
      setError("Backend em nuvem não está ativo neste ambiente.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signIn(formEmail, formPassword);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate("/jornada", { replace: true });
  }

  if (!cloudEnabled) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <Mascot size={96} variant="wave" />
        <h1 className="font-serif text-2xl font-semibold text-ink">Login indisponível</h1>
        <p className="text-sm text-ink-soft">O backend em nuvem não está configurado neste ambiente.</p>
        <Button onClick={() => navigate("/conta")}>Continuar no app</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col justify-center py-6 sm:py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <Mascot size={88} variant="wave" />
        </div>
        <Pill tone="accent">Longyu</Pill>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-ink sm:text-3xl">Entrar na conta</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Acesse sua conta e continue de onde parou — sem passar pelo tutorial.
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
          <span>Primeira vez aqui?</span>
          <Link to="/conta" className="inline-flex min-h-11 items-center rounded-lg px-2 font-semibold text-accent hover:bg-accent-soft hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45">
            Criar conta
          </Link>
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            createAccount(activeAccount?.name?.trim() || "Aluno Longyu");
            navigate("/jornada", { replace: true });
          }}
        >
          Continuar sem login
        </Button>
      </div>
    </div>
  );
}
