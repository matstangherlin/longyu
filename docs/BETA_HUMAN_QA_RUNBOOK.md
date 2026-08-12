# Longyu — Runbook de QA humano (pós #148)

**Objetivo:** provar o produto em pessoas e aparelhos reais.  
**Regra:** **automação não substitui QA humano** — nada aqui é substituível por Playwright, emulação, fixture ou `test:qa-regression-guard`.

Atualizado: 2026-08-12 · tip `main` `3622885` (#148).  
Mapa ponderado: [`BETA_LAUNCH_REMAINING.md`](./BETA_LAUNCH_REMAINING.md).

---

## Sequência recomendada (não pule)

1. **PC / notebook** — L1→L20 como aluno novo  
2. **Android Chrome** (+ PWA instalado se possível)  
3. **iPhone Safari** (+ “Adicionar à Tela de Início”)  
4. **Auth + e-mail real**  
5. **Stripe Test Mode** ([runbook §7](./SUBSCRIPTION_E2E_REPORT.md#7-critério--passada-final-em-stripe-test-mode-runbook))  
6. **Sync celular ↔ PC**  
7. **VoiceOver / TalkBack** (amostra curta)  
8. **5–15 testadores**  
9. **Corrigir P0/P1**  
10. **Congelar RC** → `npm run beta:rc-status` → `npm run gate:public-beta` → Security completo  

Use o log em [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md) (copie linhas; não apague o cabeçalho).

---

## 0. Preparo (5 min)

- [x] Abrir a **produção beta** (ou preview estável) em janela anônima  
- [x] Anotar: URL · versão na landing/Sobre · navegador · SO  
- [ ] Conta **nova** (e-mail real que você controla) **ou** perfil local zerado  
- [ ] Telemetria: decidir optar-in (recomendado em conta de QA)  
- [ ] Feedback: saber onde está o botão / reportar no player  

> **2026-08-12 · tip `3622885` (#148):** B002, produção/transferência friendliness, PieceAssembly e guarda QA (`test:qa-regression-guard`) estão **entregues em código** — ainda exigem confirmação humana.  
> **2026-08-11:** proxy desktop `e2e/runbook-20-lessons.spec.ts` (Chromium — **não** substitui §1 humano).  
> **B001:** **corrigido em código**, aguardando revalidação Android física (#138→#139→#140) — [checklist](./BETA_BUG_LOG.md#checklist-de-revalidação-b001-android-físico).  
> **B002:** **corrigido em código**, aguardando revalidação humana (#148) — [checklist](./BETA_BUG_LOG.md#checklist-de-revalidação-b002-revisão--estrela).  
> **#146:** ainda **pendente** na `main` (extrato seletivo na PR #149, não mergeada).  
> **Ainda não concluído:** QA iPhone · L1–L20 humano · e-mail real · Stripe Test Mode real · sync 2 aparelhos · VoiceOver/TalkBack · testadores externos · RC · full security scan final.  
> **Prioridade agora:** Android físico (B001) → revisão/estrela no app (B002) → L1–L20 humano §1.

Comandos úteis no repo (antes da RC, não no meio do uso):

```bash
npm run beta:rc-status          # SHA, versão, próximos gates
npm run gate:public-beta        # só na SHA congelada
```

---

## 1. PC — primeiras 20 lições (aluno novo)

Faça **em ordem**, como alguém que acabou de chegar. Não use seed de progresso.

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

### Em **cada** atividade, cheque mentalmente

- [ ] Ao avançar, a nova atividade começa **no topo** (sem herdar scroll)  
- [ ] CTA (Continuar / Verificar / Responder) **acessível** sem caça  
- [ ] Áudio toca quando esperado; mic não quebra a tela  
- [ ] Erro → retry / feedback claro  
- [ ] Nada “parece bug” de layout (espaço morto, botão fora, teclado)  

**Passe desta fase:** 20/20 feitas + bugs P0/P1 registrados no log (mesmo que zero).

---

## 2. Android (físico)

Dispositivo: ________ · Chrome versão: ________ · PWA instalado: ☐ sim ☐ não  

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

## 3. iPhone (físico)

Dispositivo: ________ · iOS: ________ · Safari · “Adicionar à Tela de Início”: ☐  

| Check | OK |
| --- | :---: |
| Mesmos fluxos do Android (player, CTA, scroll, áudio) | ☐ |
| Safe area (notch / home indicator) — CTA não fica sob a barra | ☐ |
| `100dvh` / teclado Safari não empurra CTA para fora | ☐ |
| Standalone: sem chrome do Safari “quebrando” layout | ☐ |
| Confirmar e-mail / reset abrem no Safari e voltam ao app | ☐ |

---

## 4. Auth + e-mail REAL

E-mail de teste: ________  

| Passo | OK | Evidência |
| --- | :---: | --- |
| Criar conta → e-mail de confirmação **chega** | ☐ | |
| Clicar no link → conta confirma → consegue entrar | ☐ | |
| Esqueci senha → e-mail **chega** | ☐ | |
| Link abre → nova senha → login ok | ☐ | |
| Logout → login noutro browser/aparelho | ☐ | |
| Sessão depois de horas / reload mantém cloud | ☐ | |

Superfície de rotas já coberta por `e2e/auth-surface.spec.ts` — isto valida **entrega e links**.

---

## 5. Stripe Test Mode

Siga o runbook completo em [`SUBSCRIPTION_E2E_REPORT.md` §7](./SUBSCRIPTION_E2E_REPORT.md). Mínimo obrigatório:

| Cenário | OK |
| --- | :---: |
| A — Trial: checkout → Pro no app → reload → continua Pro | ☐ |
| A′ — Logout/login mantém Pro | ☐ |
| C — Pagamento falho → Pro cai / paywall | ☐ |
| D — Cancelamento: Pro até o fim do período, depois cai | ☐ |
| Outro aparelho: mesma conta vê o mesmo entitlement | ☐ |

Cartões de teste Stripe: sucesso `4000 0000 0000 0077` · falha `4000 0000 0000 0341` (ver §7).

---

## 6. Sync multi-device (físico)

Conta cloud: ________  

| Passo | OK |
| --- | :---: |
| Celular conclui uma lição (online) | ☐ |
| PC abre a mesma conta → progresso aparece | ☐ |
| PC offline altera algo → celular altera outra coisa → ambos online | ☐ |
| Merge: nenhum dos dois lados “some”; sem progresso zerado | ☐ |
| Banner/erro de sync aparece se falhar; progresso local seguro | ☐ |

---

## 7. Acessibilidade (amostra)

Não precisa auditar o app inteiro — 15–20 min bastam para achar P0.

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

Pedido mínimo aos testadores:

> Use 20–40 minutos do zero. Se precisar rolar para achar a próxima atividade, ou o botão sumir, mande print + lição.

---

## 9. Depois dos bugs → RC

1. Corrigir **todos** P0 e os P1 que afetam fluxo principal (B001/B002 só fecham após revalidação humana — ver [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md))  
2. Congelar SHA: `git rev-parse HEAD` → anotar em [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md)  
3. `npm run beta:rc-status`  
4. `npm run gate:public-beta` nessa SHA  
5. Security workflow verde + **full security scan final** da RC (**pendente**)  
6. Tag sugerida: `0.2.0-beta.1-rc1`  

**Só então** abrir beta fechado amplo. Até lá: automação verde **não** conta como RC concluída.
