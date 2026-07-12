import { BetaBadge } from "../../components/feedback/BetaBadge";
import { FeedbackPrompt } from "../../components/feedback/FeedbackPrompt";
import {
  IconBook,
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
import { useIsPro } from "../../lib/proAccess";

interface MoreSectionData {
  title: string;
  items: HubNavItem[];
}

export function MorePage() {
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const completedLessons = useStore((s) => s.completedLessons);
  const srs = useStore((s) => s.srs);
  const isPremium = useIsPro();

  const account = accounts[currentAccountId];
  const due = dueItems(srs).length;

  const sections: MoreSectionData[] = [
    {
      title: "Conta",
      items: [
        {
          title: "Perfil",
          desc: "Identidade e progresso.",
          icon: IconUser,
          to: "/perfil",
          status: account?.name ?? "Local",
          featured: true,
        },
        {
          title: "Conta",
          desc: "Login, email e sessão.",
          icon: IconShield,
          to: "/conta",
        },
        {
          title: "Plano Pro",
          desc: "Assinatura e benefícios.",
          icon: IconStar,
          to: "/plano",
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
          title: "Revisão",
          desc: "Reforce o que você aprendeu.",
          icon: IconRefresh,
          to: "/revisao",
          status: due > 0 ? `${due} prontos` : "Em dia",
          featured: due > 0,
        },
        {
          title: "Biblioteca",
          desc: "Textos e materiais.",
          icon: IconLibrary,
          to: "/biblioteca",
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
        {
          title: "Amigos",
          desc: "Seguir e comparar XP semanal.",
          icon: IconUser,
          to: "/amigos",
        },
      ],
    },
    {
      title: "Sistema",
      items: [
        {
          title: "Dados locais",
          desc: "Backup, exportação e perfis.",
          icon: IconBook,
          to: "/dados-locais",
          status: "Neste aparelho",
        },
        {
          title: "Ajustes",
          desc: "Áudio, aparência e preferências.",
          icon: IconGear,
          to: "/ajustes",
        },
        {
          title: "Ajuda",
          desc: "Suporte, feedback e atalhos.",
          icon: IconTarget,
          to: "/sobre#feedback",
        },
        {
          title: "Sobre",
          desc: "Estado do beta Longyu.",
          icon: IconHanzi,
          to: "/sobre",
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
