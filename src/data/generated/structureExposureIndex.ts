// GERADO POR scripts/build-structure-exposure-index.mjs — não editar à mão.
//
// V3.9 · PERF-012 — índice de exposição estrutural pré-computado.
//
// Montar este índice em runtime custava ~12 s de CPU síncrona (plano de prática
// das 127 lições) só para abrir UMA lição — o congelamento visto no Android.
// Como ele depende apenas de dados estáticos da jornada, é resolvido no build.
//
// Degraus codificados como máscara de bits, na ordem:
//   1 = exposed · 2 = completion · 4 = build · 8 = guidedProduction
//
// Regenerar: npm run build:structure-index
// Conferir:  npm run validate:structure-index

export interface PrecomputedLessonExposure {
  free: Record<string, number>;
  transfer: Record<string, number>;
  priorTransferred: string[];
  priorTransferTargets: string[];
}

export const STRUCTURE_EXPOSURE_RUNG_BITS = ["exposed", "completion", "build", "guidedProduction"] as const;

export const PRECOMPUTED_STRUCTURE_EXPOSURE: Record<string, PrecomputedLessonExposure> = {
  "p1-o-que-e-mandarim": {
    "free": {},
    "transfer": {},
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "p1-o-que-e-pinyin": {
    "free": {},
    "transfer": {},
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "p1-o-que-e-tom": {
    "free": {},
    "transfer": {},
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "p1-o-que-e-hanzi": {
    "free": {},
    "transfer": {},
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "p1-primeiros-hanzi": {
    "free": {},
    "transfer": {},
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "p1-engine-2-lab": {
    "free": {},
    "transfer": {},
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "l1": {
    "free": {},
    "transfer": {},
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "l2": {
    "free": {
      "frame_nijiaoshenme": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 1
    },
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "l3": {
    "free": {
      "frame_nijiaoshenme": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 1
    },
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "l1-rev": {
    "free": {
      "frame_nijiaoshenme": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 1
    },
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "l4": {
    "free": {
      "frame_nijiaoshenme": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 1
    },
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "p1-ate-logo": {
    "free": {
      "frame_nijiaoshenme": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 1
    },
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "p1-primeira-conversa": {
    "free": {
      "frame_nijiaoshenme": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 1
    },
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "p1-qingwen-cortesia": {
    "free": {
      "frame_nijiaoshenme": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15
    },
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "l2-rev": {
    "free": {
      "frame_nijiaoshenme": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15
    },
    "priorTransferred": [],
    "priorTransferTargets": []
  },
  "p2-ma-primeiro-tom": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p2-ma-segundo-tom": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p3-wohenhao": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p2-ma-terceiro-tom": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p2-ma-quarto-tom": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p2-tons-nihao": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p2-comparar-tom-1-4": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p2-comparar-tom-2-3": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p2-tons-xiexie": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l5": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l6": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l3-rev": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l7": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l8": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l8-compare": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l8-shi": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p2-sons-brasileiros": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p2-numeros-1-5": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l4-rev": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l9": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l9-tudo-bem": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l9-qual-nome": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l10": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p3-wobuhui-shuo-zhongwen": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p3-qing-zai-shuo-yibian": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l11": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l11-falo-pouco": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 7
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l12": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l13": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l13-dialogo-ola": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l13-dialogo-nome": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 7
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p3-ordem-das-palavras": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 7
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 7
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "p3-nomes-da-frase": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme"
    ],
    "priorTransferTargets": [
      "请问你叫什么"
    ]
  },
  "l5-rev": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l14": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-num-123": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-num-45": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-num-678": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-num-910": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-mu": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-ren": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-kou": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-ri": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-yue": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-shan": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-shui": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-tian": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-huo": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-da": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-xiao": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-zhong": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-bu": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-shi": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-wo": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-char-ni": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l14-numeros-visuais": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l14-pecas-natureza": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l14-frase-minima": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l14-char-rev": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l15": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l6-rev": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l16": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l17": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l18": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l7-rev": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p4-checkpoint-fundamentos": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p5-mu-mu-lin": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p5-mu-mu-mu-sen": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p5-ri-yue-ming": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p5-ren-mu-xiu": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p5-nv-zi-hao": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p5-ren-ren-cong": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p5-ren-ren-ren-zhong": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p5-nv-ma-mae": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "p5-kou-ma-pergunta": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l19-logica-madeira": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l19-logica-luz": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "请问你叫什么"
    ]
  },
  "l19-logica-pessoas": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l19-logica-ma": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l19-logica-rev": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l19": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l20": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l8-rev": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l21": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l22": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l23": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l9-rev": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l24": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l25": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1,
      "frame_qingwenzainali": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l26": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 7,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 7,
      "frame_wo_le": 7
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1,
      "frame_qingwenzainali": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge"
    ],
    "priorTransferTargets": [
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l26b": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 7,
      "frame_woxianghe": 7,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_woxiangchi": 7,
      "frame_niyaoma": 7
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 7,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woyouge",
      "frame_wozai"
    ],
    "priorTransferTargets": [
      "我在喝水",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l27": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 7,
      "frame_woxianghe": 7,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 7,
      "frame_woxianghe": 7,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai"
    ],
    "priorTransferTargets": [
      "我喜欢中国",
      "我在喝水",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "l28": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 7,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 7,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai"
    ],
    "priorTransferTargets": [
      "我喜欢中国",
      "我喜欢茶",
      "我在喝水",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "p6-rotina-trabalho": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai"
    ],
    "priorTransferTargets": [
      "我喜欢中国",
      "我喜欢茶",
      "我在吃饭",
      "我在喝水",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "p6-cidade-lugares": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 7,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7,
      "frame_woqu": 7
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai"
    ],
    "priorTransferTargets": [
      "我喜欢中国",
      "我喜欢茶",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "p6-china-cidades": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 7,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7,
      "frame_woqu": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 7,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7,
      "frame_woqu": 15
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai"
    ],
    "priorTransferTargets": [
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "p6-china-cidades-2": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 7,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woqu",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai"
    ],
    "priorTransferTargets": [
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么"
    ]
  },
  "p6-china-ruas": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woqu",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么",
      "车站在哪里"
    ]
  },
  "p6-saude": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃鱼",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "请问你叫什么",
      "车站在哪里"
    ]
  },
  "p6-horarios": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃鱼",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "请问你叫什么",
      "车站在哪里"
    ]
  },
  "p6-natureza": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃鱼",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "请问你叫什么",
      "车站在哪里"
    ]
  },
  "p6-clima": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃肉",
      "我想吃鱼",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "请问你叫什么",
      "车站在哪里"
    ]
  },
  "p6-direcoes": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃肉",
      "我想吃鱼",
      "我想喝热水",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "请问你叫什么",
      "车站在哪里"
    ]
  },
  "p6-compras": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 7,
      "frame_woyaomai": 7
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 1
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我今天去超市",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃肉",
      "我想吃鱼",
      "我想喝热水",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "请问你叫什么",
      "车站在哪里"
    ]
  },
  "p6-survival-mandarin": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 7
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 7
    },
    "priorTransferred": [
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我今天去超市",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃肉",
      "我想吃鱼",
      "我想喝热水",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "我要热水",
      "请问你叫什么",
      "车站在哪里"
    ]
  },
  "l10-rev": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "priorTransferred": [
      "frame_duoshaoqian",
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我今天去超市",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃肉",
      "我想吃鱼",
      "我想喝热水",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "我要热水",
      "请问你叫什么",
      "车站在哪里",
      "香蕉多少钱"
    ]
  },
  "l29": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "priorTransferred": [
      "frame_duoshaoqian",
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我今天去超市",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃肉",
      "我想吃鱼",
      "我想喝热水",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "我要热水",
      "请问你叫什么",
      "车站在哪里",
      "香蕉多少钱"
    ]
  },
  "l30": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "priorTransferred": [
      "frame_duoshaoqian",
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyaomai",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我今天去超市",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃肉",
      "我想吃鱼",
      "我想喝热水",
      "我明天去医院",
      "我有一个朋友",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "我要买书",
      "我要热水",
      "请问你叫什么",
      "车站在哪里",
      "香蕉多少钱"
    ]
  },
  "l11-rev": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "priorTransferred": [
      "frame_duoshaoqian",
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyaomai",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我今天去超市",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃肉",
      "我想吃鱼",
      "我想喝热水",
      "我明天去医院",
      "我有一个朋友",
      "我有一个香蕉",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "我要买书",
      "我要热水",
      "请问你叫什么",
      "车站在哪里",
      "香蕉多少钱"
    ]
  },
  "p7-imersao-mercado": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "priorTransferred": [
      "frame_duoshaoqian",
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyaomai",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我今天去超市",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃肉",
      "我想吃鱼",
      "我想喝热水",
      "我明天去医院",
      "我有一个朋友",
      "我有一个香蕉",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "我要买书",
      "我要热水",
      "请问你叫什么",
      "车站在哪里",
      "香蕉多少钱"
    ]
  },
  "p7-imersao-estacao": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "priorTransferred": [
      "frame_duoshaoqian",
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyaomai",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我今天去超市",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃肉",
      "我想吃鱼",
      "我想喝热水",
      "我明天去医院",
      "我有一个朋友",
      "我有一个香蕉",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "我要买书",
      "我要热水",
      "衣服多少钱",
      "请问你叫什么",
      "车站在哪里",
      "香蕉多少钱"
    ]
  },
  "p7-imersao-casa-amigo": {
    "free": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15,
      "frame_huijia_action": 1
    },
    "transfer": {
      "frame_nijiaoshenme": 15,
      "frame_qingwennijiaoshenme": 9,
      "frame_zainali": 15,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 15,
      "frame_duoshaoqian": 15,
      "frame_woyaomai": 15
    },
    "priorTransferred": [
      "frame_duoshaoqian",
      "frame_qingwennijiaoshenme",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyaomai",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ],
    "priorTransferTargets": [
      "我今天去医院",
      "我今天去超市",
      "我喜欢中国",
      "我喜欢茶",
      "我喜欢鱼",
      "我在吃饭",
      "我在喝水",
      "我在睡觉",
      "我想吃肉",
      "我想吃鱼",
      "我想喝热水",
      "我明天去医院",
      "我明天去银行",
      "我有一个朋友",
      "我有一个香蕉",
      "我有五个朋友",
      "我有四个朋友",
      "我睡觉了",
      "我要买书",
      "我要热水",
      "衣服多少钱",
      "请问你叫什么",
      "车站在哪里",
      "香蕉多少钱"
    ]
  }
};
