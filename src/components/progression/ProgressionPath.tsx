import { useNavigate } from "react-router-dom";
import { IconBook, IconLantern, IconPlay } from "../ui/Icon";
import { ProgressionConnector } from "./ProgressionConnector";
import { ProgressionNodeBubble, progressionOffsetForIndex } from "./ProgressionNodeBubble";
import { SymbolicOrnamentRail } from "./symbolicOrnaments";
import type { ProgressionPathNode, ProgressionPersonality } from "./progressionTypes";

function defaultIcon(personality: ProgressionPersonality, coreAula?: boolean) {
  if (personality === "culture") return <IconLantern width={20} height={20} />;
  if (coreAula) return <IconBook width={20} height={20} />;
  return <IconPlay width={20} height={20} />;
}

/**
 * Shared path grammar: stable center axis + connector + bubble + label.
 * Decorative ornaments sit in side lanes and never move the axis.
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
      className="progression-path-frame relative mx-auto w-full max-w-md py-2"
      data-testid={testId ?? "progression-path"}
      data-progression-path={personality}
      data-progression-axis="stable"
    >
      <SymbolicOrnamentRail
        nodeCount={visible.length}
        density={personality === "culture" ? "culture" : "journey"}
      />
      <div
        className="pointer-events-none absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-line/50 to-transparent"
        aria-hidden
        data-progression-axis-line="true"
      />
      <div className="relative z-[1] mx-auto flex w-full max-w-[11rem] flex-col items-center">
        {visible.map((node, index) => {
          const coreAula = Boolean(node.statusLabel?.toLowerCase().includes("aula") || node.iconId === "aula");
          return (
            <div key={node.id} className="relative flex w-full flex-col items-center">
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
    </div>
  );
}
