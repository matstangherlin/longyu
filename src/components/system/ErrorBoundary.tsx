import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Card } from "../ui/primitives";
import { IconHome, IconRefresh } from "../ui/Icon";

/**
 * Rede de segurança contra tela branca.
 *
 * O React desmonta a árvore inteira quando um render lança sem um error
 * boundary por perto — o resultado é uma tela branca sem saída (foi o que o
 * aluno via ao errar tudo numa lição). Este boundary captura o erro, mostra
 * uma recuperação no estilo do site (tentar de novo / voltar para a Jornada) e
 * preserva o progresso, que já fica salvo no store/localStorage.
 *
 * `resetKey`: ao mudar (ex.: a rota atual), o boundary limpa o erro sozinho, de
 * modo que navegar pela barra inferior sai de uma tela quebrada sem recarregar.
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Quando muda, o boundary volta a tentar renderizar (ex.: pathname da rota). */
  resetKey?: string | number;
  /** Centraliza em tela cheia (uso na raiz do app, fora do shell). */
  fullScreen?: boolean;
  /** Rótulo curto do trecho protegido, só para o log de diagnóstico. */
  area?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Diagnóstico: fica no console (e nas ferramentas de dev) sem vazar nada
    // para o aluno. Ajuda a rastrear a origem real de um crash raro.
    console.error(`[ErrorBoundary${this.props.area ? `:${this.props.area}` : ""}]`, error, info.componentStack);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    // Trocou de rota (ou outra chave) depois do erro? Tenta renderizar de novo.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  private handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const isDev = Boolean(import.meta.env?.DEV);
    return (
      <div
        className={[
          "mx-auto flex w-full max-w-xl flex-col justify-center px-4",
          this.props.fullScreen ? "min-h-screen" : "min-h-[calc(100dvh-8rem)] py-6",
        ].join(" ")}
      >
        <Card className="p-6 text-center sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <IconRefresh width={30} height={30} />
          </div>
          <h1 className="mt-5 font-serif text-2xl font-semibold text-ink sm:text-3xl">
            Algo saiu do prumo
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">
            Um erro inesperado interrompeu esta tela. Seu progresso continua salvo.
            Tente de novo ou volte para a Jornada.
          </p>

          {isDev && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-surface-2 px-3 py-2 text-left text-[11px] leading-5 text-wrong">
              {this.state.error.message}
            </pre>
          )}

          <div className="mt-6 grid gap-2">
            <Button size="lg" className="w-full" onClick={this.handleRetry}>
              <IconRefresh width={17} height={17} /> Tentar novamente
            </Button>
            <a href="/jornada" className="block">
              <Button variant="outline" className="w-full">
                <IconHome width={17} height={17} /> Voltar para a Jornada
              </Button>
            </a>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-1 py-1 text-sm font-medium text-ink-faint transition hover:text-ink"
            >
              Recarregar o app
            </button>
          </div>
        </Card>
      </div>
    );
  }
}
