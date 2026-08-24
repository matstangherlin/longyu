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
}

export const STRUCTURE_EXPOSURE_RUNG_BITS = ["exposed", "completion", "build", "guidedProduction"] as const;

export const PRECOMPUTED_STRUCTURE_EXPOSURE: Record<string, PrecomputedLessonExposure> = {
  "p1-o-que-e-mandarim": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p1-o-que-e-pinyin": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p1-o-que-e-tom": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p1-o-que-e-hanzi": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p1-primeiros-hanzi": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p1-engine-2-lab": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l1": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l2": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l3": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l1-rev": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l4": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p1-ate-logo": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p1-primeira-conversa": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p1-qingwen-cortesia": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l2-rev": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p2-ma-primeiro-tom": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p2-ma-segundo-tom": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p3-wohenhao": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p2-ma-terceiro-tom": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p2-ma-quarto-tom": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p2-tons-nihao": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p2-comparar-tom-1-4": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p2-comparar-tom-2-3": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p2-tons-xiexie": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l5": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l6": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l3-rev": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l7": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l8": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l8-compare": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l8-shi": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p2-sons-brasileiros": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p2-numeros-1-5": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l4-rev": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l9": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l9-tudo-bem": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l9-qual-nome": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "l10": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p3-wobuhui-shuo-zhongwen": {
    "free": {},
    "transfer": {},
    "priorTransferred": []
  },
  "p3-qing-zai-shuo-yibian": {
    "free": {
      "frame_zainali": 1
    },
    "transfer": {
      "frame_zainali": 1
    },
    "priorTransferred": []
  },
  "l11": {
    "free": {
      "frame_zainali": 1
    },
    "transfer": {
      "frame_zainali": 1
    },
    "priorTransferred": []
  },
  "l11-falo-pouco": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 7
    },
    "transfer": {
      "frame_zainali": 1
    },
    "priorTransferred": []
  },
  "l12": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "priorTransferred": []
  },
  "l13": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "priorTransferred": []
  },
  "l13-dialogo-ola": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "priorTransferred": []
  },
  "l13-dialogo-nome": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 7
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15
    },
    "priorTransferred": []
  },
  "p3-ordem-das-palavras": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": []
  },
  "p3-nomes-da-frase": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l5-rev": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l14": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-num-123": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-num-45": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-num-678": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-num-910": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-mu": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-ren": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-kou": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-ri": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-yue": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-shan": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-shui": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-tian": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-huo": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-da": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-xiao": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-zhong": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-bu": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-shi": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-wo": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-char-ni": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l14-numeros-visuais": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l14-pecas-natureza": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l14-frase-minima": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l14-char-rev": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l15": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l6-rev": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l16": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l17": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l18": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l7-rev": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p4-checkpoint-fundamentos": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p5-mu-mu-lin": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p5-mu-mu-mu-sen": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p5-ri-yue-ming": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p5-ren-mu-xiu": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p5-nv-zi-hao": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p5-ren-ren-cong": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p5-ren-ren-ren-zhong": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p5-nv-ma-mae": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "p5-kou-ma-pergunta": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l19-logica-madeira": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l19-logica-luz": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l19-logica-pessoas": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l19-logica-ma": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l19-logica-rev": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l19": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l20": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l8-rev": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l21": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l22": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l23": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l9-rev": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l24": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l25": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1,
      "frame_qingwenzainali": 1
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l26": {
    "free": {
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
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 1,
      "frame_woxianghe": 1,
      "frame_qingwenzainali": 1
    },
    "priorTransferred": [
      "frame_woyouge"
    ]
  },
  "l26b": {
    "free": {
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
      "frame_woyouge",
      "frame_wozai"
    ]
  },
  "l27": {
    "free": {
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
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai"
    ]
  },
  "l28": {
    "free": {
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
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai"
    ]
  },
  "p6-rotina-trabalho": {
    "free": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 7,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15
    },
    "priorTransferred": [
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai"
    ]
  },
  "p6-cidade-lugares": {
    "free": {
      "frame_zainali": 7,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15,
      "frame_woqu": 7
    },
    "transfer": {
      "frame_zainali": 1,
      "frame_wozai": 15,
      "frame_woyouge": 15,
      "frame_woyao": 15,
      "frame_woxianghe": 15,
      "frame_qingwenzainali": 1,
      "frame_woxihuan": 15,
      "frame_wo_le": 15,
      "frame_niyaoma": 15,
      "frame_woxiangchi": 15
    },
    "priorTransferred": [
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai"
    ]
  },
  "p6-china-cidades": {
    "free": {
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
      "frame_woqu": 7
    },
    "transfer": {
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
      "frame_woqu": 7
    },
    "priorTransferred": [
      "frame_wo_le",
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai"
    ]
  },
  "p6-china-cidades-2": {
    "free": {
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
      "frame_wo_le",
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ]
  },
  "p6-china-ruas": {
    "free": {
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
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ]
  },
  "p6-saude": {
    "free": {
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
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ]
  },
  "p6-horarios": {
    "free": {
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
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ]
  },
  "p6-natureza": {
    "free": {
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
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ]
  },
  "p6-clima": {
    "free": {
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
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ]
  },
  "p6-direcoes": {
    "free": {
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
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ]
  },
  "p6-compras": {
    "free": {
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
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ]
  },
  "p6-survival-mandarin": {
    "free": {
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
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ]
  },
  "l10-rev": {
    "free": {
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
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ]
  },
  "l29": {
    "free": {
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
      "frame_wo_le",
      "frame_woqu",
      "frame_woxiangchi",
      "frame_woxianghe",
      "frame_woxihuan",
      "frame_woyao",
      "frame_woyouge",
      "frame_wozai",
      "frame_zainali"
    ]
  },
  "l30": {
    "free": {
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
    ]
  },
  "l11-rev": {
    "free": {
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
    ]
  },
  "p7-imersao-mercado": {
    "free": {
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
    ]
  },
  "p7-imersao-estacao": {
    "free": {
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
    ]
  },
  "p7-imersao-casa-amigo": {
    "free": {
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
    ]
  }
};
