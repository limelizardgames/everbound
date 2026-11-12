-- =============================================================================
-- EVERBOUND — RESET
-- Removes everything supabase/setup.sql creates, so setup can be run again from
-- scratch (for example after a setup attempt that stopped half-way).
--
-- WARNING: this permanently deletes ALL Everbound data (characters, cards,
-- ledgers, bookings, chat). Login accounts in auth.users are kept; they get
-- fresh profiles automatically when setup.sql runs again.
-- =============================================================================

drop trigger if exists on_auth_user_created on auth.users;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime drop table public.messages; exception when others then null; end;
    begin alter publication supabase_realtime drop table public.notifications; exception when others then null; end;
  end if;
end $$;

drop view if exists public.character_profession_levels, public.character_totals, public.inventory_balances, public.session_seats cascade;

drop table if exists
  public.crafting_log, public.riddle_attempts, public.errand_runs, public.errand_secrets, public.errand_rewards, public.errands,
  public.recipe_ingredients, public.recipes, public.character_professions, public.professions,
  public.auction_bids, public.auctions, public.admin_settings, public.audit_logs, public.profiles, public.rule_sets, public.rank_definitions, public.characters, public.character_history, public.guild_cards, public.ledger_entries, public.items, public.inventory_transactions, public.achievements, public.character_achievements, public.locations, public.world_flags, public.world_events, public.chronicle_posts, public.quest_templates, public.quest_template_secrets, public.quest_objectives, public.quest_sessions, public.reservations, public.session_results, public.quest_completions, public.raids, public.raid_registrations, public.chat_channels, public.messages, public.message_reports, public.user_blocks, public.products, public.orders, public.order_items, public.notifications, public.quest_session_notes
  cascade;

drop sequence if exists public.guild_card_number_seq cascade;

-- Every Everbound function, whatever its argument list.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('age_from','profile_age','check_reservation_age','profession_level','profession_next_xp','_own_character','_norm_answer','_errand_claims_today','_grant_errand_rewards','start_expedition','claim_expedition','abandon_expedition','solve_riddle','learn_profession','forget_profession','craft','gm_use_item','_gold','_auction_gate','_settle_auction','settle_due_auctions','create_auction','place_bid','cancel_auction','get_auctions','_apply_flag_delta','_promote_waitlist','_public_character_json','_raid_transition','_set_location_status','adjust_world_flag','admin_adjust_ledger','admin_grant_item','admin_set_payment_status','approve_session_results','assign_guild_card','before_message_insert','buy_with_gold','can_view_channel','cancel_reservation','claim_guild_card','confirm_order_payment','confirm_reservation_payment','create_character','create_order','create_party_channel','deactivate_guild_card','evaluate_raids','forbid_mutation','forbid_ledger_mutation','generate_guild_cards','get_guild_stats','get_leaderboard','get_public_character','get_raids_public','gm_save_results','gm_update_character_state','guard_template_status','handle_new_user','has_role','is_staff','level_for_xp','log_location_change','moderate_message','my_role','new_card_token','next_level_xp','notify','protect_character_columns','protect_profile_columns','purge_old_messages','rank_for_renown','rank_sort','register_for_raid','reject_session_results','replace_guild_card','reserve_seat','resolve_guild_card','resolve_world_conflict','restrict_user','set_location_status','set_raid_paused','set_raid_state','set_user_role','setting_text','slugify','write_audit')
  loop
    execute 'drop function if exists ' || f.sig || ' cascade';
  end loop;
end $$;

drop type if exists
  public.user_role, public.card_status, public.location_status, public.quest_type, public.template_status, public.session_status, public.reservation_status, public.payment_status, public.ledger_resource, public.result_status, public.raid_state, public.chronicle_category, public.order_status, public.report_status
  cascade;

-- Portrait storage rules (the bucket itself is kept; setup re-creates it if missing).
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    drop policy if exists "portraits are public" on storage.objects;
    drop policy if exists "players upload own portraits" on storage.objects;
    drop policy if exists "players replace own portraits" on storage.objects;
    drop policy if exists "players delete own portraits" on storage.objects;
  end if;
end $$;
