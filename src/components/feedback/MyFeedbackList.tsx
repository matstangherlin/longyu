import { useEffect, useState } from "react";
import { Card, Pill } from "../ui/primitives";
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES } from "../../lib/feedback";
import { fetchMyFeedback, type BetaFeedbackRow } from "../../services/feedbackService";
import { getSupabaseClient } from "../../lib/supabaseClient";

/** Lista o feedback do usuário autenticado (RLS). Sem login: mensagem curta. */
export function MyFeedbackList() {
  const [rows, setRows] = useState<BetaFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const client = getSupabaseClient();
        if (!client) {
          if (!cancelled) {
            setLoggedIn(false);
            setRows([]);
          }
          return;
        }
        const { data } = await client.auth.getSession();
        const hasSession = Boolean(data.session?.user?.id);
        if (!cancelled) setLoggedIn(hasSession);
        if (!hasSession) {
          if (!cancelled) setRows([]);
          return;
        }
        const mine = await fetchMyFeedback();
        if (!cancelled) setRows(mine);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Falha ao carregar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-ink-soft">Carregando seus envios…</p>;
  }

  if (!loggedIn) {
    return (
      <p className="text-sm text-ink-soft">
        Entre com uma conta na nuvem para ver o histórico dos feedbacks que você enviou.
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-[rgb(var(--wrong))]">{error}</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-ink-faint">Você ainda não enviou feedback nesta conta.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <Card key={row.id} className="rounded-xl p-3 shadow-none">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="accent">
              {FEEDBACK_CATEGORIES.find((entry) => entry.id === row.category)?.label ?? row.category}
            </Pill>
            <Pill tone="muted">
              {FEEDBACK_STATUSES.find((entry) => entry.id === row.status)?.label ?? row.status}
            </Pill>
            <span className="text-[11px] text-ink-faint">
              {new Date(row.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{row.message}</p>
          {row.lesson_id && (
            <p className="mt-1 text-xs text-ink-faint">
              {row.lesson_id}
              {row.exercise_kind ? ` · ${row.exercise_kind}` : ""}
              {typeof row.exercise_index === "number" ? ` · pergunta ${row.exercise_index + 1}` : ""}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
