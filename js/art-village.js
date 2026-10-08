// The village to the south (scenery: the thing you protect): its buildings, cottages, the well and props. Drawn in code.

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

// ---------- Village props: fences, gardens, the market, the churchyard, the fields, the shore ----------

// Fence (24×24). v says which sides the rails leave the tile by: 'h' east+west, 'v' north+south, and the corners
// 'nw' (east+south), 'ne' (west+south), 'sw' (east+north), 'se' (west+north). A gate is simply a missing tile.
function fence(p, v = 'h') {
  const rails = (x0, x1) => { p.hline(x0, x1, 12, 'h'); p.hline(x0, x1, 13, 'N'); p.hline(x0, x1, 17, 'h'); p.hline(x0, x1, 18, 'N'); };
  const upright = (y0, y1) => { p.vline(11, y0, y1, 'h'); p.vline(12, y0, y1, 'N'); };
  const east = v === 'h' || v === 'nw' || v === 'sw', west = v === 'h' || v === 'ne' || v === 'se';
  const north = v === 'v' || v === 'sw' || v === 'se', south = v === 'v' || v === 'nw' || v === 'ne';
  if (west) rails(0, 12);
  if (east) rails(12, 23);
  if (north) upright(0, 12);
  if (south) upright(12, 23);
  p.rect(10, 8, 13, 21, 'n'); p.vline(13, 8, 21, 'N'); p.hline(10, 13, 7, 'h'); // the post
}

// Flower bed (24×24): a patch of green with five blooms; v picks the colours.
function flowerbed(p, v = 0) {
  p.rect(2, 13, 21, 22, 'G'); p.hline(2, 21, 22, 'N'); p.hline(3, 20, 14, 'g');
  const cols = ['R', 'y', 'w'];
  [[5, 11], [11, 8], [17, 11], [8, 16], [15, 16]].forEach(([x, y], i) => {
    const ch = cols[(v + i) % 3];
    p.vline(x, y + 2, y + 4, 'G');
    p.put(x, y, ch); p.put(x - 1, y + 1, ch); p.put(x + 1, y + 1, ch); p.put(x, y + 2, ch); p.put(x, y + 1, 'Y');
  });
}

function bench(p) {
  p.rect(2, 1, 21, 2, 'h'); p.put(3, 3, 'n'); p.put(20, 3, 'n');
  p.rect(2, 6, 21, 8, 'h'); p.hline(2, 21, 8, 'n');
  p.rect(3, 9, 4, 14, 'N'); p.rect(19, 9, 20, 14, 'N');
}

// Cart (48×36, 2×1): a hay load on a wooden bed, two wheels, shafts.
function cart(p) {
  p.rect(10, 8, 37, 13, 'Y');
  for (const [x, y] of [[12, 9], [20, 10], [28, 9], [34, 11], [16, 12]]) p.put(x, y, 'y');
  p.rect(6, 14, 41, 25, 'n'); p.hline(6, 41, 18, 'N'); p.hline(6, 41, 22, 'N'); p.rect(5, 12, 42, 13, 'h');
  p.rect(0, 18, 5, 19, 'N');
  for (const x of [12, 36]) { p.disc(x, 29, 5.5, 'N'); p.disc(x, 29, 3.5, 'n'); p.put(x, 29, 'N'); }
}

function hay(p) {
  p.rect(3, 9, 20, 21, 'Y');
  for (const [x, y] of [[3, 9], [20, 9], [3, 21], [20, 21]]) p.put(x, y, '.');
  p.hline(4, 19, 12, 'y'); p.hline(4, 19, 17, 'y'); p.vline(8, 9, 21, 'n'); p.vline(15, 9, 21, 'n');
}

// Signpost (24×36): an arrow board on a post.
function signpost(p) {
  p.rect(11, 6, 12, 35, 'N');
  p.rect(3, 9, 18, 16, 'h'); p.frame(2, 8, 19, 17); p.put(20, 12, 'h'); p.put(21, 12, 'h');
  p.hline(5, 8, 12, 'k'); p.hline(10, 12, 12, 'k'); p.hline(14, 16, 12, 'k');
}

function crates(p) {
  p.rect(2, 12, 13, 21, 'n'); p.frame(1, 11, 14, 22); p.vline(7, 12, 21, 'N'); p.hline(2, 13, 16, 'N');
  p.rect(8, 3, 18, 11, 'h'); p.frame(7, 2, 19, 12); p.vline(13, 3, 11, 'N');
}

function barrel(p) {
  p.rect(6, 5, 17, 22, 'n');
  for (const [x, y] of [[6, 5], [17, 5], [6, 22], [17, 22]]) p.put(x, y, '.');
  p.vline(9, 5, 22, 'N'); p.vline(14, 5, 22, 'N'); p.hline(6, 17, 8, 'E'); p.hline(6, 17, 19, 'E'); p.rect(7, 3, 16, 5, 'h');
}

// A small tree in a tub (24×36), for the civic square.
function tubtree(p) {
  p.disc(11.5, 13, 7, 'G'); p.disc(10, 11, 4, 'g'); p.put(8, 10, 'l');
  p.rect(11, 19, 12, 26, 'N');
  p.rect(7, 27, 16, 34, 'n'); p.frame(6, 26, 17, 35); p.hline(7, 16, 30, 'E');
}

// Washing line (48×24, 2×1): three shirts pegged between two posts.
function washline(p) {
  p.rect(2, 2, 3, 22, 'N'); p.rect(44, 2, 45, 22, 'N'); p.hline(4, 43, 5, 'k');
  for (const [x, ch] of [[9, 'w'], [21, 'u'], [33, 'r']]) {
    p.rect(x, 6, x + 6, 13, ch); p.put(x - 1, 7, ch); p.put(x + 7, 7, ch); p.rect(x + 2, 4, x + 4, 5, 'k');
  }
}

function gravestone(p) {
  p.disc(11.5, 9.5, 3.5, 's'); p.rect(8, 9, 15, 21, 's'); p.vline(15, 9, 21, 'S');
  p.hline(10, 13, 13, 'k'); p.hline(10, 13, 16, 'k');
  p.put(6, 21, 'l'); p.put(17, 20, 'l');
}

// Trees (24×36): a dark pointed yew for the churchyard, a round fruit tree for the orchard.
function yew(p) {
  p.rect(10, 25, 13, 34, 'N'); p.vline(13, 25, 34, 'n');
  p.disc(11.5, 18, 8, 'G'); p.disc(11.5, 11, 6, 'G'); p.disc(11.5, 5, 3.5, 'G'); p.disc(9.5, 15, 3.5, 'g');
}
function fruittree(p) {
  p.rect(10, 25, 13, 34, 'N'); p.vline(13, 25, 34, 'n');
  p.disc(11.5, 16, 9, 'G'); p.disc(9.5, 13, 5, 'g');
  for (const [x, y] of [[6, 14], [13, 10], [17, 17], [10, 20], [15, 14]]) p.put(x, y, 'R');
}

// A clump of wheat (24×24) for the ploughed field.
function crop(p) {
  for (const [x, y] of [[6, 10], [12, 7], [18, 10]]) { p.vline(x, y, 22, 'Y'); p.rect(x - 1, y - 4, x + 1, y, 'y'); p.vline(x, y - 3, y - 1, 'D'); }
}

// A duck (24×24) on the pond, with a ripple.
function duck(p) {
  p.hline(7, 17, 22, 'c');
  p.disc(12, 18, 3.5, 'w'); p.disc(15.5, 14.5, 2, 'w'); p.put(18, 15, 'R'); p.put(16, 14, 'k'); p.put(11, 18, 'W');
}

// A wooden dock (96×24, 4×1) out over the ocean, and a rowing boat with a sail (48×24, 2×1).
function dock(p) {
  p.rect(0, 6, 95, 17, 'h');
  for (let x = 5; x < 96; x += 6) p.vline(x, 6, 17, 'n');
  p.hline(0, 95, 17, 'N');
  for (const x of [2, 46, 91]) p.rect(x, 10, x + 2, 22, 'N');
  p.disc(70, 12, 2.5, 'Y');
}
function boat(p) {
  p.rect(4, 11, 43, 20, 'n'); p.put(4, 20, '.'); p.put(43, 20, '.');
  p.hline(3, 44, 10, 'N'); p.hline(5, 42, 15, 'N'); p.rect(20, 12, 27, 13, 'h');
  p.vline(23, 0, 10, 'N'); p.rect(24, 2, 33, 8, 'w');
}

// Every village building and prop: its art function and its picture size in pixels. Pictures stand on the
// bottom edge of their footprint, centred, so tall ones overhang the tile behind.
export const VILLAGE_ART = {
  petshop: [petshop, 48, 48], store: [store, 48, 48], tavern: [tavern, 48, 48],
  chapel: [chapel, 48, 72], townhall: [townhall, 72, 72],
  cottage: [cottage, 48, 48], stall: [stall, 48, 36], lamp: [lamp, 24, 36],
  fence: [fence, 24, 24], flowerbed: [flowerbed, 24, 24], bench: [bench, 24, 16], cart: [cart, 48, 36],
  hay: [hay, 24, 24], signpost: [signpost, 24, 36], crates: [crates, 24, 24], barrel: [barrel, 24, 24],
  tubtree: [tubtree, 24, 36], washline: [washline, 48, 24], gravestone: [gravestone, 24, 24],
  yew: [yew, 24, 36], fruittree: [fruittree, 24, 36], crop: [crop, 24, 24], duck: [duck, 24, 24],
  dock: [dock, 96, 24], boat: [boat, 48, 24],
};

export function villageRows(type, variant = 0) {
  const [draw, w, h] = VILLAGE_ART[type];
  const p = painter(w, h);
  draw(p, variant);
  p.outline();
  return p.rows();
}

export function wellRows() {
  const p = painter(24, 24);
  well(p);
  p.outline();
  return p.rows();
}

