// Resource buildings (2×2 tiles, 48×48) and tower looks per level, drawn in code.

import { PAL } from './art.js';
import { painter, blocks } from './paint.js';

const S = 48;

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

// Towers keep their shape but get sturdier materials as they level:
// wood and red roof (1–3), stone and blue roof (4–6), steel and green roof (7–9), gold (10).
export function towerPalette(level) {
  if (level >= 10) return { ...PAL, r: '#ffcd75', R: '#fff1b3', n: '#d9a033', N: '#8a5a12', s: '#f4f4f4', S: '#d9a033' };
  if (level >= 7) return { ...PAL, r: '#257179', R: '#38b764', n: '#9fb3c8', N: '#5b6e85', s: '#9fb3c8', S: '#5b6e85' };
  if (level >= 4) return { ...PAL, r: '#3b5dc9', R: '#41a6f6', n: '#94b0c2', N: '#566c86' };
  return PAL;
}

// The hero's pad (1 tile, flat): a round stone platform with a gold rim and a star in the middle.
export function padRows() {
  const p = painter(24, 24);
  p.disc(11.5, 13, 10.5, 'Y'); p.disc(11.5, 13, 9, 's'); p.disc(11.5, 13, 7, 'S'); p.disc(11.5, 13, 5.5, 's');
  for (const [x, y] of [[11, 9], [12, 9], [10, 12], [11, 11], [12, 11], [13, 12], [8, 13], [15, 13], [11, 14], [12, 14], [9, 16], [14, 16]]) p.put(x, y, 'y');
  p.outline();
  return p.rows();
}
