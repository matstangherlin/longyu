export function masteryPlanOverlap(a, b) {
  const signatures = (plan) => new Set(plan.map((step) => JSON.stringify([
    step.kind,
    step.correctAnswer ?? step.answer ?? step.audioText ?? step.title ?? "",
  ])));
  const left = signatures(a);
  const right = signatures(b);
  if (!left.size || !right.size) return 0;
  const shared = [...left].filter((signature) => right.has(signature)).length;
  return shared / Math.max(left.size, right.size);
}
