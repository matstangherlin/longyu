# RC2.3.13R.3.2.3 — Handoff do dono: Jornada com cenas SVG

**Onda visual final aprovada pelo dono.** Depois do seu aceite físico, não há mais ondas visuais.

## USE THIS APK

```text
Status:            NOT_BUILT — será gerado UMA vez, após CI verde no HEAD exato desta onda
RC:                RC2.3.13-RC1 · 0.2.0-rc.5
Pacote:            longyu.noba.com
Canal:             DEVICE_QA (debug — NÃO é build da Play)
learnerRuntimeSha: (carimbado na certificação: docs/release/rc2-3-13r3-2-3-certification.json)
Fingerprint:       29bb02ec0336
APK SHA256:        pendente
Workflow run / artifact ID: pendentes
```

Confira no aparelho, em **/qa/device → "Journey SVG scenes"**:
`pack v1 · 16 scenes · digest 8437d338 · slots: 40 scenes · 21 ornaments`.

## DO NOT USE

```text
fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af
fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8
```

Esses hashes são **STALE_FOR_CURRENT_RUNTIME** (antes das cenas SVG). Nenhum APK da #353 foi gerado — esta onda começou antes de um candidato físico da #353 ser certificado.

---

## 1. Teste físico das cenas (Android real, não emulador)

Role a Jornada do topo até o fim (use **Ver tudo**), passando por várias regiões:
portal da lua → templo → montanhas de Guilin → Wukong → pátio → Grande Muralha → gato da sorte → cidade.

| Verificação | Resultado |
| --- | --- |
| SVG carrega (nenhum ícone quebrado, também offline) | ☐ PASS ☐ FAIL |
| SVG nítido (sem borrão) | ☐ PASS ☐ FAIL |
| Tema claro **e** escuro (no escuro: "lua acesa", nada escuro sobre escuro) | ☐ PASS ☐ FAIL |
| Alternância esquerda/direita | ☐ PASS ☐ FAIL |
| Cena nunca encosta em bolinha | ☐ PASS ☐ FAIL |
| Cena nunca encosta em texto, pílula "Continuar" ou cartão | ☐ PASS ☐ FAIL |
| Animação lenta e sutil | ☐ PASS ☐ FAIL |
| Movimento reduzido (Android: remover animações) → cenas paradas e visíveis | ☐ PASS ☐ FAIL |

Também: a **Revisão do módulo** tem a moldura bordada (rosácea de lótus, pontos de bordado, nós ruyi); bloqueada ela fica cinza.

### Julgamento de qualidade

> **Essas cenas parecem feitas para o Longyu?** (não só "funcionam")

Se alguma parecer genérica, diga qual — corrigimos o desenho antes do beta, sem mexer na arquitetura da Jornada.

## 2. Regressão física no MESMO APK

canonical skip = 0 · 我叫 + nome completo · áudio de diálogo completo · **Audio ×20** · distratores personalizados · variedade visual · Hànzì no celular · Cultura raiz · detalhe de tópico · alinhamento das bolinhas · Voltar · Jornada ↔ Cultura · restauração do scroll.

## 3. Depois do seu PASS

`JOURNEY_SVG_VISUAL_SYSTEM = OWNER_ACCEPTED` e `JOURNEY_CULTURE_VISUAL_FREEZE = OWNER_ACCEPTED`, ligados ao SHA256 exato do APK. Em seguida: R.3 físico completo → Sentry → rollback → Cloud ×2 → OAuth Android → AAB assinado da Play → instalação pelo Closed Testing → aceite final → no máximo 10 testers. **Public Beta continua HOLD.**
