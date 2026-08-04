export type MarketingPageContent = {
  path: string;
  heading: string;
  lead: string;
  sections: { heading: string; body: string[] }[];
};

/** Conteúdo útil (não keyword stuffing) para páginas públicas de SEO. */
export const MARKETING_PAGES: MarketingPageContent[] = [
  {
    path: "/aprender-mandarim",
    heading: "Aprender mandarim online",
    lead: "Mandarim não precisa começar com milhares de caracteres. No Longyu você parte do som, treina tons e frases curtas, e só depois aprofunda a escrita.",
    sections: [
      {
        heading: "Por onde começar",
        body: [
          "Comece ouvindo e repetindo sílabas com tom. Em português do Brasil, o tom quase não muda o significado da palavra — em mandarim, muda. Por isso a primeira prioridade é a orelha, não a lista de vocabulário.",
          "Depois entram blocos úteis (cumprimentos, pedidos, números) em frases que você realmente usaria. O objetivo é reconhecer e produzir, não só traduzir de um lado para o outro.",
        ],
      },
      {
        heading: "O que o Longyu cobre",
        body: [
          "Lições curtas na jornada, laboratório de pinyin, treino de tons, montagem de hànzì, conversas com escolhas e revisão espaçada do que você errou.",
          "É um caminho diário: poucos minutos bem feitos valem mais do que uma sessão longa sem retorno ao conteúdo.",
        ],
      },
    ],
  },
  {
    path: "/curso-de-mandarim-online",
    heading: "Curso de mandarim online",
    lead: "Pense no Longyu como um curso guiado em português: unidades, checkpoints e prática mista — sem depender de aulas ao vivo para avançar.",
    sections: [
      {
        heading: "Estrutura da trilha",
        body: [
          "A jornada organiza o conteúdo em fases. Você pratica escuta, fala, leitura e recuperação de erros antes de avançar de módulo.",
          "Conversas com ramificações cobram decisões reais: escolher a resposta certa no contexto, não só marcar a tradução isolada.",
        ],
      },
      {
        heading: "Para quem é",
        body: [
          "Para iniciantes e reiniciantes que querem estudar sozinhos, no celular ou no computador, com progresso salvo quando houver conta na nuvem.",
          "Não substitui imersão total na China, mas dá a base de som, frases e caracteres para você não travar no primeiro contato.",
        ],
      },
    ],
  },
  {
    path: "/tons-do-mandarim",
    heading: "Tons do mandarim",
    lead: "Há quatro tons principais e um tom neutro. A mesma sílaba com tom diferente pode significar coisas completamente distintas — por isso treinamos discriminação antes da decoração.",
    sections: [
      {
        heading: "Os quatro tons (visão rápida)",
        body: [
          "1º tom: alto e estável. 2º tom: sobe. 3º tom: desce e sobe (em fala rápida muitas vezes fica mais baixo). 4º tom: desce com firmeza. O tom neutro é curto e leve.",
          "No início, foque em ouvir pares mínimos (mesma sílaba, tons diferentes) e em imitar o contorno. Gravação e feedback visual ajudam, mas a orelha vem primeiro.",
        ],
      },
      {
        heading: "Como o Longyu treina",
        body: [
          "Exercícios curtos de identificação e produção entram cedo na trilha. Erros voltam na revisão espaçada, para o tom difícil não desaparecer depois de uma lição só.",
        ],
      },
    ],
  },
  {
    path: "/aprender-pinyin",
    heading: "Aprender pinyin",
    lead: "Pinyin é a ponte entre o que você ouve e o que lê em letras latinas. Domine sílabas e tons aqui; os caracteres entram com mais segurança depois.",
    sections: [
      {
        heading: "Por que pinyin importa",
        body: [
          "Sem pinyin confiável, é fácil “adivinhar” a pronúncia errada e cristalizar o erro. Com pinyin + tom, você consulta dicionários, teclados e materiais com autonomia.",
          "Atenção especial a iniciais e finais que o português não tem (por exemplo, distinções como zh/ch/sh e j/q/x).",
        ],
      },
      {
        heading: "No app",
        body: [
          "O laboratório de pinyin e as lições iniciais ligam leitura, escuta e fala. Você não fica preso a tabelas estáticas: pratica no fluxo das frases.",
        ],
      },
    ],
  },
  {
    path: "/aprender-hanzi",
    heading: "Aprender hànzì",
    lead: "Caracteres chineses parecem caóticos até você notar componentes repetidos. O Longyu ensina forma e sentido em camadas, com montagem guiada.",
    sections: [
      {
        heading: "Camadas, não cópia cega",
        body: [
          "Em vez de só traçar o ideograma dezenas de vezes, você reconhece partes, associa sentido e conecta ao som quando houver pista fonética.",
          "Isso reduz a sensação de “desenho aleatório” e acelera a leitura de palavras novas compostas por caracteres já vistos.",
        ],
      },
      {
        heading: "Leitura gradual",
        body: [
          "A leitura entra quando há base de som e vocabulário. Assim o hànzì reforça o que você já entende de ouvido, em vez de ser a primeira e única porta de entrada.",
        ],
      },
    ],
  },
  {
    path: "/mandarim-para-brasileiros",
    heading: "Mandarim para brasileiros",
    lead: "Explicações em PT-BR, exemplos do cotidiano e atenção aos sons que o português não prepara. Você não precisa passar por inglês para aprender.",
    sections: [
      {
        heading: "O que muda para quem fala português",
        body: [
          "Tons, sílabas fechadas e algumas consoantes exigem treino explícito. Também mudam a ordem e as partículas da frase — traduzir palavra a palavra quase sempre falha.",
          "O Longyu usa português do Brasil na interface e na pedagogia, para a carga cognitiva ficar no chinês, não no metajargão em outra língua.",
        ],
      },
      {
        heading: "Rotina realista",
        body: [
          "Lições curtas cabem no deslocamento ou no intervalo. A revisão traz de volta o que você esqueceu, para o estudo sobreviver à semana corrida.",
        ],
      },
    ],
  },
  {
    path: "/como-funciona",
    heading: "Como funciona",
    lead: "Abra a jornada, faça a próxima lição, pratique o que errou e volte amanhã. O app combina trilha guiada com treinos livres.",
    sections: [
      {
        heading: "Fluxo do dia a dia",
        body: [
          "1) Siga a jornada. 2) Complete a lição (escuta, escolha, montagem, conversa). 3) Olhe a revisão quando houver itens vencendo. 4) Use laboratórios (som, pinyin, hànzì) quando quiser reforçar um ponto.",
          "Conta na nuvem (quando ativa) mantém o progresso entre aparelhos. Sem conta, o progresso pode permanecer local no navegador.",
        ],
      },
      {
        heading: "Beta pública",
        body: [
          "Recursos e textos ainda evoluem. Seu feedback em bugs e confusões ajuda a priorizar o que importa antes do lançamento maduro.",
        ],
      },
    ],
  },
  {
    path: "/metodo-longyu",
    heading: "Método Longyu",
    lead: "Mandarim pela lógica: uma estrutura que combina som, blocos, contexto, conversação, produção, revisão e hànzì — não só flashcards.",
    sections: [
      {
        heading: "O que o método evita",
        body: [
          "Evita o ciclo “mostrar palavra → pedir tradução → repetir dezenas de vezes” sem retorno. Também evita ver um item uma única vez e nunca mais encontrá-lo.",
        ],
      },
      {
        heading: "O que o método combina",
        body: [
          "Som e tons; palavras em blocos; frases contextualizadas; conversas com ramificações; produção de respostas; revisão espaçada; recuperação de erros; leitura gradual; hànzì em camadas; retomada posterior do conteúdo.",
          "Os validadores do repositório checam profundidade e coerência das lições. A validação final — se alunos reais aprendem na velocidade esperada — vem da beta com métricas de conclusão, abandono e retenção.",
        ],
      },
    ],
  },
];

export function marketingContentForPath(path: string): MarketingPageContent | undefined {
  return MARKETING_PAGES.find((p) => p.path === path);
}
