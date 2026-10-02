# RC2.3.1 — Visual Performance

## Escopo

Visual First não pode regredir LessonPlayer / APK perceptivelmente.

## Estratégia

- Assets locais (SVG/WebP) já empacotados sob `src/assets/visuals`
- Sem URLs externas em runtime
- `applyVisualFirstToPlan` injeta no máximo **1** `image_choice` e **1** cena por sessão quando faltam — sem preload massivo do banco
- Resolução via `resolveCurriculumVisual` é O(n) no catálogo (~87) e filtragem por texto
- Lazy: o Vite já code-splita LessonPlayer; imagens continuam no mapa de assets existentes

## Antes / depois (estrutural)

| | RC2.3.0 | RC2.3.1 |
|---|---|---|
| Mapa visual | 9 conceitos piloto | catálogo completo via resolver |
| Cenas | 0 pedagógicas | 10 `PEDAGOGY_VISUAL_SCENES` |
| Inject por sessão | enrich pontual | ≤1 image_choice + ≤1 scene (+ enrich) |

## Mobile

Viewports alvo: 360×640 · 375×667 · 390×844  
Regras: CTA acessível · sem scroll horizontal · Hànzì não reduzido para caber imagem.

## Android / APK

Sem SDK local neste ambiente → `ANDROID_BUILD_PASS` / `APK_PASS` = NOT_RUN.  
Bundle size: sem novos assets binários grandes nesta onda (reusa banco existente).

## Declaração

Não há estudo de FPS humano aqui. Declaração válida: **a inclusão visual não adiciona preload do catálogo inteiro ao boot da sessão**.
