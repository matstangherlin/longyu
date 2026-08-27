import { Link } from "react-router-dom";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { Button, Card } from "../../components/ui/primitives";
import { QA_SCENARIOS, clearQaFastPathSession, type QaScenario } from "../../lib/qaFastPath";

const GROUPS: { id: QaScenario["group"]; title: string }[] = [
  { id: "mastery", title: "Topic Mastery 4/4" },
  { id: "skills", title: "Habilidades e player" },
  { id: "states", title: "Estados de borda" },
  { id: "auth", title: "Onboarding" },
];

export function QaHubPage() {
  function clearSession() {
    clearQaFastPathSession();
    try {
      localStorage.removeItem("longyu-v1");
    } catch {
      /* ignore */
    }
    window.location.replace("/qa");
  }

  return (
    <HubPage data-qa-fast-path="hub">
      <HubHeader
        eyebrow="Somente preview / dev"
        title="QA Fast Path"
        desc="Abre cenários críticos sem refazer o curso. Não existe em Production Beta. Automação nunca marca HUMAN PASS."
        aside={
          <Button type="button" variant="outline" size="sm" onClick={clearSession}>
            Limpar sessão QA
          </Button>
        }
      />

      {GROUPS.map((group) => (
        <HubSection key={group.id} title={group.title}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {QA_SCENARIOS.filter((item) => item.group === group.id).map((item) => (
              <li key={item.id}>
                <Card className="rounded-xl border-line/70 p-3 shadow-none">
                  <Link
                    to={`/qa/${item.id}`}
                    data-qa-scenario={item.id}
                    className="block min-h-11 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                  >
                    <div className="font-semibold text-ink">{item.title}</div>
                    <p className="mt-1 text-sm text-ink-soft">{item.summary}</p>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                      {item.href}
                    </p>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </HubSection>
      ))}
    </HubPage>
  );
}
