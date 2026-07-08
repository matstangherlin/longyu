import { Card, Pill } from "../../components/ui/primitives";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { TONE_SANDHI_RULES } from "../../data/toneSandhi";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import { useStore } from "../../lib/store";

const INITIALS = [
  "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h",
  "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w",
];
const FINALS = [
  "a", "o", "e", "i", "u", "ü", "ai", "ei", "ao", "ou",
  "an", "en", "ang", "eng", "ong",
];

export function PinyinReference() {
  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-semibold text-ink">
        Referência de pinyin
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Iniciais
          </div>
          <div className="flex flex-wrap gap-2">
            {INITIALS.map((x) => (
              <span
                key={x}
                className="rounded-lg bg-surface-2 px-2.5 py-1 font-serif text-sm text-ink"
              >
                {x}
              </span>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Finais
          </div>
          <div className="flex flex-wrap gap-2">
            {FINALS.map((x) => (
              <span
                key={x}
                className="rounded-lg bg-surface-2 px-2.5 py-1 font-serif text-sm text-ink"
              >
                {x}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <ToneSandhiNotes />
    </section>
  );
}

// Notas de tone sandhi: os tons mudam em contexto (3º+3º, 不, 一). Cada regra
// "acende" quando o aluno alcança a lição em que ela passa a fazer sentido;
// antes disso aparece esmaecida, marcada como prévia.
function ToneSandhiNotes() {
  const completedLessons = useStore((s) => s.completedLessons);

  return (
    <div className="mt-6">
      <h3 className="mb-1 font-serif text-lg font-semibold text-ink">Tons em contexto (sandhi)</h3>
      <p className="mb-3 max-w-2xl text-sm leading-6 text-ink-soft">
        Alguns tons mudam quando as sílabas se encontram. Não é exceção decorada: é a boca
        buscando o caminho mais natural. Três regras cobrem quase tudo no começo.
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        {TONE_SANDHI_RULES.map((rule) => {
          const reached = completedLessons.includes(rule.relevantFromLesson);
          return (
            <Card key={rule.id} className={["p-4", reached ? "" : "opacity-80"].join(" ")}>
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold leading-snug text-ink">{rule.title}</h4>
                {!reached && <Pill tone="muted">Prévia</Pill>}
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-soft">{rule.rulePt}</p>
              <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-xs leading-5 text-ink-soft">
                <span className="font-semibold text-ink">Dica:</span> {rule.tipPt}
              </p>
              <ul className="mt-3 space-y-2">
                {rule.examples.map((example) => (
                  <li key={example.hanzi} className="flex items-center gap-2 text-sm">
                    <SpeakButton text={example.hanzi} size="sm" />
                    <span className="hanzi text-base text-ink">{example.hanzi}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">
                      <span className="font-medium text-accent">{formatPinyinForDisplay(example.pinyin)}</span>
                      {example.pinyin !== example.citation && (
                        <span className="text-ink-faint"> (escrito {formatPinyinForDisplay(example.citation)})</span>
                      )}
                      {" · "}
                      {example.pt}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
