# WebKit CI notes (V4.7.4-rc.1)

WebKit **não** é portão de merge. O passo `E2E WebKit (Safari) + mobile Safari` permanece `continue-on-error`.

## HEAD `de3cfbf` (PR #201, CI run 33095653087)

| Passo | Resultado |
| --- | --- |
| Portão de qualidade (`validate:beta` + build) | SUCCESS |
| Testes E2E Chromium | SUCCESS |
| Security (audit, CodeQL, gitleaks) | SUCCESS |
| E2E WebKit + mobile Safari | SUCCESS |
| E2E Firefox | FAILURE — `historical-bug-sentinels` `listen_select` não encontrou `[data-option-index]` (passo “Ouça e imite” / 你好). Determinístico, não flake. |

Conclusão: neste SHA **não houve falha determinística de WebKit**. A falha obrigatória era Firefox. Esta remessa corrige a espera das opções (`advanceToChoiceOptions`) em vez de enfraquecer o assert.

## Política

- Falha WebKit **reproduzível no produto** (player freeze, CTA invisível, leak) → tratar como bug, não como flake.
- Timeout de overlay / `topic-pass-return` longo → permanece informativo; documentado; não esconde Firefox.
- Automação **não** marca PASS físico. Safari iPhone real é V4.7.7.
