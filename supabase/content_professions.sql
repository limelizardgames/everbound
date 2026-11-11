-- =============================================================================
-- EVERBOUND — Starter professions, materials, recipes and Guild Errands.
-- Idempotent: safe to run more than once. Edit freely; GMs can add more from
-- Command Center → Errands & Crafting.
-- Table effects in item descriptions are suggestions for the Guild Master.
-- =============================================================================

insert into public.professions (key, name, description, icon, sort) values
  ('blacksmithing', 'Blacksmithing', 'Smelt ore into ingots and forge blades and shields at the Highmere anvils.', 'anvil', 1),
  ('alchemy', 'Alchemy', 'Brew draughts, tonics and elixirs from herbs and marsh water.', 'flask', 2),
  ('leatherworking', 'Leatherworking', 'Cure hides and stitch packs and armour for life on the road.', 'needle', 3),
  ('cooking', 'Cooking', 'Turn game and grain into meals that keep a party on its feet.', 'pot', 4),
  ('artificing', 'Artificing', 'Bind glimmer dust and crystal into charms, wards and lanterns.', 'gem', 5)
on conflict (key) do nothing;

insert into public.items (slug, name, description, item_type, rarity, is_tradeable) values
  -- gathered materials
  ('moonpetal', 'Moonpetal', 'Pale blossoms from the edge of Silverfen. An alchemist''s staple.', 'material', 'common', true),
  ('marsh-water', 'Marsh Water', 'Brackish, faintly glowing water from the Glimmering Marsh.', 'material', 'common', true),
  ('ember-root', 'Ember Root', 'A warm red root that grows in the Ashen Road''s burned soil.', 'material', 'uncommon', true),
  ('iron-ore', 'Iron Ore', 'Raw ore from the upper galleries of Whisperstone.', 'material', 'common', true),
  ('coal', 'Coal', 'Fuel for the forge.', 'material', 'common', true),
  ('ashwood', 'Ashwood Timber', 'Fire-hardened wood from the charred oaks of the Ashen Road.', 'material', 'common', true),
  ('rough-hide', 'Rough Hide', 'An untreated hide from the Emberfall hunting grounds.', 'material', 'common', true),
  ('wild-game', 'Wild Game', 'Fresh venison and fowl from around Emberfall.', 'material', 'common', true),
  ('emberfall-grain', 'Emberfall Grain', 'Golden grain from Emberfall''s famous harvest.', 'material', 'common', true),
  ('glimmer-dust', 'Glimmer Dust', 'Fine powder scraped from Silverfen crystals. Hums when shaken.', 'material', 'uncommon', true),
  ('frost-lichen', 'Frost Lichen', 'A blue lichen from the Frostmarch that stays cold even in a fire.', 'material', 'uncommon', true),
  -- intermediates
  ('iron-ingot', 'Iron Ingot', 'Smelted iron, ready for the anvil.', 'material', 'common', true),
  ('cured-leather', 'Cured Leather', 'Supple leather, ready for stitching.', 'material', 'common', true),
  -- crafted goods
  ('ember-tonic', 'Ember Tonic', 'Table effect: resist fire for one encounter.', 'consumable', 'uncommon', true),
  ('elixir-of-clear-sight', 'Elixir of Clear Sight', 'Table effect: see through one illusion or find one hidden thing.', 'consumable', 'rare', true),
  ('iron-dagger', 'Iron Dagger', 'A plain, honest blade.', 'gear', 'common', true),
  ('frostforged-blade', 'Frostforged Blade', 'Table effect: once per session, your strike chills the target and slows it.', 'gear', 'epic', true),
  ('travelers-pack', 'Traveler''s Pack', 'Table effect: carry one extra item into a session.', 'gear', 'uncommon', true),
  ('hunters-jerkin', 'Hunter''s Jerkin', 'Table effect: advantage on one stealth or tracking check per session.', 'gear', 'uncommon', true),
  ('trail-rations', 'Trail Rations', 'Table effect: recover a little HP during a short rest.', 'consumable', 'common', true),
  ('hearty-stew', 'Hearty Stew', 'Table effect: the whole party recovers a little HP during a rest.', 'consumable', 'common', true),
  ('ember-pepper-roast', 'Ember Pepper Roast', 'Table effect: courage — reroll one failed fear or morale check.', 'consumable', 'uncommon', true),
  ('glimmer-charm', 'Glimmer Charm', 'A small charm that glows softly near magic.', 'cosmetic', 'uncommon', true),
  ('resonance-ward', 'Resonance Ward', 'Table effect: once per session, turn aside one magical attack.', 'gear', 'rare', true)
on conflict (slug) do nothing;

insert into public.recipes (slug, name, profession_key, required_level, output_item_id, output_quantity, prof_xp, gold_cost)
select v.slug, v.name, v.prof, v.lvl, i.id, v.qty, v.xp, v.gold
from (values
  ('smelt-iron-ingot', 'Smelt Iron Ingot', 'blacksmithing', 1, 'iron-ingot', 1, 8, 0),
  ('forge-iron-dagger', 'Forge Iron Dagger', 'blacksmithing', 2, 'iron-dagger', 1, 20, 2),
  ('forge-ironwood-shield', 'Forge Ironwood Shield', 'blacksmithing', 4, 'ironwood-shield', 1, 45, 5),
  ('forge-frostforged-blade', 'Forge Frostforged Blade', 'blacksmithing', 6, 'frostforged-blade', 1, 90, 10),
  ('brew-healing-draught', 'Brew Healing Draught', 'alchemy', 1, 'healing-draught', 1, 10, 0),
  ('brew-ember-tonic', 'Brew Ember Tonic', 'alchemy', 2, 'ember-tonic', 1, 20, 1),
  ('brew-elixir-of-clear-sight', 'Brew Elixir of Clear Sight', 'alchemy', 4, 'elixir-of-clear-sight', 1, 45, 4),
  ('cure-leather', 'Cure Leather', 'leatherworking', 1, 'cured-leather', 1, 8, 0),
  ('stitch-travelers-pack', 'Stitch Traveler''s Pack', 'leatherworking', 2, 'travelers-pack', 1, 25, 2),
  ('stitch-hunters-jerkin', 'Stitch Hunter''s Jerkin', 'leatherworking', 4, 'hunters-jerkin', 1, 45, 4),
  ('cook-trail-rations', 'Cook Trail Rations', 'cooking', 1, 'trail-rations', 2, 10, 0),
  ('cook-hearty-stew', 'Cook Hearty Stew', 'cooking', 2, 'hearty-stew', 1, 20, 1),
  ('cook-ember-pepper-roast', 'Cook Ember Pepper Roast', 'cooking', 4, 'ember-pepper-roast', 1, 40, 2),
  ('craft-glimmer-charm', 'Craft Glimmer Charm', 'artificing', 1, 'glimmer-charm', 1, 12, 1),
  ('craft-lantern-of-clear-sight', 'Craft Lantern of Clear Sight', 'artificing', 3, 'lantern-of-clear-sight', 1, 35, 3),
  ('craft-resonance-ward', 'Craft Resonance Ward', 'artificing', 5, 'resonance-ward', 1, 70, 6)
) v(slug, name, prof, lvl, out_slug, qty, xp, gold)
join public.items i on i.slug = v.out_slug
on conflict (slug) do nothing;

insert into public.recipe_ingredients (recipe_id, item_id, quantity)
select r.id, i.id, v.qty
from (values
  ('smelt-iron-ingot', 'iron-ore', 2), ('smelt-iron-ingot', 'coal', 1),
  ('forge-iron-dagger', 'iron-ingot', 2), ('forge-iron-dagger', 'ashwood', 1),
  ('forge-ironwood-shield', 'iron-ingot', 3), ('forge-ironwood-shield', 'ashwood', 2),
  ('forge-frostforged-blade', 'iron-ingot', 4), ('forge-frostforged-blade', 'frost-lichen', 2), ('forge-frostforged-blade', 'glimmer-dust', 1),
  ('brew-healing-draught', 'moonpetal', 3), ('brew-healing-draught', 'marsh-water', 1),
  ('brew-ember-tonic', 'ember-root', 2), ('brew-ember-tonic', 'marsh-water', 1),
  ('brew-elixir-of-clear-sight', 'glimmer-dust', 2), ('brew-elixir-of-clear-sight', 'moonpetal', 2), ('brew-elixir-of-clear-sight', 'marsh-water', 1),
  ('cure-leather', 'rough-hide', 2), ('cure-leather', 'marsh-water', 1),
  ('stitch-travelers-pack', 'cured-leather', 3), ('stitch-travelers-pack', 'travelers-rope', 1),
  ('stitch-hunters-jerkin', 'cured-leather', 4), ('stitch-hunters-jerkin', 'ember-root', 1),
  ('cook-trail-rations', 'wild-game', 1), ('cook-trail-rations', 'emberfall-grain', 1),
  ('cook-hearty-stew', 'wild-game', 2), ('cook-hearty-stew', 'moonpetal', 1), ('cook-hearty-stew', 'emberfall-grain', 1),
  ('cook-ember-pepper-roast', 'wild-game', 2), ('cook-ember-pepper-roast', 'ember-root', 2),
  ('craft-glimmer-charm', 'glimmer-dust', 2), ('craft-glimmer-charm', 'iron-ingot', 1),
  ('craft-lantern-of-clear-sight', 'glimmer-dust', 2), ('craft-lantern-of-clear-sight', 'iron-ingot', 1), ('craft-lantern-of-clear-sight', 'ashwood', 1),
  ('craft-resonance-ward', 'silverfen-crystal-shard', 1), ('craft-resonance-ward', 'glimmer-dust', 3), ('craft-resonance-ward', 'iron-ingot', 2)
) v(recipe, item, qty)
join public.recipes r on r.slug = v.recipe
join public.items i on i.slug = v.item
on conflict do nothing;

insert into public.errands (slug, title, kind, description, location_id, min_rank, duration_minutes, gold_reward, sort)
select v.slug, v.title, v.kind, v.descr, l.id, v.rank, v.mins, v.gold, v.sort
from (values
  ('gather-moonpetal', 'Moonpetal Gathering', 'expedition', 'Mother Wren pays for moonpetal picked at dawn on the edge of Silverfen. Mind the bog lights.', 'silverfen', 'F', 120, 3, 1),
  ('mine-upper-galleries', 'Mine the Upper Galleries', 'expedition', 'The upper galleries of Whisperstone are safe enough by day. Bring back ore and coal for the forges.', 'whisperstone-mines', 'F', 240, 4, 2),
  ('emberfall-hunt', 'The Emberfall Hunt', 'expedition', 'Emberfall''s hunters need an extra bow. You keep a share of the game and hides.', 'emberfall', 'F', 180, 3, 3),
  ('ashen-timber', 'Timber on the Ashen Road', 'expedition', 'Fell fire-hardened ashwood along the road. Keep an eye out for bandits.', 'ashen-road', 'E', 240, 5, 4),
  ('crystal-survey', 'Crystal Survey at Silverfen', 'expedition', 'Help the Guild scholars catalogue the strange crystals beneath the marsh.', 'silverfen', 'E', 480, 6, 5),
  ('frostmarch-patrol', 'Frostmarch Patrol', 'expedition', 'Walk the Old King''s Road as far as the frost line and report back.', 'old-kings-road', 'D', 480, 8, 6),
  ('riddle-last-word', 'The Last Word', 'riddle', 'The Northern Watchtower sent one final message before it fell silent. What was that single word?', 'northern-watchtower', 'F', null, 5, 10),
  ('riddle-quartermaster', 'The Quartermaster''s Complaint', 'riddle', 'Quartermaster Bram cannot restock one kind of item until the Ashen Road is cleared. What is it?', 'highmere', 'F', null, 5, 11),
  ('riddle-lights', 'Lights Beneath the Water', 'riddle', 'In which village do fisherfolk speak of lights beneath the water on moonless nights?', 'silverfen', 'F', null, 5, 12),
  ('riddle-sigils', 'The Sealed Gate', 'riddle', 'How many ancient sigils were set to seal the Crimson Wyrm?', 'crimson-peaks', 'F', null, 5, 13)
) v(slug, title, kind, descr, loc, rank, mins, gold, sort)
left join public.locations l on l.slug = v.loc
on conflict (slug) do nothing;

insert into public.errand_rewards (errand_id, item_id, qty_min, qty_max, chance)
select e.id, i.id, v.mn, v.mx, v.ch
from (values
  ('gather-moonpetal', 'moonpetal', 2, 4, 1.0), ('gather-moonpetal', 'marsh-water', 1, 2, 1.0),
  ('mine-upper-galleries', 'iron-ore', 2, 4, 1.0), ('mine-upper-galleries', 'coal', 1, 3, 1.0),
  ('emberfall-hunt', 'wild-game', 2, 3, 1.0), ('emberfall-hunt', 'rough-hide', 1, 2, 1.0), ('emberfall-hunt', 'emberfall-grain', 1, 2, 0.8),
  ('ashen-timber', 'ashwood', 2, 3, 1.0), ('ashen-timber', 'ember-root', 1, 2, 0.6),
  ('crystal-survey', 'glimmer-dust', 1, 2, 1.0), ('crystal-survey', 'marsh-water', 1, 2, 1.0), ('crystal-survey', 'silverfen-crystal-shard', 1, 1, 0.1),
  ('frostmarch-patrol', 'frost-lichen', 1, 2, 1.0), ('frostmarch-patrol', 'iron-ore', 1, 2, 1.0),
  ('riddle-last-word', 'glimmer-dust', 2, 2, 1.0),
  ('riddle-quartermaster', 'iron-ore', 3, 3, 1.0),
  ('riddle-lights', 'moonpetal', 4, 4, 1.0),
  ('riddle-sigils', 'ember-root', 2, 2, 1.0)
) v(errand, item, mn, mx, ch)
join public.errands e on e.slug = v.errand
join public.items i on i.slug = v.item
on conflict (errand_id, item_id) do nothing;

insert into public.errand_secrets (errand_id, answers)
select e.id, v.answers
from (values
  ('riddle-last-word', array['Gate']),
  ('riddle-quartermaster', array['Ironwood shields', 'Ironwood shield', 'Shields', 'Shield']),
  ('riddle-lights', array['Silverfen']),
  ('riddle-sigils', array['Five', '5'])
) v(errand, answers)
join public.errands e on e.slug = v.errand
on conflict (errand_id) do nothing;
