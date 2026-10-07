// All game art lives here as data: 24×24 sprites made of palette letters.
// '.' is transparent. Symmetric sprites are written as their left half (12 columns)
// and mirrored. Grass, trees and shadows are generated in code.

export const SIZE = 24;

export const PAL = {
  k: '#1a1c2c', // outline
  w: '#f4f4f4', W: '#c8c8d0', // white walls
  r: '#b13e53', R: '#ef7d57', q: '#7c2a40', // roof
  y: '#ffcd75', Y: '#d9a033', // window light, gold
  n: '#8b5a2b', N: '#5a3a1f', h: '#c8955a', // wood (h = light)
  s: '#94b0c2', S: '#566c86', t: '#333c57', // stone
  b: '#a05038', B: '#6e3324', // brick
  e: '#9fb3c8', E: '#5b6e85', // steel
  o: '#4a3568', O: '#2a1a3e', v: '#7df9ff', // obsidian, glow
  z: '#9a9a8c', Z: '#6a6a60', // concrete
  g: '#38b764', G: '#257179', l: '#a7f070', // grass
  m: '#2a1530', M: '#7a2f8f', // monster cave
  d: '#c29a5b', D: '#8d6a3a', // dirt road
  c: '#41a6f6', C: '#29366f', // ice / water
  a: '#8aa67a', A: '#5e7a52', // zombie skin
  p: '#f4c8a0', // skin
  u: '#3b5dc9', U: '#29366f', // clothes
  x: 'rgba(26,28,44,0.28)', // shadow
};

// Zombie variants (palette swaps of the one zombie sprite).
export const PAL_RUNNER = { ...PAL, u: '#b13e53', U: '#5d275d', a: '#a3b88c' };            // red shirt, paler
export const PAL_BRUTE = { ...PAL, u: '#566c86', U: '#333c57', a: '#7a8a6a', A: '#4a5a40' }; // grey, heavier
export const PAL_KING = { ...PAL, u: '#7a2f8f', U: '#2a1530', a: '#6e8f60', k: '#1a1c2c' };  // royal purple

// Every coloured pixel turned white, for the hit flash.
export const PAL_FLASH = Object.fromEntries(Object.keys(PAL).map((k) => [k, k === 'x' ? 'rgba(0,0,0,0)' : '#ffffff']));

function mirror(half) {
  if (half.length !== SIZE) throw new Error(`sprite needs ${SIZE} rows, got ${half.length}`);
  return half.map((row, i) => {
    if (row.length !== SIZE / 2) throw new Error(`half row ${i} needs 12 chars: "${row}"`);
    return row + [...row].reverse().join('');
  });
}

export const SPRITES = {
  house: mirror([
    '............',
    '...........k',
    '..........kr',
    '.........krr',
    '........krRr',
    '.......krRrr',
    '......krRrrr',
    '.....krRrrrr',
    '....krRrrrrr',
    '...krRrrrrrr',
    '..kkkkkkkkkk',
    '...kwwwwwwww',
    '...kwkkkwwww',
    '...kwkyykwww',
    '...kwkyykwww',
    '...kwkkkwwww',
    '...kwwwwwkkk',
    '...kwwwwwknn',
    '...kwwwwwknn',
    '...kWWWWWknn',
    '...kWWWWWknN',
    '..kkkkkkkkkk',
    '............',
    '............',
  ]),

};

SPRITES.rubble = mirror([
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '..........kk',
  '.......kk.ks',
  '......kssksS',
  '....kkksSkSS',
  '...kssSSSkSS',
  '...kkkkkkkkk',
  '............',
  '............',
  '............',
]);

// Zombie: arms out, torn shirt, red eyes.
SPRITES.zombie = mirror([
  '............',
  '............',
  '............',
  '........kkkk',
  '.......kAaaa',
  '.......kaaaa',
  '.......kaaRa',
  '.......kaaaa',
  '.......kakkk',
  '........kkkk',
  '..kaaakkuuuu',
  '..kkkkkuUuuu',
  '......kuuUuu',
  '......kuuuuu',
  '......kUUUUU',
  '.......kUUUk',
  '.......kUUUk',
  '.......kaaak',
  '........kkk.',
  '............',
  '............',
  '............',
  '............',
  '............',
]);

// Monster cave at the map edge: stone arch, dark inside, glowing eyes.
SPRITES.cave = mirror([
  '............',
  '............',
  '............',
  '........kkkk',
  '......kkSSSS',
  '.....kSSssss',
  '....kSsskkkk',
  '....kSskmmmm',
  '...kSskmmmmm',
  '...kSskmmmmm',
  '...kSskmmmmm',
  '..kSsskmmmmm',
  '..kSskmmyymm',
  '..kSskmmmmmm',
  '..kSskmmmmmm',
  '..kSskmmmmmm',
  '..kSskmMMMMM',
  '.kSSskMMMMMM',
  '.kSsskkkkkkk',
  '.kkkkkkkkkkk',
  '............',
  '............',
  '............',
  '............',
]);

// Small deterministic hash so generated art (and the forest) is the same every load.
export function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function grid(fill = '.') {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(fill));
}
const toRows = (g) => g.map((r) => r.join(''));

// Add a 1px outline around every non-transparent pixel.
function outline(g) {
  const out = g.map((r) => r.slice());
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (g[y][x] !== '.') continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const v = g[y + dy]?.[x + dx];
        return v && v !== '.';
      });
      if (near) out[y][x] = 'k';
    }
  }
  return out;
}

export function grassRows(seed) {
  const g = grid('g');
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const h = hash(x, y, seed);
      if (h < 0.035) g[y][x] = 'G';
      else if (h < 0.06) g[y][x] = 'l';
    }
  }
  // A couple of little "v" tufts.
  for (let i = 0; i < 2; i++) {
    const x = 2 + Math.floor(hash(i, 99, seed) * 18);
    const y = 2 + Math.floor(hash(99, i, seed) * 19);
    g[y][x] = 'G'; g[y][x + 2] = 'G'; g[y + 1][x + 1] = 'G';
  }
  return toRows(g);
}

// Dirt road tile. `edges` darkens the sides that border grass: { n, s, e, w }.
export function dirtRows(seed, edges = {}) {
  const g = grid('d');
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const h = hash(x, y, seed + 50);
      if (h < 0.05) g[y][x] = 'D';
      else if (h < 0.07) g[y][x] = 'y';
    }
  }
  for (let i = 0; i < SIZE; i++) {
    if (edges.n) g[0][i] = 'D';
    if (edges.s) g[SIZE - 1][i] = 'D';
    if (edges.w) g[i][0] = 'D';
    if (edges.e) g[i][SIZE - 1] = 'D';
  }
  return toRows(g);
}

// Walls (10 levels) live in art-walls.js; towers in art-buildings.js; the village in art-village.js.

export function waterRows(seed, edges = {}) {
  const g = grid('c');
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const h = hash(x, y, seed + 70);
      if ((y + seed) % 6 === 2 && x % 8 < 4 && h < 0.8) g[y][x] = 'w';      // ripples
      else if (h < 0.05) g[y][x] = 'C';
    }
  }
  for (let i = 0; i < SIZE; i++) {
    for (let d = 0; d < 3; d++) {
      const ch = d === 0 ? 'd' : d === 1 ? 'D' : 'C';
      if (edges.n) g[d][i] = ch;
      if (edges.s) g[SIZE - 1 - d][i] = ch;
      if (edges.w) g[i][d] = ch;
      if (edges.e) g[i][SIZE - 1 - d] = ch;
    }
  }
  return toRows(g);
}

// ---------- World terrain (the valley) ----------

// Mountain rock ground.
export function mountainRows(seed) {
  const g = grid('s');
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const h = hash(x, y, seed + 90);
    if (h < 0.10) g[y][x] = 'S';
    else if (h < 0.14) g[y][x] = 'W';
    else if (h < 0.16) g[y][x] = 't';
  }
  return toRows(g);
}

// A rocky peak with a snow cap, drawn on some mountain tiles (like trees on grass).
export function peakRows(seed) {
  const g = grid();
  const top = 2 + (seed % 3), cx = 11 + (seed % 2);
  for (let y = top; y < SIZE - 2; y++) {
    const hw = Math.round(((y - top) / (SIZE - 2 - top)) * 11);
    for (let x = cx - hw; x <= cx + hw; x++) {
      if (x < 0 || x >= SIZE) continue;
      const shade = x < cx ? 'W' : 'S';
      g[y][x] = y - top < 5 ? (x < cx ? 'w' : 'W') : shade;
    }
  }
  return toRows(outline(g));
}

// Deep ocean. `edges` gives a sandy beach on sides that touch land.
export function oceanRows(seed, edges = {}) {
  const g = grid('U');
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const h = hash(x, y, seed + 120);
    if ((y + seed * 3) % 8 === 3 && (x + seed) % 10 < 5) g[y][x] = 'u';
    else if (h < 0.03) g[y][x] = 'c';
  }
  for (let i = 0; i < SIZE; i++) {
    for (let d = 0; d < 4; d++) {
      const ch = d < 2 ? 'd' : d === 2 ? 'y' : 'c';
      if (edges.n) g[d][i] = ch;
      if (edges.s) g[SIZE - 1 - d][i] = ch;
      if (edges.w) g[i][d] = ch;
      if (edges.e) g[i][SIZE - 1 - d] = ch;
    }
  }
  return toRows(g);
}

// Zombie country: dark, dead ground.
export function dangerRows(seed) {
  const g = grid('m');
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const h = hash(x, y, seed + 150);
    if (h < 0.08) g[y][x] = 'O';
    else if (h < 0.11) g[y][x] = 'k';
    else if (h < 0.125) g[y][x] = 'M';
  }
  return toRows(g);
}

// A bare dead tree for the danger zone.
export function deadTreeRows() {
  const g = grid();
  for (let y = 8; y <= 21; y++) { g[y][11] = 'N'; g[y][12] = 'D'; }
  const branch = (x0, y0, dx, len) => { for (let i = 0; i < len; i++) { const x = x0 + dx * i, y = y0 - Math.floor(i / 2); if (g[y]?.[x] !== undefined) g[y][x] = 'N'; } };
  branch(11, 11, -1, 7); branch(12, 9, 1, 7); branch(11, 15, -1, 5); branch(12, 14, 1, 6);
  return toRows(outline(g));
}

// Open-world meadow: softer, lighter grass with a few flowers.
export function meadowRows(seed) {
  const g = grid('g');
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const h = hash(x, y, seed + 180);
    if (h < 0.10) g[y][x] = 'l';
    else if (h < 0.115) g[y][x] = (x + y) % 2 ? 'y' : 'w';
    else if (h < 0.13) g[y][x] = 'G';
  }
  return toRows(g);
}

// A wooden bridge plank tile (the bridge runs north–south). side: 'w' | 'e' | null for the rail.
export function bridgeRows(side) {
  const g = grid('h');
  for (let y = 0; y < SIZE; y++) {
    if (y % 4 === 3) for (let x = 0; x < SIZE; x++) g[y][x] = 'n';
    for (let x = 0; x < SIZE; x++) if ((x * 7 + y) % 23 === 0) g[y][x] = 'N';
  }
  if (side === 'w') for (let y = 0; y < SIZE; y++) { g[y][0] = 'k'; g[y][1] = 'N'; g[y][2] = 'n'; }
  if (side === 'e') for (let y = 0; y < SIZE; y++) { g[y][SIZE - 1] = 'k'; g[y][SIZE - 2] = 'N'; g[y][SIZE - 3] = 'n'; }
  return toRows(g);
}

export function treeRows() {
  const g = grid();
  for (let y = 15; y <= 20; y++) for (let x = 10; x <= 13; x++) g[y][x] = x === 13 ? 'N' : 'n';
  const cx = 11.5, cy = 9, r = 8.2;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (Math.hypot(x - cx, y - cy) > r) continue;
      const light = (x - cx) + (y - cy);
      const dither = (x + y) % 2 === 0;
      if (light < -6 || (light < -3 && dither)) g[y][x] = 'l';
      else if (light > 6 || (light > 3 && dither)) g[y][x] = 'G';
      else g[y][x] = 'g';
    }
  }
  return toRows(outline(g));
}

export function shadowRows() {
  const g = grid();
  for (let y = 18; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (((x - 11.5) / 9) ** 2 + ((y - 20.5) / 2.6) ** 2 <= 1) g[y][x] = 'x';
    }
  }
  return toRows(g);
}

// 3×5 pixel font. Each glyph is 5 rows of 3 bits.
const FONT_SRC = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  ' ': '000000000000000', ':': '000010000010000', '/': '001001010100100', '-': '000000111000000',
  '!': '010010010000010', '.': '000000000000010', '+': '000010111010000', '?': '110001010000010',
  '(': '010100100100010', ')': '010001001001010', '%': '101001010100101', ',': '000000000010100',
  "'": '010010000000000', '<': '001010100010001', '>': '100010001010100',
};
export const FONT = Object.fromEntries(
  Object.entries(FONT_SRC).map(([ch, bits]) => [ch, [...bits].map((b) => b === '1')]),
);
