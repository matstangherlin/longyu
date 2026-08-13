# Guia de Assets Visuais (Longyu)

Identidade visual dos exercícios com imagem. O objetivo é que **toda pergunta
com imagens pareça de um mesmo produto**: estilo coerente, significado claro e
boa leitura no celular. Este guia é a fonte de verdade; `validate:visual-consistency`
faz cumprir as regras automaticamente.

Fonte dos metadados: `src/data/visualVocabulary.ts`. Arquivos: `src/assets/visuals/`
(SVG/WebP local, nunca URL externa).

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

61 assets **SVG/WebP 600×600** na mesma linguagem visual: ilustração editorial
semirrealista, formas orgânicas, contorno mínimo, sombreado discreto e paleta
mutada (vermelho tijolo, azul-marinho, teal, creme e mint). Uma única família de
estilo declarada: **flat_illustration**.

---

## 4. Direção e prioridade de substituição

**Estilo-casa: ilustração editorial semirrealista na família `flat_illustration`.**
SVG continua preferido quando o desenho é vetorial de origem; ilustrações geradas
podem usar WebP 600×600 transparente. Evitar traço infantil, contorno grosso,
clip-art, chibi, aparência de figurinha, 3D e foto.

Rever acabamento (proporção/expressão) se um asset ficar pouco legível em
~80 px no mobile — a lista viva fica em `reports/visual-consistency-report.md`.

---

## 5. Especificação técnica

- Formato **SVG ou WebP transparente**, **600×600** (quadrado exato), **≤ 200 KB**.
- SVG: `viewBox="0 0 600 600"` (e `width`/`height` 600), formas planas, paleta
  suave alinhada (fundo pale mint `#EEF3EE`, solo `#D5E4D7`, accent `#B9412E`,
  verdes/azuis/terrosos mutados). Sem texto embutido.
- `imageSrc` **local** relativo a `src/assets/visuals/` — **nunca** `http(s)`.
- `imageAltPt` **obrigatório**, descritivo, em português, sem hànzì.
- `backgroundStyle: transparent` exige canal alfa; `neutral`/`contextual` são
  opacos.
- Sem texto embutido na imagem.
- Assets aceitos: SVG, PNG ou WebP; SVG é o padrão. Arquivos sem entrada no
  catálogo e entradas sem arquivo falham em `validate:visual-assets`.

### Relações e conceitos potencialmente ambíguos

- mãe/pai: adulto acompanhado de bebê/criança;
- filho/filha: uma criança sozinha;
- irmão/irmã: duas idades diferentes em gesto familiar;
- amigo/amiga: pessoas da mesma faixa etária em gesto social;
- namorado/namorada: casal, com o alvo em primeiro plano.

Essas pistas melhoram a leitura, mas não tornam parentesco e relacionamento uma
propriedade visível absoluta. Por isso `imageOnlySafe: false` bloqueia esses
conceitos em **áudio/hànzì → grade só de imagens**; eles continuam disponíveis em
**imagem → hànzì/pinyin/significado**, onde existe apoio linguístico. O campo
`ambiguousWith` também impede pares confundíveis como distractores diretos.

---

## 6. Renderer (`StepImageChoice` / `VisualConceptImage`)

- Quadro de **altura fixa** por tamanho → **sem layout shift**.
- **Skeleton** (`animate-pulse`) enquanto carrega.
- `object-fit` escolhido pelo `backgroundStyle` (contain para neutro, cover para
  contextual) → **sem corte do sujeito** em fundos neutros.
- **Fallback** para ícone/emoji quando a imagem falha (`onError`).
- **Diagnóstico genérico de falha** em `sessionStorage`, sem ID do conceito e sem
  PII, para acompanhar o feedback técnico do beta.

---

_Validação: `npm run validate:visual-consistency` (gera
`reports/visual-consistency-report.md`) e `npm run validate:image-exercises`._


## Tema claro/escuro (VIS-006 / VIS-007)

- Ilustrações flat usam **SVG com fundo transparente** (sem retângulo mint `#EDF2ED` full-bleed).
- O quadro HTML (`bg-surface-2`) acompanha o tema; PNG/WebP rasterizados também devem ter alpha.
- `src/assets/visuals/index.ts` exporta **URLs Vite** (arquivos hasheados), não `data:` URIs inline.
- `backgroundStyle: "transparent"` no catálogo para assets sem fundo opaco.
