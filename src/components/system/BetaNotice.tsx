/** Aviso discreto da beta — usar só em landing / Sobre (não em todas as telas). */
export function BetaNotice({ className }: { className?: string }) {
  return (
    <p className={["text-xs leading-5 text-ink-faint", className].filter(Boolean).join(" ")}>
      O Longyu está em beta. Algumas atividades ainda estão sendo aprimoradas. Seu feedback ajuda a
      construir o curso.
    </p>
  );
}
