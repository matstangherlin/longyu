import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import { recordTechEvent } from "../../lib/techEvents";
import {
  readProgressionAnchor,
  readProgressionScroll,
  writeProgressionAnchor,
  writeProgressionScroll,
  type ProgressionMode,
} from "../../lib/progressionShellState";

const JOURNEY_HREF = "/jornada";
const CULTURE_HREF = "/cultura";

export function ProgressionSegmentedSwitch({ mode }: { mode: ProgressionMode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tablistId = useId();
  const journeyTabId = `${tablistId}-journey`;
  const cultureTabId = `${tablistId}-culture`;

  const switchTo = useCallback(
    (next: ProgressionMode) => {
      if (next === mode) return;
      // Persist current surface before leaving (scroll + last known anchor).
      writeProgressionScroll(mode, window.scrollY);
      const href = next === "journey" ? JOURNEY_HREF : CULTURE_HREF;
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
      className="app-safe-top sticky top-0 z-20 -mx-1 mb-3 bg-bg/95 px-1 pb-2 pt-1 backdrop-blur-sm"
      data-testid="progression-shell-switch"
      data-progression-shell="rc2-3-13e"
    >
      <div
        role="tablist"
        aria-label={t("progression.switchLabel")}
        className="relative grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface-2 p-1"
        onKeyDown={onKeyDown}
      >
        <span
          aria-hidden
          className={[
            "pointer-events-none absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-xl bg-surface shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none",
            mode === "culture" ? "translate-x-[calc(100%+0.25rem)] left-1" : "translate-x-0 left-1",
          ].join(" ")}
          data-testid="progression-switch-thumb"
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
            "relative z-10 min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors",
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
            "relative z-10 min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors",
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

  useEffect(() => {
    if (restoreDone.current) return;
    restoreDone.current = true;
    const anchor = readProgressionAnchor(mode);
    const scrollY = readProgressionScroll(mode);
    requestAnimationFrame(() => {
      if (anchor) {
        const el = document.querySelector(`[data-progression-anchor="${CSS.escape(anchor)}"]`);
        if (el instanceof HTMLElement) {
          el.scrollIntoView({ block: "center", behavior: "auto" });
          return;
        }
      }
      if (scrollY > 0) window.scrollTo({ top: scrollY, behavior: "auto" });
    });
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
    <div data-testid="progression-shell" data-progression-mode={mode} className="mx-auto w-full max-w-[1180px]">
      <ProgressionSegmentedSwitch mode={mode} />
      {(headerTitle || headerDesc) && (
        <header className="mb-3" data-testid={`progression-header-${mode}`}>
          {headerTitle ? (
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
              {headerTitle}
            </h1>
          ) : null}
          {headerDesc ? <p className="mt-1 text-sm text-ink-soft">{headerDesc}</p> : null}
        </header>
      )}
      <div id="progression-shell-panel" role="tabpanel" data-testid="progression-shell-panel">
        {children}
      </div>
    </div>
  );
}

/** Call when a journey/culture node is focused so switch-back restores it. */
export function rememberProgressionAnchor(mode: ProgressionMode, anchor: string): void {
  writeProgressionAnchor(mode, anchor);
}
