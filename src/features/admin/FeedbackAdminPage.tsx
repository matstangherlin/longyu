import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Button, Card, Pill } from "../../components/ui/primitives";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_SEVERITIES,
  FEEDBACK_STATUSES,
  type FeedbackCategory,
  type FeedbackSeverity,
  type FeedbackStatus,
} from "../../lib/feedback";
import {
  fetchIsAdmin,
  listFeedbackReportsForAdmin,
  updateFeedbackReportAdmin,
  type FeedbackReportRow,
} from "../../services/feedbackService";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";

function formatDate(iso: string): string {
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

export function FeedbackAdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<FeedbackReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<FeedbackSeverity | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<FeedbackStatus>("novo");
  const [saving, setSaving] = useState(false);

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

      const result = await listFeedbackReportsForAdmin();
      if (!result.ok) setError(result.error ?? "Não foi possível carregar relatos.");
      setRows(result.rows);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (severityFilter !== "all" && row.severity !== severityFilter) return false;
      if (!q) return true;
      const haystack = [
        row.message,
        row.expected_behavior,
        row.route,
        row.lesson_id,
        row.app_version,
        row.build_sha,
        row.admin_notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, statusFilter, categoryFilter, severityFilter]);

  const selected = filtered.find((row) => row.id === selectedId) ?? null;

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!selectedId || !filtered.some((row) => row.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setNotesDraft(selected.admin_notes ?? "");
    setStatusDraft((selected.status as FeedbackStatus) ?? "novo");
  }, [selected?.id, selected?.admin_notes, selected?.status]);

  if (!isSupabaseBackendEnabled()) {
    return <Navigate to="/jornada" replace />;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-10 text-center text-sm text-ink-soft">
        Carregando painel de feedback…
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/jornada" replace />;
  }

  async function saveSelected() {
    if (!selected) return;
    setSaving(true);
    const result = await updateFeedbackReportAdmin(selected.id, {
      status: statusDraft,
      admin_notes: notesDraft.trim() || null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Falha ao salvar.");
      return;
    }
    setRows((current) =>
      current.map((row) =>
        row.id === selected.id
          ? { ...row, status: statusDraft, admin_notes: notesDraft.trim() || null }
          : row
      )
    );
    setError(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Pill tone="accent">Admin</Pill>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Feedback beta</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {filtered.length} relato(s) · somente administradores
          </p>
        </div>
      </div>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-none sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm lg:col-span-2"
          placeholder="Buscar mensagem, rota, versão…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as FeedbackStatus | "all")}
        >
          <option value="all">Todos os status</option>
          {FEEDBACK_STATUSES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value as FeedbackCategory | "all")}
        >
          <option value="all">Todas categorias</option>
          {FEEDBACK_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm sm:col-span-2 lg:col-span-1"
          value={severityFilter}
          onChange={(event) => setSeverityFilter(event.target.value as FeedbackSeverity | "all")}
        >
          <option value="all">Todas severidades</option>
          {FEEDBACK_SEVERITIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Card>

      {error && (
        <p className="rounded-xl bg-wrong-soft px-3 py-2 text-sm text-wrong">{error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="overflow-hidden rounded-2xl shadow-none">
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-line/60">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">Nenhum relato encontrado.</p>
            ) : (
              filtered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={[
                    "w-full px-4 py-3 text-left transition hover:bg-surface-2",
                    selected?.id === row.id ? "bg-accent-soft/50" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-ink-faint">
                    <span>{formatDate(row.created_at)}</span>
                    <span className="font-semibold uppercase tracking-wide">{row.severity}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-ink">{row.category}</div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{row.message}</p>
                  <div className="mt-1 text-xs text-ink-faint">
                    {row.route} · {row.status}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {selected ? (
          <Card className="rounded-2xl p-5 shadow-none">
            <div className="text-xs text-ink-faint">{formatDate(selected.created_at)}</div>
            <h2 className="mt-1 font-serif text-xl font-semibold text-ink">{selected.category}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{selected.message}</p>
            {selected.expected_behavior && (
              <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-ink-soft">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Esperado
                </div>
                <p className="mt-1 whitespace-pre-wrap">{selected.expected_behavior}</p>
              </div>
            )}

            <dl className="mt-4 grid gap-2 text-xs text-ink-soft sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-ink-faint">Rota</dt>
                <dd>{selected.route || "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-faint">Versão</dt>
                <dd>
                  {selected.app_version || "—"} {selected.build_sha ? `· ${selected.build_sha}` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-faint">Lição / passo</dt>
                <dd>
                  {selected.lesson_id || "—"}
                  {selected.step_id ? ` · ${selected.step_id}` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-faint">Viewport</dt>
                <dd>{selected.viewport || "—"}</dd>
              </div>
            </dl>

            <label className="mt-5 block text-sm font-semibold text-ink">
              Status
              <select
                className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm"
                value={statusDraft}
                onChange={(event) => setStatusDraft(event.target.value as FeedbackStatus)}
              >
                {FEEDBACK_STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-semibold text-ink">
              Notas internas
              <textarea
                className="mt-1.5 min-h-[96px] w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm"
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                placeholder="Reprodução, prioridade, link de PR…"
              />
            </label>

            <Button className="mt-4 w-full" onClick={() => void saveSelected()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </Button>
          </Card>
        ) : (
          <Card className="rounded-2xl p-5 text-sm text-ink-soft shadow-none">
            Selecione um relato na lista.
          </Card>
        )}
      </div>
    </div>
  );
}
