# V4.9.2B — runtime de mídia da aula

Relatório da remessa. Os números foram medidos, não estimados; onde algo não
foi feito, está dito que não foi feito.

## O objetivo central

> "Depois desta remessa, adicionar uma nova aula animada ou gravada ao Longyu
> NÃO deve exigir nova reconstrução da aplicação."

**Cumprido.** O app busca `public/lessons/catalog.v1.json` em runtime.
Publicar uma aula é subir um JSON: sem build, sem release, sem programador.
O caminho está documentado em [`docs/authoring/lesson-catalog.md`](../authoring/lesson-catalog.md).

A prova é executável, não uma afirmação: os 16 cenários de
`e2e/v492b-lesson-media.spec.ts` rodam contra uma aula em vídeo que **não
existe em nenhum arquivo do repositório**. Ela chega pelo catálogo, do mesmo
jeito que chegaria em produção. Desligar a resolução em runtime derruba
quatro deles.

## Métricas

### Catálogo e publicação

| Métrica | Valor |
| --- | --- |
| `catalogFetchedAtRuntime` | sim |
| `rebuildRequiredToPublishLesson` | não |
| `shippedCatalogCapsules` | 0 (não há aula gravada — decisão de produto) |
| `builtInCapsules` | 1 (Pinyin, `ANIMATED_CAPSULE`) |
| `catalogRejectionCasesCovered` | 20 |
| `catalogSchemaMutationsVerified` | 5 |
| `allowedUrlProtocols` | 1 (`https:`) |
| `requiredLocalesPerCapsule` | 2 (`pt-BR`, `en`) |
| `parserThrowsOnHostileInput` | não (6 entradas hostis testadas) |
| `invalidItemDropsWholeCatalog` | não (item cai sozinho) |

### Player e cobertura

| Métrica | Valor |
| --- | --- |
| `mediaCompletionThreshold` | 0.90 |
| `seekToEndCompletesLesson` | não |
| `resumeMinimumSeconds` | 3 |
| `playbackSpeeds` | 0.75× – 1.5× |
| `fallbackModes` | 5 |
| `coreCapsuleCanDeadEnd` | não |
| `mediaRuntimeContractAssertions` | 49 |

### Telemetria (Parte W)

| Métrica | Valor |
| --- | --- |
| `mediaEventTypes` | 15 |
| `consentCheckedPerEmission` | sim |
| `piiFieldsCollected` | 0 |
| `telemetryCanBreakLesson` | não (emissão em `try/catch`) |

### Bundle (Parte X) — medido contra `main` em `6ac845a`

| Chunk | Antes | Depois | Delta |
| --- | --- | --- | --- |
| entrada (`index`) | 1 665 052 B | 1 665 048 B | **−4 B** (gzip +23 B) |
| `JourneyPage` | 35 593 B | 35 817 B | +224 B (gzip +95 B) |
| `LessonCapsulePage` | 8 933 B | 7 866 B | −1 067 B (gzip −429 B) |
| `VideoCapsulePlayer` | 8 593 B | 9 550 B | +957 B (gzip +220 B) |
| `useLessonCatalog` | — | 9 394 B | novo (gzip 3,5 KB) |
| **total JS** | 3 621 300 B | 3 630 804 B | **+9 504 B (+9,3 KB)** |

- `bundleDeltaKb`: **+9,3** (todo ele em chunks carregados sob demanda)
- `journeyInitialDeltaKb`: **+0,2**
- `entryBundleDeltaKb`: **0,0**

O runtime de vídeo continua atrás de uma fronteira `React.lazy`: quem estuda
pela cápsula animada não baixa os 9,3 KB do player. O cenário 15 do e2e
verifica isso observando as requisições reais, não a configuração.

### Gates

| Métrica | Valor |
| --- | --- |
| `gatesInValidateBeta` | 162 |
| `gatesAddedThisShipment` | 7 |
| `mutationsVerifiedBothDirections` | 18 |
| `e2eScenarios` | 16 |
| `skippedTests` | 0 |

Gates novos: `test:media-resume`, `test:media-completion`,
`test:media-fallback`, `test:capsule-locale-variants`,
`test:media-telemetry-privacy`, `validate:capsule-pedagogy-handoff`,
`validate:lesson-catalog`.

## Decisões que valem registro

**A regra de handoff pedagógico não é a óbvia.** A versão ingênua — "nenhum
exercício obrigatório antes da cápsula" — reprova dado correto: 你好 é cobrado
no tópico 0 e a cápsula de Pinyin só abre depois dele, mas o tópico 0 já
ensina 你好 inline. A cápsula reforça, não é a dívida. O que importa é
dependência, então a regra compara três posições: primeira cobrança, primeiro
ensino inline e abertura da cápsula.

Sobre o dado atual esse ramo nunca executa, porque `teach-before-test` já
garante ensino antes de toda cobrança. Regra que nunca roda é regra que
ninguém sabe se funciona, então o veredito virou função pura exercitada com
seis linhas do tempo sintéticas. Inverter a comparação derruba quatro delas.

**Conteúdo publicado nunca barra ninguém.** Uma cápsula do catálogo só declara
`afterTopicId`. Não define pré-requisito, não dá mastery, não sobrescreve aula
embutida. É isso que torna a publicação segura sem code review: um manifesto
malfeito no máximo põe um card a mais na tela.

**O e2e toca vídeo de verdade.** `scripts/make-lesson-media-fixture.mjs` gera
12 s de VP8/WebM (6,5 KB) com o ffmpeg que já vem no Playwright e o `sharp`
que já é dependência de build. Com `<video>` simulado, o teste provaria que o
mock funciona — `timeupdate`, seek e união de trechos assistidos só
significam algo com um arquivo sendo decodificado. O fixture é cor sólida:
nenhuma aula gravada foi inventada.

**Dois testes meus estavam errados e o produto certo.** Eu esperava que um
vídeo falho trocasse a aula por baixo do aluno. O player avisa e oferece
recarregar ou seguir na versão interativa. Escolher é melhor do que ser
trocado; os testes passaram a cobrir as duas saídas.

## O que NÃO foi feito

- **Nenhuma aula gravada foi produzida.** O catálogo publicado está vazio, por
  instrução explícita: a remessa entrega o terreno, não o conteúdo.
- **HLS continua declarado sem implementação.** Nenhuma biblioteca foi
  adicionada, porque não existe asset HLS real para justificá-la; um asset
  `HLS` cai no fallback em vez de fingir que toca.
- **Screenshots 01 e 03 ("antes") não são geráveis.** O defeito que elas
  documentariam já está corrigido no código; produzi-las exigiria reintroduzir
  o bug.
- **Firefox e WebKit não foram executados localmente** — só Chromium está
  instalado neste ambiente. Os cenários que dependem de decodificação
  verificam a capacidade do navegador e afirmam o caminho correto para ele
  (player onde decodifica, fallback onde não), sem pular nenhum teste.
