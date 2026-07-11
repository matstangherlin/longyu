import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, Pill } from "../../components/ui/primitives";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { getSupabaseClient } from "../../lib/supabaseClient";

interface DashboardData {
  funnel?: Record<string, number>;
  lesson_abandonment?: Array<{ step_index: string; step_type: string; abandon_count: number }>;
  step_mistakes?: Array<{ task_type: string; skill: string; mistake_count: number }>;
  retention?: Array<{ cohort_day: string; cohort_size: number; retained_d1: number; retained_d7: number }>;
  pro_funnel?: Record<string, number>;
  stories_completed?: number;
  charge_exhausted_users?: number;
  reviews_completed?: number;
}

export function BetaAnalyticsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseBackendEnabled()) {
      setLoading(false);
      return;
    }

    void (async () => {
      const client = getSupabaseClient();
      if (!client) {
        setError("Cliente indisponível.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await client.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      const isAdmin = Boolean(profile?.is_admin);
      setAllowed(isAdmin);
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      const { data: dashboard, error: rpcError } = await client.rpc("get_beta_analytics_dashboard");
      if (rpcError) setError(rpcError.message);
      else setData((dashboard ?? null) as DashboardData | null);
      setLoading(false);
    })();
  }, []);

  if (!isSupabaseBackendEnabled()) return <Navigate to="/jornada" replace />;
  if (loading) {
    return <div className="mx-auto max-w-6xl py-10 text-center text-sm text-ink-soft">Carregando métricas…</div>;
  }
  if (!allowed) return <Navigate to="/jornada" replace />;

  const funnel = data?.funnel ?? {};

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div>
        <Pill tone="accent">Admin</Pill>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Métricas do beta</h1>
        <p className="mt-1 text-sm text-ink-soft">Últimos 30 dias · sem conteúdo digitado pelo aluno</p>
      </div>

      {error && <p className="rounded-xl bg-wrong-soft px-3 py-2 text-sm text-wrong">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Landing" value={funnel.landing_users ?? 0} />
        <MetricCard label="Começar" value={funnel.get_started_users ?? 0} />
        <MetricCard label="Onboarding" value={funnel.onboarding_completed_users ?? 0} />
        <MetricCard label="1ª lição" value={funnel.first_lesson_completed_users ?? 0} />
      </div>

      <Card className="rounded-2xl p-4 shadow-none">
        <h2 className="font-semibold text-ink">Funil Pro</h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Oferta vista" value={data?.pro_funnel?.offer_shown ?? 0} />
          <Stat label="Clique" value={data?.pro_funnel?.offer_clicked ?? 0} />
          <Stat label="Checkout" value={data?.pro_funnel?.checkout_started ?? 0} />
          <Stat label="Trial" value={data?.pro_funnel?.trial_started ?? 0} />
          <Stat label="Ativada" value={data?.pro_funnel?.subscription_activated ?? 0} />
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <SimpleTable
          title="Abandono por etapa"
          headers={["Etapa", "Tipo", "Qtd"]}
          rows={(data?.lesson_abandonment ?? []).map((row) => [
            row.step_index,
            row.step_type,
            String(row.abandon_count),
          ])}
        />
        <SimpleTable
          title="Erros por exercício"
          headers={["Tarefa", "Habilidade", "Qtd"]}
          rows={(data?.step_mistakes ?? []).map((row) => [
            row.task_type,
            row.skill,
            String(row.mistake_count),
          ])}
        />
      </div>

      <Card className="rounded-2xl p-4 shadow-none">
        <h2 className="font-semibold text-ink">Engajamento</h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <Stat label="Histórias concluídas" value={data?.stories_completed ?? 0} />
          <Stat label="Sem cargas" value={data?.charge_exhausted_users ?? 0} />
          <Stat label="Revisões" value={data?.reviews_completed ?? 0} />
        </div>
      </Card>

      <SimpleTable
        title="Retenção D1 / D7"
        headers={["Coorte", "Tamanho", "D1", "D7"]}
        rows={(data?.retention ?? []).map((row) => [
          row.cohort_day,
          String(row.cohort_size),
          String(row.retained_d1),
          String(row.retained_d7),
        ])}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-2xl p-4 shadow-none">
      <div className="text-xs uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-1 font-serif text-3xl font-semibold text-ink">{value}</div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className="font-semibold text-ink">{value}</div>
    </div>
  );
}

function SimpleTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Card className="overflow-hidden rounded-2xl shadow-none">
      <div className="border-b border-line px-4 py-3 font-semibold text-ink">{title}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-2">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-4 text-ink-soft">
                  Sem dados ainda.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-t border-line/60">
                  {row.map((cell, cellIndex) => (
                    <td key={`${index}-${cellIndex}`} className="px-4 py-2 text-ink-soft">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
