import { useState } from "react";
import { CHUNKS } from "../../data/chunks";
import { useStore } from "../../lib/store";
import { gradeReviewDomain } from "../../lib/reviewPlan";
import { playSoundFx } from "../../lib/soundFx";
import { Card, Button, Pill, SectionTitle } from "../../components/ui/primitives";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { GlossText } from "../../components/hanzi/GlossText";
import { EngineGate } from "../../components/layout/EngineGate";
import { ProPaywall, type ProPaywallKind } from "../../components/pro/ProPaywall";
import { useIsPro } from "../../lib/proAccess";

export function FalaPage() {
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const addMinutes = useStore((s) => s.addMinutes);
  const addXp = useStore((s) => s.addXp);
  const soundEffects = useStore((s) => s.soundEffects);
  const learnedChunks = useStore((s) => s.learnedChunks);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const isPremium = useIsPro();
  const consumeCharge = useStore((s) => s.consumeCharge);

  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [paywallKind, setPaywallKind] = useState<ProPaywallKind | null>(null);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [sessionCharged, setSessionCharged] = useState(false);
  const chunk = CHUNKS[i];

  function ensureTrainingCharge(): boolean {
    if (sessionCharged) return true;
    if (!consumeCharge("extra_training")) {
      setPaywallKind("energy");
      return false;
    }
    setSessionCharged(true);
    return true;
  }

  function grade(knew: boolean) {
    if (!ensureTrainingCharge()) return;
    gradeReviewDomain({
      ensureSrs,
      gradeSrs,
      type: "chunk",
      itemId: chunk.id,
      track: "fala",
      domain: "fala",
      grade: knew ? "good" : "again",
    });
    recordDailyTask("phrasesSpoken");
    playSoundFx(knew ? "success" : "task", soundEffects);
    const next = (i + 1) % CHUNKS.length;
    setI(next);
    setRevealed(false);
    const dc = doneCount + 1;
    setDoneCount(dc);
    if (dc % 6 === 0) {
      addMinutes("fala", 5);
      addXp(8, "fala_session");
      setSessionCharged(false);
      playSoundFx("qiGain", soundEffects);
    }
  }

  return (
    <EngineGate track="fala">
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Competência · Fala útil"
        title="Frases que você usa de verdade"
        desc="Blocos de sobrevivência, não palavras soltas. Ouça, imite e reconheça o sentido."
      />

      <section className="border-y border-[#B7791F]/25 bg-surface px-4 py-5 sm:px-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Fala com IA · Pro</div>
            <h2 className="mt-1 font-serif text-xl font-semibold text-ink">Converse sem medo de errar</h2>
            <p className="mt-1 text-sm text-ink-soft">Roleplays guiados e correção de pronúncia frase por frase.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (isPremium) {
                setSpeechNotice("Em breve, você poderá praticar conversas com IA e receber correção de áudio no app.");
                return;
              }
              setPaywallKind("speech");
            }}
          >
            {isPremium ? "Em breve no Pro" : "Praticar com IA"}
          </Button>
        </div>
        {speechNotice && <p className="mt-3 text-xs leading-5 text-ink-faint">{speechNotice}</p>}
      </section>

      {/* Flashcard */}
      <Card className="mx-auto max-w-xl p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <Pill tone="accent">{chunk.tags[0]}</Pill>
          <span className="text-sm text-ink-faint">
            {i + 1} / {CHUNKS.length}
          </span>
        </div>

        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <GlossText text={chunk.hanzi} className="text-5xl leading-tight text-ink" />
          <Pinyin text={chunk.pinyin} className="font-serif text-xl" />
          <SpeakButton text={chunk.hanzi} size="lg" />

          {revealed ? (
            <div className="animate-pop">
              <div className="text-lg font-medium text-ink">{chunk.meaningPt}</div>
              {chunk.literalPt && (
                <div className="mt-1 text-sm text-ink-faint">
                  literal: {chunk.literalPt}
                </div>
              )}
            </div>
          ) : (
            <Button variant="soft" onClick={() => setRevealed(true)}>
              Mostrar significado
            </Button>
          )}
        </div>

        {revealed && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => grade(false)}>
              Ainda não
            </Button>
            <Button onClick={() => grade(true)}>Já sabia</Button>
          </div>
        )}
      </Card>

      {/* Lista de referência */}
      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold text-ink">
          Todos os chunks
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {CHUNKS.map((c) => (
            <Card key={c.id} className="flex items-center gap-3 p-3">
              <SpeakButton text={c.hanzi} size="sm" />
              <div className="min-w-0 flex-1">
                <GlossText text={c.hanzi} className="text-lg text-ink" />
                <div className="flex items-center gap-2 text-sm">
                  <Pinyin text={c.pinyin} className="font-serif" />
                  <span className="truncate text-ink-soft">· {c.meaningPt}</span>
                </div>
              </div>
              {learnedChunks.includes(c.id) && <Pill tone="good">aprendido</Pill>}
            </Card>
          ))}
        </div>
      </section>
      <ProPaywall open={paywallKind !== null} kind={paywallKind ?? "speech"} onClose={() => setPaywallKind(null)} />
    </div>
    </EngineGate>
  );
}
