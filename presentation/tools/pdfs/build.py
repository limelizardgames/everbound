import os, re, subprocess, json, sys
sys.path.insert(0, os.path.dirname(__file__))
from handwritten import *

ROOT = '/home/user/everbound/presentation'
SRC = ROOT + '/pdf_src'; OUT = ROOT + '/pdf'
os.makedirs(SRC, exist_ok=True); os.makedirs(OUT, exist_ok=True)
DOCS_DIR = ROOT + '/docs'
U = '/root/.claude/uploads/c293e46f-44a5-5f74-9d3d-2c190f7de212/'
DATE = 'November 23, 2026'
MIX = '<span class="badge approved">APPROVED</span> <span class="badge draft">DRAFT</span>'

def q(sql):
    r = subprocess.run(['psql', '-h', '/var/lib/postgresql/ebtest', '-p', '54329', '-U', 'postgres', '-d', 'lore', '-At', '-F', '\t', '-c', sql], capture_output=True, text=True, check=True)
    return [l.split('\t') for l in r.stdout.rstrip('\n').split('\n') if l]

def strip_h1(md):
    return re.sub(r'\A\s*# [^\n]*\n', '', md.lstrip(), count=1)

def cell(s): return s.replace('|', '/').replace('\n', ' ')

# ---------------------------------------------------------------- sources
comp = open(DOCS_DIR + '/Everbound_Complete_Character_Progression_Compendium_v1.3.md').read()
part1 = comp[comp.index('# Part I — Established class system'):comp.index('# Part II')]
part2 = comp[comp.index('# Part II'):comp.index('# Part III')]
atlas = part1[part1.index('## 11. Lineage × Class Specialization Affinities'):part1.index('## 12. Content inventory')]

# EB-02 classes: part I without atlas, with section badges
classes = part1.replace(atlas, '')
classes = re.sub(r'\A# Part I[^\n]*\n+# EVERBOUND\n## Adventurers Guild — Class & Specialization Compendium\n', '', classes)
classes = classes.replace('11. [Lineage × class specialization affinities](#11-lineage--class-specialization-affinities)\n', '')
classes = classes.replace('12. [Content inventory](#12-content-inventory)', '11. [Content inventory](#12-content-inventory)  \n*The lineage × class themes moved to EB-05.*')
SEC_STATUS = {'1': A, '2': A, '3': D, '4': D, '5': D, '6': '<span class="badge approved">APPROVED NAMES</span> <span class="badge draft">DRAFT RULES</span>', '7': D, '8': D, '9': D, '10': D, '12': A}
classes = re.sub(r'^## (\d+)\. (.+)$', lambda m: f"## {m.group(1)}. {m.group(2)} {SEC_STATUS.get(m.group(1), '')}", classes, flags=re.M)
classes = classes.replace('**Status:** Official class names and fixed starting-class roster', '**Status:** **Approved:** class names, the fixed six-class roster and the 18 specialization names. **Draft:** everything else, as marked per section. Official class names and fixed starting-class roster')

# EB-03 races + art
races = part2.replace('# Part II — Approved 60-lineage roster', '')
races = strip_h1(races)
ART = {'Human': 'human', 'Elf': 'elf', 'Dwarf': 'dwarf', 'Halfling': 'halfling', 'Orcborn': 'orcborn', 'Beastkin': 'beastkin', 'Drakari': 'drakari', 'Ashborn': 'ashborn', 'Sylph': 'sylph', 'Tidekin': 'tidekin', 'Skyborn': 'skyborn', 'Forgeborn': 'forgeborn'}
def add_art(m):
    race = m.group(2)
    return m.group(0)
parts = re.split(r'(?=^## \d+\. )', races, flags=re.M)
out = []
for p in parts:
    m = re.match(r'## (\d+)\. (\w+)\n', p)
    if m and m.group(2) in ART:
        art = f'<div class="art"><img src="../art/lineages-{ART[m.group(2)]}.jpg" alt="{m.group(2)} lineage art"><div class="cap">{m.group(2)} lineages — approved reference art (male and female)</div></div>'
        head, rest = p.split('\n', 1)
        rest = rest.lstrip('\n')
        para, _, tail = rest.partition('\n\n')
        p = f'<div class="pb"></div>\n\n{head}\n\n{para}\n\n{art}\n\n{tail}'
    out.append(p)
races = ''.join(out)
races = races.replace('**Status:** Working roster approved for future racial-skill-tree development', '**Status:** Approved roster and approved lineage art (Lineage Handbook)')

racial = strip_h1(open(DOCS_DIR + '/Everbound_Racial_Skill_Trees_v1.1.md').read())
syn = strip_h1(open(DOCS_DIR + '/Everbound_Lineage_Specialization_Synergy_Techniques_v1.1.md').read())
atlas_app = atlas.replace('## 11. Lineage × Class Specialization Affinities', '## Appendix A — Lineage × class themes (affinity atlas)')
syn = syn.rstrip() + '\n\n' + atlas_app
trials = strip_h1(open(U + '334a3bb7-Everbound_Guild_Trials_Proposal_v1.0.md').read())
rules = strip_h1(open(DOCS_DIR + '/Everbound_Core_Rules_v0.1.md').read())
platform = strip_h1(open('/home/user/everbound/docs/SETUP.md').read()) + '\n\n# Operations\n\n' + strip_h1(open('/home/user/everbound/docs/OPERATIONS.md').read())

# EB-09 world from seed database
loc = q("select name, region, status, summary, coalesce(nullif(lore,''),'') || case when threat is not null then ' Threat: '||threat else '' end from locations order by is_discovered desc, name")
flags = q("select label, value, case when is_public then 'Yes' else 'No' end from world_flags order by key")
quests = q("select title, quest_type, rank_min||'–'||rank_max, difficulty, summary || case when pvp_mode is not null then ' (PvP: '||pvp_mode||')' else '' end from quest_templates order by created_at")
chron = q("select category, title, replace(body, E'\\n', ' ') from chronicle_posts order by created_at")
ranks = q("select code, title, renown_required, card_design from rank_definitions order by sort")
prods = q("select name, price_cents from products order by price_cents")
world = WORLD.replace('{LOCATIONS}', '\n'.join('| **%s** | %s | %s | %s | %s |' % tuple(cell(c) for c in r) for r in loc))
world = world.replace('{FLAGS}', '\n'.join('| %s | %s | %s |' % tuple(r) for r in flags))
world = world.replace('{QUESTS}', '\n'.join('| **%s** | %s | %s | %s | %s |' % tuple(cell(c) for c in r) for r in quests))
world = world.replace('{CHRONICLE}', '\n\n'.join(f"**{r[1]}** *({r[0].replace('_', ' ')})* — {r[2]}" for r in chron))
world = world.replace('{RANKS}', '\n'.join(f'| **{r[0]}** | {r[1]} | {int(r[2]):,} | {r[3]} |' for r in ranks))
business = BUSINESS.replace('{PRODUCTS}', ', '.join(f"{n} ${int(c)/100:.0f}" for n, c in prods))

# ---------------------------------------------------------------- the set
DOCS = [
 dict(id='EB-00', slug='Index', title='Index and Status Guide', version='1.0', status='APPROVED', purpose='The list of documents, their status and how they relate.', related=[], body=None, land=False),
 dict(id='EB-01', slug='Core_Rules', title='Core Rules', version='0.1', status='DRAFT', purpose='Dice, attributes, skills, health, combat, levels and the session workflow.', related=['EB-02', 'EB-03', 'EB-04', 'EB-06'], body=rules, land=False),
 dict(id='EB-02', slug='Classes_and_Specializations', title='Classes and Specializations', version='1.1', status='MIXED', purpose='The six classes, their starting abilities, class trees and 18 specializations.', related=['EB-01', 'EB-05', 'EB-06'], body=classes, land=False),
 dict(id='EB-03', slug='Races_and_Lineages', title='Races and Lineages', version='1.0', status='APPROVED', purpose='The 12 races and 60 lineages, with the approved reference art.', related=['EB-01', 'EB-04', 'EB-05'], body=races, land=True),
 dict(id='EB-04', slug='Racial_Skill_Trees', title='Racial Skill Trees', version='1.1', status='DRAFT', purpose='Traits, two branches and a capstone for each of the 60 lineages.', related=['EB-01', 'EB-03', 'EB-05'], body=racial, land=True),
 dict(id='EB-05', slug='Lineage_Specialization_Synergies', title='Lineage × Specialization Synergies', version='1.1', status='DRAFT', purpose='360 optional synergy techniques and the lineage × class themes.', related=['EB-02', 'EB-03', 'EB-04'], body=syn, land=True),
 dict(id='EB-06', slug='Guild_Trials', title='Guild Trials', version='1.0', status='DRAFT', purpose='The 18 specialization trials, scoring and lineage variations.', related=['EB-01', 'EB-02', 'EB-03'], body=trials, land=False),
 dict(id='EB-07', slug='Allegiances_and_PvP', title='Allegiances and PvP', version='1.0', status='DRAFT', purpose='Factions, pledging, party-vs-party modes and two-sided raids.', related=['EB-01', 'EB-08', 'EB-09'], body=ALLEGIANCES, land=False),
 dict(id='EB-08', slug='Code_of_Conduct', title='Code of Conduct and the Ten Oaths', version='1.0', status='DRAFT', purpose='The player charter, safety tools, consequences and appeals.', related=['EB-07', 'EB-11'], body=CONDUCT, land=False),
 dict(id='EB-09', slug='World_and_Lore', title='World and Lore', version='1.0', status='DRAFT', purpose='Places, world counters, the Crimson Wyrm, starting quests, news and ranks.', related=['EB-07', 'EB-02'], body=world, land=False),
 dict(id='EB-10', slug='Business_and_Operations', title='Business and Operations Plan', version='1.0', status='DRAFT', purpose='Model, revenue, costs, operations, legal and the roadmap.', related=['EB-08', 'EB-11', 'EB-12'], body=business, land=False),
 dict(id='EB-11', slug='Platform_and_GM_Handbook', title='Platform and GM Handbook', version='1.0', status='APPROVED', purpose='Setting up and running the live website and the Command Center.', related=['EB-08', 'EB-10'], body=platform, land=False),
 dict(id='EB-12', slug='Decisions_Log', title='Decisions Log', version='1.0', status='APPROVED', purpose='Everything decided so far, and what is still open.', related=['EB-00'], body=decisions_md(), land=False),
]
BADGE = {'APPROVED': A, 'DRAFT': D, 'MIXED': MIX}
for d in DOCS:
    d['status_html'] = BADGE[d['status']]
DOCS[0]['body'] = index_md(DOCS)
TITLES = {d['id']: d['title'] for d in DOCS}

CSS = open(os.path.join(os.path.dirname(__file__), 'print.css')).read()
manifest = []
for d in DOCS:
    rel = ''.join(f"<li><b>{r}</b> {TITLES[r]}</li>" for r in d['related'])
    cover = f"""<div class="cover">
<div class="brand">EVERBOUND · The Living Adventurers Guild</div>
<div class="docid">{d['id']}</div>
<h1 class="title">{d['title']}</h1>
<div class="meta">Version {d['version']} · {DATE} · {d['status_html']}</div>
<p class="purpose">{d['purpose']}</p>
<div class="legend">{A} decided by the founders &nbsp; {D} proposed, expect changes after playtesting</div>
{f'<div class="related"><b>Related documents</b><ul>{rel}</ul></div>' if rel else ''}
</div>

"""
    md = cover + d['body']
    mdp = f"{SRC}/{d['id']}_{d['slug']}.md"
    open(mdp, 'w').write(md)
    html = subprocess.run(['pandoc', '-f', 'gfm+raw_html', '-t', 'html5', mdp], capture_output=True, text=True, check=True).stdout
    page = f"<!doctype html><html><head><meta charset='utf-8'><title>{d['id']} {d['title']}</title><style>{CSS}</style></head><body class='{'land' if d['land'] else 'port'}'>{html}</body></html>"
    hp = f"{SRC}/{d['id']}_{d['slug']}.html"
    open(hp, 'w').write(page)
    manifest.append(dict(html=hp, pdf=f"{OUT}/Everbound_{d['id']}_{d['slug']}.pdf", land=d['land'], footer=f"EVERBOUND · {d['id']} · {d['title']} · v{d['version']}", status=d['status']))
json.dump(manifest, open(SRC + '/manifest.json', 'w'), indent=1)
print('built', len(manifest))
