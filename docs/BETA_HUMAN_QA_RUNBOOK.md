# Longyu — Runbook de QA humano (pós #148)

**Objetivo:** provar o produto em pessoas e aparelhos reais.  
**Regra:** **automação não substitui QA humano** — nada aqui é substituível por Playwright, emulação, fixture ou `test:qa-regression-guard`.

Atualizado: 2026-08-12 · tip `main` `3622885` (#148).  
Mapa ponderado: [`BETA_LAUNCH_REMAINING.md`](./BETA_LAUNCH_REMAINING.md).  
Log de bugs: [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md).

> **Nenhum checkbox humano abaixo foi marcado automaticamente.** Só a pessoa que executar o passo marca.

---

## Próximo fluxo (ordem obrigatória)

Execute **nesta ordem**. Não pule B001/B002 para ir direto a L1–L20.

| # | Passo | Onde registrar |
| ---: | --- | --- |
| 1 | **Force refresh / cache limpo** | §0 Preparo |
| 2 | **Revalidar B001** no Android real | §B001 + [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md) |
| 3 | **Revalidar B002** no app real | §B002 + [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md) |
| 4 | **L1–L20** com conta nova | §1 |
| 5 | **Android completo** | §2 |
| 6 | **iPhone / Safari** | §3 |
| 7 | **E-mail real** | §4 |
| 8 | **Stripe Test Mode** | §5 |
| 9 | **Sync PC ↔ celular** | §6 |
| 10 | **VoiceOver / TalkBack** | §7 |
| 11 | **5–15 testadores** | §8 |
| 12 | **Corrigir P0/P1** | [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md) |
| 13 | **Congelar RC** | §9 |
| 14 | **`gate:public-beta`** | §9 |
| 15 | **Full security scan** da SHA final | §9 |

**Estado do código (não confundir com QA feito):**

- Tip a testar: `3622885` (#148).  
- B001: **corrigido em código**, aguardando revalidação Android física.  
- B002: **corrigido em código**, aguardando revalidação humana.  
- Produção/transferência friendliness, PieceAssembly e guarda QA: **entregues em código**.  
- #146 (copy/mic/`test:player-ux`): ainda **pendente** na `main` (extrato na #149).  
- RC, full security scan final, L1–L20 humano, aparelhos, e-mail, Stripe, sync e testadores: **não concluídos**.

```bash
npm run beta:rc-status          # SHA, versão, próximos gates — só consulta
npm run gate:public-beta        # só na SHA congelada (passo 14)
```

---

## 0. Preparo — force refresh / cache limpo

Antes de qualquer revalidação:

- [ ] Abrir produção beta (ou preview estável) em **janela anônima**  
- [ ] **Force refresh** (Android Chrome: menu → atualizar; se preciso, limpar dados do site)  
- [ ] Confirmar tip / versão: landing ou Sobre = `v0.2.0-beta.1` · tip esperado `3622885`  
- [ ] Anotar: URL · navegador · SO · aparelho  
- [ ] Conta **nova** (e-mail real) **ou** perfil local zerado — para L1–L20  
- [ ] Telemetria: decidir optar-in (recomendado em conta de QA)  
- [ ] Feedback: saber onde está o botão / reportar no player  

**Não avance para B001 com cache antigo.**

---

## B001 — revalidar no Android real

Aparelho: ________ · Chrome: ________ · Tip confirmada: ☐ `3622885`

Abra uma lição no player (`/licao/*/player`). Registre falhas em [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md).

| Check | OK |
| --- | :---: |
| **Body não arrasta** — puxar a página não move o documento (só a região da atividade, se houver overflow) | ☐ |
| **CTA acessível** — Continuar / Verificar / Tentar de novo visível sem caça (após acerto e após erro) | ☐ |
| **Teclado aberto** — com IME/pinyin aberto, Verificar (ou CTA principal) continua alcançável | ☐ |
| **Teclado fechado** — ao fechar o teclado, layout e CTA voltam corretos | ☐ |
| **Vitória correta** — tela final: Continuar Jornada / Receber recompensas acessível **sem** scroll da página | ☐ |

**Passe B001:** os 5 checks acima no Android físico. Automação / emulação **não** fecha B001.

---

## B002 — revalidar no app real

Ambiente: ________ (desktop e/ou mobile) · Tip: ☐ `3622885`

Fluxo: errar ou pular um diálogo → aceitar a oferta de revisão / recuperação de estrela.

| Check | OK |
| --- | :---: |
| **Errar / pular** dispara a oferta de revisão | ☐ |
| **Aceitar revisão** abre a sessão de recuperação | ☐ |
| **Um único prompt** situacional (sem dump `你好 / 你好吗 / …`) | ☐ |
| **Pinyin coerente** — só o da resposta correta / alvo | ☐ |
| **Status não vira alternativa** — “Pulou…” / “incorretamente” **não** aparece como opção | ☐ |
| **Sentence build correto** — peças certas, sem dump concatenado (PieceAssembly) | ☐ |
| **Recuperação da estrela funciona** — acertar o(s) item(ns) recupera a 3ª estrela / feedback coerente | ☐ |

**Passe B002:** os 7 checks acima no app real. `test:immediate-remediation` / E2E **não** fecham B002.

---

## 1. L1–L20 com conta nova

Faça **em ordem**, como aluno novo. Sem seed de progresso.

| # | Lição (`id`) | Feita | Notas / bug-id |
| ---: | --- | :---: | --- |
| 1 | `p1-o-que-e-mandarim` | ☐ | |
| 2 | `p1-o-que-e-pinyin` | ☐ | |
| 3 | `p1-o-que-e-tom` | ☐ | |
| 4 | `p1-o-que-e-hanzi` | ☐ | |
| 5 | `p1-primeiros-hanzi` | ☐ | |
| 6 | `p1-engine-2-lab` | ☐ | |
| 7 | `p2-ma-primeiro-tom` | ☐ | |
| 8 | `p2-ma-segundo-tom` | ☐ | |
| 9 | `p2-ma-terceiro-tom` | ☐ | |
| 10 | `p2-ma-quarto-tom` | ☐ | |
| 11 | `p2-comparar-tom-1-4` | ☐ | |
| 12 | `p2-comparar-tom-2-3` | ☐ | |
| 13 | `p2-tons-nihao` | ☐ | |
| 14 | `p2-tons-xiexie` | ☐ | |
| 15 | `p3-wohenhao` | ☐ | |
| 16 | `p3-wobuhui-shuo-zhongwen` | ☐ | |
| 17 | `p3-qing-zai-shuo-yibian` | ☐ | |
| 18 | `p4-num-123` | ☐ | |
| 19 | `p4-num-45` | ☐ | |
| 20 | `p4-num-678` | ☐ | |

### Em **cada** atividade

- [ ] Ao avançar, a nova atividade começa **no topo** (sem herdar scroll)  
- [ ] CTA (Continuar / Verificar / Responder) **acessível** sem caça  
- [ ] Áudio toca quando esperado; mic não quebra a tela  
- [ ] Erro → retry / feedback claro  
- [ ] Nada “parece bug” de layout (espaço morto, botão fora, teclado)  

**Passe:** 20/20 + bugs P0/P1 no log (mesmo que zero).  
Proxy E2E `runbook-20-lessons` **não** substitui este passo.

---

## 2. Android completo (físico)

Dispositivo: ________ · Chrome: ________ · PWA: ☐ sim ☐ não  

| Check | OK |
| --- | :---: |
| Landing → conta → primeira lição | ☐ |
| Player: scroll reset ao Continuar | ☐ |
| CTA sticky / não some atrás da barra | ☐ |
| Teclado (pinyin / IME) não esconde Verificar | ☐ |
| Conversa: linhas novas entram na viewport | ☐ |
| Áudio + (se possível) mic | ☐ |
| Offline curto → banner / progresso local | ☐ |
| PWA: ícone na home · abre standalone · “Nova versão” se houver deploy | ☐ |
| Zoom com pinça funciona | ☐ |

---

## 3. iPhone / Safari (físico)

Dispositivo: ________ · iOS: ________ · “Adicionar à Tela de Início”: ☐  

| Check | OK |
| --- | :---: |
| Mesmos fluxos do Android (player, CTA, scroll, áudio) | ☐ |
| Safe area (notch / home indicator) — CTA não fica sob a barra | ☐ |
| `100dvh` / teclado Safari não empurra CTA para fora | ☐ |
| Standalone: sem chrome do Safari “quebrando” layout | ☐ |
| Confirmar e-mail / reset abrem no Safari e voltam ao app | ☐ |

---

## 4. E-mail real

E-mail de teste: ________  

| Passo | OK | Evidência |
| --- | :---: | --- |
| Criar conta → e-mail de confirmação **chega** | ☐ | |
| Clicar no link → conta confirma → consegue entrar | ☐ | |
| Esqueci senha → e-mail **chega** | ☐ | |
| Link abre → nova senha → login ok | ☐ | |
| Logout → login noutro browser/aparelho | ☐ | |
| Sessão depois de horas / reload mantém cloud | ☐ | |

`e2e/auth-surface.spec.ts` cobre superfície de rotas — **não** entrega de e-mail.

---

## 5. Stripe Test Mode

Siga [`SUBSCRIPTION_E2E_REPORT.md` §7](./SUBSCRIPTION_E2E_REPORT.md). Mínimo:

| Cenário | OK |
| --- | :---: |
| A — Trial: checkout → Pro no app → reload → continua Pro | ☐ |
| A′ — Logout/login mantém Pro | ☐ |
| C — Pagamento falho → Pro cai / paywall | ☐ |
| D — Cancelamento: Pro até o fim do período, depois cai | ☐ |
| Outro aparelho: mesma conta vê o mesmo entitlement | ☐ |

Cartões de teste: sucesso `4000 0000 0000 0077` · falha `4000 0000 0000 0341`.

---

## 6. Sync PC ↔ celular (físico)

Conta cloud: ________  

| Passo | OK |
| --- | :---: |
| Celular conclui uma lição (online) | ☐ |
| PC abre a mesma conta → progresso aparece | ☐ |
| PC offline altera algo → celular altera outra coisa → ambos online | ☐ |
| Merge: nenhum lado “some”; sem progresso zerado | ☐ |
| Banner/erro de sync se falhar; progresso local seguro | ☐ |

---

## 7. VoiceOver / TalkBack (amostra)

15–20 min bastam para achar P0.

| Check | iPhone VoiceOver | Android TalkBack |
| --- | :---: | :---: |
| Foco chega em Continuar / Verificar | ☐ | ☐ |
| Modal de erro / feedback fechável | ☐ | ☐ |
| Botão de áudio tem nome | ☐ | ☐ |
| Troca de atividade: foco não fica “perdido” | ☐ | ☐ |
| Contraste de texto principal legível | ☐ | ☐ |

---

## 8. 5–15 testadores reais

| # | Quem | Aparelho | Fez até lição… | Feedback canal | Bugs |
| ---: | --- | --- | --- | --- | --- |
| 1 | | | | in-app / WhatsApp / … | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| … | | | | | |

Pedido mínimo:

> Use 20–40 minutos do zero. Se precisar rolar para achar a próxima atividade, ou o botão sumir, mande print + lição.

---

## 9. Corrigir P0/P1 → congelar RC → gate → security

Ordem:

1. **Corrigir P0/P1** do log (B001/B002 só fecham após revalidação humana — §§B001/B002)  
2. **Congelar RC:** `git rev-parse HEAD` → anotar SHA em [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md)  
3. `npm run beta:rc-status`  
4. **`npm run gate:public-beta`** nessa SHA  
5. **Full security scan** da SHA final (workflow `Security`: npm audit + CodeQL + gitleaks) — **não** concluído até rodar na RC  
6. Tag sugerida: `0.2.0-beta.1-rc1`  

| Passo RC | OK |
| --- | :---: |
| P0 = 0 e P1 de fluxo principal tratados (ou waivers) | ☐ |
| SHA RC anotada no bug log | ☐ |
| `beta:rc-status` ok | ☐ |
| `gate:public-beta` verde | ☐ |
| Full security scan da SHA final verde | ☐ |

**Só então** abrir beta fechado amplo. Automação verde **não** conta como RC concluída.
