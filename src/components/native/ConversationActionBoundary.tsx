/**
 * RC2.2.31B — wrapper único para ações que mudam estado pedagógico da conversa.
 * Continue / Reveal / Repair / Checkpoint / Finish / options.
 */
import type { ReactNode } from "react";
import { useNativeSafeAction, type NativeSafeActionHandlers, type NativeSafeActionObservers } from "./NativeSafeAction";

export type ConversationActionKind =
  | "continue"
  | "reveal"
  | "repair"
  | "checkpoint"
  | "finish"
  | "option"
  | "retry"
  | "stall-retry";

export interface ConversationActionBoundaryProps {
  kind: ConversationActionKind;
  actionKey: string;
  action: () => void;
  observers?: NativeSafeActionObservers;
  children: (handlers: NativeSafeActionHandlers & { classNameExtras: string }) => ReactNode;
}

export function useConversationAction(
  kind: ConversationActionKind,
  actionKey: string,
  action: () => void,
  observers?: NativeSafeActionObservers
): NativeSafeActionHandlers & { classNameExtras: string; kind: ConversationActionKind } {
  const handlers = useNativeSafeAction(action, `${kind}:${actionKey}`, observers);
  return {
    ...handlers,
    kind,
    classNameExtras: "longyu-press-feedback pointer-events-auto relative z-10 touch-manipulation",
  };
}

export function ConversationActionBoundary({
  kind,
  actionKey,
  action,
  observers,
  children,
}: ConversationActionBoundaryProps) {
  const handlers = useConversationAction(kind, actionKey, action, observers);
  return <>{children(handlers)}</>;
}
