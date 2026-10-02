# RC2.2.25 — Product Experience Closure

Base: `RC2_2_25_BASE_SHA = ab2a2d595073ac7acbdd752d316e8ee7f052a31d` (HEAD real da RC2.2.24).
Onda empilhada; sem motor novo; sem expansão estrutural. Inventário:
`docs/release/rc2-2-25-surface-inventory.json`. Dívida do owner:
`docs/release/rc2-2-25-owner-product-debt.json`. Roteiro humano:
`docs/release/rc2-2-25-owner-human-script.md`.

**Nenhuma função conta como concluída só porque existe no código.**
CODE_READY ≠ WEB_PASS ≠ APK_PASS ≠ OWNER_ACCEPTED.

## OBSERVED

- 134 aulas auditadas sem amostragem (35 Pro), 536 planos (passes 0–3). 42 StepKinds: 23 GUIDED_NATIVE, 19 GUIDED_COMPATIBLE, **0 LEGACY_PRESENTATION**.
- GUIDED_EXPERIENCE_GOLD_STANDARD com 16 características em `src/lib/productGoldStandard.ts` (uma ideia por tela, progresso simples, sem dashboard, sem cartão dentro de cartão, sem rolagem em 390×844/375×667, feedback curto, CTA = ação, sem chrome do app na atividade…).
- Hub ≠ atividade: Revisão (hub [Começar revisão] → rodada em focus com X + ETAPA n/N), Pinyin Lab e Fala (`FocusActivityFrame`), Imersão (história/sessão em focus), Tons (RC2.2.24), Hànzì (rota, RC2.2.14), Lição (player).
- `screenDensityScore` (MINIMAL/GOOD/BUSY/OVERLOADED) medido no DOM pelo E2E em Revisão e Fala (390×844 e 375×667): aceito (MINIMAL/GOOD).
- Conta: primeira dobra com avatar, nome, e-mail, status + Perfil · Aparência · Segurança e senha · **Sair da conta** sem rolar; Excluir só na "Zona de perigo", no fim.
- Mais: VOCÊ no topo; "Sair da conta" linha full-width neutra; grupos VOCÊ · ESTUDAR · SOCIAL · PROGRESSO · SISTEMA. Sheet do Mais também tem "Sair da conta" (≤ 2 níveis de qualquer tela).
- Perfil: botão Conta na primeira dobra (o `data-testid` do `ActionButton` era descartado em silêncio — corrigido).
- CTA: botões de nota da Revisão sem "+XP · +Qi".
- Fala: mensagens sem "serviço de reconhecimento/voz"; fallback "Seu aparelho não conseguiu reconhecer mandarim agora."; trilha OUÇA → GRAVE → OUÇA VOCÊ → COMPARE → CONTINUE no Gravar e comparar.
- Tone Trace: "Passe o dedo pelo caminho do tom."; linha → parcial → pontos → nada → **escolha de memória**.
- Cultura: "Antes de continuar, entenda este costume." [Ir para Cultura] → "✓ Cultura concluída" [Voltar para <unidade>].
- Volta à Jornada: pulso de 1,3 s (`JOURNEY_RETURN_PULSE_MS`).

## INFERRED

- O "não achei o Sair" do owner (LOGOUT_DISCOVERABILITY_OWNER_FAIL) vinha da Conta longa no celular + Sair pequeno na grade do Mais; a correção põe a ação na primeira dobra e como linha inteira.
- O excesso de informação nas atividades vinha de hub e atividade dividirem a mesma tela.

## NOT_TESTED

- APK no aparelho do owner: logoutWithinTwoLevels, contaFirstFoldSignOut, moreOrderVoceFirst, reviewRoundFocus, pinyinFocus, falaFocus, immersionFocus, toneTraceMemoryChoice, cultureHandoffReturn, speechFallbackCopy — **NOT_RUN**.
- Aceite visual do owner (SIM/NÃO) nas 15 superfícies × 5 viewports — **NOT_RUN** (goldens sob demanda).
- Sem rolagem em todas as atividades em 375×667 — não provado para todas (OD27 = NOT_IMPLEMENTED).
- Todos os P1 herdados continuam abertos até PASS físico.

## Release

PUBLIC_BETA = NO_GO · CLOSED_BETA = NO_GO. Próximo: RC2.2.26 Closed Beta Entry → RC2.2.27 fixpack → Pedagogical V5 → #273 → Final RC → Public Beta.
