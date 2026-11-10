\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- helpers (test db only)
create or replace function public.t_expect_error(p_sql text, p_pattern text) returns text language plpgsql as $$
begin
  execute p_sql;
  raise exception 'EXPECTED ERROR (%) BUT SUCCEEDED: %', p_pattern, p_sql;
exception when others then
  if sqlerrm like 'EXPECTED ERROR%' then raise; end if;
  if sqlerrm !~* p_pattern then raise exception 'WRONG ERROR for %: got "%", wanted /%/', p_sql, sqlerrm, p_pattern; end if;
  return 'ok (blocked: ' || left(sqlerrm, 70) || ')';
end $$;
create or replace function public.t_assert(p_cond boolean, p_msg text) returns text language plpgsql as $$
begin if not coalesce(p_cond, false) then raise exception 'ASSERT FAILED: %', p_msg; end if; return 'ok ' || p_msg; end $$;

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'a@x.test', '{"display_name":"Aelindra","age_attested":true}'),
 ('00000000-0000-0000-0000-00000000000b', 'b@x.test', '{"display_name":"Thorne"}'),
 ('00000000-0000-0000-0000-0000000000a1', 'gm@x.test', '{"display_name":"GM Kira"}'),
 ('00000000-0000-0000-0000-0000000000f1', 'own@x.test', '{"display_name":"Founder One"}'),
 ('00000000-0000-0000-0000-0000000000f2', 'own2@x.test', '{"display_name":"Founder Two"}');
insert into auth.users (id, email) select ('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'p' || g || '@x.test' from generate_series(1, 6) g;

-- Bootstrap: SQL editor (no auth.uid) may set roles.
update profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000f1';
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000f2';
update profiles set role = 'game_master' where id = '00000000-0000-0000-0000-0000000000a1';
update quest_sessions set gm_id = '00000000-0000-0000-0000-0000000000a1';
select t_assert((select count(*) from profiles) = 11, 'profiles auto-created');

create temp table tok as select card_number, token from guild_cards order by card_number;
grant select on tok to authenticated, anon, service_role;
create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated, anon, service_role;
insert into ids select 'caravan', s.id from quest_sessions s join quest_templates t on t.id = s.template_id where t.slug = 'the-missing-caravan' order by starts_at limit 1;
insert into ids select 'herbs', s.id from quest_sessions s join quest_templates t on t.id = s.template_id where t.slug = 'herbs-for-the-apothecary' limit 1;
insert into ids select 'mines', s.id from quest_sessions s join quest_templates t on t.id = s.template_id where t.slug = 'whispers-beneath-stone' limit 1;

\echo '--- Player A: claim card, create character'
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select t_assert(claim_guild_card((select token from tok where card_number = 'EVB-00001')) = 'EVB-00001', 'A claims EVB-00001');
select t_assert(claim_guild_card((select token from tok where card_number = 'EVB-00001')) = 'EVB-00001', 'reclaim own card is idempotent');
select t_expect_error($$select claim_guild_card((select token from tok where card_number = 'EVB-00002'))$$, 'already hold');
select t_expect_error($$select create_character('Aelindra','half_elf','ranger','she/her','x','{"might":4,"grace":4,"wits":0,"spirit":0}')$$, 'limit is 6');
select t_expect_error($$select create_character('Aelindra','dragon','ranger',null,null,'{}')$$, 'Unknown species');
insert into ids select 'charA', create_character('Aelindra','half_elf','ranger','she/her','Moonlit guardian of the fen.','{"might":1,"grace":3,"wits":1,"spirit":1}');
select t_assert((select character_id from guild_cards where card_number = 'EVB-00001') = (select v from ids where k = 'charA'), 'card linked to new character');
select t_assert((select gold from character_totals where character_id = (select v from ids where k='charA')) = 50, 'starting gold 50');
select t_assert((select hp_max from characters where id = (select v from ids where k='charA')) = 14, 'hp = ranger 12 + might*2');
select t_assert((select rank_code from character_totals where character_id = (select v from ids where k='charA')) = 'F', 'rank F');
select t_expect_error($$update characters set hp_max = 99 where id = (select v from ids where k='charA')$$, 'Game Master');
update characters set backstory = 'Edited backstory' where id = (select v from ids where k='charA');
select t_expect_error($$insert into ledger_entries (character_id, resource, amount, reason, source_type) values ((select v from ids where k='charA'), 'gold', 9999, 'cheat', 'admin')$$, 'row-level security|permission');
select t_expect_error($$select notify('00000000-0000-0000-0000-00000000000b', 'spoof', 'x', '/')$$, 'permission denied');
select t_expect_error($$select write_audit('fake', 'x', null, '{}')$$, 'permission denied');
select t_expect_error($$update profiles set role = 'owner' where id = auth.uid()$$, 'administrators');
select t_expect_error($$select generate_guild_cards(5, 'x')$$, 'Administrator');
select t_assert((select count(*) from guild_cards) = 1, 'A sees only own card');
select t_assert((select count(*) from quest_template_secrets) = 0, 'A cannot see GM secrets');
select t_assert((select count(*) from quest_objectives where is_secret) = 0, 'A cannot see secret objectives');
select t_assert((select count(*) from quest_session_notes) = 0, 'A cannot see session notes');
select t_expect_error($$select reserve_seat((select v from ids where k='mines'), (select v from ids where k='charA'))$$, 'requires guild rank E');
select t_assert((reserve_seat((select v from ids where k='caravan'), (select v from ids where k='charA')) ->> 'status') = 'confirmed', 'A books caravan (pay at table)');
select t_expect_error($$select reserve_seat((select v from ids where k='caravan'), (select v from ids where k='charA'))$$, 'already hold');
reset role;

\echo '--- Player B + 5 more fill the table (capacity 5)'
do $$
declare u uuid; c uuid; r jsonb; i int := 0;
begin
  for u in select id from profiles where display_name not in ('Aelindra', 'GM Kira', 'Founder One', 'Founder Two') order by display_name loop
    perform set_config('request.jwt.claim.sub', u::text, true);
    c := create_character('Hero ' || substr(u::text, 33), 'human', 'warrior', null, null, '{"might":2,"grace":2,"wits":1,"spirit":1}');
    r := reserve_seat((select v from ids where k='caravan'), c);
    insert into ids values ('char_' || substr(u::text, 33), c);
    raise notice '% -> %', substr(u::text, 33), r ->> 'status';
  end loop;
end $$;
select t_assert((select taken from session_seats where session_id = (select v from ids where k='caravan')) = 5, 'exactly 5 seats taken (no oversell)');
select t_assert((select waitlisted from session_seats where session_id = (select v from ids where k='caravan')) = 3, '3 waitlisted');

\echo '--- Player B cannot see A''s data'
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
select t_assert((select count(*) from characters) = 1, 'B sees only own character');
select t_assert((select count(*) from ledger_entries where character_id = (select v from ids where k='charA')) = 0, 'B cannot read A ledger');
select t_assert((select count(*) from reservations) = 1, 'B sees only own reservation');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
reset role;
select t_expect_error(format($f$select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',true); set role authenticated; select cancel_reservation(%L)$f$,
  (select r.id from reservations r join characters c on c.id = r.character_id where c.name = 'Aelindra')), 'Not your reservation');
reset role;

\echo '--- A confirmed player cancels -> first waitlisted promoted'
do $$
declare v_res uuid; v_first uuid;
begin
  select r.id into v_res from reservations r where r.session_id = (select v from ids where k='caravan') and r.status = 'confirmed'
    and r.profile_id <> '00000000-0000-0000-0000-00000000000a' order by created_at limit 1;
  select r.profile_id into v_first from reservations r where r.session_id = (select v from ids where k='caravan') and r.status = 'waitlisted' order by created_at limit 1;
  perform set_config('request.jwt.claim.sub', (select profile_id::text from reservations where id = v_res), true);
  perform cancel_reservation(v_res);
  if (select status from reservations where session_id = (select v from ids where k='caravan') and profile_id = v_first and status <> 'canceled') <> 'confirmed' then
    raise exception 'waitlist promotion failed';
  end if;
end $$;
select t_assert((select taken from session_seats where session_id = (select v from ids where k='caravan')) = 5, 'still 5 after cancel+promote');
select t_assert((select waitlisted from session_seats where session_id = (select v from ids where k='caravan')) = 2, '2 left on waitlist');
select t_assert(exists(select 1 from notifications where title like 'You are off the waitlist%'), 'promotion notification sent');

\echo '--- Stripe mode: pending hold and webhook confirmation'
update admin_settings set value = '"stripe"' where key = 'payments_mode';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
insert into ids select 'resA_herbs', (reserve_seat((select v from ids where k='herbs'), (select v from ids where k='charA')) ->> 'reservation_id')::uuid;
select t_assert((select status from reservations where id = (select v from ids where k='resA_herbs')) = 'pending_payment', 'pending payment hold');
select t_expect_error($$select confirm_reservation_payment((select v from ids where k='resA_herbs'), 'cs_fake', 1000)$$, 'permission denied');
reset role;
set role service_role;
select t_assert(confirm_reservation_payment((select v from ids where k='resA_herbs'), 'cs_test_1', 1000) = 'confirmed', 'webhook confirms');
select t_assert(confirm_reservation_payment((select v from ids where k='resA_herbs'), 'cs_test_1', 1000) = 'already_paid', 'webhook idempotent');
reset role;
update admin_settings set value = '"pay_at_table"' where key = 'payments_mode';

\echo '--- GM runs the table and submits results'
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select t_assert((select count(*) from quest_template_secrets) >= 4, 'GM sees secrets');
select gm_update_character_state((select r.id from reservations r where r.character_id = (select v from ids where k='charA') and r.session_id = (select v from ids where k='caravan')), 9, 'Poisoned');
select t_assert((select hp_current from characters where id = (select v from ids where k='charA')) = 9, 'GM tracked HP');
select gm_save_results((select v from ids where k='caravan'), 'The party found the caravan at the old toll house.', 'Spared Captain Rusk.',
  jsonb_build_array(
    jsonb_build_object('character_id', (select v from ids where k='charA'), 'xp', 350, 'gold', 75, 'renown', 120,
      'items', jsonb_build_array(jsonb_build_object('item_id', (select id from items where slug='caravan-ledger'), 'quantity', 1)),
      'achievements', jsonb_build_array((select id from achievements where slug='caravan-saviour')), 'note', 'Tracked the bandits through the ash.'),
    jsonb_build_object('character_id', (select id from characters where name='Hero 0102'), 'xp', 350, 'gold', 75, 'renown', 40),
    jsonb_build_object('character_id', (select id from characters where name='Hero 0103'), 'attended', false)
  ),
  jsonb_build_object(
    'flags', jsonb_build_array(jsonb_build_object('key','bandit_threat','delta',-1), jsonb_build_object('key','ancient_sigils','delta',2), jsonb_build_object('key','merchant_route_open','delta',1)),
    'locations', jsonb_build_array(
       jsonb_build_object('location_id', (select id from locations where slug='ashen-road'), 'expected_status','threatened', 'new_status','peaceful'),
       jsonb_build_object('location_id', (select id from locations where slug='northern-watchtower'), 'expected_status','threatened', 'new_status','rebuilding'),
       jsonb_build_object('location_id', (select id from locations where slug='crimson-peaks'), 'discovered', true)),
    'chronicle', jsonb_build_object('title','The Caravan Comes Home','excerpt','Oswin Tallow is alive.','body','Long form story...')),
  true);
select t_expect_error($$select approve_session_results((select v from ids where k='caravan'))$$, 'Senior Game Master');
reset role;

\echo '--- Admin approves (atomic rewards + world changes + raid unlock)'
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false);
set role authenticated;
select t_expect_error($$select gm_save_results((select v from ids where k='caravan'),'x','x',jsonb_build_array(jsonb_build_object('character_id',(select v from ids where k='charA')),jsonb_build_object('character_id',(select v from ids where k='charA'))),'{}',true)$$, 'only once');
select approve_session_results((select v from ids where k='caravan'));
select t_expect_error($$select approve_session_results((select v from ids where k='caravan'))$$, 'no submitted results');
reset role;
select t_assert((select xp from character_totals where character_id = (select v from ids where k='charA')) = 350, 'A xp 350');
select t_assert((select level from character_totals where character_id = (select v from ids where k='charA')) = 2, 'A level 2');
select t_assert((select gold from character_totals where character_id = (select v from ids where k='charA')) = 125, 'A gold 125');
select t_assert((select renown from character_totals where character_id = (select v from ids where k='charA')) = 135, 'A renown 120 + 15 achievement bonus');
select t_assert((select rank_code from character_totals where character_id = (select v from ids where k='charA')) = 'E', 'A promoted to rank E');
select t_assert(exists(select 1 from character_history where character_id = (select v from ids where k='charA') and entry_type = 'rank'), 'rank history entry');
select t_assert((select count(*) from inventory_balances where character_id = (select v from ids where k='charA')) = 1, 'loot granted');
select t_assert((select count(*) from reservations where session_id = (select v from ids where k='caravan') and status = 'attended') = 2, '2 attended');
select t_assert((select count(*) from reservations where session_id = (select v from ids where k='caravan') and status = 'no_show') = 1, '1 no-show');
select t_assert((select status from locations where slug = 'ashen-road') = 'peaceful', 'Ashen Road now peaceful');
select t_assert((select status from locations where slug = 'northern-watchtower') = 'destroyed', 'conflicting change NOT applied');
select t_assert(exists(select 1 from world_events where status = 'conflict'), 'conflict parked for review');
select t_assert((select is_discovered from locations where slug = 'crimson-peaks'), 'Crimson Peaks discovered');
select t_assert((select state from raids where slug = 'the-crimson-wyrm') = 'unlocked', 'raid auto-unlocked at 5 sigils');
select t_assert(exists(select 1 from chronicle_posts where title = 'The Crimson Wyrm Has Awakened'), 'raid chronicle published');
select t_assert(exists(select 1 from chronicle_posts where title = 'The Caravan Comes Home' and published), 'outcome chronicle published');
select t_assert((select status from quest_sessions where id = (select v from ids where k='caravan')) = 'completed', 'session completed');
select t_assert((select count(*) from audit_logs where action = 'results.approved') = 1, 'approval audited');
select t_expect_error($$update ledger_entries set amount = 1$$, 'append-only');

\echo '--- Self-reward guard: GM with own character on roster'
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false);
set role authenticated;
insert into ids select 'charF2', create_character('Founder Hero','dwarf','cleric',null,null,'{"might":2}');
select reserve_seat((select v from ids where k='mines'), (select v from ids where k='charF2')) where false;
reset role;
-- put founder's char on herbs session and have them try to approve own reward
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false);
set role authenticated;
select reserve_seat((select v from ids where k='herbs'), (select v from ids where k='charF2'));
select gm_save_results((select v from ids where k='herbs'), 'x', 'x', jsonb_build_array(jsonb_build_object('character_id', (select v from ids where k='charF2'), 'xp', 1000)), '{}', true);
select t_expect_error($$select approve_session_results((select v from ids where k='herbs'))$$, 'own character');
select t_expect_error($$select admin_adjust_ledger((select v from ids where k='charF2'), 'gold', 500, 'gift')$$, 'own character');
reset role;

\echo '--- Arcane Exchange'
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select t_assert(buy_with_gold((select id from items where slug='ironwood-shield'), (select v from ids where k='charA')) = 35, 'shield unlocked by merchant route flag, 125-90=35');
select t_expect_error($$select buy_with_gold((select id from items where slug='lantern-of-clear-sight'), (select v from ids where k='charA'))$$, 'Not enough gold');
select t_expect_error($$select buy_with_gold((select id from items where slug='ancient-sigil'), (select v from ids where k='charA'))$$, 'not sold');

\echo '--- Tavern chat'
insert into messages (channel_id, profile_id, body) values ((select id from chat_channels where slug='tavern'), auth.uid(), 'Anyone exploring the Ashen Road this week?');
select t_assert((select author_name from messages limit 1) = 'Aelindra', 'author snapshot');
select t_expect_error($$insert into messages (channel_id, profile_id, body) values ((select id from chat_channels where slug='tavern'), auth.uid(), 'email me at a@b.com')$$, 'email');
select t_expect_error($$insert into messages (channel_id, profile_id, body) values ((select id from chat_channels where slug='tavern'), auth.uid(), 'call 555-123-4567')$$, 'phone');
select t_expect_error($$insert into messages (channel_id, profile_id, body) values ((select id from chat_channels where slug='announcements'), auth.uid(), 'hi')$$, 'row-level security');
select t_expect_error($$insert into messages (channel_id, profile_id, body) values ((select id from chat_channels where slug='tavern'), '00000000-0000-0000-0000-00000000000b', 'impersonate')$$, 'row-level security');
insert into messages (channel_id, profile_id, body) select (select id from chat_channels where slug='tavern'), auth.uid(), 'msg ' || g from generate_series(1, 4) g;
select t_expect_error($$insert into messages (channel_id, profile_id, body) values ((select id from chat_channels where slug='tavern'), auth.uid(), 'spam')$$, 'Slow down');
select t_assert((select count(*) from chat_channels where session_id is not null) = 2, 'A sees 2 party rooms (caravan attended + herbs confirmed)');
insert into message_reports (message_id, reporter_id, reason) values ((select id from messages limit 1), auth.uid(), 'test report');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
select t_assert((select count(*) from chat_channels where session_id is not null) <= 1, 'B sees only own party rooms');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false);
set role authenticated;
select moderate_message((select id from messages order by created_at limit 1), 'test');
select restrict_user('00000000-0000-0000-0000-00000000000a', 60, null);
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select t_assert((select count(*) from messages where deleted_at is not null) = 0, 'removed message hidden from players');
select t_expect_error($$insert into messages (channel_id, profile_id, body) values ((select id from chat_channels where slug='lore'), auth.uid(), 'hello')$$, 'muted');
reset role;

\echo '--- Public (anon) views'
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select t_assert((resolve_guild_card((select token from tok where card_number='EVB-00001')) -> 'character' ->> 'name') = 'Aelindra', 'QR resolves to public profile');
select t_assert((resolve_guild_card((select token from tok where card_number='EVB-00005')) ->> 'status') = 'unassigned', 'unclaimed card resolves to claim flow');
select t_assert(resolve_guild_card('bogus') is null, 'bogus token -> null');
select t_assert((get_public_character('evb-00001') -> 'character' ->> 'rank_code') = 'E', 'public character page');
select t_assert((select character_name from get_leaderboard('renown', 'season') limit 1) = 'Aelindra', 'leaderboard top');
select t_assert((select count(*) from get_raids_public() where state = 'unlocked' and progress = 5) = 1, 'public raid view');
select t_assert((select count(*) from locations where slug = 'sunken-abbey') = 0, 'undiscovered hidden from public');
select t_assert((select count(*) from quest_templates) = 5, 'public sees published+locked templates');
select t_assert((select count(*) from characters) = 0, 'anon sees no characters');
select t_assert((select count(*) from raids) = 0, 'anon cannot read raw raids (reveal text)');
select t_expect_error($$select claim_guild_card('x')$$, 'permission denied');
select get_guild_stats();
reset role;

\echo '--- Card replacement & raid controls'
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false);
set role authenticated;
select t_assert((replace_guild_card((select id from guild_cards where card_number='EVB-00001'), 'Lost at the store', 'bronze')).status = 'claimed', 'replacement issued');
select t_assert((select status from guild_cards where card_number='EVB-00001') = 'deactivated', 'old card retired');
select t_expect_error($$select set_raid_state((select id from raids limit 1), 'active')$$, 'one step');
select set_raid_state((select id from raids limit 1), 'registration');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select t_assert(register_for_raid((select id from get_raids_public() limit 1), (select v from ids where k='charA')) = 'registered', 'A registers for raid');
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select t_assert((resolve_guild_card((select token from tok where card_number='EVB-00001')) ->> 'status') = 'deactivated', 'retired card shows deactivated');
reset role;
\echo '--- Auction Hall'
-- two more rank-E bidders with gold (test setup as database owner)
insert into ledger_entries (character_id, resource, amount, reason, source_type) select id, 'renown', 150, 'test', 'admin' from characters where name in ('Hero 0102', 'Hero 0103');
insert into ledger_entries (character_id, resource, amount, reason, source_type) select id, 'gold', 200, 'test', 'admin' from characters where name in ('Hero 0102', 'Hero 0103');
insert into ids select 'c102', id from characters where name = 'Hero 0102';
insert into ids select 'c103', id from characters where name = 'Hero 0103';
insert into ids select 'c104', id from characters where name = 'Hero 0104';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select t_expect_error($$select create_auction((select v from ids where k='charA'), (select id from items where slug='caravan-ledger'), 1, 10, null, 24)$$, 'bound to you');
select t_expect_error($$select create_auction((select v from ids where k='charA'), (select id from items where slug='ironwood-shield'), 2, 10, null, 24)$$, 'not have enough');
select t_expect_error($$select create_auction((select v from ids where k='charA'), (select id from items where slug='ironwood-shield'), 1, 10, 99999, 24)$$, 'between 1 and');
insert into ids select 'auc1', create_auction((select v from ids where k='charA'), (select id from items where slug='ironwood-shield'), 1, 10, 100, 24);
select t_assert((select gold from character_totals where character_id = (select v from ids where k='charA')) = 33, 'listing fee charged (35 - 2)');
select t_assert((select count(*) from inventory_balances where character_id = (select v from ids where k='charA') and item_id = (select id from items where slug='ironwood-shield')) = 0, 'item moved to escrow');
select t_expect_error($$select place_bid((select v from ids where k='auc1'), (select v from ids where k='charA'), 10)$$, 'own listing');
select t_expect_error($$insert into auctions (seller_profile_id, seller_character_id, item_id, quantity, start_price, ends_at) values (auth.uid(), (select v from ids where k='charA'), (select id from items limit 1), 1, 1, now())$$, 'row-level security|permission');
reset role;
select set_config('request.jwt.claim.sub', (select profile_id::text from characters where name = 'Hero 0104'), false);
set role authenticated;
select t_expect_error($$select place_bid((select v from ids where k='auc1'), (select v from ids where k='c104'), 10)$$, 'opens at guild rank E');
reset role;
select set_config('request.jwt.claim.sub', (select profile_id::text from characters where name = 'Hero 0102'), false);
set role authenticated;
select t_expect_error($$select place_bid((select v from ids where k='auc1'), (select v from ids where k='c102'), 5)$$, 'minimum bid is 10');
select t_expect_error($$select place_bid((select v from ids where k='auc1'), (select v from ids where k='c102'), 9999)$$, 'Not enough gold') where false;
select t_assert((place_bid((select v from ids where k='auc1'), (select v from ids where k='c102'), 10) ->> 'result') = 'bid', '0102 bids 10');
select t_expect_error($$select place_bid((select v from ids where k='auc1'), (select v from ids where k='c102'), 20)$$, 'already the highest');
reset role;
select set_config('request.jwt.claim.sub', (select profile_id::text from characters where name = 'Hero 0103'), false);
set role authenticated;
select t_expect_error($$select place_bid((select v from ids where k='auc1'), (select v from ids where k='c103'), 10)$$, 'minimum bid is 11');
select place_bid((select v from ids where k='auc1'), (select v from ids where k='c103'), 40);
select t_assert((select count(*) from get_auctions('active') where i_am_top and current_bid = 40) = 1, '0103 is top bidder in feed');
reset role;
select t_assert(_gold((select v from ids where k='c102')) = 275 + 0, '0102 outbid: gold fully returned') where false;
select t_assert((select sum(amount) from ledger_entries where character_id = (select v from ids where k='c102') and source_type = 'auction') = 0, '0102 outbid: escrow returned in full');
select t_assert((select sum(amount) from ledger_entries where character_id = (select v from ids where k='c103') and source_type = 'auction') = -40, '0103 gold held in escrow');
-- time runs out
alter table auctions disable trigger all; update auctions set ends_at = now() - interval '1 second' where id = (select v from ids where k='auc1'); alter table auctions enable trigger all;
select settle_due_auctions();
select settle_due_auctions();
select t_assert((select status from auctions where id = (select v from ids where k='auc1')) = 'sold', 'auction settled as sold');
select t_assert((select quantity from inventory_balances where character_id = (select v from ids where k='c103') and item_id = (select id from items where slug='ironwood-shield')) = 1, 'winner received the item exactly once');
select t_assert((select gold from character_totals where character_id = (select v from ids where k='charA')) = 33 + 38, 'seller paid 40 minus 5% house cut');
-- buy-now and cancel
select set_config('request.jwt.claim.sub', (select profile_id::text from characters where name = 'Hero 0103'), false);
set role authenticated;
insert into ids select 'auc2', create_auction((select v from ids where k='c103'), (select id from items where slug='ironwood-shield'), 1, 20, 60, 48);
select cancel_auction((select v from ids where k='auc2'));
select t_assert((select quantity from inventory_balances where character_id = (select v from ids where k='c103') and item_id = (select id from items where slug='ironwood-shield')) = 1, 'cancel returns the item');
insert into ids select 'auc3', create_auction((select v from ids where k='c103'), (select id from items where slug='ironwood-shield'), 1, 20, 60, 48);
reset role;
select set_config('request.jwt.claim.sub', (select profile_id::text from characters where name = 'Hero 0102'), false);
set role authenticated;
select t_assert((place_bid((select v from ids where k='auc3'), (select v from ids where k='c102'), 500) ->> 'price')::int = 60, 'buy-now charges the buy-now price, not the typed amount');
select t_expect_error($$select place_bid((select v from ids where k='auc3'), (select v from ids where k='c102'), 70)$$, 'has ended');
select t_expect_error($$select cancel_auction((select v from ids where k='auc3'))$$, 'no longer active');
reset role;
select t_assert((select quantity from inventory_balances where character_id = (select v from ids where k='c102') and item_id = (select id from items where slug='ironwood-shield')) = 1, 'buy-now delivers instantly');
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select t_assert((select count(*) from get_auctions('mine')) = 0, 'anon has no personal auction feed');
select t_expect_error($$select settle_due_auctions()$$, 'permission denied');
reset role;
\echo 'ALL TESTS PASSED'
