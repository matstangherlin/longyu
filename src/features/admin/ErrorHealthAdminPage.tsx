import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button, Card, Pill } from "../../components/ui/primitives";
import { fetchIsAdmin } from "../../services/feedbackService";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { getSupabaseClient } from "../../lib/supabaseClient";

interface ErrorHealthRow {
  id: string;
  fingerprint: string;
  error_name: string;
  message: string;
  route: string;
  app_version: string;
  build_sha: string;
  occurrence_count: number;
  reporter_ids: string[] | null;
  created_at: string;
  last_seen_at: string;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ErrorHealthAdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<ErrorHealthRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseBackendEnabled()) {
      setLoading(false);
      return;
    }

    void (async () => {
      const admin = await fetchIsAdmin();
      setIsAdmin(admin);
      if (!admin) {
        setLoading(false);
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        setError("Cliente indisponível.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await client
        .from("app_error_reports")
        .select(
          "id,fingerprint,error_name,message,route,app_version,build_sha,occurrence_count,reporter_ids,created_at,last_seen_at"
        )
        .order("occurrence_count", { ascending: false })
        .order("last_seen_at", { ascending: false })
        .limit(200);

      if (fetchError) setError(fetchError.message);
      else setRows((data ?? []) as ErrorHealthRow[]);
      setLoading(false);
    })();
  }, []);

  if (!isSupabaseBackendEnabled()) return <Navigate to="/jornada" replace />;
  if (loading) {
    return <div className="mx-auto max-w-5xl py-10 text-center text-sm text-ink-soft">Carregando saúde do app…</div>;
  }
  if (!isAdmin) return <Navigate to="/jornada" replace />;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Pill tone="accent">Admin</Pill>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Saúde do app</h1>
          <p className="mt-1 text-sm text-ink-soft">Erros mais frequentes e rotas afetadas.</p>
        </div>
        <Link to="/admin/feedback">
          <Button variant="outline" size="sm">
            Ver feedback beta
          </Button>
        </Link>
      </div>

      {error && <p className="rounded-xl bg-wrong-soft px-3 py-2 text-sm text-wrong">{error}</p>}

      <Card className="overflow-hidden rounded-2xl shadow-none">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3">Erro</th>
                <th className="px-4 py-3">Rota</th>
                <th className="px-4 py-3">Versão</th>
                <th className="px-4 py-3">Ocorrências</th>
                <th className="px-4 py-3">Usuários</th>
                <th className="px-4 py-3">Primeira</th>
                <th className="px-4 py-3">Última</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-ink-soft">
                    Nenhum erro registrado ainda.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-line/60 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{row.error_name}</div>
                      <div className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{row.message}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-soft">{row.route || "—"}</td>
                    <td className="px-4 py-3 text-xs text-ink-soft">
                      {row.app_version || "—"}
                      {row.build_sha ? ` · ${row.build_sha.slice(0, 7)}` : ""}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">{row.occurrence_count}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.reporter_ids?.length ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-ink-faint">{formatWhen(row.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-ink-faint">{formatWhen(row.last_seen_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
