-- =============================================================================
-- EVERBOUND — Guild Errands (at-home mini-quests) and Professions (crafting)
--
-- Errands reward ONLY materials and small amounts of gold (never XP or renown),
-- so rank and level stay earned at the table.
--   * Expeditions: send your adventurer on a timed job; claim the haul later.
--   * Riddles: lore questions answered from the Chronicle and quest pages,
--     checked on the server (answers are never sent to players).
-- Professions: each adventurer learns up to two; recipes turn materials into
-- gear and consumables that can be used at the table or sold at auction.
-- Profession skill (crafting level) is separate from character XP.
-- Everything flows through the same append-only ledgers.
-- =============================================================================

alter table public.ledger_entries drop constraint if exists ledger_entries_source_type_check;
alter table public.ledger_entries add constraint ledger_entries_source_type_check
  check (source_type in ('session', 'raid', 'admin', 'purchase', 'refund', 'correction', 'achievement', 'starting', 'auction', 'errand', 'crafting'));
alter table public.inventory_transactions drop constraint if exists inventory_transactions_source_type_check;
alter table public.inventory_transactions add constraint inventory_transactions_source_type_check
  check (source_type in ('session', 'raid', 'admin', 'purchase', 'refund', 'correction', 'starting', 'crafting', 'auction', 'errand'));

insert into public.admin_settings (key, value, description) values
  ('expedition_slots', '2', 'How many expeditions one adventurer can have running at once'),
  ('errand_daily_cap', '8', 'Max errand rewards one adventurer can collect in any 24 hours'),
  ('riddle_attempts_per_day', '5', 'Wrong answers allowed per riddle per 24 hours'),
  ('profession_slots', '2', 'How many professions one adventurer can learn')
on conflict (key) do nothing;

-- ---------------------------------------------------------------- tables
create table if not exists public.professions (
  key text primary key,
  name text not null,
  description text not null,
  icon text not null default 'hammer',
  sort int not null default 0
);

create table if not exists public.character_professions (
  character_id uuid not null references public.characters (id) on delete cascade,
  profession_key text not null references public.professions (key),
  xp int not null default 0 check (xp >= 0),
  learned_at timestamptz not null default now(),
  primary key (character_id, profession_key)
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  profession_key text not null references public.professions (key),
  required_level int not null default 1 check (required_level between 1 and 10),
  output_item_id uuid not null references public.items (id),
  output_quantity int not null default 1 check (output_quantity between 1 and 20),
  prof_xp int not null default 10 check (prof_xp between 1 and 200),
  gold_cost int not null default 0 check (gold_cost between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  item_id uuid not null references public.items (id),
  quantity int not null check (quantity between 1 and 50),
  primary key (recipe_id, item_id)
);

create table if not exists public.errands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  kind text not null check (kind in ('expedition', 'riddle')),
  description text not null,
  location_id uuid references public.locations (id),
  min_rank text not null default 'F' references public.rank_definitions (code),
  duration_minutes int check (duration_minutes is null or duration_minutes between 5 and 4320),
  gold_reward int not null default 0 check (gold_reward between 0 and 50),   -- "small gold" by design
  is_active boolean not null default true,
  sort int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (kind = 'riddle' or duration_minutes is not null)
);

create table if not exists public.errand_rewards (
  id bigint generated always as identity primary key,
  errand_id uuid not null references public.errands (id) on delete cascade,
  item_id uuid not null references public.items (id),
  qty_min int not null default 1 check (qty_min >= 1),
  qty_max int not null default 1,
  chance numeric(4, 3) not null default 1 check (chance > 0 and chance <= 1),
  check (qty_max >= qty_min and qty_max <= 20),
  unique (errand_id, item_id)
);

-- Riddle answers are staff-only; players only ever see right/wrong.
create table if not exists public.errand_secrets (
  errand_id uuid primary key references public.errands (id) on delete cascade,
  answers text[] not null
);

create table if not exists public.errand_runs (
  id uuid primary key default gen_random_uuid(),
  errand_id uuid not null references public.errands (id),
  character_id uuid not null references public.characters (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('running', 'claimed', 'solved')),
  started_at timestamptz not null default now(),
  ready_at timestamptz,
  claimed_at timestamptz,
  rewards jsonb not null default '[]'::jsonb
);
create index if not exists errand_runs_char_idx on public.errand_runs (character_id, status);
create unique index if not exists errand_runs_riddle_once on public.errand_runs (errand_id, character_id) where status = 'solved';
create unique index if not exists errand_runs_one_running on public.errand_runs (errand_id, character_id) where status = 'running';

create table if not exists public.riddle_attempts (
  id bigint generated always as identity primary key,
  errand_id uuid not null references public.errands (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  correct boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.crafting_log (
  id bigint generated always as identity primary key,
  character_id uuid not null references public.characters (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id),
  times int not null,
  xp_gained int not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- profession levels (1–10)
create or replace function public.profession_level(p_xp int)
returns int language sql immutable
as $$ select count(*)::int from unnest(array[0, 30, 80, 150, 250, 400, 600, 850, 1150, 1500]) t where t <= p_xp $$;

create or replace function public.profession_next_xp(p_xp int)
returns int language sql immutable
as $$ select min(t) from unnest(array[0, 30, 80, 150, 250, 400, 600, 850, 1150, 1500]) t where t > p_xp $$;

create or replace view public.character_profession_levels with (security_invoker = true) as
select cp.character_id, cp.profession_key, cp.xp, cp.learned_at,
       public.profession_level(cp.xp) as level, public.profession_next_xp(cp.xp) as next_level_xp
from public.character_professions cp;

-- ---------------------------------------------------------------- RLS
alter table public.professions enable row level security;
alter table public.character_professions enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.errands enable row level security;
alter table public.errand_rewards enable row level security;
alter table public.errand_secrets enable row level security;
alter table public.errand_runs enable row level security;
alter table public.riddle_attempts enable row level security;
alter table public.crafting_log enable row level security;

drop policy if exists professions_read on public.professions;
create policy professions_read on public.professions for select using (true);
drop policy if exists professions_write on public.professions;
create policy professions_write on public.professions for all using (public.has_role('admin')) with check (public.has_role('admin'));

drop policy if exists char_prof_read on public.character_professions;
create policy char_prof_read on public.character_professions for select
  using (public.is_staff() or exists (select 1 from public.characters c where c.id = character_id and c.profile_id = auth.uid()));

drop policy if exists recipes_read on public.recipes;
create policy recipes_read on public.recipes for select using (is_active or public.is_staff());
drop policy if exists recipes_write on public.recipes;
create policy recipes_write on public.recipes for all using (public.has_role('senior_gm')) with check (public.has_role('senior_gm'));
drop policy if exists ingredients_read on public.recipe_ingredients;
create policy ingredients_read on public.recipe_ingredients for select using (true);
drop policy if exists ingredients_write on public.recipe_ingredients;
create policy ingredients_write on public.recipe_ingredients for all using (public.has_role('senior_gm')) with check (public.has_role('senior_gm'));

drop policy if exists errands_read on public.errands;
create policy errands_read on public.errands for select using (is_active or public.is_staff());
drop policy if exists errands_write on public.errands;
create policy errands_write on public.errands for all using (public.has_role('senior_gm')) with check (public.has_role('senior_gm'));
drop policy if exists errand_rewards_read on public.errand_rewards;
create policy errand_rewards_read on public.errand_rewards for select using (true);
drop policy if exists errand_rewards_write on public.errand_rewards;
create policy errand_rewards_write on public.errand_rewards for all using (public.has_role('senior_gm')) with check (public.has_role('senior_gm'));
drop policy if exists errand_secrets_staff on public.errand_secrets;
create policy errand_secrets_staff on public.errand_secrets for all using (public.has_role('senior_gm')) with check (public.has_role('senior_gm'));

drop policy if exists errand_runs_read on public.errand_runs;
create policy errand_runs_read on public.errand_runs for select using (profile_id = auth.uid() or public.is_staff());
drop policy if exists riddle_attempts_read on public.riddle_attempts;
create policy riddle_attempts_read on public.riddle_attempts for select
  using (public.is_staff() or exists (select 1 from public.characters c where c.id = character_id and c.profile_id = auth.uid()));
drop policy if exists crafting_log_read on public.crafting_log;
create policy crafting_log_read on public.crafting_log for select
  using (public.is_staff() or exists (select 1 from public.characters c where c.id = character_id and c.profile_id = auth.uid()));

drop trigger if exists crafting_log_append_only on public.crafting_log;
create trigger crafting_log_append_only before update or delete on public.crafting_log
  for each row execute function public.forbid_ledger_mutation();

-- ---------------------------------------------------------------- helpers
-- Signed-in owner of an active character, not banned. Returns the character's rank.
create or replace function public._own_character(p_character uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare v_rank text;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_banned) then raise exception 'Account restricted'; end if;
  if not exists (select 1 from public.characters where id = p_character and profile_id = auth.uid() and is_active) then
    raise exception 'Choose one of your active adventurers';
  end if;
  select rank_code into v_rank from public.character_totals where character_id = p_character;
  return v_rank;
end $$;

create or replace function public._norm_answer(p text)
returns text language sql immutable
as $$ select regexp_replace(regexp_replace(lower(trim(coalesce(p, ''))), '^(the|a|an)\s+', ''), '[^a-z0-9]', '', 'g') $$;

-- Rewards collected in the last 24h (expeditions claimed + riddles solved).
create or replace function public._errand_claims_today(p_character uuid)
returns int language sql stable security definer set search_path = public
as $$ select count(*)::int from public.errand_runs where character_id = p_character and status in ('claimed', 'solved') and claimed_at > now() - interval '24 hours' $$;

-- Rolls and grants an errand's rewards once (idempotency keys per run).
create or replace function public._grant_errand_rewards(p_errand uuid, p_character uuid, p_run uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare e public.errands%rowtype; r record; q int; v_out jsonb := '[]'::jsonb;
begin
  select * into e from public.errands where id = p_errand;
  for r in select er.*, i.name, i.rarity from public.errand_rewards er join public.items i on i.id = er.item_id where er.errand_id = p_errand order by er.id loop
    if random() <= r.chance then
      q := r.qty_min + floor(random() * (r.qty_max - r.qty_min + 1))::int;
      insert into public.inventory_transactions (character_id, item_id, quantity, reason, source_type, source_id, idempotency_key)
      values (p_character, r.item_id, q, 'Errand: ' || e.title, 'errand', p_run::text, format('errand:%s:item:%s', p_run, r.item_id))
      on conflict (idempotency_key) do nothing;
      v_out := v_out || jsonb_build_object('item', r.name, 'rarity', r.rarity, 'quantity', q);
    end if;
  end loop;
  if e.gold_reward > 0 then
    insert into public.ledger_entries (character_id, resource, amount, reason, source_type, source_id, idempotency_key)
    values (p_character, 'gold', e.gold_reward, 'Errand: ' || e.title, 'errand', p_run::text, format('errand:%s:gold', p_run))
    on conflict (idempotency_key) do nothing;
    v_out := v_out || jsonb_build_object('item', 'Gold', 'rarity', 'legendary', 'quantity', e.gold_reward);
  end if;
  return v_out;
end $$;

-- ---------------------------------------------------------------- expeditions
create or replace function public.start_expedition(p_character uuid, p_errand uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_rank text; e public.errands%rowtype; v_id uuid;
begin
  v_rank := public._own_character(p_character);
  select * into e from public.errands where id = p_errand and is_active and kind = 'expedition';
  if not found then raise exception 'That expedition is not available'; end if;
  if public.rank_sort(v_rank) < public.rank_sort(e.min_rank) then raise exception 'This expedition requires guild rank %', e.min_rank; end if;
  perform pg_advisory_xact_lock(hashtext('errands:' || p_character));
  if (select count(*) from public.errand_runs where character_id = p_character and status = 'running') >= public.setting_text('expedition_slots', '2')::int then
    raise exception 'Your adventurer is already on % expeditions. Collect one first.', public.setting_text('expedition_slots', '2');
  end if;
  if exists (select 1 from public.errand_runs where character_id = p_character and errand_id = p_errand and status = 'running') then
    raise exception 'You are already on this expedition';
  end if;
  insert into public.errand_runs (errand_id, character_id, profile_id, status, ready_at)
  values (p_errand, p_character, auth.uid(), 'running', now() + make_interval(mins => e.duration_minutes))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.claim_expedition(p_run uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare run public.errand_runs%rowtype; v_rewards jsonb; v_cap int := public.setting_text('errand_daily_cap', '8')::int;
begin
  select * into run from public.errand_runs where id = p_run for update;
  if not found or run.profile_id is distinct from auth.uid() then raise exception 'Expedition not found'; end if;
  perform public._own_character(run.character_id);
  if run.status <> 'running' then raise exception 'You already collected this expedition'; end if;
  if run.ready_at > now() then raise exception 'Your adventurer has not returned yet'; end if;
  if public._errand_claims_today(run.character_id) >= v_cap then
    raise exception 'The quartermaster has logged % errands for you today. Your haul will wait until tomorrow.', v_cap;
  end if;
  v_rewards := public._grant_errand_rewards(run.errand_id, run.character_id, run.id);
  update public.errand_runs set status = 'claimed', claimed_at = now(), rewards = v_rewards where id = run.id;
  return v_rewards;
end $$;

create or replace function public.abandon_expedition(p_run uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from public.errand_runs where id = p_run and profile_id = auth.uid() and status = 'running';
  if not found then raise exception 'Expedition not found'; end if;
end $$;

-- ---------------------------------------------------------------- riddles
create or replace function public.solve_riddle(p_character uuid, p_errand uuid, p_answer text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_rank text; e public.errands%rowtype; v_limit int := public.setting_text('riddle_attempts_per_day', '5')::int;
        v_wrong int; v_ok boolean; v_run uuid; v_rewards jsonb;
begin
  v_rank := public._own_character(p_character);
  select * into e from public.errands where id = p_errand and is_active and kind = 'riddle';
  if not found then raise exception 'That riddle is not available'; end if;
  if public.rank_sort(v_rank) < public.rank_sort(e.min_rank) then raise exception 'This riddle requires guild rank %', e.min_rank; end if;
  perform pg_advisory_xact_lock(hashtext('errands:' || p_character));
  if exists (select 1 from public.errand_runs where errand_id = p_errand and character_id = p_character and status = 'solved') then
    raise exception 'You have already solved this riddle';
  end if;
  select count(*) into v_wrong from public.riddle_attempts
   where errand_id = p_errand and character_id = p_character and not correct and created_at > now() - interval '24 hours';
  if v_wrong >= v_limit then raise exception 'Out of guesses for today. Study the Chronicle and try again tomorrow.'; end if;
  if length(coalesce(p_answer, '')) > 100 then raise exception 'That answer is too long'; end if;

  select exists (select 1 from public.errand_secrets s, unnest(s.answers) a
                 where s.errand_id = p_errand and public._norm_answer(a) = public._norm_answer(p_answer) and public._norm_answer(p_answer) <> '')
    into v_ok;
  insert into public.riddle_attempts (errand_id, character_id, correct) values (p_errand, p_character, v_ok);
  if not v_ok then
    return jsonb_build_object('correct', false, 'attempts_left', v_limit - v_wrong - 1);
  end if;
  insert into public.errand_runs (errand_id, character_id, profile_id, status, ready_at, claimed_at)
  values (p_errand, p_character, auth.uid(), 'solved', now(), now()) returning id into v_run;
  v_rewards := public._grant_errand_rewards(p_errand, p_character, v_run);
  update public.errand_runs set rewards = v_rewards where id = v_run;
  return jsonb_build_object('correct', true, 'rewards', v_rewards);
end $$;

-- ---------------------------------------------------------------- professions
create or replace function public.learn_profession(p_character uuid, p_profession text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_slots int := public.setting_text('profession_slots', '2')::int;
begin
  perform public._own_character(p_character);
  if not exists (select 1 from public.professions where key = p_profession) then raise exception 'Unknown profession'; end if;
  perform pg_advisory_xact_lock(hashtext('errands:' || p_character));
  if exists (select 1 from public.character_professions where character_id = p_character and profession_key = p_profession) then
    raise exception 'You already know this profession';
  end if;
  if (select count(*) from public.character_professions where character_id = p_character) >= v_slots then
    raise exception 'An adventurer can master only % professions. Forget one first.', v_slots;
  end if;
  insert into public.character_professions (character_id, profession_key) values (p_character, p_profession);
  insert into public.character_history (character_id, entry_type, title, created_by)
  select p_character, 'note', 'Took up the craft of ' || name, auth.uid() from public.professions where key = p_profession;
end $$;

create or replace function public.forget_profession(p_character uuid, p_profession text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public._own_character(p_character);
  delete from public.character_professions where character_id = p_character and profession_key = p_profession;
  if not found then raise exception 'You do not know that profession'; end if;
end $$;

create or replace function public.craft(p_character uuid, p_recipe uuid, p_times int default 1)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare r public.recipes%rowtype; v_out text; v_xp int; v_level int; v_per int; v_gain int; v_have int; ing record; v_key text := gen_random_uuid()::text;
begin
  perform public._own_character(p_character);
  if p_times is null or p_times < 1 or p_times > 20 then raise exception 'Craft between 1 and 20 at a time'; end if;
  select * into r from public.recipes where id = p_recipe and is_active;
  if not found then raise exception 'Unknown recipe'; end if;
  select xp into v_xp from public.character_professions where character_id = p_character and profession_key = r.profession_key for update;
  if not found then raise exception 'You have not learned this profession'; end if;
  v_level := public.profession_level(v_xp);
  if v_level < r.required_level then raise exception 'Requires % level %', initcap(r.profession_key), r.required_level; end if;

  perform pg_advisory_xact_lock(hashtext('gold:' || p_character));
  for ing in select ri.item_id, ri.quantity, i.name from public.recipe_ingredients ri join public.items i on i.id = ri.item_id where ri.recipe_id = r.id loop
    select coalesce(sum(quantity), 0) into v_have from public.inventory_transactions where character_id = p_character and item_id = ing.item_id;
    if v_have < ing.quantity * p_times then raise exception 'Not enough % (% needed, % held)', ing.name, ing.quantity * p_times, v_have; end if;
  end loop;
  if r.gold_cost > 0 and public._gold(p_character) < r.gold_cost * p_times then
    raise exception 'Workshop fee: % gold needed', r.gold_cost * p_times;
  end if;

  for ing in select ri.item_id, ri.quantity from public.recipe_ingredients ri where ri.recipe_id = r.id loop
    insert into public.inventory_transactions (character_id, item_id, quantity, reason, source_type, source_id, idempotency_key, created_by)
    values (p_character, ing.item_id, -ing.quantity * p_times, 'Crafting: ' || r.name, 'crafting', r.id::text, format('craft:%s:in:%s', v_key, ing.item_id), auth.uid());
  end loop;
  insert into public.inventory_transactions (character_id, item_id, quantity, reason, source_type, source_id, idempotency_key, created_by)
  values (p_character, r.output_item_id, r.output_quantity * p_times, 'Crafted: ' || r.name, 'crafting', r.id::text, format('craft:%s:out', v_key), auth.uid());
  if r.gold_cost > 0 then
    insert into public.ledger_entries (character_id, resource, amount, reason, source_type, source_id, idempotency_key, created_by)
    values (p_character, 'gold', -r.gold_cost * p_times, 'Workshop fee: ' || r.name, 'crafting', r.id::text, format('craft:%s:fee', v_key), auth.uid());
  end if;

  -- Recipes 3+ levels below your skill are "grey": they teach almost nothing.
  v_per := case when v_level - r.required_level >= 3 then 1 else r.prof_xp end;
  v_gain := v_per * p_times;
  update public.character_professions set xp = least(xp + v_gain, 1500) where character_id = p_character and profession_key = r.profession_key;
  insert into public.crafting_log (character_id, recipe_id, times, xp_gained) values (p_character, r.id, p_times, v_gain);
  select name into v_out from public.items where id = r.output_item_id;
  return jsonb_build_object('item', v_out, 'quantity', r.output_quantity * p_times, 'xp_gained', v_gain,
    'level', public.profession_level(least(v_xp + v_gain, 1500)), 'leveled_up', public.profession_level(least(v_xp + v_gain, 1500)) > v_level);
end $$;

-- ---------------------------------------------------------------- at the table
-- The assigned GM spends a consumable (or any item) a player brought to the session.
create or replace function public.gm_use_item(p_reservation uuid, p_item uuid, p_quantity int default 1)
returns int language plpgsql security definer set search_path = public
as $$
declare v_res public.reservations%rowtype; v_gm uuid; v_have int; v_name text;
begin
  select * into v_res from public.reservations where id = p_reservation;
  if not found then raise exception 'Reservation not found'; end if;
  select gm_id into v_gm from public.quest_sessions where id = v_res.session_id;
  if not (public.has_role('senior_gm') or (public.is_staff() and v_gm = auth.uid())) then
    raise exception 'Only the assigned Game Master can use items at this table';
  end if;
  perform pg_advisory_xact_lock(hashtext('gold:' || v_res.character_id));
  select coalesce(sum(quantity), 0) into v_have from public.inventory_transactions where character_id = v_res.character_id and item_id = p_item;
  if v_have < p_quantity or p_quantity < 1 then raise exception 'The adventurer does not carry enough of that item'; end if;
  select name into v_name from public.items where id = p_item;
  insert into public.inventory_transactions (character_id, item_id, quantity, reason, source_type, source_id, created_by)
  values (v_res.character_id, p_item, -p_quantity, 'Used at the table: ' || v_name, 'session', v_res.session_id::text, auth.uid());
  return v_have - p_quantity;
end $$;

-- ---------------------------------------------------------------- grants
revoke all on function public._own_character(uuid) from public, anon, authenticated;
revoke all on function public._errand_claims_today(uuid) from public, anon, authenticated;
revoke all on function public._grant_errand_rewards(uuid, uuid, uuid) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['start_expedition(uuid, uuid)', 'claim_expedition(uuid)', 'abandon_expedition(uuid)', 'solve_riddle(uuid, uuid, text)',
                           'learn_profession(uuid, text)', 'forget_profession(uuid, text)', 'craft(uuid, uuid, int)', 'gm_use_item(uuid, uuid, int)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
