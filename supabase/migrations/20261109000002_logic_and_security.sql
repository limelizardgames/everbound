-- =============================================================================
-- EVERBOUND — Server-side logic, views and row-level security
-- =============================================================================

-- Session-private GM notes live apart from the publicly readable session row.
create table public.quest_session_notes (
  session_id uuid primary key references public.quest_sessions (id) on delete cascade,
  notes text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.quest_sessions drop column private_notes;

-- -----------------------------------------------------------------------------
-- Small helpers
-- -----------------------------------------------------------------------------
create or replace function public.slugify(p text)
returns text language sql immutable
as $$ select trim(both '-' from regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '-', 'g')) $$;

create or replace function public.setting_text(p_key text, p_default text)
returns text language sql stable security definer set search_path = public
as $$ select coalesce((select value #>> '{}' from public.admin_settings where key = p_key), p_default) $$;

create or replace function public.level_for_xp(p_definition jsonb, p_xp int)
returns int language sql immutable
as $$
  select greatest(1, count(*)::int)
  from jsonb_array_elements_text(coalesce(p_definition -> 'level_thresholds', '[0]'::jsonb)) t
  where t::int <= p_xp
$$;

create or replace function public.next_level_xp(p_definition jsonb, p_xp int)
returns int language sql immutable
as $$
  select min(t::int)
  from jsonb_array_elements_text(coalesce(p_definition -> 'level_thresholds', '[0]'::jsonb)) t
  where t::int > p_xp
$$;

create or replace function public.rank_for_renown(p_renown int)
returns text language sql stable
as $$ select code from public.rank_definitions where renown_required <= greatest(p_renown, 0) order by renown_required desc limit 1 $$;

create or replace function public.rank_sort(p_code text)
returns int language sql stable
as $$ select sort from public.rank_definitions where code = p_code $$;

-- -----------------------------------------------------------------------------
-- Derived views (security_invoker => caller's RLS applies)
-- -----------------------------------------------------------------------------
create view public.character_totals with (security_invoker = true) as
with sums as (
  select c.id as character_id, c.profile_id, c.rule_set_id,
         coalesce(sum(l.amount) filter (where l.resource = 'xp'), 0)::int as xp,
         coalesce(sum(l.amount) filter (where l.resource = 'gold'), 0)::int as gold,
         coalesce(sum(l.amount) filter (where l.resource = 'renown'), 0)::int as renown
  from public.characters c
  left join public.ledger_entries l on l.character_id = c.id
  group by c.id
)
select s.character_id, s.profile_id, s.xp, s.gold, s.renown,
       public.level_for_xp(r.definition, s.xp) as level,
       public.next_level_xp(r.definition, s.xp) as next_level_xp,
       rk.code as rank_code, rk.title as rank_title,
       (select min(renown_required) from public.rank_definitions where renown_required > s.renown) as next_rank_renown
from sums s
join public.rule_sets r on r.id = s.rule_set_id
left join public.rank_definitions rk on rk.code = public.rank_for_renown(s.renown);

create view public.inventory_balances with (security_invoker = true) as
select t.character_id, t.item_id, sum(t.quantity)::int as quantity
from public.inventory_transactions t
group by t.character_id, t.item_id
having sum(t.quantity) > 0;

-- Aggregated seat counts are public; individual reservations are not.
create view public.session_seats as
select r.session_id,
       count(*) filter (where r.status in ('confirmed', 'attended')
                         or (r.status = 'pending_payment' and coalesce(r.hold_expires_at, now()) >= now()))::int as taken,
       count(*) filter (where r.status = 'waitlisted')::int as waitlisted
from public.reservations r
group by r.session_id;

-- -----------------------------------------------------------------------------
-- World-state primitives (atomic, audited, never overwrite each other)
-- -----------------------------------------------------------------------------
create or replace function public.log_location_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_reason text := nullif(current_setting('everbound.change_reason', true), '');
        v_session uuid := nullif(current_setting('everbound.session_id', true), '')::uuid;
begin
  if new.status is distinct from old.status then
    insert into public.world_events (event_type, description, location_id, old_status, new_status, session_id, created_by)
    values ('location_status', coalesce(v_reason, format('%s is now %s', new.name, new.status)), new.id, old.status, new.status, v_session, auth.uid());
  end if;
  if new.is_discovered and not old.is_discovered then
    insert into public.world_events (event_type, description, location_id, session_id, created_by)
    values ('location_discovered', coalesce(v_reason, format('%s has been discovered', new.name)), new.id, v_session, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger locations_log before update on public.locations
  for each row execute function public.log_location_change();

-- Internal: increments a world flag. Deltas (not overwrites) let two tables
-- running at once both contribute without clobbering each other.
create or replace function public._apply_flag_delta(p_key text, p_delta int, p_reason text, p_session uuid)
returns int language plpgsql security definer set search_path = public
as $$
declare v_old int; v_new int;
begin
  update public.world_flags set value = value + p_delta, updated_at = now()
  where key = p_key returning value - p_delta, value into v_old, v_new;
  if not found then raise exception 'Unknown world flag %', p_key; end if;
  insert into public.world_events (event_type, description, flag_key, delta, old_value, new_value, session_id, created_by)
  values ('flag_change', coalesce(p_reason, format('%s changed by %s', p_key, p_delta)), p_key, p_delta, v_old, v_new, p_session, auth.uid());
  return v_new;
end $$;
revoke all on function public._apply_flag_delta(text, int, text, uuid) from public, anon, authenticated;

create or replace function public.adjust_world_flag(p_key text, p_delta int, p_reason text)
returns int language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('senior_gm') then raise exception 'Senior Game Master access required'; end if;
  if p_delta = 0 then raise exception 'Delta must not be zero'; end if;
  return public._apply_flag_delta(p_key, p_delta, p_reason, null);
end $$;

-- Internal: conflict-aware location update. If the location no longer has the
-- status the GM saw when they ran the table, the change is parked for review.
create or replace function public._set_location_status(p_location uuid, p_expected public.location_status,
  p_new public.location_status, p_discovered boolean, p_reason text, p_session uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare v_loc public.locations%rowtype;
begin
  select * into v_loc from public.locations where id = p_location for update;
  if not found then raise exception 'Unknown location'; end if;
  if p_expected is not null and p_new is not null and v_loc.status <> p_expected then
    insert into public.world_events (event_type, status, description, location_id, expected_status, old_status, new_status, session_id, created_by)
    values ('location_status', 'conflict',
            coalesce(p_reason, format('Proposed: %s -> %s', v_loc.name, p_new)) || format(' (expected %s, found %s)', p_expected, v_loc.status),
            p_location, p_expected, v_loc.status, p_new, p_session, auth.uid());
    return 'conflict';
  end if;
  perform set_config('everbound.change_reason', coalesce(p_reason, ''), true);
  perform set_config('everbound.session_id', coalesce(p_session::text, ''), true);
  update public.locations
     set status = coalesce(p_new, status),
         is_discovered = is_discovered or coalesce(p_discovered, false)
   where id = p_location;
  perform set_config('everbound.change_reason', '', true);
  perform set_config('everbound.session_id', '', true);
  return 'applied';
end $$;
revoke all on function public._set_location_status(uuid, public.location_status, public.location_status, boolean, text, uuid) from public, anon, authenticated;

create or replace function public.set_location_status(p_location uuid, p_new public.location_status, p_reason text,
  p_expected public.location_status default null, p_discovered boolean default null)
returns text language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('senior_gm') then raise exception 'Senior Game Master access required'; end if;
  return public._set_location_status(p_location, p_expected, p_new, p_discovered, p_reason, null);
end $$;

create or replace function public.resolve_world_conflict(p_event uuid, p_apply boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare v_ev public.world_events%rowtype;
begin
  if not public.has_role('admin') then raise exception 'Administrator access required'; end if;
  select * into v_ev from public.world_events where id = p_event and status = 'conflict' for update;
  if not found then raise exception 'Conflict not found or already resolved'; end if;
  if p_apply then
    perform public._set_location_status(v_ev.location_id, null, v_ev.new_status, null,
      'Conflict resolved by administrator: ' || v_ev.description, v_ev.session_id);
  end if;
  update public.world_events set status = case when p_apply then 'applied' else 'rejected' end, reviewed_by = auth.uid() where id = p_event;
  perform public.write_audit('world.conflict_resolved', 'world_event', p_event::text, jsonb_build_object('applied', p_apply));
end $$;

-- -----------------------------------------------------------------------------
-- Raid engine: DORMANT → FORESHADOWED → UNLOCKED → REGISTRATION → ACTIVE → RESOLVED → ARCHIVED
-- Evaluated server-side whenever a world flag changes.
-- -----------------------------------------------------------------------------
create or replace function public._raid_transition(p_raid uuid, p_state public.raid_state, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_raid public.raids%rowtype;
begin
  update public.raids set state = p_state, updated_at = now(),
         unlocked_at = case when p_state = 'unlocked' and unlocked_at is null then now() else unlocked_at end
  where id = p_raid returning * into v_raid;
  insert into public.world_events (event_type, description, raid_id, created_by)
  values ('raid_state', coalesce(p_reason, format('%s is now %s', v_raid.name, p_state)), p_raid, auth.uid());
  if p_state = 'unlocked' then
    insert into public.chronicle_posts (slug, title, category, excerpt, body, is_featured, published, published_at)
    values (public.slugify(v_raid.name) || '-awakens-' || to_char(now(), 'YYYYMMDDHH24MISS'),
            v_raid.name || ' Has Awakened', 'guild_proclamation',
            coalesce(v_raid.foreshadow_text, 'The Guild has detected a threat of great magnitude.'),
            coalesce(v_raid.reveal_text, 'Watch the Raid Center for registration windows.'), true, true, now());
    insert into public.notifications (profile_id, title, body, link)
    select id, 'A raid has awakened', v_raid.name || ' has been unlocked. Visit the Raid Center.', '/raids'
    from public.profiles where not is_banned;
  end if;
end $$;
revoke all on function public._raid_transition(uuid, public.raid_state, text) from public, anon, authenticated;

create or replace function public.evaluate_raids()
returns trigger language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  for r in select * from public.raids
           where condition_flag_key = new.key and not is_paused and state in ('dormant', 'foreshadowed')
           for update
  loop
    if r.condition_target is not null and new.value >= r.condition_target then
      perform public._raid_transition(r.id, 'unlocked', format('%s unlocked: %s reached %s', r.name, new.label, new.value));
    elsif r.state = 'dormant' and new.value > 0 then
      perform public._raid_transition(r.id, 'foreshadowed', format('%s stirs: %s is now %s', r.name, new.label, new.value));
    end if;
  end loop;
  return new;
end $$;
create trigger world_flags_evaluate_raids after update of value on public.world_flags
  for each row when (new.value is distinct from old.value) execute function public.evaluate_raids();

create or replace function public.set_raid_state(p_raid uuid, p_state public.raid_state, p_override boolean default false)
returns void language plpgsql security definer set search_path = public
as $$
declare v_cur public.raid_state; v_order public.raid_state[] := enum_range(null::public.raid_state);
begin
  if not public.has_role('senior_gm') then raise exception 'Senior Game Master access required'; end if;
  select state into v_cur from public.raids where id = p_raid for update;
  if not found then raise exception 'Raid not found'; end if;
  if p_override then
    if not public.has_role('admin') then raise exception 'Only administrators may override raid state'; end if;
  elsif array_position(v_order, p_state) <> array_position(v_order, v_cur) + 1 then
    raise exception 'Raids advance one step at a time (% → %). Use override if necessary.', v_cur, p_state;
  end if;
  perform public._raid_transition(p_raid, p_state, null);
  perform public.write_audit('raid.state', 'raid', p_raid::text, jsonb_build_object('from', v_cur, 'to', p_state, 'override', p_override));
end $$;

create or replace function public.set_raid_paused(p_raid uuid, p_paused boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('senior_gm') then raise exception 'Senior Game Master access required'; end if;
  update public.raids set is_paused = p_paused, updated_at = now() where id = p_raid;
  perform public.write_audit(case when p_paused then 'raid.paused' else 'raid.resumed' end, 'raid', p_raid::text, '{}');
end $$;

create or replace function public.get_raids_public()
returns table (id uuid, slug text, name text, state public.raid_state, display_text text,
               progress int, target int, conditions_public boolean, min_rank text, capacity int,
               registered int, registration_opens_at timestamptz, starts_at timestamptz, is_paused boolean, my_registration text)
language sql stable security definer set search_path = public
as $$
  select r.id, r.slug,
         case when r.state = 'dormant' then 'The Sealed Gate' else r.name end,
         r.state,
         case when r.state = 'dormant' then r.dormant_text
              when r.state = 'foreshadowed' then coalesce(r.foreshadow_text, r.dormant_text)
              else coalesce(r.reveal_text, r.foreshadow_text) end,
         case when r.conditions_public or r.state >= 'unlocked' then f.value end,
         case when r.conditions_public or r.state >= 'unlocked' then r.condition_target end,
         r.conditions_public, r.min_rank, r.capacity,
         (select count(*)::int from public.raid_registrations g where g.raid_id = r.id and g.status = 'registered'),
         case when r.state >= 'unlocked' then r.registration_opens_at end,
         case when r.state >= 'unlocked' then r.starts_at end,
         r.is_paused,
         (select g.status from public.raid_registrations g where g.raid_id = r.id and g.profile_id = auth.uid())
  from public.raids r
  left join public.world_flags f on f.key = r.condition_flag_key
  where r.state <> 'archived'
  order by r.created_at
$$;

create or replace function public.register_for_raid(p_raid uuid, p_character uuid, p_window text default null)
returns text language plpgsql security definer set search_path = public
as $$
declare v_raid public.raids%rowtype; v_count int; v_status text; v_rank text;
begin
  if auth.uid() is null then raise exception 'Sign in to register'; end if;
  select * into v_raid from public.raids where id = p_raid for update;
  if not found or v_raid.state <> 'registration' or v_raid.is_paused then raise exception 'Raid registration is not open'; end if;
  if not exists (select 1 from public.characters where id = p_character and profile_id = auth.uid() and is_active) then
    raise exception 'Choose one of your active characters';
  end if;
  select rank_code into v_rank from public.character_totals where character_id = p_character;
  if v_raid.min_rank is not null and public.rank_sort(v_rank) < public.rank_sort(v_raid.min_rank) then
    raise exception 'This raid requires guild rank % or higher', v_raid.min_rank;
  end if;
  select count(*) into v_count from public.raid_registrations where raid_id = p_raid and status = 'registered';
  v_status := case when v_raid.capacity is not null and v_count >= v_raid.capacity then 'waitlisted' else 'registered' end;
  insert into public.raid_registrations (raid_id, profile_id, character_id, status, preferred_window)
  values (p_raid, auth.uid(), p_character, v_status, p_window)
  on conflict (raid_id, profile_id) do update set status = excluded.status, character_id = excluded.character_id,
     preferred_window = excluded.preferred_window
  where public.raid_registrations.status = 'canceled';
  return v_status;
end $$;

-- -----------------------------------------------------------------------------
-- Guild cards
-- -----------------------------------------------------------------------------
create or replace function public._public_character_json(p_character uuid)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'name', c.name, 'species', c.species, 'class', c.class, 'pronouns', c.pronouns,
    'portrait_url', c.portrait_url, 'level', t.level, 'rank_code', t.rank_code, 'rank_title', t.rank_title,
    'renown', t.renown, 'joined', c.created_at,
    'achievements', coalesce((select jsonb_agg(jsonb_build_object('name', a.name, 'icon', a.icon, 'description', a.description) order by ca.awarded_at)
                              from public.character_achievements ca join public.achievements a on a.id = ca.achievement_id
                              where ca.character_id = c.id), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(h) from (
                  select title, entry_type, created_at from public.character_history
                  where character_id = c.id and is_public order by created_at desc limit 8) h), '[]'::jsonb),
    'quests_completed', (select count(*) from public.quest_completions q where q.character_id = c.id)
  )
  from public.characters c
  join public.character_totals t on t.character_id = c.id
  where c.id = p_character and c.is_public
$$;
revoke all on function public._public_character_json(uuid) from public, anon, authenticated;

-- What a scanned QR code resolves to. Never signs anyone in.
create or replace function public.resolve_guild_card(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare v_card public.guild_cards%rowtype; v_char uuid;
begin
  select * into v_card from public.guild_cards where token = p_token;
  if not found then return null; end if;
  v_char := coalesce(v_card.character_id,
                     (select id from public.characters where profile_id = v_card.profile_id and is_active limit 1));
  return jsonb_build_object(
    'card_number', v_card.card_number, 'status', v_card.status, 'tier', v_card.tier,
    'personalized_name', v_card.personalized_name,
    'is_mine', v_card.profile_id is not null and v_card.profile_id = auth.uid(),
    'character', case when v_card.status = 'claimed' and v_char is not null then public._public_character_json(v_char) end
  );
end $$;

create or replace function public.get_public_character(p_card_number text)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare v_card public.guild_cards%rowtype; v_char uuid;
begin
  select * into v_card from public.guild_cards where card_number = upper(p_card_number) and status = 'claimed';
  if not found then return null; end if;
  v_char := coalesce(v_card.character_id,
                     (select id from public.characters where profile_id = v_card.profile_id and is_active limit 1));
  if v_char is null then return jsonb_build_object('card_number', v_card.card_number, 'character', null); end if;
  return jsonb_build_object('card_number', v_card.card_number, 'tier', v_card.tier, 'character', public._public_character_json(v_char));
end $$;

create or replace function public.claim_guild_card(p_token text)
returns text language plpgsql security definer set search_path = public
as $$
declare v_card public.guild_cards%rowtype; v_existing text; v_char uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to claim your guild card'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_banned) then raise exception 'Account restricted'; end if;
  select * into v_card from public.guild_cards where token = p_token for update;
  if not found then raise exception 'This card is not recognised by the Guild'; end if;
  if v_card.status = 'claimed' and v_card.profile_id = auth.uid() then return v_card.card_number; end if;
  if v_card.status <> 'unassigned' then
    raise exception 'This card has already been claimed or retired. Speak to a Guild Master if this is your card.';
  end if;
  select card_number into v_existing from public.guild_cards where profile_id = auth.uid() and status = 'claimed';
  if v_existing is not null then
    raise exception 'You already hold guild card %. A Guild Master can issue a replacement or upgrade.', v_existing;
  end if;
  select id into v_char from public.characters where profile_id = auth.uid() and is_active limit 1;
  update public.guild_cards set status = 'claimed', profile_id = auth.uid(), character_id = v_char, claimed_at = now()
  where id = v_card.id;
  if v_char is not null then
    insert into public.character_history (character_id, entry_type, title, created_by)
    values (v_char, 'card', 'Bound guild card ' || v_card.card_number, auth.uid());
  end if;
  perform public.write_audit('card.claimed', 'guild_card', v_card.id::text, jsonb_build_object('card_number', v_card.card_number));
  return v_card.card_number;
end $$;

create or replace function public.generate_guild_cards(p_count int, p_batch text, p_tier text default 'standard', p_names text[] default null)
returns setof public.guild_cards language plpgsql security definer set search_path = public
as $$
declare i int;
begin
  if not public.has_role('admin') then raise exception 'Administrator access required'; end if;
  if p_count < 1 or p_count > 200 then raise exception 'Generate between 1 and 200 cards at a time'; end if;
  for i in 1..p_count loop
    return query
      insert into public.guild_cards (card_number, token, tier, batch_label, personalized_name, created_by)
      values ('EVB-' || lpad(nextval('public.guild_card_number_seq')::text, 5, '0'), public.new_card_token(),
              coalesce(p_tier, 'standard'), p_batch, nullif(trim(coalesce(p_names[i], '')), ''), auth.uid())
      returning *;
  end loop;
  perform public.write_audit('card.generated', 'guild_card', null, jsonb_build_object('count', p_count, 'batch', p_batch, 'tier', p_tier));
end $$;

-- Staff-supervised assignment or transfer to a specific account.
create or replace function public.assign_guild_card(p_card uuid, p_profile uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_card public.guild_cards%rowtype; v_char uuid;
begin
  if not public.has_role('admin') then raise exception 'Administrator access required'; end if;
  select * into v_card from public.guild_cards where id = p_card for update;
  if not found or v_card.status = 'deactivated' then raise exception 'Card not available'; end if;
  if exists (select 1 from public.guild_cards where profile_id = p_profile and status = 'claimed' and id <> p_card) then
    raise exception 'That adventurer already holds a live card. Deactivate or replace it first.';
  end if;
  select id into v_char from public.characters where profile_id = p_profile and is_active limit 1;
  update public.guild_cards set status = 'claimed', profile_id = p_profile, character_id = v_char, claimed_at = now() where id = p_card;
  perform public.write_audit('card.assigned', 'guild_card', p_card::text,
    jsonb_build_object('card_number', v_card.card_number, 'from_profile', v_card.profile_id, 'to_profile', p_profile));
end $$;

create or replace function public.deactivate_guild_card(p_card uuid, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('admin') then raise exception 'Administrator access required'; end if;
  update public.guild_cards set status = 'deactivated', deactivated_at = now(), deactivation_reason = p_reason
  where id = p_card and status <> 'deactivated';
  if not found then raise exception 'Card not found or already deactivated'; end if;
  perform public.write_audit('card.deactivated', 'guild_card', p_card::text, jsonb_build_object('reason', p_reason));
end $$;

-- Lost card or rank upgrade: retire the old card, issue a new one bound to the same adventurer.
create or replace function public.replace_guild_card(p_card uuid, p_reason text, p_tier text default null)
returns public.guild_cards language plpgsql security definer set search_path = public
as $$
declare v_old public.guild_cards%rowtype; v_new public.guild_cards%rowtype;
begin
  if not public.has_role('admin') then raise exception 'Administrator access required'; end if;
  select * into v_old from public.guild_cards where id = p_card for update;
  if not found or v_old.status <> 'claimed' then raise exception 'Only a claimed card can be replaced'; end if;
  update public.guild_cards set status = 'deactivated', deactivated_at = now(), deactivation_reason = p_reason where id = p_card;
  insert into public.guild_cards (card_number, token, status, tier, personalized_name, batch_label, profile_id, character_id,
                                  claimed_at, replaces_card_id, created_by)
  values ('EVB-' || lpad(nextval('public.guild_card_number_seq')::text, 5, '0'), public.new_card_token(), 'claimed',
          coalesce(p_tier, v_old.tier), v_old.personalized_name, 'replacement', v_old.profile_id, v_old.character_id,
          now(), v_old.id, auth.uid())
  returning * into v_new;
  perform public.write_audit('card.replaced', 'guild_card', p_card::text,
    jsonb_build_object('old', v_old.card_number, 'new', v_new.card_number, 'reason', p_reason));
  return v_new;
end $$;

-- -----------------------------------------------------------------------------
-- Characters
-- -----------------------------------------------------------------------------
create or replace function public.create_character(p_name text, p_species text, p_class text, p_pronouns text,
  p_backstory text, p_attributes jsonb, p_is_public boolean default true)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_rs public.rule_sets%rowtype; v_def jsonb; v_id uuid; v_attr record; v_total int := 0;
        v_min int; v_max int; v_points int; v_hp int; v_cls jsonb; v_start_gold int;
begin
  if auth.uid() is null then raise exception 'Sign in to register a character'; end if;
  if exists (select 1 from public.characters where profile_id = auth.uid() and is_active) then
    raise exception 'You already have an active adventurer';
  end if;
  select * into v_rs from public.rule_sets where is_active;
  if not found then raise exception 'No active rule set configured'; end if;
  v_def := v_rs.definition;
  if not exists (select 1 from jsonb_array_elements(v_def -> 'species') s where s ->> 'key' = p_species) then
    raise exception 'Unknown species';
  end if;
  select c into v_cls from jsonb_array_elements(v_def -> 'classes') c where c ->> 'key' = p_class;
  if v_cls is null then raise exception 'Unknown class'; end if;
  v_min := coalesce((v_def ->> 'attribute_min')::int, 0);
  v_max := coalesce((v_def ->> 'attribute_max')::int, 5);
  v_points := coalesce((v_def ->> 'starting_attribute_points')::int, 8);
  for v_attr in select a ->> 'key' as key from jsonb_array_elements(v_def -> 'attributes') a loop
    if coalesce((p_attributes ->> v_attr.key)::int, v_min) not between v_min and v_max then
      raise exception 'Attribute % must be between % and %', v_attr.key, v_min, v_max;
    end if;
    v_total := v_total + coalesce((p_attributes ->> v_attr.key)::int, v_min);
  end loop;
  if v_total > v_points then raise exception 'You assigned % attribute points; the limit is %', v_total, v_points; end if;
  v_hp := coalesce((v_cls ->> 'hp_base')::int, 10) + coalesce((p_attributes ->> coalesce(v_def ->> 'hp_attribute', 'might'))::int, 0) * 2;

  insert into public.characters (profile_id, rule_set_id, name, species, class, pronouns, backstory, attributes,
                                 hp_current, hp_max, is_public)
  values (auth.uid(), v_rs.id, trim(p_name), p_species, p_class, nullif(trim(p_pronouns), ''), nullif(trim(p_backstory), ''),
          (select coalesce(jsonb_object_agg(a ->> 'key', coalesce((p_attributes ->> (a ->> 'key'))::int, v_min)), '{}'::jsonb)
             from jsonb_array_elements(v_def -> 'attributes') a),
          v_hp, v_hp, coalesce(p_is_public, true))
  returning id into v_id;

  v_start_gold := coalesce((v_def ->> 'starting_gold')::int, 0);
  if v_start_gold > 0 then
    insert into public.ledger_entries (character_id, resource, amount, reason, source_type, idempotency_key, created_by)
    values (v_id, 'gold', v_start_gold, 'Guild registration stipend', 'starting', 'starting:' || v_id, auth.uid());
  end if;
  insert into public.character_history (character_id, entry_type, title, created_by)
  values (v_id, 'note', 'Registered with the Adventurers Guild', auth.uid());
  update public.guild_cards set character_id = v_id where profile_id = auth.uid() and status = 'claimed' and character_id is null;
  return v_id;
end $$;

create or replace function public.gm_update_character_state(p_reservation uuid, p_hp int, p_conditions text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_res public.reservations%rowtype; v_gm uuid;
begin
  select * into v_res from public.reservations where id = p_reservation;
  if not found then raise exception 'Reservation not found'; end if;
  select gm_id into v_gm from public.quest_sessions where id = v_res.session_id;
  if not (public.has_role('senior_gm') or (public.is_staff() and v_gm = auth.uid())) then
    raise exception 'Only the assigned Game Master can update this table';
  end if;
  update public.reservations set live_hp = p_hp, live_conditions = p_conditions, updated_at = now() where id = p_reservation;
  update public.characters set hp_current = least(greatest(p_hp, 0), hp_max), conditions = p_conditions where id = v_res.character_id;
end $$;

-- -----------------------------------------------------------------------------
-- Bookings
-- -----------------------------------------------------------------------------
create or replace function public._promote_waitlist(p_session uuid)
returns int language plpgsql security definer set search_path = public
as $$
declare v_sess public.quest_sessions%rowtype; v_taken int; v_mode text; v_res record; v_promoted int := 0;
begin
  select * into v_sess from public.quest_sessions where id = p_session for update;
  v_mode := public.setting_text('payments_mode', 'pay_at_table');
  loop
    select taken into v_taken from public.session_seats where session_id = p_session;
    exit when coalesce(v_taken, 0) >= v_sess.capacity;
    select * into v_res from public.reservations
      where session_id = p_session and status = 'waitlisted' order by created_at limit 1 for update skip locked;
    exit when not found;
    if v_sess.price_cents > 0 and v_mode = 'stripe' then
      update public.reservations set status = 'pending_payment', payment_status = 'pending',
             hold_expires_at = now() + interval '24 hours', amount_cents = v_sess.price_cents, updated_at = now() where id = v_res.id;
      perform public.notify(v_res.profile_id, 'A seat opened up!', 'Complete payment within 24 hours to keep your seat.', '/portal/bookings');
    else
      update public.reservations set status = 'confirmed',
             payment_status = case when v_sess.price_cents > 0 then 'pay_at_table'::public.payment_status else 'none' end,
             amount_cents = v_sess.price_cents, updated_at = now() where id = v_res.id;
      perform public.notify(v_res.profile_id, 'You are off the waitlist!', 'Your seat is confirmed.', '/portal/bookings');
    end if;
    v_promoted := v_promoted + 1;
  end loop;
  return v_promoted;
end $$;
revoke all on function public._promote_waitlist(uuid) from public, anon, authenticated;

create or replace function public.reserve_seat(p_session uuid, p_character uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_sess public.quest_sessions%rowtype; v_tpl public.quest_templates%rowtype;
        v_taken int; v_status public.reservation_status; v_pay public.payment_status; v_mode text; v_id uuid; v_rank text;
begin
  if v_uid is null then raise exception 'Sign in to reserve a seat'; end if;
  if exists (select 1 from public.profiles where id = v_uid and is_banned) then raise exception 'Account restricted'; end if;
  -- Row lock serialises concurrent bookings for this session: no overselling.
  select * into v_sess from public.quest_sessions where id = p_session for update;
  if not found then raise exception 'Session not found'; end if;
  if v_sess.status <> 'scheduled' or v_sess.starts_at <= now() then raise exception 'This session is not accepting reservations'; end if;
  select * into v_tpl from public.quest_templates where id = v_sess.template_id;
  if v_tpl.status <> 'published' then raise exception 'This quest is locked'; end if;
  if not exists (select 1 from public.characters where id = p_character and profile_id = v_uid and is_active) then
    raise exception 'Choose one of your active adventurers';
  end if;
  select rank_code into v_rank from public.character_totals where character_id = p_character;
  if public.rank_sort(v_rank) < public.rank_sort(v_tpl.rank_min) then
    raise exception 'This quest requires guild rank % or higher', v_tpl.rank_min;
  end if;

  update public.reservations set status = 'canceled', updated_at = now()
   where session_id = p_session and status = 'pending_payment' and hold_expires_at < now();
  if exists (select 1 from public.reservations where session_id = p_session and profile_id = v_uid and status <> 'canceled') then
    raise exception 'You already hold a reservation for this session';
  end if;

  select coalesce((select taken from public.session_seats where session_id = p_session), 0) into v_taken;
  v_mode := public.setting_text('payments_mode', 'pay_at_table');
  if v_taken >= v_sess.capacity then v_status := 'waitlisted'; v_pay := 'none';
  elsif v_sess.price_cents = 0 then v_status := 'confirmed'; v_pay := 'none';
  elsif v_mode = 'stripe' then v_status := 'pending_payment'; v_pay := 'pending';
  else v_status := 'confirmed'; v_pay := 'pay_at_table';
  end if;

  insert into public.reservations (session_id, profile_id, character_id, status, payment_status, amount_cents, hold_expires_at)
  values (p_session, v_uid, p_character, v_status, v_pay, v_sess.price_cents,
          case when v_status = 'pending_payment' then now() + interval '30 minutes' end)
  returning id into v_id;

  if v_status = 'confirmed' then
    perform public.notify(v_uid, 'Quest accepted: ' || v_tpl.title,
      format('Your seat is confirmed for %s at %s.', to_char(v_sess.starts_at, 'Mon DD, HH12:MI AM'), v_sess.venue), '/portal/bookings');
  elsif v_status = 'waitlisted' then
    perform public.notify(v_uid, 'Waitlisted: ' || v_tpl.title, 'The table is full. We will notify you if a seat opens.', '/portal/bookings');
  end if;
  return jsonb_build_object('reservation_id', v_id, 'status', v_status, 'payment_status', v_pay, 'amount_cents', v_sess.price_cents);
end $$;

create or replace function public.cancel_reservation(p_reservation uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare v_res public.reservations%rowtype; v_had_seat boolean;
begin
  select * into v_res from public.reservations where id = p_reservation;
  if not found then raise exception 'Reservation not found'; end if;
  if v_res.profile_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') and not public.is_staff() then
    raise exception 'Not your reservation';
  end if;
  perform 1 from public.quest_sessions where id = v_res.session_id for update;  -- serialise with bookings
  select * into v_res from public.reservations where id = p_reservation for update;
  if v_res.status in ('canceled', 'attended', 'no_show') then raise exception 'This reservation can no longer be canceled'; end if;
  v_had_seat := v_res.status in ('confirmed', 'pending_payment');
  update public.reservations set status = 'canceled', updated_at = now() where id = p_reservation;
  if v_res.payment_status = 'paid' then
    insert into public.notifications (profile_id, title, body, link)
    select id, 'Refund review needed', 'A paid reservation was canceled.', '/gm/sessions/' || v_res.session_id
    from public.profiles where role >= 'admin';
  end if;
  perform public.write_audit('reservation.canceled', 'reservation', p_reservation::text, jsonb_build_object('by_staff', v_res.profile_id <> auth.uid()));
  if v_had_seat then perform public._promote_waitlist(v_res.session_id); end if;
  return 'canceled';
end $$;

-- Called only by the Stripe webhook (service role).
create or replace function public.confirm_reservation_payment(p_reservation uuid, p_checkout_id text, p_amount_cents int)
returns text language plpgsql security definer set search_path = public
as $$
declare v_res public.reservations%rowtype; v_sess public.quest_sessions%rowtype; v_taken int;
begin
  select * into v_sess from public.quest_sessions where id = (select session_id from public.reservations where id = p_reservation) for update;
  select * into v_res from public.reservations where id = p_reservation for update;
  if not found then raise exception 'Reservation not found'; end if;
  if v_res.payment_status = 'paid' then return 'already_paid'; end if;
  if p_amount_cents < v_res.amount_cents then raise exception 'Payment amount mismatch'; end if;
  if v_res.status = 'pending_payment' then
    update public.reservations set status = 'confirmed', payment_status = 'paid', stripe_checkout_id = p_checkout_id, updated_at = now() where id = p_reservation;
    perform public.notify(v_res.profile_id, 'Payment received', 'Your seat is confirmed. See you at the table!', '/portal/bookings');
    return 'confirmed';
  end if;
  -- Hold expired before payment completed: honour it if a seat is still free.
  select coalesce((select taken from public.session_seats where session_id = v_sess.id), 0) into v_taken;
  if v_taken < v_sess.capacity then
    update public.reservations set status = 'confirmed', payment_status = 'paid', stripe_checkout_id = p_checkout_id, updated_at = now() where id = p_reservation;
    return 'confirmed';
  end if;
  update public.reservations set status = 'waitlisted', payment_status = 'paid', stripe_checkout_id = p_checkout_id, updated_at = now() where id = p_reservation;
  insert into public.notifications (profile_id, title, body, link)
  select id, 'Paid reservation on waitlist', 'A payment arrived after the table filled. Refund or add a seat.', '/gm/sessions/' || v_sess.id
  from public.profiles where role >= 'admin';
  return 'waitlisted_paid';
end $$;
revoke all on function public.confirm_reservation_payment(uuid, text, int) from public, anon, authenticated;

-- Admin bookkeeping: cash collected at the table, comps, or manual refunds.
create or replace function public.admin_set_payment_status(p_reservation uuid, p_status public.payment_status)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('admin') then raise exception 'Administrator access required'; end if;
  update public.reservations set payment_status = p_status, updated_at = now() where id = p_reservation;
  if not found then raise exception 'Reservation not found'; end if;
  perform public.write_audit('reservation.payment', 'reservation', p_reservation::text, jsonb_build_object('status', p_status));
end $$;

-- -----------------------------------------------------------------------------
-- GM results & reward approval (one controlled transaction)
-- -----------------------------------------------------------------------------
create or replace function public.gm_save_results(p_session uuid, p_summary text, p_decisions text,
  p_rewards jsonb, p_world_changes jsonb, p_submit boolean)
returns public.result_status language plpgsql security definer set search_path = public
as $$
declare v_gm uuid; v_cur public.result_status; v_status public.result_status;
begin
  select gm_id into v_gm from public.quest_sessions where id = p_session;
  if not found then raise exception 'Session not found'; end if;
  if not (public.has_role('senior_gm') or (public.is_staff() and v_gm = auth.uid())) then
    raise exception 'Only the assigned Game Master can submit results';
  end if;
  select status into v_cur from public.session_results where session_id = p_session for update;
  if v_cur = 'approved' then raise exception 'Results already approved and published'; end if;
  if jsonb_typeof(coalesce(p_rewards, '[]'::jsonb)) <> 'array' then raise exception 'Rewards must be a list'; end if;
  if (select count(*) <> count(distinct e ->> 'character_id') from jsonb_array_elements(coalesce(p_rewards, '[]'::jsonb)) e) then
    raise exception 'Each character may appear only once in the rewards list';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_rewards, '[]'::jsonb)) e
             where coalesce((e ->> 'xp')::int, 0) not between -1000 and 5000
                or coalesce((e ->> 'gold')::int, 0) not between -1000 and 5000
                or coalesce((e ->> 'renown')::int, 0) not between -500 and 1000) then
    raise exception 'A reward is outside the allowed range for a single session';
  end if;
  v_status := case when p_submit then 'submitted' else 'draft' end;
  insert into public.session_results (session_id, status, summary_public, decisions, rewards, world_changes, submitted_by, submitted_at, updated_at)
  values (p_session, v_status, p_summary, p_decisions, coalesce(p_rewards, '[]'), coalesce(p_world_changes, '{}'), auth.uid(),
          case when p_submit then now() end, now())
  on conflict (session_id) do update set status = excluded.status, summary_public = excluded.summary_public,
     decisions = excluded.decisions, rewards = excluded.rewards, world_changes = excluded.world_changes,
     submitted_by = excluded.submitted_by, submitted_at = excluded.submitted_at, rejection_reason = null, updated_at = now();
  update public.quest_sessions set status = 'in_progress' where id = p_session and status = 'scheduled' and starts_at <= now() + interval '1 day';
  perform public.write_audit(case when p_submit then 'results.submitted' else 'results.saved' end, 'session', p_session::text, '{}');
  return v_status;
end $$;

create or replace function public.reject_session_results(p_session uuid, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('senior_gm') then raise exception 'Senior Game Master access required'; end if;
  update public.session_results set status = 'rejected', rejection_reason = p_reason, updated_at = now()
  where session_id = p_session and status = 'submitted';
  if not found then raise exception 'No submitted results to reject'; end if;
  perform public.write_audit('results.rejected', 'session', p_session::text, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.approve_session_results(p_session uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_res public.session_results%rowtype; v_sess public.quest_sessions%rowtype; v_tpl public.quest_templates%rowtype;
        r jsonb; it jsonb; ach text; fl jsonb; lc jsonb; v_char uuid; v_owner uuid; v_attended boolean; v_amt int;
        v_res_kind text; v_before text; v_after text; v_rewarded int := 0; v_conflicts int := 0; v_outcome text;
        v_ch jsonb; v_bonus int;
begin
  if not public.has_role('senior_gm') then raise exception 'Senior Game Master approval required'; end if;
  select * into v_res from public.session_results where session_id = p_session for update;
  if not found or v_res.status <> 'submitted' then raise exception 'There are no submitted results awaiting approval'; end if;
  select * into v_sess from public.quest_sessions where id = p_session for update;
  select * into v_tpl from public.quest_templates where id = v_sess.template_id;

  for r in select * from jsonb_array_elements(v_res.rewards) loop
    v_char := (r ->> 'character_id')::uuid;
    select c.profile_id into v_owner from public.characters c
      join public.reservations x on x.character_id = c.id and x.session_id = p_session
                                and x.status in ('confirmed', 'pending_payment', 'attended', 'no_show')
      where c.id = v_char;
    if v_owner is null then raise exception 'Character % is not on this session roster', v_char; end if;
    if v_owner = auth.uid() then raise exception 'You cannot approve rewards for your own character. Ask another Guild Master.'; end if;
    v_attended := coalesce((r ->> 'attended')::boolean, true);
    update public.reservations set status = case when v_attended then 'attended' else 'no_show' end::public.reservation_status, updated_at = now()
      where session_id = p_session and character_id = v_char and status <> 'canceled';
    continue when not v_attended;

    select rank_code into v_before from public.character_totals where character_id = v_char;
    foreach v_res_kind in array array['xp', 'gold', 'renown'] loop
      v_amt := coalesce((r ->> v_res_kind)::int, 0);
      if v_amt <> 0 then
        insert into public.ledger_entries (character_id, resource, amount, reason, source_type, source_id, idempotency_key, created_by)
        values (v_char, v_res_kind::public.ledger_resource, v_amt, 'Quest: ' || v_tpl.title, 'session', p_session::text,
                format('session:%s:%s:%s', p_session, v_char, v_res_kind), auth.uid())
        on conflict (idempotency_key) do nothing;
      end if;
    end loop;
    for it in select * from jsonb_array_elements(coalesce(r -> 'items', '[]')) loop
      insert into public.inventory_transactions (character_id, item_id, quantity, reason, source_type, source_id, idempotency_key, created_by)
      values (v_char, (it ->> 'item_id')::uuid, greatest(coalesce((it ->> 'quantity')::int, 1), 1), 'Loot: ' || v_tpl.title,
              'session', p_session::text, format('session:%s:%s:item:%s', p_session, v_char, it ->> 'item_id'), auth.uid())
      on conflict (idempotency_key) do nothing;
    end loop;
    for ach in select * from jsonb_array_elements_text(coalesce(r -> 'achievements', '[]')) loop
      insert into public.character_achievements (character_id, achievement_id, session_id, awarded_by)
      values (v_char, ach::uuid, p_session, auth.uid()) on conflict do nothing;
      if found then
        select renown_bonus into v_bonus from public.achievements where id = ach::uuid;
        if coalesce(v_bonus, 0) > 0 then
          insert into public.ledger_entries (character_id, resource, amount, reason, source_type, source_id, idempotency_key, created_by)
          values (v_char, 'renown', v_bonus, 'Achievement bonus', 'achievement', ach, format('achievement:%s:%s', ach, v_char), auth.uid())
          on conflict (idempotency_key) do nothing;
        end if;
        insert into public.character_history (character_id, session_id, entry_type, title, created_by)
        select v_char, p_session, 'achievement', 'Earned the title "' || name || '"', auth.uid() from public.achievements where id = ach::uuid;
      end if;
    end loop;
    insert into public.quest_completions (character_id, template_id, first_session_id)
    values (v_char, v_tpl.id, p_session)
    on conflict (character_id, template_id) do update set times_completed = public.quest_completions.times_completed + 1;
    insert into public.character_history (character_id, session_id, entry_type, title, body, created_by)
    values (v_char, p_session, 'quest', 'Completed: ' || v_tpl.title, nullif(r ->> 'note', ''), auth.uid());
    select rank_code into v_after from public.character_totals where character_id = v_char;
    if public.rank_sort(v_after) > public.rank_sort(v_before) then
      insert into public.character_history (character_id, session_id, entry_type, title, created_by)
      select v_char, p_session, 'rank', format('Promoted to Rank %s · %s', code, title), auth.uid() from public.rank_definitions where code = v_after;
      perform public.notify(v_owner, 'Rank up! You are now Rank ' || v_after,
        'Speak to a Guild Master about your ceremonial card upgrade.', '/portal');
    end if;
    perform public.notify(v_owner, 'Rewards granted: ' || v_tpl.title, 'Your quest rewards have been recorded by the Guild.', '/portal');
    v_rewarded := v_rewarded + 1;
  end loop;

  for fl in select * from jsonb_array_elements(coalesce(v_res.world_changes -> 'flags', '[]')) loop
    perform public._apply_flag_delta(fl ->> 'key', (fl ->> 'delta')::int,
      coalesce(fl ->> 'reason', v_tpl.title || ' outcome'), p_session);
  end loop;
  for lc in select * from jsonb_array_elements(coalesce(v_res.world_changes -> 'locations', '[]')) loop
    v_outcome := public._set_location_status((lc ->> 'location_id')::uuid, (lc ->> 'expected_status')::public.location_status,
      (lc ->> 'new_status')::public.location_status, (lc ->> 'discovered')::boolean,
      coalesce(lc ->> 'reason', v_tpl.title || ' outcome'), p_session);
    if v_outcome = 'conflict' then v_conflicts := v_conflicts + 1; end if;
  end loop;
  v_ch := v_res.world_changes -> 'chronicle';
  if v_ch is not null and coalesce(v_ch ->> 'title', '') <> '' then
    insert into public.chronicle_posts (slug, title, category, excerpt, body, location_id, session_id, published, published_at, author_id)
    values (public.slugify(v_ch ->> 'title') || '-' || substr(p_session::text, 1, 8), v_ch ->> 'title',
            coalesce(v_ch ->> 'category', 'adventure_outcome')::public.chronicle_category,
            coalesce(v_ch ->> 'excerpt', left(v_ch ->> 'body', 200)), coalesce(v_ch ->> 'body', ''), v_tpl.location_id,
            p_session, true, now(), auth.uid())
    on conflict (slug) do nothing;
  end if;

  update public.quest_sessions set status = 'completed', completed_at = now(), outcome_summary = v_res.summary_public where id = p_session;
  update public.session_results set status = 'approved', approved_by = auth.uid(), approved_at = now(), updated_at = now() where session_id = p_session;
  perform public.write_audit('results.approved', 'session', p_session::text,
    jsonb_build_object('rewarded', v_rewarded, 'conflicts', v_conflicts, 'submitted_by', v_res.submitted_by));
  return jsonb_build_object('rewarded', v_rewarded, 'world_conflicts', v_conflicts);
end $$;

-- -----------------------------------------------------------------------------
-- Economy: Arcane Exchange (gold only — never real money)
-- -----------------------------------------------------------------------------
create or replace function public.buy_with_gold(p_item uuid, p_character uuid, p_quantity int default 1)
returns int language plpgsql security definer set search_path = public
as $$
declare v_item public.items%rowtype; v_gold int; v_cost int; v_key text := gen_random_uuid()::text;
begin
  if not exists (select 1 from public.characters where id = p_character and profile_id = auth.uid() and is_active) then
    raise exception 'Choose one of your active adventurers';
  end if;
  if p_quantity < 1 or p_quantity > 20 then raise exception 'Invalid quantity'; end if;
  select * into v_item from public.items where id = p_item and is_active and gold_price is not null;
  if not found then raise exception 'That item is not sold at the Exchange'; end if;
  if v_item.requires_flag is not null and coalesce((select value from public.world_flags where key = v_item.requires_flag), 0) <= 0 then
    raise exception 'The merchants cannot get that item right now';
  end if;
  perform pg_advisory_xact_lock(hashtext('gold:' || p_character));
  select coalesce(sum(amount), 0) into v_gold from public.ledger_entries where character_id = p_character and resource = 'gold';
  v_cost := v_item.gold_price * p_quantity;
  if v_gold < v_cost then raise exception 'Not enough gold (% needed, % held)', v_cost, v_gold; end if;
  insert into public.ledger_entries (character_id, resource, amount, reason, source_type, source_id, idempotency_key, created_by)
  values (p_character, 'gold', -v_cost, 'Arcane Exchange: ' || v_item.name, 'purchase', p_item::text, 'buy:' || v_key, auth.uid());
  insert into public.inventory_transactions (character_id, item_id, quantity, reason, source_type, source_id, idempotency_key, created_by)
  values (p_character, p_item, p_quantity, 'Purchased at the Arcane Exchange', 'purchase', p_item::text, 'buy:' || v_key, auth.uid());
  return v_gold - v_cost;
end $$;

create or replace function public.admin_adjust_ledger(p_character uuid, p_resource public.ledger_resource, p_amount int, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('admin') then raise exception 'Administrator access required'; end if;
  if exists (select 1 from public.characters where id = p_character and profile_id = auth.uid()) then
    raise exception 'You cannot adjust your own character';
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'A reason is required'; end if;
  insert into public.ledger_entries (character_id, resource, amount, reason, source_type, created_by)
  values (p_character, p_resource, p_amount, p_reason, 'correction', auth.uid());
  perform public.write_audit('ledger.adjusted', 'character', p_character::text,
    jsonb_build_object('resource', p_resource, 'amount', p_amount, 'reason', p_reason));
end $$;

create or replace function public.admin_grant_item(p_character uuid, p_item uuid, p_quantity int, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('admin') then raise exception 'Administrator access required'; end if;
  if exists (select 1 from public.characters where id = p_character and profile_id = auth.uid()) then
    raise exception 'You cannot adjust your own character';
  end if;
  insert into public.inventory_transactions (character_id, item_id, quantity, reason, source_type, created_by)
  values (p_character, p_item, p_quantity, p_reason, 'correction', auth.uid());
  perform public.write_audit('inventory.adjusted', 'character', p_character::text,
    jsonb_build_object('item', p_item, 'quantity', p_quantity, 'reason', p_reason));
end $$;

-- -----------------------------------------------------------------------------
-- Moderation
-- -----------------------------------------------------------------------------
create or replace function public.set_user_role(p_profile uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('admin') then raise exception 'Administrator access required'; end if;
  update public.profiles set role = p_role where id = p_profile;
  perform public.write_audit('profile.role', 'profile', p_profile::text, jsonb_build_object('role', p_role));
end $$;

create or replace function public.restrict_user(p_profile uuid, p_mute_minutes int, p_ban boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('admin') then raise exception 'Administrator access required'; end if;
  if p_profile = auth.uid() then raise exception 'You cannot restrict yourself'; end if;
  update public.profiles set
    chat_muted_until = case when p_mute_minutes > 0 then now() + make_interval(mins => p_mute_minutes)
                            when p_mute_minutes = 0 then null else chat_muted_until end,
    is_banned = coalesce(p_ban, is_banned)
  where id = p_profile;
  perform public.write_audit('profile.restricted', 'profile', p_profile::text, jsonb_build_object('mute_minutes', p_mute_minutes, 'ban', p_ban));
end $$;

create or replace function public.moderate_message(p_message uuid, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'Moderator access required'; end if;
  update public.messages set deleted_at = now(), deleted_by = auth.uid() where id = p_message and deleted_at is null;
  update public.message_reports set status = 'actioned', resolved_by = auth.uid(), resolved_at = now()
  where message_id = p_message and status = 'open';
  perform public.write_audit('message.removed', 'message', p_message::text, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.purge_old_messages()
returns int language plpgsql security definer set search_path = public
as $$
declare v_days int := public.setting_text('chat_retention_days', '180')::int; v_n int;
begin
  delete from public.messages where created_at < now() - make_interval(days => v_days)
    and not exists (select 1 from public.message_reports r where r.message_id = messages.id and r.status = 'open');
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.purge_old_messages() from public, anon, authenticated;

create or replace function public.before_message_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_p public.profiles%rowtype;
begin
  select * into v_p from public.profiles where id = new.profile_id;
  if v_p.is_banned or coalesce(v_p.chat_muted_until > now(), false) then
    raise exception 'You are currently muted in the Tavern';
  end if;
  if (select count(*) from public.messages where profile_id = new.profile_id and created_at > now() - interval '20 seconds') >= 5 then
    raise exception 'Slow down, adventurer — wait a few seconds before posting again';
  end if;
  if new.body ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' or new.body ~ '\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}' then
    raise exception 'For everyone''s safety, please do not share email addresses or phone numbers in the Tavern';
  end if;
  new.body := trim(new.body);
  new.author_name := v_p.display_name;
  new.author_role := v_p.role;
  new.created_at := now();
  new.deleted_at := null;
  new.deleted_by := null;
  return new;
end $$;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.before_message_insert();

-- Private party room per scheduled session.
create or replace function public.create_party_channel()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.chat_channels (slug, name, description, session_id, sort)
  select 'party-' || substr(new.id::text, 1, 8), 'Party: ' || t.title,
         'Private room for adventurers booked on ' || to_char(new.starts_at, 'Mon DD'), new.id, 100
  from public.quest_templates t where t.id = new.template_id;
  insert into public.quest_session_notes (session_id) values (new.id);
  return new;
end $$;
create trigger quest_sessions_party_channel after insert on public.quest_sessions
  for each row execute function public.create_party_channel();

create or replace function public.can_view_channel(p_channel uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.chat_channels c
    where c.id = p_channel and (
      c.session_id is null or public.is_staff() or exists (
        select 1 from public.reservations r
        where r.session_id = c.session_id and r.profile_id = auth.uid()
          and r.status in ('confirmed', 'pending_payment', 'attended'))))
$$;

-- -----------------------------------------------------------------------------
-- Commerce
-- -----------------------------------------------------------------------------
create or replace function public.create_order(p_items jsonb, p_fulfillment text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_order uuid; it jsonb; v_prod public.products%rowtype; v_total int := 0; v_qty int;
begin
  if auth.uid() is null then raise exception 'Sign in to order'; end if;
  insert into public.orders (profile_id, fulfillment) values (auth.uid(), coalesce(p_fulfillment, 'pickup')) returning id into v_order;
  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(least(coalesce((it ->> 'quantity')::int, 1), 10), 1);
    select * into v_prod from public.products where id = (it ->> 'product_id')::uuid and is_active;
    if not found then raise exception 'A product is no longer available'; end if;
    if v_prod.stock is not null and v_prod.stock < v_qty then raise exception '% is out of stock', v_prod.name; end if;
    insert into public.order_items (order_id, product_id, quantity, unit_price_cents) values (v_order, v_prod.id, v_qty, v_prod.price_cents);
    v_total := v_total + v_prod.price_cents * v_qty;
  end loop;
  if v_total = 0 then raise exception 'Your satchel is empty'; end if;
  update public.orders set total_cents = v_total where id = v_order;
  return v_order;
end $$;

create or replace function public.confirm_order_payment(p_order uuid, p_checkout_id text, p_amount_cents int)
returns text language plpgsql security definer set search_path = public
as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status = 'paid' then return 'already_paid'; end if;
  if p_amount_cents < v_order.total_cents then raise exception 'Payment amount mismatch'; end if;
  update public.orders set status = 'paid', stripe_checkout_id = p_checkout_id, updated_at = now() where id = p_order;
  update public.products p set stock = greatest(p.stock - oi.quantity, 0)
    from public.order_items oi where oi.order_id = p_order and oi.product_id = p.id and p.stock is not null;
  perform public.notify(v_order.profile_id, 'Order received', 'The Guild Quartermaster is preparing your order.', '/portal/orders');
  return 'paid';
end $$;
revoke all on function public.confirm_order_payment(uuid, text, int) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Public read models
-- -----------------------------------------------------------------------------
create or replace function public.get_guild_stats()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'adventurers', (select count(*) from public.characters where is_active),
    'open_quests', (select count(*) from public.quest_sessions s join public.quest_templates t on t.id = s.template_id
                    where s.status = 'scheduled' and s.starts_at > now() and t.status = 'published'),
    'world_events', (select count(*) from public.locations where status in ('threatened', 'besieged') and is_discovered)
             + (select count(*) from public.raids where state between 'foreshadowed' and 'active'),
    'sessions_completed', (select count(*) from public.quest_sessions where status = 'completed')
  )
$$;

create or replace function public.get_leaderboard(p_metric text default 'renown', p_scope text default 'season', p_limit int default 25)
returns table (place bigint, character_name text, card_number text, species text, class text, rank_code text, value bigint)
language sql stable security definer set search_path = public
as $$
  with season as (
    select case when p_scope = 'season' then coalesce(public.setting_text('season_start', null)::timestamptz, '-infinity'::timestamptz)
                else '-infinity'::timestamptz end as start_at
  ),
  eligible as (
    select c.id, c.name, c.species, c.class, c.profile_id
    from public.characters c join public.profiles p on p.id = c.profile_id
    where c.is_public and c.is_active and p.show_on_leaderboards and not p.is_banned and p.role < 'game_master'
  ),
  scored as (
    select e.*,
      case p_metric
        when 'quests' then (select count(*) from public.quest_completions q, season s where q.character_id = e.id and q.first_completed_at >= s.start_at)
        when 'discoveries' then (select count(distinct h.title) from public.character_history h, season s
                                 where h.character_id = e.id and h.entry_type = 'discovery' and h.created_at >= s.start_at)
        when 'achievements' then (select count(*) from public.character_achievements a, season s where a.character_id = e.id and a.awarded_at >= s.start_at)
        else (select coalesce(sum(l.amount), 0) from public.ledger_entries l, season s
              where l.character_id = e.id and l.resource = 'renown' and l.created_at >= s.start_at)
      end::bigint as value
    from eligible e
  )
  select rank() over (order by s.value desc), s.name,
         (select g.card_number from public.guild_cards g where g.profile_id = s.profile_id and g.status = 'claimed' limit 1),
         s.species, s.class, t.rank_code, s.value
  from scored s join public.character_totals t on t.character_id = s.id
  where s.value > 0
  order by s.value desc, s.name
  limit least(greatest(p_limit, 1), 100)
$$;

-- -----------------------------------------------------------------------------
-- Quest template publishing guard (senior GM approves)
-- -----------------------------------------------------------------------------
create or replace function public.guard_template_status()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    if new.status <> 'draft' and auth.uid() is not null and not public.has_role('senior_gm') then new.status := 'draft'; end if;
  elsif new.status is distinct from old.status and auth.uid() is not null and not public.has_role('senior_gm') then
    raise exception 'A Senior Game Master must approve status changes';
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then new.approved_by := auth.uid(); end if;
  new.updated_at := now();
  return new;
end $$;
create trigger quest_templates_guard before insert or update on public.quest_templates
  for each row execute function public.guard_template_status();

-- =============================================================================
-- Row-level security
-- =============================================================================
alter table public.admin_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.profiles enable row level security;
alter table public.rule_sets enable row level security;
alter table public.rank_definitions enable row level security;
alter table public.characters enable row level security;
alter table public.character_history enable row level security;
alter table public.guild_cards enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.items enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.achievements enable row level security;
alter table public.character_achievements enable row level security;
alter table public.locations enable row level security;
alter table public.world_flags enable row level security;
alter table public.world_events enable row level security;
alter table public.chronicle_posts enable row level security;
alter table public.quest_templates enable row level security;
alter table public.quest_template_secrets enable row level security;
alter table public.quest_objectives enable row level security;
alter table public.quest_sessions enable row level security;
alter table public.quest_session_notes enable row level security;
alter table public.reservations enable row level security;
alter table public.session_results enable row level security;
alter table public.quest_completions enable row level security;
alter table public.raids enable row level security;
alter table public.raid_registrations enable row level security;
alter table public.chat_channels enable row level security;
alter table public.messages enable row level security;
alter table public.message_reports enable row level security;
alter table public.user_blocks enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notifications enable row level security;

-- Settings: public read of non-secret config, admin write.
create policy settings_read on public.admin_settings for select using (true);
create policy settings_write on public.admin_settings for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy audit_read on public.audit_logs for select using (public.has_role('admin'));

create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.has_role('admin'));

create policy rule_sets_read on public.rule_sets for select using (true);
create policy rule_sets_write on public.rule_sets for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy ranks_read on public.rank_definitions for select using (true);
create policy ranks_write on public.rank_definitions for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy characters_read on public.characters for select using (profile_id = auth.uid() or public.is_staff());
create policy characters_update on public.characters for update using (profile_id = auth.uid() or public.is_staff());

create policy history_read on public.character_history for select
  using (public.is_staff() or exists (select 1 from public.characters c where c.id = character_id and c.profile_id = auth.uid()));
create policy history_write on public.character_history for insert with check (public.is_staff());

create policy cards_read on public.guild_cards for select using (profile_id = auth.uid() or public.is_staff());

create policy ledger_read on public.ledger_entries for select
  using (public.is_staff() or exists (select 1 from public.characters c where c.id = character_id and c.profile_id = auth.uid()));

create policy items_read on public.items for select using (is_active or public.is_staff());
create policy items_write on public.items for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy inventory_read on public.inventory_transactions for select
  using (public.is_staff() or exists (select 1 from public.characters c where c.id = character_id and c.profile_id = auth.uid()));

create policy achievements_read on public.achievements for select using (not is_secret or public.is_staff()
  or exists (select 1 from public.character_achievements ca join public.characters c on c.id = ca.character_id
             where ca.achievement_id = achievements.id and c.profile_id = auth.uid()));
create policy achievements_write on public.achievements for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy char_achievements_read on public.character_achievements for select
  using (public.is_staff() or exists (select 1 from public.characters c where c.id = character_id and c.profile_id = auth.uid()));

create policy locations_read on public.locations for select using (is_discovered or public.is_staff());
create policy locations_write on public.locations for all using (public.has_role('senior_gm')) with check (public.has_role('senior_gm'));

create policy flags_read on public.world_flags for select using (is_public or public.is_staff());
create policy flags_insert on public.world_flags for insert with check (public.has_role('senior_gm'));

create policy world_events_read on public.world_events for select using (public.is_staff());

create policy chronicle_read on public.chronicle_posts for select using (published or public.is_staff());
create policy chronicle_write on public.chronicle_posts for all using (public.has_role('senior_gm')) with check (public.has_role('senior_gm'));

create policy templates_read on public.quest_templates for select using (status in ('published', 'locked') or public.is_staff());
create policy templates_insert on public.quest_templates for insert with check (public.is_staff());
create policy templates_update on public.quest_templates for update
  using (public.has_role('senior_gm') or (public.is_staff() and created_by = auth.uid() and status = 'draft'));
create policy templates_delete on public.quest_templates for delete using (public.has_role('admin'));
create policy template_secrets_all on public.quest_template_secrets for all using (public.is_staff()) with check (public.is_staff());
create policy objectives_read on public.quest_objectives for select
  using (public.is_staff() or (not is_secret and exists (select 1 from public.quest_templates t where t.id = template_id and t.status in ('published', 'locked'))));
create policy objectives_write on public.quest_objectives for all using (public.is_staff()) with check (public.is_staff());

create policy sessions_read on public.quest_sessions for select
  using (public.is_staff() or exists (select 1 from public.quest_templates t where t.id = template_id and t.status in ('published', 'locked')));
create policy sessions_insert on public.quest_sessions for insert with check (public.is_staff());
create policy sessions_update on public.quest_sessions for update using (public.has_role('senior_gm') or (public.is_staff() and gm_id = auth.uid()));
create policy sessions_delete on public.quest_sessions for delete using (public.has_role('admin'));
create policy session_notes_all on public.quest_session_notes for all using (public.is_staff()) with check (public.is_staff());

create policy reservations_read on public.reservations for select using (profile_id = auth.uid() or public.is_staff());
create policy results_read on public.session_results for select using (public.is_staff());
create policy completions_read on public.quest_completions for select
  using (public.is_staff() or exists (select 1 from public.characters c where c.id = character_id and c.profile_id = auth.uid()));

create policy raids_staff on public.raids for select using (public.is_staff());
create policy raids_write on public.raids for insert with check (public.has_role('senior_gm'));
create policy raids_update on public.raids for update using (public.has_role('senior_gm'));
create policy raid_regs_read on public.raid_registrations for select using (profile_id = auth.uid() or public.is_staff());
create policy raid_regs_cancel on public.raid_registrations for update using (profile_id = auth.uid() or public.is_staff())
  with check (status = 'canceled' or public.is_staff());

create policy channels_read on public.chat_channels for select using (auth.uid() is not null and public.can_view_channel(id));
create policy channels_write on public.chat_channels for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy messages_read on public.messages for select using (
  auth.uid() is not null and public.can_view_channel(channel_id)
  and (deleted_at is null or public.is_staff())
  and not exists (select 1 from public.user_blocks b where b.blocker_id = auth.uid() and b.blocked_id = messages.profile_id));
create policy messages_insert on public.messages for insert with check (
  profile_id = auth.uid() and public.can_view_channel(channel_id)
  and (public.is_staff() or not exists (select 1 from public.chat_channels c where c.id = channel_id and c.staff_post_only)));

create policy reports_insert on public.message_reports for insert with check (reporter_id = auth.uid());
create policy reports_read on public.message_reports for select using (reporter_id = auth.uid() or public.is_staff());
create policy reports_update on public.message_reports for update using (public.is_staff());

create policy blocks_own on public.user_blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy products_read on public.products for select using (is_active or public.has_role('admin'));
create policy products_write on public.products for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy orders_read on public.orders for select using (profile_id = auth.uid() or public.has_role('admin'));
create policy orders_update on public.orders for update using (public.has_role('admin'));
create policy order_items_read on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.profile_id = auth.uid() or public.has_role('admin'))));

create policy notifications_own on public.notifications for select using (profile_id = auth.uid());
create policy notifications_mark on public.notifications for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy notifications_delete on public.notifications for delete using (profile_id = auth.uid());

-- Internal helpers must never be callable through the API.
revoke all on function public.notify(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.write_audit(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_reservation_payment(uuid, text, int) to service_role;
grant execute on function public.confirm_order_payment(uuid, text, int) to service_role;
grant execute on function public.purge_old_messages() to service_role;

-- Only aggregated seat counts are exposed publicly.
grant select on public.session_seats to anon, authenticated;

-- Players never call internal helpers directly; anon can only read public RPCs.
revoke execute on function public.create_character(text, text, text, text, text, jsonb, boolean) from public, anon;
grant execute on function public.create_character(text, text, text, text, text, jsonb, boolean) to authenticated;
revoke execute on function public.claim_guild_card(text) from public, anon;
grant execute on function public.claim_guild_card(text) to authenticated;
revoke execute on function public.reserve_seat(uuid, uuid) from public, anon;
grant execute on function public.reserve_seat(uuid, uuid) to authenticated;
revoke execute on function public.buy_with_gold(uuid, uuid, int) from public, anon;
grant execute on function public.buy_with_gold(uuid, uuid, int) to authenticated;

-- Realtime for the Tavern and notifications (Supabase only).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
