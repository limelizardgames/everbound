-- =============================================================================
-- EVERBOUND — The Auction Hall
-- Players auction tradeable items to each other for in-world gold only.
--  * Escrow: the item leaves the seller's inventory when listed; a bid's gold is
--    held immediately and returned automatically when outbid.
--  * Gold sinks: flat listing fee + percentage house cut on each sale.
--  * Guards: minimum guild rank, bound (non-tradeable) items, price caps,
--    no bidding on your own listing, anti-snipe extension, staff cancel + audit.
-- Everything is recorded in the same append-only ledgers as the rest of the game.
-- =============================================================================

alter table public.items add column if not exists is_tradeable boolean not null default true;
alter table public.items add column if not exists max_auction_price int check (max_auction_price is null or max_auction_price > 0);
-- Story items, keys and trophies are bound to whoever earned them.
update public.items set is_tradeable = false where item_type in ('artifact', 'key', 'trophy');

alter table public.ledger_entries drop constraint if exists ledger_entries_source_type_check;
alter table public.ledger_entries add constraint ledger_entries_source_type_check
  check (source_type in ('session', 'raid', 'admin', 'purchase', 'refund', 'correction', 'achievement', 'starting', 'auction'));
alter table public.inventory_transactions drop constraint if exists inventory_transactions_source_type_check;
alter table public.inventory_transactions add constraint inventory_transactions_source_type_check
  check (source_type in ('session', 'raid', 'admin', 'purchase', 'refund', 'correction', 'starting', 'crafting', 'auction'));

insert into public.admin_settings (key, value, description) values
  ('auction_min_rank', '"E"', 'Guild rank required to list or bid in the Auction Hall'),
  ('auction_listing_fee', '2', 'Gold charged to list an item (not refunded)'),
  ('auction_fee_percent', '5', 'House cut taken from the final sale price'),
  ('auction_max_price', '5000', 'Default cap on any bid or buy-now price (items may set their own)')
on conflict (key) do nothing;

create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.profiles (id) on delete cascade,
  seller_character_id uuid not null references public.characters (id) on delete cascade,
  item_id uuid not null references public.items (id),
  quantity int not null check (quantity between 1 and 99),
  start_price int not null check (start_price > 0),
  buy_now_price int check (buy_now_price is null or buy_now_price >= start_price),
  current_bid int,
  current_bidder_profile_id uuid references public.profiles (id) on delete set null,
  current_bidder_character_id uuid references public.characters (id) on delete set null,
  bid_count int not null default 0,
  status text not null default 'active' check (status in ('active', 'sold', 'expired', 'canceled')),
  final_price int,
  ends_at timestamptz not null,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists auctions_status_idx on public.auctions (status, ends_at);

create table if not exists public.auction_bids (
  id bigint generated always as identity primary key,
  auction_id uuid not null references public.auctions (id) on delete cascade,
  bidder_profile_id uuid not null references public.profiles (id) on delete cascade,
  bidder_character_id uuid not null references public.characters (id) on delete cascade,
  amount int not null,
  created_at timestamptz not null default now()
);
create index if not exists auction_bids_auction_idx on public.auction_bids (auction_id, created_at desc);

alter table public.auctions enable row level security;
alter table public.auction_bids enable row level security;
-- Reads go through get_auctions(); only staff read the raw tables. No direct writes.
drop policy if exists auctions_staff on public.auctions;
create policy auctions_staff on public.auctions for select using (public.is_staff());
drop policy if exists auction_bids_staff on public.auction_bids;
create policy auction_bids_staff on public.auction_bids for select using (public.is_staff() or bidder_profile_id = auth.uid());

-- ---------------------------------------------------------------- helpers
create or replace function public._gold(p_character uuid)
returns int language sql stable security definer set search_path = public
as $$ select coalesce(sum(amount), 0)::int from public.ledger_entries where character_id = p_character and resource = 'gold' $$;

create or replace function public._auction_gate(p_character uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_min text := public.setting_text('auction_min_rank', 'E'); v_rank text;
begin
  if auth.uid() is null then raise exception 'Sign in to use the Auction Hall'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_banned) then raise exception 'Account restricted'; end if;
  if not exists (select 1 from public.characters where id = p_character and profile_id = auth.uid() and is_active) then
    raise exception 'Choose one of your active adventurers';
  end if;
  select rank_code into v_rank from public.character_totals where character_id = p_character;
  if public.rank_sort(v_rank) < public.rank_sort(v_min) then
    raise exception 'The Auction Hall opens at guild rank %', v_min;
  end if;
end $$;

-- Pays out or returns everything for one auction. Idempotent via status check.
create or replace function public._settle_auction(p_auction uuid, p_final_price int default null)
returns text language plpgsql security definer set search_path = public
as $$
declare a public.auctions%rowtype; v_item text; v_price int; v_fee int;
begin
  select * into a from public.auctions where id = p_auction for update;
  if not found or a.status <> 'active' then return 'noop'; end if;
  select name into v_item from public.items where id = a.item_id;

  if a.current_bidder_character_id is null then
    insert into public.inventory_transactions (character_id, item_id, quantity, reason, source_type, source_id, idempotency_key)
    values (a.seller_character_id, a.item_id, a.quantity, 'Auction ended unsold: item returned', 'auction', a.id::text, 'auction:' || a.id || ':return');
    update public.auctions set status = 'expired', settled_at = now() where id = a.id;
    perform public.notify(a.seller_profile_id, 'Auction ended without bids', v_item || ' has been returned to your satchel.', '/auction/?tab=mine');
    return 'expired';
  end if;

  -- The winner's gold is already in escrow (debited when they bid).
  v_price := coalesce(p_final_price, a.current_bid);
  v_fee := ceil(v_price * public.setting_text('auction_fee_percent', '5')::numeric / 100)::int;
  insert into public.inventory_transactions (character_id, item_id, quantity, reason, source_type, source_id, idempotency_key)
  values (a.current_bidder_character_id, a.item_id, a.quantity, 'Won at auction', 'auction', a.id::text, 'auction:' || a.id || ':win');
  if v_price - v_fee > 0 then
    insert into public.ledger_entries (character_id, resource, amount, reason, source_type, source_id, idempotency_key)
    values (a.seller_character_id, 'gold', v_price - v_fee, format('Auction sale: %s (%s gold, %s house cut)', v_item, v_price, v_fee), 'auction', a.id::text, 'auction:' || a.id || ':payout');
  end if;
  update public.auctions set status = 'sold', final_price = v_price, settled_at = now() where id = a.id;
  perform public.notify(a.seller_profile_id, 'Sold at auction!', format('%s sold for %s gold. You received %s after the house cut.', v_item, v_price, v_price - v_fee), '/auction/?tab=mine');
  perform public.notify(a.current_bidder_profile_id, 'You won the auction!', v_item || ' is now in your satchel.', '/portal/inventory/');
  return 'sold';
end $$;

create or replace function public.settle_due_auctions()
returns int language plpgsql security definer set search_path = public
as $$
declare r record; n int := 0;
begin
  for r in select id from public.auctions where status = 'active' and ends_at <= now() order by ends_at limit 50 for update skip locked loop
    perform public._settle_auction(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------- player actions
create or replace function public.create_auction(p_character uuid, p_item uuid, p_quantity int, p_start_price int, p_buy_now int, p_hours int)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_item public.items%rowtype; v_have int; v_fee int := public.setting_text('auction_listing_fee', '2')::int; v_cap int; v_id uuid := gen_random_uuid();
begin
  perform public._auction_gate(p_character);
  select * into v_item from public.items where id = p_item;
  if not found or not v_item.is_tradeable then raise exception 'That item is bound to you and cannot be auctioned'; end if;
  if p_quantity < 1 then raise exception 'Invalid quantity'; end if;
  if p_hours not in (24, 48, 72) then raise exception 'Choose a 24, 48 or 72 hour auction'; end if;
  v_cap := coalesce(v_item.max_auction_price, public.setting_text('auction_max_price', '5000')::int);
  if p_start_price < 1 or p_start_price > v_cap or (p_buy_now is not null and (p_buy_now < p_start_price or p_buy_now > v_cap)) then
    raise exception 'Prices for this item must be between 1 and % gold', v_cap;
  end if;
  if (select count(*) from public.auctions where seller_profile_id = auth.uid() and status = 'active') >= 5 then
    raise exception 'You can have at most 5 active listings';
  end if;
  perform pg_advisory_xact_lock(hashtext('gold:' || p_character));
  select coalesce(sum(quantity), 0) into v_have from public.inventory_transactions where character_id = p_character and item_id = p_item;
  if v_have < p_quantity then raise exception 'You do not have enough of that item'; end if;
  if public._gold(p_character) < v_fee then raise exception 'You need % gold for the listing fee', v_fee; end if;

  insert into public.auctions (id, seller_profile_id, seller_character_id, item_id, quantity, start_price, buy_now_price, ends_at)
  values (v_id, auth.uid(), p_character, p_item, p_quantity, p_start_price, p_buy_now, now() + make_interval(hours => p_hours));
  insert into public.inventory_transactions (character_id, item_id, quantity, reason, source_type, source_id, idempotency_key, created_by)
  values (p_character, p_item, -p_quantity, 'Placed in auction escrow', 'auction', v_id::text, 'auction:' || v_id || ':escrow', auth.uid());
  if v_fee > 0 then
    insert into public.ledger_entries (character_id, resource, amount, reason, source_type, source_id, idempotency_key, created_by)
    values (p_character, 'gold', -v_fee, 'Auction listing fee: ' || v_item.name, 'auction', v_id::text, 'auction:' || v_id || ':fee', auth.uid());
  end if;
  return v_id;
end $$;

create or replace function public.place_bid(p_auction uuid, p_character uuid, p_amount int)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare a public.auctions%rowtype; v_item public.items%rowtype; v_min int; v_cap int; v_bought boolean := false; v_pay int;
begin
  perform public._auction_gate(p_character);
  select * into a from public.auctions where id = p_auction for update;
  if not found or a.status <> 'active' or a.ends_at <= now() then raise exception 'This auction has ended'; end if;
  if a.seller_profile_id = auth.uid() then raise exception 'You cannot bid on your own listing'; end if;
  if a.current_bidder_profile_id = auth.uid() then raise exception 'You are already the highest bidder'; end if;
  select * into v_item from public.items where id = a.item_id;
  v_cap := coalesce(v_item.max_auction_price, public.setting_text('auction_max_price', '5000')::int);
  v_min := case when a.current_bid is null then a.start_price else a.current_bid + greatest(1, ceil(a.current_bid * 0.05)::int) end;
  if p_amount < v_min then raise exception 'The minimum bid is % gold', v_min; end if;
  if p_amount > v_cap then raise exception 'Bids on this item are capped at % gold', v_cap; end if;
  v_pay := p_amount;
  if a.buy_now_price is not null and p_amount >= a.buy_now_price then v_pay := a.buy_now_price; v_bought := true; end if;

  perform pg_advisory_xact_lock(hashtext('gold:' || p_character));
  if public._gold(p_character) < v_pay then raise exception 'Not enough gold (% needed)', v_pay; end if;

  -- Return the previous bidder's escrowed gold.
  if a.current_bidder_character_id is not null then
    insert into public.ledger_entries (character_id, resource, amount, reason, source_type, source_id)
    values (a.current_bidder_character_id, 'gold', a.current_bid, 'Outbid: gold returned (' || v_item.name || ')', 'auction', a.id::text);
    perform public.notify(a.current_bidder_profile_id, 'You have been outbid', format('Someone bid %s gold on %s. Your %s gold was returned.', v_pay, v_item.name, a.current_bid), '/auction/');
  end if;
  insert into public.ledger_entries (character_id, resource, amount, reason, source_type, source_id, created_by)
  values (p_character, 'gold', -v_pay, case when v_bought then 'Auction buy-now: ' else 'Auction bid held: ' end || v_item.name, 'auction', a.id::text, auth.uid());
  insert into public.auction_bids (auction_id, bidder_profile_id, bidder_character_id, amount) values (a.id, auth.uid(), p_character, v_pay);
  update public.auctions set current_bid = v_pay, current_bidder_profile_id = auth.uid(), current_bidder_character_id = p_character,
         bid_count = bid_count + 1,
         -- anti-snipe: a late bid keeps the auction open five more minutes
         ends_at = case when not v_bought and ends_at - now() < interval '5 minutes' then now() + interval '5 minutes' else ends_at end
   where id = a.id;
  if v_bought then
    perform public._settle_auction(a.id, v_pay);
    return jsonb_build_object('result', 'bought', 'price', v_pay);
  end if;
  return jsonb_build_object('result', 'bid', 'price', v_pay);
end $$;

create or replace function public.cancel_auction(p_auction uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare a public.auctions%rowtype; v_item text; v_staff boolean := public.is_staff();
begin
  select * into a from public.auctions where id = p_auction for update;
  if not found or a.status <> 'active' then raise exception 'This auction is no longer active'; end if;
  if not v_staff and a.seller_profile_id is distinct from auth.uid() then raise exception 'Not your listing'; end if;
  if not v_staff and a.bid_count > 0 then raise exception 'A listing with bids can only be canceled by a Guild Master'; end if;
  select name into v_item from public.items where id = a.item_id;
  if a.current_bidder_character_id is not null then
    insert into public.ledger_entries (character_id, resource, amount, reason, source_type, source_id)
    values (a.current_bidder_character_id, 'gold', a.current_bid, 'Auction canceled: gold returned (' || v_item || ')', 'auction', a.id::text);
    perform public.notify(a.current_bidder_profile_id, 'Auction canceled', format('Your %s gold bid on %s was returned.', a.current_bid, v_item), '/auction/');
  end if;
  insert into public.inventory_transactions (character_id, item_id, quantity, reason, source_type, source_id, idempotency_key)
  values (a.seller_character_id, a.item_id, a.quantity, 'Auction canceled: item returned', 'auction', a.id::text, 'auction:' || a.id || ':return');
  update public.auctions set status = 'canceled', settled_at = now() where id = a.id;
  if v_staff and a.seller_profile_id is distinct from auth.uid() then
    perform public.notify(a.seller_profile_id, 'Listing removed by the Guild', coalesce(p_reason, 'A Guild Master removed your listing.') || ' ' || v_item || ' was returned.', '/auction/?tab=mine');
    perform public.write_audit('auction.canceled', 'auction', a.id::text, jsonb_build_object('reason', p_reason, 'had_bids', a.bid_count > 0));
  end if;
end $$;

-- Listing feed. Settles anything that has run out first, so no scheduler is needed.
create or replace function public.get_auctions(p_tab text default 'active')
returns table (id uuid, item_id uuid, item_name text, item_description text, item_type text, rarity text, quantity int,
               start_price int, buy_now_price int, current_bid int, min_next_bid int, bid_count int, status text, final_price int,
               ends_at timestamptz, seller_name text, is_mine boolean, i_am_top boolean)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.settle_due_auctions();
  return query
  select a.id, i.id, i.name, i.description, i.item_type, i.rarity, a.quantity, a.start_price, a.buy_now_price, a.current_bid,
         case when a.current_bid is null then a.start_price else a.current_bid + greatest(1, ceil(a.current_bid * 0.05)::int) end,
         a.bid_count, a.status, a.final_price, a.ends_at, c.name,
         a.seller_profile_id = auth.uid(), coalesce(a.current_bidder_profile_id = auth.uid(), false)
  from public.auctions a
  join public.items i on i.id = a.item_id
  join public.characters c on c.id = a.seller_character_id
  where case when p_tab = 'mine'
             then auth.uid() is not null and (a.seller_profile_id = auth.uid()
                  or exists (select 1 from public.auction_bids b where b.auction_id = a.id and b.bidder_profile_id = auth.uid()))
             else a.status = 'active' end
  order by (a.status = 'active') desc, case when a.status = 'active' then a.ends_at end asc, a.settled_at desc nulls last
  limit 100;
end $$;

revoke all on function public._gold(uuid) from public, anon, authenticated;
revoke all on function public._auction_gate(uuid) from public, anon, authenticated;
revoke all on function public._settle_auction(uuid, int) from public, anon, authenticated;
revoke all on function public.settle_due_auctions() from public, anon, authenticated;
revoke execute on function public.create_auction(uuid, uuid, int, int, int, int) from public, anon;
revoke execute on function public.place_bid(uuid, uuid, int) from public, anon;
revoke execute on function public.cancel_auction(uuid, text) from public, anon;
grant execute on function public.create_auction(uuid, uuid, int, int, int, int) to authenticated;
grant execute on function public.place_bid(uuid, uuid, int) to authenticated;
grant execute on function public.cancel_auction(uuid, text) to authenticated;
grant execute on function public.settle_due_auctions() to service_role;
