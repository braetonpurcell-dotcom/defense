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

export function drawText(ctx, text, x, y, color = PAL.w, scale = 1) {
  ctx.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of text.toUpperCase()) {
    const glyph = FONT[ch] || FONT['?'];
    for (let i = 0; i < 15; i++) {
      if (glyph[i]) ctx.fillRect(cx + (i % 3) * scale, Math.round(y) + Math.floor(i / 3) * scale, scale, scale);
    }
    cx += 4 * scale;
  }
}
