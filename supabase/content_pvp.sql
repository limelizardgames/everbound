-- Allegiance & PvP content: a sample party-vs-party quest and a two-sided Crimson Wyrm raid.
-- Safe to run more than once.

update public.raids set two_sided = true where slug = 'the-crimson-wyrm';

insert into public.quest_templates (slug, title, quest_type, status, summary, description, rank_min, rank_max, difficulty,
  suggested_level, party_min, party_max, est_minutes, location_id, reward_preview, content_advisories, pvp_mode) values
  ('clash-at-the-ashen-crossroads', 'Clash at the Ashen Crossroads', 'party', 'published',
   'Two rival parties race to claim a lost sigil fragment on the Ashen Road.',
   E'A courier carrying a fragment of an ancient sigil was ambushed where the Ashen Road meets the old King''s Road. Both the Guild and the Ashen Covenant know where it fell.\n\nThis is a party-vs-party quest: two parties of opposing allegiances, one table, one Guild Master refereeing. Whoever holds the fragment at sundown moves the world toward their side.',
   'D', 'SS', 'hard', 3, 4, 8, 180, (select id from public.locations where slug = 'ashen-road'),
   '80 gold · 50 renown · sigil fragment for your side', array['Player-vs-player combat', 'Combat'], 'contested')
on conflict (slug) do nothing;

insert into public.quest_template_secrets (template_id, gm_notes, npcs, encounter_notes, consequence_hooks)
select id, 'Split the table into two parties by allegiance. The fragment is hidden in the overturned cart; both sides get one clue at the start.',
       'Wounded courier (neutral, will help whoever treats him kindly)',
       'Fog rolls in at the halfway mark: ranged attacks at disadvantage. Free Companies characters may switch sides once, if paid.',
       'Guild win: ancient_sigils +1. Covenant win: the fragment is lost and the Covenant gains a foothold on the Ashen Road.'
from public.quest_templates where slug = 'clash-at-the-ashen-crossroads'
on conflict (template_id) do nothing;

insert into public.quest_objectives (template_id, sort, description, is_secret)
select t.id, v.sort, v.descr, v.secret from (values
  (1, 'Reach the crossroads before the rival party', false),
  (2, 'Find the sigil fragment', false),
  (3, 'Hold the fragment at sundown', false),
  (4, 'Win over the wounded courier', true)
) v(sort, descr, secret)
join public.quest_templates t on t.slug = 'clash-at-the-ashen-crossroads'
where not exists (select 1 from public.quest_objectives o where o.template_id = t.id);

insert into public.quest_sessions (template_id, starts_at, ends_at, venue, table_label, capacity, price_cents)
select t.id, date_trunc('day', now()) + interval '13 days 23 hours', date_trunc('day', now()) + interval '14 days 2 hours',
       'Partner Game Store', 'Table 1', 8, 2000
from public.quest_templates t
where t.slug = 'clash-at-the-ashen-crossroads'
  and not exists (select 1 from public.quest_sessions s where s.template_id = t.id);
