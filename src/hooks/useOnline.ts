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
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
