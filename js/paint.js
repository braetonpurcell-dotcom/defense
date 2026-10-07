// Tiny pixel painter for sprites drawn in code. Letters are palette keys; '.' is transparent.

export function painter(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const p = {
    g, w, h,
    get: (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? g[y][x] : '.'),
    put(x, y, ch) { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = ch; },
    rect(x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) p.put(x, y, ch); },
    hline(x0, x1, y, ch) { for (let x = x0; x <= x1; x++) p.put(x, y, ch); },
    vline(x, y0, y1, ch) { for (let y = y0; y <= y1; y++) p.put(x, y, ch); },
    frame(x0, y0, x1, y1, ch = 'k') {
      p.hline(x0, x1, y0, ch); p.hline(x0, x1, y1, ch);
      p.vline(x0, y0, y1, ch); p.vline(x1, y0, y1, ch);
    },
    // Filled circle; r is in pixels.
    disc(cx, cy, r, ch) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) g[y][x] = ch;
    },
    // Paint every pixel where test(x, y) is true (only over already-painted pixels if onlyPainted).
    each(x0, y0, x1, y1, fn) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const ch = fn(x, y); if (ch) p.put(x, y, ch); }
    },
    // 1px outline around everything painted so far.
    outline(ch = 'k') {
      const src = g.map((r) => r.slice());
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (src[y][x] !== '.') continue;
          const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
            const v = src[y + dy]?.[x + dx];
            return v && v !== '.';
          });
          if (near) g[y][x] = ch;
        }
      }
    },
    rows: () => g.map((r) => r.join('')),
  };
  return p;
}

// Block / brick pattern: dark mortar every `bh` rows, and every `bw` columns (offset on alternate rows).
export function blocks(p, x0, y0, x1, y1, base, dark, bw, bh) {
  p.each(x0, y0, x1, y1, (x, y) => {
    const row = y - y0;
    const shift = (Math.floor(row / bh) % 2) * Math.floor(bw / 2);
    return row % bh === bh - 1 || (x - x0 + shift) % bw === 0 ? dark : base;
  });
}
