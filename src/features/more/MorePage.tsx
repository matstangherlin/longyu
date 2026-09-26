import { useEffect, useState } from "react";
import { BetaBadge } from "../../components/feedback/BetaBadge";
import { FeedbackPrompt } from "../../components/feedback/FeedbackPrompt";
import { Link } from "react-router-dom";
import { IconGear, IconShield, IconSun, IconUser } from "../../components/ui/Icon";
import { useCloudSignOut } from "../../hooks/useCloudSignOut";
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
import {
  MORE_CATALOG,
  isNavItemDiscovered,
  navLabel,
  previewNavItems,
  type NavItem,
} from "../../components/layout/nav";
import { useFeatureVisibility } from "../../hooks/useProgressiveDiscovery";
import { featureAvailability, type FeatureId } from "../../lib/learnerStage";
import { checkIsBetaAdmin } from "../../services/feedbackService";
import { useTranslation } from "../../i18n/useTranslation";
import { displayInstruction } from "../../i18n/overlays/journeyChrome";
import type { MessageKey } from "../../locales/pt-BR";

// Descrições curtas por área — uma frase que responde "o que é isto?".
const FEATURE_DESC_KEYS: Record<string, MessageKey> = {
  treino: "navigation.descPractice",
  revisao: "navigation.descReview",
  cultura: "navigation.descCulture",
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
  const { visibility } = useFeatureVisibility();

  const account = accounts[currentAccountId];
  const isCloudAccount = account?.authMode === "cloud";
  const due = dueItems(srs).length;
  const [serverAdmin, setServerAdmin] = useState(false);
  const showAdmin = serverAdmin || isAdminEmail(account?.email);

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
      return { ...base, desc: displayInstruction(info.reason ?? desc), status: t("navigation.statusLater"), statusTone: "muted" };
    }

    // Estados dinâmicos úteis.
    if (feature === "revisao" && due > 0) {
      return { ...base, status: t("navigation.dueReady", { count: due }), statusTone: "accent", featured: true };
    }

    return base;
  }

  // RC2.2.18 · AN/AO — sem parede de cadeados: some o que ainda não foi
  // descoberto ou está trancado por progressão; no máximo 2 "próximos" discretos.
  const isShown = (nav: NavItem) => {
    if (!isNavItemDiscovered(nav, visibility)) return false;
    const feature = nav.feature as FeatureId | undefined;
    return !feature || feature === "plano" || !featureAvailability(feature, completedLessons).locked;
  };
  const sections = MORE_CATALOG.map((group) => ({
    id: group.id,
    title: t(group.titleKey),
    items: group.items
      .filter((nav) => (isCloudAccount ? true : nav.to !== "/convide"))
      .filter(isShown)
      .map(toHubItem),
  })).filter((section) => section.items.length > 0);
  const upcoming = previewNavItems(visibility).map<HubNavItem>((nav) => ({
    title: navLabel(nav, t),
    desc: t("discovery.previewHint"),
    icon: nav.icon,
    to: nav.to,
    status: "🔒",
    statusTone: "muted",
  }));
  if (upcoming.length > 0) {
    sections.splice(1, 0, { id: "upcoming", title: t("navigation.statusLater"), items: upcoming });
  }

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

  // RC2.2.19 — Perfil/Conta/Aparência/Sair no topo: nunca escondidos no fim da lista.
  const accountSection = sections.find((section) => section.id === "account");
  if (accountSection) {
    accountSection.items = accountSection.items.filter((hubItem) => hubItem.to !== "/perfil" && hubItem.to !== "/conta");
  }

  return (
    <HubPage>
      <HubHeader
        eyebrow={t("navigation.moreMenu")}
        title={t("navigation.moreTitle")}
        desc={t("navigation.moreDesc")}
        badge={<BetaBadge />}
      />

      <MoreYouBlock />

      {sections.map((section) => (
        <HubSection key={section.id} title={section.title}>
          <HubNavGrid items={section.items} />
        </HubSection>
      ))}

      <FeedbackPrompt context={{ screen: "/mais" }} compact />
    </HubPage>
  );
}

/**
 * RC2.2.19 — "Você": Perfil, Conta, Aparência e Sair logo no topo do Mais
 * (P2 PROFILE_ACCOUNT_DISCOVERABILITY / LOGOUT_DISCOVERABILITY). Excluir conta
 * NÃO fica aqui: mora separado, no fim de Conta, atrás de confirmação.
 */
function MoreYouBlock() {
  const { t } = useTranslation();
  const { signOut, canSignOut } = useCloudSignOut();
  const tile =
    "flex min-h-14 items-center gap-2 rounded-2xl border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45";
  return (
    <section className="mb-5" data-testid="more-you">
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">{t("navigation.groupYou")}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link to="/perfil" className={tile} data-testid="more-profile">
          <IconUser width={18} height={18} className="text-accent" /> {t("navigation.profile")}
        </Link>
        <Link to="/conta" className={tile} data-testid="more-account">
          <IconGear width={18} height={18} className="text-accent" /> {t("navigation.account")}
        </Link>
        <Link to="/config/aparencia" className={tile} data-testid="more-appearance">
          <IconSun width={18} height={18} className="text-accent" /> {t("navigation.appearance")}
        </Link>
        {canSignOut && (
          <button type="button" onClick={() => void signOut()} className={`${tile} text-wrong`} data-testid="more-sign-out">
            {t("common.signOut")}
          </button>
        )}
      </div>
    </section>
  );
}
