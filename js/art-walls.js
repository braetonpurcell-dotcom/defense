// Walls, levels 1–10. Every level joins up with its neighbours the same way:
// a flat top seen from above, with a front face on any side that ends inside the tile.
//
// mask: which neighbours are walls too: 1 = north, 2 = east, 4 = south, 8 = west.

import { hash } from './art.js';
import { painter } from './paint.js';

export const WALL_N = 1, WALL_E = 2, WALL_S = 4, WALL_W = 8;

const SIZE = 24, TOP_Y = 3, BOTTOM_Y = 14, FACE_H = 7;

// Brick-ish face pattern: mortar every bh rows and every bw columns, offset on alternate rows.
const bricks = (base, mortar, bw, bh) => (x, row) => {
  const shift = (Math.floor(row / bh) % 2) * Math.floor(bw / 2);
  return row % bh === bh - 1 || (x + shift) % bw === 0 ? mortar : base;
};

// thick: half-width of the wall top (bigger = chunkier). top/edge/fleck: colours of the top.
// face(x, row): the front face, row 0 just under the top. topDeco(x, y, mask): extra detail on the top.
export const WALL_LEVELS = [
  { name: 'Plank Fence', thick: 3, top: 'n', edge: 'h', fleck: 'N',
    face: (x, row) => (x % 4 === 3 ? 'N' : row === 0 ? 'h' : 'n') },
  { name: 'Log Palisade', thick: 5, top: 'n', edge: 'h', fleck: 'N',
    face: (x, row) => (row % 3 === 2 ? 'N' : row % 3 === 0 ? 'h' : 'n') },
  { name: 'Rough Stone', thick: 6, top: 's', edge: 'W', fleck: 'S',
    face: (x, row) => { const h = hash(x, row, 31); return h < 0.22 ? 'S' : h < 0.32 ? 't' : h < 0.4 ? 'W' : 's'; } },
  { name: 'Cut Stone', thick: 7, top: 's', edge: 'W', fleck: 'S',
    face: bricks('S', 't', 6, 3) },
  { name: 'Brick', thick: 7, top: 'b', edge: 'R', fleck: 'B',
    face: bricks('b', 'B', 4, 2) },
  { name: 'Iron-Banded Stone', thick: 7, top: 's', edge: 'W', fleck: 'S',
    face: (x, row) => (row === 1 || row === 5 ? (x % 4 === 1 ? 'S' : 'k') : bricks('S', 't', 6, 3)(x, row)) },
  { name: 'Steel Plate', thick: 8, top: 'e', edge: 'w', fleck: 'E',
    face: (x, row) => (row % 4 === 3 || x % 8 === 7 ? 'E' : row % 4 === 1 && x % 8 === 2 ? 'k' : 'e'),
    topDeco: (x, y) => (x % 6 === 2 && y % 6 === 2 ? 'E' : null) },
  { name: 'Obsidian', thick: 8, top: 'o', edge: 'M', fleck: 'O',
    face: (x, row) => ((x + row) % 5 === 0 ? 'M' : 'O'),
    topDeco: (x, y) => ((x - y + 70) % 7 === 0 ? 'M' : null) },
  { name: 'Gilded Marble', thick: 8, top: 'W', edge: 'w', fleck: 's',
    face: (x, row) => (row === 0 || row === 6 ? 'Y' : row % 3 === 1 && x % 5 === 2 ? 's' : 'W'),
    topDeco: (x, y) => (y % 6 === 0 && x % 2 === 0 ? 'Y' : null) },
  { name: 'Bunker', thick: 8, top: 'z', edge: 'w', fleck: 'Z',
    face: (x, row) => (row === 3 ? 'v' : x % 6 === 5 ? 'Z' : 'z'),
    topDeco: (x, y, mask) => {
      const horizontal = (y === 8 || y === 9) && x % 4 < 2 && (mask === 0 || mask & (WALL_E | WALL_W));
      const vertical = (x === 11 || x === 12) && y % 4 < 2 && mask & (WALL_N | WALL_S);
      return horizontal || vertical ? 'v' : null;
    } },
];

export function wallRows(level, mask) {
  const st = WALL_LEVELS[Math.max(1, Math.min(WALL_LEVELS.length, level)) - 1];
  const p = painter(SIZE, SIZE);
  const L = 12 - st.thick, R = 11 + st.thick;
  const top = (x0, y0, x1, y1) => p.rect(x0, y0, x1, y1, st.top);
  top(L, TOP_Y, R, BOTTOM_Y);
  if (mask & WALL_N) top(L, 0, R, BOTTOM_Y);
  if (mask & WALL_S) top(L, TOP_Y, R, SIZE - 1);
  if (mask & WALL_W) top(0, TOP_Y, R, BOTTOM_Y);
  if (mask & WALL_E) top(L, TOP_Y, SIZE - 1, BOTTOM_Y);

  // Light edge along the top side; decoration and a few flecks elsewhere.
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (p.get(x, y) !== st.top) continue;
      if (y > 0 && p.get(x, y - 1) === '.') p.put(x, y, st.edge);
      else {
        const d = st.topDeco?.(x, y, mask);
        if (d) p.put(x, y, d);
        else if (hash(x, y, 11 + level) < 0.06) p.put(x, y, st.fleck);
      }
    }
  }

  // Front face under every column whose top stops inside this tile.
  for (let x = 0; x < SIZE; x++) {
    let bottom = -1;
    for (let y = 0; y < SIZE; y++) if (p.get(x, y) !== '.') bottom = y;
    if (bottom < 0 || bottom === SIZE - 1) continue;
    for (let y = bottom + 1; y <= Math.min(SIZE - 1, bottom + FACE_H); y++) p.put(x, y, st.face(x, y - bottom - 1));
  }
  p.outline();
  return p.rows();
}
