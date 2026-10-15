/**
 * RC2.3.13R.3.2.5 — Device QA "Premium UX closure" (never learner UI).
 *
 * The owner judges hierarchy, states and the reward ritual on the physical
 * device here. Every switch is LOCAL preview state: nothing writes the store,
 * the economy, sync or storage, and the chest preview claims a sample reward
 * that never reaches the learner's progress.
 */
import { useState } from "react";
import { Button, Card, EmptyState, ErrorState, LoadingState, Pill } from "../../components/ui/primitives";
import { ChestOpeningRitual } from "../../components/chests/ChestOpeningRitual";
import type { ChestRewardItem, ChestType } from "../../lib/store";

const SAMPLE_REWARDS: Record<ChestType, ChestRewardItem[]> = {
  small: [{ kind: "qi", amount: 35, label: "Qi" }],
  dragon: [{ kind: "shield", amount: 1, label: "Escudo de Sequência" }],
  monthly: [
    { kind: "qi", amount: 240, label: "Qi" },
    { kind: "shield", amount: 1, label: "Escudo de Sequência" },
  ],
  legendary: [
    { kind: "qi", amount: 420, label: "Qi" },
    { kind: "pearl", amount: 1, label: "Pérola de Jade" },
    { kind: "shield", amount: 1, label: "Escudo de Sequência" },
  ],
};

type StatePreview = "loading" | "empty" | "error" | "offline";

const PHYSICAL_CHECKS = [
  "One emphasis surface per screen; cards calm, not glowing",
  "Buttons: rest · pressed · disabled (grey, legible) · loading (colour kept)",
  "Verdicts carry a check / X, never colour alone",
  "Chest: press → lid → light → rewards, once (~0.8 s); reduced motion instant",
  "Double tap on a chest claims once",
  "Offline: one compact line in lessons; Conta says 'saved on this device'",
  "Errors offer a retry; empty screens offer the next step",
  "Keyboard open: TabBar hides; fields never zoom",
  "TalkBack: rewards announced, guide lines read once",
];

export function PremiumUxQaPanel() {
  const [preview, setPreview] = useState<StatePreview>("loading");
  const [chest, setChest] = useState<ChestType | null>(null);
  const [emptyClaim, setEmptyClaim] = useState(false);

  return (
    <section className="space-y-4" data-qa-premium-ux="" aria-labelledby="qa-premium-ux-title">
      <h2 id="qa-premium-ux-title" className="font-serif text-xl font-semibold text-ink">
        Premium UX closure
      </h2>
      <p className="text-sm text-ink-soft">
        QA-only previews (local state). Nothing here changes progress, economy or sync.
      </p>

      <Card className="space-y-3 p-4" data-qa-premium-surfaces="">
        <h3 className="font-semibold text-ink">Surfaces</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl bg-bg p-3 text-sm text-ink-soft">surface-0 · page</div>
          <div className="rounded-2xl border border-line bg-surface p-3 text-sm text-ink-soft shadow-card">surface-1 · card</div>
          <div className="rounded-2xl bg-surface-2 p-3 text-sm text-ink-soft">surface-2 · inset</div>
          <div className="rounded-2xl border border-line bg-surface p-3 text-sm text-ink-soft shadow-lift">raised</div>
          <div className="surface-emphasis rounded-2xl border p-3 text-sm text-ink">emphasis · do this now</div>
          <div className="surface-reward rounded-3xl border p-3 text-sm text-ink">reward · real rewards only</div>
        </div>
      </Card>

      <Card className="space-y-3 p-4" data-qa-premium-buttons="">
        <h3 className="font-semibold text-ink">Button states</h3>
        <div className="flex flex-wrap gap-2">
          <Button>Rest</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button variant="good">Correct</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="outline" disabled>
            Outline off
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill>muted</Pill>
          <Pill tone="accent">accent</Pill>
          <Pill tone="good">good</Pill>
          <Pill tone="gold">gold</Pill>
          <Pill tone="wrong">wrong</Pill>
        </div>
      </Card>

      <Card className="space-y-3 p-4" data-qa-premium-states="">
        <h3 className="font-semibold text-ink">Resilient states</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label="State preview">
          {(["loading", "empty", "error", "offline"] as StatePreview[]).map((state) => (
            <Button key={state} size="sm" variant={preview === state ? "primary" : "outline"} onClick={() => setPreview(state)} data-qa-state={state}>
              {state}
            </Button>
          ))}
        </div>
        {preview === "loading" && <LoadingState label="Carregando a aula…" />}
        {preview === "empty" && (
          <EmptyState title="Nada para revisar agora" desc="Conclua lições na Jornada e as palavras voltam aqui." action={<Button variant="soft">Continuar na Jornada</Button>} />
        )}
        {preview === "error" && <ErrorState desc="Verifique a conexão e tente de novo." onRetry={() => setPreview("loading")} />}
        {preview === "offline" && (
          <div className="flex justify-center">
            <span role="status" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
              Sem conexão
            </span>
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4" data-qa-premium-chest="">
        <h3 className="font-semibold text-ink">Chest ritual (sample reward, not granted)</h3>
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={emptyClaim} onChange={(event) => setEmptyClaim(event.target.checked)} />
          Simulate "unavailable" (claim returns nothing)
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SAMPLE_REWARDS) as ChestType[]).map((type) => (
            <Button key={type} size="sm" variant="secondary" onClick={() => setChest(type)} data-qa-chest={type}>
              {type}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-ink">Physical checks (owner)</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {PHYSICAL_CHECKS.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      </Card>

      {chest && (
        <ChestOpeningRitual
          type={chest}
          title={`QA · ${chest}`}
          claim={() => (emptyClaim ? null : SAMPLE_REWARDS[chest])}
          onClose={() => setChest(null)}
        />
      )}
    </section>
  );
}
