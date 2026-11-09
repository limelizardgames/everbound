export type Role = "adventurer" | "game_master" | "senior_gm" | "admin" | "owner";
export const ROLE_ORDER: Role[] = ["adventurer", "game_master", "senior_gm", "admin", "owner"];
export const ROLE_LABEL: Record<Role, string> = {
  adventurer: "Adventurer",
  game_master: "Game Master",
  senior_gm: "Senior GM",
  admin: "Administrator",
  owner: "Owner",
};
export function roleAtLeast(role: Role | null | undefined, min: Role) {
  if (!role) return false;
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(min);
}

export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  show_on_leaderboards: boolean;
  is_banned: boolean;
  chat_muted_until: string | null;
  created_at: string;
};

export type Character = {
  id: string;
  profile_id: string;
  rule_set_id: string;
  name: string;
  species: string;
  class: string;
  pronouns: string | null;
  attributes: Record<string, number>;
  hp_current: number;
  hp_max: number;
  conditions: string | null;
  portrait_url: string | null;
  backstory: string | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
};

export type CharacterTotals = {
  character_id: string;
  profile_id: string;
  xp: number;
  gold: number;
  renown: number;
  level: number;
  next_level_xp: number | null;
  rank_code: string;
  rank_title: string;
  next_rank_renown: number | null;
};

export type RuleSetDefinition = {
  summary?: string;
  attributes: { key: string; label: string; hint?: string }[];
  species: { key: string; label: string; traits?: string }[];
  classes: { key: string; label: string; hp_base: number; role?: string }[];
  attribute_min: number;
  attribute_max: number;
  starting_attribute_points: number;
  level_thresholds: number[];
  starting_gold?: number;
};

export type QuestTemplate = {
  id: string;
  slug: string;
  title: string;
  quest_type: "standard" | "story" | "contract" | "party" | "elite" | "world";
  status: "draft" | "published" | "locked" | "archived";
  summary: string;
  description: string;
  rank_min: string;
  rank_max: string;
  difficulty: string;
  suggested_level: number;
  party_min: number;
  party_max: number;
  est_minutes: number;
  location_id: string | null;
  reward_preview: string | null;
  content_advisories: string[];
  created_by: string | null;
};

export type QuestSession = {
  id: string;
  template_id: string;
  starts_at: string;
  ends_at: string | null;
  venue: string;
  table_label: string | null;
  capacity: number;
  price_cents: number;
  currency: string;
  gm_id: string | null;
  status: "scheduled" | "in_progress" | "completed" | "canceled" | "archived";
  outcome_summary: string | null;
};

export type Location = {
  id: string;
  slug: string;
  name: string;
  region: string;
  status: "peaceful" | "threatened" | "besieged" | "destroyed" | "rebuilding" | "unknown";
  summary: string | null;
  lore: string | null;
  threat: string | null;
  is_discovered: boolean;
  discovered_by: string | null;
  map_x: number;
  map_y: number;
};

export type ChroniclePost = {
  id: string;
  slug: string;
  title: string;
  category: "world_news" | "adventure_outcome" | "discovery" | "npc_announcement" | "guild_proclamation";
  excerpt: string;
  body: string;
  is_featured: boolean;
  published: boolean;
  published_at: string | null;
  location_id: string | null;
};

export type PublicRaid = {
  id: string;
  slug: string;
  name: string;
  state: "dormant" | "foreshadowed" | "unlocked" | "registration" | "active" | "resolved" | "archived";
  display_text: string;
  progress: number | null;
  target: number | null;
  conditions_public: boolean;
  min_rank: string | null;
  capacity: number | null;
  registered: number;
  registration_opens_at: string | null;
  starts_at: string | null;
  is_paused: boolean;
  my_registration: string | null;
};

export type PublicCharacter = {
  name: string;
  species: string;
  class: string;
  pronouns: string | null;
  portrait_url: string | null;
  level: number;
  rank_code: string;
  rank_title: string;
  renown: number;
  joined: string;
  quests_completed: number;
  achievements: { name: string; icon: string; description: string }[];
  history: { title: string; entry_type: string; created_at: string }[];
};
