import {
  featureCapability,
  isRoadmapOnly,
  type FeatureCapabilityId,
} from "../../product/featureTruth";

/**
 * Anúncio de roadmap — e só de roadmap (RC1.5, P2.2).
 *
 * A diferença entre isto e o card que a /fala tinha antes não é de tom, é de
 * estrutura: aqui não existe botão, não existe paywall, não existe badge Pro e
 * o estado vem do registro de capacidades. No dia em que `ai_roleplay` deixar
 * de ser `coming_soon`, este componente para de renderizar sozinho — ninguém
 * precisa lembrar de apagar copy, e ninguém consegue transformá-lo em vitrine
 * sem passar pelo registro.
 *
 * Renderiza `null` para qualquer capacidade que não seja `coming_soon`:
 * "em desenvolvimento" sobre algo que já está no ar também é mentira.
 */
const ROADMAP_COPY: Partial<Record<FeatureCapabilityId, { title: string; desc: string }>> = {
  ai_roleplay: {
    title: "Conversação com IA",
    desc: "Ainda não existe no app. Quando existir, aparece aqui — e só então.",
  },
  pronunciation_feedback: {
    title: "Correção de pronúncia",
    desc: "Depende de um analisador acústico que o Longyu ainda não tem.",
  },
  tone_scoring: {
    title: "Nota de tom",
    desc: "Nada no app mede o seu tom hoje. Para treinar contraste, use o Treino de tons.",
  },
};

export function FeatureRoadmapNote({ capability }: { capability: FeatureCapabilityId }) {
  if (!isRoadmapOnly(capability)) return null;
  const copy = ROADMAP_COPY[capability];
  if (!copy) return null;

  return (
    <section
      data-testid={`feature-roadmap-${capability}`}
      data-feature-status={featureCapability(capability).status}
      className="rounded-xl border border-dashed border-line bg-surface/60 px-4 py-3"
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        Em desenvolvimento
      </div>
      <div className="mt-1 text-sm font-medium text-ink-soft">{copy.title}</div>
      <p className="mt-1 text-xs leading-5 text-ink-faint">{copy.desc}</p>
    </section>
  );
}
