import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { applyQaScenario } from "../../lib/qaFastPath";

/**
 * Aplica o seed e faz load completo da rota-alvo para o persist hidratar.
 * Navigate client-side não relê `longyu-v1`.
 */
export function QaScenarioPage() {
  const { scenario } = useParams();

  useEffect(() => {
    const result = applyQaScenario(scenario);
    window.location.replace(result.href);
  }, [scenario]);

  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-bg text-sm text-ink-soft"
      data-qa-fast-path="seeding"
    >
      Preparando cenário…
    </div>
  );
}
