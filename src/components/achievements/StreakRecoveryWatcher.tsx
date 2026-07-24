import { useNavigate } from "react-router-dom";
import { useStore } from "../../lib/store";
import { Button } from "../ui/primitives";
import { ModalOverlay } from "../ui/ModalOverlay";
import { IconFlame, IconRefresh } from "../ui/Icon";

function dayCountLabel(days: number): string {
  return days === 1 ? "1 dia" : `${days} dias`;
}

/**
 * Modal de recuperação de ofensiva: aparece assim que a tela abre depois de
 * o aluno passar 24h (um dia inteiro) sem estudar. A ofensiva já zerou, mas
 * há uma janela de 24h para recuperá-la fazendo um exercício. O botão leva
 * direto para a revisão — concluir um exercício restaura a sequência.
 */
export function StreakRecoveryWatcher() {
  const navigate = useNavigate();
  const pending = useStore((s) => s.pendingStreakRecovery);
  const clear = useStore((s) => s.clearStreakRecovery);
  const hold = useStore((s) => s.holdAchievementModals);

  if (pending == null || hold) return null;

  const recover = () => {
    clear();
    // Leva direto para um exercício: concluir a revisão chama recordStudyDay,
    // que enxerga a janela aberta e restaura a ofensiva.
    navigate("/revisao");
  };

  return (
    <ModalOverlay
      className="items-stretch p-0 sm:items-center sm:p-4"
      label="Recuperar ofensiva"
      onBackdropClick={clear}
    >
      <div
        className="flex min-h-[100dvh] w-full flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(183,121,31,.22),rgb(var(--surface))_55%,rgb(var(--bg))_100%)] px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+2rem)] text-center shadow-lift sm:min-h-0 sm:max-w-md sm:rounded-[30px] sm:border sm:border-accent-soft sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="my-auto sm:my-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Ofensiva em risco
          </div>
          <div className="relative mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-[30px] bg-surface-2 text-ink-faint shadow-lift sm:mt-4 sm:h-20 sm:w-20 sm:rounded-[26px]">
            <IconFlame width={44} height={44} fill="currentColor" className="opacity-40" />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-semibold text-ink sm:mt-4 sm:text-2xl">
            Ofensiva zerada
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft sm:mt-1">
            Você ficou 24h sem estudar e sua sequência de {dayCountLabel(pending)} apagou.
            Tem até o fim de hoje para recuperá-la: faça um exercício agora e ela volta.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
            <IconFlame width={13} height={13} /> Recupere {dayCountLabel(pending)} de ofensiva
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:mt-5">
          <Button size="lg" className="w-full shadow-lift" onClick={recover}>
            <IconRefresh width={16} height={16} /> Recuperar ofensiva
          </Button>
          <Button variant="text" size="md" className="w-full" onClick={clear}>
            Agora não
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
