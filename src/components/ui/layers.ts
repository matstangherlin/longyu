/**
 * Mapa de camadas visuais do app. Não use z-index solto: escolha um nome daqui.
 *
 * page        conteúdo rolável
 * bottomNav   TabBar mobile
 * feedbackFab botão Feedback (desktop)
 * toast       avisos transitórios (economia, claim)
 * sheet       folhas da TabBar / menus
 * modal       dialogs, paywall, baú, celebração
 */
export const Z_LAYERS = {
  page: 0,
  bottomNav: 30,
  feedbackFab: 35,
  toast: 40,
  sheet: 70,
  modal: 80,
} as const;

export type ZLayer = keyof typeof Z_LAYERS;

/** Classes Tailwind que batem com Z_LAYERS. Evita z-30/z-40/z-50 espalhados. */
export const zLayerClass: Record<ZLayer, string> = {
  page: "z-0",
  bottomNav: "z-[30]",
  feedbackFab: "z-[35]",
  toast: "z-[40]",
  sheet: "z-[70]",
  modal: "z-[80]",
};
