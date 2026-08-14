# Pedagogia V3.7 — Communicative Core + Vocabulary Network

## Objetivo de produto

A Jornada não ensina “palavras isoladas”; ensina **redes de palavras que permitem conversar**.

```text
CORPUS ~5.000 chars
  → ATLAS (chars + words + chunks + structures)
  → PACKETS + PRODUCTIVE/RECEPTIVE CORE
  → CAPABILITY MAP (READY só com Q/A + produção + conversa + transferência)
  → MULTI-INTENT CONVERSATION
  → CHINA SURVIVAL BENCHMARK
```

## Entregas COMM

| Item | Status |
| --- | --- |
| Capability map completo (31 capacidades) + readiness scores | done |
| PRODUCTIVE_CORE 150–250 + RECEPTIVE_CORE 300–500 | done (~226 / ~470) |
| Pattern library + combinabilidade | done (17 patterns) |
| Packets preenchidos (family/hotel/transport/restaurant/…) | done |
| Lifecycle ≥120 | done (~161) |
| Multi-intent restaurante (`pedir-cardapio`) | done |
| Hotel check-in phrases + transport metro/bus | done |
| First-50 audit + Journey 51–100 roadmap | done |
| LONGYU_MINIMAL_CHINA_CONVERSATION hard-fail | done |
| Atlas 5000 roadmap (sem dump na Jornada) | done |

## Relatórios

- `docs/reports/conversation-capability-map.md`
- `docs/reports/productive-core.md`
- `docs/reports/vocabulary-packet-coverage.md`
- `docs/reports/lexical-aging.md`
- `docs/reports/journey-51-100-lexical-roadmap.md`
- `docs/reports/china-survival-benchmark.md`
- `docs/reports/atlas-5000-roadmap.md`
- `docs/reports/first-50-acquisition-audit.md`

## Testes

```bash
npm run validate:conversation-capabilities
npm run validate:productive-core
npm run validate:vocabulary-packets
npm run validate:lexical-aging
npm run validate:china-survival
npm run validate:atlas-roadmap
npm run validate:first-50-audit
npm run validate:journey-51-100-roadmap
```

## O que esta remessa NÃO faz

- Não coloca 5.000 caracteres como cartões isolados
- Não recria Mastery / conversation engine / StepKinds / validators V3.6
- Não reescreve todas as lições 51–100 (só roadmap)

## Próximo (V3.8+)

Executar o roadmap 51–100 com mais cenas multi-intent 6–10 turnos e elevar capabilities PARTIAL → READY.
