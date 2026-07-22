import { useEffect, useMemo, useState } from "react";
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
import { makeKey, type SRSItem } from "../../lib/srs";
import { todayKey } from "../../lib/storage";
import { useStore } from "../../lib/store";
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

const DOMAIN_OPTIONS: Array<[DomainFilter, string]> = [
  ["all", "Todos"],
  ["natureza", "Natureza"],
  ["pessoa", "Pessoas"],
  ["fala", "Fala"],
  ["numero", "Números"],
  ["funcao", "Função"],
  ["vida", "Vida real"],
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
  const [selected, setSelected] = useState<HanziAtlasItem | null>(() => findAtlasFromParam(requestedChar));
  const [showWords, setShowWords] = useState(false);
  const learnedSet = useMemo(() => new Set(learnedChars), [learnedChars]);
  const favoriteSet = useMemo(() => new Set(favoriteItems), [favoriteItems]);
  const reviewedCharIds = useMemo(
    () => new Set(Object.values(srs).filter((item) => item.type === "char").map((item) => item.itemId)),
    [srs]
  );

  const visible = useMemo(
    () => passesAtlasFilters(filters, completedLessons, learnedSet, favoriteSet, srs),
    [completedLessons, favoriteSet, filters, learnedSet, srs]
  );

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
    return {
      known: learnedSet.size,
      available: availableCount,
      top300: HANZI_ATLAS.filter((item) => item.freqRank <= 300).length,
      top1000: HANZI_ATLAS.filter((item) => item.freqRank <= 1000).length,
      review: reviewedCharIds.size,
      weak: weakCount,
      reviewedToday: reviewedTodayCount,
    };
  }, [completedLessons, learnedSet, reviewedCharIds.size, srs]);
  const sortLabel = SORT_OPTIONS.find(([value]) => value === filters.sort)?.[1] ?? "Frequência";

  function updateFilter<K extends keyof AtlasFilters>(key: K, value: AtlasFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
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

      <section className="space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            eyebrow="Entenda a lógica"
            title="O que é Hànzì?"
            desc="Hànzì são os caracteres do chinês escrito. Pinyin mostra o som; hànzì mostra a forma real usada para ler e escrever."
          />
          <ButtonLink to="/licao/p1-o-que-e-hanzi" variant="soft" className="w-full lg:w-auto">
            <IconBook width={17} height={17} /> Aula guiada
          </ButtonLink>
        </div>

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
      </section>

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

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
          <FilterChip active={filters.frequency === "300"} onClick={() => updateFilter("frequency", filters.frequency === "300" ? "all" : "300")}>Top 300</FilterChip>
          <FilterChip active={filters.frequency === "1000"} onClick={() => updateFilter("frequency", filters.frequency === "1000" ? "all" : "1000")}>Top 1000</FilterChip>
          {(["1", "2", "3", "4", "5"] as ToneFilter[]).map((tone) => (
            <FilterChip key={tone} active={filters.tone === tone} onClick={() => updateFilter("tone", filters.tone === tone ? "all" : tone)}>
              {tone === "5" ? "Neutro" : `${tone}º tom`}
            </FilterChip>
          ))}
          <select
            aria-label="Radical"
            value={filters.radical}
            onChange={(event) => updateFilter("radical", event.target.value)}
            className="h-9 shrink-0 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink-soft outline-none transition focus:ring-2 focus:ring-accent/25"
          >
            <option value="all">Radical</option>
            {RADICALS.map((radical) => (
              <option key={radical.id} value={radical.id}>{radical.glyph} {radical.namePt}</option>
            ))}
          </select>
          <select
            aria-label="Domínio"
            value={filters.domain}
            onChange={(event) => updateFilter("domain", event.target.value as DomainFilter)}
            className="h-9 shrink-0 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink-soft outline-none transition focus:ring-2 focus:ring-accent/25"
          >
            {DOMAIN_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            aria-label="Ordenação"
            value={filters.sort}
            onChange={(event) => updateFilter("sort", event.target.value as SortMode)}
            className="h-9 shrink-0 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink-soft outline-none transition focus:ring-2 focus:ring-accent/25"
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <FilterChip active={filters.learned === "learned"} onClick={() => updateFilter("learned", filters.learned === "learned" ? "all" : "learned")}>Aprendidos</FilterChip>
          <FilterChip active={filters.learned === "available"} onClick={() => updateFilter("learned", filters.learned === "available" ? "all" : "available")}>Disponíveis</FilterChip>
          <FilterChip active={filters.learned === "future"} onClick={() => updateFilter("learned", filters.learned === "future" ? "all" : "future")}>Futuros</FilterChip>
          <FilterChip active={filters.decomposable} onClick={() => updateFilter("decomposable", !filters.decomposable)}>Decomponíveis</FilterChip>
          <FilterChip active={filters.phonetic} onClick={() => updateFilter("phonetic", !filters.phonetic)}>Pista sonora</FilterChip>
          <FilterChip active={filters.favorites} onClick={() => updateFilter("favorites", !filters.favorites)}>Favoritos</FilterChip>
          <FilterChip active={filters.weak} onClick={() => updateFilter("weak", !filters.weak)}>Fracos</FilterChip>
          <FilterChip active={filters.reviewedToday} onClick={() => updateFilter("reviewedToday", !filters.reviewedToday)}>Hoje</FilterChip>
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="h-9 shrink-0 rounded-full px-3 text-xs font-semibold text-ink-faint transition hover:bg-surface-2 hover:text-ink"
          >
            Limpar
          </button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <AtlasStat label="Conhecidos" value={stats.known} detail="no seu repertório" />
        <AtlasStat label="Disponíveis" value={stats.available} detail="liberados agora" />
        <AtlasStat label="Top 300" value={stats.top300} detail="alta frequência" />
        <AtlasStat label="Top 1000" value={stats.top1000} detail="consulta ampliada" />
        <AtlasStat label="Em revisão" value={stats.review} detail={`${stats.reviewedToday} revisado(s) hoje`} />
        <AtlasStat label="Fracos" value={stats.weak} detail="pedem treino" />
      </div>

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="hidden gap-3 md:grid md:grid-cols-5">
          <label className="hidden">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Busca</span>
            <input
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder="Caractere, pinyin ou significado"
              className="mt-1 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none transition focus:ring-2 focus:ring-accent/25"
            />
          </label>

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

        <div className="-mx-1 hidden gap-2 overflow-x-auto px-1 pb-1 md:flex">
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

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-ink-soft">
          {visible.length.toLocaleString("pt-BR")} caracteres chineses encontrados ·{" "}
          {stats.available.toLocaleString("pt-BR")} liberados agora
        </div>
        <Pill tone={visible.some((item) => isWeakChar(item.id, srs)) ? "accent" : "muted"}>
          {sortLabel}
        </Pill>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => {
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
            />
          );
        })}
      </section>

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
        />
      )}
    </div>
  );
}

function AtlasStat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-1 font-serif text-2xl font-semibold text-ink">{value.toLocaleString("pt-BR")}</div>
      <div className="text-xs text-ink-soft">{detail}</div>
    </div>
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

function FilterChip({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
}: {
  item: HanziAtlasItem;
  weak: boolean;
  availability: ContentAvailability;
  canAddReview: boolean;
  favorite: boolean;
  onToggleFavorite: () => void;
  onDetail: () => void;
  onAddReview: () => void;
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
}) {
  const radical = item.radical ? radicalById[item.radical] : undefined;
  const phonetic = item.phonetic ? radicalById[item.phonetic] : undefined;
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

            {item.mnemonicPt && (
              <div className="rounded-2xl bg-accent-soft/55 px-4 py-3 text-sm text-ink">
                {item.mnemonicPt}
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
