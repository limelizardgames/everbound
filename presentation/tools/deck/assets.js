// Generates background art, icons and the QR code used by build.js
const sharp = require("sharp");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const gi = require("react-icons/gi");
const QRCode = require("qrcode");
const fs = require("fs");
fs.mkdirSync("img", { recursive: true });

const W = 2666, H = 1500;
function stars(n, seed, maxOp) {
  let s = seed, out = "";
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) out += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(r() * 2.2 + 0.6).toFixed(1)}" fill="#F2EBDA" opacity="${(r() * maxOp).toFixed(2)}"/>`;
  return out;
}
function rings(cx, cy, op) {
  let o = "";
  [260, 340, 420, 560, 700].forEach((r, i) => {
    o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#D4AA5A" stroke-width="${i % 2 ? 1.5 : 3}" opacity="${op}" ${i === 2 ? 'stroke-dasharray="6 14"' : ""}/>`;
  });
  if (false) for (let a = 0; a < 360; a += 7.5) {
    const rad = (a * Math.PI) / 180, r1 = 420, r2 = a % 30 === 0 ? 470 : 445;
    o += `<line x1="${cx + r1 * Math.cos(rad)}" y1="${cy + r1 * Math.sin(rad)}" x2="${cx + r2 * Math.cos(rad)}" y2="${cy + r2 * Math.sin(rad)}" stroke="#D4AA5A" stroke-width="2" opacity="${op}"/>`;
  }
  // hexagram
  const pts = (off) => [0, 1, 2].map((k) => { const t = ((off + k * 120 - 90) * Math.PI) / 180; return `${cx + 340 * Math.cos(t)},${cy + 340 * Math.sin(t)}`; }).join(" ");
  if (false) o += `<polygon points="${pts(0)}" fill="none" stroke="#4FD1E8" stroke-width="2" opacity="${op * 0.9}"/><polygon points="${pts(60)}" fill="none" stroke="#4FD1E8" stroke-width="2" opacity="${op * 0.9}"/>`;
  return o;
}
const titleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><radialGradient id="g" cx="72%" cy="45%" r="75%"><stop offset="0" stop-color="#1B2950"/><stop offset=".55" stop-color="#0F1730"/><stop offset="1" stop-color="#070A16"/></radialGradient>
<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#4FD1E8" stop-opacity=".18"/><stop offset="1" stop-color="#4FD1E8" stop-opacity="0"/></radialGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/><circle cx="1930" cy="680" r="760" fill="url(#glow)"/>${stars(90, 7, 0.35)}${rings(1930, 680, 0.16)}</svg>`;
const contentSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><radialGradient id="g" cx="20%" cy="0%" r="110%"><stop offset="0" stop-color="#172243"/><stop offset=".5" stop-color="#0D1329"/><stop offset="1" stop-color="#080B18"/></radialGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/></svg>`;

const ICONS = {
  GiCrossedSwords: "F0D08A", GiBowArrow: "F0D08A", GiCloakDagger: "F0D08A", GiHolySymbol: "F0D08A", GiWizardStaff: "F0D08A", GiLyre: "F0D08A",
  GiScrollUnfurled: "F0D08A", GiShop: "F0D08A", GiDiceTwentyFacesTwenty: "F0D08A", GiTwoCoins: "F0D08A", GiLaurelsTrophy: "F0D08A",
  GiUpgrade: "F0D08A", GiTreasureMap: "F0D08A", GiDragonHead: "E0533D", GiAnvilImpact: "F0D08A", GiCauldron: "F0D08A", GiGavel: "F0D08A",
  GiBeerStein: "F0D08A", GiCheckedShield: "F0D08A", GiSandsOfTime: "F0D08A", GiCrystalBall: "4FD1E8", GiQuillInk: "F0D08A", GiStarMedal: "F0D08A",
  GiCompass: "F0D08A", GiSpellBook: "F0D08A", GiWorld: "F0D08A", GiCalendar: "F0D08A", GiBlackFlag: "F0D08A", GiSwordsEmblem: "F0D08A",
  GiHeartPlus: "F0D08A", GiOpenBook: "F0D08A", GiPadlock: "F0D08A", GiHammerNails: "F0D08A", GiPotionBall: "F0D08A", GiChecklist: "F0D08A",
  GiThreeFriends: "F0D08A", GiShield: "F0D08A", GiCrown: "F0D08A", GiStonePile: "F0D08A", GiSmartphone: "F0D08A", GiRingingBell: "F0D08A",
  GiCash: "F0D08A", GiStairsGoal: "F0D08A", GiCardPlay: "F0D08A", GiTalk: "F0D08A", GiScales: "F0D08A", GiGears: "F0D08A", GiKeyLock: "F0D08A",
  GiPerson: "F0D08A", GiElfEar: "F0D08A", GiDwarfFace: "F0D08A", GiFootprint: "F0D08A", GiOrcHead: "F0D08A", GiFoxHead: "F0D08A", GiSpikedDragonHead: "F0D08A", GiDevilMask: "F0D08A", GiFairyWings: "F0D08A", GiMermaid: "F0D08A", GiEagleHead: "F0D08A", GiGolemHead: "F0D08A", GiStarsStack: "F0D08A", GiFlyingFlag: "F0D08A", GiMagnifyingGlass: "F0D08A",
};

(async () => {
  await sharp(Buffer.from(titleSvg)).jpeg({ quality: 88 }).toFile("img/bg-title.jpg");
  await sharp(Buffer.from(contentSvg)).jpeg({ quality: 88 }).toFile("img/bg-content.jpg");
  for (const [name, color] of Object.entries(ICONS)) {
    const svg = renderToStaticMarkup(React.createElement(gi[name], { size: 512, color: "#" + color }));
    await sharp(Buffer.from(svg)).png().toFile(`img/${name}.png`);
  }
  // Crest: shield + star, matching the site logo
  const crest = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100">
    <path d="M50 6 L86 18 V48 C86 70 70 86 50 94 C30 86 14 70 14 48 V18 Z" fill="#151C30" stroke="#D4AA5A" stroke-width="4"/>
    <path d="M50 16 L77 25 V48 C77 65 65 78 50 85 C35 78 23 65 23 48 V25 Z" fill="none" stroke="#D4AA5A" stroke-width="1.5" opacity=".6"/>
    <polygon points="50,30 55.6,43 69.5,44 59,53 62.2,67 50,59.6 37.8,67 41,53 30.5,44 44.4,43" fill="#F0D08A"/></svg>`;
  await sharp(Buffer.from(crest)).png().toFile("img/crest.png");
  await QRCode.toFile("img/qr.png", "https://everbound.limelizardgames.com", { width: 600, margin: 1, color: { dark: "#0B1020", light: "#F2EBDA" } });
  {
    const PX = 200, cx = 4.2, cy = 4.35, rx = 2.65, ry = 1.85, pad = 0.3;
    const W2 = (rx + pad) * 2 * PX, H2 = (ry + pad) * 2 * PX, ox = (rx + pad) * PX, oy = (ry + pad) * PX;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}"><ellipse cx="${ox}" cy="${oy}" rx="${rx * PX}" ry="${ry * PX}" fill="none" stroke="#D4AA5A" stroke-width="5" stroke-dasharray="18 14" opacity=".75"/>`;
    [-90, -18, 54, 126, 198].forEach((a) => {
      const t = ((a + 36) * Math.PI) / 180, x = ox + rx * PX * Math.cos(t), y = oy + ry * PX * Math.sin(t);
      const dx = -rx * Math.sin(t), dy = ry * Math.cos(t), ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      svg += `<polygon points="26,0 -16,-20 -16,20" fill="#F0D08A" transform="translate(${x},${y}) rotate(${ang})"/>`;
    });
    await sharp(Buffer.from(svg + "</svg>")).png().toFile("img/loop-ring.png");
  }
  console.log("assets ok");
})();
