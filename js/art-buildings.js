// Resource buildings (2×2 tiles, 48×48) and tower looks per level, drawn in code.

import { PAL } from './art.js';
import { painter, blocks } from './paint.js';

const S = 48;

function quarry(p) {
  // Rocky pit with a mine cart of gold and a pickaxe.
  p.disc(24, 28, 19, 'S');
  p.disc(24, 28, 15, 't');
  p.disc(24, 30, 11, 'k');
  p.disc(23, 29, 9, 'm');
  for (const [x, y, r] of [[9, 20, 5], [37, 18, 6], [12, 38, 5], [38, 37, 5], [24, 11, 5]]) {
    p.disc(x, y, r, 's'); p.disc(x - 1, y - 1, r - 2, 'W'); p.put(x + 1, y + 1, 'S');
  }
  // Mine cart.
  p.rect(16, 25, 31, 33, 'N'); p.hline(16, 31, 25, 'n'); p.frame(15, 24, 32, 34);
  for (const [x, y] of [[18, 22], [21, 21], [24, 22], [27, 21], [29, 23], [22, 23]]) { p.rect(x, y, x + 2, y + 2, 'y'); p.put(x, y, 'Y'); }
  p.rect(17, 35, 19, 37, 'k'); p.rect(28, 35, 30, 37, 'k');
  // Pickaxe.
  p.vline(40, 6, 18, 'n'); p.hline(35, 45, 6, 'S'); p.put(35, 7, 'S'); p.put(45, 7, 'S');
}

function farm(p) {
  // Fenced plot with crop rows.
  p.rect(3, 6, 44, 43, 'D');
  for (let y = 9; y <= 40; y += 6) {
    for (let x = 6; x <= 41; x += 3) {
      p.vline(x, y, y + 3, 'G'); p.put(x, y, 'y'); p.put(x + 1, y + 1, 'l');
      p.put(x, y - 1, 'Y');
    }
    p.hline(5, 42, y + 4, 'd');
  }
  // Fence.
  for (const y of [4, 44]) { p.hline(1, 46, y, 'h'); p.hline(1, 46, y + 1, 'N'); }
  for (let x = 1; x <= 46; x += 5) p.vline(x, 2, 46, 'n');
  p.vline(1, 2, 46, 'n'); p.vline(46, 2, 46, 'n');
  // Scarecrow.
  p.vline(36, 10, 24, 'N'); p.hline(31, 41, 14, 'N'); p.rect(34, 6, 38, 10, 'y'); p.rect(33, 5, 39, 6, 'n'); p.rect(34, 15, 38, 20, 'r');
}

function lab(p) {
  // Small stone lab with a glass dome and a bubbling flask sign.
  blocks(p, 6, 22, 41, 44, 's', 'S', 6, 4);
  p.frame(5, 21, 42, 45);
  p.disc(24, 21, 13, 'v');
  p.disc(24, 21, 10.5, 'c');
  p.disc(20, 17, 3, 'w');
  p.hline(9, 39, 21, 'k'); p.rect(9, 22, 39, 23, 'S');
  for (let y = 0; y <= 22; y++) for (let x = 0; x < S; x++) if (y > 21 && p.get(x, y) === 'c') p.put(x, y, 's');
  // Door and window.
  p.rect(20, 33, 27, 44, 'E'); p.frame(19, 32, 28, 45); p.put(26, 39, 'y');
  p.rect(9, 28, 15, 33, 'l'); p.frame(8, 27, 16, 34);
  // Flask sign.
  p.rect(32, 27, 39, 36, 'k'); p.rect(34, 28, 37, 30, 'w'); p.rect(33, 31, 38, 35, 'l'); p.put(35, 32, 'w');
  // Antenna with a spark.
  p.vline(35, 2, 10, 'S'); p.put(35, 1, 'v'); p.put(34, 2, 'v'); p.put(36, 2, 'v');
}

function dock(p) {
  // 1×1: a wooden pier. The fisher is drawn separately at full person size, standing on it.
  p.rect(1, 6, 22, 21, 'h');
  for (let y = 6; y <= 21; y += 4) p.hline(1, 22, y, 'n');
  p.vline(1, 6, 21, 'N'); p.vline(22, 6, 21, 'N');
  for (const [x, y] of [[2, 22], [20, 22], [2, 3], [20, 3]]) p.rect(x, y, x + 1, y + 2, 'N');
  p.rect(16, 15, 20, 19, 'n'); p.frame(15, 14, 21, 20); p.put(18, 16, 'c'); // bucket of fish
}

// The Archer Tower: takes 1 tile but stands 40px tall (it overhangs the tile behind it),
// so it reads as a tower next to the 3×3 House. Stone base, wooden lookout, roof, archer.
export const TOWER_H = 40;
export function towerRows() {
  const p = painter(24, TOWER_H);
  // Stone base (bottom 16px).
  for (let y = 24; y <= 38; y++) for (let x = 5; x <= 18; x++) {
    const row = y - 24;
    p.put(x, y, row % 4 === 3 || (x + (Math.floor(row / 4) % 2) * 3) % 6 === 0 ? 'S' : 's');
  }
  p.rect(10, 31, 13, 38, 'k'); p.rect(11, 32, 12, 38, 'N'); // door
  // Wooden lookout with an opening, and the archer in it.
  p.rect(3, 14, 20, 23, 'n'); p.hline(3, 20, 14, 'h'); p.hline(3, 20, 23, 'N');
  for (let x = 3; x <= 20; x += 4) p.vline(x, 15, 22, 'N');
  p.rect(7, 16, 16, 20, 'k');
  p.rect(10, 15, 13, 17, 'p'); p.hline(10, 13, 15, 'N'); p.put(11, 16, 'k'); p.put(12, 16, 'k');
  p.rect(9, 18, 14, 20, 'u');
  p.vline(16, 12, 20, 'N'); p.put(15, 12, 'N'); p.put(15, 20, 'N'); p.vline(17, 13, 19, 'w'); // bow
  // Roof.
  for (let y = 2; y <= 12; y++) {
    const hw = 1 + y;
    for (let x = 11 - hw; x <= 12 + hw; x++) p.put(x, y, y % 3 === 2 ? 'R' : 'r');
  }
  p.hline(0, 23, 13, 'k');
  p.vline(11, 0, 2, 'N'); p.rect(12, 0, 15, 1, 'y');
  p.outline();
  return p.rows();
}

const DRAW = { quarry, farm, lab, dock };
const SIZES = { dock: 24 };

export function buildingRows(type) {
  const size = SIZES[type] || S;
  const p = painter(size, size);
  DRAW[type](p);
  p.outline();
  return p.rows();
}

// Farm crops by state: growing (green sprouts), ready (golden, the base art), wilted (brown).
export const FARM_STATES = ['growing', 'ready', 'wilted'];
export function farmPalette(state) {
  if (state === 'growing') return { ...PAL, y: '#a7f070', Y: '#38b764', r: '#a7f070' };
  if (state === 'wilted') return { ...PAL, y: '#8d6a3a', Y: '#5a3a1f', G: '#5a3a1f', l: '#8d6a3a', r: '#8d6a3a' };
  return PAL;
}

// Towers keep their shape but get sturdier materials as they level:
// wood and red roof (1–3), stone and blue roof (4–6), steel and green roof (7–9), gold (10).
export function towerPalette(level) {
  if (level >= 10) return { ...PAL, r: '#ffcd75', R: '#fff1b3', n: '#d9a033', N: '#8a5a12', s: '#f4f4f4', S: '#d9a033' };
  if (level >= 7) return { ...PAL, r: '#257179', R: '#38b764', n: '#9fb3c8', N: '#5b6e85', s: '#9fb3c8', S: '#5b6e85' };
  if (level >= 4) return { ...PAL, r: '#3b5dc9', R: '#41a6f6', n: '#94b0c2', N: '#566c86' };
  return PAL;
}
