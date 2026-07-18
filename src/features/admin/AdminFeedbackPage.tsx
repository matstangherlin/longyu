import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Card, Button, Pill } from "../../components/ui/primitives";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  isAdminEmail,
  type FeedbackCategoryId,
  type FeedbackStatusId,
} from "../../lib/feedback";
import { useStore } from "../../lib/store";
import {
  checkIsBetaAdmin,
  fetchAdminFeedback,
  feedbackToCsv,
  updateAdminFeedback,
  type BetaFeedbackRow,
} from "../../services/feedbackService";
import {
  buildPedagogyInsights,
  fetchAdminPedagogyEvents,
  type PedagogyEventRow,
  type PedagogyInsightBucket,
} from "../../services/pedagogyEvents";

function countBy<T extends string>(rows: Array<{ key: T }>, pick: (row: { key: T }) => string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function InsightList({ title, items }: { title: string; items: PedagogyInsightBucket[] }) {
  return (
    <Card className="rounded-2xl p-4 shadow-none">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-faint">Sem dados ainda.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-ink-soft">{item.key}</span>
              <Pill tone="muted">{item.count}</Pill>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function AdminFeedbackPage() {
  const account = useStore((s) => s.accounts[s.currentAccountId]);
  const emailAllowed = isAdminEmail(account?.email);
  const [serverAdmin, setServerAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<BetaFeedbackRow[]>([]);
  const [events, setEvents] = useState<PedagogyEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatusId | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategoryId | "all">("all");
  const [lessonFilter, setLessonFilter] = useState("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const admin = await checkIsBetaAdmin();
      if (!cancelled) setServerAdmin(admin);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [feedback, pedagogy] = await Promise.all([fetchAdminFeedback(), fetchAdminPedagogyEvents()]);
      setRows(feedback);
      setEvents(pedagogy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar feedback.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (serverAdmin || emailAllowed) void reload();
  }, [serverAdmin, emailAllowed]);

  const insights = useMemo(() => buildPedagogyInsights(events), [events]);
  const allowed = serverAdmin === true || emailAllowed;

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (lessonFilter !== "all" && (row.lesson_id ?? "") !== lessonFilter) return false;
      if (!query.trim()) return true;
      const hay = `${row.message} ${row.route} ${row.lesson_id ?? ""} ${row.category} ${row.admin_note ?? ""}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
  }, [rows, statusFilter, categoryFilter, lessonFilter, query]);

  const totals = useMemo(
    () => ({
      all: rows.length,
      new: rows.filter((row) => row.status === "new").length,
      investigating: rows.filter((row) => row.status === "investigating").length,
      resolved: rows.filter((row) => row.status === "resolved").length,
    }),
    [rows]
  );

  const byLesson = useMemo(
    () =>
      countBy(
        rows.map((row) => ({ key: row.lesson_id ?? "(sem lição)" })),
        (row) => row.key
      ).slice(0, 10),
    [rows]
  );

  const byType = useMemo(
    () =>
      countBy(
        rows.map((row) => ({ key: row.category })),
        (row) => row.key
      ),
    [rows]
  );

  const lessonOptions = useMemo(
    () => [...new Set(rows.map((row) => row.lesson_id).filter(Boolean))] as string[],
    [rows]
  );

  async function onStatusChange(row: BetaFeedbackRow, status: FeedbackStatusId) {
    setSavingId(row.id);
    try {
      await updateAdminFeedback(row.id, status, row.admin_note);
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, status } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar status.");
    } finally {
      setSavingId(null);
    }
  }

  async function onNoteBlur(row: BetaFeedbackRow, note: string) {
    if ((row.admin_note ?? "") === note) return;
    setSavingId(row.id);
    try {
      await updateAdminFeedback(row.id, row.status, note);
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, admin_note: note } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar nota.");
    } finally {
      setSavingId(null);
    }
  }

  function exportCsv() {
    const csv = feedbackToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `longyu-beta-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (serverAdmin === false && !emailAllowed) {
    return <Navigate to="/mais" replace />;
  }
  if (serverAdmin === null && !emailAllowed) {
    return (
      <HubPage>
        <HubHeader eyebrow="Admin" title="Feedback" desc="Verificando acesso…" />
      </HubPage>
    );
  }
  if (!allowed) return <Navigate to="/mais" replace />;

  return (
    <HubPage>
      <HubHeader
        eyebrow="Admin"
        title="Feedback beta"
        desc="Painel interno — não aparece para aluno comum."
        aside={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
              Atualizar
            </Button>
            <Button variant="soft" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              Exportar CSV
            </Button>
            <Link to="/mais">
              <Button variant="ghost" size="sm">
                Voltar
              </Button>
            </Link>
          </div>
        }
      />

      {error && <p className="mb-4 text-sm text-[rgb(var(--wrong))]">{error}</p>}

      <HubSection title="Resumo">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Total", totals.all],
            ["Novos", totals.new],
            ["Investigando", totals.investigating],
            ["Resolvidos", totals.resolved],
          ].map(([label, value]) => (
            <Card key={label} className="rounded-2xl p-4 shadow-none">
              <div className="text-xs uppercase tracking-wide text-ink-faint">{label}</div>
              <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
            </Card>
          ))}
        </div>
      </HubSection>

      <HubSection title="Agrupamentos">
        <div className="grid gap-3 lg:grid-cols-2">
          <InsightList title="Por lição" items={byLesson} />
          <InsightList
            title="Por tipo"
            items={byType.map((item) => ({
              key: FEEDBACK_CATEGORIES.find((entry) => entry.id === item.key)?.label ?? item.key,
              count: item.count,
            }))}
          />
        </div>
      </HubSection>

      <HubSection title="Sinais pedagógicos">
        <div className="grid gap-3 lg:grid-cols-2">
          <InsightList title="Exercícios com maior erro" items={insights.mostErrors} />
          <InsightList title="Exercícios mais pulados" items={insights.mostSkipped} />
          <InsightList title="Lições mais abandonadas" items={insights.mostAbandoned} />
          <InsightList title="Imagens com maior erro" items={insights.imageErrors} />
          <InsightList title="Cenas mais repetidas" items={insights.repeatedScenes} />
        </div>
      </HubSection>

      <HubSection title="Inbox">
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar mensagem, rota, lição…"
            className="h-10 rounded-xl border border-line bg-bg px-3 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as FeedbackStatusId | "all")}
            className="h-10 rounded-xl border border-line bg-bg px-3 text-sm"
          >
            <option value="all">Todos os status</option>
            {FEEDBACK_STATUSES.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as FeedbackCategoryId | "all")}
            className="h-10 rounded-xl border border-line bg-bg px-3 text-sm"
          >
            <option value="all">Todas as categorias</option>
            {FEEDBACK_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <select
            value={lessonFilter}
            onChange={(event) => setLessonFilter(event.target.value)}
            className="h-10 rounded-xl border border-line bg-bg px-3 text-sm"
          >
            <option value="all">Todas as lições</option>
            {lessonOptions.map((lessonId) => (
              <option key={lessonId} value={lessonId}>
                {lessonId}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-ink-soft">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-ink-faint">Nenhum feedback neste filtro.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((row) => (
              <Card key={row.id} className="rounded-2xl p-4 shadow-none">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="accent">
                    {FEEDBACK_CATEGORIES.find((entry) => entry.id === row.category)?.label ?? row.category}
                  </Pill>
                  <Pill tone="muted">{new Date(row.created_at).toLocaleString("pt-BR")}</Pill>
                  {row.lesson_id && <Pill tone="muted">{row.lesson_id}</Pill>}
                  {row.exercise_kind && (
                    <Pill tone="muted">
                      {row.exercise_kind}
                      {typeof row.exercise_index === "number" ? ` #${row.exercise_index + 1}` : ""}
                    </Pill>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{row.message}</p>
                <p className="mt-2 text-xs text-ink-faint">
                  {row.route}
                  {row.app_version ? ` · v${row.app_version}` : ""}
                  {row.viewport ? ` · ${row.viewport}` : ""}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-ink-faint">Status</span>
                    <select
                      value={row.status}
                      disabled={savingId === row.id}
                      onChange={(event) => void onStatusChange(row, event.target.value as FeedbackStatusId)}
                      className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm"
                    >
                      {FEEDBACK_STATUSES.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-ink-faint">Nota admin</span>
                    <input
                      defaultValue={row.admin_note ?? ""}
                      disabled={savingId === row.id}
                      onBlur={(event) => void onNoteBlur(row, event.target.value)}
                      className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm"
                      placeholder="Nota interna"
                    />
                  </label>
                </div>
              </Card>
            ))}
          </div>
        )}
      </HubSection>
    </HubPage>
  );
}
