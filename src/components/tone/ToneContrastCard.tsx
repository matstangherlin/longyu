/**
 * RC1.3 · P16/P17 — o cartão que ENSINA o par antes de qualquer cobrança.
 *
 * Mostra os dois membros lado a lado com hànzì, pinyin, número do tom,
 * significado e contorno (P16.1/P16.3), e dá os controles de áudio que tornam o
 * contraste audível: ouvir A, ouvir B, ouvir a comparação e ouvir devagar
 * (P17.1). Nada aqui é pontuado — é apresentação.
 *
 * P17.2 — o contorno nunca aparece sozinho como número. Cada tom vem colado à
 * palavra real que ele forma; é a palavra que fixa o contorno, não o dígito.
 *
 * P21.1 — não existe nota de pronúncia nesta tela, nem em nenhuma outra desta
 * remessa: sem analisador acústico, "seu 3º tom está 87% correto" seria uma
 * medida inventada.
 */

import { useCallback, useRef } from "react";
import { ToneContour } from "./ToneContour";
import { Button } from "../ui/primitives";
import { IconSound } from "../ui/Icon";
import { speak } from "../../lib/tts";
import { t } from "../../i18n/catalog";
import type { MandarinToneNumber } from "../../data/toneKnowledge";
import {
  TONE_CONTOUR_EN,
  TONE_CONTOUR_PT,
  type ToneContrastMember,
  type ToneContrastSet,
} from "../../data/toneContrastSets";

function Member({
  member,
  locale,
  onPlay,
}: {
  member: ToneContrastMember;
  locale: "pt-BR" | "en";
  onPlay: () => void;
}) {
  const meaning = locale === "en" ? member.meaningEn : member.meaningPt;
  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface px-3 py-4 text-center"
      data-tone-contrast-member={member.refId}
      data-tone-contrast-tone={member.dictionaryTone}
      data-tone-contrast-only={member.contrastOnly ? "true" : undefined}
    >
      <div className="hanzi text-4xl leading-none text-ink">{member.hanzi}</div>
      <div className="font-serif text-lg text-accent" data-tone-contrast-pinyin>
        {member.pinyin}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {locale === "en" ? `tone ${member.dictionaryTone}` : `${member.dictionaryTone}º tom`}
      </div>
      {/*
        `mode="LATE"` desenha SÓ o contorno. O número do tom já está na linha
        acima; com o rótulo do componente ligado, a coluna estreita do card
        quebrava "1º · ˉ" em duas linhas e o traço da marca ficava solto.
      */}
      <ToneContour tone={member.dictionaryTone as MandarinToneNumber} mode="LATE" locale={locale} />
      <div className="text-[11px] leading-4 text-ink-soft" data-tone-contrast-contour>
        {locale === "en" ? TONE_CONTOUR_EN[member.dictionaryTone] : TONE_CONTOUR_PT[member.dictionaryTone]}
      </div>
      <div className="text-sm font-medium text-ink" data-tone-contrast-meaning>
        {meaning}
      </div>
      <Button variant="soft" className="mt-1 w-full" onClick={onPlay} data-tone-contrast-play={member.refId}>
        <IconSound width={16} height={16} /> {member.pinyin}
      </Button>
    </div>
  );
}

export function ToneContrastCard({
  set,
  locale = "pt-BR",
  flat = false,
}: {
  set: ToneContrastSet;
  locale?: "pt-BR" | "en";
  /** RC2.2.17B · PART F — no shell guiado, sem moldura externa (sem card-em-card). */
  flat?: boolean;
}) {
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
  }, []);

  const play = useCallback(
    (text: string, options?: { slow?: boolean }) => {
      clearTimers();
      speak(text, { rate: options?.slow ? 0.55 : 0.85 });
    },
    [clearTimers]
  );

  // P17 — a comparação toca A e DEPOIS B, nessa ordem, com respiro entre as
  // duas. Ouvir as duas na sequência é o que constrói a discriminação.
  const playComparison = useCallback(
    (options?: { slow?: boolean }) => {
      clearTimers();
      const rate = options?.slow ? 0.55 : 0.85;
      speak(set.a.audioTarget, { rate });
      timersRef.current.push(
        window.setTimeout(() => speak(set.b.audioTarget, { rate }), options?.slow ? 1800 : 1200)
      );
    },
    [clearTimers, set.a.audioTarget, set.b.audioTarget]
  );

  return (
    <section
      className={flat ? "" : "rounded-[22px] border border-accent-soft bg-surface-2 p-4"}
      data-tone-contrast-set={set.id}
      data-tone-contrast-base={set.baseSyllable}
      data-tone-contrast-flat={flat ? "true" : undefined}
    >
      {!flat && (
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
          {locale === "en" ? "Same syllable, different tone" : "Mesma sílaba, outro tom"}
        </div>
      )}
      <div className="mt-3 flex items-stretch gap-2">
        <Member member={set.a} locale={locale} onPlay={() => play(set.a.audioTarget)} />
        <div className="flex shrink-0 items-center text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
          {locale === "en" ? "vs" : "×"}
        </div>
        <Member member={set.b} locale={locale} onPlay={() => play(set.b.audioTarget)} />
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-soft" data-tone-contrast-explanation>
        {locale === "en" ? set.explanationEn : set.explanationPt}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="soft" onClick={() => playComparison()} data-tone-contrast-compare>
          <IconSound width={16} height={16} />
          {locale === "en" ? "Hear the comparison" : "Ouvir comparação"}
        </Button>
        <Button variant="outline" onClick={() => playComparison({ slow: true })} data-tone-contrast-slow>
          {locale === "en" ? "Hear slowly" : "Ouvir devagar"}
        </Button>
      </div>
      {/* P19.1 — palavra de demonstração é rotulada como tal, para o aluno e
          para o modelo de aprendizagem: ela não entra em mastery. */}
      {set.a.contrastOnly || set.b.contrastOnly ? (
        <p className="mt-2 text-xs leading-5 text-ink-faint" data-tone-contrast-only-note>
          {t("player.toneContrastOnlyNote")}
        </p>
      ) : null}
    </section>
  );
}
