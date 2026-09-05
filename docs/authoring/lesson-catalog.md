# Publicar uma aula sem reconstruir o app

A partir da V4.9.2B, adicionar uma aula ao Longyu é subir um arquivo, não
fazer um deploy. O app busca `public/lessons/catalog.v1.json` em runtime;
o que estiver lá aparece para o aluno na próxima vez que ele abrir o app.

Este documento é para quem escreve aula, não para quem escreve código.

## O caminho curto

1. Suba o vídeo em um host **https**.
2. Acrescente um asset e uma cápsula ao `catalog.v1.json`.
3. Rode `npm run validate:lesson-catalog`.
4. Publique o JSON.

Não há passo 5. Nenhum build, nenhuma release.

## O arquivo

```json
{
  "version": 1,
  "assets": [
    {
      "id": "media:tons-na-pratica:pt:v1",
      "version": 1,
      "kind": "VIDEO",
      "delivery": "DIRECT_MP4",
      "url": "https://cdn.exemplo.com/tons-na-pratica-pt.mp4",
      "durationSeconds": 240,
      "spokenLocale": "pt-BR",
      "captions": [
        { "startSeconds": 0, "endSeconds": 6, "text": "Os quatro tons mudam o significado." }
      ],
      "transcript": "Texto corrido da aula, para quem lê melhor do que escuta.",
      "fallback": "INTERACTIVE_SEGMENTS"
    }
  ],
  "capsules": [
    {
      "id": "capsule:tons-na-pratica:v1",
      "topicId": "p1-o-que-e-tom",
      "afterTopicId": "p1-o-que-e-tom",
      "mediaType": "VIDEO_CAPSULE",
      "durationSeconds": 240,
      "completionRule": "MEDIA_ENDED",
      "knowledgeTargets": ["concept:tone-1", "concept:tone-3"],
      "localized": {
        "pt-BR": {
          "title": "Tons na prática",
          "objective": "Ouvir a diferença entre o 1º e o 3º tom em fala real.",
          "mediaAssetId": "media:tons-na-pratica:pt:v1",
          "transcript": "…",
          "segments": [
            { "id": "orient", "kind": "ORIENT", "title": "O que você vai ouvir", "body": "…" },
            { "id": "check", "kind": "CHECK", "title": "Recapitulando", "body": "…" }
          ]
        },
        "en": { "…": "mesma estrutura, em inglês" }
      }
    }
  ]
}
```

## As regras que o validador aplica

Elas existem por um motivo cada; nenhuma é burocracia.

**Os dois idiomas, sempre.** `pt-BR` e `en` são obrigatórios. Publicar só em
português deixaria o aluno de inglês com uma cápsula em branco no meio da
Jornada — pior do que não ter a aula.

**A voz precisa bater com o curso.** Se um asset declara `spokenLocale:
"pt-BR"`, só o conteúdo `pt-BR` pode apontar para ele. Material sem fala usa
`languageNeutral: true` e serve os dois. Um aluno que ouve uma língua que não
escolheu não tem como saber que houve engano.

**Segmentos são obrigatórios, mesmo em aula de vídeo.** Eles são o caminho de
quando o vídeo não carrega. Uma cápsula sem segmentos vira beco sem saída no
primeiro problema de rede.

**Só `https`.** `javascript:`, `data:`, `file:`, `http:` e `//host/arquivo`
são recusados. A URL vai direto para um `src`; sem essa regra, cadastrar uma
aula seria o bastante para injetar script na aplicação.

**Texto é texto.** Título, corpo, transcrição e legenda nunca são
interpretados como HTML. Escrever `<b>` mostra `<b>` na tela.

## O que uma aula publicada NÃO pode fazer

Este é o limite que torna a publicação segura sem code review:

- **Não define pré-requisito.** Ela só diz `afterTopicId` — depois de qual
  tópico aparecer. Não tranca ninguém fora de nada.
- **Não dá mastery, XP, Qi nem mexe no SRS.** Assistir ensina; quem mede
  aprendizagem são os exercícios.
- **Não sobrescreve aula embutida.** Se o id colidir com uma cápsula do
  repositório, a embutida vence.

Uma aula que precise de qualquer uma dessas coisas é uma mudança de produto,
e passa por código.

## Quando algo dá errado

O app é feito para que um catálogo ruim não seja um incidente:

| Situação | O que o aluno vê |
| --- | --- |
| Arquivo fora do ar (404) | As aulas embutidas, como antes |
| JSON corrompido | As aulas embutidas, como antes |
| `version` diferente de 1 | As aulas embutidas, como antes |
| Uma aula inválida entre várias | As outras aulas; a inválida some |
| Aluno offline | O último catálogo válido, do cache |
| Vídeo fora do ar | Aviso, com "recarregar" e "versão interativa" |

Rode `npm run validate:lesson-catalog` antes de publicar: é o mesmo código
que roda no navegador do aluno, então o que passa nele não é recusado depois.

## Regenerar o fixture de teste

`e2e/fixtures/lesson-media-probe.webm` são 12 segundos de cor sólida usados
pelos testes do player — não é conteúdo, e não vira aula. Para regerar:

```
node scripts/make-lesson-media-fixture.mjs
```
