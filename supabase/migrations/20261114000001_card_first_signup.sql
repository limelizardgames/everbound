-- =============================================================================
-- EVERBOUND — Card-first accounts
-- There is no open sign-up. A new account can only be created from an unclaimed
-- guild card (its QR code carries the card token). The card is bound to the new
-- account in the same transaction, so a card can never create two accounts.
-- Setting `card_required_for_signup` (default true) is an admin escape hatch:
-- switch it off briefly to create an account in the Supabase dashboard.
-- =============================================================================

insert into public.admin_settings (key, value, description) values
  ('card_required_for_signup', 'true', 'New accounts must be created by scanning an unclaimed guild card')
on conflict (key) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Adventurer');
  v_year int := nullif(new.raw_user_meta_data ->> 'birth_year', '')::int;
  v_month int := nullif(new.raw_user_meta_data ->> 'birth_month', '')::int;
  v_guardian boolean := coalesce((new.raw_user_meta_data ->> 'guardian_consent')::boolean, false);
  v_token text := nullif(new.raw_user_meta_data ->> 'card_token', '');
  v_min int := public.setting_text('min_age', '13')::int;
  v_age int := public.age_from(v_year, v_month);
  v_card public.guild_cards%rowtype;
begin
  if public.setting_text('card_required_for_signup', 'true') = 'true' then
    if v_token is null then raise exception 'Accounts are created by scanning your guild card'; end if;
    select * into v_card from public.guild_cards where token = v_token for update;
    if not found or v_card.status <> 'unassigned' then
      raise exception 'This guild card is not valid or has already been claimed';
    end if;
    if v_year is null then raise exception 'Please enter your birth month and year'; end if;
  end if;
  if v_year is not null then
    if v_age < v_min then raise exception 'Everbound is for ages % and up', v_min; end if;
    if v_age < 18 and not v_guardian then raise exception 'Players under 18 need a parent or guardian''s permission'; end if;
  end if;
  if char_length(v_name) < 2 then v_name := v_name || '_'; end if;
  insert into public.profiles (id, display_name, age_attested, birth_year, birth_month, guardian_consent)
  values (new.id, left(v_name, 40), v_year is not null, v_year, v_month, v_guardian);

  if v_card.id is not null then
    update public.guild_cards set status = 'claimed', profile_id = new.id, claimed_at = now() where id = v_card.id;
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
    values (new.id, 'card.claimed', 'guild_card', v_card.id::text, jsonb_build_object('card_number', v_card.card_number, 'via', 'signup'));
  end if;
  return new;
end $$;
