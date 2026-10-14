# RC2.3.13R.3.2.4 — Handoff do dono: Living UI, bordado chinês e movimento

**Onda de polimento aprovada pelo dono.** Só apresentação: nenhuma lição, regra
de domínio, SRS, XP, Fôlego, desbloqueio, navegação, schema, cobrança ou JEV
mudou. Depois do seu aceite físico, a UI congela (`LONGYU_UI_UX_FREEZE`).

## USE THIS APK

```text
Status:            NOT_BUILT — será gerado UMA vez, após CI verde no HEAD exato desta onda
RC:                RC2.3.13-RC1 · 0.2.0-rc.5
Pacote:            longyu.noba.com
Canal:             DEVICE_QA (debug — NÃO é build da Play)
learnerRuntimeSha: (carimbado na certificação: docs/release/rc2-3-13r3-2-4-certification.json)
Fingerprint:       29bb02ec0336
APK SHA256:        pendente
Workflow run / artifact ID: pendentes
```

Confira no aparelho, em **/qa/device → "Living UI & ornaments"**:
`ornament pack v1 · 13 assets` e `ambient loops: N running / M registered · budget ≤ 4`.

## DO NOT USE

```text
fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af
fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8
```

Esses hashes são **STALE_FOR_CURRENT_RUNTIME**. Nenhum APK foi gerado para o
HEAD verde da R.3.2.3 (#354 em `64a06df`, já mesclada na `main`): a R.3.2.4 começou em cima dele, então
o próximo APK já leva as cenas SVG **e** a Living UI.

---

## 1. O que mudou (para você julgar)

| Onde | O que você deve ver |
| --- | --- |
| Jornada | só o módulo atual ganha a moldura bordada huiwen (a linha "costura" uma vez); a bolinha atual tem um halo que respira devagar (5 s) |
| Cultura | o cabeçalho do tópico tem moldura xiangyun; a raiz tem um divisor de treliça; abrir/voltar de um tópico desliza 12 px na direção certa |
| Jornada ↔ Cultura | o seletor desliza sem quicar; tocar rápido várias vezes não enfileira |
| Botões e cartões | resposta ao toque (aperta 0,985), nunca bloqueia o próximo toque |
| Aula | seleção da resposta aperta de leve; acerto: o check "salta" uma vez; erro: tremida contida (≤ 3 px) |
| Áudio / gravação | anel suave enquanto o áudio toca; ponto + barras enquanto grava |
| Hànzì | o rótulo da etapa entra uma vez; peça do construtor "encaixa" |
| Vitória | selo + 6 pétalas de ameixeira, uma vez, < 1,1 s — sem cassino, sem som |
| Revisão | canto ruyi no cartão do treino |
| Início | o cartão "continuar" entra uma vez e tem um canto de ameixeira |
| Barra superior | XP/Fôlego/Ofensiva/Qi só "saltam" quando o número realmente sobe |
| Barras de progresso | só animam quando o valor muda; reabrir a tela mostra o valor certo direto |

## 2. Teste físico (Android real, não emulador)

| Verificação | Resultado |
| --- | --- |
| MOTION_PHYSICAL — rolar a Jornada inteira sem engasgo; nada pisca ou quica | ☐ PASS ☐ FAIL |
| ORNAMENT_PHYSICAL — bordado nítido, discreto, nunca sobre texto ou botão | ☐ PASS ☐ FAIL |
| JOURNEY_VISUAL — cenas SVG + moldura do módulo atual + halo, claro **e** escuro | ☐ PASS ☐ FAIL |
| CULTURE_VISUAL — raiz, tópico, transição ida/volta | ☐ PASS ☐ FAIL |
| LEARNING_FEEDBACK — seleção, acerto, erro, áudio, gravação, Hànzì | ☐ PASS ☐ FAIL |
| Vitória — recompensa sem exagero | ☐ PASS ☐ FAIL |
| Movimento reduzido (Android: remover animações) — tudo parado, estado visível | ☐ PASS ☐ FAIL |
| Fonte grande — nada corta, nada sobrepõe | ☐ PASS ☐ FAIL |
| TalkBack — o bordado nunca é anunciado; a ordem de foco não mudou | ☐ PASS ☐ FAIL |
| THIRTY_MIN_SESSION — 30 min de uso: aquecimento, bateria, memória, áudio | ☐ PASS ☐ FAIL |
| PREVIOUS_P1 — regressão: 我叫 + nome, Audio ×20, Hànzì, Cultura, Voltar, restauração do scroll | ☐ PASS ☐ FAIL |

### Julgamento de qualidade

> **Parece vivo, chinês e bem-feito — ou parece enfeitado demais?**

Se algo estiver forte demais, diga onde: a intensidade do bordado é um token e
pode baixar sem mexer em nada mais. (A opção do gato Li Hua continua em aberto.)

## 3. Depois do seu PASS

`LONGYU_UI_UX_FREEZE = OWNER_ACCEPTED`, ligado ao SHA256 exato do APK — sem
mais ondas visuais. Em seguida: R.3 físico completo → Sentry → rollback →
Cloud ×2 → OAuth Android → AAB assinado da Play → instalação pelo Closed
Testing → aceite final → no máximo 10 testers. **Public Beta continua HOLD.**
