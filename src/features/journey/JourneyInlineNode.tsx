import { Link } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
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
          {/*
            Uma aula da fundação não é "opcional". Ela é o caminho, e chamá-la
            de opcional ensinaria o aluno a pular exatamente o que a V4.9.3
            colocou ali para ele ver primeiro.
          */}
          {complete
            ? en
              ? "Done"
              : "Feito"
            : !ready
              ? en
                ? "Locked"
                : "Bloqueado"
              : node.priority === "CORE"
                ? en
                  ? "Lesson"
                  : "Aula"
                : en
                  ? "Optional"
                  : "Opcional"}
        </span>
      </span>
    </>
  );

  // A aula da fundação ocupa mais espaço e tem borda sólida: ela é o caminho,
  // e um reforço opcional não pode competir visualmente com ela. O node core
  // fica maior que o booster e menor que a lição — a hierarquia da Parte Q.
  const core = node.priority === "CORE";
  const shell = [
    "flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2 transition",
    core ? "max-w-[17rem] py-2.5" : "max-w-[15rem]",
  ].join(" ");

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

  const link = (
    <Link
      to={routeForJourneyNode(node)}
      data-journey-inline-node={node.id}
      data-ready="true"
      className={[
        shell,
        core
          ? "border-accent/45 bg-accent-soft/40 hover:-translate-y-0.5 hover:border-accent"
          : "border-line/65 bg-surface hover:-translate-y-0.5 hover:border-accent-soft",
      ].join(" ")}
    >
      {body}
    </Link>
  );

  // Parte R — o handoff. Sem a frase, o reforço é mais um card na tela; com
  // ela, o aluno sabe POR QUE está indo para lá e o que acabou de destravar.
  // Só aparece depois da aula correspondente: antes disso, prometeria uma
  // continuidade que ainda não existe.
  const handoff = HANDOFF_LINES[node.id];
  if (!handoff || !isJourneyNodeComplete(handoff.afterNodeId)) return link;

  return (
    <div className="flex w-full flex-col items-center gap-1.5" data-journey-handoff={node.id}>
      <p className="flex max-w-[17rem] items-start gap-2 px-1 text-left text-[11px] leading-4 text-ink-soft">
        <Mascot size={22} variant="wave" className="mt-0.5 shrink-0" />
        <span>{en ? handoff.en : handoff.pt}</span>
      </p>
      {link}
    </div>
  );
}

/**
 * As frases de entrega do dragão.
 *
 * Cada uma diz o que o aluno JÁ sabe e o que vem agora — nessa ordem, porque
 * é o reconhecimento que faz a próxima etapa parecer consequência e não tarefa
 * avulsa. `afterNodeId` amarra a frase à aula que a torna verdadeira: prometer
 * "você já sabe como os tons se movem" a quem não viu a aula seria mentira.
 */
const HANDOFF_LINES: Record<string, { afterNodeId: string; pt: string; en: string }> = {
  "booster:tone-contour-1-3:v1": {
    afterNodeId: "node:instruction:foundation:tone",
    pt: "Você já sabe como o 1º e o 3º tom se movem. Vamos testar seu ouvido?",
    en: "You know how the 1st and 3rd tones move. Shall we test your ear?",
  },
  "booster:pinyin-practice:v1": {
    afterNodeId: "node:instruction:foundation:pinyin",
    pt: "Você já sabe o que o pinyin faz. Agora vamos ler algumas sílabas em voz alta.",
    en: "You know what pinyin does. Now let's read a few syllables out loud.",
  },
  "booster:hanzi-builder-foundations:v1": {
    afterNodeId: "node:instruction:foundation:hanzi-components",
    pt: "Você já viu que os hànzì são feitos de peças. Vamos montar alguns?",
    en: "You've seen that hànzì are made of parts. Shall we build a few?",
  },
  "booster:first-conversation:v1": {
    afterNodeId: "node:instruction:foundation:mandarin",
    pt: "Você já sabe dizer 你好. Vamos usar isso numa conversa de verdade.",
    en: "You can already say 你好. Let's use it in a real conversation.",
  },
};

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
