# Longyu — Runbook de QA humano (RC2.2.3 / PUBLIC_BETA_CORE)

**Objetivo:** provar que um humano real consegue usar e entender o Longyu.  
**Regra:** **automação não substitui QA humano.** Playwright, emulação, fixtures e `test:qa-regression-guard` **não** fecham checkbox humano.

Atualizado: 2026-09-17 · stack tip = branch `cursor/rc2-human-qa-prebeta-*` (ancestral `#274`).  
Manifesto: [`docs/release/human-qa-prebeta.json`](./release/human-qa-prebeta.json).  
Log de bugs: [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md).  
Instruções externas: [`docs/release/beta-tester-instructions.md`](./release/beta-tester-instructions.md).

> **Nenhum checkbox humano abaixo foi marcado automaticamente.** Só a pessoa que executar o passo marca.  
> **Agente / automação não pode marcar** L1–L20, B001 físico, B002 humano, ou batch de testadores como PASS.

---

## Contexto congelado (RC2)

| Campo | Valor |
| --- | --- |
| FEATURE_FREEZE | `PUBLIC_BETA` |
| CURRICULUM_FREEZE | `RC2_CONTENT_FREEZE` |
| Fingerprint | `327de1df0f33` |
| Lessons / topics | 134 / 113 |
| CultureItems / Native / Journey nodes | 30 / 30 / 20 |
| Cloud candidate | `BLOCKED_CREDENTIALS` → **DEFERRED_UNTIL_QA_CANDIDATE** |
| Formal device/PWA/rollback | continuam `pass: false` |

**Human QA PASS ≠ Public Beta GO.** Ainda faltam cloud, device físico, PWA real e rollback real.

---

## O que NÃO bloqueia Free Public Beta

| Item | Status para Free Beta | Onde vive |
| --- | --- | --- |
| Stripe Test Mode / Pro purchase | **NOT REQUIRED FOR PUBLIC_BETA_CORE** | Commercial follow-up |
| Family plan | **planned** — não self-serve | Commercial |
| Business | **pilot** — não self-serve | Commercial |
| League | publicamente disabled | Product truth |

---

## O que continua obrigatório (ainda blocked)

| Check | Estado atual | Nota |
| --- | --- | --- |
| `cloud_auth` | false · DEFERRED_UNTIL_QA_CANDIDATE | Não marcar PASS por QA local |
| `cloud_sync` | false · DEFERRED_UNTIL_QA_CANDIDATE | Idem |
| `feedback_backend` | false · DEFERRED_UNTIL_QA_CANDIDATE | UI pode ser exercitada; backend não |
| `android_real_device` | false | Emulação ≠ físico |
| `ios_real_device` | false | WebKit ≠ iPhone |
| `pwa_upgrade` | false | Local N→N+1 ≠ deploy real |
| `rollback_drill` | false | Local ≠ Netlify |

---

## Severidade canônica

| Sev | Significado | Exemplos |
| --- | --- | --- |
| **P0** | Blocker absoluto | Não avança; crash; perda de progresso; conteúdo perigoso; login impossível; leak |
| **P1** | Major / fluxo principal | CTA escondido; lição impossível; áudio obrigatório falha; Guide bloqueia; Journey confunde |
| **P2** | Medium | Copy estranha; layout incômodo; inconsistência visual |
| **P3** | Minor | Polish |

**Regra beta:** P0 = 0. P1 do fluxo principal = 0 ou waiver explícito com razão.

---

## Próximo fluxo (ordem)

Execute **nesta ordem**. Não pule B001/B002 para ir direto a L1–L20.

| # | Passo | Quem | Onde |
| ---: | --- | --- | --- |
| 1 | Force refresh + anotar SHA/URL/device | Humano | §0 |
| 2 | B001 no Android **físico** (ou registrar EMULATED_PREFLIGHT sem PASS formal) | Humano | §B001 |
| 3 | B002 star recovery no app real | Humano | §B002 |
| 4 | L1–L20 conta/perfil zerado | Humano | §1 |
| 5 | GuideDialogue human checks | Humano | §Guide |
| 6 | Culture Moments + Hub | Humano | §Culture |
| 7 | Review + Reforço+ + Victory + Nav | Humano | §Review+ |
| 8 | Product truth (Pro/Family/Speech) | Humano | §Truth |
| 9 | Android físico completo | Humano | §2 |
| 10 | iPhone / Safari físico | Humano | §3 |
| 11 | E-mail real | Humano | §4 · **DEFERRED** se cloud blocked |
| 12 | Sync PC ↔ celular | Humano | §6 · **DEFERRED** se cloud blocked |
| 13 | Stripe / Family / Business | Humano | §5 · **NOT REQUIRED** Free Beta |
| 14 | VoiceOver / TalkBack amostra | Humano | §7 |
| 15 | Batch 1–5 testadores | Externos | §8 + kit |
| 16 | Corrigir P0/P1 | Dev | bug log |
| 17 | Voltar ao candidate QA (#273) | Ops | cloud |

```bash
git rev-parse HEAD                 # SHA obrigatória da sessão
npm run beta:rc-status             # consulta — não prova humano
npm run gate:mobile-pwa-preflight  # máquina (#274) — não prova humano
npm run validate:human-qa-prebeta  # honestidade do manifesto
```

---

## 0. Preparo — force refresh / identidade

Antes de qualquer sessão:

- [ ] Ambiente anotado: `LOCAL_PREVIEW` · `DEPLOY_PREVIEW` · `LAN` · (nunca produção como “cloud QA”)
- [ ] **SHA completa** (`git rev-parse HEAD`) — nunca “latest” / “PR build”
- [ ] Branch anotada
- [ ] URL anotada (se houver)
- [ ] Data + nome do tester
- [ ] **Force refresh** / janela anônima / limpar dados do site
- [ ] Confirmar versão (Sobre / landing) alinhada à SHA
- [ ] Conta **nova** ou perfil local **zerado** — **sem seed / skip / debug unlock**
- [ ] Saber onde reportar problema (Mais / Sobre / Ajustes / fim de lesson)

**Se não houver URL compartilhável para externos:**  
`EXTERNAL_TESTERS_BLOCKED_SHAREABLE_BUILD` — founder/manual local pode continuar.

---

## B001 — mobile player (Android físico)

Aparelho: ________ · Chrome: ________ · SHA: ________

| Check | OK |
| --- | :---: |
| Body não arrasta indevidamente | ☐ |
| CTA acessível (Continuar / Verificar / Tentar de novo) | ☐ |
| Teclado aberto — CTA alcançável | ☐ |
| Teclado fechado — layout/CTA corretos | ☐ |
| Victory acessível sem scroll da página | ☐ |

**PASS formal B001** = Android físico.  
`MANUAL_DESKTOP_MOBILE_VIEW` / `EMULATED_PREFLIGHT` = informação apenas — **não** fecha `android_real_device`.

---

## B002 — star recovery (app real)

Ambiente: ________ · SHA: ________

| Check | OK |
| --- | :---: |
| Errar / pular dispara oferta de revisão | ☐ |
| Aceitar abre sessão de recuperação | ☐ |
| Um único prompt situacional (sem dump) | ☐ |
| Pinyin coerente | ☐ |
| Status não vira alternativa | ☐ |
| PieceAssembly correto | ☐ |
| Estrela realmente recupera | ☐ |

E2E / `test:immediate-remediation` **não** fecham B002.

---

## 1. L1–L20 (conta / perfil zerado)

Faça **em ordem**, como aluno novo. Sem seed.

| # | Lição (`id`) | Feita | Fricção / bug-id |
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

### Em cada lesson — perguntar (anotar)

- Entendi o objetivo? Sei o que fazer?
- Guide ajudou ou atrapalhou? Texto longo? Typewriter irritante?
- Continue claro? Áudio ok? Erro explicou algo?
- Hanzi/Pinyin coerentes? CTA onde espero? Victory natural?

### Timing (baseline)

| Marco | Minutos |
| --- | ---: |
| Onboarding | |
| L1 | |
| L1–L5 | |
| Até 1ª Culture Moment | |

Proxy E2E `runbook-20-lessons` **não** substitui este passo.  
Se só local: registrar `LOCAL_HUMAN_PREFLIGHT` — **não** inventar PASS externo.

---

## GuideDialogue — human QA

| Check / pergunta | Nota |
| --- | --- |
| Mascot entrance / bubble / typewriter | ☐ |
| Continue durante typing vs depois completo | ☐ |
| Transições entre mensagens | ☐ |
| Reduced motion (SO) — instantâneo | ☐ |
| O personagem ajuda ou cansa? | |
| Balão ocupa espaço demais? Texto legível? | |

Não remover o Guide só porque uma pessoa prefere texto instantâneo — procurar **padrão**.

---

## Culture Moments + Hub

### Moment (Journey → Culture → volta)

| Pergunta | Nota |
| --- | --- |
| Entendi por que Cultura apareceu aqui? | |
| Pareceu parte da aula ou propaganda? | |
| Sabia que era opcional? | |
| Sabia voltar à Journey? | |
| Explorado / Rever / return context OK? | ☐ |

### Hub

| Check | OK |
| --- | :---: |
| History / Legends / Symbols / Festivals / Life in China compreensíveis sem tutorial externo | ☐ |

---

## Review · Reforço+ · Victory · Navigation

| Área | Perguntas |
| --- | --- |
| Review | Por que estou revisando? Item faz sentido? Explicação ajuda? Sessão acaba (sem loop)? |
| Reforço+ | Por que apareceu? Diferença do Review? 4/4 mastery claro? Não reaparece na hora? |
| Victory | Curta/clara? Próxima ação óbvia sem caça ao botão? |
| Nav | Onde estudar / revisar / ver cultura? Back faz sentido? |

---

## Product truth (humano)

Tester **não** deve acreditar que pode comprar Pro / Family agora.  
Business não deve parecer self-serve se continua pilot.  
Speech **não** deve parecer AI pronunciation scoring se isso não existe.

---

## Feedback surface

Mesmo sem backend QA: achar caminho real de reportar (Mais / Sobre / Ajustes / fim de lesson).  
No mobile, **não** procurar FAB desktop-only como se fosse bug.

---

## 2. Android completo (físico)

Dispositivo: ________ · Chrome: ________ · PWA: ☐ · SHA: ________

| Check | OK |
| --- | :---: |
| Landing → conta/local → primeira lição | ☐ |
| Player: scroll reset ao Continuar | ☐ |
| CTA sticky / teclado | ☐ |
| Áudio + mic allow/deny/cancel (se aplicável) | ☐ |
| Offline curto / progresso local | ☐ |
| PWA install visual | ☐ |
| Pinch-zoom funciona | ☐ |

---

## 3. iPhone / Safari (físico)

Dispositivo: ________ · iOS: ________ · SHA: ________

| Check | OK |
| --- | :---: |
| Fluxos player + safe-area | ☐ |
| Autoplay pode falhar — replay manual ok | ☐ |
| Speech unavailable → fallback (sem CTA morto) | ☐ |
| Standalone / Adicionar à Tela de Início | ☐ |

---

## 4. E-mail real · DEFERRED_UNTIL_QA_CANDIDATE

Aguardando candidate cloud. **Não** marcar PASS com produção.

---

## 5. Stripe / Family / Business · NOT REQUIRED FOR PUBLIC_BETA_CORE

Commercial follow-up. Ver [`SUBSCRIPTION_E2E_REPORT.md`](./SUBSCRIPTION_E2E_REPORT.md) quando for a hora — **não** bloqueia Free Beta.

---

## 6. Sync PC ↔ celular · DEFERRED_UNTIL_QA_CANDIDATE

---

## 7. VoiceOver / TalkBack (amostra)

15–20 min. Foco: Continuar/Verificar, modal, áudio nomeado, foco após troca de step.

---

## 8. Testadores externos (batch 1 = 5)

| # | Quem | Device/browser | Start SHA | Duration | Last lesson | Friction | P0 | P1 | P2 | Free-text |
| ---: | --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | | | | | | | | | | |
| 2 | | | | | | | | | | |
| 3 | | | | | | | | | | |
| 4 | | | | | | | | | | |
| 5 | | | | | | | | | | |

Usar [`beta-tester-instructions.md`](./release/beta-tester-instructions.md).  
**Não inventar linhas.** Se sem URL: `EXTERNAL_TESTERS_BLOCKED_SHAREABLE_BUILD`.

Perguntas preferidas (sem bias):

- Alguma parte te confundiu?
- Como você descreveria o que o personagem faz?
- O que você aprendeu?

---

## 9. Depois do Human QA

1. Corrigir P0 / P1 main-flow (ou waivers documentados)  
2. **Retornar ao #273** — destravar candidate QA  
3. Só então RC2.2.2B (device/PWA/rollback reais)  
4. RC2.3 final main candidate (SHA pós-squash ≠ SHA desta stack)

**Verdict público continua NO-GO** até cloud + devices + PWA + rollback + security + freeze.
