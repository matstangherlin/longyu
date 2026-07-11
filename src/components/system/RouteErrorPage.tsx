import { useEffect } from "react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { Button } from "../ui/primitives";
import { Mascot } from "../brand/Mascot";
import { reportAppErrorFromUnknown } from "../../services/errorReportingService";

function describeRouteError(error: unknown): { title: string; message: string; kind: string } {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        kind: "not_found",
        title: "Página não encontrada",
        message: "Esta rota não existe no Longyu.",
      };
    }
    return {
      kind: "route_error",
      title: "Não foi possível abrir esta página",
      message: error.statusText || `Erro ${error.status}`,
    };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("lesson") || msg.includes("lição") || msg.includes("lessonid")) {
      return {
        kind: "invalid_lesson",
        title: "Lição não encontrada",
        message: "O identificador desta lição é inválido ou ainda não está disponível.",
      };
    }
    if (msg.includes("story") || msg.includes("história") || msg.includes("imers")) {
      return {
        kind: "invalid_story",
        title: "História não encontrada",
        message: "Esta história interativa não existe ou foi removida.",
      };
    }
    if (msg.includes("sync") || msg.includes("sincroniz")) {
      return {
        kind: "sync_error",
        title: "Erro de sincronização",
        message: "Não conseguimos sincronizar agora. Seu progresso local continua salvo.",
      };
    }
    return {
      kind: "route_throw",
      title: "Algo deu errado nesta página",
      message: error.message,
    };
  }

  return {
    kind: "unknown",
    title: "Algo deu errado",
    message: "Não foi possível carregar esta tela.",
  };
}

export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { title, message, kind } = describeRouteError(error);

  useEffect(() => {
    reportAppErrorFromUnknown(error, { source: "route", route: window.location.pathname });
  }, [error]);

  return (
    <div className="theme-transition flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-surface p-6 text-center shadow-lift">
        <div className="mx-auto flex justify-center">
          <Mascot size={80} variant="wave" />
        </div>
        <h1 className="mt-4 font-serif text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{message}</p>
        <p className="mt-1 text-xs text-ink-faint">Código: {kind}</p>
        <div className="mt-5 grid gap-2">
          <Button size="lg" className="w-full" onClick={() => navigate(0)}>
            Tentar novamente
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/jornada", { replace: true })}>
            Voltar à Jornada
          </Button>
        </div>
      </div>
    </div>
  );
}
