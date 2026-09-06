import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/primitives";
import { HANZI_BUILDERS } from "../../data/hanziBuilder";
import { HanziBuilderExercise } from "../../components/hanzi/HanziBuilderExercise";

/**
 * Fixture DEV/QA do Hanzi Builder — atrás do QaFastPathGate, como as demais.
 *
 * Existe pelo mesmo motivo da fixture de escuta pura: o laboratório de hànzì
 * decide quais builders mostrar a partir de pré-requisitos, energia e progresso
 * do aluno, então "abrir /hanzi e montar" não é um caminho determinístico. Aqui
 * o Playwright encontra o componente REAL — não uma cópia — sempre no mesmo
 * estado, e o que se mede é o comportamento dele.
 *
 * O padrão é `hb-sen-components` (森 = 木 + 木 + 木) de propósito: três peças de
 * glifo idêntico com ids distintos são o caso em que "remover uma ocorrência"
 * pode silenciosamente virar "remover todas".
 */
const DEFAULT_BUILDER = "hb-sen-components";

export function QaHanziBuilderPage() {
  const [params] = useSearchParams();
  const requested = params.get("builder") ?? DEFAULT_BUILDER;
  const [finished, setFinished] = useState<"correct" | null>(null);
  const [wrongCount, setWrongCount] = useState(0);

  const builder = useMemo(
    () => HANZI_BUILDERS.find((item) => item.id === requested) ?? HANZI_BUILDERS.find((item) => item.id === DEFAULT_BUILDER)!,
    [requested]
  );

  return (
    <main className="min-h-[100dvh] bg-bg px-4 py-6" data-qa-builder-fixture>
      <Card className="mx-auto max-w-xl overflow-visible rounded-[24px] p-4 shadow-lift sm:p-5">
        <div data-qa-builder-wrong={String(wrongCount)} data-qa-builder-status={finished ?? "open"}>
          <HanziBuilderExercise
            key={builder.id}
            builder={builder}
            onWrong={() => setWrongCount((n) => n + 1)}
            onCorrect={() => setFinished("correct")}
          />
        </div>
      </Card>
    </main>
  );
}
