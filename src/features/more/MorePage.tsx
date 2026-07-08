import { BetaBadge } from "../../components/feedback/BetaBadge";
import { FeedbackPrompt } from "../../components/feedback/FeedbackPrompt";
import {
  IconBook,
  IconFlame,
  IconGear,
  IconHanzi,
  IconLibrary,
  IconRefresh,
  IconShield,
  IconSound,
  IconStar,
  IconTarget,
  IconTrophy,
  IconUser,
} from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { dueItems } from "../../lib/srs";
import {
  HubHeader,
  HubNavGrid,
  HubNavItem,
  HubPage,
  HubSection,
} from "../../components/layout/HubLayout";

interface MoreSectionData {
  title: string;
  items: HubNavItem[];
}

export function MorePage() {
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const completedLessons = useStore((s) => s.completedLessons);
  const srs = useStore((s) => s.srs);
  const chests = useStore((s) => s.chests);
  const streak = useStore((s) => s.streak);
  const isPremium = useStore((s) => s.isPremium);

  const account = accounts[currentAccountId];
  const due = dueItems(srs).length;
  const readyChests = (chests.small ?? 0) + (chests.dragon ?? 0) + (chests.monthly ?? 0) + (chests.legendary ?? 0);

  const sections: MoreSectionData[] = [
    {
      title: "Conta",
      items: [
        {
          title: "Perfil",
          desc: "Estatísticas e progresso.",
          icon: IconUser,
          to: "/perfil",
          status: account?.name ?? "Local",
          featured: true,
        },
        {
          title: "Entrar",
          desc: "Login direto, sem tutorial.",
          icon: IconShield,
          to: "/login",
          status: "Nuvem",
        },
        {
          title: "Conta local",
          desc: "Progresso neste dispositivo.",
          icon: IconShield,
          to: "/conta",
          status: "Local",
        },
        {
          title: "Plano Pro",
          desc: "Benefícios e assinatura.",
          icon: IconStar,
          to: "/pro",
          status: isPremium ? "Ativo" : "Opcional",
          statusTone: isPremium ? "good" : "gold",
        },
        {
          title: "Conquistas",
          desc: "Marcos e medalhas.",
          icon: IconTrophy,
          to: "/conquistas",
          status: `${completedLessons.length} lições`,
        },
      ],
    },
    {
      title: "Estudo",
      items: [
        {
          title: "Biblioteca",
          desc: "Textos e materiais.",
          icon: IconLibrary,
          to: "/biblioteca",
        },
        {
          title: "Revisão",
          desc: "Reforce o que você aprendeu.",
          icon: IconRefresh,
          to: "/revisao",
          status: due > 0 ? `${due} prontos` : "Em dia",
          featured: due > 0,
        },
        {
          title: "Pinyin Lab",
          desc: "Sons, sílabas e tons.",
          icon: IconSound,
          to: "/pinyin",
        },
        {
          title: "Ideogramas",
          desc: "Hànzì e componentes.",
          icon: IconHanzi,
          to: "/ideogramas",
        },
      ],
    },
    {
      title: "Progresso",
      items: [
        {
          title: "Ligas",
          desc: "Ranking semanal.",
          icon: IconTrophy,
          to: "/ligas",
        },
        {
          title: "Missões",
          desc: "Objetivos e recompensas.",
          icon: IconTarget,
          to: "/missoes",
          featured: streak > 0,
        },
        {
          title: "Baús",
          desc: "Recompensas salvas.",
          icon: IconShield,
          to: "/loja#baus",
          status: readyChests > 0 ? `${readyChests} prontos` : "Vazio",
          featured: readyChests > 0,
        },
        {
          title: "Sequência",
          desc: "Ritmo e escudos.",
          icon: IconFlame,
          to: "/perfil",
          status: `${streak} ${streak === 1 ? "dia" : "dias"}`,
          featured: streak > 0,
        },
      ],
    },
    {
      title: "Sistema",
      items: [
        {
          title: "Ajustes",
          desc: "Tema, som e preferências.",
          icon: IconGear,
          to: "/config",
        },
        {
          title: "Dados locais",
          desc: "Backup e exportação.",
          icon: IconBook,
          to: "/config#dados",
          status: "Navegador",
        },
        {
          title: "Ajuda",
          desc: "Suporte e atalhos.",
          icon: IconTarget,
          to: "/config",
        },
        {
          title: "Sobre",
          desc: "Estado do beta Longyu.",
          icon: IconHanzi,
          to: "/sobre",
          status: "Beta",
        },
        {
          title: "Enviar feedback",
          desc: "Reporte erros e sugestões.",
          icon: IconTarget,
          to: "/sobre#feedback",
          status: "Beta",
        },
      ],
    },
  ];

  return (
    <HubPage>
      <HubHeader
        eyebrow="Menu"
        title="Mais"
        desc="Funções secundárias sem poluir a Jornada."
        badge={<BetaBadge />}
      />

      {sections.map((section) => (
        <HubSection key={section.title} title={section.title}>
          <HubNavGrid items={section.items} />
        </HubSection>
      ))}

      <FeedbackPrompt context={{ screen: "/mais" }} compact />
    </HubPage>
  );
}
