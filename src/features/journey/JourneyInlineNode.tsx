import { Link } from "react-router-dom";
import {
  routeForJourneyNode,
  type JourneyNode,
} from "../../data/journeyOrchestrator";
import { resolveLessonCapsule } from "../../data/lessonCatalog";
import { isJourneyNodeComplete } from "../../lib/journeyNodeProgress";
import { useJourneyNodeAccess } from "../../hooks/useJourneyNodeAccess";
import { useTranslation } from "../../i18n/useTranslation";
import {
  IconCheck,
  IconChat,
  IconFlame,
  IconHeadphones,
  IconLock,
  IconPlay,
  IconRefresh,
  IconSound,
  IconTarget,
} from "../../components/ui/Icon";

const ICON_BY_TYPE = {
  LESSON_CAPSULE: IconPlay,
  BLITZ: IconFlame,
  TONE_TRAINER: IconSound,
  PINYIN_PRACTICE: IconTarget,
  HANZI_BUILDER: IconTarget,
  CONVERSATION: IconChat,
  REVIEW: IconRefresh,
  PRACTICE: IconHeadphones,
} as const;

/**
 * Node auxiliar na própria trilha, ancorado por `afterTopicId`.
 *
 * O painel da V4.9.1 foi um piloto útil, mas empilhava sete reforços num bloco
 * só, longe dos tópicos que os motivam. Aqui cada reforço aparece onde faz
 * sentido — o Tone Trainer logo depois de "O que é tom", a prática de Pinyin
 * depois de "O que é pinyin" — porque a posição na trilha é parte da
 * explicação de por que ele existe.
 *
 * O nó é visualmente menor que uma lição core: reforço é opcional e não pode
 * competir com o caminho principal por atenção.
 */
export function JourneyInlineNode({ node }: { node: JourneyNode }) {
  const { instructionLocale } = useTranslation();
  const access = useJourneyNodeAccess(node);
  const complete = isJourneyNodeComplete(node.id);
  const ready = access?.ready ?? false;
  const en = instructionLocale === "en";
  const Icon = ICON_BY_TYPE[node.type as keyof typeof ICON_BY_TYPE] ?? IconPlay;

  // Uma cápsula publicada não tem entrada em `INLINE_LABELS` — ela nasceu
  // depois deste código. O título vem da própria aula, no idioma do curso;
  // cair no id cru mostraria "capsule:algo:v1" na trilha do aluno.
  const publishedTitle =
    node.type === "LESSON_CAPSULE"
      ? resolveLessonCapsule(node.sourceId ?? "")?.localized[instructionLocale]?.title
      : undefined;
  const label = INLINE_LABELS[node.id]?.[en ? "en" : "pt"] ?? publishedTitle ?? node.sourceId ?? node.id;

  const body = (
    <>
      <span
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          complete
            ? "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]"
            : ready
              ? "bg-accent-soft text-accent"
              : "bg-surface-2 text-ink-faint",
        ].join(" ")}
      >
        {complete ? <IconCheck width={17} height={17} /> : ready ? <Icon width={17} height={17} /> : <IconLock width={15} height={15} />}
      </span>
      <span className="min-w-0 text-left">
        <span className="block truncate text-[13px] font-semibold text-ink">{label}</span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.1em] text-ink-faint">
          {complete ? (en ? "Done" : "Feito") : ready ? (en ? "Optional" : "Opcional") : en ? "Locked" : "Bloqueado"}
        </span>
      </span>
    </>
  );

  const shell =
    "flex w-full max-w-[15rem] items-center gap-2.5 rounded-2xl border px-3 py-2 transition";

  if (!ready) {
    return (
      <div
        data-journey-inline-node={node.id}
        data-ready="false"
        data-reason={access?.reason}
        className={[shell, "border-dashed border-line/70 bg-surface-2/40 opacity-80"].join(" ")}
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      to={routeForJourneyNode(node)}
      data-journey-inline-node={node.id}
      data-ready="true"
      className={[shell, "border-line/65 bg-surface hover:-translate-y-0.5 hover:border-accent-soft"].join(" ")}
    >
      {body}
    </Link>
  );
}

/**
 * Rótulos curtos para a trilha. O painel usa textos mais longos porque tem
 * espaço para corpo de texto; aqui o nó precisa caber ao lado da lição.
 */
const INLINE_LABELS: Record<string, { pt: string; en: string }> = {
  "node:capsule:pinyin-foundation:v1": { pt: "Cápsula · Pinyin", en: "Capsule · Pinyin" },
  "booster:foundations-blitz:v1": { pt: "Blitz · 45 s", en: "Blitz · 45s" },
  "booster:tone-contour-1-3:v1": { pt: "Tone Trainer · 1º × 3º", en: "Tone Trainer · 1st × 3rd" },
  "booster:tone-number-1-4:v1": { pt: "Tone Trainer · 1º–4º", en: "Tone Trainer · 1st–4th" },
  "booster:pinyin-practice:v1": { pt: "Prática de pinyin", en: "Pinyin practice" },
  "booster:hanzi-builder-foundations:v1": { pt: "Hànzì Builder", en: "Hànzì Builder" },
  "booster:first-conversation:v1": { pt: "Primeira conversa", en: "First conversation" },
  "booster:shared-srs-review:v1": { pt: "Revisão", en: "Review" },
  "booster:short-immersion:v1": { pt: "Imersão curta", en: "Short immersion" },
};
