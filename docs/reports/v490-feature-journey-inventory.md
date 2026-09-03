# V4.9.0 — Feature → Journey inventory

Auditoria de `src/features`. A classificação descreve o papel pedagógico e não autoriza mover ou duplicar engines nesta remessa.

| Feature | Classe | O que ensina / serve | Momento recomendado | Dentro da Journey | Standalone | Redundância / decisão |
| --- | --- | --- | --- | --- | --- | --- |
| `journey` | CORE_JOURNEY | Sequência, contexto e progresso | Sempre | Orquestrador | Não | Fonte da ordem, não engine de exercício |
| `lesson` | CORE_JOURNEY | Aquisição M1–M4, produção e transferência | Tema atual | Sim | Via detalhe | Canônico; não duplicar |
| `revisao` | CORE_JOURNEY | Recuperação espaçada e mistakes | Após conteúdo devido | Node futuro | Sim | Mesmo SRS nos dois acessos |
| `pinyin` | JOURNEY_BOOSTER | Relação som–pinyin e treino fonético | Após cápsula/fundação | Recomendado | Sim | Reutilizar Pinyin Lab |
| `som` | JOURNEY_BOOSTER | Discriminação auditiva e tons | Após exposição do alvo | Recomendado | Sim | Compartilha domínio de som |
| `hanzi` | JOURNEY_BOOSTER | Forma, componentes e montagem | Após apresentação visual | Recomendado | Sim | Reutilizar Hanzi Builder/Atlas |
| `fala` | JOURNEY_BOOSTER | Produção oral e recuperação | Após reconhecimento/recall | Recomendado | Sim | Não criar “Journey Fala” separado |
| `arcade` | JOURNEY_BOOSTER | Velocidade de recuperação (Blitz) | Depois de um bloco aprendido | Piloto recomendado | Sim | Mesmo engine; nunca aquisição |
| `immersion` | JOURNEY_BOOSTER | Escuta/leitura em contexto mais denso | Após base lexical suficiente | Opcional | Sim | Não deve introduzir targets |
| `treino` | STANDALONE_USEFUL | Hub de prática por necessidade | Quando o aluno escolhe reforço | Links/nodes | Sim | Agrega engines existentes |
| `biblioteca` | STANDALONE_USEFUL | Consulta e releitura | Após desbloqueio | Link contextual futuro | Sim | Não gera currículo paralelo |
| `leitura` | JOURNEY_BOOSTER | Leitura guiada de corpus conhecido | Depois da aquisição lexical | Recomendado futuro | Sim | Corpus canônico |
| `challenge` | CORE_JOURNEY | Checkpoint/skip com conteúdo conhecido | Fim/avanço de módulo | Sim | Não | Não introduzir conteúdo |
| `missoes` | STANDALONE_USEFUL | Motivação e retomada | Transversal | Referência visual | Sim | Não é pedagogia canônica |
| `conquistas` | STANDALONE_USEFUL | Feedback de progresso | Transversal | Referência visual | Sim | Não bloqueia aprendizagem |
| `ligas` | POST_LAUNCH | Competição social | Após retenção básica | Não | Sim | Fora da espinha pedagógica |
| `amigos` | POST_LAUNCH | Social | Pós-lançamento/opt-in | Não | Sim | Sem papel de aquisição |
| `referral` | ADMIN/COMMERCIAL | Convites | Comercial | Não | Sim | Fora da pedagogia |
| `loja` | ADMIN/COMMERCIAL | Economia/cosméticos | Opcional | Não | Sim | Não condicionar mastery |
| `pro` | ADMIN/COMMERCIAL | Planos/entitlements | Paywall | Não | Sim | Produto, não currículo |
| `business` | ADMIN/COMMERCIAL | Oferta B2B | Público | Não | Sim | Fora da Journey |
| `marketing` | ADMIN/COMMERCIAL | Aquisição pública | Antes do produto | Não | Sim | Fora do estado pedagógico |
| `landing` | ADMIN/COMMERCIAL | Entrada pública | Antes do produto | Não | Sim | Fora do estado pedagógico |
| `auth` | ADMIN/COMMERCIAL | Identidade e acesso | Entrada/retomada | Não | Sim | Não altera progresso didático |
| `onboarding` | CORE_JOURNEY | Orientação e placement | Antes da Journey | Precede | Não | Placement recomenda, servidor autoriza |
| `account` / `conta` / `perfil` / `settings` / `dados` | STANDALONE_USEFUL | Conta, preferências e dados | Transversal | Não | Sim | Locale não entra em SRS/mastery |
| `privacy` / `about` / `more` / `system` | STANDALONE_USEFUL | Legal, ajuda e estados do app | Quando necessário | Não | Sim | Sem conteúdo curricular |
| `qa` / `dev` / `admin` | ADMIN/COMMERCIAL | QA e operação interna | Não acessível em produção comum | Não | Não | INTERNAL_ONLY; não contam como Journey |

## Decisões desta remessa

- `LessonCapsule` é um novo tipo de nó/contrato, não um segundo LessonPlayer.
- Mandarin Blitz passa a aceitar limites de tempo e questões, mas continua usando `blitzEngine.ts` e o mesmo SRS.
- Tone Trainer, Pinyin Lab, Hanzi Builder, Review e Immersion permanecem engines únicos; integração futura será por referência de `JourneyNode`.
- Ligas, Shop, missões e conquistas não são usadas para esconder lacunas de ensino nem bloquear mastery core.
- Nenhuma feature foi movida ou removida automaticamente por esta auditoria.
