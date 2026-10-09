import { useState, type FormEvent } from "react";
import { AccessMethodsCard } from "../../components/auth/AccessMethodsCard";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useStore, type CloudSyncState } from "../../lib/store";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { useCloudSignIn } from "../../hooks/useCloudSignIn";
import { useCloudSignOut } from "../../hooks/useCloudSignOut";
import { CloudLoginForm } from "../../components/auth/CloudLoginForm";
import { SyncStatusChip } from "../../components/auth/SyncStatusChip";
import { Pill } from "../../components/ui/primitives";
import { PageShell, PageHeader, CompactCard, ActionButton } from "../../components/ui/page";
import { IconChevron, IconShield, IconStar, IconLibrary, IconGear, IconSun, IconUser, IconTarget, IconBook } from "../../components/ui/Icon";
import { requestAccountDeletion } from "../../services/privacyService";
import { ACCOUNT_DELETION_CONFIRMATION_TEXT } from "../../../supabase/functions/_shared/accountDeletion";
import { isSubscribeIntent, resolvePostAuthPath } from "../../lib/subscribeAuthRedirect";
import { useEntitlementStatus } from "../../lib/entitlementStatus";
import { useTranslation } from "../../i18n/useTranslation";
import { displayInstruction } from "../../i18n/overlays/journeyChrome";
import { SettingsGroup, SettingsRow } from "../../components/ui/SettingsRow";
import { SignOutControl } from "../../components/account/SignOutControl";
import type { ThemeName } from "../../lib/store";

type AuthMode = "local" | "cloud_pending" | "cloud";

/**
 * RC1.1 — o catálogo de estado de salvamento passou a morar aqui.
 *
 * Ele vivia no LessonPlayer, e o que a Victory fazia com ele era exibir
 * "Sincronizando progresso..." em cima da celebração (P14.2). Tirar de lá é
 * certo; apagar a informação não é — o aluno continua precisando saber onde o
 * progresso dele está. Esta é a tela que responde isso.
 *
 * Usa as chaves `player.save*` em vez de copy pt-BR embutida, então PT e EN
 * saem do mesmo catálogo.
 */
function cloudSyncCopy(sync: CloudSyncState, translate: (key: string) => string): string {
  const raw =
    sync.message ||
    (sync.status === "loading"
      ? translate("player.saveSyncing")
      : sync.status === "error"
        ? translate("player.saveLocalSafeRetry")
        : sync.status === "pending"
          ? translate("player.savePending")
          : sync.status === "synced"
            ? translate("player.saveCloud")
            : "");
  return displayInstruction(raw);
}

function statusFor(
  authMode: AuthMode,
  translate: (key: string) => string
): { label: string; tone: "muted" | "accent" | "good"; blurb: string; where: string } {
  if (authMode === "cloud") {
    return {
      label: displayInstruction("Nuvem ativa"),
      tone: "good",
      blurb: displayInstruction("Seu progresso está sincronizado na nuvem e disponível em qualquer aparelho."),
      where: translate("player.saveCloud"),
    };
  }
  if (authMode === "cloud_pending") {
    return {
      label: displayInstruction("Nuvem pendente"),
      tone: "accent",
      blurb: displayInstruction("Sua conta está preparada. Entre com email e senha para ativar a sincronização."),
      where: translate("player.savePending"),
    };
  }
  return {
    label: displayInstruction("Neste dispositivo"),
    tone: "muted",
    blurb: displayInstruction("Há estudo salvo só neste aparelho. Associe a uma conta Longyu para continuar."),
    where: translate("player.saveLocalDevice"),
  };
}

export function ContaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscribeIntent = isSubscribeIntent(searchParams);
  const postAuthPath = resolvePostAuthPath(searchParams);
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const account = accounts[currentAccountId];
  const authMode = (account?.authMode ?? "local") as AuthMode;
  const status = statusFor(authMode, t);
  const backendReady = isSupabaseBackendEnabled();
  const cloudSyncState = useStore((s) => s.cloudSyncState);
  const syncCopy = cloudSyncCopy(cloudSyncState, t);

  const { signIn } = useCloudSignIn();
  const { canSignOut } = useCloudSignOut();
  const endCloudSession = useStore((s) => s.endCloudSession);
  const theme = useStore((s) => s.theme);
  const followSystemTheme = useStore((s) => s.followSystemTheme);

  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setNotice(result.message);
    setPassword("");
    if (subscribeIntent || searchParams.get("next")) {
      navigate(postAuthPath);
    }
  }

  async function onDeleteAccount() {
    const typed = window.prompt(
      `Esta ação é permanente. Digite ${ACCOUNT_DELETION_CONFIRMATION_TEXT} para excluir sua conta na nuvem. Os dados locais deste aparelho não serão apagados automaticamente.`
    );
    if (typed === null) return;
    const result = await requestAccountDeletion(typed);
    setNotice(result.message);
    if (result.ok) {
      endCloudSession();
      navigate("/", { replace: true });
    }
  }

  const showLoginForm = backendReady && authMode !== "cloud";

  return (
    <PageShell width="narrow" data-conta-page="">
      <PageHeader
        back={{ to: "/mais", label: t("navigation.more") }}
        eyebrow={t("navigation.account")}
        title={t("navigation.account")}
        subtitle={t("common.manageAccount")}
      />

      {/* RC2.2.8 · C — só erro ganha faixa. pending/loading/synced viram o
          estado discreto do cartão abaixo (SyncStatusChip), sem toast. */}
      {cloudSyncState.status === "error" && syncCopy ? (
        <div
          data-cloud-sync-status={cloudSyncState.status}
          data-cloud-sync-banner=""
          role="status"
          className="rounded-2xl border border-wrong/25 bg-wrong-soft px-4 py-3 text-sm font-medium text-ink"
        >
          {syncCopy}
        </div>
      ) : (
        <span className="sr-only" data-cloud-sync-status={cloudSyncState.status} />
      )}

      {/* RC2.3.13A — conventional Account IA: identity header + grouped rows.
          Logout is compact destructive at the bottom (not a primary learning CTA). */}
      <section className="space-y-3" data-testid="conta-first-fold" data-cognitive-account="">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-lg font-semibold text-accent" aria-hidden data-testid="conta-avatar">
              {(account?.name?.trim() || "你").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-base font-semibold text-ink" data-testid="conta-name">{account?.name?.trim() || t("hub.defaultLearner")}</span>
                <Pill tone={status.tone}>{status.label}</Pill>
              </div>
              {account?.email && <div className="truncate text-sm text-ink-soft" data-testid="conta-email">{account.email}</div>}
            </div>
            <SyncStatusChip />
          </div>
          <p className="mt-3 text-xs font-medium text-ink-faint" data-account-save-status="">{status.where}</p>
          {notice && <p className="mt-2 text-xs text-ink-soft">{displayInstruction(notice)}</p>}
        </div>

        <SettingsGroup>
          <SettingsRow to="/perfil" icon={IconUser} label={t("navigation.profile")} subtitle={displayInstruction("Nome, avatar e perfil de estudo")} testId="conta-profile" />
          <SettingsRow to="/esqueci-senha" icon={IconShield} label={t("common.accountSecurity")} subtitle={displayInstruction("Email, senha e sessão")} testId="conta-security" />
          <SettingsRow to="/config/notificacoes" icon={IconTarget} label={t("settings.catNotifications")} testId="conta-notifications" />
          <SettingsRow
            to="/config/aparencia"
            icon={IconSun}
            label={t("navigation.appearance")}
            trailing={<AppearanceTrailing theme={theme} followSystem={followSystemTheme} />}
            testId="conta-appearance"
          />
          <SettingsRow to="/config/aprendizagem" icon={IconBook} label={t("common.language")} testId="conta-language" />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow to="/sobre#feedback" icon={IconTarget} label={t("common.reportProblem")} testId="conta-report" />
          <SettingsRow to="/sobre" icon={IconLibrary} label={t("common.contact")} testId="conta-contact" />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow to="/privacidade" icon={IconShield} label={t("landing.privacy")} testId="conta-privacy" />
          <SettingsRow to="/termos" icon={IconBook} label={t("landing.terms")} testId="conta-terms" />
        </SettingsGroup>

        {canSignOut ? <SignOutControl testId="conta-sign-out" /> : null}
      </section>

      {/* Login / sessão cloud */}
      {authMode === "cloud" ? null : showLoginForm ? (
        <CompactCard>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
            {subscribeIntent ? displayInstruction("Conta para assinar o Pro") : displayInstruction("Entrar ou criar conta")}
          </div>
          <p className="mt-1 mb-3 text-[13px] leading-5 text-ink-soft">
            {subscribeIntent
              ? displayInstruction("Entre ou crie sua conta com email e senha para continuar a assinatura.")
              : displayInstruction("Use email e senha para salvar seu progresso na nuvem. Sem cartão, sem tutorial.")}
          </p>
          <CloudLoginForm
            email={email}
            password={password}
            error={error}
            notice={notice}
            loading={loading}
            submitLabel={authMode === "cloud_pending" ? displayInstruction("Entrar") : displayInstruction("Entrar / criar conta")}
            onEmail={setEmail}
            onPassword={setPassword}
            onSubmit={onSubmit}
          />
        </CompactCard>
      ) : (
        <CompactCard>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{displayInstruction("Sincronização")}</div>
          <p className="mt-1 text-[13px] leading-5 text-ink-soft">
            {displayInstruction("A conta em nuvem estará disponível em breve. Enquanto isso, seu progresso fica salvo com segurança neste dispositivo.")}
          </p>
        </CompactCard>
      )}

      <PlanCard />

      {/* Atalhos para as áreas que saíram da conta */}
      <div className="grid gap-2 sm:grid-cols-3">
        <AccountLink to="/dados-locais" icon={IconLibrary} title={t("navigation.localData")} desc={displayInstruction("Exportar, backup e apagar.")} />
        <AccountLink to="/plano" icon={IconStar} title={t("navigation.proPlan")} desc={displayInstruction("Assinatura e benefícios.")} />
        <AccountLink to="/ajustes" icon={IconGear} title={t("navigation.settings")} desc={displayInstruction("Áudio, aparência e mais.")} />
      </div>

      {/* Re-nivelamento leve: reposiciona o ponto de partida sem apagar progresso */}
      <CompactCard>
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{displayInstruction("Nivelamento")}</div>
        <p className="mt-1 text-[13px] leading-5 text-ink-soft">
          {displayInstruction("Voltou depois de um tempo? Refazer o teste reposiciona seu ponto de partida na jornada — sem apagar lições, estrelas ou revisões já feitas.")}
        </p>
        <ActionButton to="/conta?relevel=1" variant="secondary" size="sm" className="mt-3" trailingChevron>
          {displayInstruction("Refazer nivelamento")}
        </ActionButton>
      </CompactCard>

      {/* RC2.3.8 — métodos de acesso (vincular/remover; nunca o último). */}
      {authMode === "cloud" && <AccessMethodsCard />}

      {/* RC2.2.25 — Excluir é encontrável, mas SEPARADO de Sair: no fim, em
          "Zona de perigo", vermelho, com confirmação digitada. */}
      {authMode === "cloud" && (
        <section className="rounded-2xl border border-wrong/30 bg-wrong-soft/40 p-4" data-testid="conta-danger-zone">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-wrong">{displayInstruction("Zona de perigo")}</div>
          <p className="mt-1 text-[13px] leading-5 text-ink-soft">{displayInstruction("Excluir a conta apaga seus dados na nuvem. Não dá para desfazer.")}</p>
          <button type="button" onClick={() => void onDeleteAccount()} className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-wrong/40 px-4 text-sm font-semibold text-wrong hover:bg-wrong-soft" data-testid="conta-delete-account">
            {displayInstruction("Excluir minha conta")}
          </button>
        </section>
      )}

      <p className="flex items-center gap-1.5 px-1 text-[11px] leading-5 text-ink-faint">
        <IconShield width={13} height={13} /> {displayInstruction("Sua senha nunca é salva neste dispositivo. A anon key do backend é pública por design; o RLS protege os dados.")}
      </p>
    </PageShell>
  );
}

/**
 * P15 — a conta diz de onde vem o acesso, não só se ele existe.
 *
 * Um membro de família que vê "Pro ativo" e nada mais não sabe que perde o
 * acesso se quem paga cancelar, e abre chamado quando isso acontece. A origem
 * vem do servidor a cada resposta; nada aqui é lido do navegador.
 */
function PlanCard() {
  const { t } = useTranslation();
  const detail = useEntitlementStatus((state) => state.detail);
  if (!detail) return null;

  const sourceKey: Record<string, string> = {
    individual_subscription: "familia.sourceIndividual",
    family_membership: "familia.sourceFamily",
    business_seat: "familia.sourceBusiness",
    enterprise_seat: "familia.sourceEnterprise",
    pearl: "familia.sourcePearl",
    internal: "familia.sourceInternal",
    promotion: "familia.sourcePromotion",
  };

  return (
    <CompactCard>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{t("familia.planCard")}</div>
      <p className="mt-1 text-[15px] font-semibold text-ink" data-plan-name>
        {detail.premiumAccess ? t("familia.planPro") : t("familia.planFree")}
      </p>
      {detail.premiumAccess && sourceKey[detail.source] && (
        <p className="mt-0.5 text-[12px] text-ink-soft" data-plan-source={detail.source}>
          {t(sourceKey[detail.source])}
        </p>
      )}
      {(detail.source === "family_membership" || detail.familyId) && (
        <ActionButton to="/familia" variant="secondary" size="sm" className="mt-3" trailingChevron>
          {t("familia.manageFamily")}
        </ActionButton>
      )}
    </CompactCard>
  );
}

function AccountLink({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: typeof IconStar;
  title: string;
  desc: string;
}) {
  return (
    <Link to={to}>
      <CompactCard className="h-full transition hover:border-accent/30">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-accent">
            <Icon width={16} height={16} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[13px] font-semibold text-ink">
              {title} <IconChevron width={13} height={13} className="text-ink-faint" />
            </div>
            <div className="truncate text-[11px] text-ink-faint">{desc}</div>
          </div>
        </div>
      </CompactCard>
    </Link>
  );
}

function AppearanceTrailing({ theme, followSystem }: { theme: ThemeName; followSystem: boolean }) {
  const { t } = useTranslation();
  const label = followSystem
    ? t("common.themeSystem")
    : theme === "dark"
      ? t("common.themeDark")
      : theme === "china"
        ? t("common.themeChina")
        : t("common.themeClay");
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-ink-faint" data-testid="conta-appearance-value">
      {label}
      <IconChevron width={16} height={16} aria-hidden="true" />
    </span>
  );
}
