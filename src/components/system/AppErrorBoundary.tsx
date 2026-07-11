import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui/primitives";
import { Mascot } from "../brand/Mascot";
import { reportAppError } from "../../services/errorReportingService";

interface AppErrorBoundaryProps {
  children: ReactNode;
  onNavigateJourney?: () => void;
}

interface AppErrorBoundaryState {
  error: Error | null;
  reportPrepared: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null, reportPrepared: false };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void reportAppError({
      errorName: error.name || "Error",
      message: error.message || "Erro de renderização",
      stack: [error.stack, info.componentStack].filter(Boolean).join("\n"),
      source: "boundary",
    }).then((result) => {
      if (result.reported || result.queued) {
        this.setState({ reportPrepared: true });
      }
    });
  }

  private resetBoundary = (): void => {
    this.setState({ error: null, reportPrepared: false });
  };

  private goJourney = (): void => {
    if (this.props.onNavigateJourney) {
      this.props.onNavigateJourney();
    } else if (typeof window !== "undefined") {
      window.location.assign("/jornada");
    }
    this.resetBoundary();
  };

  private sendReport = (): void => {
    const { error } = this.state;
    if (!error) return;
    void reportAppError({
      errorName: error.name || "Error",
      message: error.message || "Erro de renderização",
      stack: error.stack,
      source: "manual",
    }).then(() => this.setState({ reportPrepared: true }));
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="theme-transition flex min-h-dvh items-center justify-center bg-bg px-4 py-8">
        <div className="w-full max-w-md rounded-[28px] border border-line bg-surface p-6 text-center shadow-lift">
          <div className="mx-auto flex justify-center">
            <Mascot size={88} variant="wave" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-ink">
            O Longyu encontrou um problema.
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Seu progresso local continua salvo.
          </p>
          {this.state.reportPrepared && (
            <p className="mt-2 text-xs font-medium text-[rgb(var(--good))]">
              Relatório preparado para envio.
            </p>
          )}
          <div className="mt-5 grid gap-2">
            <Button size="lg" className="w-full" onClick={this.resetBoundary}>
              Tentar novamente
            </Button>
            <Button variant="outline" className="w-full" onClick={this.goJourney}>
              Voltar à Jornada
            </Button>
            <Button variant="soft" className="w-full" onClick={this.sendReport}>
              Enviar relatório
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
