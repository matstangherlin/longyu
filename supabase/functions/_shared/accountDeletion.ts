export const ACCOUNT_DELETION_CONFIRMATION_TEXT = "EXCLUIR CONTA" as const;

export interface AccountDeletionRequestBody {
  confirmationText: typeof ACCOUNT_DELETION_CONFIRMATION_TEXT;
}

export function accountDeletionRequestBody(
  confirmationText: string
): AccountDeletionRequestBody | null {
  if (confirmationText.trim() !== ACCOUNT_DELETION_CONFIRMATION_TEXT) return null;
  return { confirmationText: ACCOUNT_DELETION_CONFIRMATION_TEXT };
}
