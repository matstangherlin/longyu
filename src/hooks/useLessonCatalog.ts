import { useEffect, useSyncExternalStore } from "react";
import {
  getLessonCatalogState,
  loadLessonCatalog,
  subscribeLessonCatalog,
  type LessonCatalogStatus,
} from "../data/lessonCatalog";

/**
 * Assina o catálogo publicado e garante que ele foi pedido ao menos uma vez.
 *
 * `useSyncExternalStore` em vez de estado local porque o catálogo é único no
 * app: duas telas montadas ao mesmo tempo precisam ver o mesmo conteúdo, e o
 * React precisa saber que a fonte é externa para não rasgar a renderização.
 */
export function useLessonCatalogStatus(): LessonCatalogStatus {
  const status = useSyncExternalStore(
    subscribeLessonCatalog,
    () => getLessonCatalogState().status,
    () => "IDLE" as const
  );

  useEffect(() => {
    // Idempotente no módulo: montar várias telas não gera vários downloads.
    void loadLessonCatalog();
  }, []);

  return status;
}

/** `true` enquanto ainda não dá para afirmar que uma cápsula não existe. */
export function isLessonCatalogSettling(status: LessonCatalogStatus): boolean {
  return status === "IDLE" || status === "LOADING";
}
