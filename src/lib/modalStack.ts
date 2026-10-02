/**
 * RC2.2.21 — pilha de modais: um VOLTAR/Escape fecha só o do topo.
 *
 * Antes, cada ModalOverlay ouvia Escape no documento: com dois modais
 * empilhados (ex.: detalhe + confirmação), um toque no VOLTAR do Android
 * fechava os dois. Agora só o último aberto reage.
 */
import { recordTechEvent } from "./techEvents";

const stack: number[] = [];
let seq = 0;

export function pushModal(kind = "modal"): number {
  seq += 1;
  stack.push(seq);
  recordTechEvent("modal_open", { kind, depth: stack.length });
  return seq;
}

export function popModal(id: number, kind = "modal"): void {
  const index = stack.lastIndexOf(id);
  if (index < 0) return;
  stack.splice(index, 1);
  recordTechEvent("modal_close", { kind, depth: stack.length });
}

/** Só o modal do topo trata Escape/VOLTAR. */
export function isTopModal(id: number): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}

export function modalDepth(): number {
  return stack.length;
}

export function resetModalStackForTests(): void {
  stack.length = 0;
  seq = 0;
}
