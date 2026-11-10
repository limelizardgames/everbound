-- SS rank: "Mythic", above S. Quests that were open to every rank stay open to SS.
insert into public.rank_definitions (code, title, renown_required, sort, card_design)
values ('SS', 'Mythic', 12000, 8, 'celestial')
on conflict (code) do nothing;
alter table public.quest_templates alter column rank_max set default 'SS';
update public.quest_templates set rank_max = 'SS' where rank_max = 'S';
