import { Suspense, lazy, useMemo, useState } from "react";
import { Card } from "../../../components/ui/primitives";
import type { LessonCapsule } from "../../../data/lessonCapsules";
import { resolveLessonMediaAsset } from "../../../data/lessonCatalog";
import type { InstructionLocale } from "../../../i18n/config";
import { AnimatedCapsuleRenderer } from "./AnimatedCapsuleRenderer";
import { CapsuleTranscript } from "./CapsuleTranscript";

/**
 * Parte X — o runtime de vídeo só é baixado quando existe vídeo para tocar.
 * A Jornada e a cápsula animada não pagam por ele. `React.lazy` mantém o
 * bundle inicial intacto e é o suficiente enquanto não houver HLS: quando
 * houver, a biblioteca entra atrás desta mesma fronteira.
 */
const VideoCapsulePlayer = lazy(() =>
  import("./VideoCapsulePlayer").then((module) => ({ default: module.VideoCapsulePlayer }))
);

/**
 * V4.9.2B — Parte G: uma casca, dois renderers.
 *
 * Título, objetivo, alvos de conhecimento, transcrição, conclusão e volta à
 * Jornada são iguais em animação e vídeo, e é isso que fica aqui. O que muda é
 * apenas como o conteúdo é apresentado — o que permite, mais tarde, a aula
 * híbrida da Parte R sem reescrever nenhum dos dois lados.
 */
export function LessonCapsulePlayer({
  capsule,
  locale,
  onComplete,
}: {
  capsule: LessonCapsule;
  locale: InstructionLocale;
  onComplete: () => void;
}) {
  const content = capsule.localized[locale];
  const asset = useMemo(() => resolveLessonMediaAsset(content.mediaAssetId), [content.mediaAssetId]);
  const en = locale === "en";

  // Um vídeo que falha cai para os segmentos interativos (Parte O). A cápsula
  // é CORE: o aluno precisa poder concluir o tópico de qualquer maneira, então
  // o fallback não é um aviso, é um caminho pedagógico completo.
  const [forcedFallback, setForcedFallback] = useState(false);
  const wantsVideo =
    capsule.mediaType === "VIDEO_CAPSULE" && asset?.kind === "VIDEO" && !forcedFallback;

  return (
    <>
      <div className="mb-3 px-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
          {capsule.mediaType === "VIDEO_CAPSULE"
            ? en
              ? "Video lesson"
              : "Aula em vídeo"
            : en
              ? "Interactive lesson"
              : "Aula interativa"}{" "}
          · ~{Math.ceil(capsule.durationSeconds / 60)} min
        </div>
        <h1 className="mt-1 font-serif text-xl font-semibold text-ink">{content.title}</h1>
      </div>

      <Card className="overflow-hidden p-5 sm:p-7" variant="progress" data-capsule-media={capsule.mediaType}>
        {wantsVideo && asset ? (
          <Suspense
            fallback={
              <div className="rounded-2xl border border-line bg-surface-2 p-8 text-center text-sm text-ink-soft">
                {en ? "Loading the player…" : "Carregando o player…"}
              </div>
            }
          >
            <VideoCapsulePlayer
              asset={asset}
              capsuleId={capsule.id}
              locale={locale}
              onOutcome={(outcome) => {
                if (outcome === "COMPLETED") onComplete();
                else setForcedFallback(true);
              }}
            />
          </Suspense>
        ) : (
          <>
            {forcedFallback && (
              <p
                className="mb-4 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs leading-5 text-ink-soft"
                data-testid="capsule-fallback-notice"
              >
                {en
                  ? "Showing the interactive version of this lesson."
                  : "Mostrando a versão interativa desta aula."}
              </p>
            )}
            <AnimatedCapsuleRenderer
              content={content}
              locale={locale}
              capsuleId={capsule.id}
              onComplete={onComplete}
            />
          </>
        )}
      </Card>

      <CapsuleTranscript
        transcript={content.transcript}
        cues={asset?.captions}
        locale={locale}
        capsuleId={capsule.id}
      />

      <p className="mt-3 px-2 text-center text-xs text-ink-faint">{content.objective}</p>

      {/*
        Parte N — concluir a aula é INSTRUCTION_COMPLETED, não
        VOCABULARY_MASTERED. Os alvos ficam visíveis para deixar claro o que a
        aula apresentou; quem mede aprendizagem são os exercícios seguintes.
      */}
      <p className="mt-1 px-2 text-center text-[10px] text-ink-faint" data-capsule-targets={capsule.knowledgeTargets.join(",")}>
        {en
          ? "Watching teaches; the exercises are what measure learning."
          : "Assistir ensina; quem mede a aprendizagem são os exercícios."}
      </p>
    </>
  );
}
