# Como os hànzì são construídos? — requisitos de mídia

- **capsuleId**: `capsule:foundation:hanzi-components:v1`
- **duração alvo**: ~2 min

## Arquivos a produzir

| arquivo | idioma falado | status |
| --- | --- | --- |
| `foundation-hanzi-components-pt-v1.mp4` | pt-BR | **NONE** |
| `foundation-hanzi-components-en-v1.mp4` | en | **NONE** |

`NONE` não é pendência esquecida: é a Parte K1. Enquanto não existir o
arquivo gravado, nenhuma URL é cadastrada e a aula animada permanece a
versão oficial — que já ensina o conteúdo inteiro.

## Requisitos técnicos

- Entrega `https` same-origin ou CDN https. `http:`, `data:` e
  protocol-relative são recusados pelo catálogo, não por convenção.
- Um arquivo por idioma falado. Material sem voz pode declarar
  `languageNeutral` e servir os dois cursos.
- Áudio em mandarim gravado por falante nativo nos trechos marcados no roteiro.
- Legendas: partir de `captions-*.vtt` e ajustar ao áudio real. Os tempos
  do rascunho são estimados por tamanho de texto, não medidos.

## Como publicar quando o arquivo existir

1. Subir os dois MP4 num host https.
2. Em `public/lessons/catalog.v1.json`, acrescentar os dois assets e um
   `presentationOverrides` apontando para esta `capsuleId`.
3. `npm run validate:lesson-catalog`.
4. Publicar o JSON.

A cápsula não muda de id, de tópico, de alvos nem de regra de conclusão —
o override só troca qual mídia toca. Ver `docs/authoring/lesson-catalog.md`.
