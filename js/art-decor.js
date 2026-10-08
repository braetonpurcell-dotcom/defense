// Looks: base themes (recolour the House and walls) and decorations (no stats, just style).
// Some are cute, some are menacing — players pick their vibe.

import { PAL } from './art.js';
import { painter } from './paint.js';

// ---------- Themes (art packs) ----------
// Each theme overrides palette letters used by the House, wall and decoration art.
// Classic is the game's main style and free. The rest are art packs bought in the store with gems.
// tag: what kind of base it suits, shown in the store.
export const THEMES = [
  { id: 'classic', name: 'Classic', price: 0, tag: 'THE ORIGINAL', pal: {} },
  { id: 'meadow', name: 'Meadow', price: 10, tag: 'SOFT AND GREEN', pal: {
    r: '#7ac74f', R: '#b8e986', q: '#4f8a3a', w: '#fffbe8', W: '#efe6c4', y: '#ffe08a',
    n: '#c49a6c', N: '#8a6440', h: '#e3c497', s: '#d9f0c8', S: '#a8cf8f', t: '#6e9a5a',
    b: '#e8c27a', B: '#b08a48', z: '#e6efd8', Z: '#b6c9a2',
  } },
  { id: 'candy', name: 'Candy', price: 15, tag: 'CUTE AND PINK', pal: {
    k: '#5a2a4a', r: '#ff77a8', R: '#ffb3d1', q: '#c2457a', w: '#fff7fb', W: '#fde2f3', y: '#fff1a8', Y: '#ffd166',
    n: '#f4a6c6', N: '#c96b97', h: '#ffd1e3', s: '#fde2f3', S: '#e8a0c8', t: '#a05c8a',
    b: '#ff9ec7', B: '#d6609a', e: '#d9c6ff', E: '#a58ad6', o: '#b48ce8', O: '#7a52b8', z: '#ffe1f0', Z: '#e8b2cf', v: '#9ff0ff',
  } },
  { id: 'midnight', name: 'Midnight', price: 25, tag: 'DARK AND NEON', pal: {
    r: '#3a1d5c', R: '#7b3fbf', q: '#22103a', w: '#4a4d6a', W: '#36384f', y: '#7df9ff', Y: '#3fc6d6',
    n: '#2b2b3a', N: '#18181f', h: '#44445a', s: '#3c3f58', S: '#26283a', t: '#15161f',
    b: '#3a2a4a', B: '#22182c', e: '#3a4a66', E: '#202a3c', z: '#3a3c4e', Z: '#25263a', v: '#c86bff',
  } },
  { id: 'inferno', name: 'Inferno', price: 30, tag: 'FIRE AND IRON', pal: {
    r: '#8a1c1c', R: '#ff5a1f', q: '#4a0d0d', w: '#6a5050', W: '#4a3838', y: '#ffb020', Y: '#ff7a00',
    n: '#5a2a1a', N: '#2e140c', h: '#7a3a22', s: '#4a3a3a', S: '#2e2222', t: '#170f0f',
    b: '#6a1e14', B: '#3a0e08', e: '#5a4a4a', E: '#2e2424', z: '#3a2e2e', Z: '#221a1a', v: '#ff3d1f',
  } },
  { id: 'royal', name: 'Royal', price: 40, tag: 'GOLD AND GLORY', pal: {
    r: '#2a3a8a', R: '#4f6ae0', q: '#18225a', w: '#fffaf0', W: '#efe4c8', y: '#ffd700', Y: '#d4a017',
    n: '#d4a017', N: '#8a6410', h: '#ffe680', s: '#f2ecdc', S: '#c9bc98', t: '#7a6a44',
    b: '#e8dcc0', B: '#b8a678', e: '#ffe680', E: '#c9a227', z: '#f2ecdc', Z: '#c9bc98', v: '#ffd700',
  } },
];
export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
export const themePalette = (id) => ({ ...PAL, ...themeById(id).pal });

// ---------- Decorations (24×24, 1 tile) ----------

function flowers(p) {
  for (const [x, y, c] of [[6, 14, 'R'], [12, 10, 'y'], [17, 15, 'w'], [9, 18, 'y'], [16, 8, 'r'], [5, 9, 'w']]) {
    p.vline(x, y + 1, y + 5, 'G');
    p.put(x, y - 1, c); p.put(x - 1, y, c); p.put(x + 1, y, c); p.put(x, y + 1, c); p.put(x, y, 'Y');
  }
  p.rect(3, 19, 20, 21, 'n'); p.hline(3, 20, 19, 'h');
}

function lantern(p) {
  p.vline(11, 4, 20, 'N'); p.vline(12, 4, 20, 'n');
  p.hline(8, 15, 4, 'N');
  p.rect(7, 6, 10, 12, 'y'); p.frame(6, 5, 11, 13); p.put(8, 7, 'w');
  p.rect(14, 6, 17, 12, 'y'); p.frame(13, 5, 18, 13); p.put(15, 7, 'w');
  p.rect(8, 20, 15, 21, 'S');
}

function banner(p) {
  p.vline(6, 2, 21, 'N'); p.put(6, 1, 'y');
  p.rect(7, 3, 18, 12, 'r'); p.hline(7, 18, 3, 'R');
  p.put(18, 13, 'r'); p.put(16, 13, 'r'); p.put(14, 13, 'r'); p.put(12, 13, 'r'); p.put(10, 13, 'r'); p.put(8, 13, 'r');
  p.rect(11, 6, 14, 9, 'y'); p.put(12, 7, 'Y');
  p.rect(4, 21, 8, 22, 'S');
}

function skulls(p) {
  p.vline(11, 3, 21, 'N'); p.vline(12, 3, 21, 'n');
  for (const [cx, cy] of [[11.5, 6], [11.5, 13]]) {
    p.disc(cx, cy, 3.6, 'w');
    p.put(Math.floor(cx) - 1, cy, 'k'); p.put(Math.floor(cx) + 2, cy, 'k');
    p.hline(Math.floor(cx) - 1, Math.floor(cx) + 2, cy + 3, 'W');
  }
  p.hline(8, 15, 10, 'r');
  p.rect(8, 20, 15, 22, 'S');
}

function crystal(p) {
  for (const [x0, h, c, l] of [[6, 10, 'M', 'v'], [10, 16, 'o', 'v'], [15, 8, 'M', 'c']]) {
    for (let y = 0; y < h; y++) {
      const w = Math.max(1, Math.min(3, Math.round((h - y) / 3)));
      p.hline(x0 - w + 2, x0 + w + 1, 20 - y, y > h - 3 ? l : c);
    }
    p.put(x0 + 1, 20 - h + 2, 'w');
  }
  p.rect(4, 20, 19, 22, 'S');
}

function gnome(p) {
  p.rect(9, 3, 14, 4, 'r'); p.rect(8, 5, 15, 8, 'r'); p.put(11, 2, 'r'); p.put(12, 1, 'R');
  p.rect(9, 9, 14, 11, 'p'); p.put(10, 10, 'k'); p.put(13, 10, 'k');
  p.rect(8, 12, 15, 15, 'w'); p.put(11, 15, 'W');
  p.rect(8, 15, 15, 19, 'u'); p.rect(8, 20, 10, 21, 'N'); p.rect(13, 20, 15, 21, 'N');
}

export const DECOR_ART = { flowers, lantern, banner, skulls, crystal, gnome };

export function decorRows(type) {
  const p = painter(24, 24);
  DECOR_ART[type](p);
  p.outline();
  return p.rows();
}
