// The player character: 24×24, four directions × two walking frames, drawn in code.
// Colours are customisable: skin (p), hair (N), shirt (u), trousers (C).

import { PAL } from './art.js';
import { painter } from './paint.js';

export const HERO_DEFAULT = { skin: '#f4c8a0', hair: '#5a3a1f', shirt: '#38b764', pants: '#29366f' };

// Colour choices on the "YOUR LOOK" screen (free; outfits may come with art packs later).
export const LOOK_PARTS = [
  { key: 'skin', name: 'SKIN', options: ['#f4c8a0', '#e8b088', '#c8955a', '#a0704a', '#7a5236', '#5a3a26'] },
  { key: 'hair', name: 'HAIR', options: ['#5a3a1f', '#1a1c2c', '#d9a033', '#ffcd75', '#b13e53', '#ef7d57', '#f4f4f4', '#7a2f8f', '#41a6f6', '#38b764'] },
  { key: 'shirt', name: 'SHIRT', options: ['#38b764', '#3b5dc9', '#b13e53', '#ffcd75', '#f4a6c6', '#7a2f8f', '#1a1c2c', '#f4f4f4', '#ef7d57', '#41a6f6', '#257179'] },
  { key: 'pants', name: 'TROUSERS', options: ['#29366f', '#1a1c2c', '#5a3a1f', '#566c86', '#b13e53', '#257179', '#c8955a', '#f4a6c6'] },
];

export const heroPalette = (look) => ({ ...PAL, p: look.skin, N: look.hair, u: look.shirt, C: look.pants });

function legs(p, frame, side) {
  if (side) {
    // Side view: legs scissor.
    const a = frame ? 1 : -1;
    p.rect(10 + a, 17, 12 + a, 20, 'C'); p.rect(12 - a, 17, 14 - a, 20, 'C');
    p.hline(10 + a, 12 + a, 21, 'k'); p.hline(12 - a, 14 - a, 21, 'k');
    return;
  }
  const up = frame ? 1 : 0;
  p.rect(8, 17, 11, 20 - up, 'C'); p.rect(12, 17, 15, 20 - (1 - up), 'C');
  p.hline(8, 11, 21 - up, 'k'); p.hline(12, 15, 21 - (1 - up), 'k');
}

function front(p, frame) {
  p.rect(7, 3, 16, 6, 'N'); p.rect(6, 5, 7, 8, 'N'); p.rect(16, 5, 17, 8, 'N'); // hair
  p.rect(8, 6, 15, 10, 'p'); p.hline(8, 15, 6, 'N');
  p.put(9, 8, 'k'); p.put(14, 8, 'k'); p.hline(11, 12, 10, 'q');               // face
  p.rect(7, 11, 16, 16, 'u'); p.hline(7, 16, 11, 'w');                         // shirt + collar
  p.rect(5, 12, 6, 15 + frame, 'u'); p.rect(17, 12, 18, 16 - frame, 'u');      // arms swing
  p.put(5, 16 + frame, 'p'); p.put(18, 17 - frame, 'p');
  legs(p, frame, false);
}

function back(p, frame) {
  p.rect(7, 3, 16, 10, 'N'); p.rect(6, 5, 17, 8, 'N');
  p.rect(7, 11, 16, 16, 'u');
  p.rect(5, 12, 6, 16 - frame, 'u'); p.rect(17, 12, 18, 15 + frame, 'u');
  p.put(5, 17 - frame, 'p'); p.put(18, 16 + frame, 'p');
  legs(p, frame, false);
}

function side(p, frame) {
  p.rect(8, 3, 15, 6, 'N'); p.rect(7, 5, 9, 9, 'N');
  p.rect(10, 6, 16, 10, 'p'); p.put(15, 8, 'k'); p.put(16, 9, 'p');
  p.rect(9, 11, 15, 16, 'u');
  const swing = frame ? 1 : -1;
  p.rect(11 + swing, 12, 12 + swing, 15, 'u'); p.put(11 + swing, 16, 'p');
  legs(p, frame, true);
}

// dir: 'down' | 'up' | 'left' | 'right'; frame: 0 or 1.
export function heroRows(dir, frame) {
  const p = painter(24, 24);
  if (dir === 'up') back(p, frame);
  else if (dir === 'down') front(p, frame);
  else side(p, frame);
  p.outline();
  const rows = p.rows();
  return dir === 'left' ? rows.map((r) => [...r].reverse().join('')) : rows;
}
