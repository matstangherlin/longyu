import { Card, ButtonLink } from "../../components/ui/primitives";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { TelemetryDataDetails } from "../../components/privacy/TelemetryDataDetails";

export function PrivacyPage() {
  return (
    <HubPage className="space-y-5">
      <HubHeader
        eyebrow="Privacidade"
        title="Privacidade e dados"
        desc="Transparência sobre o que o Longyu coleta e como você controla."
        aside={
          <ButtonLink to="/ajustes#privacidade-dados" variant="outline" size="sm">
            Abrir ajustes
          </ButtonLink>
        }
      />

      <HubSection id="dados-coletados" title="Dados pedagógicos">
        <Card className="rounded-xl border-line/70 p-4 shadow-none">
          <TelemetryDataDetails />
        </Card>
      </HubSection>

      <HubSection id="politica" title="Política de privacidade">
        <Card className="space-y-3 rounded-xl border-line/70 p-4 shadow-none text-sm leading-6 text-ink-soft">
          <p>
            O Longyu processa progresso de aprendizagem neste dispositivo e, se você criar conta na
            nuvem, sincroniza esse progresso no Supabase com proteção por login e regras de acesso.
          </p>
          <p>
            Dados pedagógicos de melhoria (erros, pulos, abandonos) só são enviados com o seu
            consentimento explícito. Feedback que você envia manualmente é independente da telemetria.
          </p>
          <p>
            Você pode revogar o consentimento, limpar a fila local, exportar seus dados ou solicitar
            exclusão da conta em Ajustes → Privacidade e dados.
          </p>
          <p className="text-xs text-ink-faint">
            Contato: beta@longyu.app · Versão beta pública.
          </p>
        </Card>
      </HubSection>
    </HubPage>
  );
}
