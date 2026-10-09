import { useId, useRef, useState } from "react";
import { IconLogout } from "../ui/Icon";
import { Button, cx } from "../ui/primitives";
import { ModalOverlay } from "../ui/ModalOverlay";
import { useCloudSignOut } from "../../hooks/useCloudSignOut";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * RC2.3.13A — logout as a compact destructive *row* (Hick / Fitts / hierarchy).
 * Not a primary learning CTA. Not a filled danger button (that remains Excluir).
 * Confirmation + loading prevent double execution.
 */
export function SignOutControl({
  testId,
  onBeforeSignOut,
  className,
}: {
  testId: string;
  onBeforeSignOut?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const { signOut, canSignOut } = useCloudSignOut();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const titleId = useId();
  const descId = useId();

  if (!canSignOut) return null;

  async function confirmSignOut() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    onBeforeSignOut?.();
    try {
      await signOut();
    } finally {
      busyRef.current = false;
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(
          "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-wrong transition hover:bg-wrong-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wrong/40",
          className,
        )}
        data-testid={testId}
        data-sign-out-tone="destructive-text"
        data-sign-out-layout="compact"
        data-cta-hierarchy="destructive"
        data-cognitive-logout="compact"
      >
        <IconLogout width={18} height={18} aria-hidden="true" className="text-wrong" />
        <span className="flex-1">{t("common.signOutAccount")}</span>
      </button>

      {open && (
        <ModalOverlay
          labelledBy={titleId}
          label={t("common.signOutConfirmTitle")}
          onBackdropClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl border border-line bg-surface p-5 shadow-lift sm:rounded-3xl"
            style={{ paddingBottom: "max(1.25rem, var(--app-safe-bottom))" }}
            data-testid={`${testId}-confirm`}
            data-cognitive-sheet="sign-out-confirm"
          >
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {t("common.signOutConfirmTitle")}
            </h2>
            <p id={descId} className="mt-2 text-sm leading-5 text-ink-soft">
              {t("common.signOutConfirmBody")}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="button"
                variant="danger"
                size="md"
                className="w-full sm:w-auto"
                loading={busy}
                disabled={busy}
                onClick={() => void confirmSignOut()}
                data-testid={`${testId}-confirm-yes`}
                aria-describedby={descId}
              >
                {busy ? t("common.signingOut") : t("common.signOut")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => setOpen(false)}
                data-testid={`${testId}-confirm-cancel`}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}
