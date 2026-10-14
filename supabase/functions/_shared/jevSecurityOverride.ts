/**
 * JEV Wave 2 — deterministic security / data-integrity escalations.
 * These cannot be downgraded by Jev.
 */

import type { PCandidate } from "./jevSeverityMap.ts";

export interface SecurityOverride {
  hit: boolean;
  pCandidate: PCandidate;
  reason: string;
  needsHumanReview: true;
}

const RULES: { id: string; re: RegExp; p: PCandidate }[] = [
  { id: "cross_account", re: /\b(another user(?:'s)?|other (?:user|account|pessoa)|outro usu[aá]rio|conta de outra|data from another|vejo (?:o )?progresso de)\b/i, p: "P0" },
  { id: "lost_progress", re: /\b(progress (?:disappeared|lost|gone|vanished)|perdi (?:o )?progresso|progresso sumiu|save (?:lost|wiped)|dados apagad)/i, p: "P0" },
  { id: "unexpected_charge", re: /\b(charged (?:me )?(?:twice|again)|double.?charg|cobran[cç]a (?:duplicada|inesperada)|unexpected charge|charged without)\b/i, p: "P0" },
  { id: "token_exposure", re: /\b(access[_ ]?token|refresh[_ ]?token|jwt|api[_ ]?key|bearer |secret leaked|token exposed)\b/i, p: "P0" },
  { id: "account_takeover", re: /\b(account takeover|someone (?:logged|accessed) my|conta invadid|hackeou)\b/i, p: "P0" },
  { id: "cannot_delete", re: /\b(cannot delete (?:my )?account|n[aã]o (?:consigo|posso) (?:apagar|excluir|deletar) (?:a |minha )?conta)\b/i, p: "P1" },
];

export function detectSecurityOverride(message: string): SecurityOverride | null {
  const text = String(message ?? "");
  for (const rule of RULES) {
    if (rule.re.test(text)) {
      return { hit: true, pCandidate: rule.p, reason: rule.id, needsHumanReview: true };
    }
  }
  return null;
}

/**
 * Final P-candidate: security override wins; Jev cannot downgrade.
 */
export function mergePCandidate(
  mapped: PCandidate,
  override: SecurityOverride | null,
): { pCandidate: PCandidate; overrideReason: string | null; humanConfirmationRequired: boolean } {
  if (!override) {
    return {
      pCandidate: mapped,
      overrideReason: null,
      humanConfirmationRequired: mapped === "P0" || mapped === "P1",
    };
  }
  // Override always wins — Jev cannot downgrade a deterministic security hit.
  void mapped;
  return {
    pCandidate: override.pCandidate,
    overrideReason: override.reason,
    humanConfirmationRequired: true,
  };
}
