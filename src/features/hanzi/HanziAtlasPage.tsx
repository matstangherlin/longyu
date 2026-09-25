import { useEffect, useMemo, useState } from "react";
import { DailyDiscoveries } from "../../components/vocabulary/DailyWordCards";
import { hanziOriginNote } from "../../data/hanziOrigins";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { HANZI_ATLAS, filterAtlas, type HanziAtlasItem } from "../../data/hanziAtlas";
import {
  atlasContentAvailability,
  canPromoteAtlasItemToReview,
  contentRefForAtlasItem,
  type ContentAvailability,
} from "../../data/contentArchitecture";
import { ALL_LESSONS } from "../../data/journey";
import { HANZI_EVOLUTION_CORE_IDS, HANZI_EVOLUTIONS, HANZI_LOGIC_CARDS } from "../../data/hanziPedagogy";
import { radicalById, RADICALS } from "../../data/radicals";
import { REVIEW_DOMAIN_ORDER } from "../../data/reviewDomains";
import { gradeReviewDomain } from "../../lib/reviewPlan";
import { describeNextDue, makeKey, type SRSItem } from "../../lib/srs";
import {
  ATLAS_STUDY_SET_MAX,
  atlasSmartSetItems,
  atlasStudySetHref,
  buildAtlasStudySet,
  isMasteredAtlasChar,
  type AtlasSmartSet,
} from "../../lib/atlasStudySet";
import { todayKey } from "../../lib/storage";
import { useStore } from "../../lib/store";
import { formatNumber } from "../../i18n/format";
import { Card, Button, ButtonLink, Pill, SectionTitle } from "../../components/ui/primitives";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { GlossText } from "../../components/hanzi/GlossText";
import { DecompositionCard } from "../../components/hanzi/DecompositionCard";
import { HanziEvolutionCard } from "../../components/hanzi/HanziEvolutionCard";
import { IconBook, IconChevron, IconLibrary, IconRefresh, IconStar, IconTarget, IconX } from "../../components/ui/Icon";

type FrequencyFilter = "300" | "1000" | "all";
type ToneFilter = "all" | "1" | "2" | "3" | "4" | "5";
type LearnedFilter = "all" | "learned" | "available" | "future";
type DomainFilter = "all" | "natureza" | "pessoa" | "fala" | "numero" | "funcao" | "vida";
type SortMode = "frequency" | "recent" | "weak";

interface AtlasFilters {
  query: string;
  frequency: FrequencyFilter;
  tone: ToneFilter;
  radical: string;
  domain: DomainFilter;
  learned: LearnedFilter;
  decomposable: boolean;
  phonetic: boolean;
  favorites: boolean;
  weak: boolean;
  reviewedToday: boolean;
  sort: SortMode;
}

const DEFAULT_FILTERS: AtlasFilters = {
  query: "",
  frequency: "all",
  tone: "all",
  radical: "all",
  domain: "all",
  learned: "available",
  decomposable: false,
  phonetic: false,
  favorites: false,
  weak: false,
  reviewedToday: false,
  sort: "frequency",
};

const LESSON_BY_ID = new Map(ALL_LESSONS.map((lesson) => [lesson.id, lesson]));

// O atlas inteiro numa página só passava de 23 mil px de altura no celular
// (~28 telas de rolagem). Mostra um lote por vez; "Ver mais" amplia.
// No telefone a grade tem uma coluna, então o lote precisa ser curto: cada
// card ocupa ~250 px e 24 já enchem umas 7 telas.
const PAGE_SIZE = 24;

const DOMAIN_OPTIONS: Array<[DomainFilter, string]> = [
  ["all", "Todos"],
  ["natureza", "Natureza"],
  ["pessoa", "Pessoas"],
  ["fala", "Fala"],
  ["numero", "Números"],
  ["funcao", "Função"],
  ["vida", "Vida real"],
];

// RC2.2.8 · F2 — atalhos de conjunto. Cada um parte de progresso real.
const SMART_SET_OPTIONS: Array<[AtlasSmartSet, string]> = [
  ["weak", "Meus fracos"],
  ["favorites", "Favoritos"],
  ["recent", "Aprendidos recentemente"],
  ["unreviewed", "Não revisados"],
  ["top50", "Top 50 disponíveis"],
];

const SORT_OPTIONS: Array<[SortMode, string]> = [
  ["frequency", "Frequência"],
  ["recent", "Recentes"],
  ["weak", "Fracos primeiro"],
];

function findAtlasFromParam(value: string | null | undefined): HanziAtlasItem | null {
  const raw = value?.trim();
  if (!raw) return null;
  return HANZI_ATLAS.find((item) =>
    item.id === raw ||
    item.hanzi === raw ||
    item.sourceCharacter?.id === raw ||
    item.toneless === raw
  ) ?? null;
}

export function HanziAtlasPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedChar = searchParams.get("char") ?? searchParams.get("hanzi");
  const learnedChars = useStore((s) => s.learnedChars);
  const completedLessons = useStore((s) => s.completedLessons);
  const favoriteItems = useStore((s) => s.favoriteItems);
  const toggleFavoriteItem = useStore((s) => s.toggleFavoriteItem);
  const srs = useStore((s) => s.srs);
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);

  const [filters, setFilters] = useState<AtlasFilters>(DEFAULT_FILTERS);
  const [smartSet, setSmartSet] = useState<AtlasSmartSet | null>(null);
  const [reviewNotice, setReviewNotice] = useState<{ id: string; text: string } | null>(null);
  const [selected, setSelected] = useState<HanziAtlasItem | null>(() => findAtlasFromParam(requestedChar));
  const [showWords, setShowWords] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);
  // A seção "O que é Hànzì?" é aula, não dicionário: fica recolhida por padrão
  // para a busca aparecer sem rolagem.
  const [showLogic, setShowLogic] = useState(false);
  const learnedSet = useMemo(() => new Set(learnedChars), [learnedChars]);
  const favoriteSet = useMemo(() => new Set(favoriteItems), [favoriteItems]);
  const reviewedCharIds = useMemo(
    () => new Set(Object.values(srs).filter((item) => item.type === "char").map((item) => item.itemId)),
    [srs]
  );

  const filtered = useMemo(
    () => passesAtlasFilters(filters, completedLessons, learnedSet, favoriteSet, srs),
    [completedLessons, favoriteSet, filters, learnedSet, srs]
  );
  // O atalho de conjunto, quando ativo, substitui o filtro (mesma lista, outra lente).
  const visible = useMemo(
    () =>
      smartSet
        ? atlasSmartSetItems(smartSet, HANZI_ATLAS, {
            completedLessons,
            learnedSet,
            favoriteSet,
            srs,
            now: Date.now(),
          })
        : filtered,
    [completedLessons, favoriteSet, filtered, learnedSet, smartSet, srs]
  );
  const studySetIds = useMemo(
    () => buildAtlasStudySet(visible, { completedLessons, learnedSet }),
    [completedLessons, learnedSet, visible]
  );
  const smartSetLabel = SMART_SET_OPTIONS.find(([id]) => id === smartSet)?.[1];
  // Novo filtro recomeça do primeiro lote: senão a lista abre já gigante.
  useEffect(() => setShown(PAGE_SIZE), [filters, smartSet]);
  const page = useMemo(() => visible.slice(0, shown), [visible, shown]);
  const remaining = visible.length - page.length;

  useEffect(() => {
    const next = findAtlasFromParam(requestedChar);
    if (next) openDetail(next);
  }, [requestedChar]);

  const stats = useMemo(() => {
    const weakCount = HANZI_ATLAS.filter((item) => isWeakChar(item.id, srs)).length;
    const reviewedTodayCount = HANZI_ATLAS.filter((item) => wasReviewedToday(item.id, srs)).length;
    const availableCount = HANZI_ATLAS.filter((item) =>
      ["available", "learned"].includes(atlasContentAvailability(item, completedLessons, learnedSet))
    ).length;
    const masteredCount = [...reviewedCharIds].filter((charId) => isMasteredAtlasChar(charId, srs)).length;
    return {
      known: learnedSet.size,
      available: availableCount,
      mastered: masteredCount,
      favorites: HANZI_ATLAS.filter((item) => favoriteSet.has(`char:${item.id}`)).length,
      review: reviewedCharIds.size,
      weak: weakCount,
      reviewedToday: reviewedTodayCount,
    };
  }, [completedLessons, favoriteSet, learnedSet, reviewedCharIds, srs]);
  const sortLabel = SORT_OPTIONS.find(([value]) => value === filters.sort)?.[1] ?? "Frequência";

  function updateFilter<K extends keyof AtlasFilters>(key: K, value: AtlasFilters[K]) {
    setSmartSet(null);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function trainThisSet() {
    if (studySetIds.length === 0) return;
    navigate(atlasStudySetHref(studySetIds, smartSetLabel ? `Atlas · ${smartSetLabel}` : "Atlas · filtro atual"));
  }

  function addToReview(item: HanziAtlasItem) {
    if (!canPromoteAtlasItemToReview(item, completedLessons, learnedSet)) return;
    const itemRef = contentRefForAtlasItem(item);
    const itemId = itemRef?.split(":")[1] ?? item.sourceCharacter?.id ?? item.id;
    for (const domain of ["significado", "forma", "som"] as const) {
      gradeReviewDomain({
        ensureSrs,
        gradeSrs,
        type: "char",
        itemId,
        track: domain === "som" ? "som" : "hanzi",
        domain,
        grade: "good",
      });
    }
    // F3 — o botão agora diz o que aconteceu e quando o caractere volta.
    const scheduled = useStore.getState().srs[makeKey("char", itemId, "significado")];
    const when = scheduled ? describeNextDue(scheduled) : null;
    setReviewNotice({
      id: item.id,
      text: when ? `Adicionado ao treino · próxima revisão: ${when}` : "Adicionado ao treino",
    });
  }

  function openDetail(item: HanziAtlasItem) {
    setSelected(item);
    setShowWords(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionTitle
          eyebrow="Dicionário visual"
          title="Atlas de Hànzì"
          desc="Explore os caracteres chineses por frequência, som, radical e significado."
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:flex">
        <ButtonLink to="/biblioteca" variant="outline" className="w-full lg:w-auto">
          <IconLibrary width={17} height={17} /> Ver minha biblioteca
        </ButtonLink>
        <ButtonLink to="/hanzi" variant="outline" className="w-full lg:w-auto">
          <IconBook width={17} height={17} /> Treinar Hànzì
        </ButtonLink>
        </div>
      </div>

      {/* RC2.2.15 — Descobertas da Palavra do dia (só aparece quando há). */}
      <DailyDiscoveries />

      {/* Cabeçalho de uma linha: a busca do dicionário fica acima da dobra.
          Todo o conteúdo didático continua aqui dentro, a um toque. */}
      <section className="space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <button
          type="button"
          onClick={() => setShowLogic((current) => !current)}
          aria-expanded={showLogic}
          className="flex w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
        >
          <span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              Entenda a lógica
            </span>
            <span className="mt-0.5 block font-serif text-lg font-semibold text-ink">O que é Hànzì?</span>
          </span>
          <IconChevron
            width={18}
            height={18}
            className={`shrink-0 text-ink-faint transition-transform ${showLogic ? "-rotate-90" : "rotate-90"}`}
          />
        </button>

        {showLogic && (
          <>
            <p className="text-sm leading-6 text-ink-soft">
              Hànzì são os caracteres do chinês escrito. Pinyin mostra o som; hànzì mostra a forma real usada para ler
              e escrever.
            </p>

            <ButtonLink to="/licao/p1-o-que-e-hanzi" variant="soft" className="w-full lg:w-auto">
              <IconBook width={17} height={17} /> Aula guiada
            </ButtonLink>

            <div className="grid gap-3 sm:grid-cols-3">
              <LogicTile title="Não é alfabeto" example="你 ≠ n" body="Um caractere pode representar ideia, palavra, parte de palavra ou função." />
              <LogicTile title="Pinyin é som" example="sān" body="O pinyin guia a pronúncia e os tons; ele não substitui a escrita chinesa." />
              <LogicTile title="Como número" example="3 · 三" body="3 não é a palavra 'três', mas comunica a ideia; 三 faz isso em chinês." />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {HANZI_LOGIC_CARDS.map((card) => (
                <LogicTile key={card.title} title={card.title} example={card.example} body={card.body} />
              ))}
            </div>

            <div className="rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-6 text-ink-soft">
              Nem todo caractere moderno é um desenho. Muitos hànzì combinam uma peça de sentido com outra que sugere o som, como 妈: 女 ajuda no campo de sentido e 马 aponta para o som ma.
            </div>

            <div className="grid gap-4">
              {HANZI_EVOLUTION_CORE_IDS.map((charId) => {
                const model = HANZI_EVOLUTIONS[charId];
                return (
                  <HanziEvolutionCard
                    key={charId}
                    model={model}
                    compact
                    onTrain={() => navigate(`/hanzi?char=${model.charId}`)}
                  />
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Um único bloco de filtros para todos os tamanhos de tela. Antes havia
          duas cópias (uma md:hidden, outra hidden md:grid) com os mesmos
          controles — e um campo de busca morto marcado "hidden". */}
      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Busca</span>
          <input
            value={filters.query}
            onChange={(event) => updateFilter("query", event.target.value)}
            placeholder="Caractere, pinyin ou significado"
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none transition focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <SelectFilter
            label="Frequência"
            value={filters.frequency}
            onChange={(value) => updateFilter("frequency", value as FrequencyFilter)}
            options={[
              ["all", "Todos"],
              ["300", "Top 300"],
              ["1000", "Top 1000"],
            ]}
          />
          <SelectFilter
            label="Tom"
            value={filters.tone}
            onChange={(value) => updateFilter("tone", value as ToneFilter)}
            options={[
              ["all", "Todos"],
              ["1", "1º"],
              ["2", "2º"],
              ["3", "3º"],
              ["4", "4º"],
              ["5", "Neutro"],
            ]}
          />
          <SelectFilter
            label="Radical"
            value={filters.radical}
            onChange={(value) => updateFilter("radical", value)}
            options={[
              ["all", "Todos"],
              ...RADICALS.map((radical) => [radical.id, `${radical.glyph} ${radical.namePt}`] as [string, string]),
            ]}
          />
          <SelectFilter
            label="Domínio"
            value={filters.domain}
            onChange={(value) => updateFilter("domain", value as DomainFilter)}
            options={DOMAIN_OPTIONS}
          />
          <SelectFilter
            label="Ordem"
            value={filters.sort}
            onChange={(value) => updateFilter("sort", value as SortMode)}
            options={SORT_OPTIONS}
          />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <SegmentedButton active={filters.learned === "all"} onClick={() => updateFilter("learned", "all")}>Todos</SegmentedButton>
          <SegmentedButton active={filters.learned === "learned"} onClick={() => updateFilter("learned", "learned")}>Aprendidos</SegmentedButton>
          <SegmentedButton active={filters.learned === "available"} onClick={() => updateFilter("learned", "available")}>Disponíveis</SegmentedButton>
          <SegmentedButton active={filters.learned === "future"} onClick={() => updateFilter("learned", "future")}>Futuros</SegmentedButton>
          <FilterChip active={filters.decomposable} onClick={() => updateFilter("decomposable", !filters.decomposable)}>Decomponíveis</FilterChip>
          <FilterChip active={filters.phonetic} onClick={() => updateFilter("phonetic", !filters.phonetic)}>Com pista sonora</FilterChip>
          <FilterChip active={filters.favorites} onClick={() => updateFilter("favorites", !filters.favorites)}>Favoritos</FilterChip>
          <FilterChip active={filters.weak} onClick={() => updateFilter("weak", !filters.weak)}>Fracos</FilterChip>
          <FilterChip active={filters.reviewedToday} onClick={() => updateFilter("reviewedToday", !filters.reviewedToday)}>Revisados hoje</FilterChip>
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="h-9 shrink-0 rounded-full px-3 text-xs font-semibold text-ink-faint transition hover:bg-surface-2 hover:text-ink"
          >
            Limpar
          </button>
        </div>
      </section>

      {/* RC2.2.8 · F6 — metas do Atlas. Cada número é também um atalho: tocar
          filtra a lista para aquele conjunto (nada de coleção vazia de números). */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" data-testid="atlas-goals">
        <AtlasStat label="Conhecidos" value={stats.known} detail="no seu repertório" onClick={() => updateFilter("learned", "learned")} />
        <AtlasStat label="Dominados" value={stats.mastered} detail="3+ acertos seguidos" />
        <AtlasStat label="Fracos" value={stats.weak} detail="pedem treino" onClick={() => setSmartSet("weak")} />
        <AtlasStat label="Em revisão" value={stats.review} detail={`${stats.reviewedToday} hoje`} />
        <AtlasStat label="Favoritos" value={stats.favorites} detail="sua seleção" onClick={() => setSmartSet("favorites")} />
        <AtlasStat label="Disponíveis" value={stats.available} detail="liberados agora" />
      </div>

      {/* F1/F2 — conjuntos de estudo: atalho + "Treinar este conjunto" pela Revisão. */}
      <section className="space-y-3 rounded-2xl border border-accent/25 bg-accent-soft/40 p-4" data-testid="atlas-study-sets">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {SMART_SET_OPTIONS.map(([id, label]) => (
            <FilterChip
              key={id}
              active={smartSet === id}
              onClick={() => setSmartSet((current) => (current === id ? null : id))}
              testId={`atlas-smart-set-${id}`}
            >
              {label}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft" data-testid="atlas-study-set-count" data-study-set-size={studySetIds.length}>
            {studySetIds.length > 0
              ? `${studySetIds.length} hànzì aprendidos prontos para treinar${studySetIds.length >= ATLAS_STUDY_SET_MAX ? ` (máx. ${ATLAS_STUDY_SET_MAX})` : ""}.`
              : "Nenhum hànzì aprendido neste conjunto — só o que você já aprendeu entra no treino."}
          </p>
          <Button onClick={trainThisSet} disabled={studySetIds.length === 0} data-testid="atlas-train-set">
            <IconRefresh width={17} height={17} /> Treinar este conjunto
          </Button>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-ink-soft">
          {smartSetLabel ? `${smartSetLabel} · ` : ""}
          {formatNumber(visible.length)} caracteres chineses encontrados ·{" "}
          {formatNumber(stats.available)} liberados agora
        </div>
        <Pill tone={visible.some((item) => isWeakChar(item.id, srs)) ? "accent" : "muted"}>
          {sortLabel}
        </Pill>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {page.map((item) => {
          const favorite = favoriteSet.has(`char:${item.id}`);
          const weak = isWeakChar(item.id, srs);
          const availability = atlasContentAvailability(item, completedLessons, learnedSet);
          const canAddReview = canPromoteAtlasItemToReview(item, completedLessons, learnedSet);
          return (
            <HanziCard
              key={item.id}
              item={item}
              weak={weak}
              availability={availability}
              canAddReview={canAddReview}
              favorite={favorite}
              onToggleFavorite={() => toggleFavoriteItem(`char:${item.id}`)}
              onDetail={() => openDetail(item)}
              onAddReview={() => addToReview(item)}
              reviewNotice={reviewNotice?.id === item.id ? reviewNotice.text : null}
            />
          );
        })}
      </section>

      {remaining > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShown((current) => current + PAGE_SIZE)}>
            Ver mais {Math.min(remaining, PAGE_SIZE)} de {formatNumber(remaining)}
          </Button>
        </div>
      )}

      {visible.length === 0 && (
        <Card className="p-8 text-center text-sm text-ink-soft">
          Nenhum hànzì combinou com esses filtros.
        </Card>
      )}

      {selected && (
        <HanziDetailModal
          item={selected}
          weak={isWeakChar(selected.id, srs)}
          availability={atlasContentAvailability(selected, completedLessons, learnedSet)}
          canAddReview={canPromoteAtlasItemToReview(selected, completedLessons, learnedSet)}
          favorite={favoriteSet.has(`char:${selected.id}`)}
          showWords={showWords}
          onShowWords={() => setShowWords(true)}
          onClose={() => setSelected(null)}
          onToggleFavorite={() => toggleFavoriteItem(`char:${selected.id}`)}
          onAddReview={() => addToReview(selected)}
          onLearn={() => navigate(`/hanzi?char=${selected.id}`)}
          reviewNotice={reviewNotice?.id === selected.id ? reviewNotice.text : null}
          onOpenRelated={openDetail}
        />
      )}
    </div>
  );
}

function AtlasStat({
  label,
  value,
  detail,
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">{label}</div>
      <div className="font-serif text-lg font-semibold tabular-nums text-ink">{formatNumber(value)}</div>
      <div className="truncate text-[11px] text-ink-soft" title={detail}>{detail}</div>
    </>
  );
  const className = "rounded-xl border border-line bg-surface px-3 py-2 text-left shadow-card";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${className} transition hover:border-accent/50`}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}

function availabilityLabel(availability: ContentAvailability): string {
  if (availability === "learned") return "aprendido";
  if (availability === "available") return "disponível";
  if (availability === "hidden") return "oculto";
  return "futuro";
}

function LogicTile({ title, example, body }: { title: string; example: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
      <div className="text-sm font-semibold text-ink">{title}</div>
      <div className="mt-2 hanzi text-2xl text-accent">{example}</div>
      <p className="mt-2 text-xs leading-5 text-ink-soft">{body}</p>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none transition focus:ring-2 focus:ring-accent/25"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function SegmentedButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition",
        active ? "bg-ink text-bg" : "bg-surface-2 text-ink-soft hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FilterChip({
  active,
  children,
  onClick,
  testId,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className={[
        "h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition",
        active
          ? "border-transparent bg-accent-soft text-accent"
          : "border-line bg-surface text-ink-soft hover:bg-surface-2 hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function HanziCard({
  item,
  weak,
  availability,
  canAddReview,
  favorite,
  onToggleFavorite,
  onDetail,
  onAddReview,
  reviewNotice,
}: {
  item: HanziAtlasItem;
  weak: boolean;
  availability: ContentAvailability;
  canAddReview: boolean;
  favorite: boolean;
  onToggleFavorite: () => void;
  onDetail: () => void;
  onAddReview: () => void;
  reviewNotice: string | null;
}) {
  return (
    <article className="group rounded-[24px] border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onDetail} className="min-w-0 flex-1 text-left">
          <div className="flex items-end gap-3">
            <span className="hanzi text-7xl leading-none text-ink">{item.hanzi}</span>
            <span className="pb-1 text-xs font-semibold text-ink-faint">#{item.freqRank}</span>
          </div>
          <Pinyin text={item.pinyin} className="mt-2 block font-serif text-lg" />
          <div className="mt-1 line-clamp-1 text-sm font-medium text-ink">{item.meaningPt}</div>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <SpeakButton text={item.hanzi} size="md" />
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={favorite ? "Remover favorito" : "Favoritar"}
            className={["rounded-full border border-line bg-surface-2 p-2 transition active:scale-95", favorite ? "text-accent shadow-card" : "text-ink-faint hover:text-accent"].join(" ")}
          >
            <IconStar width={19} height={19} fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill tone={availability === "learned" ? "good" : availability === "available" ? "accent" : "muted"}>
          {availabilityLabel(availability)}
        </Pill>
        <Pill tone={item.hasLesson ? "good" : "muted"}>{item.hasLesson ? "tem lição" : "consulta"}</Pill>
        {weak && <Pill tone="accent">fraco</Pill>}
        {favorite && <Pill tone="accent">favorito</Pill>}
        {item.isPremium && <Pill tone="accent">Pro</Pill>}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="soft" className="w-full" onClick={onAddReview} disabled={!canAddReview}>
          <IconRefresh width={17} height={17} /> {canAddReview ? "Adicionar à revisão" : "Aprenda antes"}
        </Button>
        <Button variant="outline" className="w-full" onClick={onDetail}>
          Detalhes <IconChevron width={17} height={17} />
        </Button>
      </div>
      {reviewNotice && (
        <p role="status" className="mt-2 text-xs font-medium text-good" data-testid="atlas-review-notice">
          {reviewNotice}
        </p>
      )}
    </article>
  );
}

function HanziDetailModal({
  item,
  weak,
  availability,
  canAddReview,
  favorite,
  showWords,
  onShowWords,
  onClose,
  onToggleFavorite,
  onAddReview,
  onLearn,
  reviewNotice,
  onOpenRelated,
}: {
  item: HanziAtlasItem;
  weak: boolean;
  availability: ContentAvailability;
  canAddReview: boolean;
  favorite: boolean;
  showWords: boolean;
  onShowWords: () => void;
  onClose: () => void;
  onToggleFavorite: () => void;
  onAddReview: () => void;
  onLearn: () => void;
  reviewNotice: string | null;
  onOpenRelated: (item: HanziAtlasItem) => void;
}) {
  const related = relatedAtlasCharacters(item);
  const radical = item.radical ? radicalById[item.radical] : undefined;
  const phonetic = item.phonetic ? radicalById[item.phonetic] : undefined;
  const origin = hanziOriginNote(item.hanzi);
  const components = item.components ?? [];
  const senseParts = components
    .filter((componentId) => componentId !== item.phonetic)
    .map((componentId) => radicalById[componentId])
    .filter(Boolean);
  const lessonLinks = item.lessonIds.flatMap((id) => {
    const lesson = LESSON_BY_ID.get(id);
    return lesson ? [lesson] : [];
  }).slice(0, 5);
  const hasWords = item.examples.length > 0;

  return (
    <ModalOverlay className="px-3 py-3 sm:p-6" label="Detalhe do hanzi">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-bg shadow-lift">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Detalhe do hànzì</div>
            <div className="truncate font-serif text-xl font-semibold text-ink">{item.hanzi} · {item.meaningPt}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-faint transition hover:bg-surface-2 hover:text-ink" aria-label="Fechar">
            <IconX width={22} height={22} />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="bg-surface px-5 py-6 text-center sm:px-8">
            <div className="hanzi text-[8rem] leading-none text-accent sm:text-[10rem]">{item.hanzi}</div>
            <div className="mt-3 flex items-center justify-center gap-3">
              <Pinyin text={item.pinyin} className="font-serif text-2xl" />
              <SpeakButton text={item.hanzi} size="md" />
            </div>
            <div className="mt-2 text-lg font-semibold text-ink">{item.meaningPt}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Pill tone={availability === "learned" ? "good" : availability === "available" ? "accent" : "muted"}>
                {availabilityLabel(availability)}
              </Pill>
              <Pill tone={item.hasLesson ? "good" : "muted"}>{item.hasLesson ? "tem lição" : "consulta"}</Pill>
              {weak && <Pill tone="accent">fraco</Pill>}
              {favorite && <Pill tone="accent">favorito</Pill>}
              {item.isPremium && <Pill tone="accent">Pro</Pill>}
              <Pill>tom {item.tone === 5 ? "neutro" : item.tone}</Pill>
            </div>
          </section>

          <section className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailFact label="Frequência" value={`#${item.freqRank}`} />
              <DetailFact label="Traços" value={item.strokeCount ? `${item.strokeCount}` : "em breve"} />
              <DetailFact label="Radical" value={radical ? `${radical.glyph} ${radical.namePt}` : "não mapeado"} />
              <DetailFact label="HSK" value={item.hskLevel ? `HSK ${item.hskLevel}` : "fora do núcleo inicial"} />
            </div>

            <div>
              <div className="text-sm font-semibold text-ink">Componentes</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {components.length > 0 ? components.map((componentId, index) => {
                  const component = radicalById[componentId];
                  return (
                    <span key={`${componentId}-${index}`} className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink">
                      <span className="hanzi text-lg">{component?.variant ?? component?.glyph ?? componentId}</span>
                      <span className="ml-2 text-ink-soft">{component?.namePt ?? componentId}</span>
                    </span>
                  );
                }) : (
                  <span className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-soft">sem decomposição no dataset atual</span>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-2 px-4 py-3">
                <div className="text-sm font-semibold text-ink">Peça de sentido</div>
                <p className="mt-1 text-sm text-ink-soft">
                  {senseParts.length > 0 ? senseParts.map((part) => `${part.glyph} ${part.namePt}`).join(", ") : "ainda não mapeada"}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-2 px-4 py-3">
                <div className="text-sm font-semibold text-ink">Peça de som</div>
                <p className="mt-1 text-sm text-ink-soft">
                  {phonetic ? `${phonetic.glyph} ${phonetic.pinyin ?? ""}` : "não há pista sonora cadastrada"}
                </p>
              </div>
            </div>

            {item.sourceCharacter && item.sourceCharacter.components.length > 0 && (
              <div className="rounded-2xl border border-line bg-surface px-3 py-5">
                <DecompositionCard char={item.sourceCharacter} />
              </div>
            )}

            {/* RC2.2.15 · R–T — origem só com fonte; mnemônico é "Dica para lembrar". */}
            {origin && (
              <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm" data-testid="atlas-origin" data-story-status="VERIFIED_HISTORICAL">
                <div className="font-semibold text-ink">Origem do caractere</div>
                <p className="mt-1 text-ink-soft">{origin.notePt}</p>
                <p className="mt-1 text-xs text-ink-faint">Fonte: {origin.sources.map((source) => `${source.title} — ${source.detail}`).join("; ")}</p>
              </div>
            )}
            {item.mnemonicPt && (
              <div className="rounded-2xl bg-accent-soft/55 px-4 py-3 text-sm text-ink" data-testid="atlas-mnemonic" data-story-status="PEDAGOGICAL_MNEMONIC">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Dica para lembrar</div>
                <p className="mt-1">{item.mnemonicPt}</p>
              </div>
            )}

            {/* F5 — família de componentes: só relações que o dataset já
                registra (radical, peça de som, peça de sentido). Sem etimologia inventada. */}
            {related.length > 0 && (
              <div data-testid="atlas-related">
                <div className="text-sm font-semibold text-ink">Caracteres relacionados</div>
                <div className="mt-2 space-y-2">
                  {related.map((group) => (
                    <div key={group.kind}>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{group.label}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {group.items.map((relatedItem) => (
                          <button
                            key={relatedItem.id}
                            type="button"
                            onClick={() => onOpenRelated(relatedItem)}
                            className="min-h-11 rounded-xl bg-surface-2 px-3 py-1.5 text-left transition hover:bg-line/60"
                          >
                            <span className="hanzi text-2xl text-ink">{relatedItem.hanzi}</span>
                            <span className="ml-2 text-xs text-ink-soft">{relatedItem.meaningPt}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="space-y-5 border-t border-line p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {item.hasLesson ? (
              <Button onClick={onLearn}>
                <IconTarget width={17} height={17} /> Aprender agora
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <IconTarget width={17} height={17} /> Consulta
              </Button>
            )}
            <Button variant="soft" onClick={onAddReview} disabled={!canAddReview}>
              <IconRefresh width={17} height={17} /> {canAddReview ? "Adicionar à revisão" : "Aprenda antes"}
            </Button>
            {reviewNotice && (
              <span role="status" className="self-center text-xs font-medium text-good" data-testid="atlas-review-notice">
                {reviewNotice}
              </span>
            )}
            <Button variant="outline" onClick={onToggleFavorite}>
              <IconStar width={17} height={17} fill={favorite ? "currentColor" : "none"} /> Favoritar
            </Button>
            <Button variant="outline" onClick={onShowWords} disabled={!hasWords}>
              <IconLibrary width={17} height={17} /> Ver palavras
            </Button>
            {lessonLinks[0] && (
              <ButtonLink to={`/licao/${lessonLinks[0].id}`} variant="outline">
                Ver na jornada
              </ButtonLink>
            )}
          </div>

          {(showWords || hasWords) && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="mb-3 text-sm font-semibold text-ink">Palavras e frases relacionadas</div>
                <div className="space-y-2">
                  {item.examples.length > 0 ? item.examples.map((example) => (
                    <div key={`${example.hanzi}-${example.pinyin}`} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
                      <div className="min-w-0">
                        <GlossText text={example.hanzi} className="text-xl text-ink" />
                        <div className="mt-0.5 text-xs text-ink-soft">
                          <Pinyin text={example.pinyin} className="font-serif" /> · {example.pt}
                        </div>
                      </div>
                      <SpeakButton text={example.hanzi} size="sm" />
                    </div>
                  )) : (
                    <p className="text-sm text-ink-soft">Sem exemplos cadastrados ainda.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="mb-3 text-sm font-semibold text-ink">Lições onde aparece</div>
                <div className="space-y-2">
                  {lessonLinks.length > 0 ? lessonLinks.map((lesson) => (
                    <Link key={lesson.id} to={`/licao/${lesson.id}`} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm transition hover:bg-line/60">
                      <span className="font-medium text-ink">{lesson.title}</span>
                      <IconChevron width={16} height={16} className="text-ink-faint" />
                    </Link>
                  )) : (
                    <p className="text-sm text-ink-soft">Ainda não aparece em uma lição mapeada.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </ModalOverlay>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function passesAtlasFilters(
  filters: AtlasFilters,
  completedLessons: string[],
  learnedSet: Set<string>,
  favoriteSet: Set<string>,
  srs: Record<string, SRSItem>
): HanziAtlasItem[] {
  const items = filterAtlas({
    query: filters.query,
    frequency: filters.frequency === "all" ? "all" : (Number(filters.frequency) as 300 | 1000),
    tone: filters.tone === "all" ? "all" : (Number(filters.tone) as 1 | 2 | 3 | 4 | 5),
    radical: filters.radical,
    hasDecomposition: filters.decomposable ? true : undefined,
    hasPhonetic: filters.phonetic ? true : undefined,
  }).filter((item) => {
    const availability = atlasContentAvailability(item, completedLessons, learnedSet);
    if (availability === "hidden") return false;
    if (filters.learned === "learned" && availability !== "learned") return false;
    if (filters.learned === "available" && availability !== "available" && availability !== "learned") return false;
    if (filters.learned === "future" && availability !== "futureLocked") return false;
    if (filters.favorites && !favoriteSet.has(`char:${item.id}`)) return false;
    if (filters.weak && !isWeakChar(item.id, srs)) return false;
    if (filters.reviewedToday && !wasReviewedToday(item.id, srs)) return false;
    if (filters.domain !== "all" && atlasDomain(item) !== filters.domain) return false;
    return true;
  });

  return sortAtlasItems(items, filters.sort, srs);
}

function isWeakChar(charId: string, srs: Record<string, SRSItem>): boolean {
  return REVIEW_DOMAIN_ORDER
    .map((domain) => srs[makeKey("char", charId, domain)])
    .filter(Boolean)
    .some((item) => item.lapses > 0 || (item.reps === 0 && item.due <= Date.now()));
}

function charSrsItems(charId: string, srs: Record<string, SRSItem>): SRSItem[] {
  return REVIEW_DOMAIN_ORDER
    .map((domain) => srs[makeKey("char", charId, domain)])
    .filter(Boolean);
}

function latestReviewAt(charId: string, srs: Record<string, SRSItem>): number {
  return Math.max(0, ...charSrsItems(charId, srs).map((item) => item.reviewedAt ?? item.createdAt ?? 0));
}

function wasReviewedToday(charId: string, srs: Record<string, SRSItem>): boolean {
  const today = todayKey();
  return charSrsItems(charId, srs).some((item) => item.reviewedAt && todayKey(new Date(item.reviewedAt)) === today);
}

function sortAtlasItems(items: HanziAtlasItem[], sort: SortMode, srs: Record<string, SRSItem>): HanziAtlasItem[] {
  const sorted = [...items];
  if (sort === "recent") {
    return sorted.sort((a, b) => latestReviewAt(b.id, srs) - latestReviewAt(a.id, srs) || a.freqRank - b.freqRank);
  }
  if (sort === "weak") {
    return sorted.sort((a, b) => Number(isWeakChar(b.id, srs)) - Number(isWeakChar(a.id, srs)) || a.freqRank - b.freqRank);
  }
  return sorted.sort((a, b) => a.freqRank - b.freqRank || a.hanzi.localeCompare(b.hanzi));
}

function atlasDomain(item: HanziAtlasItem): DomainFilter {
  if ("一二三四五六七八九十零两百千".includes(item.hanzi) || item.meaningPt.includes("número")) return "numero";
  if (["de", "le", "bu", "shi", "you", "zai", "ge", "ma_question", "ba_suggest"].includes(item.id)) return "funcao";
  const componentCategories = (item.components ?? [])
    .map((componentId) => radicalById[componentId]?.category)
    .filter(Boolean);
  if (componentCategories.some((category) => category === "fala")) return "fala";
  if (componentCategories.some((category) => category === "pessoa")) return "pessoa";
  if (componentCategories.some((category) => category === "natureza" || category === "agua")) return "natureza";
  if (item.meaningPt.match(/pessoa|mulher|filho|amigo|pai|mãe|professor/i)) return "pessoa";
  if (item.meaningPt.match(/falar|ouvir|perguntar|boca|palavra|língua/i)) return "fala";
  if (item.meaningPt.match(/árvore|água|fogo|sol|lua|montanha|terra|planta/i)) return "natureza";
  return "vida";
}

type RelatedGroup = { kind: "radical" | "phonetic" | "semantic"; label: string; items: HanziAtlasItem[] };
const RELATED_LIMIT = 8;

/** F5 — relações que o dataset já traz: mesmo radical, mesma peça de som, peça de sentido em comum. */
function relatedAtlasCharacters(item: HanziAtlasItem): RelatedGroup[] {
  const groups: RelatedGroup[] = [];
  const others = HANZI_ATLAS.filter((candidate) => candidate.id !== item.id);
  if (item.radical) {
    const radical = radicalById[item.radical];
    const items = others.filter((candidate) => candidate.radical === item.radical).slice(0, RELATED_LIMIT);
    if (items.length) groups.push({ kind: "radical", label: `Mesmo radical${radical ? ` · ${radical.glyph}` : ""}`, items });
  }
  if (item.phonetic) {
    const phonetic = radicalById[item.phonetic];
    const items = others.filter((candidate) => candidate.phonetic === item.phonetic).slice(0, RELATED_LIMIT);
    if (items.length) groups.push({ kind: "phonetic", label: `Mesma peça de som${phonetic ? ` · ${phonetic.glyph}` : ""}`, items });
  }
  const semantic = (item.components ?? []).filter((componentId) => componentId !== item.phonetic && componentId !== item.radical);
  if (semantic.length) {
    const items = others
      .filter((candidate) => (candidate.components ?? []).some((componentId) => semantic.includes(componentId)))
      .slice(0, RELATED_LIMIT);
    if (items.length) groups.push({ kind: "semantic", label: "Peça de sentido em comum", items });
  }
  return groups;
}
