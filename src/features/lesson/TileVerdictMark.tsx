import { IconCheck, IconX } from "../../components/ui/Icon";

export type TileVerdict = "right" | "wrong" | null | undefined | false;

/**
 * RC2.3.13R.3.2.5 — an answer tile's verdict is never colour alone (WCAG 1.4.1):
 * right gets a check, wrong an X, in the tile's top-right corner. The tile keeps
 * its tint and border; its label stays in ink. The host must be `relative`.
 * Decorative for assistive tech: the feedback panel announces the result.
 */
export function TileVerdictMark({ verdict }: { verdict: TileVerdict }) {
  if (verdict === "right") {
    return (
      <IconCheck
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-2 text-good"
        width={16}
        height={16}
        data-tile-verdict="right"
      />
    );
  }
  if (verdict === "wrong") {
    return (
      <IconX
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-2 text-wrong"
        width={16}
        height={16}
        data-tile-verdict="wrong"
      />
    );
  }
  return null;
}
