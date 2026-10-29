import { OPS_CORS_EXTRA_HEADERS } from "./opsCorrelation.ts";

/** Headers de preflight comuns. A origem continua decidida por cada função. */
export const BASE_ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type";

/** Concatena os headers x-longyu-* exigidos pelo cliente (opsCorrelation). */
export function browserAllowedHeaders(extra?: string): string {
  const parts = [BASE_ALLOWED_HEADERS, OPS_CORS_EXTRA_HEADERS];
  const more = extra?.trim();
  if (more) parts.push(more);
  return parts.join(", ");
}
