/**
 * Registro de verdade do produto (P22–P24).
 *
 * Uma tela que diz "disponível" sobre algo que ninguém consegue comprar não é
 * otimismo, é dívida: quem lê acredita, tenta, falha e escreve para o suporte.
 * Este arquivo é a única fonte do que cada oferta comercial realmente é hoje,
 * e as telas leem daqui em vez de afirmarem por conta própria.
 *
 * Três estados, e a diferença entre eles é operacional, não de vontade:
 *
 * - `available`: qualquer pessoa consegue usar hoje, sozinha.
 * - `pilot`: funciona, mas o acesso é provisionado por contrato — ninguém
 *   entra sem alguém do Longyu provisionar.
 * - `planned`: construído ou não, não dá para obter hoje.
 *
 * `gatedBy` aponta para o check operacional que precisa passar de verdade
 * antes de a oferta poder subir para `available`. O gate confere isso contra
 * docs/release/rc1-operational-checks.json — então nenhum item que dependa de
 * pagamento consegue se declarar disponível enquanto o Stripe não foi
 * exercitado em Test Mode com evidência real.
 */

export const PRODUCT_AVAILABILITY = ["available", "pilot", "planned"] as const;
export type ProductAvailability = (typeof PRODUCT_AVAILABILITY)[number];

export interface ProductCapability {
  readonly id: string;
  readonly availability: ProductAvailability;
  /** Check operacional que precisa passar antes de virar `available`. */
  readonly gatedBy?: string;
  /** Por que este é o estado hoje. Aparece em relatório, não na tela. */
  readonly because: string;
}

export const PRODUCT_TRUTH = {
  journey: {
    id: "journey",
    availability: "available",
    because: "134 lições no ar, congeladas em RC1.",
  },
  free_plan: {
    id: "free_plan",
    availability: "available",
    because: "O caminho gratuito não depende de cobrança.",
  },
  pro_individual: {
    id: "pro_individual",
    availability: "planned",
    gatedBy: "stripe_test_mode_e2e",
    because: "Preço aprovado e checkout escrito; nenhum slot de Price ID exercitado de verdade ainda.",
  },
  family_plan: {
    id: "family_plan",
    availability: "planned",
    gatedBy: "stripe_test_mode_e2e",
    because: "Assentos, convite e entitlement prontos no servidor; falta poder comprar a assinatura.",
  },
  business_workspace: {
    id: "business_workspace",
    availability: "pilot",
    because: "Licença e painel funcionam, mas a organização é provisionada por contrato, não por autoatendimento.",
  },
  enterprise_plan: {
    id: "enterprise_plan",
    availability: "planned",
    because: "Implantação personalizada: cada caso passa por vendas antes de existir no produto.",
  },
} as const satisfies Record<string, ProductCapability>;

export type ProductCapabilityId = keyof typeof PRODUCT_TRUTH;

export function productAvailability(id: ProductCapabilityId): ProductAvailability {
  return PRODUCT_TRUTH[id].availability;
}

/** Chave de copy do rótulo. A tela nunca escreve "disponível" à mão. */
export function availabilityLabelKey(availability: ProductAvailability): string {
  return `pro.availability${availability.charAt(0).toUpperCase()}${availability.slice(1)}`;
}

/**
 * Um plano só oferece compra quando está disponível de verdade.
 *
 * Isto é diferente de "o slot tem Price ID": o slot é configuração de
 * ambiente, esta é a promessa do produto. As duas precisam ser verdade.
 */
export function canOfferPurchase(id: ProductCapabilityId): boolean {
  return PRODUCT_TRUTH[id].availability === "available";
}
