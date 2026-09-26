import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../lib/store";
import { useFeatureVisibility } from "../../hooks/useProgressiveDiscovery";
import {
  applyGuidanceAction,
  initializeGuidanceState,
  recordShownInSession,
  recordSnoozedInSession,
  routeForFeature,
  selectGuidance,
  type GuidanceAction,
  type GuidanceContext,
  type GuidancePresentation,
} from "../../lib/guidanceOrchestrator";
import { featureForPath } from "../../lib/progressiveDiscovery";
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
  const { current } = useGuidanceRuntime();
  const [inputFocused, setInputFocused] = useState(() => isTypingTarget(typeof document === "undefined" ? null : document.activeElement));
  const [anchors, setAnchors] = useState<Set<string>>(() => new Set());
  const [notificationPromptable, setNotificationPromptable] = useState(false);
  const [tick, setTick] = useState(0);
  const native = isNativeApp();

  // Semente única por conta (contas antigas não recebem enxurrada).
  useEffect(() => {
    if (!ready || guidance?.initialized) return;
    updateGuidance((state) => initializeGuidanceState(state, visibility, learner, Date.now()));
  }, [ready, guidance?.initialized, updateGuidance, visibility, learner]);

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

  // Âncoras de coachmark presentes (a página renderiza de forma assíncrona).
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

  // Sair da superfície com a orientação aberta = vista (não persegue o aluno).
  useEffect(() => {
    const shown = getCurrentGuidance();
    if (!shown || shown.definition.surfaces.includes(pathname)) return;
    updateGuidance((state) => applyGuidanceAction(state, shown, "primary", Date.now()));
    setCurrentGuidance(null);
  }, [pathname, updateGuidance]);

  // PART CD — aberto depois do desbloqueio (sem PII).
  useEffect(() => {
    const feature = featureForPath(pathname);
    if (!feature || visibility[feature] !== "AVAILABLE") return;
    const record = guidance?.records?.[`${feature}_unlocked_v1`];
    if (record?.status === "SEEN") trackFunnelEvent("feature_opened_after_unlock", { feature });
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
      setGuidanceSession(recordShownInSession(getGuidanceSession(), fresh));
      setCurrentGuidance(fresh);
      trackFunnelEvent("guidance_shown", { guidance_id: fresh.definition.id, kind: fresh.definition.kind });
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

function focusPrimary(container: HTMLElement | null) {
  container?.querySelector<HTMLButtonElement>('[data-guidance-action="primary"]')?.focus({ preventScroll: true });
}

function GuidanceButtons({ presentation, onAction }: SurfaceProps) {
  const { t } = useTranslation();
  const { definition } = presentation;
  const secondaryKey: MessageKey = definition.secondary === "skip" ? "guidance.common.skip" : "guidance.common.nowNot";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
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
        data-guidance-action={definition.secondary}
        onClick={() => onAction(definition.secondary)}
      >
        {t(secondaryKey)}
      </Button>
      {definition.offerSkipAll && (
        <Button
          variant="ghost"
          size="lg"
          className="min-h-12 w-full text-ink-soft"
          data-guidance-action="skip_all"
          onClick={() => onAction("skip_all")}
        >
          {t("guidance.common.skipAll")}
        </Button>
      )}
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

  const unlock = definition.priority === "FEATURE_UNLOCK";
  return (
    <div
      ref={cardRef}
      data-guidance-surface="reveal"
      data-guidance-id={definition.id}
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

const VIEWPORT_GUTTER = 16;
const COACHMARK_GAP = 10;

interface CoachmarkPosition {
  top: number;
  left: number;
  arrowLeft: number;
  placement: "above" | "below";
}

/** PART DF — nunca fora da tela, nunca sob barras do sistema, nunca sobre o alvo. */
export function computeCoachmarkPosition(input: {
  target: { top: number; bottom: number; left: number; width: number };
  card: { width: number; height: number };
  viewport: { width: number; height: number };
  safeTop: number;
  safeBottom: number;
}): CoachmarkPosition {
  const { target, card, viewport, safeTop, safeBottom } = input;
  const minTop = safeTop + VIEWPORT_GUTTER / 2;
  const maxBottom = viewport.height - safeBottom - VIEWPORT_GUTTER / 2;
  const spaceBelow = maxBottom - (target.bottom + COACHMARK_GAP);
  const spaceAbove = target.top - COACHMARK_GAP - minTop;
  const placement: "above" | "below" = spaceBelow >= card.height || spaceBelow >= spaceAbove ? "below" : "above";
  let top = placement === "below" ? target.bottom + COACHMARK_GAP : target.top - COACHMARK_GAP - card.height;
  top = Math.min(Math.max(top, minTop), Math.max(minTop, maxBottom - card.height));
  const maxLeft = viewport.width - VIEWPORT_GUTTER - card.width;
  const centered = target.left + target.width / 2 - card.width / 2;
  const left = Math.min(Math.max(centered, VIEWPORT_GUTTER), Math.max(VIEWPORT_GUTTER, maxLeft));
  const arrowLeft = Math.min(Math.max(target.left + target.width / 2 - left, 18), card.width - 18);
  return { top, left, arrowLeft, placement };
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

  return (
    <div
      ref={cardRef}
      data-guidance-surface="coachmark"
      data-guidance-id={definition.id}
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
  const { t } = useTranslation();
  const { current } = useGuidanceRuntime();
  const updateGuidance = useStore((s) => s.updateGuidance);
  if (!current || current.definition.kind !== "INLINE_TIP" || !current.definition.surfaces.includes(surface)) return null;
  const dismiss = (action: GuidanceAction) => {
    updateGuidance((state) => applyGuidanceAction(state, current, action, Date.now()));
    setCurrentGuidance(null);
    trackFunnelEvent("guidance_dismissed", { guidance_id: current.definition.id, action });
  };
  return (
    <div
      data-guidance-surface="inline"
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
