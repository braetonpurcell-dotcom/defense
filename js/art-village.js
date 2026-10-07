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

export const SHOP_ART = { petshop, store, tavern };

export function shopRows(type) {
  const p = painter(48, 48);
  SHOP_ART[type](p);
  p.outline();
  return p.rows();
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
