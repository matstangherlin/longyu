import { BetaBadge } from "../../components/feedback/BetaBadge";
import { FeedbackPrompt } from "../../components/feedback/FeedbackPrompt";
import { Card, SectionTitle } from "../../components/ui/primitives";
import { BETA_LABEL } from "../../lib/feedback";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";

function aboutPoints() {
  const cloud = isSupabaseBackendEnabled();
  return [
    {
      title: "App em desenvolvimento",
      desc: "O Longyu ainda está em construção. Conteúdo, exercícios e recursos podem mudar entre versões do beta.",
    },
    {
      title: cloud ? "Progresso local e na nuvem" : "Progresso salvo localmente",
      desc: cloud
        ? "Lições e preferências ficam neste dispositivo. Com conta ativa, o progresso também salva na nuvem automaticamente."
        : "Lições, Qi, revisão e preferências ficam neste dispositivo e navegador. Limpar dados do site apaga tudo.",
    },
    {
      title: cloud ? "Conta na nuvem ativa" : "Conta e nuvem (opcional)",
      desc: cloud
        ? "Você pode criar conta, entrar em outro aparelho e recuperar o progresso. Assinatura Pro real virá com Stripe."
        : "Por padrão tudo fica local. Com Supabase configurado, você pode criar conta e sincronizar progresso.",
    },
    {
      title: "Seu feedback importa",
      desc: "Relatar bugs, confusões ou ideias ajuda a priorizar o que construir antes do lançamento público.",
    },
  ] as const;
}

export function AboutPage() {
  const points = aboutPoints();
  const cloud = isSupabaseBackendEnabled();
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <SectionTitle
        eyebrow="Sistema"
        title="Sobre o Longyu"
        desc="Transparência sobre o estado atual do beta privado."
      />

      <Card className="rounded-2xl p-5 shadow-none sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <BetaBadge />
          <span className="text-xs text-ink-faint">龙语 · mandarim pela lógica</span>
        </div>
        <h2 className="mt-4 font-serif text-2xl font-semibold text-ink">{BETA_LABEL}</h2>
        <p className="mt-2 text-sm leading-7 text-ink-soft">
          Você está testando uma versão antecipada do Longyu. Algumas partes são experimentais, outras ainda são
          placeholders — e tudo isso é esperado nesta fase.
        </p>
      </Card>

      <section className="grid gap-3">
        {points.map((point) => (
          <Card key={point.title} className="rounded-xl p-4 shadow-none">
            <h3 className="font-serif text-lg font-semibold text-ink">{point.title}</h3>
            <p className="mt-1 text-sm leading-6 text-ink-soft">{point.desc}</p>
          </Card>
        ))}
      </section>

      <FeedbackPrompt context={{ screen: "/sobre" }} compact />

      <p className="text-center text-xs text-ink-faint">
        Longyu (龙语) · {cloud ? "conta na nuvem disponível" : "dados salvos neste dispositivo"} · áudio via Web Speech API
      </p>
    </div>
  );
}
