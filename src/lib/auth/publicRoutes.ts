export const FINALIZE_ONBOARDING_PATH = "/finalizar-cadastro";

export const PUBLIC_APP_PATHS = [
  "/",
  "/comecar",
  "/login",
  "/confirmar-email",
  "/finalizar-cadastro",
  "/esqueci-senha",
  "/redefinir-senha",
  "/business",
  "/privacidade",
  "/sobre",
  "/salvar-progresso",
  "/pro",
  "/plano",
  "/aprender-mandarim",
  "/curso-de-mandarim-online",
  "/tons-do-mandarim",
  "/aprender-pinyin",
  "/aprender-hanzi",
  "/mandarim-para-brasileiros",
  "/como-funciona",
  "/metodo-longyu",
] as const;

const PUBLIC_PREFIXES = ["/convite/"];

export function isPublicAppPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  if ((PUBLIC_APP_PATHS as readonly string[]).includes(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function loginNextPath(pathname: string, search = ""): string {
  const next = `${pathname}${search}`;
  const params = new URLSearchParams();
  params.set("next", next || "/jornada");
  return `/login?${params.toString()}`;
}

export function onboardingEntryPath(): string {
  return "/comecar";
}

export function finalizeOnboardingPath(next?: string): string {
  const dest = (next ?? "").trim();
  if (!dest || dest === "/jornada" || dest.startsWith(FINALIZE_ONBOARDING_PATH)) {
    return FINALIZE_ONBOARDING_PATH;
  }
  if (!dest.startsWith("/") || dest.startsWith("//")) return FINALIZE_ONBOARDING_PATH;
  return `${FINALIZE_ONBOARDING_PATH}?next=${encodeURIComponent(dest)}`;
}

export function redoPlacementPath(): string {
  return "/comecar?refazer=1";
}
