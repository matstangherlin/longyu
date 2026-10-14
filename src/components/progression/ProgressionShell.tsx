import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import { recordTechEvent } from "../../lib/techEvents";
import { useMeasuredHeightCssVar } from "../../hooks/useMeasuredCssVar";
import {
  progressionEnterDirection,
  readCultureTopicId,
  readProgressionAnchor,
  readProgressionLastMode,
  readProgressionScroll,
  writeProgressionAnchor,
  writeProgressionLastMode,
  writeProgressionScroll,
  type ProgressionMode,
} from "../../lib/progressionShellState";
import { cultureTopicById, cultureTopicHref } from "../../data/cultureTopicGroups";

const JOURNEY_HREF = "/jornada";
const CULTURE_HREF = "/cultura";

function cultureRestoreHref(): string {
  const topicId = readCultureTopicId();
  if (topicId && cultureTopicById(topicId)) return cultureTopicHref(topicId);
  return CULTURE_HREF;
}

/**
 * RC2.3.13H.1 — ProgressionStickyChrome (conceptual):
 * Global TopBar stays in AppShell; this switch sticks immediately beneath it.
 * Offset under Global TopBar — never park the switch at the viewport top edge.
 *
 * RC2.3.13R — selector thumb uses motion tokens; content panel enters directionally.
 */
export function ProgressionSegmentedSwitch({ mode }: { mode: ProgressionMode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tablistId = useId();
  const journeyTabId = `${tablistId}-journey`;
  const cultureTabId = `${tablistId}-culture`;
  const switchRef = useMeasuredHeightCssVar<HTMLDivElement>("--progression-switch-height");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const switchTo = useCallback(
    (next: ProgressionMode) => {
      if (next === mode) return;
      // Persist current surface before leaving (scroll + last known anchor).
      writeProgressionScroll(mode, window.scrollY);
      writeProgressionLastMode(mode);
      // RC2.3.13R.3.2 — restore last Culture topic when switching back from Journey.
      const href = next === "journey" ? JOURNEY_HREF : cultureRestoreHref();
      // replace — avoid endless history pollution from rapid toggling.
      navigate(href, { replace: true });
      recordTechEvent(
        next === "journey" ? "progression_switch_journey" : "progression_switch_culture",
        { from: mode, to: next },
      );
      recordTechEvent("progression_mode_changed", {
        from: mode === "journey" ? "JOURNEY" : "CULTURE",
        to: next === "journey" ? "JOURNEY" : "CULTURE",
      });
      if (next === "culture") {
        try {
          const key = "longyu:culture-first-switch";
          if (localStorage.getItem(key) !== "1") {
            localStorage.setItem(key, "1");
            recordTechEvent("culture_first_switch", { from: mode, to: next });
          }
        } catch {
          /* ignore */
        }
      }
    },
    [mode, navigate],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      switchTo(event.key === "ArrowLeft" ? "journey" : "culture");
    }
    if (event.key === "Home") {
      event.preventDefault();
      switchTo("journey");
    }
    if (event.key === "End") {
      event.preventDefault();
      switchTo("culture");
    }
  };

  return (
    <div
      ref={switchRef}
      className={[
        // Stick under Global TopBar via --progression-sticky-offset (not viewport top).
        "sticky z-20 -mx-1 mb-3 bg-bg px-1 pb-2 pt-1",
        scrolled ? "shadow-sm border-b border-line/50" : "",
      ].join(" ")}
      style={{ top: "var(--progression-sticky-offset)" }}
      data-testid="progression-shell-switch"
      data-progression-shell="rc2-3-13r3-2-1"
      data-progression-sticky-chrome="true"
      data-scrolled={scrolled ? "true" : "false"}
    >
      <div
        role="tablist"
        aria-label={t("progression.switchLabel")}
        className="relative mx-auto grid max-w-md grid-cols-2 gap-1 rounded-2xl border border-line bg-surface-2 p-1"
        onKeyDown={onKeyDown}
      >
        <span
          aria-hidden
          className={[
            "pointer-events-none absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-xl bg-surface shadow-sm motion-reduce:transition-none",
            "transition-transform duration-[var(--motion-normal)] ease-[var(--ease-standard)]",
            mode === "culture" ? "translate-x-[calc(100%+0.25rem)] left-1" : "translate-x-0 left-1",
          ].join(" ")}
          data-testid="progression-switch-thumb"
          data-motion="segment-indicator"
        />
        <button
          type="button"
          role="tab"
          id={journeyTabId}
          aria-selected={mode === "journey"}
          aria-controls="progression-shell-panel"
          tabIndex={mode === "journey" ? 0 : -1}
          data-testid="progression-tab-journey"
          data-cta-hierarchy="secondary"
          className={[
            "relative z-10 min-h-11 rounded-xl px-3 type-button transition-colors",
            mode === "journey" ? "text-ink" : "text-ink-soft",
          ].join(" ")}
          onClick={() => switchTo("journey")}
        >
          <span className="sr-only">{mode === "journey" ? t("progression.selectedSuffix") : ""}</span>
          {t("progression.journey")}
          {mode === "journey" ? (
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" aria-hidden />
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          id={cultureTabId}
          aria-selected={mode === "culture"}
          aria-controls="progression-shell-panel"
          tabIndex={mode === "culture" ? 0 : -1}
          data-testid="progression-tab-culture"
          data-cta-hierarchy="secondary"
          className={[
            "relative z-10 min-h-11 rounded-xl px-3 type-button transition-colors",
            mode === "culture" ? "text-ink" : "text-ink-soft",
          ].join(" ")}
          onClick={() => switchTo("culture")}
        >
          <span className="sr-only">{mode === "culture" ? t("progression.selectedSuffix") : ""}</span>
          {t("progression.culture")}
          {mode === "culture" ? (
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" aria-hidden />
          ) : null}
        </button>
      </div>
    </div>
  );
}

export function ProgressionShell({
  mode,
  headerTitle,
  headerDesc,
  children,
}: {
  mode: ProgressionMode;
  headerTitle?: string;
  headerDesc?: string;
  children: ReactNode;
}) {
  const restoreDone = useRef(false);
  const location = useLocation();
  const fromMode = useRef(readProgressionLastMode());
  const enter = progressionEnterDirection(mode, fromMode.current);

  // Restore scroll/anchor before paint so enter motion never flashes top then jumps.
  useLayoutEffect(() => {
    if (restoreDone.current) return;
    restoreDone.current = true;
    const anchor = readProgressionAnchor(mode);
    const scrollY = readProgressionScroll(mode);
    if (anchor) {
      const el = document.querySelector(`[data-progression-anchor="${CSS.escape(anchor)}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ block: "center", behavior: "auto" });
        return;
      }
    }
    if (scrollY > 0) window.scrollTo({ top: scrollY, behavior: "auto" });
  }, [mode, location.pathname]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        writeProgressionScroll(mode, window.scrollY);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mode]);

  return (
    <div
      data-testid="progression-shell"
      data-progression-mode={mode}
      data-progression-shell
      data-motion-system="rc2-3-13r"
      className="mx-auto w-full max-w-[1180px]"
    >
      <ProgressionSegmentedSwitch mode={mode} />
      <div
        id="progression-shell-panel"
        role="tabpanel"
        data-testid="progression-shell-panel"
        data-enter={enter}
        className="progression-panel-enter"
      >
        {(headerTitle || headerDesc) && (
          <header className="mb-3" data-testid={`progression-header-${mode}`}>
            {headerTitle ? <h1 className="type-page-title">{headerTitle}</h1> : null}
            {headerDesc ? <p className="type-supporting mt-1">{headerDesc}</p> : null}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}

/** Call when a journey/culture node is focused so switch-back restores it. */
export function rememberProgressionAnchor(mode: ProgressionMode, anchor: string): void {
  writeProgressionAnchor(mode, anchor);
}
