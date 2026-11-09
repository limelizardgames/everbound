-- =============================================================================
-- EVERBOUND — Seed data for a fictional starting world (safe to edit freely)
-- =============================================================================

insert into public.admin_settings (key, value, description) values
  ('payments_mode', '"pay_at_table"', 'pay_at_table = seats confirm instantly and are paid at the store; stripe = Stripe Checkout required'),
  ('store_payments', '"pay_at_pickup"', 'pay_at_pickup = store orders are reserved and paid at pickup; stripe = Stripe Checkout'),
  ('chat_retention_days', '180', 'Tavern messages older than this are purged by purge_old_messages()'),
  ('season_start', to_jsonb(date_trunc('month', now())), 'Seasonal leaderboards count from this timestamp'),
  ('season_name', '"Season of the Wyrm"', 'Display name of the current season'),
  ('default_venue', '"Partner Game Store"', 'Default venue name for new sessions')
on conflict (key) do nothing;

insert into public.rank_definitions (code, title, renown_required, sort, card_design) values
  ('F', 'Initiate', 0, 1, 'iron'),
  ('E', 'Explorer', 100, 2, 'bronze'),
  ('D', 'Pathfinder', 300, 3, 'bronze'),
  ('C', 'Vanguard', 750, 4, 'silver'),
  ('B', 'Champion', 1500, 5, 'silver'),
  ('A', 'Hero', 3000, 6, 'gold'),
  ('S', 'Legend', 6000, 7, 'mythril')
on conflict (code) do nothing;

insert into public.rule_sets (name, version, is_active, definition) values (
  'Everbound Starter Rules', 1, true,
  $json${
    "summary": "Placeholder rules for the pilot. Replace with your chosen ruleset; existing characters keep their version.",
    "attributes": [
      {"key": "might",  "label": "Might",  "hint": "Strength, endurance, raw power"},
      {"key": "grace",  "label": "Grace",  "hint": "Agility, stealth, precision"},
      {"key": "wits",   "label": "Wits",   "hint": "Knowledge, perception, cunning"},
      {"key": "spirit", "label": "Spirit", "hint": "Willpower, charm, magic"}
    ],
    "attribute_min": 0,
    "attribute_max": 4,
    "starting_attribute_points": 6,
    "hp_attribute": "might",
    "starting_gold": 50,
    "level_thresholds": [0, 300, 900, 1800, 3000, 4500, 6500, 9000, 12000, 16000],
    "species": [
      {"key": "human",       "label": "Human",       "traits": "Adaptable and ambitious"},
      {"key": "half_elf",    "label": "Half-Elf",    "traits": "Keen senses, between two worlds"},
      {"key": "dwarf",       "label": "Dwarf",       "traits": "Stout, stubborn, stone-wise"},
      {"key": "beastkin",    "label": "Beastkin",    "traits": "Wild instincts and sharp senses"},
      {"key": "fae_touched", "label": "Fae-Touched", "traits": "Marked by the old magic"},
      {"key": "orcborn",     "label": "Orcborn",     "traits": "Fierce, loyal, enduring"}
    ],
    "classes": [
      {"key": "warrior", "label": "Warrior", "hp_base": 14, "role": "Frontline defender"},
      {"key": "ranger",  "label": "Ranger",  "hp_base": 12, "role": "Scout and marksman"},
      {"key": "rogue",   "label": "Rogue",   "hp_base": 10, "role": "Infiltrator and trickster"},
      {"key": "cleric",  "label": "Cleric",  "hp_base": 10, "role": "Healer and protector"},
      {"key": "mage",    "label": "Mage",    "hp_base": 8,  "role": "Wielder of arcane power"},
      {"key": "bard",    "label": "Bard",    "hp_base": 9,  "role": "Inspiration and lore"}
    ]
  }$json$::jsonb
) on conflict (name, version) do nothing;

-- World -----------------------------------------------------------------------
insert into public.locations (slug, name, region, status, summary, lore, threat, is_discovered, discovered_by, map_x, map_y) values
  ('highmere', 'Highmere', 'The Heartlands', 'peaceful',
   'Walled city and home of the Adventurers Guild Hall.',
   'Highmere grew around the Guild Hall, a tower of pale stone whose great bell rings whenever a contract is fulfilled.',
   null, true, 'The Founding Guild', 50, 55),
  ('ashen-road', 'The Ashen Road', 'The Heartlands', 'threatened',
   'Trade road scarred by an old wildfire. Caravans have been vanishing.',
   'Charred oaks line the road for twenty miles. Merchants say the smoke never fully cleared.',
   'Bandit activity · missing caravans', true, 'The Founding Guild', 62, 48),
  ('silverfen', 'Silverfen', 'The Glimmering Marsh', 'peaceful',
   'A marsh village where strange crystals were recently unearthed.',
   'Fisherfolk of Silverfen speak of lights beneath the water on moonless nights.',
   null, true, 'An unnamed adventuring party', 30, 66),
  ('northern-watchtower', 'Northern Watchtower', 'The Frostmarch', 'destroyed',
   'Guild outpost that stopped responding three weeks ago.',
   'The last message from the Watchtower was a single word: "Gate".',
   'Unknown attackers', true, 'Guild scouts', 52, 18),
  ('old-kings-road', 'Old King''s Road', 'The Frostmarch', 'threatened',
   'The northern highway. Merchants refuse to travel it since the Watchtower fell.',
   null, 'Unpatrolled since the Watchtower fell', true, 'The Founding Guild', 44, 32),
  ('black-hollow', 'The Black Hollow', 'The Northern Ruins', 'unknown',
   'A ravine beyond the northern ruins where strange lights have appeared.',
   'Guild scouts sent to the Hollow have not returned.',
   'Unknown', true, 'Guild scouts', 70, 22),
  ('whisperstone-mines', 'Whisperstone Mines', 'The Greyridge', 'threatened',
   'Abandoned dwarven mines. Miners report voices in the deep tunnels.',
   null, 'Something stirs in the lower galleries', true, 'Dwarven prospectors', 78, 60),
  ('emberfall', 'Emberfall Village', 'The Heartlands', 'peaceful',
   'Farming village famous for its harvest festival and its terrible ale.',
   null, null, true, 'The Founding Guild', 40, 78),
  ('crimson-peaks', 'The Crimson Peaks', 'The Northern Ruins', 'unknown',
   'Red-stoned mountains at the edge of the known world.',
   'Old songs say a wyrm sleeps beneath the peaks, sealed by five sigils.',
   'Legendary', false, null, 82, 12),
  ('sunken-abbey', 'The Sunken Abbey', 'The Glimmering Marsh', 'unknown',
   'A drowned monastery whose bells still ring at low tide.', null, null, false, null, 18, 50)
on conflict (slug) do nothing;

insert into public.world_flags (key, label, value, is_public) values
  ('ancient_sigils', 'Ancient sigils recovered', 3, true),
  ('bandit_threat', 'Bandit threat on the Ashen Road', 2, false),
  ('merchant_route_open', 'Merchant route to Highmere reopened', 0, false),
  ('crystal_research', 'Silverfen crystal research progress', 1, true),
  ('watchtower_clues', 'Clues about the Watchtower''s fall', 0, false)
on conflict (key) do nothing;

insert into public.raids (slug, name, state, dormant_text, foreshadow_text, reveal_text, condition_flag_key, condition_target,
                          conditions_public, min_rank, capacity)
values ('the-crimson-wyrm', 'The Crimson Wyrm', 'foreshadowed',
        'No active threat has been detected.',
        'The guild has recovered three of the five ancient sigils. Something stirs beyond the gate.',
        'The seal is broken. The Crimson Wyrm wakes beneath the peaks. Every party in the Guild will be needed: two tables, two Guild Masters, one fate.',
        'ancient_sigils', 5, true, null, 20)
on conflict (slug) do nothing;

insert into public.chronicle_posts (slug, title, category, excerpt, body, location_id, is_featured, published, published_at) values
  ('the-northern-watchtower-has-fallen', 'The Northern Watchtower Has Fallen', 'world_news',
   'Reports confirm that the Northern Watchtower is no longer responding to the Guild. Merchants are refusing to travel the Old King''s Road.',
   E'Three weeks have passed since the signal fires of the Northern Watchtower went dark.\n\nA Guild courier returned yesterday with grim news: the outer wall is breached and the garrison is gone. There were no bodies.\n\nUntil the road is secured, the Guild advises all merchants to avoid the Old King''s Road. Adventurers of any rank may accept scouting contracts at the Quest Board.',
   (select id from public.locations where slug = 'northern-watchtower'), true, true, now() - interval '2 days'),
  ('unusual-crystals-discovered', 'Unusual Crystals Discovered', 'discovery',
   'An adventuring party reports an unknown magical resource beneath Silverfen.',
   E'A party returning from Silverfen carried a shard of crystal that hums faintly when held near running water.\n\nThe Guild''s scholars have begun their study. Further samples are wanted; contracts will be posted soon.',
   (select id from public.locations where slug = 'silverfen'), false, true, now() - interval '5 days'),
  ('the-black-hollow-stirs', 'The Black Hollow Stirs', 'world_news',
   'Strange lights have appeared beyond the northern ruins. Guild scouts have not returned.',
   E'Shepherds in the northern foothills report pale green lights rising from the Black Hollow after dusk.\n\nTwo Guild scouts were dispatched last week. Neither has returned. The Guild is assembling a party of experienced adventurers.',
   (select id from public.locations where slug = 'black-hollow'), false, true, now() - interval '1 day'),
  ('founding-guild-charter', 'The Founding Guild Charter Is Open', 'guild_proclamation',
   'The Guild seeks its first adventurers. Founding members will be remembered forever.',
   E'By order of the Guild Masters: the charter of the Everbound Adventurers Guild is open.\n\nThose who register during the founding season will bear the title Founding Adventurer for as long as the Guild stands.',
   (select id from public.locations where slug = 'highmere'), false, true, now() - interval '7 days'),
  ('a-word-from-quartermaster-bram', 'A Word from Quartermaster Bram', 'npc_announcement',
   '"If someone could clear the bandits off the Ashen Road, I could finally restock shields."',
   E'"Rope, lanterns, draughts — those I can still get. But my ironwood shields come up the Ashen Road, and nothing has come up the Ashen Road in a fortnight. Clear the road and I''ll stock the good stuff again."\n\n— Bram, Quartermaster of the Highmere Guild Hall',
   (select id from public.locations where slug = 'highmere'), false, true, now() - interval '3 days')
on conflict (slug) do nothing;

-- Economy ---------------------------------------------------------------------
insert into public.items (slug, name, description, item_type, rarity, gold_price, requires_flag) values
  ('healing-draught', 'Healing Draught', 'A bitter red tonic. Restores vigor between battles.', 'consumable', 'common', 15, null),
  ('travelers-rope', 'Traveler''s Rope', 'Fifty feet of sturdy hemp.', 'gear', 'common', 5, null),
  ('lantern-of-clear-sight', 'Lantern of Clear Sight', 'Its light reveals what darkness hides.', 'gear', 'uncommon', 40, null),
  ('guild-cloak-dye', 'Guild Cloak Dye: Midnight Gold', 'Cosmetic. Dyes your guild cloak in midnight and gold.', 'cosmetic', 'uncommon', 60, null),
  ('ironwood-shield', 'Ironwood Shield', 'Light as oak, hard as iron. Arrives via the Ashen Road.', 'gear', 'rare', 90, 'merchant_route_open'),
  ('silverfen-crystal-shard', 'Silverfen Crystal Shard', 'Hums faintly near running water.', 'material', 'rare', null, null),
  ('ancient-sigil', 'Ancient Sigil', 'One of five seals. Warm to the touch.', 'artifact', 'legendary', null, null),
  ('caravan-ledger', 'Torn Caravan Ledger', 'Water-stained pages with a strange symbol.', 'key', 'uncommon', null, null)
on conflict (slug) do nothing;

insert into public.achievements (slug, name, description, icon, renown_bonus, is_secret) values
  ('founding-adventurer', 'Founding Adventurer', 'Joined the Guild during its founding season.', 'crown', 25, false),
  ('first-blood', 'First Blood', 'Survived your first battle.', 'sword', 10, false),
  ('cartographer', 'Cartographer', 'Discovered a new location for the Guild.', 'map', 20, false),
  ('guild-protector', 'Guild Protector', 'Defended a settlement from destruction.', 'shield', 30, false),
  ('caravan-saviour', 'Caravan Saviour', 'Brought a lost caravan home.', 'wagon', 15, false),
  ('keeper-of-secrets', 'Keeper of Secrets', 'Uncovered a secret the Guild did not know.', 'eye', 25, true),
  ('dragonbane', 'Dragonbane', 'Stood against the Crimson Wyrm.', 'flame', 100, true)
on conflict (slug) do nothing;

-- Quests ----------------------------------------------------------------------
insert into public.quest_templates (slug, title, quest_type, status, summary, description, rank_min, rank_max, difficulty,
  suggested_level, party_min, party_max, est_minutes, location_id, reward_preview, content_advisories) values
  ('the-missing-caravan', 'The Missing Caravan', 'standard', 'published',
   'Find the last known location of a merchant caravan near the Ashen Road.',
   E'Merchant Oswin Tallow''s caravan left Emberfall six days ago bound for Highmere. It never arrived.\n\nHis daughter has posted a contract at the Guild Hall: find the caravan, and if fortune allows, find her father. The Ashen Road is not kind to the careless.',
   'F', 'D', 'moderate', 1, 3, 5, 180, (select id from public.locations where slug = 'ashen-road'),
   '75 gold · 40 renown · possible loot', array['Mild peril', 'Combat']),
  ('whispers-beneath-stone', 'Whispers Beneath Stone', 'party', 'published',
   'Descend into the Whisperstone Mines and discover what speaks in the dark.',
   E'Dwarven prospectors fled the lower galleries of the Whisperstone Mines, swearing they heard their own names called from the rock.\n\nThe mine''s owners will pay handsomely for the tunnels to be made safe — or at least explained.',
   'E', 'C', 'hard', 2, 4, 6, 180, (select id from public.locations where slug = 'whisperstone-mines'),
   '120 gold · 60 renown · rare materials', array['Darkness and enclosed spaces', 'Combat', 'Spooky themes']),
  ('herbs-for-the-apothecary', 'Herbs for the Apothecary', 'contract', 'published',
   'Gather moonpetal from the edge of Silverfen before the frost.',
   E'Old Mother Wren needs moonpetal for her winter remedies, and her knees are not what they were. A gentle errand — so long as you mind the bog lights.',
   'F', 'S', 'gentle', 1, 2, 4, 90, (select id from public.locations where slug = 'silverfen'),
   '25 gold · 15 renown', array[]::text[]),
  ('ashes-of-the-watchtower', 'Ashes of the Watchtower', 'story', 'published',
   'Investigate the fall of the Northern Watchtower.',
   E'The Watchtower is silent. The Guild needs eyes on the ruins: what attacked it, where the garrison went, and what the last message — "Gate" — meant.\n\nThis is a Story Quest. What your party finds will shape what happens next in the Frostmarch.',
   'F', 'C', 'hard', 2, 3, 5, 180, (select id from public.locations where slug = 'northern-watchtower'),
   '90 gold · 60 renown · story consequences', array['Combat', 'Themes of loss']),
  ('the-crimson-wyrm', 'The Crimson Wyrm', 'world', 'locked',
   'A legendary threat sealed beneath the Crimson Peaks.',
   'Locked. The Guild has not yet found a way to the Wyrm.',
   'C', 'S', 'deadly', 5, 6, 10, 240, (select id from public.locations where slug = 'crimson-peaks'),
   'Legendary', array['Intense combat'])
on conflict (slug) do nothing;

insert into public.quest_template_secrets (template_id, gm_notes, npcs, encounter_notes, consequence_hooks)
select id, gm_notes, npcs, enc, hooks from (values
  ('the-missing-caravan', 'The caravan was taken by the Ashjaw bandits, who were paid by a rival merchant. Oswin is alive, held at the old toll house.',
   'Oswin Tallow (merchant), Bryn Tallow (daughter), Captain Rusk (bandit leader)', 'Ambush at the burned bridge; parley possible at the toll house.',
   'Success: bandit_threat -1. If Rusk is spared he may return as an informant. The torn ledger points to the Watchtower.'),
  ('whispers-beneath-stone', 'The voices are a crystal resonance — the same crystals as Silverfen. A sigil is embedded in the deepest gallery.',
   'Foreman Dagna, the Echo', 'Collapsing gallery; echo-wraiths mimic party members.', 'Recovering the sigil: ancient_sigils +1.'),
  ('herbs-for-the-apothecary', 'Bog lights lead to the Sunken Abbey if followed.', 'Mother Wren', 'Optional: bog-light lure.', 'Following the lights can discover the Sunken Abbey.'),
  ('ashes-of-the-watchtower', 'The garrison went through a gate beneath the tower. The fourth sigil lies in the captain''s quarters.',
   'Sergeant Hale (survivor, hiding)', 'Frost-touched ghouls in the barracks.', 'Fourth sigil: ancient_sigils +1. watchtower_clues +1.')
) v(slug, gm_notes, npcs, enc, hooks)
join public.quest_templates t on t.slug = v.slug
on conflict (template_id) do nothing;

insert into public.quest_objectives (template_id, sort, description, is_secret)
select t.id, v.sort, v.descr, v.secret from (values
  ('the-missing-caravan', 1, 'Find the last known location of the caravan', false),
  ('the-missing-caravan', 2, 'Discover who took the caravan', false),
  ('the-missing-caravan', 3, 'Rescue Oswin Tallow from the toll house', true),
  ('whispers-beneath-stone', 1, 'Reach the lower galleries', false),
  ('whispers-beneath-stone', 2, 'Find the source of the voices', false),
  ('whispers-beneath-stone', 3, 'Recover the sigil from the deepest gallery', true),
  ('herbs-for-the-apothecary', 1, 'Gather ten moonpetal blossoms', false),
  ('ashes-of-the-watchtower', 1, 'Reach the Watchtower ruins', false),
  ('ashes-of-the-watchtower', 2, 'Learn what happened to the garrison', false),
  ('ashes-of-the-watchtower', 3, 'Find the gate beneath the tower', true)
) v(slug, sort, descr, secret)
join public.quest_templates t on t.slug = v.slug;

insert into public.quest_sessions (template_id, starts_at, ends_at, venue, table_label, capacity, price_cents)
select t.id, date_trunc('day', now()) + v.offs, date_trunc('day', now()) + v.offs + interval '3 hours',
       'Partner Game Store', v.tbl, v.cap, v.price
from (values
  ('the-missing-caravan',       interval '2 days 23 hours', 'Table 1', 5, 2000),
  ('ashes-of-the-watchtower',   interval '2 days 23 hours', 'Table 2', 5, 2000),
  ('herbs-for-the-apothecary',  interval '4 days 22 hours', 'Table 1', 4, 1000),
  ('whispers-beneath-stone',    interval '6 days 23 hours', 'Table 1', 6, 2000),
  ('the-missing-caravan',       interval '9 days 23 hours', 'Table 2', 5, 2000),
  ('ashes-of-the-watchtower',   interval '11 days 23 hours', 'Table 1', 5, 2000)
) v(slug, offs, tbl, cap, price)
join public.quest_templates t on t.slug = v.slug;

-- Community -------------------------------------------------------------------
insert into public.chat_channels (slug, name, description, staff_post_only, sort) values
  ('tavern', 'The Tavern', 'General chat for all adventurers', false, 1),
  ('announcements', 'Guild Announcements', 'Official word from the Guild Masters', true, 2),
  ('lore', 'Lore & Discoveries', 'Theories, discoveries and storytelling', false, 3),
  ('party-planning', 'Party Planning', 'Form groups for upcoming quests', false, 4),
  ('help-desk', 'Help Desk', 'Questions about rules, bookings or the site', false, 5)
on conflict (slug) do nothing;

-- Store -----------------------------------------------------------------------
insert into public.products (slug, name, description, category, price_cents, stock) values
  ('personalized-guild-card', 'Personalized Guild Card', 'Your adventurer name and member number on a premium printed guild card.', 'cards', 800, null),
  ('rank-upgrade-card', 'Rank Upgrade Card', 'An upgraded card design for your new guild rank. Requires the rank.', 'cards', 1000, null),
  ('guild-passport', 'Guild Passport', 'A booklet for session stamps, signatures and discovery marks.', 'collectibles', 1500, 50),
  ('guild-crest-pin', 'Guild Crest Enamel Pin', 'Antique gold enamel pin of the Everbound crest.', 'apparel', 1200, 40),
  ('class-dice-bag', 'Class Dice Bag', 'Embroidered drawstring dice bag. Choose your class at pickup.', 'gear', 1800, 25),
  ('battle-journal', 'Battle Journal', 'Gold-embossed journal for notes, maps and memories.', 'collectibles', 2200, 20),
  ('card-sleeve', 'Guild Card Sleeve', 'Protective sleeve for your guild card.', 'cards', 500, 100)
on conflict (slug) do nothing;

-- Founding batch of unclaimed physical cards (print from GM → Guild Cards).
insert into public.guild_cards (card_number, token, tier, batch_label)
select 'EVB-' || lpad(nextval('public.guild_card_number_seq')::text, 5, '0'), public.new_card_token(), 'founding', 'founding-batch'
from generate_series(1, 12);
