import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../lib/store";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { useCloudSignIn } from "../../hooks/useCloudSignIn";
import { useCloudSignOut } from "../../hooks/useCloudSignOut";
import { CloudLoginForm } from "../../components/auth/CloudLoginForm";
import { Pill } from "../../components/ui/primitives";
import { PageShell, PageHeader, CompactCard, ActionButton } from "../../components/ui/page";
import { IconChevron, IconShield, IconStar, IconLibrary, IconGear } from "../../components/ui/Icon";

type AuthMode = "local" | "cloud_pending" | "cloud";

function statusFor(authMode: AuthMode): { label: string; tone: "muted" | "accent" | "good"; blurb: string } {
  if (authMode === "cloud") {
    return { label: "Nuvem ativa", tone: "good", blurb: "Seu progresso está sincronizado na nuvem e disponível em qualquer aparelho." };
  }
  if (authMode === "cloud_pending") {
    return { label: "Nuvem pendente", tone: "accent", blurb: "Sua conta está preparada. Entre com email e senha para ativar a sincronização." };
  }
  return { label: "Neste dispositivo", tone: "muted", blurb: "Seu progresso está salvo apenas neste aparelho. Crie uma conta para sincronizar na nuvem." };
}

export function ContaPage() {
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const account = accounts[currentAccountId];
  const authMode = (account?.authMode ?? "local") as AuthMode;
  const status = statusFor(authMode);
  const backendReady = isSupabaseBackendEnabled();

  const { signIn } = useCloudSignIn();
  const { signOut, canSignOut } = useCloudSignOut();

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
  }

  async function onSignOut() {
    const message = await signOut();
    if (message) setNotice(message);
  }

  const showLoginForm = backendReady && authMode !== "cloud";

  return (
    <PageShell width="narrow">
      <PageHeader
        back={{ to: "/mais", label: "Mais" }}
        eyebrow="Conta"
        title="Sua conta"
        subtitle="Login, email e sessão. Seu progresso e estatísticas ficam no Perfil."
      />

      {/* Status da conta */}
      <CompactCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{account?.name?.trim() || "Aluno Longyu"}</span>
              <Pill tone={status.tone}>{status.label}</Pill>
            </div>
            {account?.email && <div className="mt-0.5 truncate text-xs text-ink-soft">{account.email}</div>}
          </div>
          <Link to="/perfil">
            <ActionButton variant="secondary" size="sm" trailingChevron>Ver perfil</ActionButton>
          </Link>
        </div>
        <p className="mt-2 text-[13px] leading-5 text-ink-soft">{status.blurb}</p>
      </CompactCard>

      {/* Login / sessão cloud */}
      {authMode === "cloud" ? (
        <CompactCard>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Sessão</div>
          <p className="mt-1 text-[13px] leading-5 text-ink-soft">
            Você está conectado{account?.email ? ` como ${account.email}` : ""}. Ao sair, o progresso continua salvo na nuvem.
          </p>
          {canSignOut && (
            <ActionButton onClick={() => void onSignOut()} variant="secondary" size="sm" className="mt-3 border-wrong/30 text-wrong hover:bg-wrong-soft">
              Sair da conta
            </ActionButton>
          )}
          {notice && <p className="mt-2 text-xs text-ink-soft">{notice}</p>}
        </CompactCard>
      ) : showLoginForm ? (
        <CompactCard>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Entrar ou criar conta</div>
          <p className="mt-1 mb-3 text-[13px] leading-5 text-ink-soft">
            Use email e senha para salvar seu progresso na nuvem. Sem cartão, sem tutorial.
          </p>
          <CloudLoginForm
            email={email}
            password={password}
            error={error}
            notice={notice}
            loading={loading}
            submitLabel={authMode === "cloud_pending" ? "Entrar" : "Entrar / criar conta"}
            onEmail={setEmail}
            onPassword={setPassword}
            onSubmit={onSubmit}
          />
        </CompactCard>
      ) : (
        <CompactCard>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Sincronização</div>
          <p className="mt-1 text-[13px] leading-5 text-ink-soft">
            A conta em nuvem estará disponível em breve. Enquanto isso, seu progresso fica salvo com segurança neste dispositivo.
          </p>
        </CompactCard>
      )}

      {/* Atalhos para as áreas que saíram da conta */}
      <div className="grid gap-2 sm:grid-cols-3">
        <AccountLink to="/dados-locais" icon={IconLibrary} title="Dados locais" desc="Exportar, backup e apagar." />
        <AccountLink to="/plano" icon={IconStar} title="Plano Pro" desc="Assinatura e benefícios." />
        <AccountLink to="/ajustes" icon={IconGear} title="Ajustes" desc="Áudio, aparência e mais." />
      </div>

      <p className="flex items-center gap-1.5 px-1 text-[11px] leading-5 text-ink-faint">
        <IconShield width={13} height={13} /> Sua senha nunca é salva neste dispositivo. A anon key do backend é pública por design; o RLS protege os dados.
      </p>
    </PageShell>
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
