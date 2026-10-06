import { SPRITES, PAL, PAL_RED, grassRows, treeRows, shadowRows } from './art.js';
import { rowsToCanvas, drawText, textWidth } from './gfx.js';

// Logical screen: 9×13 tiles of 24px, with a HUD strip on top and a button bar below.
const T = 24, COLS = 9, ROWS = 13;
const W = COLS * T;            // 216
const HUD_H = 24;
const GRID_Y = HUD_H;
const BAR_Y = GRID_Y + ROWS * T; // 336
const H = BAR_Y + 48;           // 384

const canvas = document.getElementById('game');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const img = {
  grass: [0, 1, 2, 3].map((s) => rowsToCanvas(grassRows(s))),
  house: rowsToCanvas(SPRITES.house),
  wall: rowsToCanvas(SPRITES.wall),
  tree: rowsToCanvas(treeRows()),
  shadow: rowsToCanvas(shadowRows()),
  villagers: [rowsToCanvas(SPRITES.villager), rowsToCanvas(SPRITES.villager, PAL_RED)],
};

// Pre-render the grass once.
const ground = document.createElement('canvas');
ground.width = W;
ground.height = ROWS * T;
{
  const g = ground.getContext('2d');
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) g.drawImage(img.grass[(c * 7 + r * 13 + c * r) % 4], c * T, r * T);
  }
}

// ---------- Base layout ----------

const DEFAULT_LAYOUT = [
  { type: 'house', c: 4, r: 6 },
  ...[[3, 4], [4, 4], [5, 4], [2, 5], [6, 5], [2, 6], [6, 6], [2, 7], [6, 7], [3, 8], [5, 8]]
    .map(([c, r]) => ({ type: 'wall', c, r })),
  ...[[0, 0], [1, 1], [8, 1], [7, 3], [0, 10], [1, 12], [7, 11], [8, 12]]
    .map(([c, r]) => ({ type: 'tree', c, r })),
];

const SAVE_KEY = 'defense.layout.v1';

function loadLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (Array.isArray(saved) && saved.some((b) => b.type === 'house')) return saved;
  } catch { /* no saved layout */ }
  return structuredClone(DEFAULT_LAYOUT);
}

function saveLayout() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(buildings)); } catch { /* storage unavailable */ }
}

let buildings = loadLayout();
const buildingAt = (c, r) => buildings.find((b) => b.c === c && b.r === r);

// ---------- Villagers ----------

const villagers = img.villagers.map((sprite, i) => ({
  sprite, x: (3 + i * 2) * T, y: 10 * T, tx: 0, ty: 0, wait: i * 0.8, t: 0,
}));

function pickTarget(v) {
  for (let tries = 0; tries < 20; tries++) {
    const c = Math.floor(Math.random() * COLS);
    const r = Math.floor(Math.random() * ROWS);
    if (!buildingAt(c, r)) { v.tx = c * T; v.ty = r * T; return; }
  }
}

function updateVillager(v, dt) {
  v.t += dt;
  if (v.wait > 0) { v.wait -= dt; if (v.wait <= 0) pickTarget(v); return; }
  const dx = v.tx - v.x, dy = v.ty - v.y;
  const d = Math.hypot(dx, dy);
  const step = 14 * dt;
  if (d <= step) { v.x = v.tx; v.y = v.ty; v.wait = 1 + Math.random() * 3; return; }
  v.x += (dx / d) * step;
  v.y += (dy / d) * step;
}

// ---------- UI state ----------

let selected = null;
let toast = null; // { text, time }
let channel = 'DEV';

fetch('version.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((v) => { if (v) channel = v.channel === 'live' ? `V ${v.commit}` : `PREVIEW ${v.commit}`; })
  .catch(() => {});

const buttons = {
  reset: { x: 8, y: BAR_Y + 16, w: 56, h: 24, label: 'RESET' },
  defend: { x: W - 8 - 120, y: BAR_Y + 16, w: 120, h: 24, label: 'DEFEND!' },
};
const inRect = (p, b) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;

function showToast(text) { toast = { text, time: 2 }; }

function onTap(p) {
  if (inRect(p, buttons.defend)) { selected = null; showToast('WAVES COMING SOON'); return; }
  if (inRect(p, buttons.reset)) {
    buildings = structuredClone(DEFAULT_LAYOUT);
    selected = null;
    saveLayout();
    showToast('BASE RESET');
    return;
  }
  if (p.y < GRID_Y || p.y >= BAR_Y) return;
  const c = Math.floor(p.x / T), r = Math.floor((p.y - GRID_Y) / T);
  const hit = buildingAt(c, r);
  if (selected) {
    if (hit === selected) selected = null;
    else if (hit) selected = hit;
    else { selected.c = c; selected.r = r; selected = null; saveLayout(); }
  } else if (hit) {
    selected = hit;
  }
}

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  onTap({ x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) });
});

// ---------- Drawing ----------

function drawButton(b, primary) {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = primary ? PAL.r : PAL.S;
  ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  ctx.fillStyle = primary ? PAL.R : PAL.s;
  ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 2);
  const s = primary ? 2 : 1;
  drawText(ctx, b.label, b.x + (b.w - textWidth(b.label, s)) / 2, b.y + (b.h - 5 * s) / 2 + 1, PAL.w, s);
}

function drawSelection(b, time) {
  if (Math.floor(time * 4) % 2) return;
  const x = b.c * T, y = GRID_Y + b.r * T;
  ctx.fillStyle = PAL.y;
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [T - 1, 0, -1, 1], [0, T - 1, 1, -1], [T - 1, T - 1, -1, -1]]) {
    ctx.fillRect(x + cx + (sx < 0 ? -4 : 0), y + cy, 5, 1);
    ctx.fillRect(x + cx, y + cy + (sy < 0 ? -4 : 0), 1, 5);
  }
}

function render(time) {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(ground, 0, GRID_Y);

  // Everything on the field, drawn top to bottom so lower things overlap.
  const things = [
    ...buildings.map((b) => ({ y: b.r * T, draw: () => {
      const x = b.c * T, y = GRID_Y + b.r * T;
      ctx.drawImage(img.shadow, x, y);
      ctx.drawImage(img[b.type], x, y);
    } })),
    ...villagers.map((v) => ({ y: v.y, draw: () => {
      const walking = v.wait <= 0;
      const bob = walking && Math.floor(v.t * 6) % 2 ? -1 : 0;
      ctx.drawImage(img.shadow, Math.round(v.x), Math.round(GRID_Y + v.y));
      ctx.drawImage(v.sprite, Math.round(v.x), Math.round(GRID_Y + v.y + bob));
    } })),
  ].sort((a, b) => a.y - b.y);
  for (const t of things) t.draw();

  if (selected) drawSelection(selected, time);

  // HUD
  drawText(ctx, 'GOLD 100', 8, 10, PAL.y);
  drawText(ctx, channel, W - 8 - textWidth(channel), 10, PAL.S);

  // Bottom bar
  const hint = selected ? 'TAP GRASS TO MOVE IT HERE' : 'TAP SOMETHING TO MOVE IT';
  drawText(ctx, hint, (W - textWidth(hint)) / 2, BAR_Y + 5, PAL.s);
  drawButton(buttons.reset, false);
  drawButton(buttons.defend, true);

  if (toast) {
    const w = textWidth(toast.text) + 12;
    const x = (W - w) / 2, y = GRID_Y + 8;
    ctx.fillStyle = PAL.k;
    ctx.fillRect(x, y, w, 13);
    drawText(ctx, toast.text, x + 6, y + 4, PAL.w);
  }
}

// ---------- Loop & sizing ----------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (const v of villagers) updateVillager(v, dt);
  if (toast && (toast.time -= dt) <= 0) toast = null;
  render(now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Scale the canvas as large as fits, using whole-pixel steps when possible so pixels stay crisp.
function fit() {
  const dpr = window.devicePixelRatio || 1;
  let s = Math.min(window.innerWidth / W, window.innerHeight / H) * dpr;
  const whole = Math.floor(s);
  if (whole >= 2 && whole / s > 0.85) s = whole;
  canvas.style.width = `${(W * s) / dpr}px`;
  canvas.style.height = `${(H * s) / dpr}px`;
}
window.addEventListener('resize', fit);
fit();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
