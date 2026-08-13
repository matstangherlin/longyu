# Mobile / pedagogy status — revalidation notes

> Código pode estar corrigido; **aparelho físico e QA humano** fecham o bug.
> Não tratar emulação, E2E ou tip de `main` como validação física.

## Device / shell

| ID | Status em código | Revalidação humana |
|----|------------------|--------------------|
| **B001** / StickyActionBar × banco de peças | Corrigido em código (PR **#164**) | **Aguardando** Android/iPhone real |
| **MOB-010** app shell mobile | Corrigido em código (PR **#164**) | **Aguardando** revalidação humana |

## PERF / PED (este PR)

| Área | Status em código | Revalidação humana |
|------|------------------|--------------------|
| **PERF-011** lesson start marks + defer adaptive plan | Corrigido em código | **Aguardando** medição em device / perfil real |
| **PED-012–015** odd_one_out curated + levels + shuffle | Corrigido em código | **Aguardando** smoke pedagógico humano |
| **PED-016–020** lexical progression L1–L20 | Corrigido em código + `validate:lexical-progression` | **Aguardando** revisão curricular humana |

## Como checar localmente

```bash
npm run test:lesson-perf
npm run validate:lexical-progression
npm run report:lexical-progression
npm run test:odd-one-out-categories
npm run test:seeded-shuffle
npm run validate:perception-drills
```

Relatório lexical: [`lexical-progression-l1-l20.md`](./lexical-progression-l1-l20.md).
