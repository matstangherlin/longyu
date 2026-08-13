export interface CloudPearlProRpcResult {
  ok: boolean;
  is_pro?: boolean;
  error?: string;
  retry_pending?: boolean;
  expires_at?: string | null;
}

export interface CloudPearlProConfirmation<T extends CloudPearlProRpcResult> {
  ok: boolean;
  pendingRetry: boolean;
  result?: T;
  error?: string;
}

/**
 * Fronteira testável do entitlement cloud: nenhum callback de concessão roda
 * antes de a RPC confirmar explicitamente `ok && is_pro`.
 */
export async function confirmCloudPearlProActivation<T extends CloudPearlProRpcResult>(
  request: () => Promise<T>,
  applyConfirmed: (result: T) => void
): Promise<CloudPearlProConfirmation<T>> {
  try {
    const result = await request();
    if (!result.ok || result.is_pro !== true) {
      return {
        ok: false,
        pendingRetry: result.retry_pending === true,
        result,
        error: result.error ?? "server_rejected",
      };
    }
    applyConfirmed(result);
    return { ok: true, pendingRetry: false, result };
  } catch (error) {
    return {
      ok: false,
      pendingRetry: true,
      error: error instanceof Error ? error.message : "rpc_failed",
    };
  }
}
