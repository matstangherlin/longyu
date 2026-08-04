import { useEffect, useState } from "react";

/**
 * Estado de conectividade do navegador. Usado apenas para um indicador
 * discreto — a Jornada funciona com dados locais mesmo offline; nada aqui
 * altera a lógica de sincronização.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const sync = () => setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    // Re-sincroniza no mount: em testes/Playwright o offline pode ser armado
    // antes do chunk lazy da página montar (o evento "offline" já passou).
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return online;
}
