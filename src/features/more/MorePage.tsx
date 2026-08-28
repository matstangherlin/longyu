import { useEffect, useMemo, useState } from "react";
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
import { MORE_CATALOG, navLabel, type NavItem } from "../../components/layout/nav";
import { featureAvailability, isFeatureNewlyRelevant, type FeatureId } from "../../lib/learnerStage";
import { getSeenIntros } from "../../lib/featureDiscovery";
import { checkIsBetaAdmin } from "../../services/feedbackService";
import { useTranslation } from "../../i18n/useTranslation";
import type { MessageKey } from "../../locales/pt-BR";

// Descrições curtas por área — uma frase que responde "o que é isto?".
const FEATURE_DESC_KEYS: Record<string, MessageKey> = {
  treino: "navigation.descPractice",
  revisao: "navigation.descReview",
  pinyin: "navigation.descPinyin",
  hanzi: "navigation.descHanzi",
  fala: "navigation.descSpeaking",
  leitura: "navigation.descReading",
  biblioteca: "navigation.descLibrary",
  imersao: "navigation.descImmersion",
  missoes: "navigation.descMissions",
  conquistas: "navigation.descAchievements",
  ligas: "navigation.descLeagues",
  loja: "navigation.descShop",
  amigos: "navigation.descFriends",
  convide: "navigation.descInvite",
  perfil: "navigation.descProfile",
  conta: "navigation.descAccount",
  plano: "navigation.descPlan",
  business: "navigation.descBusiness",
  dados: "navigation.descData",
  ajustes: "navigation.descSettings",
  ajuda: "navigation.descHelp",
  sobre: "navigation.descAbout",
};

export function MorePage() {
  const { t } = useTranslation();
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const completedLessons = useStore((s) => s.completedLessons);
  const srs = useStore((s) => s.srs);
  const isPremium = useIsPro();
  const profile = useLearnerProfile();

  const account = accounts[currentAccountId];
  const isCloudAccount = account?.authMode === "cloud";
  const due = dueItems(srs).length;
  const [serverAdmin, setServerAdmin] = useState(false);
  const showAdmin = serverAdmin || isAdminEmail(account?.email);
  const seen = useMemo(() => getSeenIntros(), []);

  useEffect(() => {
    let cancelled = false;
    void checkIsBetaAdmin().then((ok) => {
      if (!cancelled) setServerAdmin(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [account?.email, account?.authMode]);

  function toHubItem(nav: NavItem): HubNavItem {
    const feature = nav.feature as FeatureId | undefined;
    // Áreas sem `feature` (ex.: Amigos) usam o próprio `to` como chave de texto.
    const descKey =
      feature ?? (nav.to === "/amigos" ? "amigos" : nav.to === "/business" ? "business" : "");
    const desc = descKey && FEATURE_DESC_KEYS[descKey] ? t(FEATURE_DESC_KEYS[descKey]) : "";
    const base: HubNavItem = { title: navLabel(nav, t), desc, icon: nav.icon, to: nav.to };

    if (!feature) return base;

    // Plano Pro: estado próprio.
    if (feature === "plano") {
      return { ...base, pro: !isPremium, status: isPremium ? t("navigation.statusActive") : t("navigation.statusOptional"), statusTone: isPremium ? "good" : "gold" };
    }

    const info = featureAvailability(feature, completedLessons);

    // Bloqueada por progressão: a rota continua acessível (mostra o gate),
    // mas o card explica o que é e quando será liberada — sem cadeado seco.
    if (info.locked) {
      return { ...base, desc: info.reason ?? desc, status: t("navigation.statusLater"), statusTone: "muted" };
    }

    // Recém-relevante e ainda não apresentada: destaque discreto "Nova".
    if (isFeatureNewlyRelevant(feature, completedLessons, profile.learningStage) && !seen.has(feature)) {
      return { ...base, featured: true, status: t("navigation.statusNew"), statusTone: "good" };
    }

    // Estados dinâmicos úteis.
    if (feature === "revisao" && due > 0) {
      return { ...base, status: t("navigation.dueReady", { count: due }), statusTone: "accent", featured: true };
    }

    return base;
  }

  const sections = MORE_CATALOG.map((group) => ({
    id: group.id,
    title: t(group.titleKey),
    items: group.items
      .filter((nav) => (isCloudAccount ? true : nav.to !== "/convide"))
      .map(toHubItem),
  }));

  // Admin (interno) fica fora do catálogo público.
  if (showAdmin) {
    const conta = sections.find((s) => s.id === "account");
    conta?.items.push({
      title: t("navigation.adminFeedback"),
      desc: t("navigation.adminFeedbackDesc"),
      icon: IconShield,
      to: "/admin/feedback",
      status: t("navigation.statusInternal"),
      statusTone: "gold",
    });
  }

  return (
    <HubPage>
      <HubHeader
        eyebrow={t("navigation.moreMenu")}
        title={t("navigation.moreTitle")}
        desc={t("navigation.moreDesc")}
        badge={<BetaBadge />}
      />

      {sections.map((section) => (
        <HubSection key={section.id} title={section.title}>
          <HubNavGrid items={section.items} />
        </HubSection>
      ))}

      <FeedbackPrompt context={{ screen: "/mais" }} compact />
    </HubPage>
  );
}
