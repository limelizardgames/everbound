-- =============================================================================
-- EVERBOUND — Core schema
-- The Living Adventurers Guild
--
-- Design rules (from the platform handoff):
--  * Accounts (profiles) are separate from characters.
--  * Gold / XP / renown and inventory are immutable ledgers, never editable totals.
--  * Every table has row-level security. Privileged writes go through
--    SECURITY DEFINER functions that check the caller's role.
--  * Quest templates are separate from scheduled sessions (instances).
--  * World-state changes, raid unlocks and rewards are evaluated server-side
--    and are idempotent.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
-- Order matters: comparisons such as role >= 'game_master' rely on it.
create type public.user_role as enum ('adventurer', 'game_master', 'senior_gm', 'admin', 'owner');
create type public.card_status as enum ('unassigned', 'claimed', 'deactivated');
create type public.location_status as enum ('peaceful', 'threatened', 'besieged', 'destroyed', 'rebuilding', 'unknown');
create type public.quest_type as enum ('standard', 'story', 'contract', 'party', 'elite', 'world');
create type public.template_status as enum ('draft', 'published', 'locked', 'archived');
create type public.session_status as enum ('scheduled', 'in_progress', 'completed', 'canceled', 'archived');
create type public.reservation_status as enum ('pending_payment', 'confirmed', 'waitlisted', 'canceled', 'attended', 'no_show');
create type public.payment_status as enum ('none', 'pay_at_table', 'pending', 'paid', 'refunded', 'comped');
create type public.ledger_resource as enum ('xp', 'gold', 'renown');
create type public.result_status as enum ('draft', 'submitted', 'approved', 'rejected');
create type public.raid_state as enum ('dormant', 'foreshadowed', 'unlocked', 'registration', 'active', 'resolved', 'archived');
create type public.chronicle_category as enum ('world_news', 'adventure_outcome', 'discovery', 'npc_announcement', 'guild_proclamation');
create type public.order_status as enum ('pending', 'paid', 'fulfilled', 'canceled', 'refunded');
create type public.report_status as enum ('open', 'actioned', 'dismissed');

-- -----------------------------------------------------------------------------
-- Settings & audit
-- -----------------------------------------------------------------------------
create table public.admin_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- -----------------------------------------------------------------------------
-- Accounts
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  role public.user_role not null default 'adventurer',
  show_on_leaderboards boolean not null default true,
  age_attested boolean not null default false,
  chat_muted_until timestamptz,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role helpers. SECURITY DEFINER so they can read profiles regardless of RLS.
create or replace function public.my_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and not is_banned $$;

create or replace function public.has_role(min_role public.user_role)
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select role >= min_role from public.profiles where id = auth.uid() and not is_banned), false) $$;

create or replace function public.is_staff()
returns boolean
language sql stable
as $$ select public.has_role('game_master') $$;

create or replace function public.write_audit(p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = public
as $$ insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
      values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb)) $$;

-- New auth user -> profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Adventurer');
begin
  if char_length(v_name) < 2 then v_name := v_name || '_'; end if;
  insert into public.profiles (id, display_name, age_attested)
  values (new.id, left(v_name, 40), coalesce((new.raw_user_meta_data ->> 'age_attested')::boolean, false));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts created before this schema existed (e.g. after a reset) get profiles too.
insert into public.profiles (id, display_name)
select x.id, left(case when char_length(x.n) < 2 then x.n || '__' else x.n end, 40)
from (select u.id, coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(u.email, '@', 1), ''), 'Adventurer') as n
      from auth.users u) x
on conflict (id) do nothing;

-- Players may edit their display name and privacy flags; only admins change roles / bans.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- auth.uid() is null for the SQL editor / service role (trusted contexts).
  if auth.uid() is not null then
    if (new.role is distinct from old.role or new.is_banned is distinct from old.is_banned
        or new.chat_muted_until is distinct from old.chat_muted_until)
       and not public.has_role('admin') then
      raise exception 'Only administrators can change roles or restrictions';
    end if;
    if (new.role = 'owner' or old.role = 'owner') and new.role is distinct from old.role
       and public.my_role() is distinct from 'owner' then
      raise exception 'Only an owner can grant or remove the owner role';
    end if;
    if new.id = auth.uid() and new.role is distinct from old.role and public.my_role() is distinct from 'owner' then
      raise exception 'You cannot change your own role';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- -----------------------------------------------------------------------------
-- Rules engine (versioned, configurable — no hardcoded class/species lists)
-- -----------------------------------------------------------------------------
create table public.rule_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version int not null,
  is_active boolean not null default false,
  -- { attributes:[{key,label}], species:[{key,label,traits}], classes:[{key,label,hp_base}],
  --   level_thresholds:[0,300,900,...], starting_attribute_points, attribute_min, attribute_max }
  definition jsonb not null,
  created_at timestamptz not null default now(),
  unique (name, version)
);
create unique index rule_sets_one_active on public.rule_sets (is_active) where is_active;

create table public.rank_definitions (
  code text primary key,
  title text not null,
  renown_required int not null check (renown_required >= 0),
  sort int not null unique,
  card_design text not null default 'standard'
);

-- -----------------------------------------------------------------------------
-- Characters
-- -----------------------------------------------------------------------------
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  rule_set_id uuid not null references public.rule_sets (id),
  name text not null check (char_length(name) between 2 and 40),
  species text not null,
  class text not null,
  pronouns text,
  attributes jsonb not null default '{}'::jsonb,
  hp_current int not null default 10,
  hp_max int not null default 10 check (hp_max > 0),
  conditions text,
  portrait_url text,
  backstory text check (char_length(backstory) <= 4000),
  is_active boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index characters_profile_idx on public.characters (profile_id);
-- First release: one active character per account (structure supports many).
create unique index characters_one_active on public.characters (profile_id) where is_active;

create or replace function public.protect_character_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if new.profile_id <> old.profile_id or new.rule_set_id <> old.rule_set_id
       or new.hp_current <> old.hp_current or new.hp_max <> old.hp_max
       or new.attributes <> old.attributes or new.species <> old.species or new.class <> old.class
       or new.conditions is distinct from old.conditions then
      raise exception 'Character statistics can only be changed by a Game Master';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger characters_protect before update on public.characters
  for each row execute function public.protect_character_columns();

create table public.character_history (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  session_id uuid,
  entry_type text not null check (entry_type in ('quest', 'discovery', 'decision', 'achievement', 'rank', 'raid', 'note', 'card')),
  title text not null,
  body text,
  is_public boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index character_history_char_idx on public.character_history (character_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Guild cards (physical QR membership cards)
-- -----------------------------------------------------------------------------
create sequence public.guild_card_number_seq start 1;

create table public.guild_cards (
  id uuid primary key default gen_random_uuid(),
  card_number text not null unique,
  -- Random, unguessable token printed in the QR code. Possession of the physical
  -- card is the proof needed to claim it. It never authenticates anyone.
  token text not null unique,
  status public.card_status not null default 'unassigned',
  tier text not null default 'standard',
  personalized_name text,
  batch_label text,
  profile_id uuid references public.profiles (id) on delete set null,
  character_id uuid references public.characters (id) on delete set null,
  claimed_at timestamptz,
  deactivated_at timestamptz,
  deactivation_reason text,
  replaces_card_id uuid references public.guild_cards (id),
  created_by uuid,
  created_at timestamptz not null default now()
);
create index guild_cards_profile_idx on public.guild_cards (profile_id);
-- An account holds at most one live card at a time.
create unique index guild_cards_one_live_per_profile on public.guild_cards (profile_id) where status = 'claimed';

create or replace function public.new_card_token()
returns text
language sql volatile
as $$ select translate(encode(extensions.gen_random_bytes(15), 'base64'), '+/=', 'xyz') $$;

-- -----------------------------------------------------------------------------
-- Progression ledgers (immutable)
-- -----------------------------------------------------------------------------
create table public.ledger_entries (
  id bigint generated always as identity primary key,
  character_id uuid not null references public.characters (id) on delete cascade,
  resource public.ledger_resource not null,
  amount int not null check (amount <> 0),
  reason text not null,
  source_type text not null check (source_type in ('session', 'raid', 'admin', 'purchase', 'refund', 'correction', 'achievement', 'starting')),
  source_id text,
  idempotency_key text unique,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index ledger_char_idx on public.ledger_entries (character_id, resource);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  item_type text not null default 'gear' check (item_type in ('gear', 'consumable', 'artifact', 'material', 'cosmetic', 'key', 'trophy')),
  rarity text not null default 'common' check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  gold_price int check (gold_price is null or gold_price > 0),     -- Arcane Exchange price (null = not for sale)
  requires_flag text,                                               -- world flag that must be > 0 for it to be sold
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.inventory_transactions (
  id bigint generated always as identity primary key,
  character_id uuid not null references public.characters (id) on delete cascade,
  item_id uuid not null references public.items (id),
  quantity int not null check (quantity <> 0),
  reason text not null,
  source_type text not null check (source_type in ('session', 'raid', 'admin', 'purchase', 'refund', 'correction', 'starting', 'crafting')),
  source_id text,
  idempotency_key text unique,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index inventory_char_idx on public.inventory_transactions (character_id);

-- Ledgers are append-only. Corrections are new, opposite entries.
create or replace function public.forbid_mutation()
returns trigger language plpgsql as $$
begin raise exception '% is append-only; record a correction entry instead', tg_table_name; end $$;
create trigger ledger_append_only before update or delete on public.ledger_entries
  for each row execute function public.forbid_mutation();
create trigger inventory_append_only before update or delete on public.inventory_transactions
  for each row execute function public.forbid_mutation();
create trigger audit_append_only before update or delete on public.audit_logs
  for each row execute function public.forbid_mutation();

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null default 'star',
  renown_bonus int not null default 0,
  is_secret boolean not null default false
);

create table public.character_achievements (
  character_id uuid not null references public.characters (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id),
  session_id uuid,
  awarded_by uuid,
  awarded_at timestamptz not null default now(),
  primary key (character_id, achievement_id)
);

-- -----------------------------------------------------------------------------
-- World
-- -----------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region text not null,
  status public.location_status not null default 'unknown',
  summary text,
  lore text,
  threat text,
  is_discovered boolean not null default false,
  discovered_by text,
  map_x numeric(5, 2) not null default 50,
  map_y numeric(5, 2) not null default 50,
  updated_at timestamptz not null default now()
);

create table public.world_flags (
  key text primary key,
  label text not null,
  value int not null default 0,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.world_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('flag_change', 'location_status', 'location_discovered', 'raid_state', 'note')),
  status text not null default 'applied' check (status in ('applied', 'conflict', 'rejected')),
  description text not null,
  flag_key text,
  delta int,
  old_value int,
  new_value int,
  location_id uuid references public.locations (id),
  expected_status public.location_status,
  old_status public.location_status,
  new_status public.location_status,
  session_id uuid,
  raid_id uuid,
  created_by uuid,
  reviewed_by uuid,
  created_at timestamptz not null default now()
);
create index world_events_created_idx on public.world_events (created_at desc);

create table public.chronicle_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category public.chronicle_category not null,
  excerpt text not null,
  body text not null,
  location_id uuid references public.locations (id),
  session_id uuid,
  is_featured boolean not null default false,
  published boolean not null default false,
  published_at timestamptz,
  author_id uuid,
  created_at timestamptz not null default now()
);
create index chronicle_published_idx on public.chronicle_posts (published, published_at desc);

-- -----------------------------------------------------------------------------
-- Quests: templates (definitions) vs sessions (scheduled instances)
-- -----------------------------------------------------------------------------
create table public.quest_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  quest_type public.quest_type not null default 'standard',
  status public.template_status not null default 'draft',
  summary text not null,
  description text not null,          -- spoiler-safe, player-facing
  rank_min text not null default 'F' references public.rank_definitions (code),
  rank_max text not null default 'SS' references public.rank_definitions (code),
  difficulty text not null default 'moderate' check (difficulty in ('gentle', 'moderate', 'hard', 'deadly')),
  suggested_level int not null default 1,
  party_min int not null default 3,
  party_max int not null default 5,
  est_minutes int not null default 180,
  location_id uuid references public.locations (id),
  reward_preview text,
  content_advisories text[] not null default '{}',
  created_by uuid,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (party_min <= party_max)
);

-- GM-only story material lives in its own table so it can never leak through
-- a player-facing select.
create table public.quest_template_secrets (
  template_id uuid primary key references public.quest_templates (id) on delete cascade,
  gm_notes text,
  npcs text,
  encounter_notes text,
  consequence_hooks text
);

create table public.quest_objectives (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.quest_templates (id) on delete cascade,
  sort int not null default 0,
  description text not null,
  is_secret boolean not null default false
);

create table public.quest_sessions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.quest_templates (id),
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text not null,
  table_label text,
  capacity int not null check (capacity between 1 and 20),
  price_cents int not null default 0 check (price_cents >= 0),
  currency text not null default 'usd',
  gm_id uuid references public.profiles (id),
  status public.session_status not null default 'scheduled',
  private_notes text,                 -- staff only (also enforced via view)
  outcome_summary text,               -- spoiler-safe recap shown in the Quest Archive
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index quest_sessions_starts_idx on public.quest_sessions (starts_at);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quest_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  character_id uuid not null references public.characters (id),
  status public.reservation_status not null,
  payment_status public.payment_status not null default 'none',
  amount_cents int not null default 0,
  stripe_checkout_id text unique,
  hold_expires_at timestamptz,
  live_hp int,
  live_conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index reservations_one_per_session on public.reservations (session_id, profile_id) where status <> 'canceled';
create index reservations_profile_idx on public.reservations (profile_id);

create table public.session_results (
  session_id uuid primary key references public.quest_sessions (id) on delete cascade,
  status public.result_status not null default 'draft',
  summary_public text,
  decisions text,
  -- [{character_id, attended, xp, gold, renown, items:[{item_id, quantity}], achievements:[uuid], note}]
  rewards jsonb not null default '[]'::jsonb,
  -- {flags:[{key, delta}], locations:[{location_id, expected_status, new_status, discovered}], chronicle:{title, excerpt, body, category}}
  world_changes jsonb not null default '{}'::jsonb,
  submitted_by uuid,
  submitted_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  updated_at timestamptz not null default now()
);

-- First completion of a quest template per character (anti-duplicate scoring).
create table public.quest_completions (
  character_id uuid not null references public.characters (id) on delete cascade,
  template_id uuid not null references public.quest_templates (id),
  first_session_id uuid not null references public.quest_sessions (id),
  times_completed int not null default 1,
  first_completed_at timestamptz not null default now(),
  primary key (character_id, template_id)
);

-- -----------------------------------------------------------------------------
-- Raids
-- -----------------------------------------------------------------------------
create table public.raids (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  state public.raid_state not null default 'dormant',
  dormant_text text not null default 'No active threat has been detected.',
  foreshadow_text text,
  reveal_text text,                    -- hidden from players until UNLOCKED
  condition_flag_key text references public.world_flags (key),
  condition_target int,
  conditions_public boolean not null default false,
  min_rank text references public.rank_definitions (code),
  capacity int,
  registration_opens_at timestamptz,
  starts_at timestamptz,
  is_paused boolean not null default false,
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.raid_registrations (
  id uuid primary key default gen_random_uuid(),
  raid_id uuid not null references public.raids (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  character_id uuid not null references public.characters (id),
  status text not null default 'registered' check (status in ('registered', 'waitlisted', 'canceled', 'attended')),
  preferred_window text,
  created_at timestamptz not null default now(),
  unique (raid_id, profile_id)
);

-- -----------------------------------------------------------------------------
-- Community: The Guild Tavern
-- -----------------------------------------------------------------------------
create table public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  staff_post_only boolean not null default false,
  session_id uuid references public.quest_sessions (id) on delete cascade,  -- private party room
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  author_role public.user_role not null default 'adventurer',
  body text not null check (char_length(body) between 1 and 800),
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz not null default now()
);
create index messages_channel_idx on public.messages (channel_id, created_at desc);

create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 300),
  status public.report_status not null default 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- -----------------------------------------------------------------------------
-- Commerce: Guild Supply Shop (real money via Stripe)
-- -----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  category text not null default 'collectible',
  price_cents int not null check (price_cents > 0),
  stock int check (stock is null or stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  status public.order_status not null default 'pending',
  fulfillment text not null default 'pickup' check (fulfillment in ('pickup', 'ship')),
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled', 'ready', 'picked_up', 'shipped')),
  total_cents int not null default 0,
  stripe_checkout_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity int not null check (quantity > 0),
  unit_price_cents int not null
);

-- -----------------------------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_profile_idx on public.notifications (profile_id, created_at desc);

create or replace function public.notify(p_profile uuid, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public
as $$ insert into public.notifications (profile_id, title, body, link) values (p_profile, p_title, p_body, p_link) $$;
