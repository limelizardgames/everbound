-- =============================================================================
-- EVERBOUND — Suspensions, bans and appeals
--  * Suspension: restricted until a date, lifts automatically. Ban: permanent.
--    Both record a reason the player can see, who issued it and when.
--    (profiles.is_banned means "restricted right now" everywhere in the game.)
--  * Bookings: sessions starting after the suspension ends are kept. Sessions
--    during it are flagged; the player must reschedule (to a session after the
--    suspension) or cancel before a deadline, or the booking is forfeited
--    without refund.
--  * Discretion: admins can suspend for any length and ban. Game Masters can
--    suspend up to `gm_max_suspension_days` (default 0 = not yet) and mute.
--    Restricting an administrator needs the owner. No one restricts themselves.
--  * Appeals: one open appeal per restriction, decided by a different staff
--    member than the one who issued it (the owner may decide any appeal).
-- =============================================================================

alter type public.payment_status add value if not exists 'forfeited';

alter table public.profiles add column if not exists suspended_until timestamptz;
alter table public.profiles add column if not exists restriction_reason text;
alter table public.profiles add column if not exists restricted_by uuid;
alter table public.profiles add column if not exists restricted_at timestamptz;
alter table public.reservations add column if not exists suspension_deadline timestamptz;

insert into public.admin_settings (key, value, description) values
  ('gm_max_suspension_days', '0', 'Longest suspension a Game Master (non-admin) may issue. 0 = only administrators can suspend.'),
  ('suspension_response_hours', '72', 'Hours a suspended player has to reschedule or cancel affected bookings before they are forfeited')
on conflict (key) do nothing;

create table if not exists public.restriction_appeals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  restriction_kind text not null check (restriction_kind in ('suspension', 'ban')),
  restriction_reason text,
  restricted_by uuid,
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'upheld', 'overturned')),
  response text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists appeals_one_open on public.restriction_appeals (profile_id) where status = 'open';
alter table public.restriction_appeals enable row level security;
drop policy if exists appeals_read on public.restriction_appeals;
create policy appeals_read on public.restriction_appeals for select using (profile_id = auth.uid() or public.has_role('admin'));

-- Profile protection now covers the restriction columns. Trusted server
-- functions set everbound.trusted for the length of their transaction.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and coalesce(current_setting('everbound.trusted', true), '') <> '1' then
    if (new.role is distinct from old.role or new.is_banned is distinct from old.is_banned
        or new.chat_muted_until is distinct from old.chat_muted_until or new.suspended_until is distinct from old.suspended_until
        or new.restriction_reason is distinct from old.restriction_reason or new.restricted_by is distinct from old.restricted_by
        or new.restricted_at is distinct from old.restricted_at)
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

-- ---------------------------------------------------------------- permission check
create or replace function public._check_moderation(p_target uuid, p_action text, p_days int default null)
returns void language plpgsql security definer set search_path = public
as $$
declare v_me public.user_role := public.my_role(); v_them public.user_role; v_gm_max int := public.setting_text('gm_max_suspension_days', '0')::int;
begin
  if auth.uid() is null or v_me is null or v_me < 'game_master' then raise exception 'Guild staff only'; end if;
  if p_target = auth.uid() then raise exception 'You cannot restrict yourself'; end if;
  select role into v_them from public.profiles where id = p_target;
  if not found then raise exception 'Player not found'; end if;
  if v_them >= 'admin' and v_me <> 'owner' then raise exception 'Only the owner can restrict an administrator'; end if;
  if v_them >= v_me and v_me <> 'owner' then raise exception 'You cannot restrict someone of equal or higher rank'; end if;
  if p_action = 'ban' and v_me < 'admin' then raise exception 'Only administrators can ban'; end if;
  if p_action = 'suspend' and v_me < 'admin' then
    if v_gm_max <= 0 then raise exception 'Game Masters cannot issue suspensions yet. Ask an administrator.'; end if;
    if coalesce(p_days, 9999) > v_gm_max then raise exception 'Game Masters can suspend for up to % days. Ask an administrator for longer.', v_gm_max; end if;
  end if;
end $$;

-- Flags bookings that fall inside the restriction. Returns how many.
create or replace function public._flag_bookings(p_profile uuid, p_until timestamptz)
returns int language plpgsql security definer set search_path = public
as $$
declare r record; n int := 0; v_hours int := public.setting_text('suspension_response_hours', '72')::int;
begin
  for r in select x.id, s.starts_at, t.title from public.reservations x
           join public.quest_sessions s on s.id = x.session_id join public.quest_templates t on t.id = s.template_id
           where x.profile_id = p_profile and x.status in ('confirmed', 'pending_payment', 'waitlisted') and s.starts_at > now()
  loop
    if p_until is not null and r.starts_at > p_until then continue; end if;   -- after the suspension: keep
    update public.reservations set suspension_deadline = least(now() + make_interval(hours => v_hours), r.starts_at), updated_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public._clear_restriction(p_profile uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform set_config('everbound.trusted', '1', true);
  update public.profiles set is_banned = false, suspended_until = null, restriction_reason = null, restricted_by = null, restricted_at = null where id = p_profile;
  update public.reservations set suspension_deadline = null where profile_id = p_profile and suspension_deadline is not null;
  perform set_config('everbound.trusted', '', true);
end $$;

-- ---------------------------------------------------------------- actions
create or replace function public.suspend_user(p_profile uuid, p_days int, p_reason text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_until timestamptz; n int;
begin
  if p_days is null or p_days < 1 or p_days > 365 then raise exception 'Suspend for between 1 and 365 days'; end if;
  if char_length(coalesce(trim(p_reason), '')) < 5 then raise exception 'Give the player a reason (at least a few words)'; end if;
  perform public._check_moderation(p_profile, 'suspend', p_days);
  v_until := now() + make_interval(days => p_days);
  perform set_config('everbound.trusted', '1', true);
  update public.profiles set is_banned = true, suspended_until = v_until, restriction_reason = trim(p_reason), restricted_by = auth.uid(), restricted_at = now() where id = p_profile;
  perform set_config('everbound.trusted', '', true);
  n := public._flag_bookings(p_profile, v_until);
  perform public.notify(p_profile, 'Your account is suspended',
    format('Suspended until %s. Reason: %s.%s You can appeal from your portal.', to_char(v_until, 'Mon DD, YYYY'), trim(p_reason),
           case when n > 0 then format(' %s booking(s) fall during your suspension: reschedule or cancel them within %s hours or they will be forfeited without refund.', n, public.setting_text('suspension_response_hours', '72')) else '' end),
    '/portal/');
  perform public.write_audit('profile.suspended', 'profile', p_profile::text, jsonb_build_object('days', p_days, 'until', v_until, 'reason', p_reason, 'bookings_flagged', n));
  return jsonb_build_object('until', v_until, 'bookings_flagged', n);
end $$;

create or replace function public.ban_user(p_profile uuid, p_reason text, p_retire_card boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare n int; v_card uuid;
begin
  if char_length(coalesce(trim(p_reason), '')) < 5 then raise exception 'Give the player a reason (at least a few words)'; end if;
  perform public._check_moderation(p_profile, 'ban');
  perform set_config('everbound.trusted', '1', true);
  update public.profiles set is_banned = true, suspended_until = null, restriction_reason = trim(p_reason), restricted_by = auth.uid(), restricted_at = now() where id = p_profile;
  perform set_config('everbound.trusted', '', true);
  n := public._flag_bookings(p_profile, null);
  if p_retire_card then
    select id into v_card from public.guild_cards where profile_id = p_profile and status = 'claimed';
    if v_card is not null then
      update public.guild_cards set status = 'deactivated', deactivated_at = now(), deactivation_reason = 'Account banned' where id = v_card;
    end if;
  end if;
  perform public.notify(p_profile, 'Your account has been banned',
    format('Reason: %s.%s You can appeal from your portal.', trim(p_reason),
           case when n > 0 then format(' Cancel your %s upcoming booking(s) within %s hours or they will be forfeited without refund.', n, public.setting_text('suspension_response_hours', '72')) else '' end),
    '/portal/');
  perform public.write_audit('profile.banned', 'profile', p_profile::text, jsonb_build_object('reason', p_reason, 'card_retired', v_card is not null, 'bookings_flagged', n));
  return jsonb_build_object('bookings_flagged', n, 'card_retired', v_card is not null);
end $$;

create or replace function public.lift_restriction(p_profile uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare v_by uuid;
begin
  select restricted_by into v_by from public.profiles where id = p_profile and is_banned;
  if not found then raise exception 'This player is not restricted'; end if;
  if not (public.has_role('admin') or (public.is_staff() and v_by = auth.uid())) then
    raise exception 'Only an administrator or the person who issued it can lift a restriction';
  end if;
  perform public._clear_restriction(p_profile);
  perform public.notify(p_profile, 'Your restriction has been lifted', coalesce(nullif(trim(p_note), ''), 'Welcome back to the Guild.'), '/portal/');
  perform public.write_audit('profile.restriction_lifted', 'profile', p_profile::text, jsonb_build_object('note', p_note));
end $$;

-- Mutes: Game Masters and up (ban flag no longer handled here; use ban_user).
create or replace function public.restrict_user(p_profile uuid, p_mute_minutes int, p_ban boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_ban is not null then raise exception 'Use the Suspend or Ban actions'; end if;
  perform public._check_moderation(p_profile, 'mute');
  perform set_config('everbound.trusted', '1', true);
  update public.profiles set chat_muted_until = case when p_mute_minutes > 0 then now() + make_interval(mins => p_mute_minutes) else null end where id = p_profile;
  perform set_config('everbound.trusted', '', true);
  perform public.write_audit('profile.muted', 'profile', p_profile::text, jsonb_build_object('mute_minutes', p_mute_minutes));
end $$;

-- ---------------------------------------------------------------- bookings during a suspension
create or replace function public.reschedule_reservation(p_reservation uuid, p_session uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare r public.reservations%rowtype; p public.profiles%rowtype; s public.quest_sessions%rowtype; t public.quest_templates%rowtype;
        v_taken int; v_status public.reservation_status; v_rank text; v_old_had_seat boolean;
begin
  select * into r from public.reservations where id = p_reservation for update;
  if not found or r.profile_id is distinct from auth.uid() then raise exception 'Booking not found'; end if;
  if r.suspension_deadline is null or r.status not in ('confirmed', 'waitlisted') then raise exception 'This booking does not need rescheduling'; end if;
  if r.suspension_deadline < now() then raise exception 'The deadline to reschedule this booking has passed'; end if;
  select * into p from public.profiles where id = r.profile_id;
  if p.suspended_until is null then raise exception 'Bookings cannot be rescheduled during a ban. You can cancel instead.'; end if;
  select * into s from public.quest_sessions where id = p_session for update;
  if not found or s.status <> 'scheduled' or s.id = r.session_id then raise exception 'Choose another scheduled session'; end if;
  if s.starts_at <= p.suspended_until then raise exception 'Choose a session after your suspension ends (%)', to_char(p.suspended_until, 'Mon DD'); end if;
  if s.price_cents > r.amount_cents then raise exception 'Choose a session of the same or lower price'; end if;
  select * into t from public.quest_templates where id = s.template_id;
  if t.status <> 'published' then raise exception 'That quest is not open for booking'; end if;
  select rank_code into v_rank from public.character_totals where character_id = r.character_id;
  if public.rank_sort(v_rank) < public.rank_sort(t.rank_min) then raise exception 'That quest requires guild rank %', t.rank_min; end if;
  if exists (select 1 from public.reservations where session_id = s.id and profile_id = r.profile_id and status <> 'canceled') then
    raise exception 'You already have a booking for that session';
  end if;
  select coalesce((select taken from public.session_seats where session_id = s.id), 0) into v_taken;
  v_status := case when v_taken >= s.capacity then 'waitlisted' else 'confirmed' end;
  v_old_had_seat := r.status = 'confirmed';
  update public.reservations set status = 'canceled', suspension_deadline = null, updated_at = now() where id = r.id;
  insert into public.reservations (session_id, profile_id, character_id, status, payment_status, amount_cents, stripe_checkout_id)
  values (s.id, r.profile_id, r.character_id, v_status, r.payment_status, r.amount_cents, r.stripe_checkout_id);
  if v_old_had_seat then perform public._promote_waitlist(r.session_id); end if;
  perform public.write_audit('reservation.rescheduled', 'reservation', r.id::text, jsonb_build_object('to_session', s.id, 'reason', 'suspension'));
  return v_status::text;
end $$;

-- Lazy housekeeping: lifts expired suspensions and forfeits overdue bookings.
-- Safe for anyone to call; it only acts on things that are already due.
create or replace function public.process_moderation()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare r record; v_lifted int := 0; v_forfeit int := 0;
begin
  for r in select id from public.profiles where is_banned and suspended_until is not null and suspended_until <= now() for update skip locked loop
    perform public._clear_restriction(r.id);
    perform public.notify(r.id, 'Your suspension has ended', 'Welcome back to the Guild. Your account is fully restored.', '/portal/');
    v_lifted := v_lifted + 1;
  end loop;
  for r in select x.id, x.session_id, x.profile_id, x.status, x.payment_status, t.title
           from public.reservations x join public.quest_sessions s on s.id = x.session_id join public.quest_templates t on t.id = s.template_id
           where x.suspension_deadline is not null and x.suspension_deadline <= now() and x.status in ('confirmed', 'pending_payment', 'waitlisted')
           for update of x skip locked
  loop
    update public.reservations set status = 'canceled', suspension_deadline = null,
           payment_status = case when r.payment_status = 'paid' then 'forfeited'::public.payment_status else r.payment_status end, updated_at = now()
     where id = r.id;
    if r.status = 'confirmed' or r.status = 'pending_payment' then perform public._promote_waitlist(r.session_id); end if;
    perform public.notify(r.profile_id, 'Booking forfeited', format('Your booking for %s was not rescheduled or canceled in time and has been forfeited without refund.', r.title), '/portal/bookings/');
    perform public.write_audit('reservation.forfeited', 'reservation', r.id::text, '{}');
    v_forfeit := v_forfeit + 1;
  end loop;
  return jsonb_build_object('lifted', v_lifted, 'forfeited', v_forfeit);
end $$;

-- ---------------------------------------------------------------- appeals
create or replace function public.submit_appeal(p_message text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare p public.profiles%rowtype; v_id uuid;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found or not p.is_banned then raise exception 'There is no restriction on your account to appeal'; end if;
  if exists (select 1 from public.restriction_appeals where profile_id = p.id and status = 'open') then raise exception 'Your appeal is already being reviewed'; end if;
  if exists (select 1 from public.restriction_appeals where profile_id = p.id and created_at >= p.restricted_at and status <> 'open') then
    raise exception 'This restriction has already been reviewed on appeal';
  end if;
  insert into public.restriction_appeals (profile_id, restriction_kind, restriction_reason, restricted_by, message)
  values (p.id, case when p.suspended_until is null then 'ban' else 'suspension' end, p.restriction_reason, p.restricted_by, trim(p_message))
  returning id into v_id;
  insert into public.notifications (profile_id, title, body, link)
  select id, 'New appeal to review', p.display_name || ' has appealed their restriction.', '/gm/players/#appeals'
  from public.profiles where role >= 'admin' and not is_banned and id is distinct from p.restricted_by;
  perform public.write_audit('appeal.submitted', 'profile', p.id::text, jsonb_build_object('appeal', v_id));
  return v_id;
end $$;

create or replace function public.decide_appeal(p_appeal uuid, p_overturn boolean, p_response text)
returns void language plpgsql security definer set search_path = public
as $$
declare a public.restriction_appeals%rowtype;
begin
  if not public.has_role('admin') then raise exception 'Administrator access required'; end if;
  select * into a from public.restriction_appeals where id = p_appeal and status = 'open' for update;
  if not found then raise exception 'Appeal not found or already decided'; end if;
  if a.restricted_by = auth.uid() and public.my_role() <> 'owner' then
    raise exception 'A different staff member must review appeals on restrictions you issued';
  end if;
  if char_length(coalesce(trim(p_response), '')) < 5 then raise exception 'Write a short response to the player'; end if;
  update public.restriction_appeals set status = case when p_overturn then 'overturned' else 'upheld' end, response = trim(p_response),
         decided_by = auth.uid(), decided_at = now() where id = a.id;
  if p_overturn then perform public._clear_restriction(a.profile_id); end if;
  perform public.notify(a.profile_id, case when p_overturn then 'Appeal successful' else 'Appeal decision' end,
    case when p_overturn then 'Your restriction has been lifted. ' else 'Your restriction stands. ' end || trim(p_response), '/portal/');
  perform public.write_audit('appeal.decided', 'profile', a.profile_id::text, jsonb_build_object('appeal', a.id, 'overturned', p_overturn));
end $$;

-- ---------------------------------------------------------------- grants
revoke all on function public._check_moderation(uuid, text, int) from public, anon, authenticated;
revoke all on function public._flag_bookings(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public._clear_restriction(uuid) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['suspend_user(uuid, int, text)', 'ban_user(uuid, text, boolean)', 'lift_restriction(uuid, text)',
                           'reschedule_reservation(uuid, uuid)', 'process_moderation()', 'submit_appeal(text)', 'decide_appeal(uuid, boolean, text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
grant execute on function public.process_moderation() to service_role;
