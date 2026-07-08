import { CONTENT_CATALOG, CONTENT_PHASES, type ContentPhaseId, type PedagogicalContentItem } from "../../data/contentArchitecture";
import { buildContentDiagnostics, validateContentArchitecture, type ContentAlternativeGap, type DuplicateContentEntry } from "../../data/contentValidation";
import { Card, Pill, SectionTitle } from "../../components/ui/primitives";

export function ContentDiagnosticsPage() {
  const diagnostics = buildContentDiagnostics();
  const issues = validateContentArchitecture();
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warn");
  const phaseStats = statsByPhase();
  const statusStats = statsByStatus();

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <SectionTitle
        eyebrow="Ferramenta interna"
        title="Diagnóstico de conteúdo"
        desc="Painel de saúde do catálogo pedagógico antes de liberar um corpus grande para alunos."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Itens catalogados" value={CONTENT_CATALOG.length} detail="core, fases e corpus" />
        <StatTile label="Erros" value={errors.length} detail="bloqueiam importação" tone={errors.length ? "accent" : "good"} />
        <StatTile label="Avisos" value={warnings.length} detail="pedem curadoria" tone={warnings.length ? "gold" : "good"} />
        <StatTile label="Alternativas" value={diagnostics.questionsWithoutAlternatives.length} detail="bancos insuficientes" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-4">
          <div className="text-sm font-semibold text-ink">Camadas de conteúdo</div>
          <div className="mt-3 space-y-2">
            {CONTENT_PHASES.map((phase) => (
              <div key={phase.id} className="rounded-2xl bg-surface-2 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{phase.label}</span>
                  <Pill tone={phase.id === "futureLibrary" ? "muted" : "accent"}>
                    {phaseStats[phase.id] ?? 0}
                  </Pill>
                </div>
                <p className="mt-1 text-xs leading-5 text-ink-soft">{phase.releasePolicy}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold text-ink">Status pedagógico</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(statusStats).map(([status, count]) => (
              <div key={status} className="rounded-2xl bg-surface-2 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{status}</div>
                <div className="mt-1 font-serif text-2xl font-semibold text-ink">{count}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-ink-soft">
            Itens futuros ficam disponíveis para curadoria e busca interna, mas não entram como resposta correta na revisão.
          </p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ItemList title="Sem pinyin" items={diagnostics.missingPinyin} empty="Nenhum item sem pinyin." />
        <ItemList title="Sem significado pt-BR" items={diagnostics.missingMeaning} empty="Nenhum item sem significado." />
        <ItemList title="Sem hanzi" items={diagnostics.missingHanzi} empty="Nenhum item sem hanzi." />
        <ItemList title="Hanzi complexo cedo demais" items={diagnostics.earlyComplexWithoutExplanation} empty="Nenhum caso critico de pacing." />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DuplicateList items={diagnostics.duplicates} />
        <AlternativeList items={diagnostics.questionsWithoutAlternatives} />
      </section>

      <IssueList errors={errors} warnings={warnings} />
    </div>
  );
}

function StatTile({
  label,
  value,
  detail,
  tone = "muted",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "muted" | "accent" | "good" | "gold";
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
        <Pill tone={tone}>{value.toLocaleString("pt-BR")}</Pill>
      </div>
      <div className="mt-2 text-xs text-ink-soft">{detail}</div>
    </div>
  );
}

function ItemList({ title, items, empty }: { title: string; items: PedagogicalContentItem[]; empty: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink">{title}</div>
        <Pill tone={items.length ? "accent" : "good"}>{items.length}</Pill>
      </div>
      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-ink-soft">{empty}</p>
        ) : (
          items.slice(0, 80).map((item) => <ItemRow key={item.ref} item={item} />)
        )}
      </div>
    </Card>
  );
}

function ItemRow({ item }: { item: PedagogicalContentItem }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="hanzi text-xl text-ink">{item.hanzi || "?"}</span>
        <span className="text-sm font-semibold text-ink">{item.ref}</span>
        <Pill>{item.recommendedPhase}</Pill>
        <Pill tone={item.pedagogicalStatus === "active" ? "good" : "muted"}>{item.pedagogicalStatus}</Pill>
      </div>
      <div className="mt-1 text-xs text-ink-soft">{item.pinyin || "sem pinyin"} · {item.meaningPt || "sem significado"}</div>
    </div>
  );
}

function DuplicateList({ items }: { items: DuplicateContentEntry[] }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink">Possiveis duplicatas</div>
        <Pill tone={items.length ? "gold" : "good"}>{items.length}</Pill>
      </div>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhuma duplicata encontrada.</p>
        ) : (
          items.slice(0, 80).map((item) => (
            <div key={item.key} className="rounded-2xl bg-surface-2 px-3 py-2">
              <div className="text-xs font-semibold text-ink-faint">{item.key}</div>
              <div className="mt-1 text-sm text-ink">{item.refs.join(", ")}</div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function AlternativeList({ items }: { items: ContentAlternativeGap[] }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink">Questoes sem alternativas validas</div>
        <Pill tone={items.length ? "accent" : "good"}>{items.length}</Pill>
      </div>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-ink-soft">Todos os bancos ativos conseguem gerar alternativas.</p>
        ) : (
          items.slice(0, 80).map((item) => (
            <div key={`${item.ref}-${item.field}`} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3 py-2">
              <span className="text-sm font-medium text-ink">{item.ref}</span>
              <span className="text-xs text-ink-soft">{item.field}: {item.available}/{item.required}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function IssueList({
  errors,
  warnings,
}: {
  errors: ReturnType<typeof validateContentArchitecture>;
  warnings: ReturnType<typeof validateContentArchitecture>;
}) {
  const items = [...errors, ...warnings].slice(0, 120);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink">Log de validacao</div>
        <Pill tone={errors.length ? "accent" : warnings.length ? "gold" : "good"}>
          {errors.length} erros · {warnings.length} avisos
        </Pill>
      </div>
      <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhum problema encontrado.</p>
        ) : (
          items.map((item) => (
            <div key={`${item.area}-${item.ref}-${item.message}`} className="rounded-2xl bg-surface-2 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={item.severity === "error" ? "accent" : "gold"}>{item.severity}</Pill>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{item.area}</span>
                <span className="text-sm font-semibold text-ink">{item.ref}</span>
              </div>
              <div className="mt-1 text-sm text-ink-soft">{item.message}</div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function statsByPhase(): Record<ContentPhaseId, number> {
  return CONTENT_CATALOG.reduce((acc, item) => {
    acc[item.recommendedPhase] = (acc[item.recommendedPhase] ?? 0) + 1;
    return acc;
  }, {} as Record<ContentPhaseId, number>);
}

function statsByStatus(): Record<string, number> {
  return CONTENT_CATALOG.reduce((acc, item) => {
    acc[item.pedagogicalStatus] = (acc[item.pedagogicalStatus] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
