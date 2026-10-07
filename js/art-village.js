// The village to the south: shop buildings, the well, and pets. Drawn in code.

import { painter, blocks } from './paint.js';

function roofed(p, wall, roof, roofLight) {
  // Shared shop body: 48×48, walls with a gable roof.
  p.rect(5, 22, 42, 44, wall);
  p.frame(4, 21, 43, 45);
  for (let y = 4; y <= 21; y++) {
    const hw = 3 + (y - 4) * 1.2;
    for (let x = Math.round(23.5 - hw); x <= Math.round(23.5 + hw); x++) p.put(x, y, (y - 4) % 4 === 3 ? roofLight : roof);
  }
  p.hline(1, 46, 21, 'k');
  p.rect(19, 32, 28, 44, 'N'); p.frame(18, 31, 29, 45); p.put(26, 38, 'y'); // door
}

function petshop(p) {
  roofed(p, 'W', 'c', 'w');
  p.rect(8, 27, 15, 33, 'y'); p.frame(7, 26, 16, 34); p.vline(11, 27, 33, 'k');
  p.rect(32, 27, 39, 33, 'y'); p.frame(31, 26, 40, 34); p.vline(35, 27, 33, 'k');
  // Paw sign.
  p.disc(23.5, 14, 5, 'w'); p.disc(23.5, 15.5, 2.4, 'N');
  for (const [x, y] of [[20, 11], [23, 10], [26, 10], [28, 12]]) p.put(x, y, 'N');
}

function store(p) {
  roofed(p, 'h', 'r', 'R');
  // Striped awning.
  for (let x = 5; x <= 42; x++) p.vline(x, 22, 25, Math.floor((x - 5) / 4) % 2 ? 'w' : 'r');
  p.hline(5, 42, 26, 'k');
  // Crates outside.
  for (const cx of [6, 34]) { p.rect(cx, 36, cx + 7, 43, 'n'); p.frame(cx - 1, 35, cx + 8, 44); p.hline(cx, cx + 7, 39, 'N'); }
  // Coin sign.
  p.disc(23.5, 14, 5, 'Y'); p.disc(23.5, 14, 3.5, 'y'); p.vline(23, 12, 16, 'Y');
}

function tavern(p) {
  blocks(p, 5, 22, 42, 44, 's', 'S', 8, 5);
  p.frame(4, 21, 43, 45);
  for (let y = 4; y <= 21; y++) {
    const hw = 3 + (y - 4) * 1.2;
    for (let x = Math.round(23.5 - hw); x <= Math.round(23.5 + hw); x++) p.put(x, y, (y - 4) % 4 === 3 ? 'n' : 'N');
  }
  p.hline(1, 46, 21, 'k');
  p.rect(19, 32, 28, 44, 'n'); p.frame(18, 31, 29, 45); p.put(26, 38, 'y');
  p.rect(8, 28, 14, 33, 'y'); p.frame(7, 27, 15, 34);
  p.rect(33, 28, 39, 33, 'y'); p.frame(32, 27, 40, 34);
  // Mug sign hanging from a pole.
  p.hline(30, 41, 23, 'N'); p.vline(41, 23, 25, 'N');
  p.rect(38, 26, 44, 32, 'Y'); p.rect(39, 27, 43, 28, 'w'); p.frame(37, 25, 45, 33); p.vline(46, 27, 30, 'Y');
}

function well(p) {
  p.disc(12, 15, 8, 's'); p.disc(12, 15, 6, 'S'); p.disc(12, 15, 4.5, 'c'); p.put(10, 13, 'w');
  p.vline(4, 2, 14, 'N'); p.vline(20, 2, 14, 'N'); p.hline(4, 20, 2, 'N'); p.rect(3, 0, 21, 1, 'r');
  p.vline(12, 3, 9, 'S'); p.rect(11, 9, 13, 11, 'n');
}

// ---------- v2: the village you're defending ----------

// Cottages (48×48): a family's home. Variants change the walls and roof colours.
const COTTAGE_COLOURS = [
  { wall: 'h', roof: 'r', light: 'R' }, { wall: 'w', roof: 'G', light: 'g' },
  { wall: 'h', roof: 'C', light: 'u' }, { wall: 'W', roof: 'Y', light: 'y' }, { wall: 'w', roof: 'q', light: 'r' },
];
function cottage(p, v = 0) {
  const { wall, roof, light } = COTTAGE_COLOURS[v % COTTAGE_COLOURS.length];
  p.rect(8, 26, 39, 44, wall); p.frame(7, 25, 40, 45);
  // Chimney, then a roof that overhangs the walls.
  p.rect(31, 8, 35, 17, 'b'); p.frame(30, 7, 36, 17); p.put(33, 5, 'W'); p.put(34, 3, 'W');
  for (let y = 10; y <= 25; y++) {
    const hw = 2 + (y - 10) * 1.25;
    for (let x = Math.round(23.5 - hw); x <= Math.round(23.5 + hw); x++) p.put(x, y, (y - 10) % 4 === 3 ? light : roof);
  }
  p.hline(3, 44, 25, 'k');
  p.rect(20, 34, 27, 44, 'N'); p.frame(19, 33, 28, 45); p.put(25, 39, 'y');                  // door
  p.rect(10, 30, 16, 35, 'y'); p.frame(9, 29, 17, 36); p.vline(13, 30, 35, 'k');             // windows
  p.rect(31, 30, 37, 35, 'y'); p.frame(30, 29, 38, 36); p.vline(34, 30, 35, 'k');
  p.rect(9, 37, 17, 38, v % 2 ? 'R' : 'l'); p.rect(30, 37, 38, 38, v % 2 ? 'l' : 'R');       // window boxes
}

// Blacksmith (48×48): stone forge, glowing furnace, anvil out front.
function blacksmith(p) {
  blocks(p, 5, 22, 42, 44, 's', 'S', 8, 5);
  p.frame(4, 21, 43, 45);
  for (let y = 6; y <= 21; y++) {
    const hw = 3 + (y - 6) * 1.35;
    for (let x = Math.round(23.5 - hw); x <= Math.round(23.5 + hw); x++) p.put(x, y, (y - 6) % 4 === 3 ? 'S' : 't');
  }
  p.hline(1, 46, 21, 'k');
  p.rect(33, 2, 39, 14, 'S'); p.frame(32, 1, 40, 14); p.rect(34, 0, 38, 1, 'R');           // chimney with fire
  p.rect(8, 28, 22, 40, 'k'); p.rect(10, 31, 20, 40, 'R'); p.rect(12, 34, 18, 40, 'y');      // forge mouth
  p.rect(27, 30, 38, 44, 'N'); p.frame(26, 29, 39, 45); p.put(36, 37, 'y');                  // door
  p.rect(2, 41, 11, 43, 'E'); p.rect(4, 44, 9, 46, 'E'); p.rect(0, 41, 2, 42, 'E');          // anvil
  p.vline(23, 10, 17, 'N'); p.rect(19, 9, 27, 11, 'e');                                      // hammer sign
}

// Chapel (48×72, stands on 2×2 tiles): white walls, a bell tower and a round window.
function chapel(p) {
  p.rect(6, 40, 41, 68, 'w'); p.frame(5, 39, 42, 69);
  for (let y = 26; y <= 39; y++) {
    const hw = 4 + (y - 26) * 1.45;
    for (let x = Math.round(23.5 - hw); x <= Math.round(23.5 + hw); x++) p.put(x, y, (y - 26) % 4 === 3 ? 'r' : 'q');
  }
  p.hline(2, 45, 39, 'k');
  // Bell tower with its bell and a cross on top.
  p.rect(17, 6, 30, 26, 'W'); p.frame(16, 5, 31, 26);
  p.rect(20, 10, 27, 18, 't'); p.disc(23.5, 15.5, 3, 'Y'); p.put(23, 18, 'y');
  for (let y = 0; y <= 5; y++) for (let x = 16 + Math.round(y * 1.2); x <= 31 - Math.round(y * 1.2); x++) p.put(x, 5 - y, 'q');
  p.vline(23, 0, 3, 'Y'); p.vline(24, 0, 3, 'Y'); p.hline(22, 25, 1, 'Y');
  p.disc(23.5, 47, 4.5, 'c'); p.disc(23.5, 47, 2, 'v');                                      // round window
  p.rect(19, 56, 28, 68, 'N'); p.frame(18, 55, 29, 69); p.disc(23.5, 56, 4.5, 'N');           // arched door
  p.rect(9, 50, 13, 58, 'c'); p.frame(8, 49, 14, 59); p.rect(34, 50, 38, 58, 'c'); p.frame(33, 49, 39, 59);
}

// Town Hall (72×72, 3×3 tiles): brick, white columns, a clock and a flag.
function townhall(p) {
  blocks(p, 4, 34, 67, 66, 'b', 'B', 9, 6);
  p.frame(3, 33, 68, 67);
  for (let y = 16; y <= 33; y++) {
    const hw = 6 + (y - 16) * 1.75;
    for (let x = Math.round(35.5 - hw); x <= Math.round(35.5 + hw); x++) p.put(x, y, (y - 16) % 4 === 3 ? 'R' : 'r');
  }
  p.hline(0, 71, 33, 'k');
  p.disc(35.5, 26, 5.5, 'w'); p.disc(35.5, 26, 4.5, 'W'); p.vline(35, 22, 26, 'k'); p.hline(35, 38, 26, 'k'); // clock
  p.vline(35, 2, 15, 'N'); p.rect(36, 2, 45, 8, 'u'); p.rect(36, 5, 45, 5, 'y');                             // flag
  for (const x of [10, 22, 46, 58]) { p.rect(x, 38, x + 3, 64, 'w'); p.vline(x + 3, 38, 64, 'W'); }           // columns
  p.rect(28, 46, 43, 66, 'N'); p.frame(27, 45, 44, 67); p.vline(35, 46, 66, 'k'); p.put(33, 56, 'y'); p.put(38, 56, 'y');
  p.rect(14, 42, 19, 48, 'y'); p.frame(13, 41, 20, 49); p.rect(52, 42, 57, 48, 'y'); p.frame(51, 41, 58, 49);
  p.rect(22, 67, 49, 69, 's'); p.rect(19, 70, 52, 71, 'S');                                                   // steps
}

// Market stall (48×36, 2×1 tiles): striped awning, a table of goods.
function stall(p, v = 0) {
  const stripe = v % 2 ? 'u' : 'r';
  p.vline(3, 6, 35, 'N'); p.vline(44, 6, 35, 'N');
  for (let x = 1; x <= 46; x++) p.vline(x, 4, 12, Math.floor((x - 1) / 5) % 2 ? 'w' : stripe);
  p.hline(1, 46, 13, 'k');
  p.rect(5, 24, 42, 30, 'n'); p.frame(4, 23, 43, 31); p.hline(5, 42, 26, 'N');
  const goods = v % 2 ? ['h', 'Y', 'h', 'Y'] : ['r', 'l', 'r', 'y'];
  goods.forEach((ch, i) => { p.disc(11 + i * 8.5, 21, 3.2, ch); });
}

// Lamp post (24×36): lit at night and during waves alike - it's always cosy.
function lamp(p) {
  p.vline(11, 10, 35, 't'); p.vline(12, 10, 35, 'S'); p.rect(9, 33, 14, 35, 't');
  p.rect(7, 2, 16, 9, 'y'); p.frame(6, 1, 17, 10); p.rect(9, 4, 14, 7, 'w'); p.hline(6, 17, 0, 't');
}

export const SHOP_ART = { petshop, store, tavern };
// Every village building: its art function and its picture size in pixels.
export const VILLAGE_ART = {
  petshop: [petshop, 48, 48], store: [store, 48, 48], tavern: [tavern, 48, 48],
  blacksmith: [blacksmith, 48, 48], chapel: [chapel, 48, 72], townhall: [townhall, 72, 72],
  cottage: [cottage, 48, 48], stall: [stall, 48, 36], lamp: [lamp, 24, 36],
};

export function villageRows(type, variant = 0) {
  const [draw, w, h] = VILLAGE_ART[type];
  const p = painter(w, h);
  draw(p, variant);
  p.outline();
  return p.rows();
}

export function shopRows(type) {
  return villageRows(type);
}

export function wellRows() {
  const p = painter(24, 24);
  well(p);
  p.outline();
  return p.rows();
}

// ---------- Pets (24×24, two frames) ----------

function dog(p, f) {
  p.rect(6, 12, 17, 17, 'h'); p.rect(14, 8, 20, 13, 'h'); p.rect(15, 6, 16, 8, 'n');
  p.put(18, 10, 'k'); p.put(20, 11, 'k'); p.rect(4, 10 - f, 6, 12, 'h');
  for (const x of [7, 10, 13, 16]) p.rect(x, 18, x + 1, 20 - ((x + f) % 2), 'h');
  p.put(9, 14, 'n'); p.put(12, 15, 'n');
}
function cat(p, f) {
  p.rect(7, 12, 16, 17, 'S'); p.rect(14, 8, 19, 13, 'S'); p.put(14, 7, 'S'); p.put(19, 7, 'S');
  p.put(16, 10, 'l'); p.put(18, 10, 'l'); p.put(17, 12, 'R');
  for (let i = 0; i < 6; i++) p.put(6 - Math.round(i * 0.3), 13 - i - f, 'S');
  for (const x of [8, 11, 13, 15]) p.rect(x, 18, x, 20 - ((x + f) % 2), 'S');
}
function owl(p, f) {
  p.disc(12, 13, 6, 'n'); p.disc(12, 15, 4, 'h');
  p.disc(10, 11, 2.2, 'w'); p.disc(14, 11, 2.2, 'w'); p.put(10, 11, 'k'); p.put(14, 11, 'k'); p.put(12, 13, 'y');
  p.put(8, 6, 'n'); p.put(16, 6, 'n');
  p.rect(5 - f, 12, 6, 16, 'N'); p.rect(18, 12, 19 + f, 16, 'N');
  p.put(10, 19, 'y'); p.put(14, 19, 'y');
}

export const PET_ART = { dog, cat, owl };

export function petRows(type, frame) {
  const p = painter(24, 24);
  PET_ART[type](p, frame);
  p.outline();
  return p.rows();
}
