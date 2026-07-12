const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function normalizeUsernameInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24);
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

export function suggestUsernameFromName(name: string): string {
  const base = normalizeUsernameInput(
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
  );
  if (base.length >= 3) return base;
  return `${base || "aluno"}_ly`.slice(0, 24);
}

export function friendsInviteUrl(username: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/amigos?u=${encodeURIComponent(username)}`;
}
