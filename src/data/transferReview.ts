/**
 * PED-V33 — export fino de Transfer Reviews para UI/relatórios.
 *
 * TRANSFER_REVIEWS já vive em masteryCoverage.ts (classificação de cobertura
 * do Mastery Loop); este arquivo apenas reexporta para que código de UI não
 * precise importar direto de masteryCoverage.ts (mantém o acoplamento
 * explícito e permite trocar a fonte sem alterar consumidores).
 */
export {
  TRANSFER_REVIEWS,
  TRANSFER_REVIEW_LEVEL_LABELS,
} from "./masteryCoverage";
export type {
  TransferReviewSpec,
  TransferReviewId,
  TransferReviewTask,
  TransferReviewLevel,
} from "./masteryCoverage";
