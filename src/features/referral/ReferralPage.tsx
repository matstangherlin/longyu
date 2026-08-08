import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { Button, ButtonLink, Card, Pill } from "../../components/ui/primitives";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { useStore } from "../../lib/store";
import {
  buildReferralShareUrl,
  fetchReferralDashboard,
  type ReferralDashboard,
} from "../../services/referralService";

export function ReferralPage() {
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const cloudReady = isSupabaseBackendEnabled() && authMode === "cloud";

  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inviteUrl = useMemo(
    () => (dashboard?.code ? buildReferralShareUrl(dashboard.code) : null),
    [dashboard?.code]
  );

  const refresh = useCallback(async () => {
    if (!cloudReady) return;
    setLoading(true);
    const res = await fetchReferralDashboard();
    setLoading(false);
    if (res.ok && res.data) {
      setDashboard(res.data);
      setNotice(null);
    } else {
      setNotice(res.message);
    }
  }, [cloudReady]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice("Link de convite copiado.");
    } catch {
      setNotice("Não foi possível copiar o link.");
    }
  }

  async function shareLink() {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Longyu — aprenda mandarim",
          text: "Estou aprendendo mandarim no Longyu. Entre pelo meu link e ganhe acesso à jornada completa.",
          url: inviteUrl,
        });
        return;
      } catch {
        // usuário cancelou ou share indisponível
      }
    }
    await copyLink();
  }

  if (!accountSetupComplete) {
    return <Navigate to="/conta" replace />;
  }

  if (!cloudReady) {
    const needsLogin = authMode === "cloud_pending";
    return (
      <HubPage>
        <HubHeader
          eyebrow="Indicações"
          title="Convide amigos"
          desc="Ganhe 7 dias de Longyu Pro por amigo que realmente estudar."
        />
        <Card className="space-y-3 p-4 text-sm text-ink-soft">
          <p>
            {needsLogin
              ? "Entre com email e senha para gerar seu link de convite."
              : "Crie uma conta com email e senha para gerar seu link de convite e ganhar semanas de Longyu Pro."}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>amigo cria conta pelo seu link;</li>
            <li>confirma o e-mail;</li>
            <li>completa 3 lições em 2 dias diferentes.</li>
          </ul>
          <ButtonLink to="/conta" size="sm">
            {needsLogin ? "Entrar na conta" : "Criar conta na nuvem"}
          </ButtonLink>
        </Card>
      </HubPage>
    );
  }

  const stats = dashboard?.stats;

  return (
    <HubPage>
      <HubHeader
        eyebrow="Indicações"
        title="Convide amigos"
        desc="Ganhe 7 dias de Longyu Pro por amigo que realmente estudar."
      />

      <HubSection title="Como funciona">
        <Card className="space-y-2 p-4 text-sm text-ink-soft">
          <p>Ganhe <strong className="text-ink">7 dias de Pro</strong> quando um amigo:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>criar conta pelo seu link;</li>
            <li>confirmar o e-mail;</li>
            <li>completar 3 lições diferentes;</li>
            <li>estudar em 2 dias diferentes (em até 14 dias).</li>
          </ul>
          <p className="text-xs">Cadastro sozinho não gera recompensa. Cada convite válido vale 1 semana de Pro.</p>
        </Card>
      </HubSection>

      <HubSection title="Seu link de convite">
        <Card className="space-y-3 p-4">
          <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-ink break-all">
            {inviteUrl ?? "Gerando código…"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void copyLink()} disabled={!inviteUrl}>
              Copiar link
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void shareLink()} disabled={!inviteUrl}>
              Compartilhar
            </Button>
          </div>
          {notice ? <p className="text-xs text-ink-soft">{notice}</p> : null}
        </Card>
      </HubSection>

      {stats ? (
        <HubSection title="Resumo">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Card className="p-3 text-center"><p className="text-lg font-bold text-ink">{stats.sent}</p><p className="text-xs text-ink-soft">Enviados</p></Card>
            <Card className="p-3 text-center"><p className="text-lg font-bold text-ink">{stats.pending}</p><p className="text-xs text-ink-soft">Aguardando</p></Card>
            <Card className="p-3 text-center"><p className="text-lg font-bold text-ink">{stats.qualified}</p><p className="text-xs text-ink-soft">Qualificados</p></Card>
            <Card className="p-3 text-center"><p className="text-lg font-bold text-ink">{Math.floor(stats.bonus_days / 7)}</p><p className="text-xs text-ink-soft">Semanas ganhas</p></Card>
          </div>
          {stats.bonus_days > 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              Bônus acumulado: <strong className="text-ink">{stats.bonus_days} dias</strong> de Longyu Pro
              {stats.bonus_days > 7 ? " (serão usados quando seu período Pro atual terminar)." : "."}
            </p>
          ) : null}
        </HubSection>
      ) : null}

      <HubSection title="Convidados">
        {loading ? <p className="text-sm text-ink-soft">Carregando…</p> : null}
        {!loading && (dashboard?.invitees.length ?? 0) === 0 ? (
          <Card className="p-4 text-sm text-ink-soft">Nenhum convite ainda. Compartilhe seu link para começar.</Card>
        ) : null}
        <div className="space-y-2">
          {dashboard?.invitees.map((inv) => (
            <Card key={inv.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{inv.name}</p>
                <p className="text-xs text-ink-soft">{inv.status_label}</p>
              </div>
              <Pill tone={inv.status === "rewarded" ? "good" : inv.status === "pending" ? "muted" : "gold"}>
                {inv.status === "rewarded" ? "Pro concedido" : inv.status === "pending" ? "Pendente" : "OK"}
              </Pill>
            </Card>
          ))}
        </div>
      </HubSection>

      <p className="px-1 text-xs leading-5 text-ink-soft">
        Recompensas não podem ser vendidas. Contas artificiais podem ser desqualificadas. Limite: 8 semanas por 30 dias e 12 semanas acumuladas.
      </p>
    </HubPage>
  );
}
