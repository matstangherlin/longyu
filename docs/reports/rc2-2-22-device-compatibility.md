# RC2.2.22 — Compatibilidade por aparelho

Estado: **nenhum aparelho físico registrado ainda.** A tabela só ganha linhas quando um aparelho for realmente testado (ID opaco D01, D02…). Nenhum resultado vale para "todos os Androids" nem para o fabricante inteiro.

## Tabela

| device class | Android | audio | self compare | speech | auth | Journey | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OWNER_DEVICE | — | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_TESTED |
| OLD_SUPPORTED_ANDROID | — | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_AVAILABLE |
| CURRENT_ANDROID | — | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_AVAILABLE |

Prioridade de cobertura: o aparelho do owner, depois um Android suportado mais antigo, depois um recente. Classes previstas: OWNER_DEVICE, SMALL_ANDROID, MID_ANDROID, LARGE_ANDROID, OLD_SUPPORTED_ANDROID e CURRENT_ANDROID, quando existirem.

## O que registrar por aparelho

**Identificação** (sem PII):

- Android API
- fabricante (`Build.MANUFACTURER`, só para agrupar)
- classe de tela
- WebView major
- classe de RAM, quando disponível

**Capacidades:**

- TTS zh-CN
- SpeechRecognizer
- reconhecedor on-device
- reconhecedor de rede
- download de modelo
- microfone
- rota de saída de áudio
- notificações
- vibração

## Matriz de reconhecimento

Colunas: DEVICE · RECOGNIZER · ZH_CN · RESULT.

| Estado | Significado |
| --- | --- |
| FULL | on-device com zh-CN instalado (funciona offline) |
| NETWORK_ONLY | serviço com zh-CN, mas não no on-device |
| NO_ZH_CN | há serviço, mas sem mandarim |
| UNAVAILABLE | sem serviço de reconhecimento |

**Gravar e comparar precisa funcionar em todos os estados.** É um modo de prática válido, não um "erro fallback".

## Classificação de falhas

A classificação vem de `classifyFailure` e exige evidência. Nunca é automática para nenhum dos lados.

| Classe | Quando |
| --- | --- |
| LONGYU_BUG | padrão sem evidência; sempre para Gravar e comparar, auth, lição, navegação e ciclo de vida |
| DEVICE_CAPABILITY_LIMITATION | sem zh-CN (reconhecimento) ou sem voz zh-CN (TTS), com probe |
| ANDROID_SERVICE_LIMITATION | sem serviço e sem on-device, com probe |
| NETWORK_DEPENDENCY | offline informado pelo probe + erro de rede |
| CONFIGURATION_ERROR | volume de mídia zerado ou microfone negado |

Sem `if (brand === "Samsung")`. Correção só por capacidade, comportamento de API ou serviço detectado, salvo evidência inequívoca.
