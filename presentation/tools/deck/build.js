const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/root/.claude/skills/synced/d2b622a7-a028-43fb-afa4-ea2c0738abf7_66cf5832-c301-4cc7-9397-d97b94e28119/pptx/scripts/apply_theme.js");

const OUT = process.argv[2] || "Everbound-Overview.pptx";
const THEME = {
  name: "Everbound",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "0B1020", lt1: "F2EBDA", dk2: "151C30", lt2: "AEB4C4",
    accent1: "D4AA5A", accent2: "4FD1E8", accent3: "9B6BFF", accent4: "E0533D", accent5: "5BC48A", accent6: "F0D08A",
    hlink: "4FD1E8", folHlink: "9B6BFF",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.author = "Lime Lizard Games";
pres.company = "Lime Lizard Games";
pres.title = "Everbound: The Living Adventurers Guild";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const TEXT = C.background1;      // parchment
const MUTED = C.background2;     // grey-blue
const GOLD = C.accent1, ARCANE = C.accent2, EPIC = C.accent3, EMBER = C.accent4, GREEN = C.accent5, GOLDL = C.accent6;
const PANEL = C.text2, NIGHT = C.text1;
const img = (n) => `img/${n}.png`;
const shot = (n) => `shots/${n}.png`;

// ---------- Layouts ----------
pres.defineSlideMaster({
  title: "EB_TITLE",
  background: { path: "img/bg-title.jpg" },
  objects: [
    { placeholder: { options: { name: "eyebrow", type: "body", x: 0.8, y: 1.55, w: 6.6, h: 0.4, fontSize: 13, bold: true, color: ARCANE, charSpacing: 5, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.0, w: 6.6, h: 1.25, fontSize: 60, bold: true, color: GOLDL, fontFace: THEME.headFontFace, charSpacing: 4, margin: 0, valign: "middle", align: "left" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 3.25, w: 6.6, h: 0.6, fontSize: 24, color: TEXT, fontFace: THEME.headFontFace, margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "EB_CONTENT",
  background: { path: "img/bg-content.jpg" },
  objects: [
    { text: { text: "EVERBOUND  ·  THE LIVING ADVENTURERS GUILD", options: { x: 0.6, y: 7.02, w: 6, h: 0.3, fontSize: 9, color: MUTED, charSpacing: 3, margin: 0 } } },
    { placeholder: { options: { name: "eyebrow", type: "body", x: 0.6, y: 0.42, w: 12.1, h: 0.35, fontSize: 12, bold: true, color: ARCANE, charSpacing: 4, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.78, w: 12.1, h: 0.85, fontSize: 34, bold: true, color: GOLDL, fontFace: THEME.headFontFace, margin: 0, valign: "middle", align: "left" }, text: "" } },
  ],
  slideNumber: { x: 12.1, y: 7.02, w: 0.6, h: 0.3, fontSize: 9, color: MUTED, align: "right", margin: 0 },
});

// ---------- Helpers ----------
let n = 0;
function content(section, eyebrow, title, notes) {
  const s = pres.addSlide({ masterName: "EB_CONTENT", sectionTitle: section });
  s.addText(eyebrow, { placeholder: "eyebrow" });
  s.addText(title, { placeholder: "title" });
  if (notes) s.addNotes(notes);
  return s;
}
function T(s, text, o) { s.addText(text, { isTextBox: true, margin: 0, color: TEXT, fontSize: 14, valign: "top", ...o }); }
function panel(s, x, y, w, h, o = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.06, objectName: o.name || `panel-${++n}`,
    fill: { color: o.fill || PANEL, transparency: o.transparency ?? 8 },
    line: { color: o.line || GOLD, width: o.lineWidth || 0.75, transparency: o.lineTransparency ?? 45 },
    shadow: { type: "outer", color: "000000", opacity: 0.35, blur: 8, offset: 3, angle: 90 },
  });
}
// Diamond badges are pre-rendered images (frame + icon in one picture) so every
// viewer places them exactly; native diamond shapes drift in some previewers.
const SCHEME_HEX = { text1: HEX.dk1, text2: HEX.dk2, background1: HEX.lt1, background2: HEX.lt2, accent1: HEX.accent1, accent2: HEX.accent2, accent3: HEX.accent3, accent4: HEX.accent4, accent5: HEX.accent5, accent6: HEX.accent6 };
const hexOf = (c) => SCHEME_HEX[c] || c;
const BADGES = new Map();
function diamond(s, cx, cy, d, icon, o = {}) {
  const line = hexOf(o.line || GOLD), fill = hexOf(o.fill || PANEL), lw = o.lineWidth || 1.5, scale = o.scale || (icon === "crest" ? 0.62 : 0.46);
  const key = `${icon || "none"}-${line}-${fill}-${lw}-${scale}-${d}`.replace(/[^A-Za-z0-9.-]/g, "_");
  BADGES.set(key, { icon, line, fill, lw, scale, d });
  const k = d * 1.2;
  s.addImage({ path: `img/badges/${key}.png`, x: cx - k / 2, y: cy - k / 2, w: k, h: k, altText: o.alt || "" });
}
async function renderBadges() {
  const sharp = require("sharp"), fs = require("fs");
  fs.mkdirSync("img/badges", { recursive: true });
  for (const [key, b] of BADGES) {
    const PX = 300, size = Math.round(b.d * 1.2 * PX), dpx = b.d * PX, c = size / 2;
    const sw = (b.lw / 72) * PX, r = dpx / 2 - sw / 2;
    const pts = `${c},${c - r} ${c + r},${c} ${c},${c + r} ${c - r},${c}`;
    const iconPx = dpx * b.scale;
    const iconB64 = b.icon ? fs.readFileSync(img(b.icon)).toString("base64") : null;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}">
      <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="${PX * 0.025}"/><feOffset dy="${PX * 0.02}"/><feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <polygon points="${pts}" fill="#${b.fill}" stroke="#${b.line}" stroke-width="${sw}" stroke-linejoin="miter" filter="url(#sh)"/>
      ${iconB64 ? `<image x="${c - iconPx / 2}" y="${c - iconPx / 2}" width="${iconPx}" height="${iconPx}" xlink:href="data:image/png;base64,${iconB64}"/>` : ""}
    </svg>`;
    await sharp(Buffer.from(svg)).png().toFile(`img/badges/${key}.png`);
  }
}
function screenshot(s, file, x, y, w, alt) {
  const h = (w * 9) / 16;
  s.addShape(pres.shapes.RECTANGLE, { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, objectName: `frame-${++n}`, fill: { color: PANEL }, line: { color: GOLD, width: 1, transparency: 30 }, shadow: { type: "outer", color: "000000", opacity: 0.5, blur: 14, offset: 5, angle: 90 } });
  s.addImage({ path: shot(file), x, y, w, h, altText: alt });
}
function chip(s, text, x, y, w, color) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.32, rectRadius: 0.05, objectName: `chip-${++n}`, fill: { color, transparency: 82 }, line: { color, width: 0.75 } });
  T(s, text, { x, y, w, h: 0.32, fontSize: 11, bold: true, color, align: "center", valign: "middle", charSpacing: 1 });
}
function arrow(s, x1, y1, x2, y2, color = GOLD, width = 1.5) {
  const dx = x2 - x1, dy = y2 - y1;
  const opt = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(dx) || 0.001, h: Math.abs(dy) || 0.001, objectName: `arrow-${++n}`, line: { color, width } };
  const flipH = dx !== 0 && dy !== 0 && (dx < 0) !== (dy < 0);
  if (flipH) opt.flipH = true;
  const forward = dy !== 0 ? dy > 0 : dx > 0;
  opt.line[forward ? "endArrowType" : "beginArrowType"] = "triangle";
  s.addShape(pres.shapes.LINE, opt);
}
function iconRow(s, x, y, w, icon, head, body, o = {}) {
  diamond(s, x + 0.36, y + 0.36, 0.72, icon);
  T(s, head, { x: x + 0.95, y: y, w: w - 0.95, h: 0.34, fontSize: o.headSize || 17, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
  T(s, body, { x: x + 0.95, y: y + 0.36, w: w - 0.95, h: o.bodyH || 0.62, fontSize: o.bodySize || 13.5, color: TEXT });
}

// =====================================================================
// 1. Title
pres.addSection({ title: "Introduction" });
{
  const s = pres.addSlide({ masterName: "EB_TITLE", sectionTitle: "Introduction" });
  s.addImage({ path: img("crest"), x: 0.8, y: 0.55, w: 0.9, h: 0.9, altText: "Everbound crest" });
  s.addText("LIME LIZARD GAMES PRESENTS", { placeholder: "eyebrow" });
  s.addText("EVERBOUND", { placeholder: "title" });
  s.addText("The Living Adventurers Guild", { placeholder: "body" });
  T(s, "A real-world tabletop adventure with a persistent online guild. Your character, your loot and your choices carry over from table to table, and the world remembers.", { x: 0.8, y: 4.1, w: 5.6, h: 1.1, fontSize: 16, color: MUTED, italic: true });
  T(s, "everbound.limelizardgames.com", { x: 0.8, y: 5.55, w: 5, h: 0.35, fontSize: 14, bold: true, color: ARCANE });
  screenshot(s, "home", 7.15, 2.15, 5.55, "The Everbound home page");
  s.addNotes("Everbound is a tabletop role-playing game that you play in person at a partner game store, connected to a website that acts as your adventurers guild. Today I'll walk through the whole idea from the moment a player gets their guild card to the moment they're fighting a world raid.");
}

// 2. What is it
{
  const s = content("Introduction", "THE CONCEPT", "What is Everbound?", "The one-sentence pitch on the left. The three pillars on the right are what make it different from a normal tabletop night: the game is real and social, but progress and story persist like an online game.");
  panel(s, 0.6, 1.95, 5.3, 4.75, { fill: PANEL });
  T(s, "A fantasy role-playing game you play in person at a game store,", { x: 1.0, y: 2.35, w: 4.6, h: 1.4, fontSize: 26, color: TEXT, fontFace: THEME.headFontFace });
  T(s, "connected to an online guild that remembers everything you do.", { x: 1.0, y: 3.75, w: 4.6, h: 1.4, fontSize: 26, color: GOLDL, fontFace: THEME.headFontFace, bold: true });
  T(s, "Think MMORPG progression meets an anime “transported to another world” adventure, played around a real table.", { x: 1.0, y: 5.35, w: 4.6, h: 1.0, fontSize: 14, color: MUTED, italic: true });
  iconRow(s, 6.5, 2.0, 6.2, "GiDiceTwentyFacesTwenty", "Real tables", "Hosted sessions with a Guild Master at a partner store. Dice, friends and stories, face to face.", { bodyH: 0.75 });
  iconRow(s, 6.5, 3.6, 6.2, "GiWorld", "A living world", "Every table plays in the same world. Choices change the map, players pick sides, and raids awaken for everyone.", { bodyH: 0.75 });
  iconRow(s, 6.5, 5.2, 6.2, "GiCardPlay", "Your guild, online", "A physical guild card links to your adventurer: level, gold, loot, rank, journal and guild chat.", { bodyH: 0.75 });
}

// 3. Who it's for
{
  const s = content("Introduction", "THREE AUDIENCES", "Built for players, stores and Guild Masters", "Everbound has to work for three groups at once. Players get a reason to come back every week; the store gets regular foot traffic; the Guild Masters get tools that remove the paperwork.");
  const cols = [
    ["GiThreeFriends", "Players", "Ages 13 and up, brand-new or veteran", ["Progress that never resets", "Play when it suits you: book any session", "Something to do between sessions", "A real card to carry and show off"]],
    ["GiShop", "Partner store", "Hosts the Guild's tables", ["Regular, repeat weekly visits", "Guild Store merchandise sales", "A community anchored at the store", "No software to run: it's all online"]],
    ["GiSpellBook", "Guild Masters", "Run the sessions", ["Roster, HP and notes on a tablet", "Rewards recorded in one place", "World and raids update automatically", "Moderation and safety tools built in"]],
  ];
  cols.forEach(([icon, head, sub, items], i) => {
    const x = 0.6 + i * 4.1, w = 3.85;
    panel(s, x, 1.95, w, 4.75);
    diamond(s, x + w / 2, 2.7, 0.95, icon);
    T(s, head, { x, y: 3.3, w, h: 0.45, fontSize: 22, bold: true, color: GOLDL, align: "center", fontFace: THEME.headFontFace });
    T(s, sub, { x, y: 3.75, w, h: 0.3, fontSize: 12, color: ARCANE, align: "center" });
    T(s, items.map((t, k) => ({ text: t, options: { bullet: { code: "25C6" }, breakLine: k < items.length - 1 } })), { x: x + 0.35, y: 4.25, w: w - 0.6, h: 2.2, fontSize: 14, paraSpaceAfter: 8 });
  });
}

// 4. Journey overview
{
  const s = content("Introduction", "THE ADVENTURER'S JOURNEY", "From first scan to legend, in eight steps", "This is the roadmap for the rest of the presentation. Steps 1 to 7 follow a player from their first visit, and step 8 is what keeps them engaged between visits. Each step gets its own slide.");
  const steps = [
    ["GiCardPlay", "Get your guild card", "Scan the QR to create your account"],
    ["GiPerson", "Create your adventurer", "Pick a race and a class"],
    ["GiScrollUnfurled", "Book a quest", "Reserve a seat at the store"],
    ["GiDiceTwentyFacesTwenty", "Play at the table", "About 3 hours with a Guild Master"],
    ["GiTwoCoins", "Earn rewards", "XP, gold, renown and loot"],
    ["GiStairsGoal", "Rank up", "Climb from Rank F to SS"],
    ["GiTreasureMap", "Shape the world", "Choose sides, change the map"],
    ["GiCauldron", "Between sessions", "Errands, crafting, trading, chat"],
  ];
  const xs = [1.55, 4.65, 7.75, 10.85];
  [0, 1].forEach((row) => {
    const y = row === 0 ? 2.65 : 5.0;
    // connector line behind the row
    s.addShape(pres.shapes.LINE, { x: xs[0], y, w: xs[3] - xs[0], h: 0, objectName: `path-${row}`, line: { color: GOLD, width: 1.25, dashType: "dash", transparency: 30 } });
    for (let i = 0; i < 4; i++) {
      const k = row * 4 + i, [icon, head, body] = steps[k];
      diamond(s, xs[i], y, 1.0, icon);
      T(s, `${k + 1}`, { x: xs[i] - 0.82, y: y - 0.62, w: 0.4, h: 0.4, fontSize: 18, bold: true, color: ARCANE, fontFace: THEME.headFontFace, align: "center" });
      T(s, head, { x: xs[i] - 1.45, y: y + 0.6, w: 2.9, h: 0.38, fontSize: 17, bold: true, color: GOLDL, align: "center", fontFace: THEME.headFontFace });
      T(s, body, { x: xs[i] - 1.45, y: y + 0.98, w: 2.9, h: 0.32, fontSize: 13, color: MUTED, align: "center" });
    }
  });
}

// =====================================================================
pres.addSection({ title: "The Journey" });
// 5. Step 1 guild card
{
  const s = content("The Journey", "STEP 1 OF 8  ·  THE GUILD CARD", "Your guild card is your key", "There is no register page. The physical card is the only way to create an account, which means every player has met us in person at least once. Once the card is claimed it is locked to that account forever. Scanning it later just shows that adventurer's public profile, so a lost card can't be used to get into someone's account.");
  // card illustration (CR80 proportions)
  const cx = 0.75, cy = 2.2, cw = 5.4, ch = 3.4;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: cy, w: cw, h: ch, rectRadius: 0.22, objectName: "card-body", fill: { color: "1A2445" }, line: { color: GOLD, width: 2.5 }, shadow: { type: "outer", color: "000000", opacity: 0.6, blur: 18, offset: 8, angle: 90 } });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx + 0.12, y: cy + 0.12, w: cw - 0.24, h: ch - 0.24, rectRadius: 0.16, objectName: "card-inner", fill: { color: "1A2445", transparency: 100 }, line: { color: GOLD, width: 0.75, transparency: 50 } });
  s.addImage({ path: img("crest"), x: cx + 0.35, y: cy + 0.32, w: 0.75, h: 0.75, altText: "Guild crest" });
  T(s, "EVERBOUND", { x: cx + 1.2, y: cy + 0.36, w: 3, h: 0.4, fontSize: 20, bold: true, color: GOLDL, fontFace: THEME.headFontFace, charSpacing: 4 });
  T(s, "ADVENTURERS GUILD · FOUNDING MEMBER", { x: cx + 1.2, y: cy + 0.76, w: 4.0, h: 0.25, fontSize: 9, color: ARCANE, charSpacing: 1, bold: true });
  T(s, "Aria Vale", { x: cx + 0.4, y: cy + 1.5, w: 3, h: 0.5, fontSize: 24, bold: true, color: TEXT, fontFace: THEME.headFontFace });
  T(s, "Elf Ranger  ·  Rank F Initiate", { x: cx + 0.4, y: cy + 2.0, w: 3.2, h: 0.3, fontSize: 13, color: MUTED });
  T(s, "EVB-00001", { x: cx + 0.4, y: cy + 2.65, w: 2.5, h: 0.35, fontSize: 16, bold: true, color: GOLD, charSpacing: 3, fontFace: "Courier New" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx + 3.65, y: cy + 1.35, w: 1.45, h: 1.45, rectRadius: 0.08, objectName: "qr-plate", fill: { color: "F2EBDA" }, line: { color: GOLD, width: 1 } });
  s.addImage({ path: img("qr"), x: cx + 3.72, y: cy + 1.42, w: 1.31, h: 1.31, altText: "QR code" });
  T(s, "SCAN ME", { x: cx + 3.65, y: cy + 2.88, w: 1.45, h: 0.25, fontSize: 9, bold: true, color: GOLDL, align: "center", charSpacing: 3 });
  T(s, "Illustration. The printed card is credit-card size (CR80).", { x: cx, y: cy + ch + 0.2, w: cw, h: 0.3, fontSize: 11, color: MUTED, italic: true, align: "center" });

  const flow = [
    ["GiSmartphone", "Scan", "Every player receives a physical card with a unique QR code. Any phone camera opens it."],
    ["GiQuillInk", "Create your account", "The card's page is the sign-up form. Ages 13+, with guardian permission under 18."],
    ["GiKeyLock", "Locked to you", "Once claimed, the card belongs to that account for good. Later scans show a public profile only."],
  ];
  flow.forEach(([icon, head, body], i) => iconRow(s, 7.0, 2.05 + i * 1.5, 5.7, icon, head, body, { bodyH: 0.85 }));
  arrow(s, 7.36, 2.85, 7.36, 3.15); arrow(s, 7.36, 4.35, 7.36, 4.65);
}

// 6. Step 2 create adventurer
{
  const s = content("The Journey", "STEP 2 OF 8  ·  CREATE YOUR ADVENTURER", "Choose who you will become", "Character creation is deliberately light: a race, a class and a few attribute points. New players don't need to know the rules; the Guild Master teaches at the table. The ruleset itself is configurable, so the final game system can be swapped in without rebuilding the site.");
  panel(s, 0.6, 1.95, 4.6, 4.75);
  T(s, "Straight after claiming the card, the player builds their adventurer.", { x: 0.95, y: 2.25, w: 3.9, h: 0.9, fontSize: 17, color: TEXT, fontFace: THEME.headFontFace });
  const pts = [["Race & class", "12 races, 6 classes, a few attribute points"], ["Portrait", "upload your own art"], ["Character sheet", "level, HP and gear, always on your phone"], ["New to RPGs?", "the Guild Master teaches the rest"]];
  pts.forEach(([h, b], i) => {
    T(s, [{ text: h, options: { bold: true, color: GOLDL, breakLine: true } }, { text: b, options: { color: MUTED, fontSize: 13 } }], { x: 0.95, y: 3.3 + i * 0.82, w: 3.9, h: 0.72, fontSize: 15 });
  });
  const classes = [["GiCrossedSwords", "Warrior", "Frontline defender"], ["GiBowArrow", "Ranger", "Scout and marksman"], ["GiCloakDagger", "Rogue", "Infiltrator and trickster"], ["GiHolySymbol", "Cleric", "Healer and protector"], ["GiWizardStaff", "Mage", "Wielder of arcane power"], ["GiLyre", "Bard", "Inspiration and lore"]];
  classes.forEach(([icon, name, role], i) => {
    const col = i % 3, row = Math.floor(i / 3), x = 5.6 + col * 2.4, y = 1.95 + row * 2.42, w = 2.2, h = 2.25;
    panel(s, x, y, w, h);
    diamond(s, x + w / 2, y + 0.75, 0.95, icon);
    T(s, name, { x, y: y + 1.35, w, h: 0.4, fontSize: 19, bold: true, color: GOLDL, align: "center", fontFace: THEME.headFontFace });
    T(s, role, { x: x + 0.1, y: y + 1.75, w: w - 0.2, h: 0.4, fontSize: 12.5, color: MUTED, align: "center" });
  });
}

// 6b/6c. Races
{
  const RACES = [
    ["GiPerson", "Human", "Adaptable and ambitious", "Every height, build, skin tone and hair colour. The most varied people in Everbound.", "ANY"],
    ["GiElfEar", "Elf", "Ageless and keen-eyed", "Tall and slender, long pointed ears, ageless faces. A faint glowing ring in the eyes; hair silver, gold or forest-toned.", "GRACE"],
    ["GiDwarfFace", "Dwarf", "Stout and stone-wise", "4 to 4½ ft, broad and dense. Braids and beards threaded with metal beads, rune tattoos, stone-grey to ruddy skin.", "MIGHT"],
    ["GiFootprint", "Halfling", "Small, quick and lucky", "About 3 ft, round friendly faces, curly hair and tough bare feet. They always look younger than they are.", "GRACE"],
    ["GiOrcHead", "Orcborn", "Fierce, loyal, enduring", "Tall and powerfully built. Green, grey or ash skin, lower tusks, heavy brows and clan tattoos or scars.", "MIGHT"],
    ["GiFoxHead", "Beastkin", "Wild instincts, sharp senses", "Human-like, with animal ears, tail and eyes. Pick a lineage: wolf, fox, cat, rabbit or bear.", "GRACE"],
    ["GiSpikedDragonHead", "Drakari", "Dragon blood runs hot", "Scales on cheeks and forearms (or all over), swept-back horns, slit pupils. Scale colour shows their elemental line.", "MIGHT"],
    ["GiDevilMask", "Ashborn", "Touched by old fire", "Horns, a slender tail and ember-bright eyes. Skin from ash-grey to deep crimson; a wisp of smoke when angry.", "SPIRIT"],
    ["GiFairyWings", "Sylph", "Children of the old magic", "Light and slight, with gossamer wings (they glide, not fly), shimmering freckles and hair in impossible colours.", "SPIRIT"],
    ["GiMermaid", "Tidekin", "Born of river and sea", "Gill slits along the neck, webbed fingers, fin-like ears and iridescent scale patches. Hair like kelp or sea-foam.", "SPIRIT"],
    ["GiEagleHead", "Skyborn", "Wind-riders of the peaks", "Feathered crests instead of hair, sharp bird-like eyes and folded wings. Lineages: hawk, owl or raven.", "WITS"],
    ["GiGolemHead", "Forgeborn", "A soul in a crafted body", "Plates of stone, metal or carved wood joined by glowing rune-lines, with a core gem in the chest.", "WITS"],
  ];
  const LEAN = { ANY: TEXT, GRACE: GREEN, MIGHT: EMBER, SPIRIT: EPIC, WITS: ARCANE };
  const pages = [
    ["The familiar peoples", RACES.slice(0, 6), "Humans, elves, dwarves and halflings are the classic fantasy peoples, joined by Orcborn and Beastkin. Beastkin are a staple of isekai stories: pick a lineage like wolf, fox, cat, rabbit or bear. Each race has general looks that every player follows, but the details are theirs: colours, height within the range, markings and style."],
    ["The touched and the strange", RACES.slice(6), "These six give the world its anime-isekai flavour: dragon-blooded Drakari, fire-touched Ashborn, winged Sylphs, sea-born Tidekin, bird-like Skyborn and Forgeborn, a soul reborn in a crafted body. Mixed heritage is welcome: pick a main race and blend in one or two features from another, like a half-elf. The attribute tags are suggestions until the final ruleset is chosen."],
  ];
  pages.forEach(([title, list, notes], pi) => {
    const s = content("The Journey", `STEP 2 OF 8  ·  RACES  ·  ${pi + 1} OF 2`, `Races of Everbound: ${title}`, notes);
    T(s, "Draft selection · names and details can change", { x: 8.7, y: 1.6, w: 4.0, h: 0.28, fontSize: 10, color: MUTED, italic: true, align: "right" });
    list.forEach(([icon, name, tag, look, lean], i) => {
      const col = i % 3, row = Math.floor(i / 3), x = 0.6 + col * 4.1, y = 1.95 + row * 2.15, w = 3.85, h = 1.95;
      panel(s, x, y, w, h);
      diamond(s, x + 0.58, y + 0.62, 0.78, icon);
      T(s, lean, { x: x + 0.08, y: y + 1.17, w: 1.0, h: 0.25, fontSize: 9.5, bold: true, color: LEAN[lean], align: "center", charSpacing: 2 });
      T(s, name, { x: x + 1.12, y: y + 0.15, w: w - 1.25, h: 0.36, fontSize: 18, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
      T(s, tag, { x: x + 1.12, y: y + 0.5, w: w - 1.25, h: 0.25, fontSize: 11, italic: true, color: ARCANE });
      T(s, look, { x: x + 1.12, y: y + 0.8, w: w - 1.3, h: 1.05, fontSize: 12, color: TEXT });
    });
    panel(s, 0.6, 6.28, 12.1, 0.55, { transparency: 35 });
    T(s, pi === 0
      ? [{ text: "Every race is customizable: ", options: { bold: true, color: GOLDL } }, { text: "skin, hair and eye colour, height within the range, markings, style and pronouns.", options: { color: TEXT } }]
      : [{ text: "Mixed heritage welcome: ", options: { bold: true, color: GOLDL } }, { text: "pick a main race and blend in one or two features from another, like a half-elf.  Tag = the attribute it leans toward.", options: { color: TEXT } }],
      { x: 0.85, y: 6.28, w: 11.7, h: 0.55, fontSize: 13, valign: "middle" });
  });
}

// 7. Step 3 book a quest
{
  const s = content("The Journey", "STEP 3 OF 8  ·  BOOK A QUEST", "Pick a quest from the Quest Board", "The Quest Board shows every adventure on offer. Each quest has a minimum rank, a difficulty, a party size and content advisories so players and parents know what to expect. Players reserve a seat; if the table is full they join the waitlist and are promoted automatically when someone cancels.");
  screenshot(s, "quests", 0.66, 2.05, 6.9, "The Quest Board page");
  const rows = [
    ["GiScrollUnfurled", "Six kinds of quest", "Standard, Story, Contract, Party, Elite and World quests."],
    ["GiShield", "Right for your level", "Rank and age ratings decide who can book each quest."],
    ["GiCalendar", "Reserve a seat", "Pay online or at the store. Full table? Join the waitlist."],
    ["GiSandsOfTime", "On your schedule", "Play whenever there's a session; the story waits for you."],
  ];
  rows.forEach(([icon, h, b], i) => iconRow(s, 7.95, 1.95 + i * 1.2, 4.8, icon, h, b, { bodySize: 13, bodyH: 0.62 }));
}

// 8. Step 4 play
{
  const s = content("The Journey", "STEP 4 OF 8  ·  PLAY AT THE TABLE", "An evening of adventure at the store", "Sessions are about three hours, three to six players, one Guild Master. The Guild Master runs the session from a tablet: the roster shows each adventurer's level, rank and HP, and HP and conditions are updated live. Every session starts with a short session zero and uses the X-card safety tool.");
  const stats = [["~3", "HOURS", "per session"], ["3–6", "PLAYERS", "per table"], ["2", "TABLES", "can run at once"]];
  stats.forEach(([big, lab, sub], i) => {
    const x = 0.6 + i * 4.1, w = 3.85;
    panel(s, x, 1.95, w, 1.85);
    T(s, big, { x, y: 2.05, w, h: 0.95, fontSize: 54, bold: true, color: GOLDL, align: "center", fontFace: THEME.headFontFace, valign: "middle" });
    T(s, lab, { x, y: 3.0, w, h: 0.3, fontSize: 13, bold: true, color: ARCANE, align: "center", charSpacing: 4 });
    T(s, sub, { x, y: 3.3, w, h: 0.3, fontSize: 13, color: MUTED, align: "center" });
  });
  panel(s, 0.6, 4.1, 6.0, 2.6);
  diamond(s, 1.2, 4.75, 0.8, "GiSmartphone");
  T(s, "The Guild Master's tablet", { x: 1.8, y: 4.55, w: 4.6, h: 0.4, fontSize: 19, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
  T(s, ["Live roster: level, rank, seat and payment", "Update HP and conditions as the fight unfolds", "Private GM notes and each player's pack of items"].map((t, k, a) => ({ text: t, options: { bullet: { code: "25C6" }, breakLine: k < a.length - 1 } })), { x: 1.0, y: 5.3, w: 5.3, h: 1.3, fontSize: 14, paraSpaceAfter: 6 });
  panel(s, 6.9, 4.1, 5.8, 2.6);
  diamond(s, 7.5, 4.75, 0.8, "GiCheckedShield");
  T(s, "Safety at every table", { x: 8.1, y: 4.55, w: 4.4, h: 0.4, fontSize: 19, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
  T(s, ["Session zero: themes and comfort levels first", "Content advisories shown on every quest", "The X-card: anyone can skip a scene, no questions"].map((t, k, a) => ({ text: t, options: { bullet: { code: "25C6" }, breakLine: k < a.length - 1 } })), { x: 7.3, y: 5.3, w: 5.2, h: 1.3, fontSize: 14, paraSpaceAfter: 6 });
}

// 9. Step 5 rewards
{
  const s = content("The Journey", "STEP 5 OF 8  ·  EARN REWARDS", "Everything you earn is yours for good", "After the session, the Guild Master records what happened. A second Guild Master approves it, and only then is it written to the player's permanent record. Ledgers are append-only: nothing can be paid twice and mistakes are corrected with a new entry, so there's always a full history.");
  const tiles = [
    ["GiStarsStack", "XP", "Levels up your character", ARCANE],
    ["GiTwoCoins", "Gold", "Spent at the Arcane Exchange and the Auction Hall", GOLDL],
    ["GiLaurelsTrophy", "Renown", "Raises your guild rank", EPIC],
    ["GiCrown", "Loot & achievements", "Gear, potions, trophies and titles", GREEN],
  ];
  tiles.forEach(([icon, h, b, col], i) => {
    const x = 0.6 + i * 3.08, w = 2.85;
    panel(s, x, 1.95, w, 2.6, { line: col, lineTransparency: 20 });
    diamond(s, x + w / 2, 2.7, 0.9, icon, { line: col });
    T(s, h, { x, y: 3.25, w, h: 0.42, fontSize: 21, bold: true, color: col, align: "center", fontFace: THEME.headFontFace });
    T(s, b, { x: x + 0.2, y: 3.7, w: w - 0.4, h: 0.7, fontSize: 13.5, color: TEXT, align: "center" });
  });
  T(s, "HOW REWARDS ARE RECORDED", { x: 0.6, y: 4.9, w: 6, h: 0.3, fontSize: 12, bold: true, color: ARCANE, charSpacing: 3 });
  const flow = [["GiQuillInk", "GM records results"], ["GiCheckedShield", "A second GM approves"], ["GiOpenBook", "Written to the permanent ledger"], ["GiFlyingFlag", "World and ranks update"]];
  flow.forEach(([icon, label], i) => {
    const x = 0.6 + i * 3.08, w = 2.85;
    panel(s, x, 5.3, w, 1.0, { transparency: 30 });
    diamond(s, x + 0.5, 5.8, 0.62, icon);
    T(s, label, { x: x + 0.95, y: 5.3, w: w - 1.05, h: 1.0, fontSize: 14, bold: true, color: TEXT, valign: "middle" });
    if (i < 3) arrow(s, x + w + 0.02, 5.8, x + 3.06, 5.8, GOLD, 1.5);
  });
  T(s, "No one can approve their own rewards, and nothing can be paid twice.", { x: 0.6, y: 6.45, w: 12, h: 0.3, fontSize: 12, color: MUTED, italic: true });
}

// 10. Step 6 rank up
{
  const s = content("The Journey", "STEP 6 OF 8  ·  RANK UP", "Climb the guild ranks from F to SS", "Renown is earned through guild achievements and raises your rank. Each rank tier has its own card design, from iron up to celestial, and players can buy the upgraded physical card in the Guild Store. Higher ranks unlock harder quests, and Rank E unlocks the Auction Hall.");
  const ranks = [
    ["F", "Initiate", "0", "8A8F99"], ["E", "Explorer", "100", "B87333"], ["D", "Pathfinder", "300", "B87333"], ["C", "Vanguard", "750", "C0C7D0"],
    ["B", "Champion", "1,500", "C0C7D0"], ["A", "Hero", "3,000", "D4AA5A"], ["S", "Legend", "6,000", "4FD1E8"], ["SS", "Mythic", "12,000", "9B6BFF"],
  ];
  const hs = [0.45, 0.8, 1.15, 1.5, 1.9, 2.35, 2.85, 3.45], bottom = 6.35;
  ranks.forEach(([code, title, renown, col], i) => {
    const x = 0.6 + i * 1.1, w = 0.95, h = hs[i], y = bottom - h;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, objectName: `rank-${code}`, fill: { color: col, transparency: 15 }, line: { color: col, width: 1 } });
    T(s, code, { x: x - 0.1, y: y - 0.78, w: w + 0.2, h: 0.45, fontSize: 24, bold: true, color: col, align: "center", fontFace: THEME.headFontFace });
    T(s, title, { x: x - 0.1, y: y - 0.34, w: w + 0.2, h: 0.28, fontSize: 11, color: TEXT, align: "center" });
    T(s, renown, { x: x - 0.1, y: bottom + 0.08, w: w + 0.2, h: 0.26, fontSize: 11, color: MUTED, align: "center" });
  });
  T(s, "Renown needed", { x: 0.6, y: 6.62, w: 3, h: 0.26, fontSize: 10, color: MUTED, italic: true });
  const notes = [
    ["GiGavel", "Rank E", "unlocks the Auction Hall"],
    ["GiDragonHead", "Higher ranks", "unlock harder quests and elite contracts"],
    ["GiCardPlay", "Every tier", "has its own card: iron, bronze, silver, gold, mythril, celestial"],
  ];
  notes.forEach(([icon, h, b], i) => {
    panel(s, 9.65, 1.95 + i * 1.6, 3.05, 1.45);
    diamond(s, 10.15, 2.45 + i * 1.6, 0.62, icon);
    T(s, h, { x: 10.6, y: 2.1 + i * 1.6, w: 2.0, h: 0.35, fontSize: 16, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
    T(s, b, { x: 10.6, y: 2.45 + i * 1.6, w: 2.0, h: 0.9, fontSize: 12.5, color: TEXT });
  });
}

// 11. Step 7 shape the world
{
  const s = content("The Journey", "STEP 7 OF 8  ·  SHAPE THE WORLD", "Every table changes the same world", "This is the heart of Everbound. Every table plays in one shared world. When a party clears the bandits from the Ashen Road or recovers an ancient sigil, the world state changes for everyone: the map updates, the Chronicle reports it, and enough sigils awaken a raid.");
  screenshot(s, "world", 0.66, 2.05, 6.9, "The World Atlas map");
  const chain = [
    ["GiSwordsEmblem", "Parties make choices", "Save the caravan, or not. Defend the watchtower, or flee."],
    ["GiCrystalBall", "The world keeps score", "Shared counters, like ancient sigils, rise across all tables."],
    ["GiTreasureMap", "The map changes", "Places become threatened, besieged, destroyed or rebuilt."],
    ["GiOpenBook", "The Chronicle reports it", "The Guild's newspaper tells everyone what happened."],
  ];
  chain.forEach(([icon, h, b], i) => {
    iconRow(s, 7.95, 1.95 + i * 1.2, 4.8, icon, h, b, { bodySize: 13, bodyH: 0.62 });
    if (i < 3) arrow(s, 8.31, 2.72 + i * 1.2, 8.31, 2.92 + i * 1.2);
  });
}

// 12. World raids
{
  const s = content("The Journey", "STEP 7 OF 8  ·  WORLD EVENTS", "Raids: the world's biggest battles", "Raids are the big shared events. A raid sleeps until the world reaches a condition. For example, the Crimson Wyrm wakes when the Guild has recovered five ancient sigils. Right now the world sits at three of five. When it unlocks, every player is notified, a proclamation goes out, and the Guild Masters open registration.");
  const states = ["Dormant", "Foreshadowed", "Unlocked", "Registration", "Active", "Resolved"];
  states.forEach((st, i) => {
    const y = 1.95 + i * 0.8, on = i === 1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 2.7, h: 0.56, rectRadius: 0.05, objectName: `raid-${st}`, fill: { color: on ? EMBER : PANEL, transparency: on ? 70 : 10 }, line: { color: on ? EMBER : GOLD, width: on ? 1.5 : 0.75, transparency: on ? 0 : 45 } });
    T(s, st, { x: 0.6, y, w: 2.7, h: 0.56, fontSize: 15, bold: true, color: on ? TEXT : GOLDL, align: "center", valign: "middle", fontFace: THEME.headFontFace });
    if (i < 5) arrow(s, 1.95, y + 0.58, 1.95, y + 0.78, GOLD, 1.25);
    if (on) T(s, "◂ NOW", { x: 3.35, y, w: 0.6, h: 0.56, fontSize: 10, bold: true, color: EMBER, valign: "middle" });
  });
  diamond(s, 4.6, 2.45, 0.95, "GiDragonHead", { line: EMBER });
  T(s, "The Crimson Wyrm", { x: 3.95, y: 3.1, w: 2.8, h: 0.45, fontSize: 21, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
  T(s, "Awakens when the Guild recovers 5 ancient sigils.", { x: 3.95, y: 3.55, w: 2.75, h: 0.7, fontSize: 14, color: TEXT });
  T(s, "3 / 5", { x: 3.95, y: 4.35, w: 2.8, h: 0.75, fontSize: 44, bold: true, color: ARCANE, fontFace: THEME.headFontFace });
  T(s, "SIGILS RECOVERED", { x: 3.95, y: 5.1, w: 2.8, h: 0.3, fontSize: 11, bold: true, color: MUTED, charSpacing: 3 });
  T(s, "Raids run in scheduled windows across several tables, with alternates, so nobody has to drop everything.", { x: 3.95, y: 5.55, w: 2.75, h: 1.1, fontSize: 12.5, color: MUTED, italic: true });
  screenshot(s, "raids", 6.75, 2.05, 5.95, "The Raid Center page");
}

// 12b. Allegiances
{
  const s = content("The Journey", "STEP 7 OF 8  ·  ALLEGIANCES", "Choose a side in the world's conflicts", "As the world heats up, adventurers can pledge an allegiance. Every player starts with the Adventurers Guild. From a set rank they may pledge to a rival power instead. Each faction's victories push the shared world in its direction, so allegiance is how players fight over what the world becomes. The faction names here are working names and can be renamed. This is live on the website: players pledge and turn on PvP from their Allegiance page.");
  T(s, "Live at /allegiances · working names", { x: 9.7, y: 1.6, w: 3.0, h: 0.28, fontSize: 10, color: MUTED, italic: true, align: "right" });
  const factions = [
    [null, "The Adventurers Guild", "PROTECT THE REALM", "Everyone starts here. Defend the towns, recover the sigils and stand against what wakes beyond the gate.", GOLD, GOLDL],
    ["GiDragonHead", "The Ashen Covenant", "SERVE THE WYRM", "Cultists who want the Crimson Wyrm free. They sabotage sigil hunts and guard the Wyrm's lair.", EMBER, EMBER],
    ["GiCrossedSwords", "The Free Companies", "GOLD BEFORE GLORY", "Mercenaries loyal to coin. They take contracts from either side and can tip a close fight.", ARCANE, ARCANE],
  ];
  factions.forEach(([icon, name, motto, body, line, col], i) => {
    const x = 0.6 + i * 4.1, w = 3.85;
    panel(s, x, 1.95, w, 3.35, { line, lineTransparency: 20 });
    diamond(s, x + w / 2, 2.65, 0.95, icon || "crest", { line });
    T(s, name, { x, y: 3.25, w, h: 0.42, fontSize: 20, bold: true, color: GOLDL, align: "center", fontFace: THEME.headFontFace });
    T(s, motto, { x, y: 3.67, w, h: 0.3, fontSize: 11.5, bold: true, color: col, align: "center", charSpacing: 3 });
    T(s, body, { x: x + 0.3, y: 4.05, w: w - 0.6, h: 1.1, fontSize: 13.5, color: TEXT, align: "center" });
  });
  const how = [
    ["GiFlyingFlag", "Pledge your allegiance", "Open to adventurers from a set rank. Never forced on anyone."],
    ["GiCrystalBall", "Fight for your side", "Each faction's wins push the world's counters its way."],
    ["GiSandsOfTime", "Choose carefully", "Switching sides takes time, so loyalty means something."],
  ];
  how.forEach(([icon, h, b], i) => iconRow(s, 0.6 + i * 4.1, 5.6, 3.9, icon, h, b, { headSize: 15.5, bodySize: 12.5, bodyH: 0.6 }));
}

// 12c. Party vs party
{
  const s = content("The Journey", "STEP 7 OF 8  ·  RIVALRIES", "Party vs party, and raids with two sides", "Once allegiances exist, parties can meet as rivals. Skirmishes are short refereed fights between two parties. Contested quests send rival parties after the same objective, and the winner's faction moves the world. The biggest change is raids: players pledged to the Ashen Covenant join the Wyrm's side, so a raid becomes Guild players against Covenant players with the Wyrm as the prize. All of it is opt-in and refereed by a Guild Master. The sample quest Clash at the Ashen Crossroads is already on the Quest Board, and the Crimson Wyrm raid is set up as two-sided.");
  T(s, "Live on the site", { x: 9.7, y: 1.6, w: 3.0, h: 0.28, fontSize: 10, color: MUTED, italic: true, align: "right" });
  const modes = [
    ["GiSwordsEmblem", "Skirmishes", "Two parties of opposing allegiances clash at the store, with a Guild Master refereeing."],
    ["GiTreasureMap", "Contested quests", "Rival parties race for the same objective. The winner's faction moves the world."],
    ["GiDragonHead", "Raids with two sides", "Covenant players defend the Wyrm's lair. Every raid becomes a battle between players."],
  ];
  modes.forEach(([icon, h, b], i) => iconRow(s, 0.6, 1.95 + i * 1.3, 5.5, icon, h, b, { bodyH: 0.8 }));

  // Raid diagram
  panel(s, 6.5, 1.95, 6.2, 3.85);
  T(s, "THE CRIMSON WYRM RAID", { x: 6.5, y: 2.1, w: 6.2, h: 0.3, fontSize: 12, bold: true, color: ARCANE, align: "center", charSpacing: 3 });
  const side = (c, icon, name, sub, line, col) => {
    diamond(s, c, 3.35, 0.95, icon || "crest", { line });
    T(s, name, { x: c - 1.2, y: 4.1, w: 2.4, h: 0.36, fontSize: 15, bold: true, color: col, align: "center", fontFace: THEME.headFontFace });
    T(s, sub, { x: c - 1.2, y: 4.46, w: 2.4, h: 0.3, fontSize: 12, color: MUTED, align: "center" });
  };
  side(7.75, null, "Guild raiders", "break the seal", GOLD, GOLDL);
  side(11.45, "GiCloakDagger", "Covenant defenders", "guard the Wyrm", EMBER, EMBER);
  diamond(s, 9.6, 3.35, 1.25, "GiDragonHead", { line: EMBER, lineWidth: 2.25 });
  T(s, "The Wyrm", { x: 8.4, y: 4.1, w: 2.4, h: 0.36, fontSize: 15, bold: true, color: TEXT, align: "center", fontFace: THEME.headFontFace });
  T(s, "the prize", { x: 8.4, y: 4.46, w: 2.4, h: 0.3, fontSize: 12, color: MUTED, align: "center" });
  arrow(s, 8.3, 3.35, 8.9, 3.35, GOLD, 2);
  arrow(s, 10.9, 3.35, 10.3, 3.35, EMBER, 2);
  T(s, "Free Companies can sign on with either side.", { x: 6.8, y: 5.2, w: 5.6, h: 0.35, fontSize: 12.5, color: ARCANE, italic: true, align: "center" });

  panel(s, 0.6, 6.0, 12.1, 0.7, { transparency: 35 });
  diamond(s, 1.05, 6.35, 0.5, "GiCheckedShield");
  T(s, [{ text: "Opt-in only  ·  ", options: { bold: true, color: GOLDL } }, { text: "A Guild Master referees every clash  ·  Rivals in the story, friends at the table  ·  The Code of Conduct always applies", options: { color: TEXT } }], { x: 1.5, y: 6.0, w: 11.1, h: 0.7, fontSize: 14, valign: "middle" });
}

// 13. Between sessions
{
  const s = content("The Journey", "STEP 8 OF 8  ·  BETWEEN SESSIONS", "The adventure continues at home", "Between sessions, players have small things to do online: errands, crafting, trading and chat. Errands are deliberately small: they give crafting materials and at most 50 gold, never XP or renown, so the real progress still happens at the table.");
  const cards = [
    ["GiCompass", "Guild Errands", "Send your adventurer on short expeditions or solve lore riddles. Collect materials and a little gold.", "Materials + up to 50 gold", ARCANE],
    ["GiAnvilImpact", "Professions & crafting", "Blacksmithing, Alchemy, Leatherworking, Cooking and Artificing. Learn two and level each from 1 to 10.", "5 professions · learn 2", GOLDL],
    ["GiGavel", "The Auction Hall", "Sell gear you don't need and bid on what you missed. Items and gold are held safely until the sale ends.", "Unlocks at Rank E · gold only", EPIC],
    ["GiBeerStein", "The Guild Tavern", "Live chat with the Guild: party planning, lore theories and announcements. Moderated and filtered.", "No private messages", GREEN],
  ];
  cards.forEach(([icon, h, b, tag, col], i) => {
    const col2 = i % 2, row = Math.floor(i / 2), x = 0.6 + col2 * 6.15, y = 1.95 + row * 2.45, w = 5.95, hgt = 2.25;
    panel(s, x, y, w, hgt);
    diamond(s, x + 0.75, y + 0.8, 0.95, icon);
    T(s, h, { x: x + 1.5, y: y + 0.25, w: w - 1.8, h: 0.42, fontSize: 20, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
    T(s, b, { x: x + 1.5, y: y + 0.7, w: w - 1.8, h: 0.95, fontSize: 14, color: TEXT });
    chip(s, tag, x + 1.5, y + 1.72, 3.1, col);
  });
}

// 14. Economy loop
{
  const s = content("The Journey", "HOW IT FITS TOGETHER", "The adventurer's loop", "Each activity feeds the next. Quests give gold and loot; errands give materials; crafting turns materials into potions and gear; the Auction Hall lets players trade what they don't need; and all of it makes them better prepared for the next quest. Real money never buys gold, so there's no pay-to-win.");
  const cx = 4.2, cy = 4.35, rx = 2.65, ry = 1.85;
  const nodes = [
    ["GiDiceTwentyFacesTwenty", "Quests", "XP, gold, loot"],
    ["GiCompass", "Errands", "materials"],
    ["GiAnvilImpact", "Crafting", "potions & gear"],
    ["GiGavel", "Auction Hall", "trade with players"],
    ["GiShield", "Prepared", "for the next quest"],
  ];
  const angles = [-90, -18, 54, 126, 198];
  s.addImage({ path: img("loop-ring"), x: cx - rx - 0.3, y: cy - ry - 0.3, w: (rx + 0.3) * 2, h: (ry + 0.3) * 2, altText: "Cycle arrows" });
  nodes.forEach(([icon, h, b], i) => {
    const a = (angles[i] * Math.PI) / 180, nx = cx + rx * Math.cos(a), ny = cy + ry * Math.sin(a), w = 2.2, hh = 0.82;
    panel(s, nx - w / 2, ny - hh / 2, w, hh, { transparency: 0, lineTransparency: 20 });
    diamond(s, nx - w / 2 + 0.42, ny, 0.58, icon);
    T(s, h, { x: nx - w / 2 + 0.8, y: ny - 0.33, w: w - 0.85, h: 0.32, fontSize: 15, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
    T(s, b, { x: nx - w / 2 + 0.8, y: ny - 0.01, w: w - 0.85, h: 0.3, fontSize: 12, color: MUTED });
  });
  s.addImage({ path: img("crest"), x: cx - 0.45, y: cy - 0.62, w: 0.9, h: 0.9, altText: "Guild crest" });
  T(s, "YOUR ADVENTURER", { x: cx - 1.2, y: cy + 0.32, w: 2.4, h: 0.3, fontSize: 11, bold: true, color: ARCANE, align: "center", charSpacing: 3 });

  panel(s, 8.0, 1.95, 4.7, 4.75);
  diamond(s, 8.6, 2.6, 0.8, "GiScales");
  T(s, "Fair by design", { x: 9.2, y: 2.4, w: 3.3, h: 0.42, fontSize: 21, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
  const rules = [
    ["Gold is never sold for real money.", " It can only be earned in the game."],
    ["Store purchases are physical or cosmetic.", " Cards, pins, dice bags: no gameplay advantage."],
    ["Errands can't replace sessions.", " They give no XP or renown, and are capped daily."],
    ["Story items are bound.", " Keys and trophies can't be sold at auction."],
  ];
  T(s, rules.map(([b, r], k) => [{ text: b, options: { bold: true, color: TEXT } }, { text: r, options: { color: MUTED, breakLine: k < rules.length - 1 } }]).flat(), { x: 8.35, y: 3.3, w: 4.05, h: 3.2, fontSize: 14, paraSpaceAfter: 10 });
}

// =====================================================================
pres.addSection({ title: "Community & Safety" });
// 15. Safety
{
  const s = content("Community & Safety", "A SAFE GUILD", "Welcoming for ages 13 and up", "Safety is built in, not bolted on. The minimum age is 13 and can be raised. Players under 18 need a guardian's permission, and some quests are rated 15+ or 18+. Everyone agrees to the Code of Conduct, summarised in the Ten Oaths. Guild Masters have a clear ladder of responses, and every suspension or ban can be appealed to a different Guild Master.");
  panel(s, 0.6, 1.95, 3.6, 4.75);
  T(s, "13+", { x: 0.6, y: 2.1, w: 3.6, h: 1.1, fontSize: 64, bold: true, color: GOLDL, align: "center", fontFace: THEME.headFontFace, valign: "middle" });
  T(s, "MINIMUM AGE", { x: 0.6, y: 3.2, w: 3.6, h: 0.3, fontSize: 12, bold: true, color: ARCANE, align: "center", charSpacing: 4 });
  T(s, ["Guardian permission under 18", "Quests can be rated 15+ or 18+", "Only birth month and year are stored", "Chat filters phone numbers and emails"].map((t, k, a) => ({ text: t, options: { bullet: { code: "25C6" }, breakLine: k < a.length - 1 } })), { x: 0.9, y: 3.75, w: 3.1, h: 2.7, fontSize: 14, paraSpaceAfter: 9 });

  s.addShape(pres.shapes.RECTANGLE, { x: 4.49, y: 1.99, w: 4.32, h: 3.53, objectName: "oaths-frame", fill: { color: PANEL }, line: { color: GOLD, width: 1, transparency: 30 } });
  s.addImage({ path: "../oaths-desk.png", x: 4.55, y: 2.05, w: 4.2, h: (4.2 * 693) / 848, altText: "The Ten Oaths of the Guild" });
  T(s, "The Ten Oaths of the Guild", { x: 4.5, y: 5.65, w: 4.3, h: 0.36, fontSize: 16, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
  T(s, "In-world summary of the full Code of Conduct, which every player agrees to.", { x: 4.5, y: 6.0, w: 4.3, h: 0.6, fontSize: 12.5, color: MUTED });

  panel(s, 9.1, 1.95, 3.6, 4.75);
  T(s, "If something goes wrong", { x: 9.35, y: 2.15, w: 3.2, h: 0.4, fontSize: 17, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
  const ladder = [["I", "Warning", GOLDL], ["II", "Chat mute", GOLD], ["III", "Suspension", EMBER], ["IV", "Ban", EMBER]];
  ladder.forEach(([num, label, col], i) => {
    const y = 2.7 + i * 0.68;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.35, y, w: 3.1, h: 0.52, rectRadius: 0.05, objectName: `ladder-${num}`, fill: { color: col, transparency: 85 }, line: { color: col, width: 0.75 } });
    T(s, num, { x: 9.45, y, w: 0.55, h: 0.52, fontSize: 16, bold: true, color: col, valign: "middle", fontFace: THEME.headFontFace });
    T(s, label, { x: 10.05, y, w: 2.3, h: 0.52, fontSize: 15, color: TEXT, valign: "middle", bold: true });
  });
  T(s, "Serious incidents skip steps. Every suspension or ban can be appealed to a different Guild Master.", { x: 9.35, y: 5.5, w: 3.15, h: 1.05, fontSize: 12.5, color: MUTED });
}

// 16. Command Center
{
  const s = content("Community & Safety", "FOR GUILD MASTERS", "The Command Center runs the Guild", "Everything a Guild Master needs is in one console. Sessions, quests, cards, the world, raids and moderation. Every reward, card change and restriction goes to the audit log, so any decision can be reviewed later.");
  const tools = [
    ["GiCalendar", "Session Manager", "Schedule sessions, run the roster, record rewards"],
    ["GiQuillInk", "Quest Creator", "Player-facing quests with GM-only secrets"],
    ["GiCardPlay", "Guild Cards", "Forge, print, assign and replace cards"],
    ["GiTreasureMap", "World Editor", "Locations, world counters and the Chronicle"],
    ["GiDragonHead", "Raid Controller", "Open registration, run and resolve raids"],
    ["GiCauldron", "Errands & Crafting", "Post expeditions, riddles and recipes"],
    ["GiCheckedShield", "Players & Moderation", "Roles, mutes, suspensions, bans, appeals"],
    ["GiChecklist", "Audit Log", "Every important action, with who and when"],
  ];
  tools.forEach(([icon, h, b], i) => {
    const col = i % 4, row = Math.floor(i / 4), x = 0.6 + col * 3.08, y = 1.95 + row * 2.45, w = 2.85, hh = 2.25;
    panel(s, x, y, w, hh);
    diamond(s, x + w / 2, y + 0.65, 0.8, icon);
    T(s, h, { x: x + 0.1, y: y + 1.15, w: w - 0.2, h: 0.4, fontSize: 16.5, bold: true, color: GOLDL, align: "center", fontFace: THEME.headFontFace });
    T(s, b, { x: x + 0.2, y: y + 1.55, w: w - 0.4, h: 0.6, fontSize: 13, color: MUTED, align: "center" });
  });
}

// =====================================================================
pres.addSection({ title: "Business" });
// 17. Business model
{
  const s = content("Business", "HOW IT SUSTAINS ITSELF", "Three ways the Guild earns", "The figures here are the sample prices currently in the pilot, not final pricing. Session seats are the core revenue. The Guild Store sells physical goods like personalized cards, rank upgrade cards, pins and dice bags, which are picked up at the store. And the partner store benefits from regular, repeat visits.");
  const cols = [
    ["GiDiceTwentyFacesTwenty", "$10–20", "per session seat", "Booked online. Paid by card online or at the store."],
    ["GiShop", "$5–22", "Guild Store items", "Guild cards, rank upgrade cards, pins, dice bags, journals."],
    ["GiRingingBell", "Weekly", "repeat visits", "A persistent story brings players back to the partner store."],
  ];
  cols.forEach(([icon, big, lab, b], i) => {
    const x = 0.6 + i * 4.1, w = 3.85;
    panel(s, x, 1.95, w, 3.6);
    diamond(s, x + w / 2, 2.65, 0.9, icon);
    T(s, big, { x, y: 3.2, w, h: 0.85, fontSize: 44, bold: true, color: GOLDL, align: "center", fontFace: THEME.headFontFace, valign: "middle" });
    T(s, lab.toUpperCase(), { x, y: 4.05, w, h: 0.3, fontSize: 12, bold: true, color: ARCANE, align: "center", charSpacing: 3 });
    T(s, b, { x: x + 0.3, y: 4.45, w: w - 0.6, h: 0.8, fontSize: 14, color: TEXT, align: "center" });
  });
  panel(s, 0.6, 5.85, 12.1, 0.85, { transparency: 35 });
  diamond(s, 1.1, 6.275, 0.55, "GiScales");
  T(s, [{ text: "Never pay-to-win: ", options: { bold: true, color: GOLDL } }, { text: "real money buys seats and physical goods only. In-game gold is always earned by playing.", options: { color: TEXT } }], { x: 1.6, y: 5.85, w: 10.9, h: 0.85, fontSize: 15, valign: "middle" });
  T(s, "Sample pilot pricing", { x: 10.7, y: 1.6, w: 2.0, h: 0.28, fontSize: 10, color: MUTED, italic: true, align: "right" });
}

// 18. Under the hood
{
  const s = content("Business", "UNDER THE HOOD", "Simple, low-cost technology", "The website is plain static files on GitHub Pages, so hosting is free. Supabase provides the database, logins, chat and image storage, and runs on its free tier for the pilot. Every game rule lives in the database itself, so nobody can cheat by tampering with the website. Stripe is optional for online payments.");
  const boxes = [
    ["GiSmartphone", "Player's phone", "Any browser. No app to install.", 0.6],
    ["GiWorld", "The website", "Hosted free on GitHub Pages", 3.75],
    ["GiKeyLock", "Supabase", "Database, logins, chat, images", 6.9],
    ["GiCash", "Stripe (optional)", "Secure online payments", 10.05],
  ];
  boxes.forEach(([icon, h, b, x], i) => {
    panel(s, x, 2.1, 2.65, 2.2);
    diamond(s, x + 1.325, 2.75, 0.85, icon);
    T(s, h, { x, y: 3.3, w: 2.65, h: 0.38, fontSize: 17, bold: true, color: GOLDL, align: "center", fontFace: THEME.headFontFace });
    T(s, b, { x: x + 0.15, y: 3.68, w: 2.35, h: 0.5, fontSize: 12.5, color: MUTED, align: "center" });
    if (i < 3) arrow(s, x + 2.7, 3.2, x + 3.1, 3.2, GOLD, 1.75);
  });
  const facts = [
    ["GiCheckedShield", "Rules live in the database", "Bookings, rewards and trades are checked on the server, not in the browser."],
    ["GiOpenBook", "Permanent ledgers", "XP, gold, renown and items are an append-only history. Nothing is silently changed."],
    ["GiTwoCoins", "Pilot runs on free tiers", "Paid plans are only needed for backups and growth, about $25 a month for Supabase Pro."],
  ];
  facts.forEach(([icon, h, b], i) => iconRow(s, 0.6 + i * 4.1, 4.85, 3.9, icon, h, b, { headSize: 15.5, bodySize: 13, bodyH: 1.1 }));
}

// 19. Roadmap
{
  const s = content("Business", "WHAT'S NEXT", "From founding guild to full launch", "The platform is built and live today. The proposed next phase is the Founding Guild pilot: print the twelve founding cards, run playtests at the partner store, and lock down the rules, prices and terms. After that comes the public launch with online payments, more quests and raids, and potentially more partner stores.");
  const phases = [
    ["GiFlyingFlag", "NOW", "Platform live", ["Website, cards and booking", "Guild Master Command Center", "World, raids, errands, crafting, auctions", "Allegiances and party-vs-party"], GREEN],
    ["GiCardPlay", "NEXT", "Founding Guild pilot", ["Print the 12 founding cards", "Playtest sessions at the partner store", "Finalize ruleset, prices and terms", "Set up email, backups and legal review"], GOLDL],
    ["GiCrown", "LATER", "Public launch", ["Open online payments", "The first two-sided raid", "New quest lines and allegiances", "Grow the GM team and partner stores"], EPIC],
  ];
  s.addShape(pres.shapes.LINE, { x: 2.65, y: 2.45, w: 8.2, h: 0, objectName: "timeline", line: { color: GOLD, width: 1.5, dashType: "dash", transparency: 30 } });
  phases.forEach(([icon, tag, h, items, col], i) => {
    const x = 0.6 + i * 4.1, w = 3.85, cxm = x + w / 2;
    diamond(s, cxm, 2.45, 0.95, icon, { line: col });
    chip(s, tag, cxm - 0.6, 3.1, 1.2, col);
    panel(s, x, 3.6, w, 3.1);
    T(s, h, { x: x + 0.3, y: 3.8, w: w - 0.6, h: 0.42, fontSize: 19, bold: true, color: GOLDL, fontFace: THEME.headFontFace });
    T(s, items.map((t, k) => ({ text: t, options: { bullet: { code: "25C6" }, breakLine: k < items.length - 1 } })), { x: x + 0.3, y: 4.35, w: w - 0.55, h: 2.2, fontSize: 14, paraSpaceAfter: 8 });
  });
  T(s, "Proposed plan", { x: 10.7, y: 1.6, w: 2.0, h: 0.28, fontSize: 10, color: MUTED, italic: true, align: "right" });
}

// 20. Closing
{
  const s = pres.addSlide({ masterName: "EB_TITLE", sectionTitle: "Business" });
  s.addImage({ path: img("crest"), x: 0.8, y: 0.55, w: 0.9, h: 0.9, altText: "Everbound crest" });
  s.addText("THE GUILD AWAITS", { placeholder: "eyebrow" });
  s.addText([{ text: "YOUR LEGEND", options: { breakLine: true } }, { text: "BEGINS HERE" }], { placeholder: "title", fontSize: 50 });
  s.addText("", { placeholder: "body" });
  T(s, "Questions, partnership or playtest interest? Talk to Lime Lizard Games.", { x: 0.8, y: 4.15, w: 5.6, h: 0.8, fontSize: 17, color: TEXT });
  T(s, "everbound.limelizardgames.com", { x: 0.8, y: 5.05, w: 5.6, h: 0.4, fontSize: 18, bold: true, color: ARCANE });
  // QR on the sigil
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.75, y: 2.15, w: 2.9, h: 2.9, rectRadius: 0.1, objectName: "qr-plate", fill: { color: "F2EBDA" }, line: { color: GOLD, width: 2 }, shadow: { type: "outer", color: "000000", opacity: 0.6, blur: 20, offset: 6, angle: 90 } });
  s.addImage({ path: img("qr"), x: 8.9, y: 2.3, w: 2.6, h: 2.6, altText: "QR code linking to everbound.limelizardgames.com" });
  T(s, "SCAN TO VISIT THE GUILD", { x: 8.45, y: 5.25, w: 3.5, h: 0.32, fontSize: 12, bold: true, color: GOLDL, align: "center", charSpacing: 3 });
  s.addNotes("Close by inviting the audience to scan the QR and explore the live site. The world map, quest board, raid center and Chronicle are all public, so they can see the world as it stands today.");
}

(async () => {
  await renderBadges();
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();
