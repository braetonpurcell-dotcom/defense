// All game art lives here as data: 24×24 sprites made of palette letters.
// '.' is transparent. Symmetric sprites are written as their left half (12 columns)
// and mirrored. Grass, trees and shadows are generated in code.

export const SIZE = 24;

export const PAL = {
  k: '#1a1c2c', // outline
  w: '#f4f4f4', W: '#c8c8d0', // white walls
  r: '#b13e53', R: '#ef7d57', // roof
  y: '#ffcd75', // window light
  n: '#8b5a2b', N: '#5a3a1f', // wood
  s: '#94b0c2', S: '#566c86', // stone
  g: '#38b764', G: '#257179', l: '#a7f070', // grass
  p: '#f4c8a0', // skin
  u: '#3b5dc9', U: '#29366f', // clothes
  x: 'rgba(26,28,44,0.28)', // shadow
};

// Palette swap for a second villager.
export const PAL_RED = { ...PAL, u: '#b13e53', U: '#5d275d' };

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

  wall: mirror([
    '............',
    '............',
    '............',
    '............',
    'kkkkkkkkkkkk',
    'ksssssssssss',
    'ksssssssssss',
    'ksssssssssss',
    'ksssssssssss',
    'ksssssssssss',
    'kSSSSSSSSSSk',
    'kkkkkkkkkkkk',
    'ksssssksssss',
    'ksssssksssss',
    'ksssssksssss',
    'ksssssksssss',
    'ksssssksssss',
    'kSSSSSkSSSSS',
    'kkkkkkkkkkkk',
    '............',
    '............',
    '............',
    '............',
    '............',
  ]),

  villager: mirror([
    '............',
    '............',
    '............',
    '............',
    '........kkkk',
    '.......kNNNN',
    '.......kNNNN',
    '.......kpppp',
    '.......kpkpp',
    '.......kpppp',
    '........kkkk',
    '......kuuuuu',
    '.....kpkuuuu',
    '.....kpkuuuu',
    '......kkuuuu',
    '.......kUUUU',
    '.......kUUUk',
    '.......kUUUk',
    '.......kNNNk',
    '........kkk.',
    '............',
    '............',
    '............',
    '............',
  ]),
};

// Small deterministic hash so generated art is the same every load.
function hash(x, y, seed) {
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
};
export const FONT = Object.fromEntries(
  Object.entries(FONT_SRC).map(([ch, bits]) => [ch, [...bits].map((b) => b === '1')]),
);
