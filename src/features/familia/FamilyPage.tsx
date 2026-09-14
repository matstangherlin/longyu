import { useCallback, useEffect, useState } from "react";
import { Button, ButtonLink, Card, EmptyState, ErrorState, LoadingState, PageHeader, Pill } from "../../components/ui/primitives";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { IconCheck } from "../../components/ui/Icon";
import { FAMILY_MAX_MEMBERS } from "../../commercial/family";
import {
  createFamilyInvite,
  familyInviteLink,
  fetchFamilyOverview,
  removeFamilyMember,
  revokeFamilyInvite,
  type FamilyErrorCode,
  type FamilyOverview,
} from "../../services/familyService";
import { useTranslation } from "../../i18n/useTranslation";

const ERROR_KEYS: Record<FamilyErrorCode, string> = {
  UNAUTHENTICATED: "familia.errorUnauthenticated",
  NO_FAMILY: "familia.errorNoFamily",
  INVALID_EMAIL: "familia.errorInvalidEmail",
  INVITE_ALREADY_PENDING: "familia.errorInvitePending",
  FAMILY_FULL: "familia.errorFamilyFull",
  INVALID_INVITE: "familia.errorInvalidInvite",
  ALREADY_IN_ANOTHER_FAMILY: "familia.errorAlreadyInFamily",
  OWNER_CANNOT_LEAVE: "familia.errorOwnerCannotLeave",
  BACKEND_OFF: "familia.errorBackendOff",
  UNKNOWN: "familia.errorUnknown",
};

function formatDate(value: string | null, locale: string): string {
  if (!value) return "";
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return "";
  return new Intl.DateTimeFormat(locale === "pt-BR" ? "pt-BR" : "en-US", { dateStyle: "medium" }).format(ms);
}

export function FamilyPage() {
  const { t, locale } = useTranslation();
  const [overview, setOverview] = useState<FamilyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<FamilyErrorCode | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<FamilyErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchFamilyOverview();
    if (!result.ok) {
      setLoadError(result.code);
      setOverview(null);
    } else {
      setLoadError(null);
      setOverview(result.value);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleInvite() {
    setBusy(true);
    setInviteError(null);
    const result = await createFamilyInvite(inviteEmail.trim());
    setBusy(false);
    if (!result.ok) {
      setInviteError(result.code);
      return;
    }
    // O link aparece aqui e some quando o modal fecha. Ele não vai para o
    // estado global, para o armazenamento local nem para telemetria: o token
    // em claro só existe enquanto esta tela estiver aberta.
    setInviteLink(familyInviteLink(result.value.token));
    setInviteEmail("");
    await load();
  }

  async function handleRevoke(inviteId: string) {
    setBusy(true);
    await revokeFamilyInvite(inviteId);
    setBusy(false);
    await load();
  }

  async function handleRemove(userId: string, name: string | null) {
    if (!window.confirm(t("familia.removeConfirm", { name: name ?? t("familia.member") }))) return;
    setBusy(true);
    await removeFamilyMember(userId);
    setBusy(false);
    await load();
  }

  function closeInvite() {
    setInviteOpen(false);
    setInviteLink(null);
    setInviteError(null);
    setCopied(false);
  }

  if (loading) return <LoadingState label={t("common.loading")} />;

  if (loadError) {
    return <ErrorState title={t("familia.title")} desc={t(ERROR_KEYS[loadError])} />;
  }

  if (!overview) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" data-family-page>
        <PageHeader eyebrow={t("familia.eyebrow")} title={t("familia.title")} />
        <EmptyState
          title={t("familia.noFamily")}
          desc={t("familia.noFamilyLead", { count: FAMILY_MAX_MEMBERS })}
          action={<ButtonLink to="/pro">{t("familia.seePlans")}</ButtonLink>}
        />
      </div>
    );
  }

  const seatsFree = Math.max(0, overview.seatsTotal - overview.seatsUsed);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" data-family-page>
      <PageHeader eyebrow={t("familia.eyebrow")} title={t("familia.title")} desc={t("familia.lead")} />

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-serif text-xl font-semibold text-ink" data-family-seats>
              {t("familia.seats", { used: overview.seatsUsed, total: overview.seatsTotal })}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {seatsFree > 0 ? t("familia.seatsFree", { count: seatsFree }) : t("familia.noSeats")}
            </p>
          </div>
          {overview.isOwner && (
            <Button onClick={() => setInviteOpen(true)} disabled={seatsFree === 0} data-family-invite-open>
              {t("familia.invite")}
            </Button>
          )}
        </div>
      </Card>

      <section className="space-y-2">
        <h2 className="font-semibold text-ink">{t("familia.members")}</h2>
        {overview.members.map((member) => (
          <Card key={member.userId} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <p className="text-sm font-semibold text-ink">{member.name ?? t("familia.member")}</p>
              <p className="text-xs text-ink-soft">
                {member.role === "owner" ? t("familia.owner") : t("familia.member")}
                {member.joinedAt ? ` · ${t("familia.memberSince", { date: formatDate(member.joinedAt, locale) })}` : ""}
              </p>
            </div>
            {overview.isOwner && member.role !== "owner" && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void handleRemove(member.userId, member.name)}
              >
                {t("familia.remove")}
              </Button>
            )}
          </Card>
        ))}
      </section>

      {overview.isOwner && overview.invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-ink">{t("familia.pendingInvites")}</h2>
          {overview.invites.map((invite) => (
            <Card key={invite.inviteId} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <p className="text-sm text-ink">{invite.email}</p>
                <p className="text-xs text-ink-soft">
                  {t("familia.expiresOn", { date: formatDate(invite.expiresAt, locale) })}
                </p>
              </div>
              <Button variant="outline" disabled={busy} onClick={() => void handleRevoke(invite.inviteId)}>
                {t("familia.revoke")}
              </Button>
            </Card>
          ))}
        </section>
      )}

      <Card className="p-4">
        <p className="text-xs leading-5 text-ink-soft">{t("familia.privacy")}</p>
      </Card>

      {inviteOpen && (
        <ModalOverlay label={t("familia.inviteTitle")} onBackdropClick={closeInvite}>
          <Card className="w-full max-w-sm p-4">
            <h2 className="font-serif text-lg font-semibold text-ink">{t("familia.inviteTitle")}</h2>
            <p className="mt-1 text-xs text-ink-soft">{t("familia.inviteLead")}</p>

            {inviteLink ? (
              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 text-xs font-semibold text-good">
                  <IconCheck width={13} height={13} /> {t("familia.inviteLinkReady")}
                </p>
                <input
                  readOnly
                  value={inviteLink}
                  aria-label={t("familia.copyLink")}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  className="w-full"
                  onClick={() => {
                    void navigator.clipboard?.writeText(inviteLink);
                    setCopied(true);
                  }}
                >
                  {copied ? t("familia.copied") : t("familia.copyLink")}
                </Button>
                <Button variant="ghost" className="w-full" onClick={closeInvite}>
                  {t("common.close")}
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <label className="block text-xs font-semibold text-ink" htmlFor="family-invite-email">
                  {t("familia.inviteEmail")}
                </label>
                <input
                  id="family-invite-email"
                  type="email"
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                />
                {inviteError && <p className="text-xs text-bad">{t(ERROR_KEYS[inviteError])}</p>}
                <Button className="w-full" disabled={busy || inviteEmail.trim().length === 0} onClick={() => void handleInvite()}>
                  {t("familia.inviteSend")}
                </Button>
                <Button variant="ghost" className="w-full" onClick={closeInvite}>
                  {t("common.cancel")}
                </Button>
              </div>
            )}
          </Card>
        </ModalOverlay>
      )}

      {overview.status !== "active" && <Pill tone="gold">{overview.status}</Pill>}
    </div>
  );
}
