let rewardClaimInProgress = false;

export function setRewardClaimInProgress(active: boolean): void {
  rewardClaimInProgress = active;
}

export function isRewardClaimInProgress(): boolean {
  return rewardClaimInProgress;
}

export function isLessonFocusPath(pathname: string): boolean {
  return /^\/licao\/[^/]+\/player$/.test(pathname) || pathname.startsWith("/teste/");
}

export function isCheckoutFlowActive(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has("checkout");
}
