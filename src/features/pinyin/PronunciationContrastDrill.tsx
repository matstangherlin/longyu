import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/primitives";
import { IconChevron, IconSound } from "../../components/ui/Icon";
import { ArticulationDiagram } from "../../components/pronunciation/ArticulationDiagram";
import { ARTICULATION_DIAGRAMS } from "../../data/articulationTargets";
import { type ContrastDrillStage, type ContrastSound, type PronunciationContrast } from "../../data/pronunciationCoreBr";
import { playMandarinAudio } from "../../lib/audioPlayback";
import { SelfComparePractice, selfCompareRecordingAvailable } from "../lesson/SelfComparePractice";
import { t } from "../../i18n/catalog";
import { soundsShareCanonicalVoice } from "../../lib/audioContrastPairs";
import { recordSpeechEvidence } from "../../lib/speechEvidence";

/**
 * RC2.2.20 · V5A — um contraste de pronúncia, na ordem da percepção:
 *
 *   VER a boca → OUVIR A → OUVIR B → COMPARAR → IDENTIFICAR → (produzir)
 *
 * Um passo por tela, uma ação principal. Não começa por quiz: identificar só
 * vem depois de ouvir cada som. Produzir é opcional (gravar e comparar, sem
 * nota de pronúncia — não existe medição de altura/fonema aqui).
 */
const IDENTIFY_ROUNDS = 3;

type AudioState = "idle" | "playing" | "heard" | "failed";

export function PronunciationContrastDrill({ contrast, onClose }: { contrast: PronunciationContrast; onClose: () => void }) {
  const diagram = ARTICULATION_DIAGRAMS.find((spec) => spec.id === contrast.id) ?? null;
  // RC2.3.5 — A/B só tocam se TODOS os sons têm asset canônico do mesmo
  // speaker. Sem isso, um lado ficaria mudo (conteúdo fixo nunca cai em TTS)
  // e "identificar" viraria chute. O contraste fica em "ver" até o áudio existir.
  const audioReady = useMemo(() => soundsShareCanonicalVoice(contrast.sounds.map((sound) => sound.hanzi)), [contrast]);
  const [graded, setGraded] = useState(0);
  // "hear" percorre cada som (2 ou 3) antes de comparar.
  const [stage, setStage] = useState<ContrastDrillStage>("see");
  const [hearIndex, setHearIndex] = useState(0);
  const [audio, setAudio] = useState<AudioState>("idle");
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const roundTargets = useMemo(
    () => Array.from({ length: IDENTIFY_ROUNDS }, (_, index) => contrast.sounds[(index * 7 + contrast.id.length) % contrast.sounds.length]),
    [contrast]
  );
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    []
  );

  // Watchdog fora da Promise do TTS: no Firefox o motor pode ficar em
  // "Tocando…" sem resolver (onstart sem onend / timer engolido). O aluno
  // já tocou Ouvir — depois do teto liberamos Continuar/opções.
  useEffect(() => {
    if (audio !== "playing") return;
    const id = window.setTimeout(() => {
      setAudio((current) => (current === "playing" ? "failed" : current));
    }, 2_500);
    return () => window.clearTimeout(id);
  }, [audio]);

  async function play(sound: ContrastSound) {
    setAudio("playing");
    try {
      const outcome = await playMandarinAudio(sound.hanzi, { rate: 0.8, source: "PINYIN" });
      if (!alive.current) return;
      setAudio((current) => {
        if (current !== "playing") return current;
        return outcome.started ? "heard" : "failed";
      });
    } catch {
      if (!alive.current) return;
      setAudio((current) => (current === "playing" ? "failed" : current));
    }
  }

  async function playSequence() {
    setAudio("playing");
    try {
      let any = false;
      for (const sound of contrast.sounds) {
        const outcome = await playMandarinAudio(sound.hanzi, { rate: 0.8, source: "PINYIN" });
        any = any || outcome.started;
      }
      if (!alive.current) return;
      setAudio((current) => {
        if (current !== "playing") return current;
        return any ? "heard" : "failed";
      });
    } catch {
      if (!alive.current) return;
      setAudio((current) => (current === "playing" ? "failed" : current));
    }
  }

  function next(stageTo: ContrastDrillStage) {
    setAudio("idle");
    setPicked(null);
    setStage(stageTo);
  }

  const heardOrFailed = audio === "heard" || audio === "failed";
  const current = contrast.sounds[hearIndex];
  const target = roundTargets[round];

  return (
    <div className="rounded-2xl border border-line bg-surface p-4" data-testid="contrast-drill" data-contrast={contrast.id} data-stage={stage} data-audio={audio} data-audio-ready={audioReady ? "true" : "false"}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{contrast.title}</p>
        <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm font-semibold text-ink-soft hover:text-ink">
          Fechar
        </button>
      </div>

      {stage === "see" && (
        <div className="mt-2 space-y-3">
          {diagram ? <ArticulationDiagram spec={diagram} locale="pt" /> : null}
          <p className="text-[15px] leading-6 text-ink" data-testid="contrast-note">{contrast.notePt}</p>
          {audioReady ? (
            <Button className="w-full" size="lg" onClick={() => next("hear_a")} data-testid="contrast-next">
              Ouvir os sons
            </Button>
          ) : (
            <>
              <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-soft" data-testid="contrast-audio-pending">
                O áudio deste contraste ainda está sendo preparado com a mesma voz dos outros. Por enquanto, leia a explicação e repita em voz alta.
              </p>
              <Button className="w-full" size="lg" onClick={onClose} data-testid="contrast-next">
                Entendi
              </Button>
            </>
          )}
        </div>
      )}

      {(stage === "hear_a" || stage === "hear_b") && current && (
        <div className="mt-3 space-y-4 text-center">
          <p className="text-sm text-ink-soft">Ouça o som {current.label}</p>
          <div>
            <p className="hanzi text-[64px] leading-tight text-ink">{current.hanzi}</p>
            <p className="text-lg font-semibold text-ink">{current.pinyin}</p>
            <p className="text-sm text-ink-faint">{current.meaningPt}</p>
          </div>
          <Button variant="soft" onClick={() => void play(current)} disabled={audio === "playing"} data-testid="contrast-play">
            <IconSound width={18} height={18} /> {audio === "playing" ? "Tocando…" : "Ouvir"}
          </Button>
          {audio === "failed" && <p className="text-sm text-ink-soft">O áudio não tocou. Leia o pinyin em voz alta e siga.</p>}
          <Button
            className="w-full"
            size="lg"
            disabled={!heardOrFailed}
            onClick={() => {
              if (hearIndex + 1 < contrast.sounds.length) {
                setHearIndex(hearIndex + 1);
                setAudio("idle");
                setStage("hear_b");
              } else {
                next("compare");
              }
            }}
            data-testid="contrast-next"
          >
            Continuar
          </Button>
        </div>
      )}

      {stage === "compare" && (
        <div className="mt-3 space-y-4 text-center">
          <p className="text-sm text-ink-soft">Agora em sequência. Preste atenção só na diferença.</p>
          <div className="flex items-end justify-center gap-5">
            {contrast.sounds.map((sound) => (
              <div key={sound.label}>
                <p className="hanzi text-[48px] leading-tight text-ink">{sound.hanzi}</p>
                <p className="font-semibold text-ink">{sound.pinyin}</p>
              </div>
            ))}
          </div>
          <Button variant="soft" onClick={() => void playSequence()} disabled={audio === "playing"} data-testid="contrast-play">
            <IconSound width={18} height={18} /> {audio === "playing" ? "Tocando…" : "Ouvir em sequência"}
          </Button>
          <Button className="w-full" size="lg" disabled={!heardOrFailed} onClick={() => next("identify")} data-testid="contrast-next">
            Continuar
          </Button>
        </div>
      )}

      {stage === "identify" && target && (
        <div className="mt-3 space-y-4 text-center">
          <p className="text-sm text-ink-soft">
            Qual você ouviu? ({round + 1}/{IDENTIFY_ROUNDS})
          </p>
          <Button variant="soft" onClick={() => void play(target)} disabled={audio === "playing"} data-testid="contrast-play">
            <IconSound width={18} height={18} /> {audio === "playing" ? "Tocando…" : "Ouvir"}
          </Button>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {contrast.sounds.map((sound) => {
              const chosen = picked === sound.label;
              const right = picked != null && sound.label === target.label;
              return (
                <button
                  key={sound.label}
                  type="button"
                  disabled={!heardOrFailed || picked != null}
                  onClick={() => {
                    setPicked(sound.label);
                    // Sem áudio confirmado a escolha não vale ponto: seria chute.
                    if (audio !== "heard") return;
                    setGraded((value) => value + 1);
                    if (sound.label === target.label) setScore((value) => value + 1);
                  }}
                  className={[
                    "min-h-16 rounded-2xl border px-3 py-2 text-xl font-semibold transition",
                    right ? "border-good bg-good-soft text-ink" : chosen ? "border-wrong bg-wrong-soft text-wrong" : "border-line bg-surface text-ink",
                  ].join(" ")}
                  data-contrast-option={sound.label}
                >
                  {sound.pinyin}
                </button>
              );
            })}
          </div>
          {picked != null && (
            <p className="text-sm font-medium text-ink" role="status" data-testid="contrast-feedback">
              {audio !== "heard" ? "Sem áudio esta rodada não conta." : picked === target.label ? "Isso." : `Era ${target.pinyin}.`} Ouça de novo e compare.
            </p>
          )}
          <Button
            className="w-full"
            size="lg"
            disabled={picked == null}
            onClick={() => {
              if (round + 1 < IDENTIFY_ROUNDS) {
                setRound(round + 1);
                setPicked(null);
                setAudio("idle");
              } else {
                recordSpeechEvidence({
                  conceptId: `contrast:${contrast.id}`,
                  activityId: `pinyin-lab:${contrast.id}`,
                  mode: "PERCEPTION",
                  modelHeard: true,
                  perceptionTrials: graded,
                  perceptionCorrect: score,
                  completed: true,
                });
                next("produce");
              }
            }}
            data-testid="contrast-next"
          >
            Continuar
          </Button>
        </div>
      )}

      {stage === "produce" && (
        <div className="mt-3 space-y-3">
          <p className="text-center text-sm text-ink" data-testid="contrast-score">
            Você identificou {score} de {graded}.
          </p>
          <p className="text-center text-sm text-ink-soft">Quer tentar falar? É opcional — grave e compare com o modelo.</p>
          {/* Sem motor de gravação (WebView/navegador sem mediaDevices ou MediaRecorder):
              saída honesta, igual ao passo de fala da lição — nunca um "Gravar" que só falha. */}
          {selfCompareRecordingAvailable() ? (
            <SelfComparePractice
              target={contrast.sounds[contrast.sounds.length - 1].hanzi}
              conceptId={`contrast:${contrast.id}`}
              activityId={`pinyin-lab:${contrast.id}:produce`}
              onContinue={onClose}
              onCannotSpeak={onClose}
            />
          ) : (
            <div data-testid="contrast-produce-unavailable">
              <Button className="w-full" size="lg" onClick={onClose} data-testid="contrast-produce-continue">
                {t("player.continue")} <IconChevron width={18} height={18} />
              </Button>
              <p className="mt-2 text-center text-xs text-ink-faint">{t("player.voiceUnavailable")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
