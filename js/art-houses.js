// The House, levels 1–10. Each is a 3×3-tile sprite (72×72) drawn in code.

import { bigHouseRows } from './art.js';
import { painter, blocks } from './paint.js';

const S = 72;

// ---- shared parts ----

function win(p, x, y, w, h, lit = 'y', frame = 'k') {
  p.rect(x, y, x + w - 1, y + h - 1, lit);
  p.frame(x - 1, y - 1, x + w, y + h, frame);
  p.vline(x + (w >> 1), y, y + h - 1, frame);
  p.hline(x, x + w - 1, y + (h >> 1), frame);
}

function door(p, x, y, w, h, ch = 'n', dark = 'N') {
  p.rect(x, y, x + w - 1, y + h - 1, ch);
  p.vline(x + w - 1, y, y + h - 1, dark);
  p.frame(x - 1, y - 1, x + w, y + h);
  p.put(x + w - 3, y + (h >> 1), 'y'); // knob
}

// Gable roof: peak at (cx, peakY), widening to halfW at eaveY. Shingle lines every `every` rows.
function gable(p, { peakY, eaveY, cx, halfW, fill, line, light, every = 5 }) {
  for (let y = peakY; y <= eaveY; y++) {
    const t = (y - peakY) / (eaveY - peakY);
    const hw = 2 + t * (halfW - 2);
    const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
    for (let x = x0; x <= x1; x++) {
      let ch = (y - peakY) % every === every - 1 ? line : fill;
      if (light && x < cx && x - x0 < 3 && ch === fill) ch = light;
      p.put(x, y, ch);
    }
  }
  p.hline(Math.round(cx - halfW) - 2, Math.round(cx + halfW) + 2, eaveY + 1, 'k'); // eaves
}

function merlons(p, x0, x1, yTop, yBot, ch, light, w = 5, gap = 3) {
  for (let x = x0; x <= x1; x += w + gap) {
    const xe = Math.min(x + w - 1, x1);
    p.rect(x, yTop, xe, yBot, ch);
    p.hline(x, xe, yTop, light);
  }
}

function footing(p, x0, x1, y0, y1, ch = 'S') {
  p.rect(x0, y0, x1, y1, ch);
  for (let x = x0 + 3; x < x1; x += 6) p.put(x, y0 + 1, 'k');
  p.frame(x0 - 1, y0 - 1, x1 + 1, y1 + 1);
}

function hazard(p, x0, y0, x1, y1) {
  p.each(x0, y0, x1, y1, (x, y) => ((x + y) % 8 < 4 ? 'y' : 'k'));
}

// ---- the ten houses ----

function trailer(p) {
  p.rect(10, 34, 61, 56, 'W');
  p.rect(10, 34, 61, 36, 'w');
  p.rect(10, 46, 61, 48, 'u'); // racing stripe
  p.rect(10, 54, 61, 56, 'S'); // skirt
  p.frame(9, 33, 62, 57);
  p.rect(12, 30, 59, 32, 'S'); p.frame(11, 29, 60, 33);  // flat roof
  p.rect(38, 26, 44, 28, 'S'); p.frame(37, 25, 45, 29);  // roof vent
  p.vline(56, 18, 28, 'S'); p.put(56, 17, 'r');          // antenna
  win(p, 16, 39, 10, 7);
  win(p, 30, 39, 8, 7);
  door(p, 46, 40, 8, 16);
  p.rect(46, 57, 53, 59, 'n'); p.frame(45, 57, 54, 60);  // step
  for (const wx of [16, 48]) { p.rect(wx, 57, wx + 7, 62, 'k'); p.rect(wx + 3, 59, wx + 4, 60, 'S'); } // wheels
  p.rect(32, 57, 35, 62, 'S'); p.frame(31, 57, 36, 63);  // jack stand
  p.hline(2, 9, 50, 'S'); p.rect(2, 49, 4, 51, 'S');      // tow hitch
}

function shack(p) {
  p.rect(10, 34, 61, 62, 'n');
  for (let x = 10; x <= 61; x += 5) p.vline(x, 34, 62, 'N');
  p.frame(9, 33, 62, 63);
  p.rect(53, 11, 55, 31, 'S'); p.frame(52, 10, 56, 32);  // stove pipe
  for (let x = 6; x <= 65; x++) {                         // corrugated tin roof, sloping to the right
    const top = 22 + Math.round((x - 6) * 0.18);
    p.rect(x, top, x, top + 4, x % 3 === 0 ? 'S' : 's');
    p.put(x, top + 5, 'k');
  }
  win(p, 16, 42, 9, 8); p.hline(15, 25, 45, 'n'); p.hline(15, 25, 47, 'n'); // boarded window
  door(p, 40, 46, 9, 17);
  for (const bx of [12, 56]) { p.rect(bx, 63, bx + 3, 66, 'S'); p.frame(bx - 1, 63, bx + 4, 67); } // blocks it sits on
}

function cabin(p) {
  p.rect(8, 34, 63, 62, 'n');
  for (let y = 34; y <= 62; y++) {
    const ph = (y - 34) % 4;
    if (ph === 0) p.hline(8, 63, y, 'h');
    if (ph === 3) p.hline(8, 63, y, 'N');
  }
  for (let y = 34; y <= 60; y += 4) {                     // log ends at the corners
    p.rect(5, y, 7, y + 2, 'n'); p.put(6, y + 1, 'N');
    p.rect(64, y, 66, y + 2, 'n'); p.put(65, y + 1, 'N');
  }
  p.frame(7, 33, 64, 63);
  p.rect(50, 12, 57, 30, 's'); for (let y = 14; y <= 30; y += 4) p.hline(50, 57, y, 'S'); p.frame(49, 11, 58, 31); // stone chimney
  gable(p, { peakY: 8, eaveY: 34, cx: 35.5, halfW: 32, fill: 'N', line: 'n', light: 'h', every: 4 });
  win(p, 14, 42, 9, 8);
  win(p, 49, 42, 9, 8);
  door(p, 31, 46, 10, 17);
  p.rect(6, 63, 65, 65, 'h'); p.hline(6, 65, 65, 'N'); p.frame(5, 62, 66, 66); // porch deck
}

function stoneHouse(p) {
  blocks(p, 8, 36, 63, 62, 's', 'S', 8, 5);
  p.frame(7, 35, 64, 63);
  p.rect(48, 10, 55, 30, 'S'); p.hline(47, 56, 10, 'k'); p.frame(47, 9, 56, 31); // chimney
  gable(p, { peakY: 8, eaveY: 36, cx: 35.5, halfW: 32, fill: 'S', line: 't', light: 's', every: 4 });
  win(p, 14, 44, 9, 8); p.hline(13, 23, 52, 'W');
  win(p, 49, 44, 9, 8); p.hline(48, 58, 52, 'W');
  p.rect(30, 47, 41, 63, 'k'); p.hline(31, 40, 46, 'k'); p.hline(32, 39, 45, 'k'); p.hline(33, 38, 44, 'k'); // arched door
  p.rect(31, 47, 40, 62, 'N'); p.hline(32, 39, 46, 'N'); p.hline(33, 38, 45, 'N');
  p.vline(39, 47, 62, 'k'); p.put(38, 55, 'y');
  footing(p, 5, 66, 63, 66);
}

function manor(p) {
  blocks(p, 4, 32, 67, 62, 'b', 'B', 6, 3);
  p.frame(3, 31, 68, 63);
  for (const cx of [10, 55]) { blocks(p, cx, 6, cx + 6, 30, 'b', 'B', 4, 3); p.rect(cx - 1, 5, cx + 7, 6, 'S'); p.frame(cx - 2, 4, cx + 8, 31); } // chimneys
  gable(p, { peakY: 2, eaveY: 32, cx: 35.5, halfW: 34, fill: 'q', line: 'r', light: 'r', every: 5 });
  p.rect(30, 14, 41, 29, 'w'); p.frame(29, 13, 42, 30);                              // dormer
  p.rect(28, 10, 43, 12, 'q'); p.hline(28, 43, 9, 'k'); p.vline(28, 9, 12, 'k'); p.vline(43, 9, 12, 'k');
  win(p, 33, 17, 6, 7);
  for (const wx of [10, 22, 42, 54]) win(p, wx, 40, 8, 9, 'y', 'w');
  p.rect(29, 48, 42, 62, 'N'); p.vline(35, 48, 62, 'k'); p.vline(36, 48, 62, 'n'); // double door
  p.put(33, 55, 'y'); p.put(38, 55, 'y'); p.frame(28, 47, 43, 63);
  p.rect(29, 45, 42, 46, 'y'); p.hline(28, 43, 44, 'k');                         // fanlight
  footing(p, 2, 69, 63, 66);
}

function keep(p) {
  blocks(p, 10, 20, 61, 62, 's', 'S', 10, 6);
  p.frame(9, 19, 62, 63);
  merlons(p, 10, 61, 13, 18, 's', 'W', 5, 3);
  p.vline(35, 1, 12, 'S'); p.rect(36, 2, 45, 7, 'r'); p.rect(40, 4, 41, 5, 'y'); // flag
  p.rect(20, 28, 21, 38, 'k'); p.vline(20, 30, 36, 'y');                        // arrow slits
  p.rect(50, 28, 51, 38, 'k'); p.vline(50, 30, 36, 'y');
  p.rect(28, 42, 43, 63, 'k'); p.hline(29, 42, 41, 'k'); p.hline(30, 41, 40, 'k'); p.hline(31, 40, 39, 'k'); // arched gate
  p.rect(29, 42, 42, 62, 'n'); p.hline(30, 41, 41, 'n'); p.hline(31, 40, 40, 'n');
  for (let y = 46; y <= 62; y += 4) p.hline(29, 42, y, 'N');
  p.vline(35, 40, 62, 'N');
  for (const [hx, hy] of [[30, 46], [40, 46], [30, 56], [40, 56]]) p.rect(hx, hy, hx + 1, hy + 1, 'S'); // hinges
  footing(p, 6, 65, 63, 66);
}

function fortress(p) {
  for (const tx of [3, 57]) {                                                     // corner turrets
    blocks(p, tx, 14, tx + 11, 62, 'S', 't', 6, 4);
    merlons(p, tx, tx + 11, 8, 13, 'S', 's', 3, 2);
    p.vline(tx === 3 ? tx + 12 : tx - 1, 14, 62, 'k');
  }
  blocks(p, 15, 24, 56, 62, 'S', 't', 8, 5);
  merlons(p, 15, 56, 18, 23, 'S', 's', 4, 3);
  p.hline(15, 56, 24, 't');
  p.rect(31, 28, 40, 40, 'r'); p.hline(31, 40, 28, 'q'); p.rect(34, 32, 37, 35, 'y'); p.frame(30, 27, 41, 41); // banner
  for (const x of [22, 49]) { p.rect(x, 40, x + 1, 46, 'n'); p.rect(x - 1, 37, x + 2, 39, 'R'); p.put(x, 36, 'y'); p.put(x + 1, 36, 'y'); } // torches
  p.rect(28, 44, 43, 62, 'k');                                                    // portcullis
  for (let x = 29; x <= 43; x += 3) p.vline(x, 44, 62, 's');
  for (let y = 47; y <= 62; y += 5) p.hline(28, 43, y, 's');
  p.frame(27, 43, 44, 63);
  footing(p, 1, 70, 63, 66, 't');
}

function vault(p) {
  p.rect(6, 24, 65, 28, 'E'); p.hline(6, 65, 24, 'e'); p.frame(5, 23, 66, 28);  // roof slab
  p.rect(8, 28, 63, 62, 'e');
  for (let x = 8; x <= 63; x += 14) p.vline(x, 28, 62, 'E');
  for (let y = 38; y <= 62; y += 10) p.hline(8, 63, y, 'E');
  for (let x = 11; x <= 63; x += 14) for (let y = 31; y <= 62; y += 10) p.put(x, y, 'k'); // rivets
  p.frame(7, 27, 64, 63);
  hazard(p, 8, 57, 63, 61);
  p.disc(35.5, 45, 11, 'E'); p.disc(35.5, 45, 9, 'e');                            // vault door
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.put(Math.round(35 + Math.cos(a) * 10), Math.round(44.5 + Math.sin(a) * 10), 'k'); }
  p.hline(28, 43, 45, 'k'); p.vline(35, 37, 52, 'k'); p.vline(36, 37, 52, 'k'); p.disc(35.5, 45, 2.2, 'k'); // wheel
  p.rect(13, 31, 15, 33, 'r'); p.frame(12, 30, 16, 34);                            // warning lights
  p.rect(56, 31, 58, 33, 'l'); p.frame(55, 30, 59, 34);
  p.vline(60, 12, 23, 'S'); p.hline(57, 63, 12, 'S'); p.put(60, 11, 'r');         // antenna
  p.rect(27, 63, 44, 65, 'E'); p.frame(26, 63, 45, 66);                            // step
}

function bunker(p) {
  p.rect(14, 16, 57, 22, 'z'); p.rect(10, 22, 61, 28, 'z'); p.rect(6, 28, 65, 62, 'z'); // stepped slabs
  p.hline(14, 57, 16, 'W'); p.hline(14, 57, 22, 'Z'); p.hline(10, 61, 28, 'Z'); p.hline(6, 65, 45, 'Z');
  for (let x = 18; x <= 65; x += 12) p.vline(x, 29, 62, 'Z');
  for (let x = 14; x <= 57; x += 4) { p.put(x, 19, 'v'); p.put(x + 1, 19, 'v'); }   // glow strip
  p.rect(26, 38, 45, 62, 'Z'); p.frame(25, 37, 46, 63);                              // blast door
  p.rect(28, 40, 43, 54, 'z'); p.frame(27, 39, 44, 55, 'k');
  p.disc(35.5, 47, 4.2, 'k'); p.disc(35.5, 47, 2.6, 'Z'); p.hline(32, 39, 47, 'k'); p.vline(35, 43, 51, 'k');
  hazard(p, 28, 57, 43, 60);
  for (const [lx, ly] of [[10, 33], [59, 33], [10, 52], [59, 52]]) { p.rect(lx, ly, lx + 2, ly + 2, 'v'); p.frame(lx - 1, ly - 1, lx + 3, ly + 3); } // lights
  p.disc(56, 10, 5, 'e'); p.disc(56, 10, 3.2, 'E'); p.put(56, 10, 'k'); p.rect(55, 15, 56, 22, 'S'); // radar dish
  p.vline(14, 4, 16, 'S'); p.hline(11, 17, 6, 'S'); p.hline(12, 16, 9, 'S'); p.put(14, 3, 'r');   // antenna
  for (const bx of [0, 62]) {                                                                     // sandbags
    for (let y = 57; y <= 63; y += 3) { p.rect(bx, y, bx + 9, y + 2, 'd'); p.hline(bx, bx + 9, y + 2, 'D'); p.put(bx + (y % 2 ? 3 : 6), y, 'D'); }
  }
  p.rect(2, 64, 69, 67, 'Z'); p.frame(1, 63, 70, 68);
}

export const HOUSE_LEVELS = [
  { name: 'Trailer', draw: trailer },
  { name: 'Shack', draw: shack },
  { name: 'Log Cabin', draw: cabin },
  { name: 'Cottage', draw: null }, // the existing cottage art
  { name: 'Stone House', draw: stoneHouse },
  { name: 'Brick Manor', draw: manor },
  { name: 'Keep', draw: keep },
  { name: 'Fortress', draw: fortress },
  { name: 'Vault', draw: vault },
  { name: 'Bunker', draw: bunker },
];

export function houseRows(level) {
  const lv = HOUSE_LEVELS[Math.max(1, Math.min(HOUSE_LEVELS.length, level)) - 1];
  if (!lv.draw) return bigHouseRows();
  const p = painter(S, S);
  lv.draw(p);
  p.outline();
  return p.rows();
}
