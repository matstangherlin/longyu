# V4.9.4 — Onboarding: uma escolha de idioma, uma ação por tela

Remessa de **subtração**. Nada foi redesenhado; três elementos saíram e nenhum
entrou no lugar deles.

## O que existia

A tela `/comecar` perguntava idioma duas vezes, com as mesmas duas opções:

- `LanguageSwitcher` no header (idioma da **interface**);
- `CourseLanguageSwitcher` dentro do Welcome, num cartão intitulado "Aprender
  mandarim a partir de", seguido da linha "Idioma estudado: 中文 · Mandarim".

Internamente os dois são coisas diferentes — `locale` e `instructionLocale` — e
a distinção é legítima: alguém pode querer a interface em inglês estudando a
partir do português. Só que no primeiro contato ela não tem como ser entendida.
Quem abre o Longyu para aprender mandarim não sabe que existem dois idiomas a
decidir, muito menos qual dos dois cada seletor está perguntando.

Somava-se a isso o wordmark "Longyu" no header com o wordmark "Longyu" no hero,
na mesma dobra.

## O que saiu

| Removido | Por quê |
|---|---|
| `CourseLanguageSwitcher` do Welcome (`data-testid="onboarding-course-language"`) | Segunda pergunta de idioma na mesma tela |
| A linha "Idioma estudado: 中文 · Mandarim" | Texto fixo com aparência de campo a decidir |
| O cartão/borda que os embrulhava | Sem conteúdo, sem motivo |
| `BrandWordmark` do header do onboarding | A marca já está no hero, maior |

Nenhum card entrou no lugar. O espaço que sobrou é o resultado da remessa, não
um buraco a preencher.

## O que mudou de comportamento

Um seletor só, no header, decidindo os dois valores:
`src/components/i18n/OnboardingLanguageSwitcher.tsx`.

**A parte não óbvia.** `setLocale` já propagava para o curso, através de
`followInterfaceLocale` — mas essa propagação **respeita um override manual
anterior**. Para quem já tinha fixado o idioma do curso à mão em algum momento
(inclusive pelo cartão que esta remessa removeu), escolher "English" no
onboarding deixaria a interface em inglês e o curso em português: as duas
metades da mesma escolha discordando. Por isso o valor de instrução é gravado
direto, com `userOverride: false`.

O `false` é deliberado: isto não é uma escolha *separada* de curso, é a mesma
escolha aplicada aos dois lugares. Marcar override aqui quebraria, para todo
mundo que passa pelo onboarding, o comportamento que Configurações oferece de o
curso acompanhar a interface enquanto ninguém pediu o contrário.

`LanguageSwitcher` e `CourseLanguageSwitcher` seguem intactos e Configurações
continua tratando os dois idiomas separadamente.

## Copy

| | Antes | Depois |
|---|---|---|
| PT título | "Primeiro o Longyu encontra seu ponto de partida." | "Vamos encontrar seu ponto de partida." |
| PT apoio | "Um teste curto, depois você cria a conta para salvar o resultado. Sem conta local." | "Um teste curto para adaptar sua jornada ao seu nível." |
| EN título | "First, Longyu finds the right place for you to start." | "Let's find your starting point." |
| EN apoio | "A short Placement, then you create an account to save the result. No local account." | "A short test to adapt your journey to your level." |

"Sem conta local" é informação técnica; a explicação sobre conta e progresso
salvo continua existindo perto da etapa de conta, onde é relevante.

## Cobertura

`e2e/v494-onboarding-simplification.spec.ts` — 13 cenários, todos passando no
Chromium, cobrindo os 10 pontos exigidos mais toque/acessibilidade.

### Mutação

| Mutação | Morta por |
|---|---|
| O cartão de idioma do curso volta ao Welcome | 1 · exatamente um seletor |
| O wordmark volta ao header | 10 · Longyu aparece uma vez só |
| O seletor volta a mexer só na interface | 13 · quem já tinha escolhido o curso antes |
| Tradução EN esquecida (fica igual à PT) | `test:i18n` — títulos precisam diferir |

**Um buraco encontrado e tapado.** A primeira versão da mutação "o seletor volta
a mexer só na interface" **não matou** os testes 3 e 4. O motivo é o descrito
acima: numa sessão nova não existe override, então `setLocale` sozinho já
propaga, e os dois testes passavam com a sincronização explícita removida — eles
não cobriam a razão de o componente existir. O cenário 13 foi escrito para
exatamente isso (semeia um override anterior) e mata a mutação.

## Notas honestas

- **`e2e/course-language-switch.spec.ts` › "never canonical progress/SRS
  identity" falha neste contêiner**, por timeout de navegação em `/ajustes` (não
  por asserção). Verifiquei em `main` limpa (`d20b86c`), com as minhas mudanças
  guardadas: **falha igual**. É anterior a esta remessa e passou no CI da #234,
  então é específico deste ambiente. Não foi tocado nem contornado.
- **`test:i18n` afirmava a copy EN antiga** e foi atualizado. A asserção não foi
  afrouxada: além do texto novo, passou a exigir que o título PT e o EN sejam
  strings diferentes — uma tradução esquecida antes passaria despercebida, e
  agora não passa.
- **`e2e/i18n-onboarding.spec.ts`** tinha uma asserção de ausência apontando para
  a frase PT antiga, que viraria vacuamente verdadeira. Foi repontada para a
  frase nova, mantendo o que ela mede (funil EN sem vazamento de português).
