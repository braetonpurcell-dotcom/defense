// Art for run cards: the towers and traps you place, and icons for blessings. Drawn in code.

import { painter } from './paint.js';

function crossbow(p) {
  // Stilt hut with a green pennant.
  for (const x of [6, 17]) p.vline(x, 12, 21, 'N');
  p.hline(6, 17, 17, 'N');
  p.rect(5, 6, 18, 12, 'n'); p.hline(5, 18, 6, 'h'); p.rect(9, 8, 14, 10, 'k'); p.put(11, 9, 'p'); p.put(12, 9, 'p');
  p.rect(4, 4, 19, 5, 'N');
  p.vline(18, 0, 4, 'N'); p.rect(19, 0, 22, 2, 'G'); p.put(21, 1, 'l');
}

function cannon(p) {
  // 2×2: square stone base, black barrel pointing up.
  p.rect(6, 18, 41, 44, 's');
  for (let y = 22; y <= 44; y += 5) p.hline(6, 41, y, 'S');
  for (let x = 12; x <= 41; x += 8) p.vline(x, 18, 44, 'S');
  p.rect(4, 14, 43, 18, 'S'); p.hline(4, 43, 14, 'W');
  p.rect(18, 10, 29, 22, 'k'); p.rect(19, 6, 28, 12, 't'); p.rect(20, 2, 27, 6, 'k'); p.rect(21, 3, 26, 5, 't');
  p.disc(14, 25, 3.5, 'N'); p.disc(33, 25, 3.5, 'N'); p.put(14, 25, 'n'); p.put(33, 25, 'n');
}

function frost(p) {
  p.rect(10, 15, 13, 21, 'S'); p.rect(7, 20, 16, 22, 't');
  for (let y = 0; y < 13; y++) {
    const w = Math.min(4, Math.round(y < 5 ? y : (13 - y) / 2));
    p.hline(11 - w, 12 + w, 2 + y, y < 6 ? 'w' : 'c');
  }
  p.vline(11, 4, 12, 'w'); p.put(9, 7, 'w'); p.put(14, 9, 'w');
  p.put(4, 5, 'w'); p.put(19, 3, 'w'); p.put(18, 11, 'c');
}

function ballista(p) {
  // 2×2: wooden swivel with a big crossbow.
  p.rect(14, 30, 33, 42, 'N'); p.rect(12, 42, 35, 44, 'S'); p.hline(14, 33, 30, 'n');
  p.disc(24, 28, 6, 'n'); p.disc(24, 28, 3, 'N');
  for (let i = 0; i < 16; i++) { p.put(24 - i, 20 - Math.round(i / 3), 'n'); p.put(24 + i, 20 - Math.round(i / 3), 'n'); p.put(24 - i, 21 - Math.round(i / 3), 'N'); p.put(24 + i, 21 - Math.round(i / 3), 'N'); }
  p.hline(9, 39, 15, 'w');
  p.rect(23, 4, 24, 26, 'h'); p.put(23, 3, 'S'); p.put(24, 3, 'S'); p.rect(22, 1, 25, 2, 's');
}

function lightning(p) {
  p.vline(11, 5, 21, 'D'); p.vline(12, 5, 21, 'y');
  p.rect(8, 20, 15, 22, 'S');
  p.disc(12, 4, 3, 'c'); p.put(12, 4, 'w');
  for (const [x, y] of [[6, 2], [17, 1], [4, 7], [19, 7], [15, 9]]) p.put(x, y, 'v');
}

function brazier(p) {
  p.vline(8, 14, 21, 'k'); p.vline(15, 14, 21, 'k');
  p.rect(5, 11, 18, 15, 't'); p.hline(5, 18, 11, 'S');
  p.disc(11.5, 8, 5, 'R'); p.disc(11.5, 9, 3.5, 'y'); p.disc(11.5, 10, 1.6, 'w');
  p.put(8, 3, 'R'); p.put(14, 2, 'R'); p.put(11, 1, 'y');
}

function spikes(p) {
  p.disc(11.5, 13, 8, 'k'); p.disc(11.5, 13, 6.5, 'm');
  for (const x of [8, 12, 16]) { p.vline(x, 8, 15, 's'); p.put(x, 7, 'w'); }
}

function bomb(p) {
  p.disc(11.5, 13, 7, 'k'); p.disc(10, 11, 2.5, 't'); p.put(9, 10, 'S');
  p.rect(11, 4, 12, 6, 'S'); p.put(13, 3, 'n'); p.put(14, 2, 'n'); p.put(15, 1, 'R'); p.put(16, 1, 'y'); p.put(15, 0, 'y');
}

function tar(p) {
  p.disc(11.5, 13, 8.5, 'k'); p.disc(11.5, 13, 7.5, 'm'); p.disc(9, 11, 2, 't'); p.disc(14, 15, 1.4, 't'); p.put(8, 10, 'S');
}

function scarecrow(p) {
  p.vline(11, 6, 22, 'N'); p.vline(12, 6, 22, 'n');
  p.hline(3, 20, 10, 'N');
  p.rect(7, 9, 16, 16, 'r'); p.hline(7, 16, 12, 'R'); p.put(9, 14, 'q'); p.put(14, 14, 'q');
  for (const x of [3, 4, 19, 20]) p.put(x, 11, 'y');
  p.disc(11.5, 4.5, 4, 'R'); p.put(10, 4, 'k'); p.put(13, 4, 'k'); p.hline(10, 13, 6, 'k'); p.put(11, 0, 'G');
}

// Blessing icons (shown on cards, not placed).
function arrows(p) {
  for (const x of [6, 11, 16]) { p.vline(x, 6, 20, 'n'); p.rect(x - 1, 3, x + 1, 5, 'y'); p.put(x, 2, 'y'); p.put(x - 1, 19, 'w'); p.put(x + 1, 19, 'w'); }
}
function hawkeye(p) {
  p.disc(11.5, 12, 8, 'w'); p.disc(11.5, 12, 5, 'Y'); p.disc(11.5, 12, 2.5, 'k'); p.put(10, 10, 'w');
}
function poison(p) {
  p.rect(9, 3, 14, 6, 'S'); p.disc(11.5, 14, 6.5, 'l'); p.disc(11.5, 15, 4.5, 'G'); p.put(9, 12, 'w');
  p.put(18, 18, 'l'); p.put(18, 19, 'l'); p.put(5, 20, 'l');
}
function stonemason(p) {
  p.rect(4, 4, 15, 9, 'S'); p.hline(4, 15, 4, 's'); p.rect(9, 9, 11, 21, 'n'); p.rect(15, 5, 19, 8, 'S');
}
function secondwind(p) {
  p.disc(8, 10, 4, 'r'); p.disc(15, 10, 4, 'r');
  for (let y = 0; y < 8; y++) p.hline(4 + y, 19 - y, 12 + y, 'r');
  p.put(7, 8, 'w'); p.put(8, 8, 'w');
  for (const [x, y] of [[2, 2], [21, 2], [1, 12], [22, 12], [11, 0]]) p.put(x, y, 'y');
}

const ART = {
  crossbow: [24, crossbow], cannon: [48, cannon], frost: [24, frost], ballista: [48, ballista],
  lightning: [24, lightning], brazier: [24, brazier], spikes: [24, spikes], bomb: [24, bomb],
  tar: [24, tar], scarecrow: [24, scarecrow],
  arrows: [24, arrows], hawkeye: [24, hawkeye], poison: [24, poison], stonemason: [24, stonemason], secondwind: [24, secondwind],
};

export const hasCardArt = (type) => !!ART[type];

export function cardRows(type) {
  const [size, draw] = ART[type];
  const p = painter(size, size);
  draw(p);
  p.outline();
  return p.rows();
}
