import { t } from "../../i18n/catalog";

export type LessonKindLabelId = "production" | "conversation" | "culture" | "listening" | "review";

const KIND_KEY: Record<LessonKindLabelId, "player.kindProduction" | "player.kindConversation" | "player.kindCulture" | "player.kindListening" | "player.kindReview"> = {
  production: "player.kindProduction",
  conversation: "player.kindConversation",
  culture: "player.kindCulture",
  listening: "player.kindListening",
  review: "player.kindReview",
};

/** Mesmo rótulo de seção em Conversa, Cultura, Escuta e Produção. */
export function LessonKindLabel({ kind }: { kind: LessonKindLabelId }) {
  return (
    <div
      data-lesson-kind-label={kind}
      className="inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent"
    >
      {t(KIND_KEY[kind])}
    </div>
  );
}
