import { useEffect, useRef, useState } from "react";
import { availableMicrotexts } from "../../data/microtexts";
import { CHARACTERS } from "../../data/characters";
import { CHUNKS } from "../../data/chunks";
import { glossFor } from "../../data/gloss";
import { useStore } from "../../lib/store";
import { gradeReviewDomain } from "../../lib/reviewPlan";
import { EngineGate } from "../../components/layout/EngineGate";
import { MandarinText } from "../../components/hanzi/MandarinText";
import { Card, SectionTitle } from "../../components/ui/primitives";
import { ProPaywall } from "../../components/pro/ProPaywall";

export function LeituraPage() {
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const addMinutes = useStore((s) => s.addMinutes);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const consumeCharge = useStore((s) => s.consumeCharge);
  const completed = useStore((s) => s.completedLessons);
  const isPremium = useStore((s) => s.isPremium);
  const texts = availableMicrotexts(completed, isPremium);
  const [idx, setIdx] = useState(0);
  const [sessionCharged, setSessionCharged] = useState(false);
  const [energyPaywallOpen, setEnergyPaywallOpen] = useState(false);
  const countedTexts = useRef(new Set<string>());
  const processedTexts = useRef(new Set<string>());

  useEffect(() => {
    if (idx >= texts.length) setIdx(0);
  }, [texts.length, idx]);

  const text = texts[idx];

  useEffect(() => {
    if (!text) return;
    if (!sessionCharged) {
      if (!consumeCharge("extra_training")) {
        setEnergyPaywallOpen(true);
        return;
      }
      setSessionCharged(true);
      return;
    }
    if (processedTexts.current.has(text.id)) return;
    processedTexts.current.add(text.id);
    addMinutes("leitura", 3);
    if (!countedTexts.current.has(text.id)) {
      countedTexts.current.add(text.id);
      recordDailyTask("microtextsRead");
    }
    const graded = new Set<string>();
    for (const line of text.lines) {
      const normalizedLine = normalizeHanzi(line.hanzi);
      for (const chunk of CHUNKS) {
        if (!normalizedLine.includes(normalizeHanzi(chunk.hanzi))) continue;
        const key = `chunk:${chunk.id}`;
        if (graded.has(key)) continue;
        graded.add(key);
        gradeReviewDomain({
          ensureSrs,
          gradeSrs,
          type: "chunk",
          itemId: chunk.id,
          track: "leitura",
          domain: "leitura",
          grade: "good",
        });
      }
      for (const glyph of normalizedLine) {
        const char = CHARACTERS.find((c) => c.hanzi === glyph);
        if (!char) continue;
        const key = `char:${char.id}`;
        if (graded.has(key)) continue;
        graded.add(key);
        gradeReviewDomain({
          ensureSrs,
          gradeSrs,
          type: "char",
          itemId: char.id,
          track: "leitura",
          domain: "leitura",
          grade: "good",
        });
      }
    }
  }, [text, sessionCharged, addMinutes, consumeCharge, ensureSrs, gradeSrs, recordDailyTask]);

  return (
    <EngineGate track="leitura">
      {!text ? (
        <div className="mx-auto max-w-md pt-10 text-center text-sm text-ink-soft">
          Conclua «Microtexto 1» na jornada para liberar textos aqui.
        </div>
      ) : (
        <div className="space-y-6">
          <SectionTitle
            eyebrow="Competência · Leitura"
            title="Leitura guiada"
            desc="Textos curtos que só usam o que você já viu. Toque numa linha para traduzir."
          />

          <div className="flex flex-wrap gap-2">
            {texts.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setIdx(i)}
                className={[
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                  i === idx ? "bg-accent text-white" : "bg-surface-2 text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                {t.title}
              </button>
            ))}
          </div>

          <Card className="p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold text-ink">{text.title}</h2>
              <span className="text-xs font-medium text-ink-faint">Exibição personalizada</span>
            </div>

            <div className="space-y-3">
              {text.lines.map((line, i) => (
                <div key={i} className="rounded-xl border border-line bg-surface-2/60 p-4">
                  <MandarinText
                    hanzi={line.hanzi}
                    pinyin={line.pinyin}
                    meaning={line.pt}
                    size="md"
                    audio
                    autoPlay={i === 0}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Glossário
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {text.glossary.map((g) => (
                  <div key={g.hanzi} className="rounded-xl bg-surface-2 px-3 py-2">
                    <MandarinText
                      hanzi={g.hanzi}
                      pinyin={glossFor(g.hanzi)?.pinyin}
                      meaning={g.pt}
                      size="sm"
                      autoPlay={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
        </div>
      )}
    </EngineGate>
  );
}

function normalizeHanzi(text: string): string {
  return text.replace(/[，。！？、,.!?？\s]/g, "");
}
