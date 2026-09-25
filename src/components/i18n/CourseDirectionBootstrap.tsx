import { useEffect } from "react";
import { useStore } from "../../lib/store";
import { bootstrapCourseDirection } from "../../lib/courseDirectionState";
import { applyCourseDirection } from "../../i18n/courseDirection";
import { fetchCourseDirectionFromProfile } from "../../services/courseDirectionSync";
import { cloudAccountId } from "../../lib/store";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";

/**
 * RC2.2.14B — mantém o curso da CONTA ATIVA aplicado: ao trocar de conta,
 * ao concluir o cadastro (a escolha pendente entra na conta) e ao entrar na
 * nuvem (o perfil é a autoridade; o idioma do aparelho não sobrescreve).
 */
export function CourseDirectionBootstrap() {
  const currentAccountId = useStore((s) => s.currentAccountId);
  const setupComplete = useStore((s) => s.accountSetupComplete);
  const courseDirection = useStore((s) => s.courseDirection);

  useEffect(() => {
    bootstrapCourseDirection();
  }, [currentAccountId, setupComplete, courseDirection]);

  useEffect(() => {
    if (!isSupabaseBackendEnabled()) return undefined;
    const hydrate = async () => {
      const found = await fetchCourseDirectionFromProfile();
      if (!found) return;
      const state = useStore.getState();
      if (state.currentAccountId !== cloudAccountId(found.userId) || state.accountSetupComplete !== true) return;
      if (state.courseDirection !== found.direction) state.setCourseDirection(found.direction);
      applyCourseDirection(found.direction);
    };
    void hydrate();
    const client = getSupabaseClient();
    if (!client) return undefined;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") void hydrate();
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
