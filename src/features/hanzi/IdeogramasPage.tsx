import { IconBook, IconChat, IconHanzi, IconRefresh, IconShield, IconTarget } from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { canAccessHanziLab } from "../../lib/proAccess";
import { charById } from "../../data/characters";
import {
  HubHeader,
  HubHeroCard,
  HubNavGrid,
  HubNavItem,
  HubPage,
  HubProStrip,
  HubSection,
} from "../../components/layout/HubLayout";

export function IdeogramasPage() {
  const learnedChars = useStore((s) => s.learnedChars);
  const completedLessons = useStore((s) => s.completedLessons);
  const isPremium = useStore((s) => s.isPremium);
  const hanziAccess = canAccessHanziLab({ isPremium, completedLessons });
  const learnedHanzi = learnedChars
    .map((id) => charById[id]?.hanzi ?? id)
    .filter(Boolean)
    .slice(0, 3);
  const recommendedTitle = learnedHanzi.length >= 3
    ? `Revise ${learnedHanzi.join("、")}`
    : "Monte 3 hànzì do módulo atual";

  const trainingItems: HubNavItem[] = [
    {
      title: "Montar hànzì",
      desc: "Fragmentos na ordem certa.",
      icon: IconHanzi,
      to: "/hanzi",
      status: accessLabel(hanziAccess.pro, hanziAccess.limited, hanziAccess.allowed),
      featured: true,
      disabled: !hanziAccess.allowed,
      pro: hanziAccess.pro && hanziAccess.allowed,
    },
    {
      title: "Componentes",
      desc: "Reconheça radicais e peças.",
      icon: IconShield,
      to: "/hanzi",
      status: hanziAccess.allowed ? "Peças" : "Bloqueado",
      disabled: !hanziAccess.allowed,
    },
    {
      title: "Hànzì em frases",
      desc: "Veja caracteres em contexto.",
      icon: IconTarget,
      to: "/hanzi",
      status: "Contexto",
      disabled: !hanziAccess.allowed,
    },
    {
      title: "Evolução visual",
      desc: "Forma antiga e moderna.",
      icon: IconChat,
      to: "/hanzi",
      status: "Forma",
      disabled: !hanziAccess.allowed,
    },
  ];

  const atlasItems: HubNavItem[] = [
    {
      title: "Atlas",
      desc: "Mapa completo de ideogramas.",
      icon: IconBook,
      to: "/hanzi/atlas",
      status: "Consulta",
      featured: true,
    },
    {
      title: "Aprendidos",
      desc: "Seu repertório visual.",
      icon: IconRefresh,
      to: "/hanzi/atlas",
      status: `${learnedChars.length} vistos`,
      featured: learnedChars.length > 0,
    },
    {
      title: "Componentes frequentes",
      desc: "Radicais que mais aparecem.",
      icon: IconTarget,
      to: "/hanzi/atlas",
      status: "Atlas",
    },
  ];

  return (
    <HubPage>
      <HubHeader
        eyebrow="Hub"
        title="Ideogramas"
        desc="Hànzì, componentes e atlas em treinos curtos."
      />

      <HubHeroCard
        title={recommendedTitle}
        desc={learnedChars.length > 0 ? "Reforce forma, som e significado." : "Comece pelo Hanzi Builder guiado."}
        status={accessLabel(hanziAccess.pro, hanziAccess.limited, hanziAccess.allowed)}
        statusTone={hanziAccess.pro ? "gold" : "muted"}
        icon={IconHanzi}
        cta="Continuar"
        ctaTo="/hanzi"
      />

      <HubSection title="Treino visual" desc="Montagem, peças e contexto.">
        <HubNavGrid items={trainingItems} columns="grid-cols-2 sm:grid-cols-4" />
      </HubSection>

      <HubSection title="Atlas e consulta" desc="Explore o que você já viu.">
        <HubNavGrid items={atlasItems} columns="grid-cols-2 sm:grid-cols-3" />
      </HubSection>

      <HubProStrip isPremium={isPremium} />
    </HubPage>
  );
}

function accessLabel(pro: boolean, limited: boolean | undefined, allowed: boolean): string {
  if (!allowed) return "Bloqueado";
  if (pro) return "Pro";
  if (limited) return "Cargas";
  return "Livre";
}
