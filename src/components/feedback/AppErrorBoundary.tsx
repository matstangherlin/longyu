import { Component, type ErrorInfo, type ReactNode } from "react";
import { trackAnalytics, ANALYTICS_EVENTS } from "../../services/analyticsService";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    trackAnalytics({
      event: ANALYTICS_EVENTS.app_error,
      metadata: {
        message: error.name,
        component: info.componentStack?.split("\n")[1]?.trim() ?? "unknown",
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
          <h1 className="font-serif text-2xl font-semibold text-ink">Algo deu errado</h1>
          <p className="mt-2 text-sm text-ink-soft">Recarregue a página para continuar estudando.</p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
