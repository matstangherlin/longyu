# Guia de Assets Visuais (Longyu)

Identidade visual dos exercícios com imagem. O objetivo é que **toda pergunta
com imagens pareça de um mesmo produto**: estilo coerente, significado claro e
boa leitura no celular. Este guia é a fonte de verdade; `validate:visual-consistency`
faz cumprir as regras automaticamente.

Fonte dos metadados: `src/data/visualVocabulary.ts`. Arquivos: `src/assets/visuals/`
(SVG local, nunca URL externa).

---

## 1. Dois estilos oficiais

Os dois estilos descrevem a **composição** do asset, não a técnica de desenho.

### A) Conceito isolado (`VisualConcept`)

Para: pessoa, árvore, água, fogo, objetos, animais, comida, números.

Padrão:

- **objeto central único** (o conceito ocupa o centro do quadro);
- **fundo limpo** (neutro ou transparente);
- **sem texto** embutido;
- **sem elementos desnecessários** (nada que dispute a atenção);
- **proporção quadrada** (600×600);
- **boa identificação em tela pequena** (o sujeito legível a ~80 px).

`subjectCount` costuma ser 1 (números e pares como 大/小 são a exceção natural).

### B) Cena contextual (`VisualScene`)

Para: cumprimentar, beber, agradecer, comprar, estudar, conversar.

Padrão:

- **ação clara** (a interação é o foco);
- **no máximo três personagens** (`subjectCount ≤ 3`);
- **fundo simples** (contextual, mas sem poluição);
- **sem texto** embutido;
- **foco visual evidente** (a ação legível num relance).

> Hoje as intenções comunicativas (cumprimentar, agradecer, comprar…) são
> atendidas pelo sistema de `conversation_scene`, que **não usa imagens**. O
> modelo `VisualScene` já existe em `visualVocabulary.ts` para quando houver
> assets de cena — e o validador já cobra `subjectCount ≤ 3` neles.

---

## 2. Metadados de consistência

Cada asset declara três metadados (auditados contra o arquivo real):

| Campo | Valores | Uso |
|-------|---------|-----|
| `visualStyle` | `photo` · `realistic_illustration` · `flat_illustration` | técnica de renderização |
| `backgroundStyle` | `neutral` · `contextual` · `transparent` | controla o `object-fit` no renderer |
| `subjectCount` | número | quantos sujeitos/personagens há no asset |

### Regra de ouro: não misturar estilos na mesma pergunta

As quatro opções de uma pergunta **compartilham a mesma família de estilo**.
Famílias:

- **realistic** = `photo` + `realistic_illustration`;
- **flat** = `flat_illustration`.

❌ Errado (mistura famílias): fotografia de árvore + emoji de pessoa +
ilustração de água + desenho infantil de fogo.

✅ Certo: as quatro opções compartilham a mesma família (todas fotográficas, ou
todas chapadas).

Isso é garantido em tempo de seleção por `defaultVisualDistractors`, que só
escolhe distractores da família do alvo, e verificado por
`validate:visual-consistency`.

### `backgroundStyle` → renderer

- `neutral` / `transparent` → **`object-contain`**: mostra o sujeito inteiro,
  **sem corte**.
- `contextual` → **`object-cover`**: preenche o quadro (recortar o cenário é ok).

---

## 3. Estado atual do catálogo (auditoria)

37 assets, todos **SVG flat 600×600** na mesma linguagem visual (fundo pale mint,
formas geométricas, paleta mutada + accent `#B9412E`). Uma única família de
estilo: **flat_illustration**.

---

## 4. Direção e prioridade de substituição

**Estilo-casa: `flat_illustration` em SVG.** O catálogo inteiro já está unificado
nessa família. Novos conceitos devem nascer como SVG 600×600 na paleta do guia
(gerar/atualizar com `scripts/generate-flat-svgs.py` quando fizer sentido).

Rever acabamento (proporção/expressão) se um asset ficar pouco legível em
~80 px no mobile — a lista viva fica em `reports/visual-consistency-report.md`.

---

## 5. Especificação técnica

- Formato **SVG** (padrão do catálogo), **600×600** (quadrado exato), **≤ 200 KB**.
- SVG: `viewBox="0 0 600 600"` (e `width`/`height` 600), formas planas, paleta
  suave alinhada (fundo pale mint `#EEF3EE`, solo `#D5E4D7`, accent `#B9412E`,
  verdes/azuis/terrosos mutados). Sem texto embutido.
- `imageSrc` **local** relativo a `src/assets/visuals/` — **nunca** `http(s)`.
- `imageAltPt` **obrigatório**, descritivo, em português, sem hànzì.
- `backgroundStyle: transparent` exige canal alfa; `neutral`/`contextual` são
  opacos.
- Sem texto embutido na imagem.

---

## 6. Renderer (`StepImageChoice` / `VisualConceptImage`)

- Quadro de **altura fixa** por tamanho → **sem layout shift**.
- **Skeleton** (`animate-pulse`) enquanto carrega.
- `object-fit` escolhido pelo `backgroundStyle` (contain para neutro, cover para
  contextual) → **sem corte do sujeito** em fundos neutros.
- **Fallback** para ícone/emoji quando a imagem falha (`onError`).

---

_Validação: `npm run validate:visual-consistency` (gera
`reports/visual-consistency-report.md`) e `npm run validate:image-exercises`._
