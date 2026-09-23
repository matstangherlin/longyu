/**
 * RC2.2.8 — validate:pearl-shop-utility
 * H — Pérolas com utilidade. Contrato de código; os casos de runtime e as mutações moram em
 * scripts/test-*.mjs e em scripts/lib/rc2-2-8-gates.mjs.
 */
import { gatePearlShop, runGate } from "./lib/rc2-2-8-gates.mjs";

runGate("validate:pearl-shop-utility", gatePearlShop);
