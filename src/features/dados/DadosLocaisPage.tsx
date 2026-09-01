import { useState } from "react";
import { useStore } from "../../lib/store";
import { activeLearningRepository } from "../../lib/repositories/learningRepository";
import { validateProgressSnapshot } from "../../lib/progressSnapshot";
import { buildPrivacyExportBundle } from "../../services/privacyService";
import { PageShell, PageHeader, CompactCard, ActionButton } from "../../components/ui/page";
import { Pill } from "../../components/ui/primitives";
import { IconBook, IconCheck, IconRefresh, IconShield, IconUser } from "../../components/ui/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { displayInstruction } from "../../i18n/overlays/journeyChrome";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function DadosLocaisPage() {
  const { t, instructionLocale: locale } = useTranslation();
  const chrome = (text: string) => displayInstruction(text, locale);
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const switchAccount = useStore((s) => s.switchAccount);
  const [notice, setNotice] = useState<string | null>(null);

  const accountList = Object.values(accounts);

  function download(kind: "export" | "backup") {
    const snapshot = activeLearningRepository().exportSnapshot();
    if (!validateProgressSnapshot(snapshot).ok) {
      setNotice(t("hub.noLocalProfile"));
      return;
    }
    const date = new Date(snapshot.exportedAt).toISOString().slice(0, 10);
    downloadJson(`longyu-${kind === "backup" ? "backup" : "progresso"}-${date}.json`, { kind, ...snapshot });
    setNotice(kind === "backup" ? t("hub.backupReady") : t("hub.exportReady"));
  }

  async function exportPrivacyBundle() {
    const bundle = await buildPrivacyExportBundle();
    downloadJson(`longyu-lgpd-${bundle.exportedAt.slice(0, 10)}.json`, bundle);
    setNotice(t("hub.privacyExportReady"));
  }

  function eraseLocalData() {
    const ok = window.confirm(
      t("hub.eraseLocalConfirm")
    );
    if (!ok) return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.toLowerCase().startsWith("longyu")) keys.push(key);
      }
      keys.forEach((key) => localStorage.removeItem(key));
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key && key.toLowerCase().startsWith("longyu")) sessionStorage.removeItem(key);
        }
      } catch {
        /* sessionStorage indisponível — ignora */
      }
      window.location.href = "/";
    } catch {
      setNotice(t("hub.eraseLocalFailed"));
    }
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        back={{ to: "/mais", label: t("navigation.more") }}
        eyebrow={t("hub.localDataEyebrow")}
        title={t("navigation.localData")}
        subtitle={t("hub.localDataDesc")}
      />

      {notice && (
        <div className="rounded-xl border border-good/25 bg-[rgb(var(--good)/0.08)] px-3 py-2 text-[13px] font-medium text-ink">
          {notice}
        </div>
      )}

      {/* Perfis locais */}
      <CompactCard>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{t("hub.localProfilesHere")}</div>
        <div className="grid gap-2">
          {accountList.map((acc) => {
            const isCurrent = acc.id === currentAccountId;
            return (
              <div key={acc.id} className="flex items-center gap-2.5 rounded-xl border border-line/50 bg-surface-2/60 px-3 py-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-accent">
                  <IconUser width={16} height={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-ink">{acc.name?.trim() || t("hub.defaultLearner")}</span>
                    {isCurrent && <Pill tone="accent">{t("common.active")}</Pill>}
                  </div>
                  <div className="truncate text-[11px] text-ink-faint">{acc.email || t("hub.localProfile")}</div>
                </div>
                {!isCurrent && (
                  <ActionButton onClick={() => switchAccount(acc.id)} variant="secondary" size="sm">
                    {t("hub.useProfile")}
                  </ActionButton>
                )}
                {isCurrent && <IconCheck width={16} height={16} className="shrink-0 text-[rgb(var(--good))]" />}
              </div>
            );
          })}
        </div>
      </CompactCard>

      {/* Exportar / backup */}
      <CompactCard>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{chrome("Exportar e backup")}</div>
        <p className="text-[13px] leading-5 text-ink-soft">{chrome("Baixe seu progresso como arquivo JSON para guardar ou transferir de aparelho.")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <ActionButton onClick={() => download("export")} variant="secondary" size="sm" icon={<IconBook width={15} height={15} />}>
            {chrome("Exportar progresso")}
          </ActionButton>
          <ActionButton onClick={() => download("backup")} variant="secondary" size="sm" icon={<IconRefresh width={15} height={15} />}>
            {chrome("Backup local")}
          </ActionButton>
        </div>
        <button
          type="button"
          onClick={() => void exportPrivacyBundle()}
          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
        >
          <IconShield width={13} height={13} /> {chrome("Exportar pacote de dados (LGPD)")}
        </button>
      </CompactCard>

      {/* Apagar dados locais */}
      <CompactCard className="border-wrong/25">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-wrong">{chrome("Apagar dados locais")}</div>
        <p className="text-[13px] leading-5 text-ink-soft">
          {chrome("Remove progresso, perfis e preferências guardados apenas neste aparelho. Faça um backup antes — não dá para desfazer.")}
        </p>
        <ActionButton
          onClick={eraseLocalData}
          variant="secondary"
          size="sm"
          className="mt-3 border-wrong/40 text-wrong hover:bg-wrong-soft"
        >
          {chrome("Apagar dados deste dispositivo")}
        </ActionButton>
      </CompactCard>
    </PageShell>
  );
}
