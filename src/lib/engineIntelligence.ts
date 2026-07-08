import { DOMAIN_ORDER, type DomainTrack } from "../data/domains";
import { UNLOCK_LESSONS } from "./journeyUnlocks";
import { domainMastery } from "./domainMastery";
import type { ReviewDomain, SRSItem } from "./srs";

type EngineCopy = {
  weakness: string;
  recommendation: string;
  actionLabel: string;
  href: string;
  feed: string;
  receives: string;
};

const REVIEW_DOMAINS: ReviewDomain[] = ["som", "pinyin", "fala", "significado", "forma", "uso", "leitura"];

const TRACK_COPY: Record<
  DomainTrack,
  Record<"empty" | "healthy", EngineCopy> & Partial<Record<ReviewDomain, EngineCopy>>
> = {
  som: {
    empty: {
      weakness: "Ouvido tonal ainda começando",
      recommendation: "Treine os quatro contornos antes de acumular caracteres.",
      actionLabel: "Treinar Som",
      href: "/som",
      feed: "Entrega tons e sílabas para a Fala.",
      receives: "Recebe palavras reais da jornada.",
    },
    healthy: {
      weakness: "Percepção auditiva estável",
      recommendation: "Use o Som para lapidar tons de palavras que você já fala.",
      actionLabel: "Refinar Som",
      href: "/som",
      feed: "Entrega tons e sílabas para a Fala.",
      receives: "Recebe palavras reais da jornada.",
    },
    som: {
      weakness: "Tons ou pinyin instáveis",
      recommendation: "Faça um treino curto de discriminação tonal.",
      actionLabel: "Comparar tons",
      href: "/som",
      feed: "Entrega tons e sílabas para a Fala.",
      receives: "Recebe palavras reais da jornada.",
    },
    significado: {
      weakness: "Som reconhecido sem sentido firme",
      recommendation: "Revise ouvindo e dizendo o significado antes de revelar.",
      actionLabel: "Revisar sons",
      href: "/revisao",
      feed: "Entrega tons e sílabas para a Fala.",
      receives: "Recebe palavras reais da jornada.",
    },
    forma: {
      weakness: "Som desconectado da forma",
      recommendation: "Volte aos caracteres que já têm som conhecido.",
      actionLabel: "Ver Hànzì",
      href: "/hanzi",
      feed: "Entrega tons e sílabas para a Fala.",
      receives: "Recebe palavras reais da jornada.",
    },
    uso: {
      weakness: "Som ainda não vira fala",
      recommendation: "Faça shadowing com chunks curtos.",
      actionLabel: "Falar chunks",
      href: "/fala",
      feed: "Entrega tons e sílabas para a Fala.",
      receives: "Recebe palavras reais da jornada.",
    },
  },
  fala: {
    empty: {
      weakness: "Poucos chunks ativos",
      recommendation: "Aprenda frases de sobrevivência para sentir progresso rápido.",
      actionLabel: "Treinar Fala",
      href: "/fala",
      feed: "Entrega chunks para Leitura e Revisão.",
      receives: "Recebe tons do Som.",
    },
    healthy: {
      weakness: "Chunks disponíveis para uso",
      recommendation: "Produza frases sem olhar o pinyin para ganhar autonomia.",
      actionLabel: "Produzir frases",
      href: "/fala",
      feed: "Entrega chunks para Leitura e Revisão.",
      receives: "Recebe tons do Som.",
    },
    som: {
      weakness: "Pronúncia dos chunks oscila",
      recommendation: "Ouça e repita os chunks mais recentes em voz alta.",
      actionLabel: "Repetir chunks",
      href: "/fala",
      feed: "Entrega chunks para Leitura e Revisão.",
      receives: "Recebe tons do Som.",
    },
    significado: {
      weakness: "Compreensão de frases frágil",
      recommendation: "Revise os chunks vendo o mandarim e lembrando o português.",
      actionLabel: "Revisar frases",
      href: "/revisao",
      feed: "Entrega chunks para Leitura e Revisão.",
      receives: "Recebe tons do Som.",
    },
    forma: {
      weakness: "Frase falada não conecta com Hànzì",
      recommendation: "Reveja os caracteres das frases que você já fala.",
      actionLabel: "Conectar forma",
      href: "/hanzi",
      feed: "Entrega chunks para Leitura e Revisão.",
      receives: "Recebe tons do Som.",
    },
    uso: {
      weakness: "Vocabulário passivo",
      recommendation: "Faça produção PT-BR → mandarim com chunks conhecidos.",
      actionLabel: "Produzir agora",
      href: "/fala",
      feed: "Entrega chunks para Leitura e Revisão.",
      receives: "Recebe tons do Som.",
    },
  },
  hanzi: {
    empty: {
      weakness: "Poucas formas consolidadas",
      recommendation: "Comece por componentes simples: pessoa, boca, mulher e árvore.",
      actionLabel: "Desmontar Hànzì",
      href: "/hanzi",
      feed: "Entrega caracteres para palavras e textos.",
      receives: "Recebe sons e frases já conhecidos.",
    },
    healthy: {
      weakness: "Forma e sentido conectados",
      recommendation: "Use decomposição para memorizar menos e reconhecer mais.",
      actionLabel: "Ver peças",
      href: "/hanzi",
      feed: "Entrega caracteres para palavras e textos.",
      receives: "Recebe sons e frases já conhecidos.",
    },
    som: {
      weakness: "Caractere sem som firme",
      recommendation: "Revise o pinyin e o tom dos caracteres já vistos.",
      actionLabel: "Revisar som",
      href: "/revisao",
      feed: "Entrega caracteres para palavras e textos.",
      receives: "Recebe sons e frases já conhecidos.",
    },
    significado: {
      weakness: "Sentido visual instável",
      recommendation: "Faça reconhecimento de caracteres em blocos pequenos.",
      actionLabel: "Reconhecer",
      href: "/hanzi",
      feed: "Entrega caracteres para palavras e textos.",
      receives: "Recebe sons e frases já conhecidos.",
    },
    forma: {
      weakness: "Componentes ainda confusos",
      recommendation: "Desmonte caracteres e diga qual peça dá sentido.",
      actionLabel: "Decompor",
      href: "/hanzi",
      feed: "Entrega caracteres para palavras e textos.",
      receives: "Recebe sons e frases já conhecidos.",
    },
    uso: {
      weakness: "Caracteres fora de frase",
      recommendation: "Leia frases curtas com os caracteres já estudados.",
      actionLabel: "Ler em contexto",
      href: "/leitura",
      feed: "Entrega caracteres para palavras e textos.",
      receives: "Recebe sons e frases já conhecidos.",
    },
  },
  leitura: {
    empty: {
      weakness: "Poucos textos lidos",
      recommendation: "Leia o primeiro microtexto com pinyin visível.",
      actionLabel: "Ler texto",
      href: "/leitura",
      feed: "Reforça Som, Fala e Hànzì em contexto.",
      receives: "Recebe chunks e caracteres já liberados.",
    },
    healthy: {
      weakness: "Boa compreensão em contexto",
      recommendation: "Releia sem pinyin e faça shadowing linha a linha.",
      actionLabel: "Reler sem pinyin",
      href: "/leitura",
      feed: "Reforça Som, Fala e Hànzì em contexto.",
      receives: "Recebe chunks e caracteres já liberados.",
    },
    som: {
      weakness: "Leitura sem voz interna",
      recommendation: "Ouça cada linha e repita antes de traduzir.",
      actionLabel: "Shadowing",
      href: "/leitura",
      feed: "Reforça Som, Fala e Hànzì em contexto.",
      receives: "Recebe chunks e caracteres já liberados.",
    },
    significado: {
      weakness: "Compreensão em contexto frágil",
      recommendation: "Releia textos tocando só nas linhas que travarem.",
      actionLabel: "Reler texto",
      href: "/leitura",
      feed: "Reforça Som, Fala e Hànzì em contexto.",
      receives: "Recebe chunks e caracteres já liberados.",
    },
    forma: {
      weakness: "Hànzì trava a leitura",
      recommendation: "Volte aos caracteres que aparecem no texto.",
      actionLabel: "Rever formas",
      href: "/hanzi",
      feed: "Reforça Som, Fala e Hànzì em contexto.",
      receives: "Recebe chunks e caracteres já liberados.",
    },
    uso: {
      weakness: "Lê, mas ainda não reutiliza",
      recommendation: "Transforme linhas do texto em fala ativa.",
      actionLabel: "Falar linhas",
      href: "/fala",
      feed: "Reforça Som, Fala e Hànzì em contexto.",
      receives: "Recebe chunks e caracteres já liberados.",
    },
  },
};

export interface EngineInsight {
  track: DomainTrack;
  percent: number;
  completedLessons: number;
  totalLessons: number;
  reviewedItems: number;
  dueItems: number;
  locked: boolean;
  weakDomain?: ReviewDomain;
  weakness: string;
  recommendation: string;
  actionLabel: string;
  href: string;
  feed: string;
  receives: string;
}

export function engineInsights(
  completedLessons: string[],
  srs: Record<string, SRSItem>,
  now = Date.now()
): EngineInsight[] {
  const mastery = domainMastery(completedLessons, srs);
  const completed = new Set(completedLessons);

  return DOMAIN_ORDER.map((track) => {
    const base = mastery.find((row) => row.track === track)!;
    const items = Object.values(srs).filter((item) => inferTrack(item) === track);
    const due = items.filter((item) => item.due <= now);
    const locked = !completed.has(UNLOCK_LESSONS[track]);
    const weakDomain = pickWeakDomain(items, now);
    const state = items.length === 0 && base.completedLessons === 0
      ? "empty"
      : weakDomain ?? "healthy";
    const copy = TRACK_COPY[track][state] ?? TRACK_COPY[track].healthy;
    const actionLabel = locked
      ? "Liberar na jornada"
      : due.length > 0
      ? "Revisar agora"
      : copy.actionLabel;
    const href = locked ? "/" : due.length > 0 ? "/revisao" : copy.href;
    const recommendation = locked
      ? "Continue a jornada principal: este motor abre na hora certa para não sobrecarregar."
      : due.length > 0
      ? "Comece pela revisão espaçada: ela sabe exatamente o que está prestes a escapar."
      : copy.recommendation;

    return {
      track,
      percent: base.percent,
      completedLessons: base.completedLessons,
      totalLessons: base.totalLessons,
      reviewedItems: base.reviewedItems,
      dueItems: due.length,
      locked,
      weakDomain: state === "empty" || state === "healthy" ? undefined : state,
      weakness: due.length > 0 ? `${copy.weakness} · ${due.length} revisão${due.length === 1 ? "" : "ões"} pronta${due.length === 1 ? "" : "s"}` : copy.weakness,
      recommendation,
      actionLabel,
      href,
      feed: copy.feed,
      receives: copy.receives,
    };
  });
}

export function nextBestEngineAction(insights: EngineInsight[]): EngineInsight {
  const unlocked = insights.filter((insight) => !insight.locked);
  if (!unlocked.length) {
    return insights.find((insight) => insight.track === "fala") ?? insights[0];
  }

  const withDue = insights
    .filter((insight) => !insight.locked && insight.dueItems > 0)
    .sort((a, b) => b.dueItems - a.dueItems || a.percent - b.percent);

  if (withDue[0]) return withDue[0];
  return [...unlocked].sort((a, b) => a.percent - b.percent)[0] ?? insights[0];
}

function pickWeakDomain(items: SRSItem[], now: number): ReviewDomain | undefined {
  if (!items.length) return undefined;

  const scores = Object.fromEntries(REVIEW_DOMAINS.map((domain) => [domain, 0])) as Record<ReviewDomain, number>;

  for (const item of items) {
    const domain = item.reviewDomain;
    if (!domain) continue;
    if (item.due <= now) scores[domain] += 2;
    if (item.lapses > 0) scores[domain] += item.lapses * 3;
    if (item.reps === 0) scores[domain] += 1;
  }

  const [domain, score] = REVIEW_DOMAINS
    .map((reviewDomain) => [reviewDomain, scores[reviewDomain]] as const)
    .sort((a, b) => b[1] - a[1])[0];

  return score > 0 ? domain : undefined;
}

function inferTrack(item: SRSItem): DomainTrack {
  if (item.track) return item.track;
  if (item.type === "chunk") return "fala";
  return "hanzi";
}
