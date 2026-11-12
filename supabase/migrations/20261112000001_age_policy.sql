-- =============================================================================
-- EVERBOUND — Age policy
--  * Site-wide minimum age (setting `min_age`, default 13). Raise it any time.
--  * Players under 18 must confirm a parent/guardian's permission.
--  * Quests can carry their own age rating (e.g. 15+) for mature content;
--    booking is refused if the adventurer is too young.
-- Only birth month and year are stored (no full birthdate).
-- =============================================================================

alter table public.profiles add column if not exists birth_year int check (birth_year between 1900 and 2100);
alter table public.profiles add column if not exists birth_month int check (birth_month between 1 and 12);
alter table public.profiles add column if not exists guardian_consent boolean not null default false;
alter table public.quest_templates add column if not exists min_age int check (min_age between 13 and 21);

insert into public.admin_settings (key, value, description) values
  ('min_age', '13', 'Minimum age to create an account. Quests can require an older age individually.')
on conflict (key) do nothing;

-- Age in whole years, counting from the first of the birth month (conservative).
create or replace function public.age_from(p_year int, p_month int)
returns int language sql stable
as $$ select case when p_year is null then null else extract(year from age(current_date, make_date(p_year, coalesce(p_month, 12), 1)))::int end $$;

create or replace function public.profile_age(p_profile uuid)
returns int language sql stable security definer set search_path = public
as $$ select public.age_from(birth_year, birth_month) from public.profiles where id = p_profile $$;

-- New accounts: enforce the minimum age and guardian consent at the database.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Adventurer');
  v_year int := nullif(new.raw_user_meta_data ->> 'birth_year', '')::int;
  v_month int := nullif(new.raw_user_meta_data ->> 'birth_month', '')::int;
  v_guardian boolean := coalesce((new.raw_user_meta_data ->> 'guardian_consent')::boolean, false);
  v_min int := public.setting_text('min_age', '13')::int;
  v_age int := public.age_from(v_year, v_month);
begin
  -- Accounts created by staff in the dashboard (no birth data) are allowed; site sign-ups always send it.
  if v_year is not null then
    if v_age < v_min then raise exception 'Everbound is for ages % and up', v_min; end if;
    if v_age < 18 and not v_guardian then raise exception 'Players under 18 need a parent or guardian''s permission'; end if;
  end if;
  if char_length(v_name) < 2 then v_name := v_name || '_'; end if;
  insert into public.profiles (id, display_name, age_attested, birth_year, birth_month, guardian_consent)
  values (new.id, left(v_name, 40), coalesce((new.raw_user_meta_data ->> 'age_attested')::boolean, false), v_year, v_month, v_guardian);
  return new;
end $$;

-- Birth details can be filled in once by the player; after that only admins change them.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
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
    if old.birth_year is not null and (new.birth_year is distinct from old.birth_year or new.birth_month is distinct from old.birth_month)
       and not public.has_role('admin') then
      raise exception 'Your birth month and year are already on record. Ask a Guild Master to correct them.';
    end if;
    if new.birth_year is not null and old.birth_year is null and not public.has_role('admin') then
      if public.age_from(new.birth_year, new.birth_month) < public.setting_text('min_age', '13')::int then
        raise exception 'Everbound is for ages % and up', public.setting_text('min_age', '13');
      end if;
      if public.age_from(new.birth_year, new.birth_month) < 18 and not new.guardian_consent then
        raise exception 'Players under 18 need a parent or guardian''s permission';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Age-rated quests: checked on every new booking.
create or replace function public.check_reservation_age()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_min int; v_age int;
begin
  select t.min_age into v_min from public.quest_sessions s join public.quest_templates t on t.id = s.template_id where s.id = new.session_id;
  if v_min is null then return new; end if;
  v_age := public.profile_age(new.profile_id);
  if v_age is null then raise exception 'This quest is rated %+. Add your birth month and year in Settings first.', v_min; end if;
  if v_age < v_min then raise exception 'This quest is rated for ages % and up', v_min; end if;
  return new;
end $$;
drop trigger if exists reservations_age_check on public.reservations;
create trigger reservations_age_check before insert on public.reservations
  for each row execute function public.check_reservation_age();

revoke all on function public.profile_age(uuid) from public, anon, authenticated;
