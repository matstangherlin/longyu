import { useEffect, useState } from "react";
import { readOnline, subscribeNetworkStatus } from "../lib/platform/networkStatus";

/**
 * Estado de conectividade do navegador. Usado apenas para um indicador
 * discreto — a Jornada funciona com dados locais mesmo offline; nada aqui
 * altera a lógica de sincronização.
 *
 * RC2.2.10: a fonte é src/lib/platform/networkStatus (no web, os mesmos
 * eventos online/offline de antes; no Android, também o plugin Network).
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(readOnline);

  useEffect(() => {
    // Re-sincroniza no mount: em testes/Playwright o offline pode ser armado
    // antes do chunk lazy da página montar (o evento "offline" já passou).
    setOnline(readOnline());
    return subscribeNetworkStatus(setOnline);
  }, []);

  return online;
}
