export const PUBLIC_APP_PATHS = [
  "/",
  "/comecar",
  "/login",
  "/confirmar-email",
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
