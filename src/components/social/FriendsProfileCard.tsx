import { useCallback, useEffect, useState } from "react";
import { useStore } from "../../lib/store";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import {
  fetchMySocialSettings,
  listFollowers,
  listFollowing,
} from "../../services/socialService";
import { FriendsProfileSummary } from "./SocialCards";

export function FriendsProfileCard() {
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const cloudReady = isSupabaseBackendEnabled() && authMode === "cloud";
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [username, setUsername] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cloudReady) return;
    const [settings, following, followers] = await Promise.all([
      fetchMySocialSettings(),
      listFollowing(),
      listFollowers(),
    ]);
    if (settings.ok) setUsername(settings.data.username);
    if (following.ok) setFollowingCount(following.data.length);
    if (followers.ok) setFollowersCount(followers.data.length);
  }, [cloudReady]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <FriendsProfileSummary
      followingCount={followingCount}
      followersCount={followersCount}
      username={username}
      cloudReady={cloudReady}
    />
  );
}
