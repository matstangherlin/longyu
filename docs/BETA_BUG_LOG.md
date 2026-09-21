# Longyu — Log de bugs do QA humano

Preencha durante o runbook [`BETA_HUMAN_QA_RUNBOOK.md`](./BETA_HUMAN_QA_RUNBOOK.md).  
Uma linha por problema.

## Severidade canônica (RC2.2.3)

| Sev | Significado | Exemplos |
| --- | --- | --- |
| **P0** | Blocker absoluto | Não avança; crash; perda de progresso; conteúdo perigoso; login impossível; leak |
| **P1** | Major / fluxo principal | CTA escondido; lição impossível; áudio obrigatório falha; Guide bloqueia |
| **P2** | Medium | Copy estranha; layout incômodo; inconsistência visual |
| **P3** | Minor | Polish |

**Regra Public Beta:** P0 = 0. P1 do fluxo principal = 0 ou waiver explícito.

> **Automação não substitui QA humano.** `test:qa-regression-guard`, E2E e fixtures provam regressões em código — não fecham bug até revalidação no app real.  
> **Nenhum checkbox humano abaixo foi marcado automaticamente.**

## Meta da rodada (RC2.2.3)

| Campo | Valor |
| --- | --- |
| Data início | 2026-09-17 |
| Stack | `#274` → `cursor/rc2-human-qa-prebeta-*` |
| STACK_BASE_SHA | `d9c7887e60442013cab1d54f15eee7ce6fdb9390` |
| URL / ambiente | `LOCAL_PREVIEW_ONLY` — sem build compartilhável externo |
| Feature freeze | `PUBLIC_BETA` |
| Curriculum freeze | `RC2_CONTENT_FREEZE` · fingerprint `ef3d300ef2b9` |
| Cloud | `DEFERRED_UNTIL_QA_CANDIDATE` (`BLOCKED_CREDENTIALS`) |
| Stripe / Family / Business | **NOT REQUIRED** Free Public Beta |
| Executor | Humano (founder / batch) — agente só prepara kit |

## Log (herdado + aberto para humano)

| ID | Sev | Onde (rota / lição / step) | Aparelho | O que aconteceu | Esperado | Repro | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B001 | P1 | `/licao/*/player` · dialogue_choice / vitória | Android Chrome | Rubber-band + CTA Continuar/Verificar abaixo da viewport; vitória também exigia scroll | Body não arrasta; CTA acessível; teclado ok; vitória correta | Lição pinyin pós-resposta + tela final | **REABERTO** — StickyActionBar ainda cobre banco de peças no celular real; reserva de padding + safe-area na remessa device-bugs; tip via `beta:rc-status` · aguarda Android/iPhone físico (**não** fechar por emulação #274) |
| B002 | P1 | Star recovery / remediação imediata | Desktop + mobile | Prompt/hànzì/pinyin concatenados (`你好 / 你好吗 / …`); “Pulou…” virava opção; Correto inconsistente; UI bagunçada | Errar/pular → revisão; um prompt; pinyin coerente; status ≠ alternativa; sentence build ok; estrela recupera | Errar/pular diálogo → aceitar revisão | **corrigido em código**, aguardando revalidação humana (#148; tip via `beta:rc-status`) |
| B003 | P0 | `/revisao` após Verificar | iPhone Safari / PWA | Resposta não mostra Certo/Errado claro; sem CTA Continuar visível (estado `revealed` sem ação sticky) | Feedback imediato + Continuar sticky na viewport; scroll/foco no feedback | Responder item de revisão no iPhone | **corrigido em código** (`RevisaoPage` sticky Continuar + e2e); aguarda iPhone físico |
| B004 | P1 | Associação visual (`image_choice`) | Mobile | Quatro tiles vazios (opacity-0 / lazy); lógica de acerto funciona | Imagens eager + preload; fallback; não responder com tiles vazios | Lição com image_choice | **corrigido em código** (`VisualConceptImage` / `ImageChoiceGrid`); aguarda aparelho |
| PED-005 | P1 | Tons (`p1-o-que-e-tom` / `StepTone`) | Pedagógico | Carga cognitiva alta (áudio+vocábulo+tom+sentido juntos) | Escada 2 tons → 4 → pinyin → palavra → mistura | Lição de tom | **corrigido em código** (`toneChoices` + lição); aguarda humano |
| VIS-006 | P2 | Ilustrações light/dark | Mobile/Desktop | Mint `#EDF2ED` opaco não acompanha tema | SVG transparente + frame `bg-surface-2` | Alternar tema | **corrigido em código** (fundos removidos; catálogo `transparent`) |
| VIS-007 | P2 | Bundle de assets | Performance | SVGs grandes como data URI no JS | URLs Vite hasheadas | Build / Network | **corrigido em código** (`visuals/index.ts`) |
| QA-008 | P1 | iPhone atividade×atividade | iPhone | QA Safari incompleto | Checklist choice/imagem/áudio/tons/build/pares/produção/revisão light+dark | Runbook §iPhone | **aberto** — humano |
| QA-009 | P2 | Docs release | — | Docs ainda citavam SHA antiga | tip atual via `beta:rc-status` + bugs no log | — | **corrigido em docs** (#158 + remessa RC) |
| A11Y-010 | P2 | Global viewport | iOS/Android | Histórico: `user-scalable=no` | Pinch-zoom permitido | Meta viewport | **PASS_CODE** (RC2.2.3) — `index.html` sem `user-scalable=no` / `maximum-scale=1`; aguarda confirmação em device físico |
| PWA-011 | P3 | iOS standalone meta | iPhone | Histórico: metas legadas ausentes | `apple-mobile-web-app-*` presentes | HTML head | **PASS_CODE** (RC2.2.3) — metas presentes; formal PWA install ainda `pass: false` |

## Contagem rápida (abertos para fechamento humano / físico)

| Sev | Abertos | Notas |
| --- | ---: | --- |
| P0 | 1 | B003 — código pronto; aguarda iPhone físico |
| P1 | 5 | B001, B002, B004, PED-005, QA-008 |
| P2 | 2 | VIS-006/007 código ok; A11Y-010 código ok (confirmação física pendente não conta como aberto P2 de produto se só falta device) |
| P3 | 0 | PWA-011 código ok |

> B001 **reaberto** (regressão física). B002/B003/B004/PED-005: código + testes; **abertos para RC** até humano.  
> **Não marcar como fechado** só porque a automação passou.  
> Contagens no manifesto `human-qa-prebeta.json` (`p0Open`/`p1Open`) devem bater com esta tabela até o humano revalidar.

## Nota B001 / glossário (2026-08-12)

Com `helpMode=disabled` em opções de escuta, o token **não** abre mais sheet
“Sem ajuda nesta pergunta” — cobria o CTA sticky Verificar no mobile.

## Checklist de revalidação B001 (Android físico)

Tip: anotar **SHA completa** da sessão (`git rev-parse HEAD`). Force refresh / cache limpo **antes**. Ver runbook §B001.

- [ ] **Body não arrasta** — documento não move ao puxar a página  
- [ ] **CTA acessível** — Continuar / Verificar / Tentar de novo sem caça (acerto e erro)  
- [ ] **Teclado aberto** — CTA alcançável com IME aberto  
- [ ] **Teclado fechado** — layout/CTA corretos ao fechar  
- [ ] **Vitória correta** — Continuar Jornada / recompensas sem scroll da página  

## Checklist de revalidação B002 (revisão / estrela)

Tip: anotar SHA completa. Force refresh / cache limpo **antes**. Ver runbook §B002.

- [ ] **Errar / pular** dispara a oferta de revisão  
- [ ] **Aceitar revisão** abre a sessão  
- [ ] **Um único prompt** situacional (sem dump `你好 / 你好吗 / …`)  
- [ ] **Pinyin coerente** — só o da resposta / alvo  
- [ ] **Status não vira alternativa** — “Pulou…” / “incorretamente” ausente nas opções  
- [ ] **Sentence build correto** — peças certas, sem dump (PieceAssembly)  
- [ ] **Recuperação da estrela funciona** — acertar recupera 3ª estrela / feedback coerente  

## Checklist de revalidação B003 (iPhone físico)

Tip: anotar SHA completa. Force refresh / cache limpo **antes**.

- [ ] Responder item em `/revisao` → aparece **Certo** ou **Errado** imediatamente  
- [ ] CTA **Continuar** (ou Errei — continuar) visível sem scroll caça  
- [ ] Continuar avança para o próximo item  
- [ ] Light + dark; teclado aberto/fechado; PWA e Safari  

## Checklist de revalidação B004 (imagens)

- [ ] Associação visual: quatro imagens visíveis antes de responder  
- [ ] Se asset falhar, fallback (ícone/emoji) — nunca quatro quadrados vazios  
- [ ] Light + dark  

## Critério para RC / Public Beta (ainda NO-GO)

- [ ] P0 = 0  
- [ ] P1 de player/auth/sync = 0 (ou waivers) — **B001/B002 só após humano**  
- [ ] Runbook: B001–B002 + L1–L20 + Guide/Culture/Review + Android/iPhone físicos  
- [ ] Cloud candidate: `cloud_auth` / `cloud_sync` / `feedback_backend` PASS (#273)  
- [ ] Device/PWA/rollback formais PASS (RC2.2.2B)  
- [ ] `gate:public-beta-core` verde na SHA **final main** pós-squash  
- [ ] Full security scan da SHA final  

```
SHA sessão humana:
SHA final main (RC2.3):
gate:public-beta-core:
Security:
```
