-- Allegiances and party-vs-party (PvP)
--
-- * Every adventurer belongs to the Adventurers Guild until they pledge to another
--   faction (from a minimum rank, with a cooldown between changes).
-- * PvP is opt-in per adventurer. Party-vs-party quests (skirmish / contested) and
--   two-sided raids only accept adventurers who have opted in.
-- * Two-sided raids: each registration records a side. A faction's raid_side decides
--   it (attackers / defenders); "either" factions (mercenaries) choose at sign-up.

-- New columns first (functions below refer to them).
alter table public.quest_templates add column if not exists pvp_mode text check (pvp_mode in ('skirmish', 'contested'));
alter table public.raids add column if not exists two_sided boolean not null default false;
alter table public.raid_registrations add column if not exists side text not null default 'attackers'
  check (side in ('attackers', 'defenders'));

-- ---------------------------------------------------------------------------
-- Factions
-- ---------------------------------------------------------------------------
create table if not exists public.factions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  motto text not null,
  description text not null,
  color text not null default 'gold' check (color in ('gold', 'ember', 'arcane', 'epic', 'green')),
  raid_side text not null default 'attackers' check (raid_side in ('attackers', 'defenders', 'either')),
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists factions_one_default on public.factions (is_default) where is_default;

insert into public.factions (slug, name, motto, description, color, raid_side, is_default, sort) values
  ('adventurers-guild', 'The Adventurers Guild', 'Protect the realm',
   'Everyone starts here. Defend the towns, recover the sigils and stand against what wakes beyond the gate.', 'gold', 'attackers', true, 1),
  ('ashen-covenant', 'The Ashen Covenant', 'Serve the Wyrm',
   'Cultists who want the Crimson Wyrm free. They sabotage sigil hunts and guard the Wyrm''s lair when the raid comes.', 'ember', 'defenders', false, 2),
  ('free-companies', 'The Free Companies', 'Gold before glory',
   'Mercenaries loyal to coin. They take contracts from either side and can tip a close fight.', 'arcane', 'either', false, 3)
on conflict (slug) do nothing;

alter table public.factions enable row level security;
drop policy if exists factions_read on public.factions;
create policy factions_read on public.factions for select using (true);
drop policy if exists factions_admin on public.factions;
create policy factions_admin on public.factions for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- ---------------------------------------------------------------------------
-- Adventurer allegiance + PvP opt-in
-- ---------------------------------------------------------------------------
alter table public.characters add column if not exists faction_id uuid references public.factions (id);
alter table public.characters add column if not exists faction_changed_at timestamptz;
alter table public.characters add column if not exists pvp_opt_in boolean not null default false;

create table if not exists public.allegiance_changes (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  from_faction uuid references public.factions (id),
  to_faction uuid references public.factions (id),
  changed_by uuid,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists allegiance_changes_char_idx on public.allegiance_changes (character_id, created_at desc);
alter table public.allegiance_changes enable row level security;
drop policy if exists allegiance_changes_read on public.allegiance_changes;
create policy allegiance_changes_read on public.allegiance_changes for select using (
  public.is_staff() or exists (select 1 from public.characters c where c.id = character_id and c.profile_id = auth.uid()));

-- Players may edit their own character row (name, backstory...), so allegiance
-- columns are protected: they change only through the functions below.
create or replace function public.protect_character_allegiance()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (new.faction_id is distinct from old.faction_id or new.faction_changed_at is distinct from old.faction_changed_at
      or new.pvp_opt_in is distinct from old.pvp_opt_in)
     and auth.uid() is not null and coalesce(current_setting('everbound.trusted', true), '') <> '1' then
    raise exception 'Allegiance and PvP settings change only from the Allegiance page';
  end if;
  return new;
end $$;
drop trigger if exists characters_protect_allegiance on public.characters;
create trigger characters_protect_allegiance before update on public.characters
  for each row execute function public.protect_character_allegiance();

insert into public.admin_settings (key, value) values
  ('allegiance_min_rank', '"D"'::jsonb),
  ('allegiance_cooldown_days', '90'::jsonb)
on conflict (key) do nothing;

-- The faction an adventurer is effectively in (the default faction when unset).
create or replace function public._faction_of(p_character uuid)
returns uuid language sql stable security definer set search_path = public
as $$
  select coalesce((select faction_id from public.characters where id = p_character),
                  (select id from public.factions where is_default limit 1))
$$;

create or replace function public._own_active_character(p_character uuid)
returns void language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_banned) then raise exception 'Account restricted'; end if;
  if not exists (select 1 from public.characters where id = p_character and profile_id = auth.uid() and is_active) then
    raise exception 'Choose one of your active adventurers';
  end if;
end $$;

-- Is this adventurer signed up for something that depends on their side or PvP status?
create or replace function public._pvp_commitments(p_character uuid)
returns int language sql stable security definer set search_path = public
as $$
  select (select count(*) from public.raid_registrations g join public.raids r on r.id = g.raid_id
           where g.character_id = p_character and g.status in ('registered', 'waitlisted')
             and r.state in ('unlocked', 'registration', 'active'))::int
       + (select count(*) from public.reservations v
           join public.quest_sessions s on s.id = v.session_id
           join public.quest_templates t on t.id = s.template_id
           where v.character_id = p_character and t.pvp_mode is not null
             and v.status in ('pending_payment', 'confirmed', 'waitlisted') and s.starts_at > now())::int
$$;

create or replace function public.pledge_allegiance(p_character uuid, p_faction uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare f public.factions%rowtype; c public.characters%rowtype; v_rank text; v_min text := public.setting_text('allegiance_min_rank', 'D');
        v_days int := coalesce((select (value #>> '{}')::int from public.admin_settings where key = 'allegiance_cooldown_days'), 90);
        v_current uuid;
begin
  perform public._own_active_character(p_character);
  select * into f from public.factions where id = p_faction and is_active;
  if not found then raise exception 'That allegiance is not available'; end if;
  select * into c from public.characters where id = p_character for update;
  v_current := public._faction_of(p_character);
  if v_current = p_faction then raise exception 'You already serve %', f.name; end if;
  select rank_code into v_rank from public.character_totals where character_id = p_character;
  if not f.is_default and public.rank_sort(v_rank) < public.rank_sort(v_min) then
    raise exception 'Pledging to another allegiance opens at guild rank %', v_min;
  end if;
  if c.faction_changed_at is not null and c.faction_changed_at > now() - make_interval(days => v_days) then
    raise exception 'You changed allegiance recently. You can change again on %', to_char(c.faction_changed_at + make_interval(days => v_days), 'Mon DD, YYYY');
  end if;
  if public._pvp_commitments(p_character) > 0 then
    raise exception 'You are signed up for a raid or a party-vs-party quest. Finish or cancel it before changing sides';
  end if;
  perform set_config('everbound.trusted', '1', true);
  update public.characters set faction_id = p_faction, faction_changed_at = now() where id = p_character;
  perform set_config('everbound.trusted', '', true);
  insert into public.allegiance_changes (character_id, from_faction, to_faction, changed_by)
  values (p_character, v_current, p_faction, auth.uid());
  insert into public.character_history (character_id, entry_type, title, is_public)
  values (p_character, 'note', 'Pledged allegiance to ' || f.name, true);
  return 'You now serve ' || f.name || '.';
end $$;

create or replace function public.set_pvp_opt_in(p_character uuid, p_on boolean)
returns text language plpgsql security definer set search_path = public
as $$
begin
  perform public._own_active_character(p_character);
  if not p_on and public._pvp_commitments(p_character) > 0 then
    raise exception 'You are signed up for a raid or a party-vs-party quest. Cancel it before turning PvP off';
  end if;
  perform set_config('everbound.trusted', '1', true);
  update public.characters set pvp_opt_in = p_on where id = p_character;
  perform set_config('everbound.trusted', '', true);
  return case when p_on then 'PvP turned on. You can now join party-vs-party quests and two-sided raids.' else 'PvP turned off.' end;
end $$;

-- Staff correction: move an adventurer to any allegiance, ignoring rank and cooldown.
create or replace function public.gm_set_allegiance(p_character uuid, p_faction uuid, p_reason text)
returns text language plpgsql security definer set search_path = public
as $$
declare v_current uuid; v_name text;
begin
  if not public.has_role('admin') then raise exception 'Administrators only'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'A reason is required'; end if;
  select name into v_name from public.factions where id = p_faction;
  if v_name is null then raise exception 'Unknown allegiance'; end if;
  v_current := public._faction_of(p_character);
  perform set_config('everbound.trusted', '1', true);
  update public.characters set faction_id = p_faction where id = p_character;
  perform set_config('everbound.trusted', '', true);
  insert into public.allegiance_changes (character_id, from_faction, to_faction, changed_by, note)
  values (p_character, v_current, p_faction, auth.uid(), trim(p_reason));
  perform public.write_audit('set_allegiance', 'character', p_character::text, jsonb_build_object('faction', v_name, 'reason', trim(p_reason)));
  return 'Allegiance set to ' || v_name || '.';
end $$;

-- Public overview: factions with member counts.
create or replace function public.get_factions()
returns table (id uuid, slug text, name text, motto text, description text, color text, raid_side text,
               is_default boolean, members int, pvp_members int)
language sql stable security definer set search_path = public
as $$
  select f.id, f.slug, f.name, f.motto, f.description, f.color, f.raid_side, f.is_default,
         (select count(*)::int from public.characters c where c.is_active and coalesce(c.faction_id, (select id from public.factions where is_default limit 1)) = f.id),
         (select count(*)::int from public.characters c where c.is_active and c.pvp_opt_in and coalesce(c.faction_id, (select id from public.factions where is_default limit 1)) = f.id)
  from public.factions f where f.is_active order by f.sort
$$;

-- ---------------------------------------------------------------------------
-- Party-vs-party quests
-- ---------------------------------------------------------------------------

create or replace function public.check_reservation_pvp()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_mode text; v_opt boolean;
begin
  if tg_op = 'UPDATE' and new.session_id is not distinct from old.session_id then return new; end if;
  select t.pvp_mode into v_mode from public.quest_sessions s join public.quest_templates t on t.id = s.template_id where s.id = new.session_id;
  if v_mode is null then return new; end if;
  select pvp_opt_in into v_opt from public.characters where id = new.character_id;
  if not coalesce(v_opt, false) then
    raise exception 'This is a party-vs-party quest. Turn on PvP on your Allegiance page to book it';
  end if;
  return new;
end $$;
drop trigger if exists reservations_pvp_check on public.reservations;
create trigger reservations_pvp_check before insert or update of session_id on public.reservations
  for each row execute function public.check_reservation_pvp();

-- ---------------------------------------------------------------------------
-- Two-sided raids
-- ---------------------------------------------------------------------------
update public.raids set two_sided = true where slug = 'the-crimson-wyrm';

drop function if exists public.register_for_raid(uuid, uuid, text);
create or replace function public.register_for_raid(p_raid uuid, p_character uuid, p_window text default null, p_side text default null)
returns text language plpgsql security definer set search_path = public
as $$
declare v_raid public.raids%rowtype; v_count int; v_status text; v_rank text; v_side text; f public.factions%rowtype; v_opt boolean;
begin
  perform public._own_active_character(p_character);
  select * into v_raid from public.raids where id = p_raid for update;
  if not found or v_raid.state <> 'registration' or v_raid.is_paused then raise exception 'Raid registration is not open'; end if;
  select rank_code into v_rank from public.character_totals where character_id = p_character;
  if v_raid.min_rank is not null and public.rank_sort(v_rank) < public.rank_sort(v_raid.min_rank) then
    raise exception 'This raid requires guild rank % or higher', v_raid.min_rank;
  end if;
  v_side := 'attackers';
  if v_raid.two_sided then
    select pvp_opt_in into v_opt from public.characters where id = p_character;
    if not v_opt then raise exception 'This raid has two sides and players fight each other. Turn on PvP on your Allegiance page to join'; end if;
    select * into f from public.factions where id = public._faction_of(p_character);
    v_side := case f.raid_side when 'either' then coalesce(p_side, 'attackers') else f.raid_side end;
    if v_side not in ('attackers', 'defenders') then raise exception 'Choose a side'; end if;
  end if;
  select count(*) into v_count from public.raid_registrations where raid_id = p_raid and status = 'registered';
  v_status := case when v_raid.capacity is not null and v_count >= v_raid.capacity then 'waitlisted' else 'registered' end;
  insert into public.raid_registrations (raid_id, profile_id, character_id, status, preferred_window, side)
  values (p_raid, auth.uid(), p_character, v_status, p_window, v_side)
  on conflict (raid_id, profile_id) do update set status = excluded.status, character_id = excluded.character_id,
     preferred_window = excluded.preferred_window, side = excluded.side
  where public.raid_registrations.status = 'canceled';
  return v_status;
end $$;
revoke execute on function public.register_for_raid(uuid, uuid, text, text) from public, anon;
grant execute on function public.register_for_raid(uuid, uuid, text, text) to authenticated;

-- Side counts for the Raid Center (all raids, public).
create or replace function public.get_raid_sides()
returns table (raid_id uuid, two_sided boolean, attackers int, defenders int, my_side text)
language sql stable security definer set search_path = public
as $$
  select r.id, r.two_sided,
         (select count(*)::int from public.raid_registrations g where g.raid_id = r.id and g.status = 'registered' and g.side = 'attackers'),
         (select count(*)::int from public.raid_registrations g where g.raid_id = r.id and g.status = 'registered' and g.side = 'defenders'),
         (select g.side from public.raid_registrations g where g.raid_id = r.id and g.profile_id = auth.uid() and g.status <> 'canceled')
  from public.raids r where r.state <> 'archived'
$$;

-- Public profile (guild card page) shows allegiance.
create or replace function public.get_character_allegiance(p_character uuid)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('name', f.name, 'slug', f.slug, 'color', f.color)
  from public.factions f where f.id = public._faction_of(p_character)
$$;

revoke all on function public._faction_of(uuid) from public, anon, authenticated;
revoke all on function public._own_active_character(uuid) from public, anon, authenticated;
revoke all on function public._pvp_commitments(uuid) from public, anon, authenticated;
revoke execute on function public.pledge_allegiance(uuid, uuid) from public, anon;
grant execute on function public.pledge_allegiance(uuid, uuid) to authenticated;
revoke execute on function public.set_pvp_opt_in(uuid, boolean) from public, anon;
grant execute on function public.set_pvp_opt_in(uuid, boolean) to authenticated;
revoke execute on function public.gm_set_allegiance(uuid, uuid, text) from public, anon;
grant execute on function public.gm_set_allegiance(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
