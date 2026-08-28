import { t } from "../../i18n/catalog";
import type { SupportedLocale } from "../../i18n/config";
import { catalogQuestionKey, isCanonicalOptionId, optionLabelForLocale } from "./optionIdentity";
import type { PlacementAnalysis, QuizQuestion } from "./types";

export function placementPromptKey(questionId: string): string {
  return `placement.prompt.${catalogQuestionKey(questionId)}`;
}

export function placementGlossKey(hanzi: string): string | null {
  const map: Record<string, string> = {
    你好: "nihao",
    谢谢: "xiexie",
    不: "bu",
    好: "hao",
    我: "wo",
    你: "ni",
    三: "san",
    再见: "zaijian",
    "你好吗？": "nihaoma",
    我是巴西人: "woshiBrazilian",
    我听不懂: "tingbudong",
    我不会说中文: "buhuiShuo",
    请再说一遍: "qingZaiShuo",
    "这个多少钱？": "zhegeDuoshao",
    妈: "ma1",
    马: "ma3",
    明: "ming",
    林: "lin",
    中国: "zhongguo",
    认识你很高兴: "niceMeet",
  };
  return map[hanzi] ? `placement.gloss.${map[hanzi]}` : null;
}

export function placementPrompt(question: QuizQuestion, locale?: SupportedLocale): string {
  const key = placementPromptKey(question.id);
  const value = t(key, undefined, locale);
  return value === key ? question.prompt : value;
}

export function placementOptionLabel(optionId: string, locale: SupportedLocale = "pt-BR"): string {
  if (isCanonicalOptionId(optionId)) return optionId;
  const key = `placement.opt.${optionId}`;
  const value = t(key, undefined, locale);
  return value === key ? optionLabelForLocale(optionId, locale) : value;
}

export function localizedPlacementHeading(analysis: PlacementAnalysis, locale?: SupportedLocale): string {
  const key = `placement.label.${analysis.placement.labelId}`;
  const value = t(key, undefined, locale);
  return value === key ? analysis.placement.label : value;
}

export function localizedPlacementMessage(analysis: PlacementAnalysis, locale?: SupportedLocale): string {
  const key = `placement.result.${analysis.resultMessageId}`;
  const base = t(key, undefined, locale);
  const resolved = base === key ? analysis.resultMessage : base;
  if (!analysis.foundationGate) return resolved;
  const gate = t("placement.result.foundationGate", undefined, locale);
  if (analysis.resultMessage.includes(gate) || resolved.includes(gate)) return resolved;
  return `${resolved} ${gate}`;
}
