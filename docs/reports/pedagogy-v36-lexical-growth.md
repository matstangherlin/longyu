# Pedagogia V3.6 — Lexical Growth + Atlas Activation

## Objetivo

A V3.5 aumentou variedade de StepKind. A V3.6 aumenta **variedade da língua**: ativar CHUNKS/Atlas já existentes na progressão curricular das primeiras ~30 lições.

## Entregas

| Item | Status |
| --- | --- |
| `src/data/atlasCurriculum.ts` — bridge LEXICAL_LIFECYCLE + packets + growth helpers | done |
| Inventário `docs/reports/atlas-curriculum-utilization.md` | done |
| Curva `docs/reports/lexical-growth-curve.md` | done |
| Before/after `docs/reports/lexical-growth-before-after.md` | done |
| Early plans: cumprimentos, cortesia, apresentação, survival, perguntas | done |
| Conversation scoring prefere refs de expansão (LEX-019/020) | done |
| Intent report lê `sceneIntent` (LEX-021) | done |
| Validators wired into `validate:beta` | done |

## Conteúdo ativado cedo (amostra)

- Cumprimentos: 早上好 / 晚上好 / 晚安 / 明天见 / 今天很好
- Cortesia: 没关系 / 请坐 / 请进 / 对不起
- Apresentação: 你叫什么？ / 我是巴西人 / 我是学生 / 认识你很高兴 / 我有三个朋友
- Survival: 我听不懂 / 请再说一遍 / 等一下 / 你会说英语吗？
- Perguntas: 怎么样？ / 这是什么？

## Validators

```bash
npm run validate:atlas-utilization
npm run validate:lexical-growth
npm run validate:seed-decay
npm run validate:conversation-lexical-growth
```

## Aceite residual

- Auditoria manual sequencial das primeiras 20–30 lições (“Estou aprendendo coisas novas?”)
- Continuar espalhando compras/tempo/cidade em remessas seguintes sem despejar o Atlas
