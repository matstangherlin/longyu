import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/primitives";
import { Mascot } from "../../components/brand/Mascot";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { BACKEND_UNAVAILABLE_MESSAGE } from "../../lib/auth/localAuthPolicy";

export function LegacyLocalMigrationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/jornada";
  const loginHref = `/login?next=${encodeURIComponent(next)}&migrate=1`;
  const signupHref = `/comecar?migrate=1`;
  const backend = isSupabaseBackendEnabled();

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center text-center">
      <Mascot size={112} variant="wave" />
      <h1 className="mt-5 font-serif text-3xl font-semibold text-ink">Salve seu progresso para continuar</h1>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        Encontramos estudo salvo neste dispositivo. Para entrar na Jornada, associe esse progresso a uma conta Longyu.
        Nada é apagado antes da confirmação no servidor.
      </p>
      {!backend && <p className="mt-3 text-sm text-ink-soft">{BACKEND_UNAVAILABLE_MESSAGE}</p>}
      <Button size="lg" className="mt-6 w-full" onClick={() => navigate(signupHref)}>
        Criar conta
      </Button>
      <Link
        to={loginHref}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-line text-sm font-semibold text-ink"
      >
        Já tenho uma conta
      </Link>
    </div>
  );
}
