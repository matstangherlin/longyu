import { useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CHARACTERS, charById } from "../../data/characters";
import { CHUNKS, chunkById } from "../../data/chunks";
import { ALL_LESSONS, JOURNEY, type Lesson, type LessonStep } from "../../data/journey";
import { availableMicrotexts, MICROTEXTS } from "../../data/microtexts";
import { RADICALS, radicalById } from "../../data/radicals";
import { REVIEW_DOMAIN_META, REVIEW_DOMAIN_ORDER } from "../../data/reviewDomains";
import type { Character, Chunk, ItemType, MicroText } from "../../data/types";
import { DecompositionCard } from "../../components/hanzi/DecompositionCard";
import { MandarinText } from "../../components/hanzi/MandarinText";
import { Button, Card, HubCard, Pill, ProgressBar, SectionTitle } from "../../components/ui/primitives";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { SpeakButton } from "../../components/ui/SpeakButton";
import {
  IconBook,
  IconChat,
  IconCheck,
  IconChevron,
  IconHanzi,
  IconLibrary,
  IconRefresh,
  IconShield,
  IconSound,
  IconStar,
  IconX,
} from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import { describeNextDue, makeKey, type ReviewDomain, type SRSItem } from "../../lib/srs";

type LibraryTab = "chars" | "words" | "chunks" | "phrases" | "texts" | "favorites" | "weak" | "recent";
type ChunkRole = "word" | "chunk" | "phrase";
type DetailTarget =
  | { kind: "char"; item: Character }
  | { kind: "chunk"; item: Chunk; role: ChunkRole }
  | { kind: "text"; item: MicroText; knownPercent: number };

interface SourceMeta {
  phaseId: string;
  phaseTitle: string;
  unitId: string;
  unitTitle: string;
  lessonId: string;
  lessonTitle: string;
  order: number;
}

interface Filters {
  phase: string;
  module: string;
  tone: string;
  radical: string;
  domain: string;
  weakOnly: boolean;
  favoritesOnly: boolean;
  reviewedToday: boolean;
  recentOrder: boolean;
}

interface CharacterEntry {
  kind: "char";
  key: string;
  item: Character;
  source?: SourceMeta;
  mastery: number;
  weak: boolean;
  favorite: boolean;
  reviewedToday: boolean;
  updatedAt: number;
  tones: number[];
  radicalIds: string[];
}

interface ChunkEntry {
  kind: "chunk";
  key: string;
  item: Chunk;
  role: ChunkRole;
  source?: SourceMeta;
  mastery: number;
  weak: boolean;
  favorite: boolean;
  reviewedToday: boolean;
  updatedAt: number;
  tones: number[];
  radicalIds: string[];
}

interface TextEntry {
  kind: "text";
  key: string;
  item: MicroText;
  source?: SourceMeta;
  knownPercent: number;
  weak: boolean;
  favorite: boolean;
  reviewedToday: boolean;
  updatedAt: number;
  tones: number[];
  radicalIds: string[];
}

type LibraryEntry = CharacterEntry | ChunkEntry | TextEntry;

const TABS: { id: LibraryTab; label: string }[] = [
  { id: "chars", label: "Caracteres" },
  { id: "words", label: "Palavras" },
  { id: "chunks", label: "Chunks" },
  { id: "phrases", label: "Frases" },
  { id: "texts", label: "Textos" },
  { id: "favorites", label: "Favoritos" },
  { id: "weak", label: "Fracos" },
  { id: "recent", label: "Recentes" },
];

const CHAR_CARD_DOMAINS: ReviewDomain[] = ["som", "pinyin", "forma", "significado", "uso", "leitura"];
const ALL_ITEM_DOMAINS: ReviewDomain[] = ["som", "pinyin", "fala", "significado", "forma", "uso", "leitura"];
const CHARS_BY_HANZI = Object.fromEntries(CHARACTERS.map((char) => [char.hanzi, char]));
const SOURCE_INDEX = buildSourceIndex();

const DEFAULT_FILTERS: Filters = {
  phase: "all",
  module: "all",
  tone: "all",
  radical: "all",
  domain: "all",
  weakOnly: false,
  favoritesOnly: false,
  reviewedToday: false,
  recentOrder: false,
};

export function BibliotecaPage() {
  const navigate = useNavigate();
  const learnedChars = useStore((s) => s.learnedChars);
  const learnedChunks = useStore((s) => s.learnedChunks);
  const completedLessons = useStore((s) => s.completedLessons);
  const srs = useStore((s) => s.srs);
  const favoriteItems = useStore((s) => s.favoriteItems);
  const toggleFavoriteItem = useStore((s) => s.toggleFavoriteItem);

  const [activeTab, setActiveTab] = useState<LibraryTab>("chars");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // No mobile, os filtros começam recolhidos: primeiro os atalhos, depois os filtros.
  const [showFilters, setShowFilters] = useState(false);
  const listRef = useRef<HTMLElement>(null);

  function goToTab(tab: LibraryTab) {
    setActiveTab(tab);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const library = useMemo(
    () => buildLibrary({ learnedChars, learnedChunks, completedLessons, srs, favoriteItems }),
    [completedLessons, favoriteItems, learnedChars, learnedChunks, srs]
  );

  const visibleItems = useMemo(() => {
    const base = itemsForTab(activeTab, library);
    const filtered = base.filter((item) => passesFilters(item, filters, srs));
    return [...filtered].sort((a, b) => {
      if (activeTab === "recent" || filters.recentOrder) return b.updatedAt - a.updatedAt;
      return (a.source?.order ?? 9999) - (b.source?.order ?? 9999) || titleForEntry(a).localeCompare(titleForEntry(b), "pt-BR");
    });
  }, [activeTab, filters, library, srs]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function copyPinyin(text: string, key: string) {
    void navigator.clipboard?.writeText(formatPinyinForDisplay(text));
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1200);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <SectionTitle
        eyebrow="Caderno inteligente"
        title="Minha biblioteca"
        desc="Tudo o que você já encontrou no Longyu, organizado por domínio, contexto, força de memória e revisão."
      />

      {/* Hub da Biblioteca — cards de entrada; no mobile aparecem antes dos filtros. */}
      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <HubCard
          title="Minha biblioteca"
          desc="Tudo o que você já viu nas lições."
          icon={IconLibrary}
          featured
          onClick={() => { setFilters(DEFAULT_FILTERS); goToTab("chars"); }}
        />
        <HubCard
          title="Ideogramas / Atlas de Hànzì"
          desc="Caracteres por frequência, tom e radical."
          icon={IconHanzi}
          featured
          onClick={() => navigate("/ideogramas")}
        />
        <HubCard
          title="Palavras"
          desc="Vocabulário essencial."
          icon={IconChat}
          onClick={() => goToTab("words")}
        />
        <HubCard
          title="Chunks"
          desc="Blocos prontos de fala."
          icon={IconSound}
          onClick={() => goToTab("chunks")}
        />
        <HubCard
          title="Textos"
          desc="Microleituras guiadas."
          icon={IconBook}
          onClick={() => goToTab("texts")}
        />
        <HubCard
          title="Favoritos"
          desc="Itens que você marcou."
          icon={IconStar}
          onClick={() => goToTab("favorites")}
        />
        <HubCard
          title="Fracos"
          desc="O que precisa voltar na revisão."
          icon={IconShield}
          onClick={() => goToTab("weak")}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NotebookStat label="Caracteres" value={library.chars.length} total={CHARACTERS.length} icon={<IconHanzi width={18} height={18} />} />
        <NotebookStat label="Chunks" value={library.chunks.length} total={CHUNKS.length} icon={<IconChat width={18} height={18} />} />
        <NotebookStat label="Textos" value={library.texts.length} total={MICROTEXTS.length} icon={<IconBook width={18} height={18} />} />
        <NotebookStat label="Fracos" value={library.all.filter((item) => item.weak).length} total={Math.max(1, library.all.length)} icon={<IconShield width={18} height={18} />} />
      </section>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const count = itemsForTab(tab.id, library).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                  active ? "border-accent bg-accent text-white shadow-card" : "border-line bg-surface text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                {tab.label}
                <span className={active ? "text-white/75" : "text-ink-faint"}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowFilters((value) => !value)}
        className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-card lg:hidden"
      >
        <span>Filtros</span>
        <IconChevron width={18} height={18} className={showFilters ? "-rotate-90" : "rotate-90"} />
      </button>

      <Card className={[showFilters ? "block" : "hidden", "p-4 sm:p-5 lg:block"].join(" ")}>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink">Filtros</h2>
            <p className="text-sm text-ink-soft">Afine por fase, módulo, tom, radical, domínio e estado de revisão.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Limpar filtros
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterSelect label="Fase" value={filters.phase} onChange={(value) => updateFilter("phase", value)}>
            <option value="all">Todas as fases</option>
            {JOURNEY.map((phase) => (
              <option key={phase.id} value={phase.id}>
                Fase {phase.order}: {phase.title}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Módulo" value={filters.module} onChange={(value) => updateFilter("module", value)}>
            <option value="all">Todos os módulos</option>
            {JOURNEY.flatMap((phase) => phase.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {phase.order}.{phase.units.indexOf(unit) + 1} {unit.title}
              </option>
            )))}
          </FilterSelect>
          <FilterSelect label="Tom" value={filters.tone} onChange={(value) => updateFilter("tone", value)}>
            <option value="all">Todos os tons</option>
            <option value="1">1º tom</option>
            <option value="2">2º tom</option>
            <option value="3">3º tom</option>
            <option value="4">4º tom</option>
            <option value="5">Neutro</option>
          </FilterSelect>
          <FilterSelect label="Radical" value={filters.radical} onChange={(value) => updateFilter("radical", value)}>
            <option value="all">Todos os radicais</option>
            {RADICALS.map((radical) => (
              <option key={radical.id} value={radical.id}>
                {radical.glyph} · {radical.namePt}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Domínio" value={filters.domain} onChange={(value) => updateFilter("domain", value)}>
            <option value="all">Todos os domínios</option>
            {REVIEW_DOMAIN_ORDER.map((domain) => (
              <option key={domain} value={domain}>
                {REVIEW_DOMAIN_META[domain].label}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <FilterToggle active={filters.weakOnly} onClick={() => updateFilter("weakOnly", !filters.weakOnly)}>
            Fracos
          </FilterToggle>
          <FilterToggle active={filters.favoritesOnly} onClick={() => updateFilter("favoritesOnly", !filters.favoritesOnly)}>
            Favoritos
          </FilterToggle>
          <FilterToggle active={filters.reviewedToday} onClick={() => updateFilter("reviewedToday", !filters.reviewedToday)}>
            Revisados hoje
          </FilterToggle>
          <FilterToggle active={filters.recentOrder} onClick={() => updateFilter("recentOrder", !filters.recentOrder)}>
            Ordem recente
          </FilterToggle>
        </div>
      </Card>

      <section ref={listRef} className="scroll-mt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink">{TABS.find((tab) => tab.id === activeTab)?.label}</h2>
            <p className="text-sm text-ink-soft">{visibleItems.length} {visibleItems.length === 1 ? "item encontrado" : "itens encontrados"}</p>
          </div>
          <Pill tone={visibleItems.some((item) => item.weak) ? "accent" : "muted"}>
            {library.all.filter((item) => item.favorite).length} favoritos
          </Pill>
        </div>

        {visibleItems.length === 0 ? (
          <EmptyNotebook activeTab={activeTab} hasLearnedChars={library.chars.length > 0} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((entry) => {
              if (entry.kind === "char") {
                return (
                  <CharacterCard
                    key={entry.key}
                    entry={entry}
                    srs={srs}
                    onDetail={() => setDetail({ kind: "char", item: entry.item })}
                    onFavorite={() => toggleFavoriteItem(entry.key)}
                    onReview={() => navigate("/revisao")}
                  />
                );
              }
              if (entry.kind === "text") {
                return (
                  <TextCard
                    key={entry.key}
                    entry={entry}
                    onFavorite={() => toggleFavoriteItem(entry.key)}
                    onRead={() => navigate("/leitura")}
                    onDetail={() => setDetail({ kind: "text", item: entry.item, knownPercent: entry.knownPercent })}
                  />
                );
              }
              return (
                <ChunkCard
                  key={entry.key}
                  entry={entry}
                  srs={srs}
                  copied={copiedKey === entry.key}
                  onCopy={() => copyPinyin(entry.item.pinyin, entry.key)}
                  onDetail={() => setDetail({ kind: "chunk", item: entry.item, role: entry.role })}
                  onFavorite={() => toggleFavoriteItem(entry.key)}
                  onReview={() => navigate("/revisao")}
                  onSpeakPractice={() => navigate("/fala")}
                />
              );
            })}
          </div>
        )}
      </section>

      {detail && (
        <DetailModal
          detail={detail}
          srs={srs}
          favoriteItems={favoriteItems}
          copiedKey={copiedKey}
          onClose={() => setDetail(null)}
          onToggleFavorite={toggleFavoriteItem}
          onCopy={copyPinyin}
          onReview={() => navigate("/revisao")}
          onPracticeSpeech={() => navigate("/fala")}
          onReadContext={() => navigate("/leitura")}
        />
      )}
    </div>
  );
}

function NotebookStat({ label, value, total, icon }: { label: string; value: number; total: number; icon: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
        <span className="text-accent">{icon}</span>
      </div>
      <div className="mt-3 font-serif text-3xl font-semibold text-ink">
        {value}
        <span className="text-base font-normal text-ink-faint"> / {total}</span>
      </div>
      <ProgressBar value={value} max={Math.max(1, total)} className="mt-3" />
    </Card>
  );
}

function CharacterCard({
  entry,
  srs,
  onDetail,
  onFavorite,
  onReview,
}: {
  entry: CharacterEntry;
  srs: Record<string, SRSItem>;
  onDetail: () => void;
  onFavorite: () => void;
  onReview: () => void;
}) {
  const char = entry.item;
  return (
    <Card className="flex min-h-[300px] flex-col overflow-hidden bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            {entry.source?.phaseTitle ?? "Biblioteca"}
          </div>
          <MandarinText hanzi={char.hanzi} pinyin={char.pinyin} meaning={char.meaningPt} size="xl" className="mt-4" />
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <SpeakButton text={char.hanzi} size="md" />
          <IconButton active={entry.favorite} label="Favoritar" onClick={onFavorite}>
            <IconStar width={18} height={18} fill={entry.favorite ? "currentColor" : "none"} />
          </IconButton>
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-line bg-surface-2 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ink">Domínio</span>
          <span className="font-semibold text-accent">{entry.mastery}%</span>
        </div>
        <ProgressBar value={entry.mastery} className="mt-2" />
        <DomainDots type="char" itemId={char.id} domains={CHAR_CARD_DOMAINS} srs={srs} compact />
      </div>

      <div className="mt-auto flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onDetail}>
          Detalhes
        </Button>
        <Button variant={entry.weak ? "primary" : "soft"} className="flex-1" onClick={onReview}>
          Revisar
        </Button>
      </div>
    </Card>
  );
}

function ChunkCard({
  entry,
  srs,
  copied,
  onCopy,
  onDetail,
  onFavorite,
  onReview,
  onSpeakPractice,
}: {
  entry: ChunkEntry;
  srs: Record<string, SRSItem>;
  copied: boolean;
  onCopy: () => void;
  onDetail: () => void;
  onFavorite: () => void;
  onReview: () => void;
  onSpeakPractice: () => void;
}) {
  const chunk = entry.item;
  const canSpeak = entry.role !== "word" || chunk.hanzi.length > 1;
  return (
    <Card className="flex min-h-[300px] flex-col overflow-hidden bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <Pill tone={entry.weak ? "accent" : "muted"}>{chunkRoleLabel(entry.role)}</Pill>
        <div className="flex shrink-0 gap-2">
          <SpeakButton text={chunk.hanzi} size="md" />
          <IconButton active={entry.favorite} label="Favoritar" onClick={onFavorite}>
            <IconStar width={18} height={18} fill={entry.favorite ? "currentColor" : "none"} />
          </IconButton>
        </div>
      </div>

      <MandarinText
        hanzi={chunk.hanzi}
        pinyin={chunk.pinyin}
        meaning={chunk.meaningPt}
        size="lg"
        className="mt-5"
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {chunk.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-faint">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-[22px] border border-line bg-surface-2 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ink">Domínio</span>
          <span className="font-semibold text-accent">{entry.mastery}%</span>
        </div>
        <ProgressBar value={entry.mastery} className="mt-2" />
        <DomainDots type="chunk" itemId={chunk.id} domains={ALL_ITEM_DOMAINS} srs={srs} compact />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <Button variant="outline" onClick={onDetail}>Detalhes</Button>
        <Button variant={entry.weak ? "primary" : "soft"} onClick={onReview}>Revisar</Button>
        {canSpeak && <Button variant="outline" onClick={onSpeakPractice}>Falar</Button>}
        <Button variant="ghost" onClick={onCopy}>{copied ? "Copiado" : "Copiar pinyin"}</Button>
      </div>
    </Card>
  );
}

function TextCard({
  entry,
  onFavorite,
  onRead,
  onDetail,
}: {
  entry: TextEntry;
  onFavorite: () => void;
  onRead: () => void;
  onDetail: () => void;
}) {
  const text = entry.item;
  return (
    <Card className="flex min-h-[220px] flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            {entry.source?.phaseTitle ?? "Texto guiado"}
          </div>
          <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">{text.title}</h3>
        </div>
        <IconButton active={entry.favorite} label="Favoritar" onClick={onFavorite}>
          <IconStar width={18} height={18} fill={entry.favorite ? "currentColor" : "none"} />
        </IconButton>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniMetric label="nível" value={entry.source ? `F${entry.source.phaseTitle.match(/\d+/)?.[0] ?? "1"}` : "Inicial"} />
        <MiniMetric label="linhas" value={text.lines.length} />
        <MiniMetric label="conhecido" value={`${entry.knownPercent}%`} />
      </div>
      <ProgressBar value={entry.knownPercent} className="mt-4" />
      <div className="mt-auto flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onDetail}>
          Detalhes
        </Button>
        <Button className="flex-1" onClick={onRead}>
          Ler novamente
        </Button>
      </div>
    </Card>
  );
}

function DetailModal({
  detail,
  srs,
  favoriteItems,
  copiedKey,
  onClose,
  onToggleFavorite,
  onCopy,
  onReview,
  onPracticeSpeech,
  onReadContext,
}: {
  detail: DetailTarget;
  srs: Record<string, SRSItem>;
  favoriteItems: string[];
  copiedKey: string | null;
  onClose: () => void;
  onToggleFavorite: (key: string) => void;
  onCopy: (text: string, key: string) => void;
  onReview: () => void;
  onPracticeSpeech: () => void;
  onReadContext: () => void;
}) {
  const favoriteKey = detail.kind === "char"
    ? `char:${detail.item.id}`
    : detail.kind === "chunk"
    ? `chunk:${detail.item.id}`
    : `text:${detail.item.id}`;
  const favorite = favoriteItems.includes(favoriteKey);

  return (
    <ModalOverlay className="px-3 py-3 sm:justify-center sm:p-6" label="Detalhes">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-line bg-surface shadow-lift">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-5 py-4 backdrop-blur">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Detalhes</div>
            <h2 className="font-serif text-xl font-semibold text-ink">
              {detail.kind === "text" ? detail.item.title : detail.item.hanzi}
            </h2>
          </div>
          <div className="flex gap-2">
            <IconButton active={favorite} label="Favoritar" onClick={() => onToggleFavorite(favoriteKey)}>
              <IconStar width={18} height={18} fill={favorite ? "currentColor" : "none"} />
            </IconButton>
            <IconButton label="Fechar" onClick={onClose}>
              <IconX width={18} height={18} />
            </IconButton>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {detail.kind === "char" && (
            <CharacterDetail
              char={detail.item}
              srs={srs}
              copied={copiedKey === favoriteKey}
              onCopy={() => onCopy(detail.item.pinyin, favoriteKey)}
              onReview={onReview}
              onReadContext={onReadContext}
            />
          )}
          {detail.kind === "chunk" && (
            <ChunkDetail
              chunk={detail.item}
              role={detail.role}
              srs={srs}
              copied={copiedKey === favoriteKey}
              onCopy={() => onCopy(detail.item.pinyin, favoriteKey)}
              onReview={onReview}
              onPracticeSpeech={onPracticeSpeech}
              onReadContext={onReadContext}
            />
          )}
          {detail.kind === "text" && (
            <TextDetail text={detail.item} knownPercent={detail.knownPercent} onReadContext={onReadContext} />
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

function CharacterDetail({
  char,
  srs,
  copied,
  onCopy,
  onReview,
  onReadContext,
}: {
  char: Character;
  srs: Record<string, SRSItem>;
  copied: boolean;
  onCopy: () => void;
  onReview: () => void;
  onReadContext: () => void;
}) {
  const components = char.components.map((id) => radicalById[id]).filter(Boolean);
  const semantic = components.filter((component) => component.id !== char.phonetic);
  const phonetic = char.phonetic ? radicalById[char.phonetic] : undefined;
  const relatedChunks = CHUNKS.filter((chunk) => normalizeHanzi(chunk.hanzi).includes(char.hanzi)).slice(0, 8);

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <Card className="p-5 text-center">
          <MandarinText
            hanzi={char.hanzi}
            pinyin={char.pinyin}
            meaning={char.meaningPt}
            size="xl"
            audio
            align="center"
          />
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={onCopy}>{copied ? "Copiado" : "Copiar pinyin"}</Button>
          </div>
        </Card>

        {components.length > 0 && (
          <Card className="p-4">
            <h3 className="font-serif text-lg font-semibold text-ink">Decomposição</h3>
            <div className="mt-3 rounded-2xl bg-surface-2 p-3">
              <DecompositionCard char={char} />
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <DetailSection title="Radical e componentes">
          <InfoGrid
            rows={[
              ["Radical principal", semantic[0] ? `${semantic[0].glyph} · ${semantic[0].namePt}` : "Ainda não mapeado"],
              ["Componente semântico", semantic.length ? semantic.map((item) => `${item.glyph} ${item.namePt}`).join(" · ") : "Não indicado"],
              ["Componente fonético", phonetic ? `${phonetic.glyph} · ${phonetic.pinyin ?? ""} · ${phonetic.namePt}` : "Não tem pista sonora marcada"],
            ]}
          />
        </DetailSection>

        <DetailSection title="Palavras relacionadas">
          {relatedChunks.length === 0 ? (
            <p className="text-sm text-ink-soft">Ainda não há chunks relacionados aprendidos no corpus.</p>
          ) : (
            <div className="grid gap-2">
              {relatedChunks.map((chunk) => (
                <div key={chunk.id} className="rounded-2xl bg-surface-2 px-3 py-2">
                  <MandarinText hanzi={chunk.hanzi} pinyin={chunk.pinyin} meaning={chunk.meaningPt} size="sm" />
                </div>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title="Frases de exemplo">
          <div className="space-y-2">
            {(char.exampleWords ?? []).map((example) => (
              <div key={example.hanzi} className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">
                <MandarinText hanzi={example.hanzi} pinyin={example.pinyin} meaning={example.pt} size="sm" />
              </div>
            ))}
            {relatedChunks.slice(0, 3).map((chunk) => (
              <div key={chunk.id} className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">
                <MandarinText hanzi={chunk.hanzi} pinyin={chunk.pinyin} meaning={chunk.meaningPt} size="sm" />
              </div>
            ))}
          </div>
        </DetailSection>

        <DomainDetail type="char" itemId={char.id} srs={srs} domains={CHAR_CARD_DOMAINS} />

        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={onReview}><IconRefresh width={18} height={18} /> Revisar agora</Button>
          <Button variant="outline" onClick={onReadContext}><IconBook width={18} height={18} /> Ver em contexto</Button>
        </div>
      </div>
    </div>
  );
}

function ChunkDetail({
  chunk,
  role,
  srs,
  copied,
  onCopy,
  onReview,
  onPracticeSpeech,
  onReadContext,
}: {
  chunk: Chunk;
  role: ChunkRole;
  srs: Record<string, SRSItem>;
  copied: boolean;
  onCopy: () => void;
  onReview: () => void;
  onPracticeSpeech: () => void;
  onReadContext: () => void;
}) {
  const contexts = MICROTEXTS.flatMap((text) =>
    text.lines
      .filter((line) => normalizeHanzi(line.hanzi).includes(normalizeHanzi(chunk.hanzi)))
      .map((line) => ({ textTitle: text.title, line }))
  ).slice(0, 4);
  const variations = chunkVariations(chunk);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <Card className="p-5">
          <Pill tone="accent">{chunkRoleLabel(role)}</Pill>
          <MandarinText
            hanzi={chunk.hanzi}
            pinyin={chunk.pinyin}
            meaning={chunk.meaningPt}
            size="lg"
            audio
            className="mt-4"
          />
          {chunk.literalPt && <p className="mt-1 text-sm text-ink-faint">literal: {chunk.literalPt}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={onCopy}>{copied ? "Copiado" : "Copiar pinyin"}</Button>
          </div>
        </Card>

        <DetailSection title="Situação de uso">
          <div className="flex flex-wrap gap-2">
            {chunk.tags.map((tag) => (
              <Pill key={tag} tone="muted">{tag}</Pill>
            ))}
          </div>
        </DetailSection>

        <DetailSection title="Variações">
          <div className="grid gap-2">
            {variations.map((variation) => (
              <div key={variation} className="rounded-2xl bg-surface-2 px-3 py-2 text-sm text-ink-soft">
                {variation}
              </div>
            ))}
          </div>
        </DetailSection>
      </div>

      <div className="space-y-4">
        <DetailSection title="Microdiálogo">
          {contexts.length === 0 ? (
            <div className="rounded-2xl bg-surface-2 px-3 py-3 text-sm leading-6 text-ink-soft">
              A: {chunk.hanzi}<br />
              B: 好，谢谢。<br />
              Use este chunk como resposta curta em uma conversa guiada.
            </div>
          ) : (
            <div className="space-y-2">
              {contexts.map((context) => (
                <div key={`${context.textTitle}-${context.line.hanzi}`} className="rounded-2xl bg-surface-2 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{context.textTitle}</div>
                  <MandarinText
                    hanzi={context.line.hanzi}
                    pinyin={context.line.pinyin}
                    meaning={context.line.pt}
                    size="sm"
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          )}
        </DetailSection>

        <DomainDetail type="chunk" itemId={chunk.id} srs={srs} domains={ALL_ITEM_DOMAINS} />

        <div className="grid gap-2 sm:grid-cols-3">
          <Button onClick={onPracticeSpeech}><IconChat width={18} height={18} /> Fala</Button>
          <Button variant="outline" onClick={onReview}><IconRefresh width={18} height={18} /> Revisar</Button>
          <Button variant="outline" onClick={onReadContext}><IconBook width={18} height={18} /> Contexto</Button>
        </div>
      </div>
    </div>
  );
}

function TextDetail({ text, knownPercent, onReadContext }: { text: MicroText; knownPercent: number; onReadContext: () => void }) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-serif text-2xl font-semibold text-ink">{text.title}</h3>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MiniMetric label="linhas" value={text.lines.length} />
          <MiniMetric label="conhecido" value={`${knownPercent}%`} />
          <MiniMetric label="glossário" value={text.glossary.length} />
        </div>
        <ProgressBar value={knownPercent} className="mt-4" />
      </Card>
      <div className="grid gap-2">
        {text.lines.map((line, index) => (
          <div key={line.hanzi} className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
            <div className="flex items-start gap-3">
              <MandarinText
                hanzi={line.hanzi}
                pinyin={line.pinyin}
                meaning={line.pt}
                size="md"
                audio
                autoPlay={index === 0}
              />
            </div>
          </div>
        ))}
      </div>
      <Button onClick={onReadContext}><IconBook width={18} height={18} /> Ler novamente</Button>
    </div>
  );
}

function DomainDetail({
  type,
  itemId,
  srs,
  domains,
}: {
  type: ItemType;
  itemId: string;
  srs: Record<string, SRSItem>;
  domains: ReviewDomain[];
}) {
  return (
    <DetailSection title="Histórico de revisão por domínio">
      <div className="grid gap-2">
        {domains.map((domain) => {
          const item = srs[makeKey(type, itemId, domain)];
          const state = domainState(item);
          return (
            <div key={domain} className="rounded-2xl bg-surface-2 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">{REVIEW_DOMAIN_META[domain].label}</div>
                  <div className="text-xs text-ink-soft">{REVIEW_DOMAIN_META[domain].cardLabel}</div>
                </div>
                <span className={["rounded-full px-2 py-1 text-xs font-semibold", state.badgeClass].join(" ")}>
                  {state.label}
                </span>
              </div>
              {item && (
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-ink-faint">
                  <span>{item.reps} acertos</span>
                  <span>{item.lapses} lapsos</span>
                  <span>{describeNextDue(item)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DetailSection>
  );
}

function DomainDots({
  type,
  itemId,
  domains,
  srs,
  compact = false,
}: {
  type: ItemType;
  itemId: string;
  domains: ReviewDomain[];
  srs: Record<string, SRSItem>;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mt-2 flex flex-wrap gap-1.5" : "mt-2 flex justify-center gap-1.5"}>
      {domains.map((domain) => {
        const item = srs[makeKey(type, itemId, domain)];
        const state = domainState(item);
        const meta = REVIEW_DOMAIN_META[domain];
        return (
          <span
            key={domain}
            title={`${meta.label}: ${state.label}`}
            className={["inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium", state.dotClass].join(" ")}
          >
            {meta.shortLabel}
          </span>
        );
      })}
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function InfoGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-surface-2 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
          <div className="mt-0.5 text-sm text-ink">{value}</div>
        </div>
      ))}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-3">
      <div className="font-serif text-lg font-semibold text-ink">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">{label}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
      >
        {children}
      </select>
    </label>
  );
}

function FilterToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition",
        active ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface-2 text-ink-soft hover:text-ink",
      ].join(" ")}
    >
      {active && <IconCheck width={15} height={15} />}
      {children}
    </button>
  );
}

function IconButton({ active = false, label, onClick, children }: { active?: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-full border transition active:scale-95",
        active ? "border-accent bg-accent-soft text-accent shadow-card" : "border-line bg-surface-2 text-ink-soft hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function EmptyNotebook({ activeTab, hasLearnedChars }: { activeTab: LibraryTab; hasLearnedChars: boolean }) {
  const navigate = useNavigate();
  const firstHanziLessonId = ALL_LESSONS.find((lesson) => lesson.skill === "hanzi" && !lesson.premium)?.id;

  if (activeTab === "chars" && !hasLearnedChars) {
    return (
      <Card className="p-6 text-left sm:p-8">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <IconHanzi width={28} height={28} />
          </div>
          <h3 className="mt-4 font-serif text-2xl font-semibold text-ink">Sua biblioteca ainda está começando</h3>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Complete uma lição de Hànzì ou explore o Atlas para começar a montar seu repertório.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Button onClick={() => navigate("/ideogramas")} className="w-full">Abrir Atlas de Hànzì</Button>
            <Button
              variant="outline"
              onClick={() => navigate(firstHanziLessonId ? `/licao/${firstHanziLessonId}` : "/")}
              className="w-full"
            >
              Ir para primeira lição
            </Button>
            <Button variant="soft" onClick={() => navigate("/hanzi")} className="w-full">Treinar Hànzì</Button>
          </div>
        </div>
      </Card>
    );
  }

  const copy: Record<LibraryTab, string> = {
    chars: "Nenhum caractere combinou com esses filtros.",
    words: "Nenhuma palavra isolada aprendida ainda.",
    chunks: "Nenhum chunk aprendido ainda. Revele frases úteis na Fala.",
    phrases: "Nenhuma frase aprendida ainda.",
    texts: "Nenhum texto liberado ainda. Complete microtextos na jornada.",
    favorites: "Favoritos aparecem aqui quando você marca caracteres, chunks ou textos.",
    weak: "Nenhum item fraco agora. Bela manutenção.",
    recent: "Itens recentes aparecem depois das primeiras revisões.",
  };
  return <Card className="p-8 text-center text-sm leading-6 text-ink-soft">{copy[activeTab]}</Card>;
}

function buildLibrary({
  learnedChars,
  learnedChunks,
  completedLessons,
  srs,
  favoriteItems,
}: {
  learnedChars: string[];
  learnedChunks: string[];
  completedLessons: string[];
  srs: Record<string, SRSItem>;
  favoriteItems: string[];
}) {
  const favoriteSet = new Set(favoriteItems ?? []);
  const charIds = unique([
    ...learnedChars,
    ...Object.values(srs).filter((item) => item.type === "char").map((item) => item.itemId),
  ]);
  const chunkIds = unique([
    ...learnedChunks,
    ...Object.values(srs).filter((item) => item.type === "chunk").map((item) => item.itemId),
  ]);
  const chars = charIds.map((id) => charById[id]).filter(isCharacter);
  const chunks = chunkIds.map((id) => chunkById[id]).filter(isChunk);
  const learnedCharSet = new Set(chars.map((char) => char.id));
  const learnedChunkSet = new Set(chunks.map((chunk) => chunk.id));
  const completedSet = new Set(completedLessons);
  const texts = availableMicrotexts(completedLessons);

  const charEntries: CharacterEntry[] = chars.map((char) => {
    const key = `char:${char.id}`;
    const domainItems = itemDomainItems("char", char.id, srs);
    return {
      kind: "char",
      key,
      item: char,
      source: SOURCE_INDEX.byItem.get(key),
      mastery: masteryPercent(domainItems),
      weak: domainItems.some(isWeakSrsItem),
      favorite: favoriteSet.has(key),
      reviewedToday: domainItems.some(reviewedToday),
      updatedAt: lastTouched(domainItems, SOURCE_INDEX.byItem.get(key)?.order),
      tones: [char.tone],
      radicalIds: char.components,
    };
  });

  const chunkEntries: ChunkEntry[] = chunks.map((chunk) => {
    const key = `chunk:${chunk.id}`;
    const domainItems = itemDomainItems("chunk", chunk.id, srs);
    const charsInChunk = charsFromText(chunk.hanzi);
    return {
      kind: "chunk",
      key,
      item: chunk,
      role: classifyChunk(chunk),
      source: SOURCE_INDEX.byItem.get(key),
      mastery: masteryPercent(domainItems),
      weak: domainItems.some(isWeakSrsItem),
      favorite: favoriteSet.has(key),
      reviewedToday: domainItems.some(reviewedToday),
      updatedAt: lastTouched(domainItems, SOURCE_INDEX.byItem.get(key)?.order),
      tones: unique(charsInChunk.map((char) => char.tone)),
      radicalIds: unique(charsInChunk.flatMap((char) => char.components)),
    };
  });

  const textEntries: TextEntry[] = texts.map((text) => {
    const key = `text:${text.id}`;
    const charsInText = charsFromText(text.lines.map((line) => line.hanzi).join(""));
    const chunksInText = CHUNKS.filter((chunk) => normalizeHanzi(text.lines.map((line) => line.hanzi).join("")).includes(normalizeHanzi(chunk.hanzi)));
    const relatedSrs = [
      ...charsInText.flatMap((char) => itemDomainItems("char", char.id, srs)),
      ...chunksInText.flatMap((chunk) => itemDomainItems("chunk", chunk.id, srs)),
    ];
    const source = SOURCE_INDEX.byLesson.get(text.unlockAfterLesson);
    return {
      kind: "text" as const,
      key,
      item: text,
      source,
      knownPercent: knownTextPercent(text, learnedCharSet, learnedChunkSet),
      weak: relatedSrs.some(isWeakSrsItem),
      favorite: favoriteSet.has(key),
      reviewedToday: relatedSrs.some(reviewedToday),
      updatedAt: lastTouched(relatedSrs, source?.order),
      tones: unique(charsInText.map((char) => char.tone)),
      radicalIds: unique(charsInText.flatMap((char) => char.components)),
    };
  }).filter((entry) => completedSet.has(entry.item.unlockAfterLesson));

  const words = chunkEntries.filter((entry) => entry.role === "word");
  const phrases = chunkEntries.filter((entry) => entry.role === "phrase");
  const all = [...charEntries, ...chunkEntries, ...textEntries];
  return { chars: charEntries, chunks: chunkEntries, words, phrases, texts: textEntries, all };
}

function itemsForTab(tab: LibraryTab, library: ReturnType<typeof buildLibrary>): LibraryEntry[] {
  if (tab === "chars") return library.chars;
  if (tab === "words") return library.words;
  if (tab === "chunks") return library.chunks;
  if (tab === "phrases") return library.phrases;
  if (tab === "texts") return library.texts;
  if (tab === "favorites") return library.all.filter((item) => item.favorite);
  if (tab === "weak") return library.all.filter((item) => item.weak);
  return [...library.all].sort((a, b) => b.updatedAt - a.updatedAt);
}

function passesFilters(item: LibraryEntry, filters: Filters, srs: Record<string, SRSItem>): boolean {
  if (filters.phase !== "all" && item.source?.phaseId !== filters.phase) return false;
  if (filters.module !== "all" && item.source?.unitId !== filters.module) return false;
  if (filters.tone !== "all" && !item.tones.includes(Number(filters.tone))) return false;
  if (filters.radical !== "all" && !item.radicalIds.includes(filters.radical)) return false;
  if (filters.weakOnly && !item.weak) return false;
  if (filters.favoritesOnly && !item.favorite) return false;
  if (filters.reviewedToday && !item.reviewedToday) return false;
  if (filters.domain !== "all" && !entryHasDomain(item, filters.domain as ReviewDomain, srs)) return false;
  return true;
}

function entryHasDomain(item: LibraryEntry, domain: ReviewDomain, srs: Record<string, SRSItem>): boolean {
  if (item.kind === "text") {
    const chars = charsFromText(item.item.lines.map((line) => line.hanzi).join(""));
    return chars.some((char) => Boolean(srs[makeKey("char", char.id, domain)]));
  }
  return Boolean(srs[makeKey(item.kind === "char" ? "char" : "chunk", item.item.id, domain)]);
}

function titleForEntry(item: LibraryEntry): string {
  if (item.kind === "text") return item.item.title;
  return item.item.hanzi;
}

function buildSourceIndex() {
  const byItem = new Map<string, SourceMeta>();
  const byLesson = new Map<string, SourceMeta>();
  let order = 0;
  for (const phase of JOURNEY) {
    for (const unit of phase.units) {
      for (const lesson of unit.lessons) {
        const source: SourceMeta = {
          phaseId: phase.id,
          phaseTitle: `Fase ${phase.order} · ${phase.title}`,
          unitId: unit.id,
          unitTitle: unit.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          order,
        };
        byLesson.set(lesson.id, source);
        for (const key of lessonRefs(lesson)) {
          if (!byItem.has(key)) byItem.set(key, source);
        }
        order += 1;
      }
    }
  }
  return { byItem, byLesson };
}

function lessonRefs(lesson: Lesson): Set<string> {
  const refs = new Set<string>();
  for (const item of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) refs.add(item);
  for (const step of lesson.steps) collectStepRefs(step, refs);
  return refs;
}

function collectStepRefs(step: LessonStep, refs: Set<string>) {
  if ((step.kind === "recognize" || step.kind === "decompose") && step.charId) refs.add(`char:${step.charId}`);
  if ((step.kind === "flashcard" || step.kind === "write") && step.chunkId) refs.add(`chunk:${step.chunkId}`);
  if (step.kind === "tone" && step.hanzi) addTextRefs(step.hanzi, refs);
  if ((step.kind === "listen" || step.kind === "comprehend") && (step.text || step.hanzi)) addTextRefs(step.text ?? step.hanzi ?? "", refs);
  if (step.kind === "produce" && step.target) addTextRefs(step.target.join(""), refs);
  if (step.kind === "microread" && step.lines) {
    for (const line of step.lines) addTextRefs(line.hanzi, refs);
  }
}

function addTextRefs(text: string, refs: Set<string>) {
  const normalizedText = normalizeHanzi(text);
  const exactChunk = CHUNKS.find((chunk) => normalizeHanzi(chunk.hanzi) === normalizedText);
  if (exactChunk) refs.add(`chunk:${exactChunk.id}`);
  for (const chunk of CHUNKS) {
    if (normalizedText.includes(normalizeHanzi(chunk.hanzi))) refs.add(`chunk:${chunk.id}`);
  }
  for (const char of charsFromText(text)) refs.add(`char:${char.id}`);
}

function itemDomainItems(type: ItemType, itemId: string, srs: Record<string, SRSItem>): SRSItem[] {
  return REVIEW_DOMAIN_ORDER.map((domain) => srs[makeKey(type, itemId, domain)]).filter(Boolean);
}

function masteryPercent(items: SRSItem[]): number {
  if (items.length === 0) return 0;
  const score = items.reduce((sum, item) => sum + srsStrength(item), 0) / items.length;
  return Math.round(score * 100);
}

function srsStrength(item: SRSItem): number {
  if (item.due <= Date.now()) return Math.min(0.45, item.reps * 0.12);
  const reps = Math.min(0.55, item.reps * 0.16);
  const interval = Math.min(0.4, item.intervalDays * 0.06);
  const penalty = Math.min(0.35, item.lapses * 0.12);
  return Math.max(0.08, Math.min(1, reps + interval + 0.08 - penalty));
}

function isWeakSrsItem(item: SRSItem): boolean {
  return item.lapses > 0 || (item.reps === 0 && item.due <= Date.now());
}

function reviewedToday(item: SRSItem): boolean {
  if (!item.reviewedAt) return false;
  return new Date(item.reviewedAt).toDateString() === new Date().toDateString();
}

function lastTouched(items: SRSItem[], fallbackOrder = 0): number {
  const latest = Math.max(0, ...items.map((item) => item.reviewedAt ?? item.createdAt));
  return latest || fallbackOrder;
}

function domainState(item: SRSItem | undefined): { label: string; dotClass: string; badgeClass: string } {
  if (!item) {
    return {
      label: "não visto",
      dotClass: "border-line bg-surface text-ink-faint",
      badgeClass: "bg-surface text-ink-faint",
    };
  }
  if (item.due <= Date.now()) {
    return {
      label: "revisar",
      dotClass: "border-transparent bg-accent-soft text-accent",
      badgeClass: "bg-accent-soft text-accent",
    };
  }
  if (item.lapses > 0 && item.reps === 0) {
    return {
      label: "fraco",
      dotClass: "border-transparent bg-wrong-soft text-wrong",
      badgeClass: "bg-wrong-soft text-wrong",
    };
  }
  if (item.reps >= 2 || item.intervalDays >= 3) {
    return {
      label: "forte",
      dotClass: "border-transparent bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]",
      badgeClass: "bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]",
    };
  }
  return {
    label: "em treino",
    dotClass: "border-transparent bg-accent-soft text-accent",
    badgeClass: "bg-accent-soft text-accent",
  };
}

function knownTextPercent(text: MicroText, learnedCharSet: Set<string>, learnedChunkSet: Set<string>): number {
  const body = normalizeHanzi(text.lines.map((line) => line.hanzi).join(""));
  const chars = charsFromText(body);
  const knownChars = chars.filter((char) => learnedCharSet.has(char.id)).length;
  const chunkMatches = CHUNKS.filter((chunk) => body.includes(normalizeHanzi(chunk.hanzi)));
  const knownChunks = chunkMatches.filter((chunk) => learnedChunkSet.has(chunk.id)).length;
  const charScore = chars.length ? knownChars / chars.length : 0;
  const chunkScore = chunkMatches.length ? knownChunks / chunkMatches.length : charScore;
  return Math.round(Math.min(1, charScore * 0.7 + chunkScore * 0.3) * 100);
}

function charsFromText(text: string): Character[] {
  const seen = new Set<string>();
  const chars: Character[] = [];
  for (const glyph of normalizeHanzi(text)) {
    const char = CHARS_BY_HANZI[glyph];
    if (!char || seen.has(char.id)) continue;
    seen.add(char.id);
    chars.push(char);
  }
  return chars;
}

function classifyChunk(chunk: Chunk): ChunkRole {
  const length = normalizeHanzi(chunk.hanzi).length;
  if (chunk.tags.includes("palavras") || length <= 2) return "word";
  if (/[？！?。!]/.test(chunk.hanzi) || length >= 4) return "phrase";
  return "chunk";
}

function chunkRoleLabel(role: ChunkRole): string {
  if (role === "word") return "palavra";
  if (role === "phrase") return "frase";
  return "chunk";
}

function chunkVariations(chunk: Chunk): string[] {
  const variations = [
    chunk.literalPt ? `Literal: ${chunk.literalPt}` : undefined,
    `Sem pontuação: ${chunk.hanzi.replace(/[？！?。!]/g, "")}`,
    `Pinyin: ${formatPinyinForDisplay(chunk.pinyin)}`,
  ].filter(Boolean);
  return variations as string[];
}

function normalizeHanzi(text: string): string {
  return text.replace(/[^\p{Script=Han}]/gu, "");
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function isCharacter(item: Character | undefined): item is Character {
  return Boolean(item);
}

function isChunk(item: Chunk | undefined): item is Chunk {
  return Boolean(item);
}
