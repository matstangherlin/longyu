import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { Button, Card, Pill } from "../../components/ui/primitives";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import type { PublicProfile, SocialFollowRow } from "../../lib/social/types";
import { friendsInviteUrl } from "../../lib/social/username";
import {
  activityCopy,
  fetchFriendActivity,
  fetchFriendsRanking,
  fetchMySocialSettings,
  followUser,
  getProfileByUsername,
  listFollowers,
  listFollowing,
  searchProfiles,
  unfollowUser,
} from "../../services/socialService";
import {
  FriendActivityFeed,
  FriendsRankingList,
  SocialAvatar,
} from "../../components/social/SocialCards";
import { useStore } from "../../lib/store";
import { getSupabaseClient } from "../../lib/supabaseClient";

type Tab = "buscar" | "seguindo" | "seguidores";

export function AmigosPage() {
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const accountName = useStore((s) => s.accounts[s.currentAccountId]?.name ?? "Aluno");
  const cloudReady = isSupabaseBackendEnabled() && authMode === "cloud";

  const [searchParams] = useSearchParams();
  const inviteUsername = searchParams.get("u")?.trim() ?? "";

  const [tab, setTab] = useState<Tab>("buscar");
  const [query, setQuery] = useState(inviteUsername ? `@${inviteUsername}` : "");
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [following, setFollowing] = useState<SocialFollowRow[]>([]);
  const [followers, setFollowers] = useState<SocialFollowRow[]>([]);
  const [ranking, setRanking] = useState<PublicProfile[]>([]);
  const [activity, setActivity] = useState<{ id: string; copy: string; created_at: string }[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const inviteLink = useMemo(() => (username ? friendsInviteUrl(username) : null), [username]);

  const refresh = useCallback(async () => {
    if (!cloudReady) return;
    setLoading(true);
    const client = getSupabaseClient();
    const userId = (await client?.auth.getUser())?.data.user?.id ?? null;
    setMyUserId(userId);

    const [settings, followingRes, followersRes, rankingRes, activityRes] = await Promise.all([
      fetchMySocialSettings(),
      listFollowing(),
      listFollowers(),
      fetchFriendsRanking(),
      fetchFriendActivity(),
    ]);

    if (settings.ok) setUsername(settings.data.username);
    if (followingRes.ok) {
      setFollowing(followingRes.data);
      setFollowingIds(new Set(followingRes.data.map((row) => row.user_id)));
    }
    if (followersRes.ok) setFollowers(followersRes.data);
    if (rankingRes.ok) setRanking(rankingRes.data);
    if (activityRes.ok) {
      setActivity(
        activityRes.data.map((item) => ({
          id: item.id,
          copy: activityCopy(item, userId),
          created_at: item.created_at,
        }))
      );
    }
    setLoading(false);
  }, [cloudReady]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!inviteUsername || !cloudReady) return;
    void getProfileByUsername(inviteUsername).then((result) => {
      if (result.ok && result.data) {
        setSearchResults([result.data]);
        setTab("buscar");
      }
    });
  }, [cloudReady, inviteUsername]);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!cloudReady) return;
    const q = query.replace(/^@/, "").trim();
    if (q.length < 2) {
      setNotice("Digite pelo menos 2 caracteres.");
      return;
    }
    setNotice(null);
    const result = await searchProfiles(q);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setSearchResults(result.data);
  }

  async function toggleFollow(profile: PublicProfile) {
    if (!cloudReady) return;
    const isFollowing = followingIds.has(profile.user_id);
    const result = isFollowing ? await unfollowUser(profile.user_id) : await followUser(profile.user_id);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setNotice(isFollowing ? `Você deixou de seguir ${profile.display_name}.` : `Agora você segue ${profile.display_name}.`);
    await refresh();
  }

  async function copyInvite() {
    if (!inviteLink) {
      setNotice("Crie um @apelido em Ajustes → Privacidade para gerar seu link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteLink);
      setNotice("Link de convite copiado.");
    } catch {
      setNotice(inviteLink);
    }
  }

  if (!cloudReady) {
    return (
      <HubPage>
        <HubHeader eyebrow="Social" title="Amigos" desc="Compare progresso semanal com quem você segue." />
        <Card className="p-5 text-sm leading-6 text-ink-soft">
          Crie uma conta na nuvem em <strong className="text-ink">Perfil → Conta</strong> para usar amigos, ranking e
          atividade. Seu email nunca aparece para outros alunos.
        </Card>
      </HubPage>
    );
  }

  return (
    <HubPage>
      <HubHeader
        eyebrow="Social"
        title="Amigos"
        desc="Busque por nome ou @apelido, siga amigos e compare XP da semana."
      />

      {notice && (
        <Card className="border-accent/20 bg-accent-soft/30 px-4 py-3 text-sm text-ink">{notice}</Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Seu perfil público</div>
                <div className="mt-1 text-sm font-semibold text-ink">{accountName}</div>
                <div className="text-xs text-ink-soft">{username ? `@${username}` : "Sem @apelido ainda"}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => void copyInvite()}>
                Copiar convite
              </Button>
            </div>
          </Card>

          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {(
              [
                ["buscar", "Buscar"],
                ["seguindo", `Seguindo (${following.length})`],
                ["seguidores", `Seguidores (${followers.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={[
                  "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm",
                  tab === id ? "bg-surface text-ink shadow-card" : "text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "buscar" && (
            <HubSection title="Procurar amigos" desc="Nome ou @apelido — só perfis públicos na busca.">
              <form onSubmit={(e) => void handleSearch(e)} className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nome ou @apelido"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-line/50 bg-surface px-3 text-sm text-ink outline-none ring-accent/30 focus:ring-2"
                />
                <Button type="submit">Buscar</Button>
              </form>
              <div className="mt-3 space-y-2">
                {searchResults.map((profile) => (
                  <ProfileRow
                    key={profile.user_id}
                    profile={profile}
                    isFollowing={followingIds.has(profile.user_id)}
                    isSelf={profile.user_id === myUserId}
                    onToggle={() => void toggleFollow(profile)}
                  />
                ))}
                {!searchResults.length && !loading && (
                  <p className="text-sm text-ink-soft">Nenhum resultado. Tente outro nome ou @apelido.</p>
                )}
              </div>
            </HubSection>
          )}

          {tab === "seguindo" && (
            <FollowList
              title="Seguindo"
              rows={following}
              empty="Você ainda não segue ninguém."
              isFollowingMap={followingIds}
              myUserId={myUserId}
              onToggle={(id) => {
                const profile = following.find((row) => row.user_id === id);
                if (!profile) return;
                void toggleFollow({
                  user_id: profile.user_id,
                  display_name: profile.display_name,
                  username: profile.username,
                  avatar_key: profile.avatar_key,
                  league_tier: profile.league_tier,
                  weekly_xp: profile.weekly_xp,
                  streak: profile.streak,
                  joined_at: profile.followed_at,
                });
              }}
            />
          )}

          {tab === "seguidores" && (
            <FollowList
              title="Seguidores"
              rows={followers}
              empty="Ninguém te segue ainda."
              isFollowingMap={followingIds}
              myUserId={myUserId}
              onToggle={(id) => {
                const profile = followers.find((row) => row.user_id === id);
                if (!profile) return;
                void toggleFollow({
                  user_id: profile.user_id,
                  display_name: profile.display_name,
                  username: profile.username,
                  avatar_key: profile.avatar_key,
                  league_tier: profile.league_tier,
                  weekly_xp: profile.weekly_xp,
                  streak: profile.streak,
                  joined_at: profile.followed_at,
                });
              }}
            />
          )}
        </div>

        <div className="space-y-4">
          <FriendsRankingList rows={ranking} currentUserId={myUserId} />
          <FriendActivityFeed items={activity} loading={loading} />
        </div>
      </div>
    </HubPage>
  );
}

function ProfileRow({
  profile,
  isFollowing,
  isSelf,
  onToggle,
}: {
  profile: PublicProfile;
  isFollowing: boolean;
  isSelf: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line/50 bg-surface px-3 py-2.5">
      <SocialAvatar name={profile.display_name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{profile.display_name}</div>
        <div className="text-xs text-ink-soft">
          {profile.username ? `@${profile.username}` : "sem apelido"} · {profile.weekly_xp} XP · {profile.streak}d
        </div>
      </div>
      {isSelf ? (
        <Pill tone="muted">Você</Pill>
      ) : (
        <Button size="sm" variant={isFollowing ? "outline" : "primary"} onClick={onToggle}>
          {isFollowing ? "Seguindo" : "Seguir"}
        </Button>
      )}
    </div>
  );
}

function FollowList({
  title,
  rows,
  empty,
  isFollowingMap,
  myUserId,
  onToggle,
}: {
  title: string;
  rows: SocialFollowRow[];
  empty: string;
  isFollowingMap: Set<string>;
  myUserId: string | null;
  onToggle: (userId: string) => void;
}) {
  return (
    <Card className="p-0">
      <div className="border-b border-line/50 px-4 py-3">
        <div className="font-semibold text-ink">{title}</div>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-soft">{empty}</p>
      ) : (
        <ul className="divide-y divide-line/40">
          {rows.map((row) => (
            <li key={row.user_id} className="flex items-center gap-3 px-4 py-3">
              <SocialAvatar name={row.display_name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{row.display_name}</div>
                <div className="text-xs text-ink-soft">
                  {row.username ? `@${row.username}` : "sem apelido"} · {row.weekly_xp} XP
                </div>
              </div>
              {row.user_id !== myUserId && (
                <Button size="sm" variant={isFollowingMap.has(row.user_id) ? "outline" : "soft"} onClick={() => onToggle(row.user_id)}>
                  {isFollowingMap.has(row.user_id) ? "Seguindo" : "Seguir"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
