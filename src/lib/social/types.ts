import type { LeagueTier } from "../leagues";

export type SocialActivityType = "lesson_complete" | "league_up" | "streak" | "achievement";

export interface PublicProfile {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_key: string | null;
  league_tier: LeagueTier | string;
  weekly_xp: number;
  streak: number;
  joined_at: string;
  show_in_search?: boolean;
}

export interface SocialFollowRow {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_key: string | null;
  league_tier: string;
  weekly_xp: number;
  streak: number;
  followed_at: string;
}

export interface SocialActivityItem {
  id: string;
  user_id: string;
  display_name: string;
  username: string | null;
  event_type: SocialActivityType;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface SocialProfileSettings {
  username: string | null;
  show_in_search: boolean;
}
