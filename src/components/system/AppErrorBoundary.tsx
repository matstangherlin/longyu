import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui/primitives";
import { Mascot } from "../brand/Mascot";
import { BuildInfo } from "./BuildInfo";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("AppErrorBoundary", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  private goJourney = () => {
    window.location.assign("/jornada");
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
          <BuildInfo className="mt-4" />
          <div className="mt-5 grid gap-2">
            <Button size="lg" className="w-full" onClick={this.reset}>
              Tentar novamente
            </Button>
            <Button variant="outline" className="w-full" onClick={this.goJourney}>
              Voltar à Jornada
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
