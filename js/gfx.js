import { PAL, FONT } from './art.js';

// Turn palette-letter rows into a small canvas we can draw with drawImage.
export function rowsToCanvas(rows, pal = PAL) {
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const ctx = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const color = pal[ch];
      if (!color) throw new Error(`no palette color for '${ch}'`);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

export function textWidth(text, scale = 1) {
  return Math.max(0, text.length * 4 - 1) * scale;
}

// Each glyph is drawn once per colour into a tiny canvas and then stamped with drawImage: the HUD draws a few
// hundred characters a frame, and one drawImage beats up to fifteen fillRects each.
const glyphs = new Map();
function glyph(ch, color) {
  const key = `${color}:${ch}`;
  let g = glyphs.get(key);
  if (!g) {
    const bits = FONT[ch] || FONT['?'];
    g = document.createElement('canvas');
    g.width = 3; g.height = 5;
    const c = g.getContext('2d');
    c.fillStyle = color;
    for (let i = 0; i < 15; i++) if (bits[i]) c.fillRect(i % 3, Math.floor(i / 3), 1, 1);
    glyphs.set(key, g);
  }
  return g;
}

export function drawText(ctx, text, x, y, color = PAL.w, scale = 1) {
  let cx = Math.round(x);
  const cy = Math.round(y);
  for (const ch of text.toUpperCase()) {
    if (ch !== ' ') ctx.drawImage(glyph(ch, color), cx, cy, 3 * scale, 5 * scale);
    cx += 4 * scale;
  }
}
