import { useNavigate } from "react-router-dom";
import { IconBook, IconLantern, IconPlay } from "../ui/Icon";
import { ProgressionConnector } from "./ProgressionConnector";
import { ProgressionNodeBubble, progressionOffsetForIndex } from "./ProgressionNodeBubble";
import type { ProgressionPathNode, ProgressionPersonality } from "./progressionTypes";

function defaultIcon(personality: ProgressionPersonality, coreAula?: boolean) {
  if (personality === "culture") return <IconLantern width={20} height={20} />;
  if (coreAula) return <IconBook width={20} height={20} />;
  return <IconPlay width={20} height={20} />;
}

/**
 * Shared path grammar: connector + bubble + label sequence.
 * Domain pages supply mapped nodes; they do not own bubble state logic.
 */
export function ProgressionPath({
  nodes,
  personality,
  testId,
}: {
  nodes: ProgressionPathNode[];
  personality: ProgressionPersonality;
  testId?: string;
}) {
  const navigate = useNavigate();
  const visible = nodes.filter(Boolean);

  return (
    <div
      className="relative flex flex-col items-center gap-0 py-3"
      data-testid={testId ?? "progression-path"}
      data-progression-path={personality}
    >
      <div
        className="pointer-events-none absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-line/40 to-transparent"
        aria-hidden
      />
      {visible.map((node, index) => {
        const coreAula = Boolean(node.statusLabel?.toLowerCase().includes("aula") || node.iconId === "aula");
        return (
          <div key={node.id} className="relative z-[1] flex w-full flex-col items-center">
            {index > 0 ? (
              <ProgressionConnector fromState={visible[index - 1].state} toState={node.state} />
            ) : null}
            <ProgressionNodeBubble
              id={node.id}
              title={node.title}
              state={node.state}
              personality={personality}
              statusLabel={node.statusLabel}
              metaLabel={node.metaLabel}
              passRing={node.passRing}
              offset={progressionOffsetForIndex(index)}
              icon={defaultIcon(personality, coreAula)}
              coreAula={coreAula}
              testId={node.testId}
              anchor={node.anchor}
              disabled={node.disabled || node.state === "LOCKED"}
              onSelect={() => {
                node.onSelect?.();
                if (node.href && node.state !== "LOCKED") navigate(node.href);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
