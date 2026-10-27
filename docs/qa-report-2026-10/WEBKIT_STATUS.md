# WebKit — SHA da pilha de QA (LGY-047)

Data: 26/10/2026 (horário de Brasília). SHA executado: `f6e3d7e32428f9dbd5d28103ed0154be61ad4cd6` (topo do prompt 17, antes deste doc). WebKit 26.5 (Playwright `webkit-2311`), Linux headless. Não é iPhone.

O projeto `mobile-safari` só inclui `e2e/mobile-device.spec.ts`. Os specs `qa-*` rodam no Chromium e, alguns, no `mobile-chrome`. Não foram marcados como `skip`.

## Comandos

```bash
npm run test:e2e:webkit
npx playwright test --project=mobile-safari
npx playwright test e2e/mobile-device.spec.ts --project=mobile-safari --grep "primeira lição avança|número seleciona|Enter aciona|áudio do hànzì" --repeat-each=3
```

## Resultado

| Comando | Resultado |
|---|---|
| `npm run test:e2e:webkit` (projeto `webkit`, 1220 testes) | Interrompido em 286 testes: 174 passaram, 101 falharam. Saída 143, processo encerrado depois que o padrão ficou claro |
| `--project=mobile-safari` | 5 passaram, 4 falharam, 1 pulado pelo próprio spec (rede lenta). 11,1 s |
| Repetição ×3 dos 4 que falharam | 12/12 falharam de novo |

Não é flake. As quatro falhas do `mobile-safari` repetiram `Page crashed` ou `browser has been closed` ao tocar “Entendi”, ao avançar o guia e ao tocar uma peça do Hànzì.

No projeto `webkit`, o mesmo padrão domina: timeout, navegador fechado e `Target crashed`. Houve também asserção real em `beta-smoke` (`advancePastDiscoverySteps` devolveu 0 na primeira lição). Não dá para tratar as 101 falhas como 101 bugs de produto: o processo do WebKit cai no meio do toque.

## O que isso não prova

Não prova o Safari do iPhone nem a PWA instalada. O roteiro físico continua em branco. LGY-047 permanece aberto até um Safari real, ou até esta suíte passar sem crash neste SHA.

Firefox não rodou nesta rodada.
