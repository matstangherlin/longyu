/**
 * RC2.2.22 — estado FORMAL da Closed Beta.
 *
 *   NOT_READY → PRE_CANDIDATE → CANDIDATE → CLOSED_BETA_READY
 *
 * PRE_CANDIDATE     código, segurança e build Android verdes.
 * CANDIDATE         + sem P0, sem P1 que bloqueia release, voz própria
 *                   audível, TTS nas superfícies críticas, cadastro e
 *                   recuperação de senha no aparelho, sem beco sem saída em
 *                   lição crítica.
 * CLOSED_BETA_READY + avanço de lição, orientação e ciclo de vida no
 *                   aparelho, instalação pela Play (Internal), update
 *                   N→N+1 pela Play e matriz física crítica.
 *
 * Função pura: recebe as evidências e devolve o estado + os bloqueios. Nada
 * aqui "promove" estado sozinho: CODE PASS nunca vira PHYSICAL PASS, screenshot
 * automatizado ou formulário de feedback não são prova física, e APK de
 * debug/QA não é instalação pela Play.
 */
export const READINESS_STATES = ["NOT_READY", "PRE_CANDIDATE", "CANDIDATE", "CLOSED_BETA_READY"] as const;
export type ReadinessState = (typeof READINESS_STATES)[number];

export type CheckStatus = "PASS" | "FAIL" | "NOT_RUN" | "BLOCKED_OWNER_ACTION";

/** Só estes contam como prova FÍSICA (alguém viu/ouviu no aparelho). */
export const PHYSICAL_EVIDENCE_TYPES = ["OWNER_OBSERVED", "TESTER_OBSERVED", "SCREEN_RECORDING", "MANUAL_SCREENSHOT", "DIAGNOSTIC_TRACE"] as const;
/** Nunca contam como prova física, mesmo com status PASS. */
export const NON_PHYSICAL_EVIDENCE_TYPES = ["CODE", "E2E", "AUTOMATED_SCREENSHOT", "EMULATOR", "MOCK", "HUMAN_FEEDBACK_FORM", "SINGLE_FUNCTION_CALL"] as const;
export type EvidenceType = (typeof PHYSICAL_EVIDENCE_TYPES)[number] | (typeof NON_PHYSICAL_EVIDENCE_TYPES)[number];

/** Canal do build em que a evidência foi colhida. Play = só PLAY_INTERNAL/CLOSED. */
export const BUILD_CHANNELS = ["DEBUG_APK", "QA_APK", "PLAY_INTERNAL", "PLAY_CLOSED"] as const;
export type BuildChannel = (typeof BUILD_CHANNELS)[number];

export interface PhysicalCheck {
  status: CheckStatus;
  evidenceType?: EvidenceType | null;
  buildChannel?: BuildChannel | null;
  testedAt?: string | null;
  versionCode?: number | null;
}

export interface ReadinessInput {
  code: CheckStatus;
  security: { productionAudit: CheckStatus; fullAudit: CheckStatus; gitleaks: CheckStatus; codeql: CheckStatus };
  androidBuild: CheckStatus;
  bugs: { p0Open: number; releaseBlockingP1: number };
  criticalLessonDeadEnd: boolean;
  physical: {
    selfPlaybackAudible: PhysicalCheck;
    ttsCritical: PhysicalCheck;
    lessonAdvance: PhysicalCheck;
    mobileSignup: PhysicalCheck;
    passwordRecovery: PhysicalCheck;
    guidance: PhysicalCheck;
    lifecycle: PhysicalCheck;
  };
  play: { internalInstall: PhysicalCheck; nToNPlus1: PhysicalCheck };
  criticalPhysicalMatrix: CheckStatus;
}

export type ReadinessBlocker =
  | "CODE_NOT_GREEN"
  | "SECURITY_NOT_GREEN"
  | "ANDROID_BUILD_NOT_GREEN"
  | "P0_OPEN"
  | "RELEASE_BLOCKING_P1_OPEN"
  | "CRITICAL_LESSON_DEAD_END"
  | "SELF_PLAYBACK_NOT_PROVEN"
  | "TTS_CRITICAL_NOT_PROVEN"
  | "MOBILE_SIGNUP_NOT_PROVEN"
  | "PASSWORD_RECOVERY_NOT_PROVEN"
  | "LESSON_ADVANCE_NOT_PROVEN"
  | "GUIDANCE_NOT_PROVEN"
  | "LIFECYCLE_NOT_PROVEN"
  | "PLAY_INTERNAL_INSTALL_NOT_PROVEN"
  | "N_TO_N_PLUS_1_NOT_PROVEN"
  | "CRITICAL_PHYSICAL_MATRIX_NOT_PASS";

/** PASS físico = PASS + evidência física + data (nunca código, E2E, formulário). */
export function physicalPass(check: PhysicalCheck | null | undefined): boolean {
  if (!check || check.status !== "PASS" || !check.testedAt) return false;
  return (PHYSICAL_EVIDENCE_TYPES as readonly string[]).includes(String(check.evidenceType ?? ""));
}

/** PASS pela Play = PASS físico colhido num build distribuído pela Play (não APK de debug/QA). */
export function playPass(check: PhysicalCheck | null | undefined): boolean {
  if (!physicalPass(check)) return false;
  return check!.buildChannel === "PLAY_INTERNAL" || check!.buildChannel === "PLAY_CLOSED";
}

export function securityGreen(security: ReadinessInput["security"]): boolean {
  return security.productionAudit === "PASS" && security.fullAudit === "PASS" && security.gitleaks === "PASS" && security.codeql === "PASS";
}

export function evaluateReadiness(input: ReadinessInput): { state: ReadinessState; blockers: ReadinessBlocker[] } {
  const engineering: ReadinessBlocker[] = [];
  if (input.code !== "PASS") engineering.push("CODE_NOT_GREEN");
  if (!securityGreen(input.security)) engineering.push("SECURITY_NOT_GREEN");
  if (input.androidBuild !== "PASS") engineering.push("ANDROID_BUILD_NOT_GREEN");

  const candidate: ReadinessBlocker[] = [];
  if (!(input.bugs.p0Open === 0)) candidate.push("P0_OPEN");
  if (!(input.bugs.releaseBlockingP1 === 0)) candidate.push("RELEASE_BLOCKING_P1_OPEN");
  if (input.criticalLessonDeadEnd) candidate.push("CRITICAL_LESSON_DEAD_END");
  if (!physicalPass(input.physical.selfPlaybackAudible)) candidate.push("SELF_PLAYBACK_NOT_PROVEN");
  if (!physicalPass(input.physical.ttsCritical)) candidate.push("TTS_CRITICAL_NOT_PROVEN");
  if (!physicalPass(input.physical.mobileSignup)) candidate.push("MOBILE_SIGNUP_NOT_PROVEN");
  if (!physicalPass(input.physical.passwordRecovery)) candidate.push("PASSWORD_RECOVERY_NOT_PROVEN");

  const ready: ReadinessBlocker[] = [];
  if (!physicalPass(input.physical.lessonAdvance)) ready.push("LESSON_ADVANCE_NOT_PROVEN");
  if (!physicalPass(input.physical.guidance)) ready.push("GUIDANCE_NOT_PROVEN");
  if (!physicalPass(input.physical.lifecycle)) ready.push("LIFECYCLE_NOT_PROVEN");
  if (!playPass(input.play.internalInstall)) ready.push("PLAY_INTERNAL_INSTALL_NOT_PROVEN");
  if (!playPass(input.play.nToNPlus1)) ready.push("N_TO_N_PLUS_1_NOT_PROVEN");
  if (input.criticalPhysicalMatrix !== "PASS") ready.push("CRITICAL_PHYSICAL_MATRIX_NOT_PASS");

  const blockers = [...engineering, ...candidate, ...ready];
  if (engineering.length) return { state: "NOT_READY", blockers };
  if (candidate.length) return { state: "PRE_CANDIDATE", blockers };
  if (ready.length) return { state: "CANDIDATE", blockers };
  return { state: "CLOSED_BETA_READY", blockers };
}
