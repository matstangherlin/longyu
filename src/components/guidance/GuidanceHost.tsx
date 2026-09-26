import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../lib/store";
import { useFeatureVisibility } from "../../hooks/useProgressiveDiscovery";
import {
  GUIDANCE_RENDER_EVIDENCE_MS,
  GUIDANCE_RENDER_TIMEOUT_MS,
  applyGuidanceAction,
  guidanceRecordProvesRender,
  initializeGuidanceState,
  recordGuidanceRendered,
  recordShownInSession,
  recordSnoozedInSession,
  rememberAvailability,
  routeForFeature,
  selectGuidance,
  type GuidanceAction,
  type GuidanceContext,
  type GuidancePresentation,
} from "../../lib/guidanceOrchestrator";
import { featureForPath } from "../../lib/progressiveDiscovery";
import { computeCoachmarkPosition, type CoachmarkPosition } from "../../lib/coachmarkPosition";
import { holdCelebration, isCelebrationActive } from "../../lib/celebrationLock";
import { isNativeApp } from "../../lib/platform/nativePlatform";
import { notificationPermission, requestNotificationPermission } from "../../lib/platform/nativeNotifications";
import { hapticOnce } from "../../lib/haptics";
import { playSoundFx } from "../../lib/soundFx";
import { trackFunnelEvent } from "../../services/funnelEvents";
import { allowSeededLocalSession } from "../../lib/auth/localAuthPolicy";
import { useTranslation } from "../../i18n/useTranslation";
import type { MessageKey } from "../../locales/pt-BR";
import { Mascot } from "../brand/Mascot";
import { Button, cx } from "../ui/primitives";
import { zLayerClass } from "../ui/layers";
import {
  getCurrentGuidance,
  getGuidanceSession,
  isGuidanceEvidenceCommitted,
  markGuidanceEvidenceCommitted,
  reportGuidanceVisible,
  setCurrentGuidance,
  setGuidanceSession,
  useGuidanceRuntime,
} from "./guidanceRuntime";

/** Espera a tela assentar antes de orientar (nada de piscar durante o render). */
const SETTLE_MS = 700;
const GUIDANCE_CEREMONY_ID = "guidance";

function isTypingTarget(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "range", "submit", "reset", "color", "file"].includes(element.type);
  }
  return element instanceof HTMLTextAreaElement || (element as HTMLElement).isContentEditable === true;
}

/** Outro modal (medalha, selo, ofensiva, consentimento, paywall…) aberto. */
function otherOverlayOpen(): boolean {
  if (isCelebrationActive(GUIDANCE_CEREMONY_ID)) return true;
  if (typeof document === "undefined") return false;
  if (document.documentElement.dataset.lessonPlayer) return true;
  const modal = document.querySelector('[aria-modal="true"]');
  return Boolean(modal && !modal.closest("[data-guidance-surface]"));
}

function collectAnchors(): Set<string> {
  const anchors = new Set<string>();
  if (typeof document === "undefined") return anchors;
  document.querySelectorAll<HTMLElement>("[data-coachmark-target]").forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) anchors.add(element.dataset.coachmarkTarget ?? "");
  });
  return anchors;
}

/** Erros de tom parecidos na atividade mais recente (sinal que já existe). */
function useRecentToneConfusions(): number {
  const errors = useStore((s) => s.recentActivityErrors) ?? [];
  return useMemo(() => {
    const last = errors[errors.length - 1];
    if (!last) return 0;
    return errors.filter((error) => error.lessonId === last.lessonId && /tone/i.test(error.type)).length;
  }, [errors]);
}

/**
 * Sessões LOCAIS semeadas pelos E2E (só em builds não-production, com a flag de
 * dev) começam sem orientação, para que ~900 testes de fluxo não disputem
 * clique com um coachmark; os specs de orientação ligam com
 * `longyu:e2e-guidance=on`. Em Production Beta isto é sempre falso.
 */
function guidanceSuppressedForSeededE2E(): boolean {
  if (!allowSeededLocalSession()) return false;
  try {
    return localStorage.getItem("longyu:e2e-guidance") !== "on";
  } catch {
    return false;
  }
}

/**
 * RC2.2.18 — o ÚNICO lugar que abre orientação (PART N). Fica fora do modo
 * foco (AppShell não o monta em lição, prova ou treino ativo) e ainda confere
 * no momento de mostrar: teclado, outro modal, âncora na tela.
 */
export function GuidanceHost() {
  const [suppressed] = useState(guidanceSuppressedForSeededE2E);
  return suppressed ? null : <GuidanceHostInner />;
}

function GuidanceHostInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const { visibility, ready, learner } = useFeatureVisibility();
  const guidance = useStore((s) => s.guidance);
  const updateGuidance = useStore((s) => s.updateGuidance);
  const soundEffects = useStore((s) => s.soundEffects);
  const recentToneConfusions = useRecentToneConfusions();
  const { current, visibleSince } = useGuidanceRuntime();
  const [inputFocused, setInputFocused] = useState(() => isTypingTarget(typeof document === "undefined" ? null : document.activeElement));
  const [anchors, setAnchors] = useState<Set<string>>(() => new Set());
  const [notificationPromptable, setNotificationPromptable] = useState(false);
  const [tick, setTick] = useState(0);
  const native = isNativeApp();

  // Semente única por conta: o que já está liberado vira AUTO_SEEDED (nunca "visto").
  useEffect(() => {
    if (!ready || guidance?.initialized) return;
    updateGuidance((state) => initializeGuidanceState(state, visibility, learner, Date.now()));
  }, [ready, guidance?.initialized, updateGuidance, visibility, learner]);

  // RC2.2.19 — nunca re-trancar: memoriza (só cresce) o que já esteve disponível.
  useEffect(() => {
    if (!ready || !guidance?.initialized) return;
    updateGuidance((state) => rememberAvailability(state, visibility));
  }, [ready, guidance?.initialized, updateGuidance, visibility]);

  // PART DG — teclado/campo focado: nenhuma orientação.
  useEffect(() => {
    const update = () => setInputFocused(isTypingTarget(document.activeElement));
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);

  // As âncoras de coachmark presentes (a página renderiza de forma assíncrona).
  useEffect(() => {
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = collectAnchors();
        setAnchors((prev) => (prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next));
      });
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  // PART BO/BQ — só oferece lembrete se o SO ainda não decidiu (negado não volta).
  useEffect(() => {
    if (!native) return;
    let alive = true;
    void notificationPermission().then((permission) => {
      if (alive) setNotificationPromptable(permission === "prompt");
    });
    return () => {
      alive = false;
    };
  }, [native, pathname]);

  // Sair da superfície com a orientação aberta: fecha SEM gravar "visto".
  // Se ela ficou na tela tempo suficiente, o SHOWN já foi gravado com
  // evidência de render; se não, continua elegível (P1 GUIDANCE_NEVER_ACTUALLY_SHOWN).
  useEffect(() => {
    const shown = getCurrentGuidance();
    if (!shown || shown.definition.surfaces.includes(pathname)) return;
    setCurrentGuidance(null);
  }, [pathname]);

  // Evidência de render: visível por GUIDANCE_RENDER_EVIDENCE_MS → SHOWN + conta na sessão.
  useEffect(() => {
    if (!current || visibleSince == null || isGuidanceEvidenceCommitted()) return undefined;
    const wait = Math.max(0, visibleSince + GUIDANCE_RENDER_EVIDENCE_MS - Date.now());
    const timer = window.setTimeout(() => {
      if (getCurrentGuidance() !== current || isGuidanceEvidenceCommitted()) return;
      markGuidanceEvidenceCommitted();
      updateGuidance((state) => recordGuidanceRendered(state, current, Date.now()));
      setGuidanceSession(recordShownInSession(getGuidanceSession(), current));
      trackFunnelEvent("guidance_shown", { guidance_id: current.definition.id, kind: current.definition.kind, render_evidence: true });
    }, wait);
    return () => window.clearTimeout(timer);
  }, [current, visibleSince, updateGuidance]);

  // Nunca ficou visível (âncora sumiu, card fora da tela): desiste sem gastar a sessão.
  useEffect(() => {
    if (!current || visibleSince != null) return undefined;
    const timer = window.setTimeout(() => {
      if (getCurrentGuidance() !== current) return;
      setCurrentGuidance(null);
      trackFunnelEvent("guidance_render_failed", { guidance_id: current.definition.id, kind: current.definition.kind });
    }, GUIDANCE_RENDER_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [current, visibleSince]);

  // PART CD — aberto depois do desbloqueio (sem PII).
  useEffect(() => {
    const feature = featureForPath(pathname);
    if (!feature || visibility[feature] !== "AVAILABLE") return;
    const record = guidance?.records?.[`${feature}_unlocked_v1`];
    if (guidanceRecordProvesRender(record)) trackFunnelEvent("feature_opened_after_unlock", { feature });
  }, [pathname, visibility, guidance?.records]);

  const context = useMemo<GuidanceContext | null>(() => {
    if (!ready || !guidance?.initialized) return null;
    return {
      now: Date.now(),
      pathname,
      visibility,
      learner,
      state: guidance,
      session: getGuidanceSession(),
      activeLearning: false,
      inputFocused,
      otherCeremonyActive: false,
      anchorsPresent: anchors,
      isNative: native,
      notificationPermissionPromptable: notificationPromptable,
      recentToneConfusions,
    };
    // `tick` reavalia depois do assentamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, guidance, pathname, visibility, learner, inputFocused, anchors, native, notificationPromptable, recentToneConfusions, tick]);

  // Escolha: no máximo UMA, e só depois de a tela assentar.
  useEffect(() => {
    if (current || !context) return undefined;
    const candidate = selectGuidance(context);
    if (!candidate) return undefined;
    const timer = window.setTimeout(() => {
      // Confere de novo no instante de mostrar (PART K/DG/DQ).
      const fresh = selectGuidance({
        ...context,
        now: Date.now(),
        session: getGuidanceSession(),
        activeLearning: Boolean(document.documentElement.dataset.lessonPlayer),
        inputFocused: isTypingTarget(document.activeElement),
        otherCeremonyActive: otherOverlayOpen(),
        anchorsPresent: collectAnchors(),
      });
      if (!fresh || getCurrentGuidance()) {
        setTick((value) => value + 1);
        return;
      }
      // Escolher não é mostrar: a sessão e o SHOWN só contam com evidência de render.
      setCurrentGuidance(fresh);
      if (fresh.definition.priority === "FEATURE_UNLOCK") {
        for (const feature of fresh.listedFeatures) trackFunnelEvent("feature_unlocked", { feature });
        // PART CJ/CK — 1 haptic e um som discreto já existente; coachmark comum: nenhum.
        hapticOnce(`guidance:${fresh.definition.id}`, "achievementReveal");
        playSoundFx("bonus", soundEffects);
      }
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [context, current, soundEffects]);

  // Enquanto a orientação está na tela, medalha/selo/ofensiva esperam a vez.
  useEffect(() => {
    if (!current || current.definition.kind === "INLINE_TIP") return undefined;
    return holdCelebration(GUIDANCE_CEREMONY_ID);
  }, [current]);

  const act = useCallback(
    (action: GuidanceAction, route?: string) => {
      const shown = getCurrentGuidance();
      if (!shown) return;
      const now = Date.now();
      updateGuidance((state) => applyGuidanceAction(state, shown, action, now));
      // O toque prova que estava na tela: conta na sessão mesmo antes dos 1,2 s.
      setGuidanceSession(recordShownInSession(getGuidanceSession(), shown));
      if (action === "now_not") setGuidanceSession(recordSnoozedInSession(getGuidanceSession(), shown));
      setCurrentGuidance(null);
      trackFunnelEvent("guidance_dismissed", { guidance_id: shown.definition.id, action });
      if (action !== "primary") return;
      if (shown.definition.id === "notifications_offer_v1") {
        void requestNotificationPermission();
        return;
      }
      const destination = route ?? shown.definition.primaryTo;
      if (destination) navigate(destination);
    },
    [navigate, updateGuidance]
  );

  if (!current || current.definition.kind === "INLINE_TIP") return null;
  if (!current.definition.surfaces.includes(pathname)) return null;
  return current.definition.kind === "COACHMARK" ? (
    <GuidanceCoachmark presentation={current} onAction={act} />
  ) : (
    <GuidanceRevealCard
      presentation={current}
      onAction={act}
      onOpenFeature={(route) => act("primary", route)}
    />
  );
}

interface SurfaceProps {
  presentation: GuidancePresentation;
  onAction: (action: GuidanceAction) => void;
}

/** Escape (teclado) e VOLTAR do Android (mesmo caminho) fecham a orientação primeiro. */
function useEscapeDismiss(onAction: (action: GuidanceAction) => void, secondary: GuidanceAction) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onAction(secondary);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onAction, secondary]);
}

/**
 * RC2.2.19 — evidência de render: só conta quando o elemento está REALMENTE na
 * tela (tamanho > 0, dentro da viewport, sem `invisible`, opacidade > 0).
 * Confere a cada quadro até confirmar; nunca confia no simples "montou".
 */
function elementActuallyVisible(element: HTMLElement | null): boolean {
  if (!element || !element.isConnected) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  if (rect.bottom <= 0 || rect.top >= viewportHeight || rect.right <= 0 || rect.left >= viewportWidth) return false;
  const style = getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none" && Number.parseFloat(style.opacity || "1") > 0;
}

function useRenderEvidence(presentation: GuidancePresentation, ref: RefObject<HTMLElement>, ready: boolean) {
  useEffect(() => {
    if (!ready) return undefined;
    let frame = 0;
    let alive = true;
    const check = () => {
      if (!alive) return;
      if (elementActuallyVisible(ref.current)) {
        reportGuidanceVisible(presentation);
        return;
      }
      frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [presentation, ref, ready]);
}

/** DEV/QA: estado da evidência no DOM (`pending` → `visible` → `shown`). */
function useEvidenceAttr(): "pending" | "visible" | "shown" {
  const { visibleSince, evidenceCommitted } = useGuidanceRuntime();
  if (evidenceCommitted) return "shown";
  return visibleSince != null ? "visible" : "pending";
}

function focusPrimary(container: HTMLElement | null) {
  container?.querySelector<HTMLButtonElement>('[data-guidance-action="primary"]')?.focus({ preventScroll: true });
}

/**
 * RC2.2.19 — as quatro saídas em toda orientação: Entendi (primário) ·
 * Agora não · Pular dica · Pular dicas. As duas últimas são links discretos
 * (alvo ≥ 44 px), para o card continuar leve.
 */
function GuidanceButtons({ presentation, onAction }: SurfaceProps) {
  const { t } = useTranslation();
  const { definition } = presentation;
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <Button
          size="lg"
          className="min-h-12 flex-1"
          data-guidance-action="primary"
          onClick={() => onAction("primary")}
        >
          {t(definition.primaryKey)}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="min-h-12"
          data-guidance-action="now_not"
          onClick={() => onAction("now_not")}
        >
          {t("guidance.common.nowNot")}
        </Button>
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 text-xs text-ink-faint">
        <button type="button" className="min-h-12 px-3 underline-offset-2 hover:underline" data-guidance-action="skip" onClick={() => onAction("skip")}>
          {t("guidance.common.skip")}
        </button>
        <span aria-hidden>·</span>
        <button type="button" className="min-h-12 px-3 underline-offset-2 hover:underline" data-guidance-action="skip_all" onClick={() => onAction("skip_all")}>
          {t("guidance.common.skipAll")}
        </button>
      </div>
    </div>
  );
}

function GuidanceRevealCard({ presentation, onAction, onOpenFeature }: SurfaceProps & { onOpenFeature: (route: string) => void }) {
  const { t } = useTranslation();
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const { definition, listedFeatures } = presentation;
  const secondary: GuidanceAction = definition.secondary;
  useEscapeDismiss(onAction, secondary);

  useEffect(() => {
    focusPrimary(cardRef.current);
  }, []);

  useRenderEvidence(presentation, cardRef, true);
  const evidence = useEvidenceAttr();

  const unlock = definition.priority === "FEATURE_UNLOCK";
  return (
    <div
      ref={cardRef}
      data-guidance-surface="reveal"
      data-guidance-id={definition.id}
      data-guidance-render-evidence={evidence}
      data-native-back-dismiss
      role="dialog"
      aria-modal="false"
      aria-labelledby={definition.titleKey ? titleId : undefined}
      aria-describedby={bodyId}
      className={cx(
        "fixed inset-x-0 mx-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-line bg-surface p-4 shadow-lift longyu-guidance-in",
        zLayerClass.toast
      )}
      style={{ bottom: "calc(var(--app-bottom-nav-height, 0px) + var(--app-safe-bottom, 0px) + 12px)" }}
    >
      <div className="flex items-start gap-3">
        {definition.dragon ? (
          <span className={unlock ? "longyu-unlock-reveal shrink-0" : "shrink-0"}>
            <Mascot size={48} variant="celebrate" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {unlock && (
            <span className="inline-flex rounded-full bg-[rgb(var(--good)/0.14)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[rgb(var(--good))]">
              {t("guidance.common.newBadge")}
            </span>
          )}
          {definition.titleKey && (
            <h2 id={titleId} className="mt-1 text-base font-semibold text-ink">
              {t(definition.titleKey)}
            </h2>
          )}
          <p id={bodyId} className="mt-1 text-sm leading-5 text-ink-soft">
            {t(definition.bodyKey)}
          </p>
          {definition.id === "new_features_v1" && listedFeatures.length > 0 && (
            <ul className="mt-2 space-y-1" data-guidance-listed>
              {listedFeatures.map((feature) => (
                <li key={feature}>
                  <a
                    href={routeForFeature(feature)}
                    className="text-sm font-semibold text-accent underline-offset-2 hover:underline"
                    data-guidance-feature={feature}
                    onClick={(event) => {
                      event.preventDefault();
                      onOpenFeature(routeForFeature(feature));
                    }}
                  >
                    {t(`discovery.features.${feature}` as MessageKey)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <GuidanceButtons presentation={presentation} onAction={onAction} />
    </div>
  );
}

function readCssPx(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

function GuidanceCoachmark({ presentation, onAction }: SurfaceProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CoachmarkPosition | null>(null);
  const { definition } = presentation;
  useEscapeDismiss(onAction, definition.secondary);

  useLayoutEffect(() => {
    const target = document.querySelector<HTMLElement>(`[data-coachmark-target="${definition.anchor ?? ""}"]`);
    if (!target) return undefined;
    const rect = target.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) target.scrollIntoView({ block: "center" });
    let frame = 0;
    const place = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const card = cardRef.current;
        if (!card) return;
        const box = target.getBoundingClientRect();
        const viewport = window.visualViewport;
        setPosition(
          computeCoachmarkPosition({
            target: { top: box.top, bottom: box.bottom, left: box.left, width: box.width },
            card: { width: card.offsetWidth, height: card.offsetHeight },
            viewport: { width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight },
            safeTop: readCssPx("--app-safe-top"),
            safeBottom: readCssPx("--app-bottom-nav-height") + readCssPx("--app-safe-bottom"),
          })
        );
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [definition.anchor]);

  useEffect(() => {
    if (position) focusPrimary(cardRef.current);
  }, [position !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Só depois de posicionado (antes disso o card está `invisible`).
  useRenderEvidence(presentation, cardRef, position !== null);
  const evidence = useEvidenceAttr();

  return (
    <div
      ref={cardRef}
      data-guidance-surface="coachmark"
      data-guidance-id={definition.id}
      data-guidance-render-evidence={evidence}
      data-coachmark-placement={position?.placement}
      data-native-back-dismiss
      role="dialog"
      aria-modal="false"
      aria-labelledby={definition.titleKey ? titleId : undefined}
      aria-describedby={bodyId}
      className={cx(
        "fixed w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-accent/40 bg-surface p-3.5 shadow-lift longyu-guidance-in",
        zLayerClass.toast,
        position ? "" : "invisible"
      )}
      style={{ top: position?.top ?? 0, left: position?.left ?? 0 }}
    >
      <span
        aria-hidden
        className={cx(
          "absolute h-3 w-3 rotate-45 border-accent/40 bg-surface",
          position?.placement === "above" ? "-bottom-1.5 border-b border-r" : "-top-1.5 border-l border-t"
        )}
        style={{ left: (position?.arrowLeft ?? 18) - 6 }}
      />
      <div className="flex items-start gap-2.5">
        {definition.dragon && <Mascot size={40} variant="wave" className="shrink-0" />}
        <div className="min-w-0 flex-1">
          {definition.titleKey && (
            <h2 id={titleId} className="text-sm font-semibold text-ink">
              {t(definition.titleKey)}
            </h2>
          )}
          <p id={bodyId} className="mt-0.5 text-sm leading-5 text-ink-soft">
            {t(definition.bodyKey)}
          </p>
        </div>
      </div>
      <GuidanceButtons presentation={presentation} onAction={onAction} />
    </div>
  );
}

/** Dica inline (PART M.1): texto na própria página, sem sobrepor nada. */
export function GuidanceInlineSlot({ surface }: { surface: string }) {
  const { current } = useGuidanceRuntime();
  if (!current || current.definition.kind !== "INLINE_TIP" || !current.definition.surfaces.includes(surface)) return null;
  return <GuidanceInlineTip presentation={current} />;
}

function GuidanceInlineTip({ presentation: current }: { presentation: GuidancePresentation }) {
  const { t } = useTranslation();
  const updateGuidance = useStore((s) => s.updateGuidance);
  const ref = useRef<HTMLDivElement>(null);
  useRenderEvidence(current, ref, true);
  const evidence = useEvidenceAttr();
  const dismiss = (action: GuidanceAction) => {
    updateGuidance((state) => applyGuidanceAction(state, current, action, Date.now()));
    setGuidanceSession(recordShownInSession(getGuidanceSession(), current));
    setCurrentGuidance(null);
    trackFunnelEvent("guidance_dismissed", { guidance_id: current.definition.id, action });
  };
  return (
    <div
      ref={ref}
      data-guidance-surface="inline"
      data-guidance-render-evidence={evidence}
      data-guidance-id={current.definition.id}
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-3 text-sm text-ink-soft longyu-guidance-in"
    >
      <p className="min-w-0 flex-1 leading-5">{t(current.definition.bodyKey)}</p>
      <Button variant="ghost" size="lg" className="min-h-12 shrink-0" data-guidance-action="primary" onClick={() => dismiss("primary")}>
        {t(current.definition.primaryKey)}
      </Button>
    </div>
  );
}
