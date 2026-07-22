import { useMemo } from "react";
import { BetaBadge } from "../../components/feedback/BetaBadge";
import { FeedbackPrompt } from "../../components/feedback/FeedbackPrompt";
import { IconShield } from "../../components/ui/Icon";
import { isAdminEmail } from "../../lib/feedback";
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
import { useLearnerProfile } from "../../hooks/useLearnerProfile";
import { MORE_CATALOG, type NavItem } from "../../components/layout/nav";
import { featureAvailability, isFeatureNewlyRelevant, type FeatureId } from "../../lib/learnerStage";
import { getSeenIntros } from "../../lib/featureDiscovery";

// Descrições curtas por área — uma frase que responde "o que é isto?".
const FEATURE_DESC: Record<string, string> = {
  treino: "Pratique cada competência à vontade.",
  revisao: "Reforce o que você aprendeu.",
  pinyin: "Sons, sílabas e tons.",
  hanzi: "Caracteres como peças lógicas.",
  fala: "Frases em blocos, em voz alta.",
  leitura: "Textos guiados, palavra a palavra.",
  biblioteca: "Palavras e caracteres já vistos.",
  imersao: "Histórias e áudio para treinar o ouvido.",
  missoes: "Metas curtas e recompensas.",
  conquistas: "Marcos e medalhas.",
  ligas: "Ranking semanal por XP.",
  loja: "Cargas, itens e cosméticos.",
  amigos: "Seguir e comparar XP semanal.",
  perfil: "Identidade e progresso.",
  conta: "Login, email e sessão.",
  plano: "Assinatura e benefícios.",
  dados: "Backup, exportação e perfis.",
  ajustes: "Áudio, aparência e preferências.",
  ajuda: "Suporte, feedback e atalhos.",
  sobre: "Estado do beta Longyu.",
};

export function MorePage() {
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const completedLessons = useStore((s) => s.completedLessons);
  const srs = useStore((s) => s.srs);
  const isPremium = useIsPro();
  const profile = useLearnerProfile();

  const account = accounts[currentAccountId];
  const due = dueItems(srs).length;
  const showAdmin = isAdminEmail(account?.email);
  const seen = useMemo(() => getSeenIntros(), []);

  function toHubItem(nav: NavItem): HubNavItem {
    const feature = nav.feature as FeatureId | undefined;
    // Áreas sem `feature` (ex.: Amigos) usam o próprio `to` como chave de texto.
    const descKey = feature ?? (nav.to === "/amigos" ? "amigos" : "");
    const desc = FEATURE_DESC[descKey] ?? "";
    const base: HubNavItem = { title: nav.label, desc, icon: nav.icon, to: nav.to };

    if (!feature) return base;

    // Plano Pro: estado próprio.
    if (feature === "plano") {
      return { ...base, pro: !isPremium, status: isPremium ? "Ativo" : "Opcional", statusTone: isPremium ? "good" : "gold" };
    }

    const info = featureAvailability(feature, completedLessons);

    // Bloqueada por progressão: a rota continua acessível (mostra o gate),
    // mas o card explica o que é e quando será liberada — sem cadeado seco.
    if (info.locked) {
      return { ...base, desc: info.reason ?? desc, status: "Depois", statusTone: "muted" };
    }

    // Recém-relevante e ainda não apresentada: destaque discreto "Nova".
    if (isFeatureNewlyRelevant(feature, completedLessons, profile.learningStage) && !seen.has(feature)) {
      return { ...base, featured: true, status: "Nova", statusTone: "good" };
    }

    // Estados dinâmicos úteis.
    if (feature === "revisao" && due > 0) {
      return { ...base, status: `${due} prontos`, statusTone: "accent", featured: true };
    }

    return base;
  }

  const sections = MORE_CATALOG.map((group) => ({
    title: group.title,
    items: group.items.map(toHubItem),
  }));

  // Admin (interno) fica fora do catálogo público.
  if (showAdmin) {
    const conta = sections.find((s) => s.title === "Conta");
    conta?.items.push({
      title: "Feedback admin",
      desc: "Inbox, status e sinais pedagógicos.",
      icon: IconShield,
      to: "/admin/feedback",
      status: "Interno",
      statusTone: "gold",
    });
  }

  return (
    <HubPage>
      <HubHeader
        eyebrow="Menu"
        title="Mais"
        desc="Tudo o que o Longyu oferece, organizado por objetivo."
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
