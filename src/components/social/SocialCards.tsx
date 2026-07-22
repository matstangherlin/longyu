import { ButtonLink, Card } from "../ui/primitives";
import { IconChevron, IconFlame, IconStar, IconUser } from "../ui/Icon";
import type { PublicProfile } from "../../lib/social/types";
import { leagueLabel } from "../../services/socialService";

export function SocialAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "A";
  const sizeClass = size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent ${sizeClass}`}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function FriendsRankingList({
  rows,
  currentUserId,
  compact = false,
}: {
  rows: PublicProfile[];
  currentUserId?: string | null;
  compact?: boolean;
}) {
  if (!rows.length) {
    return (
      <Card className="p-4 text-sm text-ink-soft">
        Adicione amigos para comparar sua evolução semanal.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-line/50 px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Ranking dos amigos</div>
        <p className="mt-0.5 text-xs text-ink-soft">XP desta semana — separado da Liga global.</p>
      </div>
      <ul className={compact ? "divide-y divide-line/40" : "divide-y divide-line/50"}>
        {rows.map((row, index) => {
          const isMe = row.user_id === currentUserId;
          return (
            <li
              key={row.user_id}
              className={[
                "flex items-center gap-3 px-4",
                compact ? "py-2.5" : "py-3",
                isMe ? "bg-accent-soft/20" : "",
              ].join(" ")}
            >
              <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-ink-faint">{index + 1}</span>
              <SocialAvatar name={row.display_name} size={compact ? "sm" : "md"} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">
                  {row.display_name}
                  {isMe && <span className="ml-1 text-xs font-medium text-accent">(você)</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
                  {row.username && <span>@{row.username}</span>}
                  <span>Liga {leagueLabel(row.league_tier)}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-center justify-end gap-1 text-sm font-semibold tabular-nums text-ink">
                  <IconStar width={14} height={14} className="text-accent" />
                  {row.weekly_xp}
                </div>
                <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-ink-faint">
                  <IconFlame width={12} height={12} />
                  {row.streak}d
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function FriendActivityFeed({
  items,
  loading,
}: {
  items: { id: string; copy: string; created_at: string }[];
  loading?: boolean;
}) {
  return (
    <Card className="p-0">
      <div className="border-b border-line/50 px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Atividade recente</div>
        <p className="mt-0.5 text-xs text-ink-soft">Só amigos que você segue — sem chat nesta versão.</p>
      </div>
      {loading ? (
        <p className="px-4 py-6 text-sm text-ink-soft">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-soft">Nenhuma atividade recente dos seus amigos.</p>
      ) : (
        <ul className="divide-y divide-line/40">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm leading-5 text-ink-soft">
              {item.copy}
              <div className="mt-1 text-[11px] text-ink-faint">{formatRelative(item.created_at)}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function FriendsProfileSummary({
  followingCount,
  followersCount,
  username,
  cloudReady,
}: {
  followingCount: number;
  followersCount: number;
  username: string | null;
  cloudReady: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Amigos</div>
          <h2 className="mt-1 font-serif text-xl font-semibold text-ink">Sua rede</h2>
          {username ? (
            <p className="mt-1 text-sm text-ink-soft">@{username}</p>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">Defina um @apelido para seus amigos te encontrarem.</p>
          )}
        </div>
        <IconUser width={22} height={22} className="text-accent" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-surface-2 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Seguindo</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{followingCount}</div>
        </div>
        <div className="rounded-xl bg-surface-2 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Seguidores</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{followersCount}</div>
        </div>
      </div>

      {!cloudReady ? (
        <p className="mt-3 text-sm text-ink-soft">Crie uma conta na nuvem para seguir amigos e comparar XP.</p>
      ) : followingCount === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">Adicione amigos para comparar sua evolução semanal.</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink to="/amigos" size="sm">
          Encontrar amigos <IconChevron width={16} height={16} />
        </ButtonLink>
        {!username && cloudReady && (
          <ButtonLink to="/config#privacidade" size="sm" variant="outline">
            Criar @apelido
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}

function formatRelative(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}
