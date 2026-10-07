import {
  SPRITES, PAL, PAL_RED, PAL_RUNNER, PAL_BRUTE, PAL_KING, PAL_FLASH,
  grassRows, dirtRows, waterRows, treeRows, shadowRows, hash,
  mountainRows, peakRows, oceanRows, dangerRows, deadTreeRows, meadowRows, bridgeRows,
} from './art.js';
import { wallRows, WALL_N, WALL_E, WALL_S, WALL_W } from './art-walls.js';
import { houseRows, HOUSE_LEVELS } from './art-houses.js';
import { buildingRows, towerPalette, towerRows, TOWER_H } from './art-buildings.js';
import { THEMES, themeById, themePalette, decorRows } from './art-decor.js';
import { hasCardArt, cardRows } from './art-cards.js';
import { heroRows, heroPalette, HERO_DEFAULT, LOOK_PARTS } from './art-hero.js';
import { rowsToCanvas, drawText, textWidth } from './gfx.js';
import {
  T, CHUNK, CHUNKS, N, NR, WORLD, WORLD_H, WORLD_MAP, LAND0, LAND1, START_GOLD, landPrice, BOSS_EVERY, TOP_RUNS, BUILDINGS, waveBonus, killGold, sizeOf,
  hpFor, towerStats, storageCap, limitFor, upgradeCost, BUILD_COST,
  MAX_LEVEL, DECOR, CARDS, RARITY, rarityOdds, SKIP_GOLD, OMENS, gemsForRun,
  PETS, PET_MEAL, PET_FED_HOURS, STORE_ITEMS, NPC_ROLES, npcCap, BUILDER_REPAIR_PER_SEC, GOALS, HERO_MAX_LEVEL, heroStats, heroUpgradeCost, TIME_SCALE, WAVE_HEAL, fighterScale, GUARD_RADIUS, APPLICANTS, REROLL_PRICE, TRAITS, NPC_NAMES,
} from './config.js';
import { shopRows, wellRows, petRows } from './art-village.js';
import {
  RES, houseLevel, countOf, canAfford, missing, formatCost, formatTime, earn, buildBlock, build,
  underConstruction, upgradeBlock, startUpgrade, finishBuilder, rushBuilder,
} from './economy.js';
import { Battle } from './battle.js';

// ---------- World ----------
// The owner's valley (WORLD_MAP in config.js, 24×24 plots): zombie country to the north, a forest band the
// zombie road cuts through, your 8×8 buyable land in the middle, mountains west, ocean east, a river with a
// bridge to the south, and the open world (village) at the bottom.
// You start owning the middle four plots of your land; the rest of your land is forest you can buy.

// Your land starts at tile O (= plot LAND0). Positions below are written as O + their place in the land.
const O = LAND0 * CHUNK; // 48
const START_CHUNKS = [[LAND0 + 3, LAND0 + 3], [LAND0 + 4, LAND0 + 3], [LAND0 + 3, LAND0 + 4], [LAND0 + 4, LAND0 + 4]];

// (Clamped, so wiggly borders near the world's edge keep the edge plot's ground.)
const plotType = (px, py) => WORLD_MAP[Math.max(0, Math.min(WORLD_MAP.length - 1, py))][Math.max(0, Math.min(WORLD_MAP[0].length - 1, px))];
const isLandPlot = (px, py) => px >= LAND0 && px <= LAND1 && py >= LAND0 && py <= LAND1;

// The zombie road: 2 tiles wide, from the zombies' den in the danger zone, down through the forest band,
// winding through the top of your land to the top of your starting plots.
const BASE_TOP = START_CHUNKS.reduce((m, [, y]) => Math.min(m, y), Infinity) * CHUNK; // 66
const ROAD_TOP = 33;                       // a few tiles inside the danger zone (which ends at row 35)
const roadLeft = (r) => O + 23 + Math.round(1.4 * Math.sin((BASE_TOP - 1 - r) * 0.45));
const ROAD = new Set();
for (let r = ROAD_TOP; r < BASE_TOP; r++) for (const c of [roadLeft(r), roadLeft(r) + 1]) ROAD.add(`${c},${r}`);
const isRoad = (c, r) => ROAD.has(`${c},${r}`);
const DANGER_BOTTOM = 36;                  // rows above this are zombie country (you can't go there)

// The zombies' den sits at the top of the road, centred on its two tiles.
const CAVE = { x: roadLeft(ROAD_TOP) * T + T / 2, y: ROAD_TOP * T, c: roadLeft(ROAD_TOP), r: ROAD_TOP };
const isCave = (c, r) => r === ROAD_TOP && (c === CAVE.c || c === CAVE.c + 1);

// Ponds, where the sketch has water: a long lake on the west side of your land and a small pond on the east.
const PONDS = [{ cx: O + 8.5, cy: O + 35.5, rx: 2.3, ry: 4.7 }, { cx: O + 38.5, cy: O + 32.5, rx: 2.3, ry: 2.3 }];
const POND = new Set();
for (const p of PONDS) {
  for (let r = Math.floor(p.cy - p.ry); r <= Math.ceil(p.cy + p.ry); r++) {
    for (let c = Math.floor(p.cx - p.rx); c <= Math.ceil(p.cx + p.rx); c++) {
      if (((c - p.cx) / p.rx) ** 2 + ((r - p.cy) / p.ry) ** 2 <= 1) POND.add(`${c},${r}`);
    }
  }
}
const isWater = (c, r) => POND.has(`${c},${r}`);
const nextToWater = (c, r, size = 1) => {
  for (let y = r - 1; y <= r + size; y++) for (let x = c - 1; x <= c + size; x++) if (isWater(x, y)) return true;
  return false;
};

// The river: runs east–west through the river band below your land (rows 96–107), from the mountains to the
// ocean, 3 tiles wide and gently winding. The path crosses it on a wooden bridge.
const RIVER_TOP = (LAND1 + 1) * CHUNK, RIVER_BOTTOM = RIVER_TOP + 2 * CHUNK - 1; // 96..107
const riverCentre = (c) => RIVER_TOP + 5.5 + 2.5 * Math.sin(c * 0.09);
const PATH_COLS = [O + 23, O + 24];        // the path south runs down these two columns (between plots 4 and 5)

const chunkKey = (cx, cy) => `${cx},${cy}`;
const chunkOfTile = (c, r) => [Math.floor(c / CHUNK), Math.floor(r / CHUNK)];

// Starting layout, centred on the four starting plots.
// The 3×3 House sits in the middle. A 7×7 wall ring surrounds it, with a 1-tile gate at the bottom
// (away from the road, so monsters have to walk around), and a tower in each bottom corner covering the
// gate.
const HOUSE_AT = { c: O + 23, r: O + 23 };
const GATE = { c: O + 24, r: O + 27 };
const RING = [];
for (let i = O + 21; i <= O + 27; i++) {
  RING.push([i, O + 21]);                       // top row
  if (i !== GATE.c) RING.push([i, O + 27]);     // bottom row, with the gate
  if (i > O + 21 && i < O + 27) RING.push([O + 21, i], [O + 27, i]); // sides
}
const DEFAULT_BUILDINGS = [
  { type: 'house', ...HOUSE_AT },
  ...RING.map(([c, r]) => ({ type: 'wall', c, r })),
  { type: 'tower', c: O + 22, r: O + 26 },
  { type: 'tower', c: O + 26, r: O + 26 },
  ...[[18, 18], [29, 18], [18, 29], [29, 29]].map(([c, r]) => ({ type: 'tree', c: O + c, r: O + r })),
];

// The current run (roguelike layer). Lives only in memory: it is never saved.
const run = {
  wave: 0, earned: 0, won: false,
  omen: OMENS[OMENS.length - 1], blessings: {}, rerolls: 1,
  choices: null,   // card ids on offer, or null
  pending: null,   // { type, left }: a picked card still to be placed
};

// Stonemason (a run blessing) makes walls 50% tougher for the rest of the run.
const isWallType = (t) => t === 'wall' || t === 'barricade';
const maxHp = (b) => Math.round(hpFor(b.type, b.level || 1) * (isWallType(b.type) && run?.blessings?.stonemason ? 1.5 : 1));
const isRunObject = (b) => !!BUILDINGS[b.type].run;

// Game time. Roguelike: it only runs while you play, TIME_SCALE times faster than real time (a game
// "hour" passes in a real minute). Timers count game time; realTime() shows them in real time.
const clock = () => game.clock;
const realTime = (gameSeconds) => formatTime(gameSeconds / TIME_SCALE);

// ---------- Save ----------

const SAVE_KEY = 'defense.save.v4';
// Sandbox: the bot testers load the game with ?bots=1, which must never touch the real save.
const SANDBOX = new URLSearchParams(location.search).has('bots');
// Saves from before the 3×3 House: keep gold and land, start from the new layout.
const OLD_SAVE_KEYS = ['defense.save.v3', 'defense.save.v2'];

function newGame() {
  return {
    gold: START_GOLD,
    bought: 0,
    owned: START_CHUNKS.map(([x, y]) => chunkKey(x, y)),
    buildings: structuredClone(DEFAULT_BUILDINGS),
    builder: null,
    theme: 'classic',
    gems: 0,
    ownedThemes: ['classic'],
    // New games are already in today's shape; older saves get migrated in upgradeSave.
    southGate: true,
    worldV: 2,
    clock: Date.now(),
    runState: null,
  };
}

// Fill in anything a save is missing.
function upgradeSave(s) {
  // Gold is the only money now: quarries, farms, labs and docks (and food and science) are gone.
  delete s.food; delete s.science; delete s.starterProducers;
  s.buildings = s.buildings.filter((b) => BUILDINGS[b.type]);
  if (Array.isArray(s.npcs)) s.npcs = s.npcs.filter((n) => NPC_ROLES[n.role]);
  s.builder ??= null;
  s.theme ??= 'classic';
  s.gems ??= 0;
  s.look ??= { ...HERO_DEFAULT };
  s.pets ??= { owned: [], active: null, fedAt: {} };
  s.ownedThemes ??= ['classic'];
  if (!s.ownedThemes.includes(s.theme)) s.theme = 'classic'; // art packs must be owned
  s.nextId ??= 1;
  // The game clock (ms). It starts at the real time and then only runs while you play.
  s.clock ??= Date.now();
  for (const b of s.buildings) {
    b.id ??= s.nextId++;
    b.level ??= 1;
    if (typeof b.hp !== 'number') b.hp = hpFor(b.type, b.level);
    if (b.type === 'house' || b.type === 'tree' || BUILDINGS[b.type].decor) b.hp = hpFor(b.type, b.level); // safety net
  }
  // Your people. Older saves get two archers, manning the first two towers (the old plain villagers).
  s.nextNpc ??= 1;
  if (!Array.isArray(s.npcs)) {
    s.npcs = s.buildings.filter((b) => b.type === 'tower').slice(0, 2).map((t) => ({ id: s.nextNpc++, role: 'archer', post: t.id }));
    while (s.npcs.length < 2) s.npcs.push({ id: s.nextNpc++, role: 'archer', post: null });
  }
  for (const n of s.npcs) n.name ??= NPC_NAMES[(n.id * 7) % NPC_NAMES.length]; // everyone has a name now
  s.stats ??= { bestWave: 0, wins: 0 };
  s.goal ??= 0;
  s.hero ??= { level: 1, post: null }; // your hero (a mobile tower)
  s.items ??= []; // your inventory: cards and buildings not on the map ({ type, level, n })
  // Roguelike: the current run (saved, so you can close the app between waves).
  delete s.dayLeft;
  s.runState ??= null;
  // Records outlive every death: lives played and your top runs (shown on the home screen).
  s.records ??= { lives: 1 };
  s.records.runs ??= [];
  delete s.records.bestWorld; delete s.records.bestNight; delete s.world;
  // The starting gate moved from the top of the ring (24,21) to the bottom (24,27).
  if (!s.southGate) {
    const at = (c, r) => s.buildings.find((b) => b.c === c && b.r === r);
    const bottom = at(24, 27);
    if (!at(24, 21) && bottom && bottom.type === 'wall') { bottom.r = 21; }
    // ...and the starting towers moved down next to it.
    for (const c of [22, 26]) {
      const t = at(c, 22);
      if (t && t.type === 'tower' && !at(c, 26)) t.r = 26;
    }
    s.southGate = true;
  }
  // The world grew from 8×9 plots to the 24×24 valley, with your land now starting at plot (8,8):
  // move every building and owned plot of an older save into the middle.
  if ((s.worldV ?? 1) < 2) {
    for (const b of s.buildings) { b.c += O; b.r += O; }
    s.owned = s.owned.map((k) => { const [x, y] = k.split(',').map(Number); return chunkKey(x + LAND0, y + LAND0); });
    s.worldV = 2;
  }
  return s;
}

function loadGame() {
  if (SANDBOX) return upgradeSave(newGame());
  const read = (key) => {
    try {
      const s = JSON.parse(localStorage.getItem(key));
      return s && Array.isArray(s.owned) && Array.isArray(s.buildings) ? s : null;
    } catch { return null; }
  };
  const current = read(SAVE_KEY);
  if (current) return upgradeSave(current);
  for (const key of OLD_SAVE_KEYS) {
    const old = read(key);
    if (old) {
      // Very old saves: keep gold and land (moved into today's world), start from the new layout.
      const owned = old.owned.map((k) => { const [x, y] = k.split(',').map(Number); return chunkKey(x + LAND0, y + LAND0); });
      return upgradeSave({ ...newGame(), gold: old.gold, bought: old.bought, owned });
    }
  }
  return upgradeSave(newGame());
}

// Everything saves, run cards and the current run included (roguelike: the run IS your life).
function saveGame() {
  if (SANDBOX) return;
  // Trees and decorations are saved whole (nothing can repair them); everything else as it is.
  const healsFree = (b) => b.type === 'tree' || BUILDINGS[b.type].decor;
  const buildings = game.buildings
    .map((b) => ({ ...b, hp: healsFree(b) ? hpFor(b.type, b.level || 1) : Math.min(b.hp, hpFor(b.type, b.level || 1)) }));
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...game, buildings, runState: runSnapshot() })); } catch { /* storage unavailable */ }
}

let game = loadGame();
let owned = new Set(game.owned);

const ownsChunk = (cx, cy) => owned.has(chunkKey(cx, cy));
const ownsTile = (c, r) => ownsChunk(...chunkOfTile(c, r));
const covers = (b, c, r) => c >= b.c && r >= b.r && c < b.c + sizeOf(b) && r < b.r + sizeOf(b);
const buildingAt = (c, r) => game.buildings.find((b) => covers(b, c, r));
const inWorld = (c, r) => c >= 0 && r >= 0 && c < N && r < NR;
const house = () => game.buildings.find((b) => b.type === 'house');

// Can a building of this size (b, or a new one of `type`) sit with its top-left corner at (c, r)?
// Needs your land and no other building.
function fits(b, c, r, size = sizeOf(b)) {
  for (let y = r; y < r + size; y++) {
    for (let x = c; x < c + size; x++) {
      if (!inWorld(x, y) || !ownsTile(x, y) || isWater(x, y)) return false;
      const other = buildingAt(x, y);
      if (other && other !== b) return false;
    }
  }
  return true;
}

// ---------- Ground types ----------
// Each plot's sketch letter gives its ground. Borders between the wild areas (mountains, ocean, forest,
// danger zone, open world) wiggle a little so they don't look like a chessboard; your land's plots keep
// exact edges, since you buy them plot by plot.
const PLOT_GROUND = { x: 'danger', W: 'mountain', T: 'ocean', t: 'forest', z: 'forest', g: 'land', w: 'land', d: 'riverband', B: 'open' };
function plotGround(px, py) {
  const k = plotType(px, py);
  if (k === 'H') return py * CHUNK >= RIVER_TOP ? 'riverband' : 'stream'; // up in the mountains: a mountain lake
  return PLOT_GROUND[k] || 'mountain';
}
const GROUND = new Array(N * NR);
function ground(c, r) {
  if (!inWorld(c, r)) return 'mountain';
  const i = r * N + c;
  if (GROUND[i]) return GROUND[i];
  const px = Math.floor(c / CHUNK), py = Math.floor(r / CHUNK);
  let t = plotGround(px, py);
  if (t !== 'land') {
    const wx = c + Math.round((hash(c >> 1, r >> 1, 21) - 0.5) * 5);
    const wy = r + Math.round((hash(c >> 1, r >> 1, 22) - 0.5) * 5);
    const t2 = plotGround(Math.floor(wx / CHUNK), Math.floor(wy / CHUNK));
    if (t2 !== 'land') t = t2;
  }
  return (GROUND[i] = t);
}
// The mountain "stream" plots hold small mountain lakes (the river's source).
const isMountainLake = (c, r) => ground(c, r) === 'stream'
  && (((c % CHUNK) - 2.5) / 2.4) ** 2 + (((r % CHUNK) - 2.5) / 2.4) ** 2 <= 1;
const isRiver = (c, r) => r >= RIVER_TOP && r <= RIVER_BOTTOM && c >= 34 && Math.abs(r - riverCentre(c)) <= 1.2
  && ground(c, r) !== 'ocean';
const isBridge = (c, r) => isRiver(c, r) && PATH_COLS.includes(c);
// Any water you can't walk on (ponds, river, mountain lakes). Ocean is separate.
const isWet = (c, r) => (isWater(c, r) || isRiver(c, r) || isMountainLake(c, r)) && !isBridge(c, r);

// ---------- The open world (village) ----------
// The bottom of the valley (sketch "B") is the open world: never buyable, no forest, home of the village and
// its NPCs (design TBD; for now a plaza, a well and the three shops). A straight dirt path runs from the bottom
// of your starting land down between plot columns 4 and 5, over the river on a wooden bridge, to the plaza.
// Only you (and your pet) walk there; zombies never do. Plots of your land that the path crosses can still be
// bought (the path stays dirt, like the road).
const TRAIL_TOP = START_CHUNKS.reduce((m, [, y]) => Math.max(m, y), 0) * CHUNK + CHUNK; // 78: below your start plots
const PLAZA = { c0: O + 18, c1: O + 29, r0: RIVER_BOTTOM + 3, r1: RIVER_BOTTOM + 6 };     // 110..113
const isTrail = (c, r) => PATH_COLS.includes(c) && r >= TRAIL_TOP && r < PLAZA.r0 && !isRiver(c, r);
const isPlaza = (c, r) => c >= PLAZA.c0 && c <= PLAZA.c1 && r >= PLAZA.r0 && r <= PLAZA.r1;
const inVillage = (c, r) => ground(c, r) === 'open';
// Shops are 2×2 along the top of the open world; you talk to them from the tile in front of the door.
const SHOPS = [
  { id: 'petshop', name: 'Pet Shop', c: O + 12, r: RIVER_BOTTOM + 1 },
  { id: 'store', name: 'General Store', c: O + 31, r: RIVER_BOTTOM + 1 },
  { id: 'tavern', name: 'Tavern', c: O + 36, r: RIVER_BOTTOM + 1 },
];
for (const s of SHOPS) s.door = { c: s.c + 1, r: s.r + 2 };
const WELL = { c: O + 20, r: PLAZA.r1 };
const shopAt = (c, r) => SHOPS.find((s) => c >= s.c && c < s.c + 2 && r >= s.r && r < s.r + 2);
// Blocked: the shops, the well, and the shopkeepers standing beside each door.
const villageBlocked = (c, r) => !!shopAt(c, r) || (c === WELL.c && r === WELL.r) || SHOPS.some((s) => c === s.c && r === s.r + 2);

// Only plots of your 8×8 land can be bought, and only next to land you already own.
function canBuy(cx, cy) {
  if (!isLandPlot(cx, cy) || ownsChunk(cx, cy)) return false;
  return ownsChunk(cx - 1, cy) || ownsChunk(cx + 1, cy) || ownsChunk(cx, cy - 1) || ownsChunk(cx, cy + 1);
}

// Forest: most unowned land and forest tiles have a tree (never on the road, the path, water or the bridge;
// ponds keep a little clearing so you can spot them from home). Same pattern every time.
const forestTree = (c, r) => {
  const gr = ground(c, r);
  if (gr !== 'forest' && gr !== 'riverband' && !(gr === 'land' && !ownsTile(c, r))) return false;
  return !isRoad(c, r) && !isTrail(c, r) && !isWet(c, r) && !isBridge(c, r) && !nextToWater(c, r) && hash(c, r, 7) < 0.82;
};
// A few lone trees in the open world, away from the village.
const meadowTree = (c, r) => ground(c, r) === 'open' && hash(c, r, 9) < 0.035 && !isTrail(c, r)
  && !(c >= PLAZA.c0 - 8 && c <= PLAZA.c1 + 10 && r <= PLAZA.r1 + 3);

// ---------- Art ----------

const sprite = (name, pal) => rowsToCanvas(SPRITES[name], pal);
const img = {
  grass: [0, 1, 2, 3].map((s) => rowsToCanvas(grassRows(s))),
  meadow: [0, 1, 2, 3].map((s) => rowsToCanvas(meadowRows(s))),
  mountain: [0, 1, 2, 3].map((s) => rowsToCanvas(mountainRows(s))),
  peak: [0, 1, 2].map((s) => rowsToCanvas(peakRows(s))),
  danger: [0, 1, 2, 3].map((s) => rowsToCanvas(dangerRows(s))),
  deadTree: rowsToCanvas(deadTreeRows()),
  bridge: { w: rowsToCanvas(bridgeRows('w')), e: rowsToCanvas(bridgeRows('e')) },
  tree: rowsToCanvas(treeRows()),
  rubble: sprite('rubble'),
  cave: sprite('cave'),
  shadow: rowsToCanvas(shadowRows()),
  villagers: [sprite('villager'), sprite('villager', PAL_RED)],
  zombie: sprite('zombie'),
  runner: sprite('zombie', PAL_RUNNER),
  brute: sprite('zombie', PAL_BRUTE),
  king: sprite('zombie', PAL_KING),
};
// White versions for the hit flash.
const flashImg = {
  tree: rowsToCanvas(treeRows(), PAL_FLASH),
  zombie: sprite('zombie', PAL_FLASH),
  runner: sprite('zombie', PAL_FLASH),
  brute: sprite('zombie', PAL_FLASH),
  king: sprite('zombie', PAL_FLASH),
};

// Building art can depend on level, the base theme, and (for walls) which neighbours are walls.
// Each variant is drawn once and kept.
const levelArt = new Map();
function levelImg(type, level, mask, flash) {
  const theme = game.theme;
  const key = `${type}:${level}:${mask}:${theme}:${flash ? 1 : 0}`;
  let c = levelArt.get(key);
  if (!c) {
    let rows, pal = themePalette(theme);
    if (type === 'wall') rows = wallRows(level, mask);
    else if (type === 'house') rows = houseRows(level);
    else if (type === 'tower') { rows = towerRows(); pal = towerPalette(level); }
    else if (hasCardArt(type)) { rows = cardRows(type); pal = PAL; }
    else if (BUILDINGS[type].decor) rows = decorRows(type);
      else { rows = buildingRows(type); pal = PAL; }
    c = rowsToCanvas(rows, flash ? PAL_FLASH : pal);
    levelArt.set(key, c);
  }
  return c;
}

// ---------- Drawing the ground ----------
// The world is 3456×3456 px: too big for one image. Each plot (6×6 tiles) is drawn into its own small image
// the first time it's on screen, and kept (up to PLOT_CACHE_MAX, oldest dropped). Zoomed far out, a small
// overview image (4 px per tile) is drawn instead. Buying land clears them so they redraw.
const PLOT_PX = CHUNK * T;
const PLOT_CACHE_MAX = 160;
const plotCache = new Map();
const tileArt = new Map(); // edge variants of dirt / water / ocean tiles, drawn once each
function tileImg(kind, seed, edges, make) {
  const key = `${kind}:${seed}:${edges.n ? 1 : 0}${edges.s ? 1 : 0}${edges.w ? 1 : 0}${edges.e ? 1 : 0}`;
  if (!tileArt.has(key)) tileArt.set(key, rowsToCanvas(make(seed, edges)));
  return tileArt.get(key);
}
const edgesOf = (c, r, same) => ({ n: !same(c, r - 1), s: !same(c, r + 1), w: !same(c - 1, r), e: !same(c + 1, r) });

function drawGroundTile(g, c, r, x, y) {
  const v = (c * 7 + r * 13 + c * r) % 4;
  if (isRoad(c, r)) {
    const edges = edgesOf(c, r, isRoad);
    if (r === BASE_TOP - 1) edges.s = false; // the road runs into your land
    if (r === ROAD_TOP) edges.n = false;     // ...and out of the den
    g.drawImage(tileImg('dirt', (c + r) % 4, edges, dirtRows), x, y);
  } else if (isBridge(c, r)) {
    g.drawImage(img.bridge[c === PATH_COLS[0] ? 'w' : 'e'], x, y);
  } else if (isWet(c, r)) {
    g.drawImage(tileImg('water', (c * 3 + r) % 4, edgesOf(c, r, (a, b) => isWet(a, b) || isBridge(a, b) || ground(a, b) === 'ocean'), waterRows), x, y);
  } else if (isTrail(c, r) || isPlaza(c, r)) {
    const dirt = (a, b) => isTrail(a, b) || isPlaza(a, b) || isBridge(a, b);
    const edges = edgesOf(c, r, dirt);
    if (r === TRAIL_TOP) edges.n = false;
    g.drawImage(tileImg('dirt', (c + r) % 4, edges, dirtRows), x, y);
  } else {
    const gr = ground(c, r);
    if (gr === 'mountain' || gr === 'stream') g.drawImage(img.mountain[v], x, y);
    else if (gr === 'ocean') g.drawImage(tileImg('ocean', v, edgesOf(c, r, (a, b) => ground(a, b) === 'ocean' || !inWorld(a, b)), oceanRows), x, y);
    else if (gr === 'danger') g.drawImage(img.danger[v], x, y);
    else if (gr === 'open') g.drawImage(img.meadow[v], x, y);
    else g.drawImage(img.grass[v], x, y);
  }
}

// Things that stand on the ground (trees, peaks, dead trees), drawn after the ground, row by row.
function drawGroundDeco(g, c, r, x, y) {
  const gr = ground(c, r);
  if (forestTree(c, r) || meadowTree(c, r)) {
    const jx = Math.round((hash(c, r, 3) - 0.5) * 2), jy = Math.round((hash(c, r, 5) - 0.5) * 2);
    g.drawImage(img.shadow, x + jx, y + jy);
    g.drawImage(img.tree, x + jx, y + jy);
  } else if (gr === 'mountain' && !isRiver(c, r) && hash(c, r, 13) < 0.4) {
    g.drawImage(img.peak[Math.floor(hash(c, r, 14) * 3)], x, y);
  } else if (gr === 'danger' && !isRoad(c, r) && hash(c, r, 15) < 0.08) {
    g.drawImage(img.deadTree, x, y);
  }
}

function buildPlot(px, py) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = PLOT_PX;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const c0 = px * CHUNK, r0 = py * CHUNK;
  for (let r = 0; r < CHUNK; r++) for (let c = 0; c < CHUNK; c++) drawGroundTile(g, c0 + c, r0 + r, c * T, r * T);
  // Faint grid lines on your own land, so it's easy to count tiles when building.
  if (ownsChunk(px, py)) {
    g.fillStyle = 'rgba(26,28,44,0.16)';
    for (let i = 0; i < CHUNK; i++) { g.fillRect(i * T, 0, 1, PLOT_PX); g.fillRect(0, i * T, PLOT_PX, 1); }
  }
  for (let r = 0; r < CHUNK; r++) for (let c = 0; c < CHUNK; c++) drawGroundDeco(g, c0 + c, r0 + r, c * T, r * T);
  if (Math.floor(CAVE.c / CHUNK) === px && Math.floor(CAVE.r / CHUNK) === py) g.drawImage(img.cave, CAVE.x - c0 * T, CAVE.y - r0 * T);
  // Land you can't buy yet is a little darker.
  if (isLandPlot(px, py) && !ownsChunk(px, py) && !canBuy(px, py)) {
    g.fillStyle = 'rgba(26,28,44,0.38)';
    g.fillRect(0, 0, PLOT_PX, PLOT_PX);
  }
  return cv;
}

function plotImg(px, py) {
  const key = py * 100 + px;
  let cv = plotCache.get(key);
  if (cv) { plotCache.delete(key); plotCache.set(key, cv); return cv; } // most recently used goes last
  cv = buildPlot(px, py);
  plotCache.set(key, cv);
  if (plotCache.size > PLOT_CACHE_MAX) plotCache.delete(plotCache.keys().next().value);
  return cv;
}

// Overview: 6 px per tile, used when zoomed out (whenever more plots are on screen than the cache can hold,
// drawing them would mean rebuilding plots every frame - that was the zoom-out lag).
const OVERVIEW_PX = 6;
const overview = document.createElement('canvas');
overview.width = N * OVERVIEW_PX;
overview.height = NR * OVERVIEW_PX;
const GROUND_COLOR = {
  danger: '#2a1530', mountain: '#94b0c2', stream: '#94b0c2', ocean: '#29366f', forest: '#257179',
  riverband: '#257179', open: '#5fcf6f', land: '#38b764',
};
function buildOverview() {
  const g = overview.getContext('2d');
  for (let r = 0; r < NR; r++) {
    for (let c = 0; c < N; c++) {
      let col = GROUND_COLOR[ground(c, r)];
      if (isRoad(c, r) || isTrail(c, r) || isPlaza(c, r) || isBridge(c, r)) col = '#c29a5b';
      else if (isWet(c, r)) col = '#41a6f6';
      else if (forestTree(c, r)) col = '#257179';
      else if (ground(c, r) === 'land' && !ownsTile(c, r) && !canBuy(...chunkOfTile(c, r))) col = '#2c7a52';
      g.fillStyle = col;
      g.fillRect(c * OVERVIEW_PX, r * OVERVIEW_PX, OVERVIEW_PX, OVERVIEW_PX);
    }
  }
}

// Redraw the ground after the land changes (bought a plot, new game).
function buildTerrain() {
  plotCache.clear();
  buildOverview();
}

// Draw the visible part of the ground. Called with the world transform already set (scale s, offset ox/oy).
function drawTerrain(s, ox, oy) {
  const px0 = Math.max(0, Math.floor(-ox / s / PLOT_PX)), py0 = Math.max(0, Math.floor(-oy / s / PLOT_PX));
  const px1 = Math.min(N / CHUNK - 1, Math.floor((canvas.width - ox) / s / PLOT_PX));
  const py1 = Math.min(NR / CHUNK - 1, Math.floor((canvas.height - oy) / s / PLOT_PX));
  const visible = (px1 - px0 + 1) * (py1 - py0 + 1);
  if (s < 0.4 || visible > PLOT_CACHE_MAX / 2) { ctx.drawImage(overview, 0, 0, WORLD, WORLD_H); return; }
  const seam = 1 / s; // overlap one screen pixel so plot edges never show a gap
  // Building a plot image is slow, so at most a few new ones per frame (no hitch when you zoom out);
  // the rest show the overview's version of that plot until their turn comes.
  let budget = 4;
  const op = CHUNK * OVERVIEW_PX;
  for (let py = py0; py <= py1; py++) {
    for (let px = px0; px <= px1; px++) {
      if (plotCache.has(py * 100 + px) || budget-- > 0) ctx.drawImage(plotImg(px, py), px * PLOT_PX, py * PLOT_PX, PLOT_PX + seam, PLOT_PX + seam);
      else ctx.drawImage(overview, px * op, py * op, op, op, px * PLOT_PX, py * PLOT_PX, PLOT_PX + seam, PLOT_PX + seam);
    }
  }
}
buildTerrain();

// ---------- Villagers (your NPCs) ----------
// One body on the map per NPC in game.npcs (see "NPCs: your people" below for what they do).
let villagers = [];

// Villagers walk tile by tile on your land, around buildings (rubble is walkable).
const villagerCanStand = (c, r) => {
  if (!inWorld(c, r) || !ownsTile(c, r) || isWet(c, r)) return false;
  const b = buildingAt(c, r);
  return !b || b.hp <= 0;
};

// Breadth-first search over walkable tiles. Returns the path to the first tile `isGoal` accepts
// (or, with pickRandom, to a random reachable tile within maxSteps).
function findPath(v, isGoal, maxSteps, pickRandom, canStand = villagerCanStand) {
  const start = { c: Math.round(v.x / T), r: Math.round(v.y / T) };
  const prev = new Map([[`${start.c},${start.r}`, null]]);
  const queue = [{ ...start, d: 0 }];
  const reachable = [];
  let goal = null;
  while (queue.length && !goal) {
    const cur = queue.shift();
    if (cur.d > 0) reachable.push(cur);
    if (isGoal && isGoal(cur.c, cur.r)) { goal = cur; break; }
    if (cur.d >= maxSteps) continue;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cur.c + dc, r = cur.r + dr, key = `${c},${r}`;
      if (prev.has(key) || !canStand(c, r)) continue;
      prev.set(key, `${cur.c},${cur.r}`);
      queue.push({ c, r, d: cur.d + 1 });
    }
  }
  if (!goal && pickRandom && reachable.length) goal = reachable[Math.floor(Math.random() * reachable.length)];
  if (!goal) return null;
  const path = [];
  for (let key = `${goal.c},${goal.r}`; key && prev.get(key) !== null; key = prev.get(key)) {
    const [c, r] = key.split(',').map(Number);
    path.unshift({ c, r });
  }
  return path;
}

// ---------- The player character ----------
// Walks tile by tile (Pokémon style): tap where to go, or use the arrow keys / WASD.
// Can stand on your land (around buildings) and on the road.
// You can walk: your land, the road (but not into zombie country), the path, the bridge, and the open world.
const heroCanStand = (c, r) => villagerCanStand(c, r)
  || (inWorld(c, r) && r >= DANGER_BOTTOM && (isRoad(c, r) || isTrail(c, r) || isBridge(c, r) || isPlaza(c, r)
    || (inVillage(c, r) && !villageBlocked(c, r) && !meadowTree(c, r))));

const hero = {
  isHero: true, x: (O + 24) * T, y: (O + 28) * T, path: null, wait: 0, t: 0, inside: false, fleeing: false,
  dir: 'down', moving: false,
};
const heroArt = new Map();
function heroImg(dir, frame) {
  const key = `${dir}:${frame}:${JSON.stringify(game.look)}`;
  if (!heroArt.has(key)) heroArt.set(key, rowsToCanvas(heroRows(dir, frame), heroPalette(game.look)));
  return heroArt.get(key);
}

let follow = false; // camera follows the hero while walking

// You're the director: there's no character to walk around. You tap things to use them.
// Reach still matters for repairs and wall upgrades: your people work from the House door, so a wall
// buried in the middle of a thick wall can't be got at (smart base design matters).
const REACH = 1;
// Is a footprint (c, r, size) within reach of someone standing on (hc, hr)?
const reachesFrom = (hc, hr, c, r, s) => hc >= c - REACH && hc <= c + s - 1 + REACH && hr >= r - REACH && hr <= r + s - 1 + REACH;

// Which buildings can your people get within reach of, walking from the House door?
function reachableSet() {
  const h = house();
  const start = { c: h.c + 1, r: h.r + sizeOf(h) };
  const seen = new Set([`,`]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cur.c + dc, r = cur.r + dr, key = `,`;
      if (seen.has(key) || !heroCanStand(c, r)) continue;
      seen.add(key);
      queue.push({ c, r });
    }
  }
  const out = new Set();
  for (const b of game.buildings) {
    const s = sizeOf(b);
    search: for (let r = b.r - REACH; r <= b.r + s - 1 + REACH; r++) {
      for (let c = b.c - REACH; c <= b.c + s - 1 + REACH; c++) if (seen.has(`,`)) { out.add(b); break search; }
    }
  }
  return out;
}

// ---------- Pets ----------
// One pet walks with you. Its perk works while it's been fed in the last PET_FED_HOURS.
const pet = { x: hero.x, y: hero.y, t: 0 };
const petFed = (type) => clock() - (game.pets.fedAt[type] || 0) < PET_FED_HOURS * 3_600_000;
const petPerk = (type) => game.pets.active === type && petFed(type);
const petArt = new Map();
function petImg(type, frame) {
  const key = `${type}:${frame}`;
  if (!petArt.has(key)) petArt.set(key, rowsToCanvas(petRows(type, frame)));
  return petArt.get(key);
}

function updatePet(dt) {
  pet.t += dt;
  if (!game.pets.active) return;
  // Trot along a step behind you.
  const back = { down: [0, -14], up: [0, 14], left: [14, 0], right: [-14, 0] }[hero.dir];
  const tx = hero.x + back[0], ty = hero.y + back[1];
  const dx = tx - pet.x, dy = ty - pet.y, d = Math.hypot(dx, dy);
  pet.moving = d > 2;
  if (d > 200) { pet.x = tx; pet.y = ty; return; } // teleport if left far behind
  const k = Math.min(1, dt * 5);
  pet.x += dx * k;
  pet.y += dy * k;
}

// ---------- Village folk ----------
const inVillageFree = (c, r) => inVillage(c, r) && !villageBlocked(c, r);
const SHOPKEEPERS = SHOPS.map((s, i) => ({
  shop: s, c: s.c, r: s.r + 2,
  look: [{ skin: '#f4c8a0', hair: '#f4f4f4', shirt: '#ef7d57', pants: '#5a3a1f' },
    { skin: '#c8955a', hair: '#1a1c2c', shirt: '#b13e53', pants: '#333c57' },
    { skin: '#f4c8a0', hair: '#8b5a2b', shirt: '#7a2f8f', pants: '#29366f' }][i],
}));
const shopkeeperAt = (c, r) => SHOPKEEPERS.find((k) => k.c === c && k.r === r);
const TOWNSFOLK_LOOKS = [
  { skin: '#f4c8a0', hair: '#d9a033', shirt: '#41a6f6', pants: '#566c86' },
  { skin: '#8d6a3a', hair: '#1a1c2c', shirt: '#ffcd75', pants: '#257179' },
  { skin: '#f4c8a0', hair: '#b13e53', shirt: '#a7f070', pants: '#5d275d' },
];
const townsfolk = TOWNSFOLK_LOOKS.map((look, i) => ({
  look, x: (PLAZA.c0 + 2 + i * 4) * T, y: (PLAZA.r0 + 2) * T, path: null, wait: 1 + i, t: 0, dir: 'down',
  canStand: (c, r) => inVillageFree(c, r) && !shopkeeperAt(c, r),
}));
const villageArt = new Map();
function villageImg(id) {
  if (!villageArt.has(id)) villageArt.set(id, rowsToCanvas(id === 'well' ? wellRows() : shopRows(id)));
  return villageArt.get(id);
}

function personImg(look, dir, frame) {
  const key = `p:${dir}:${frame}:${JSON.stringify(look)}`;
  if (!heroArt.has(key)) heroArt.set(key, rowsToCanvas(heroRows(dir, frame), heroPalette(look)));
  return heroArt.get(key);
}

// Arrow keys / WASD: held keys (see heroKeyStep).
const heldKeys = new Set();
const KEY_DIRS = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};
window.addEventListener('keydown', (e) => { if (KEY_DIRS[e.code]) { heldKeys.add(e.code); e.preventDefault(); } });
window.addEventListener('keyup', (e) => heldKeys.delete(e.code));

// Arrow keys / WASD pan the camera.
function heroKeyStep() {
  const code = [...heldKeys].pop();
  if (!code) return;
  const [dc, dr] = KEY_DIRS[code];
  cam.x += (dc * 6) / cam.z; cam.y += (dr * 6) / cam.z;
  follow = false;
  clampCam();
}

function pickTarget(v) {
  if (v.isHero) { v.wait = 0; return; } // the hero only walks where you tell them
  if (v.job || (v.npc?.role === 'archer' && v.npc.post) || (isFighter(v) && battle.active)) { v.wait = 0.3; return; } // busy: no wandering
  const path = findPath(v, null, 10, true, v.canStand || villagerCanStand);
  if (!path) { v.wait = 2; return; }
  v.path = path;
}

// Wave starting: everyone runs for the House door.
function villagersRunHome() {
  const h = house();
  const nextToHouse = (c, r) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => {
    const b = buildingAt(c + dc, r + dr);
    return b === h;
  });
  for (const v of villagers) { // the hero stays out to fight
    if (v.inside) continue;
    // Archers stay at their towers and builders keep fixing things; everyone else runs.
    // Fighters stay out to fight.
    if (v.npc && ((v.npc.role === 'archer' && v.npc.post) || v.npc.role === 'builder' || isFighter(v))) continue;
    v.job = null;
    v.path = findPath(v, nextToHouse, 160, false, v.isHero ? heroCanStand : v.canStand || villagerCanStand) || [];
    v.fleeing = true;
    v.wait = 0;
  }
}

function updateVillager(v, dt) {
  if (v.inside || v.down) return;
  v.t += dt;
  v.moving = false;
  if (v.wait > 0) { v.wait -= dt; if (v.wait <= 0 && !v.fleeing) pickTarget(v); return; }
  const next = v.path?.[0];
  if (!next) {
    if (v.fleeing) { v.inside = true; v.fleeing = false; return; }
    if (v.onArrive) { const f = v.onArrive; v.onArrive = null; f(); }
    if (!v.isHero) v.wait = 1 + Math.random() * 3;
    return;
  }
  // If something was built in the way, stop and plan again.
  if (!(v.isHero ? heroCanStand : v.canStand || villagerCanStand)(next.c, next.r)) {
    if (v.fleeing) { v.inside = true; v.fleeing = false; return; }
    v.path = null; v.wait = v.isHero ? 0 : 0.5; return;
  }
  const tx = next.c * T, ty = next.r * T;
  const dx = tx - v.x, dy = ty - v.y;
  const d = Math.hypot(dx, dy);
  if (d > 0.5) v.dir =Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  // Wandering villagers stroll; people heading to a job (or their tower) hurry.
  const onDuty = v.job || v.foe || (v.npc?.post && !v.atPost);
  const step = (v.isHero ? 48 * (petPerk('dog') ? 1.5 : 1) : v.fleeing ? 48 : v.foe ? 40 : onDuty ? 34 : 14) * (v.npc ? traitOf(v.npc).speed || 1 : 1) * dt;
  v.moving = true;
  if (d <= step) {
    v.x = tx; v.y = ty;
    v.path.shift();
    if (!v.path.length && !v.fleeing && !v.isHero) v.wait = 1 + Math.random() * 3;
    return;
  }
  v.x += (dx / d) * step;
  v.y += (dy / d) * step;
}

// Villagers step out of the House door when it's safe again.
function villagersLeaveHouse() {
  const h = house();
  const doorC = h.c + 1, doorR = h.r + sizeOf(h);
  villagers.forEach((v, i) => {
    if (!v.inside && !v.fleeing) return; // only those who went in come out
    const c = villagerCanStand(doorC + (i % 2 ? 1 : -1), doorR) ? doorC + (i % 2 ? 1 : -1) : doorC;
    v.x = c * T;
    v.y = doorR * T;
    v.path = null;
    v.inside = false;
    v.fleeing = false;
    v.wait = 0.3 + i * 0.5;
  });
}

// ---------- NPCs: your people ----------
// You're the director: hire people at the Tavern and they get on with their jobs by themselves.
//   Archer: walks to a tower that has nobody in it and mans it. A tower with nobody in it doesn't shoot.
//   Builder: walks to damaged walls, towers and resource buildings and fixes them for free (even mid-wave).
// NPCs walk on your land, the road, the path, the bridge and the village.
const npcCanStand = (c, r) => villagerCanStand(c, r)
  || (inWorld(c, r) && r >= DANGER_BOTTOM && (isRoad(c, r) || isTrail(c, r) || isBridge(c, r) || isPlaza(c, r)
    || (inVillage(c, r) && !villageBlocked(c, r) && !meadowTree(c, r))));

function npcLook(n) {
  const skins = LOOK_PARTS[0].options;
  return { ...NPC_ROLES[n.role].look, skin: skins[(n.id * 3) % skins.length] };
}

function makeBody(n, at) {
  const h = house();
  const pos = at || { c: h.c + 1, r: h.r + sizeOf(h) };
  return {
    npc: n, npcId: n.id, look: npcLook(n), x: pos.c * T, y: pos.r * T, path: null, wait: 0.3 + Math.random(),
    t: Math.random() * 5, inside: false, fleeing: false, dir: 'down', moving: false, atPost: false, job: null,
    scan: Math.random(), canStand: npcCanStand,
  };
}

// Keep one body per NPC (new hires get a body; bodies of NPCs that no longer exist go).
function syncNpcBodies(spawnAt) {
  const byId = new Map(villagers.map((v) => [v.npcId, v]));
  villagers = game.npcs.map((n) => {
    const v = byId.get(n.id);
    if (v) { v.npc = n; return v; }
    return makeBody(n, spawnAt);
  });
}

const vTile = (v) => ({ c: Math.round(v.x / T), r: Math.round(v.y / T) });
const npcInReach = (v, b, size = sizeOf(b)) => { const t = vTile(v); return reachesFrom(t.c, t.r, b.c, b.r, size); };
// Path to a spot within reach of building b (never standing on it).
const pathToReach = (v, b, maxSteps = 200) => findPath(v, (c, r) => !covers(b, c, r) && reachesFrom(c, r, b.c, b.r, sizeOf(b)), maxSteps, false, v.canStand);
const isManned = (b) => villagers.some((v) => v.npc.post === b.id && v.atPost);
const faceTowards = (v, b) => {
  const t = vTile(v);
  v.dir = t.r < b.r ? 'down' : t.r >= b.r + sizeOf(b) ? 'up' : t.c < b.c ? 'right' : 'left';
};

// ---------- Fighters ----------
// Guards (swords) and gunners (guns) stay outside when a wave starts and go to meet any zombie that
// gets within GUARD_RADIUS of the House. Zombies stop to fight them. A fighter who drops lies there
// until the wave is over, then gets back up with full health.
const isFighter = (v) => !!NPC_ROLES[v.npc?.role]?.fight;
const fightOf = (v) => NPC_ROLES[v.npc.role].fight;
const fighterMaxHp = (v) => Math.round(fightOf(v).hp * fighterScale(houseLevel(game)) * (traitOf(v.npc).hp || 1));
function healFighter(v) { v.down = false; v.hp = fighterMaxHp(v); v.foe = null; v.cd = 0; }

function fighterThink(v, dt) {
  if (v.hp === undefined) healFighter(v);
  v.flash = Math.max(0, (v.flash || 0) - dt);
  v.swing = Math.max(0, (v.swing || 0) - dt);
  if (v.down) v.t += dt; // keeps the "down" marker blinking
  if (v.down || v.inside) { if (!battle.active) healFighter(v); return; }
  // Fighters live at the base: if they're far from the House (just hired, say), they walk back.
  const home = centerOf(house());
  const far = Math.hypot(v.x + T / 2 - home.x, v.y + T / 2 - home.y) > (GUARD_RADIUS - 3) * T;
  if (!battle.active) {
    if (v.hp < fighterMaxHp(v)) healFighter(v);
    if (far && !v.path?.length) { v.path = pathToReach(v, house(), 400) || []; v.wait = 0; v.goingHome = true; }
    if (!far) v.goingHome = false;
    return;
  }
  const t0 = fightOf(v), tr = traitOf(v.npc);
  const f = { ...t0, range: t0.range + (t0.weapon === 'gun' ? tr.range || 0 : 0) };
  v.cd -= dt;
  const me = { x: v.x + T / 2, y: v.y + T / 2 };
  let foe = null, best = Infinity;
  for (const m of battle.monsters) {
    if (m.dead || Math.hypot(m.x - home.x, m.y - home.y) > GUARD_RADIUS * T) continue;
    const d = Math.hypot(m.x - me.x, m.y - me.y);
    if (d < best) { best = d; foe = m; }
  }
  v.foe = foe;
  if (!foe) {
    if (far && !v.path?.length) { v.path = pathToReach(v, house(), 400) || []; v.wait = 0; }
    return;
  }
  if (best <= f.range * T) {
    v.path = null;
    const dx = foe.x - me.x, dy = foe.y - me.y;
    v.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    if (v.cd > 0) return;
    v.cd = f.rate;
    v.swing = 0.2;
    const damage = f.damage * fighterScale(houseLevel(game)) * (tr.power || 1);
    if (f.weapon === 'gun') {
      const len = Math.hypot(dx, dy) || 1;
      battle.shots.push({ x: me.x, y: me.y - 4, vx: dx / len, vy: dy / len, target: foe, def: { damage }, kind: 'bullet', travelled: 0, hits: new Set() });
    } else {
      battle.hitMonster(foe, damage);
      battle.effects.push({ kind: 'burst', x: foe.x, y: foe.y - 4, t: 0, life: 0.15, color: 'w' });
    }
    return;
  }
  // Close in: the last few tiles go straight at it (if the ground allows), so a moving zombie can't
  // keep a guard one step behind.
  if (best < 3 * T) {
    const dx = foe.x - me.x, dy = foe.y - me.y, len = Math.hypot(dx, dy) || 1;
    const nx = v.x + (dx / len) * 40 * dt, ny = v.y + (dy / len) * 40 * dt;
    if (v.canStand(Math.round(nx / T), Math.round(ny / T))) {
      v.path = null; v.x = nx; v.y = ny; v.moving = true; v.t += dt;
      v.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      return;
    }
  }
  // Walk to it, planning a new path twice a second as it moves. Gunners keep their distance.
  if ((v.repath = (v.repath || 0) - dt) > 0 && v.path?.length) return;
  v.repath = 0.5;
  const keep = Math.max(1, f.range - 1);
  v.path = findPath(v, (c, r) => Math.hypot(c - foe.c, r - foe.r) <= keep, far ? 400 : 80, false, v.canStand) || [];
  v.wait = 0;
}

// ---------- Your hero: a mobile tower ----------
// Tap the hero for their menu: MOVE (then tap where they should stand guard - works mid-wave too),
// UPGRADE (daytime) and LOOK. They shoot any zombie in range, on the way there too.
let movingHero = false; // waiting for you to tap the hero's new guard spot
const heroPost = () => game.hero.post || { c: house().c + 1, r: house().r + sizeOf(house()) + 1 };
const heroMaxHp = () => heroStats(game.hero.level).hp;
const heroTile = () => ({ c: Math.round(hero.x / T), r: Math.round(hero.y / T) });

function sendHero(c, r) {
  if (!heroCanStand(c, r)) { showToast("YOUR HERO CAN'T STAND THERE"); return false; }
  game.hero.post = { c, r };
  hero.path = null;
  hero.repath = 0;
  showToast('YOUR HERO IS ON THE WAY');
  saveGame();
  return true;
}

function upgradeHero() {
  const lvl = game.hero.level;
  if (lvl >= HERO_MAX_LEVEL) { showToast('YOUR HERO IS AT MAX LEVEL'); return; }
  if (phase !== 'home') { showToast('UPGRADE YOUR HERO BETWEEN WAVES'); return; }
  const cost = heroUpgradeCost(lvl);
  if (!canAfford(game, cost)) { showToast(`NOT ENOUGH ${missing(game, cost).toUpperCase()}`); return; }
  for (const k of RES) game[k] -= cost[k] || 0;
  game.hero.level++;
  hero.hp = heroMaxHp();
  addPuff(hero.x + T / 2, hero.y + T / 2);
  showToast(`HERO REACHED LV ${game.hero.level}!`);
}

function heroThink(dt) {
  hero.swing = Math.max(0, (hero.swing || 0) - dt);
  hero.cd = (hero.cd || 0) - dt;
  if (hero.hp === undefined || !battle.active) { hero.down = false; hero.hp = heroMaxHp(); }
  if (hero.down) { hero.t += dt; return; }
  hero.inside = false;
  const f = heroStats(game.hero.level);
  const me = { x: hero.x + T / 2, y: hero.y + T / 2 };
  hero.foe = null;
  if (battle.active) {
    let foe = null, best = Infinity;
    for (const m of battle.monsters) {
      if (m.dead) continue;
      const d = Math.hypot(m.x - me.x, m.y - me.y);
      if (d < best) { best = d; foe = m; }
    }
    if (foe && best <= f.range * T) {
      hero.foe = foe;
      if (hero.cd <= 0) {
        hero.cd = f.rate;
        hero.swing = 0.2;
        const dx = foe.x - me.x, dy = foe.y - 4 - me.y, len = Math.hypot(dx, dy) || 1;
        if (!hero.path?.length) hero.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        battle.shots.push({ x: me.x, y: me.y - 6, vx: dx / len, vy: dy / len, target: foe, def: { damage: f.damage }, kind: 'arrow', travelled: 0, hits: new Set() });
      }
    }
  }
  // Head for the guard spot.
  const p = heroPost(), t = heroTile();
  if ((t.c !== p.c || t.r !== p.r) && !hero.path?.length && (hero.repath = (hero.repath || 0) - dt) <= 0) {
    hero.repath = 1;
    hero.path = findPath(hero, (c, r) => c === p.c && r === p.r, 400, false, heroCanStand) || [];
  }
}

function npcThink(v, dt) {
  const n = v.npc;
  if (isFighter(v)) { fighterThink(v, dt); return; }
  if (v.inside || v.fleeing) return;

  if (n.role === 'archer') {
    let post = n.post ? game.buildings.find((b) => b.id === n.post) : null;
    if (!post || post.hp <= 0 || post.type !== 'tower') { n.post = null; post = null; v.atPost = false; }
    if (!post) {
      const taken = new Set(game.npcs.filter((o) => o !== n && o.post).map((o) => o.post));
      post = game.buildings.find((b) => b.type === 'tower' && b.hp > 0 && !taken.has(b.id));
      if (!post) return; // no free tower: wander
      n.post = post.id;
      v.path = null;
    }
    if (v.atPost) return;
    if (!v.path?.length) {
      if (npcInReach(v, post)) { v.atPost = true; v.x = post.c * T; v.y = post.r * T; return; }
      const p = pathToReach(v, post);
      if (p) { v.path = p; v.wait = 0; } else v.wait = 1;
    }
    return;
  }

  // Builders: keep the current job, or look for one every second.
  if (v.job) {
    const b = v.job;
    const done = !game.buildings.includes(b) || b.hp >= maxHp(b);
    if (done) { v.job = null; v.working = false; return; }
    if (v.path?.length) return;
    if (!npcInReach(v, b)) { const p = pathToReach(v, b); if (p) v.path = p; else v.job = null; return; }
    faceTowards(v, b);
    v.wait = 0.3;
    if (n.role === 'builder') {
      v.working = true;
      const wasBroken = b.hp <= 0;
      b.hp = Math.min(maxHp(b), b.hp + BUILDER_REPAIR_PER_SEC * (traitOf(n).power || 1) * dt);
      if (wasBroken && b.hp > 0) {
        if (battle.active) battle.recomputeFlow(); // it blocks the way again
      }
      if (b.hp >= maxHp(b)) { const p = centerOf(b); addPuff(p.x, p.y); v.job = null; v.working = false; saveGame(); }
    }
    return;
  }
  if ((v.scan -= dt) > 0) return;
  v.scan = 1;
  const busy = new Set(villagers.filter((o) => o !== v && o.job).map((o) => o.job));
  const wants = (b) => !busy.has(b) && !isRunObject(b) && n.role === 'builder' && (b.type === 'wall' || b.type === 'tower') && b.hp < maxHp(b);
  const t = vTile(v);
  const todo = game.buildings.filter(wants).sort((a, b) => Math.hypot(a.c - t.c, a.r - t.r) - Math.hypot(b.c - t.c, b.r - t.r));
  for (const b of todo.slice(0, 4)) {
    const p = npcInReach(v, b) ? [] : pathToReach(v, b);
    if (p) { v.job = b; v.path = p; v.wait = 0; return; }
  }
}

const traitOf = (n) => TRAITS[n.trait] || {};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// A fresh board of random applicants. Roles your House hasn't unlocked never turn up.
function rollApplicants() {
  const roles = Object.keys(NPC_ROLES).filter((r) => (NPC_ROLES[r].house || 1) <= houseLevel(game));
  const used = new Set(game.npcs.map((n) => n.name));
  game.applicants = Array.from({ length: APPLICANTS }, () => {
    const role = pick(roles);
    const trait = pick(Object.keys(TRAITS).filter((k) => !TRAITS[k].roles || TRAITS[k].roles.includes(role)));
    const mul = (TRAITS[trait].price || 1) * (0.85 + Math.random() * 0.35);
    const price = {};
    for (const [k, v] of Object.entries(NPC_ROLES[role].price)) price[k] = Math.max(5, Math.round((v * mul) / 5) * 5);
    const name = pick(NPC_NAMES.filter((x) => !used.has(x))) || pick(NPC_NAMES);
    used.add(name);
    return { role, trait, name, price };
  });
}

function rerollApplicants() {
  if (!canAfford(game, REROLL_PRICE)) { showToast(`NOT ENOUGH ${missing(game, REROLL_PRICE).toUpperCase()}`); return false; }
  for (const k of RES) game[k] -= REROLL_PRICE[k] || 0;
  rollApplicants();
  showToast('NEW FACES AT THE TAVERN!');
  return true;
}

// Hire applicant i off the board (their spot stays empty until the board reshuffles).
function hireApplicant(i) {
  const a = game.applicants?.[i];
  if (!a) return false;
  const cap = npcCap(houseLevel(game));
  if (game.npcs.length >= cap) { showToast(`NO ROOM - UPGRADE YOUR HOUSE (${cap} PEOPLE MAX)`); return false; }
  if (!canAfford(game, a.price)) { showToast(`NOT ENOUGH ${missing(game, a.price).toUpperCase()}`); return false; }
  for (const k of RES) game[k] -= a.price[k] || 0;
  game.applicants[i] = null;
  addNpc(a.role, a.name, a.trait);
  return true;
}

function addNpc(role, name = pick(NPC_NAMES.filter((x) => !game.npcs.some((n) => n.name === x))) || pick(NPC_NAMES), trait = null) {
  game.npcs.push({ id: game.nextNpc++, role, post: null, name, trait });
  const tavern = SHOPS.find((s) => s.id === 'tavern');
  syncNpcBodies(tavern.door); // they set off from the Tavern
  showToast(`${name} THE ${NPC_ROLES[role].name.toUpperCase()} IS ON THE WAY!`);
  saveGame();
}

// Hire a plain (no trait) person of a role at list price. Only the test hook and bots use this.
function hireNpc(role) {
  if ((NPC_ROLES[role].house || 1) > houseLevel(game)) { showToast(`UPGRADE YOUR HOUSE TO LEVEL ${NPC_ROLES[role].house} FIRST`); return false; }
  const cap = npcCap(houseLevel(game));
  if (game.npcs.length >= cap) { showToast(`NO ROOM - UPGRADE YOUR HOUSE (${cap} PEOPLE MAX)`); return false; }
  const price = NPC_ROLES[role].price;
  if (!canAfford(game, price)) { showToast(`NOT ENOUGH ${missing(game, price).toUpperCase()}`); return false; }
  for (const k of RES) game[k] -= price[k] || 0;
  addNpc(role);
  return true;
}

// ---------- Director's goals ----------
let goalClock = 0;
function checkGoals(dt) {
  if ((goalClock -= dt) > 0 || phase !== 'home') return;
  goalClock = 1;
  const goal = GOALS[game.goal];
  if (!goal || !goal.check(game)) return;
  const got = [];
  for (const [k, v] of Object.entries(goal.reward)) {
    if (k === 'gems') { game.gems += v; got.push(`${v} GEMS`); } else { const t = earn(game, k, v); got.push(`${t}${RES_LETTER[k]}`); }
  }
  game.goal++;
  showToast(`GOAL DONE! +${got.join(' +')}`);
  saveGame();
}

// ---------- Screen, camera & UI scale ----------

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let dpr = 1, viewW = 0, viewH = 0; // CSS pixels
let ui = 1, UW = 0, UH = 0;        // UI is drawn in chunky "UI pixels" so the pixel font stays crisp
const HUD_H = 16, BAR_H = 42, PANEL_H = 46;

const cam = { x: WORLD / 2, y: WORLD / 2, z: 1 }; // z = CSS pixels per world pixel
const MAX_Z = 6;
// Zoomed all the way out, the whole world (WORLD wide × WORLD_H tall) fits on screen.
const minZ = () => Math.min(viewW / WORLD, viewH / WORLD_H);

function clampCam() {
  cam.z = Math.max(minZ(), Math.min(MAX_Z, cam.z));
  cam.x = Math.max(0, Math.min(WORLD, cam.x));
  cam.y = Math.max(0, Math.min(WORLD_H, cam.y));
}

function homeView() {
  cam.x = WORLD / 2;
  cam.y = WORLD / 2;
  const area = (CHUNK * 2 + 2) * T;
  cam.z = Math.min(viewW / area, (viewH - (HUD_H + BAR_H) * ui / dpr) / area);
  clampCam();
}

const screenToWorld = (sx, sy) => ({ x: (sx - viewW / 2) / cam.z + cam.x, y: (sy - viewH / 2) / cam.z + cam.y });
const worldToScreen = (wx, wy) => ({ x: (wx - cam.x) * cam.z + viewW / 2, y: (wy - cam.y) * cam.z + viewH / 2 });

function zoomAt(sx, sy, newZ) {
  const w = screenToWorld(sx, sy);
  cam.z = Math.max(minZ(), Math.min(MAX_Z, newZ));
  cam.x = w.x - (sx - viewW / 2) / cam.z;
  cam.y = w.y - (sy - viewH / 2) / cam.z;
  clampCam();
}

// Build menu rows, in order.
const MENU = ['wall', 'tower'];

const buttons = {};
function layoutUI() {
  const by = UH - 28;
  buttons.left = { x: 4, y: by, w: 44, h: 24 };      // BUILD at home, SPEED during a run
  buttons.home = { x: 52, y: by, w: 44, h: 24, label: 'ME' };
  buttons.main = { x: 100, y: by, w: UW - 104, h: 24 }; // DEFEND! / NEXT WAVE
  buttons.repair = { x: 4, y: UH - BAR_H - 24, w: 76, h: 20 };
  buttons.zoomIn = { x: UW - 24, y: HUD_H + 6, w: 20, h: 20, label: '+' };
  buttons.zoomOut = { x: UW - 24, y: HUD_H + 30, w: 20, h: 20, label: '-' };

  // Info panel for the selected building.
  const py0 = UH - BAR_H - PANEL_H - 2;
  buttons.panel = { x: 4, y: py0, w: UW - 8, h: PANEL_H };
  buttons.upgrade = { x: UW - 66, y: py0 + 4, w: 58, h: 18, label: 'UPGRADE', primary: true };
  buttons.upgradeAll = { x: UW - 66, y: py0 + 24, w: 58, h: 18, label: 'ALL WALLS' };
  // STORE: top right for things with no UPGRADE button (cards, decorations), else beside ALL WALLS.
  buttons.store = { x: UW - 128, y: py0 + 24, w: 58, h: 18, label: 'STORE' };
  buttons.storeTop = { x: UW - 66, y: py0 + 4, w: 58, h: 18, label: 'STORE' };

  // Build menu: two tabs (BUILD and LOOKS), up to 7 rows each.
  const mw = Math.min(200, UW - 16), rowH = 19, top = 24, mh = top + 7 * rowH + 26;
  const mx = Math.round((UW - mw) / 2), my = Math.round((UH - mh) / 2);
  const rowY = (i) => my + top + i * rowH;
  buttons.menu = { x: mx, y: my, w: mw, h: mh, rowH };
  buttons.tabBuild = { x: mx + 4, y: my + 4, w: 44, h: 14, label: 'BUILD' };
  buttons.tabLooks = { x: mx + 51, y: my + 4, w: 44, h: 14, label: 'LOOKS' };
  buttons.tabStore = { x: mx + 98, y: my + 4, w: 44, h: 14, label: 'STORE' };
  buttons.storeRows = THEMES.map((t, i) => ({ x: mx + mw - 46, y: rowY(i), w: 40, h: 15 }));
  buttons.menuRows = MENU.map((type, i) => ({ type, x: mx + mw - 46, y: rowY(i), w: 40, h: 15, label: 'BUY' }));
  buttons.menuReset = { x: mx + mw - 46, y: rowY(MENU.length), w: 40, h: 15, label: 'RESET' };
  buttons.themePrev = { x: mx + mw - 46, y: rowY(0), w: 19, h: 15, label: '<' };
  buttons.themeNext = { x: mx + mw - 25, y: rowY(0), w: 19, h: 15, label: '>' };
  buttons.decorRows = DECOR.map((type, i) => ({ type, x: mx + mw - 46, y: rowY(i + 1), w: 40, h: 15, label: 'BUY' }));
  buttons.menuClose = { x: mx + Math.round(mw / 2) - 30, y: my + mh - 22, w: 60, h: 18, label: 'CLOSE' };
  buttons.shopRows = [0, 1, 2, 3, 4, 5].map((i) => ({ x: mx + mw - 50, y: rowY(i), w: 44, h: 15 }));
  // "YOUR LOOK": a preview on the left, one row per body part with < swatch >.
  buttons.lookRows = LOOK_PARTS.map((_, i) => ({
    prev: { x: mx + mw - 74, y: rowY(i) + 8, w: 16, h: 15, label: '<' },
    swatch: { x: mx + mw - 54, y: rowY(i) + 8, w: 28, h: 15 },
    next: { x: mx + mw - 22, y: rowY(i) + 8, w: 16, h: 15, label: '>' },
  }));

  // Card pick: up to 4 card rows, then REROLL and SKIP.
  const cw = Math.min(210, UW - 12), cardH = 30, ch = 26 + 4 * (cardH + 4) + 26;
  const cx0 = Math.round((UW - cw) / 2), cy0 = Math.max(HUD_H + 2, Math.round((UH - BAR_H - ch) / 2));
  buttons.cardBox = { x: cx0, y: cy0, w: cw, h: ch };
  buttons.cards = [0, 1, 2, 3].map((i) => ({ x: cx0 + 4, y: cy0 + 26 + i * (cardH + 4), w: cw - 8, h: cardH }));
  buttons.reroll = { x: cx0 + 4, y: cy0 + ch - 22, w: Math.floor(cw / 2) - 6, h: 18 };
  buttons.skip = { x: cx0 + Math.floor(cw / 2) + 2, y: cy0 + ch - 22, w: Math.floor(cw / 2) - 6, h: 18 };

  // Popups (buy land, run result).
  const pw = 150, ph = 64, px = Math.round((UW - pw) / 2), py = Math.round((UH - ph) / 2);
  buttons.popup = { x: px, y: py, w: pw, h: ph };
  buttons.buy = { x: px + 8, y: py + ph - 28, w: 64, h: 20, label: 'BUY', primary: true };
  buttons.cancel = { x: px + pw - 72, y: py + ph - 28, w: 64, h: 20, label: 'NO' };
  buttons.goHome = { x: px + 35, y: py + ph - 26, w: 80, h: 20, label: 'HOME', primary: true };

  // Home screen.
  const tx = Math.round(UW / 2 - 55), ty = Math.round(UH / 2);
  buttons.titlePlay = { x: tx, y: ty + 4, w: 110, h: 24, label: 'PLAY', primary: true };
  buttons.titleRuns = { x: tx, y: ty + 34, w: 110, h: 20, label: 'TOP RUNS' };
}

function resize() {
  dpr = window.devicePixelRatio || 1;
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  canvas.style.width = `${viewW}px`;
  canvas.style.height = `${viewH}px`;
  ui = Math.max(1, Math.floor(Math.min(viewW / 216, viewH / 300) * dpr));
  UW = canvas.width / ui;
  UH = canvas.height / ui;
  layoutUI();
  clampCam();
}
window.addEventListener('resize', resize);
resize();
homeView();

// ---------- Effects ----------

let puffs = [];   // little clouds (trees cleared, monsters defeated, buildings broken)
let floats = [];  // floating "+2" numbers

const addPuff = (x, y, delay = 0) => puffs.push({ x, y, t: -delay });
const addFloat = (text, x, y, color = PAL.y) => floats.push({ text, x, y, t: 0, color });
const RES_COLOR = { gold: PAL.y };
const RES_LETTER = { gold: 'G' };

// ---------- Runs & waves ----------
// phase: 'home' (between waves: build, gather, hire) -> 'wave' (fighting) -> 'home' ... -> 'end' (world cleared or game over)

let phase = 'home';
let speed = 1;

const battle = new Battle({
  buildings: () => game.buildings,
  house,
  maxHp,
  run: () => run,
  manned: (b) => isManned(b),
  crew: (b) => { const v = villagers.find((o) => o.npc.post === b.id && o.atPost); return v ? traitOf(v.npc) : {}; },
  fighters: () => [...villagers.filter((v) => isFighter(v) && !v.down && !v.inside), ...(hero.down ? [] : [hero])],
  hitFighter: (v, damage) => {
    v.hp -= damage;
    v.flash = 0.12;
    if (v.hp <= 0) { v.down = true; v.path = null; v.foe = null; addPuff(v.x + T / 2, v.y + T / 2); showToast(`YOUR ${v.isHero ? 'HERO' : NPC_ROLES[v.npc.role].name.toUpperCase()} IS DOWN!`); }
  },
  walkable: (c, r) => inWorld(c, r) && !isWet(c, r) && (isRoad(c, r) || ownsTile(c, r)),
  cave: () => ({ c: CAVE.c, r: CAVE.r }),
  onKill: (m) => {
    // Zombies are your only income. The cat's perk: +20% gold.
    const due = Math.round(killGold(m.def.gold, run.wave) * (run.omen.goldMul || 1) * (petPerk('cat') ? 1.2 : 1));
    const gold = earn(game, 'gold', due);
    run.earned += gold;
    run.kills++;
    addPuff(m.x, m.y);
    if (gold) addFloat(`+${gold}`, m.x, m.y - 14);
    warnIfFull(gold < due);
  },
  onDestroyed: (b) => { const p = centerOf(b); addPuff(p.x, p.y); },
});

// ---------- Run cards ----------

// Draw `n` distinct cards for the coming wave, by rarity odds.
function drawCards(n, wave) {
  const odds = rarityOdds(run.omen.luck ? Math.min(10, wave + 3) : wave);
  const allowed = (id) => {
    const c = CARDS[id];
    if (c.kind !== 'blessing') return true;
    const have = run.blessings[id] || 0;
    return have < (c.stacks || 1);
  };
  const out = [];
  for (let tries = 0; out.length < n && tries < 200; tries++) {
    let roll = Math.random() * 100, rarity = RARITY[0];
    for (let i = 0; i < RARITY.length; i++) { if (roll < odds[i]) { rarity = RARITY[i]; break; } roll -= odds[i]; }
    const pool = Object.keys(CARDS).filter((id) => CARDS[id].rarity === rarity && allowed(id) && !out.includes(id));
    if (pool.length) out.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return out;
}

function offerCards() {
  run.choices = drawCards(run.omen.choices || 3, run.wave + 1);
}

function pickCard(i) {
  const id = run.choices?.[i];
  if (!id) return;
  const card = CARDS[id];
  run.choices = null;
  if (card.kind === 'blessing') {
    run.blessings[id] = (run.blessings[id] || 0) + 1;
    if (id === 'stonemason') for (const b of game.buildings) if (isWallType(b.type) && b.hp > 0) b.hp = maxHp(b);
    showToast(`${card.name.toUpperCase()}!`);
    return;
  }
  const type = card.kind === 'walls' ? 'barricade' : id;
  const n = card.kind === 'walls' ? card.count : card.kind === 'trap' && run.omen.trapPairs ? 2 : 1;
  addItem(type, 1, n);
  itemsOpen = true;
  selected = null;
  showToast(`${card.name.toUpperCase()} ADDED TO YOUR ITEMS`);
}

function skipCard() {
  if (!run.choices) return;
  run.choices = null;
  const g = earn(game, 'gold', SKIP_GOLD);
  showToast(`SKIPPED +${g} GOLD`);
}

function rerollCards() {
  if (!run.choices || run.rerolls <= 0) return;
  run.rerolls--;
  offerCards();
}

// ---------- Items (your inventory) ----------
// Picked cards and buildings you've put away wait here until you place them. Pull the ITEMS bar up from
// above the bottom bar, slide through it, tap an item, then tap your land. Select a building and tap STORE
// to put it away (between waves, at full health). Stored things still count toward your House limits.
let itemsOpen = false;
let itemsScroll = 0;      // how far the bar is slid (UI pixels)
let placingItem = null;   // the item being placed, or null
const ITEM_SLOT = 28, ITEM_GAP = 4;

function addItem(type, level = 1, n = 1) {
  const it = game.items.find((i) => i.type === type && i.level === level);
  if (it) it.n += n; else game.items.push({ type, level, n });
}

function placeItem(it, c, r) {
  const size = BUILDINGS[it.type].size || 1;
  const half = Math.floor(size / 2);
  if (!fits(null, c - half, r - half, size)) { showToast('NOT ENOUGH ROOM THERE'); return false; }
  const b = { id: game.nextId++, type: it.type, c: c - half, r: r - half, level: it.level, hp: 1 };
  if (BUILDINGS[it.type].run) b.run = true;
  b.hp = maxHp(b);
  game.buildings.push(b);
  const p = centerOf(b);
  addPuff(p.x, p.y);
  if (--it.n <= 0) { game.items.splice(game.items.indexOf(it), 1); placingItem = null; }
  saveGame();
  return true;
}

function storeBuilding(b) {
  if (phase !== 'home') { showToast('PUT THINGS AWAY BETWEEN WAVES'); return false; }
  if (b.type === 'house' || b.type === 'tree') { showToast("THAT CAN'T BE PUT AWAY"); return false; }
  if (underConstruction(game, b)) { showToast('WAIT FOR THE UPGRADE TO FINISH'); return false; }
  if (b.hp < maxHp(b)) { showToast('FIX IT FIRST'); return false; }
  game.buildings.splice(game.buildings.indexOf(b), 1);
  addItem(b.type, b.level || 1);
  // An archer posted at a stored tower goes looking for another one.
  for (const n of game.npcs) if (n.post === b.id) n.post = null;
  for (const v of villagers) if (v.npc.post === null && v.atPost) v.atPost = false;
  const p = centerOf(b);
  addPuff(p.x, p.y);
  selected = null;
  itemsOpen = true;
  showToast(`${BUILDINGS[b.type].name.toUpperCase()} PUT IN YOUR ITEMS`);
  saveGame();
  return true;
}
// Bots and tests: put the first run card in your items somewhere sensible. (Players place their own.)
// Traps go on the monsters' route; everything else near the gate and the House.
function autoPlace() {
  const it = game.items.find((i) => BUILDINGS[i.type].run);
  if (!it) return false;
  const type = it.type;
  const size = BUILDINGS[type].size || 1;
  battle.recomputeFlow();
  const h = house();
  const hc = { c: h.c + 1, r: h.r + 1 };
  const path = monsterPath();
  const pathList = [...path].map((k) => { const [c, r] = k.split(',').map(Number); return { c, r }; });
  const candidates = [];
  for (let r = O; r < O + CHUNKS * CHUNK; r++) {        // only your land can hold cards
    for (let c = O; c < O + CHUNKS * CHUNK; c++) {
      if (!fits(null, c, r, size)) continue;
      const d = battle.dist[r * N + c];
      if (!Number.isFinite(d)) continue;
      const near = Math.hypot(c - hc.c, r - hc.r);
      let score;
      if (BUILDINGS[type].trap) score = d < 3 ? Infinity : d + Math.random() * 2; // on the path, not hugging the House
      else if (type === 'barricade') score = Math.abs(near - 5) + Math.random();
      else if (type === 'scarecrow') score = Math.abs(near - 4) + Math.random(); // close enough for the towers to cover it
      else if (CARDS[type]?.kind === 'tower') {
        // Towers go where they cover the most of the zombies' route (the playtest found AUTO put cannons
        // and braziers out of range when it only looked at distance to the House).
        const range = CARDS[type].range, cx = c + size / 2 - 0.5, cy = r + size / 2 - 0.5;
        const covered = pathList.filter((p) => Math.hypot(p.c - cx, p.r - cy) <= range).length;
        score = covered ? -covered + near * 0.15 + Math.random() * 0.5 : Infinity;
      } else score = near + Math.random() * 1.5;
      candidates.push({ c, r, score });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  const half = Math.floor(size / 2);
  // Traps go ON the monsters' route. Everything else stays OFF it (and a tile away from it),
  // so AUTO never blocks the gate or a lane and accidentally sends monsters through a wall.
  const nearPath = (c, r) => {
    for (let y = r - 1; y <= r + size; y++) for (let x = c - 1; x <= c + size; x++) if (path.has(`${x},${y}`)) return true;
    return false;
  };
  for (const cand of candidates) {
    if (!Number.isFinite(cand.score)) break;
    if (BUILDINGS[type].trap) { if (!path.has(`${cand.c},${cand.r}`)) continue; }
    else if (nearPath(cand.c, cand.r)) continue;
    if (placeItem(it, cand.c + half, cand.r + half)) return true;
  }
  return false;
}

// The tiles monsters will walk over, following the flow field from the road's end.
function monsterPath() {
  const seen = new Set();
  let cur = { c: roadLeft(BASE_TOP - 1), r: BASE_TOP - 1 };
  // Same rule the monsters use: cheapest next step, counting the effort of smashing what's there.
  for (let i = 0; i < 300; i++) {
    seen.add(`${cur.c},${cur.r}`);
    let best = null, bd = Infinity;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cur.c + dc, r = cur.r + dr;
      if (c < 0 || r < 0 || c >= N || r >= N || seen.has(`${c},${r}`)) continue;
      const d = battle.dist[r * N + c] + battle.enterCost(r * N + c);
      if (d < bd) { bd = d; best = { c, r }; }
    }
    if (!best || battle.dist[best.r * N + best.c] === 0) break;
    cur = best;
  }
  return seen;
}

// ---------- Runs & waves ----------

// Gold beyond what the House can store is lost; say so once per run (the playtest found it was silent).
function warnIfFull(lost) {
  if (!lost || run.capWarned) return;
  run.capWarned = true;
  showToast('GOLD STORAGE FULL - UPGRADE YOUR HOUSE TO KEEP MORE');
}

// ---------- The roguelike loop ----------
// One life, endless waves: get as far as you can. Between waves there's no clock: take as long as you like to
// build and rearrange your base, then tap START WAVE. Each cleared wave brings a card and new faces at the
// Tavern; every BOSS_EVERY-th wave brings Kings. When the House falls, the save is wiped and the run goes
// into your TOP RUNS (on the home screen).

// The run's state, as saved (run cards on the map save with the buildings).
function runSnapshot() {
  return {
    wave: run.wave, earned: run.earned, kills: run.kills, blessings: run.blessings, rerolls: run.rerolls,
    choices: run.choices, omen: OMENS.indexOf(run.omen),
  };
}
function restoreRun() {
  const r = game.runState;
  if (!r) return startRun();
  Object.assign(run, { kills: 0, ...r, omen: OMENS[r.omen] || OMENS[OMENS.length - 1] });
  phase = 'home';
  // Older saves: a card waiting to be placed goes into your items.
  if (r.pending) { addItem(r.pending.type, 1, r.pending.left); delete run.pending; }
}

// A fresh run: wave 0, a new omen, no blessings.
function startRun() {
  run.capWarned = false;
  selected = null;
  placing = null;
  menuOpen = false;
  run.wave = 0;
  run.earned = 0;
  run.kills = 0;
  run.dead = false;
  run.blessings = {};
  run.rerolls = 1 + (petPerk('owl') ? 1 : 0);
  run.omen = OMENS[Math.floor(Math.random() * OMENS.length)];
  battle.reset();
  const h = house();
  h.hp = Math.round(maxHp(h) * (run.omen.houseStart || 1));
  phase = 'home';
  offerCards();
}

const isKingWave = (wave) => wave % BOSS_EVERY === 0;

// START WAVE.
function nextWave() {
  if (run.choices) { showToast('PICK A CARD FIRST'); return; }
  run.wave++;
  phase = 'wave';
  buildMode = false;
  menuOpen = false;
  shopOpen = null;
  selected = null;
  placing = null;
  placingItem = null;
  itemsOpen = false;
  villagersRunHome();
  battle.startWave(run.wave);
  const kings = run.wave / BOSS_EVERY;
  showToast(isKingWave(run.wave) ? (kings > 1 ? `WAVE ${run.wave} - ${kings} KINGS ARE COMING!` : `WAVE ${run.wave} - THE KING IS COMING!`) : `WAVE ${run.wave} - HERE THEY COME!`);
}

// Wave cleared: the House patches itself up a bit, and a card and new faces arrive.
function waveCleared() {
  battle.active = false;
  const due = waveBonus(run.wave);
  const bonus = earn(game, 'gold', due);
  warnIfFull(bonus < due);
  run.earned += bonus;
  game.stats.bestWave = Math.max(game.stats.bestWave, run.wave);
  const h = house();
  h.hp = Math.min(maxHp(h), h.hp + Math.round(maxHp(h) * WAVE_HEAL));
  for (const b of game.buildings) if (b.type === 'tree' || BUILDINGS[b.type].decor) b.hp = maxHp(b);
  phase = 'home';
  speed = 1;
  villagersLeaveHouse();
  offerCards();
  rollApplicants(); // new faces at the Tavern after every wave
  showToast(`WAVE ${run.wave} CLEARED! +${bonus} GOLD`);
  saveGame();
}

// The House fell: the run is over. It goes into your top runs, and the save is wiped right now (so reloading
// can't undo it). What survives: art, gems, your look and your records.
function endRun() {
  battle.active = false;
  run.choices = null;
  placing = null;
  placingItem = null;
  itemsOpen = false;
  phase = 'end';
  run.dead = true;
  const waves = Math.max(0, run.wave - 1);
  run.gems = gemsForRun(waves);
  game.gems += run.gems;
  const entry = {
    waves, kills: run.kills, gold: run.earned, house: houseLevel(game), hero: game.hero.level,
    people: game.npcs.length, omen: run.omen.name, life: game.records.lives, at: Date.now(),
  };
  const runs = [...game.records.runs, entry].sort((a, b) => b.waves - a.waves || b.kills - a.kills);
  run.rank = runs.indexOf(entry) < TOP_RUNS ? runs.indexOf(entry) + 1 : 0;
  game.records.runs = runs.slice(0, TOP_RUNS);
  if (!SANDBOX) {
    const next = upgradeSave(newGame());
    Object.assign(next, carryOver());
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }
}

// What outlives you: cosmetics and records, nothing that makes the next life easier.
const carryOver = () => ({
  gems: game.gems, ownedThemes: game.ownedThemes, theme: game.theme, look: game.look,
  records: { ...game.records, lives: game.records.lives + 1 },
});

// After the game-over screen: a brand new life, starting at the home screen.
function afterEnd() {
  const keep = carryOver();
  newLife();
  Object.assign(game, keep);
  saveGame();
  phase = 'title';
}
// Start a brand new game in memory (the old one is gone).
function newLife() {
  game = upgradeSave(newGame());
  villagers = [];
  owned = new Set(game.owned);
  selected = null;
  placing = null;
  menuOpen = false;
  shopOpen = null;
  battle.reset();
  startRun();
  villagersLeaveHouse();
  buildTerrain();
  homeView();
}

const repairCostOf = (b) => Math.ceil((1 - b.hp / maxHp(b)) * BUILDINGS[b.type].repair * 1.5 ** ((b.level || 1) - 1));
const repairCost = () => game.buildings.reduce((sum, b) => sum + repairCostOf(b), 0);

// Repair as much as you can afford, House-side first, of what your character can reach.
function repairAll() {
  const h = house();
  const reach = reachableSet();
  const damaged = game.buildings.filter((b) => repairCostOf(b) > 0);
  const order = damaged.filter((b) => reach.has(b))
    .sort((a, b) => Math.hypot(a.c - h.c, a.r - h.r) - Math.hypot(b.c - h.c, b.r - h.r));
  const unreachable = damaged.length - order.length;
  let fixed = 0;
  for (const b of order) {
    const cost = repairCostOf(b);
    if (cost > game.gold) continue;
    game.gold -= cost;
    // A resource building rebuilt from rubble starts fresh: no pay for the time it lay broken.
      b.hp = maxHp(b);
    fixed++;
    const p = centerOf(b);
    addPuff(p.x, p.y);
  }
  saveGame();
  if (unreachable && !fixed) showToast(`${unreachable} OUT OF REACH - YOU CAN'T GET TO THEM`);
  else if (unreachable) showToast(`REPAIRED ${fixed} - ${unreachable} OUT OF REACH`);
  else showToast(fixed ? (repairCost() ? 'REPAIRED WHAT YOU COULD AFFORD' : 'ALL REPAIRED!') : 'NOT ENOUGH GOLD');
}

// Repair one building (from its panel; you're in reach by then).
function repairOne(b) {
  const cost = repairCostOf(b);
  if (!cost) return;
  if (cost > game.gold) { showToast('NOT ENOUGH GOLD'); return; }
  game.gold -= cost;
  b.hp = maxHp(b);
  const p = centerOf(b);
  addPuff(p.x, p.y);
  saveGame();
}

// ---------- Building & upgrading ----------

let selected = null;  // building tapped (info panel; tap grass to move it)
let placing = null;   // type being placed from the build menu
let menuOpen = false;
let menuTab = 'build'; // 'build' | 'looks' | 'store'
// Build mode (home only, never during a run): move buildings freely and add new ones.
// Normal mode: you're your character, and things are used by walking within reach.
let buildMode = false;
let offer = null;    // plot the buy popup is asking about: [cx, cy]
let toast = null;     // { text, time }
let resetArmed = 0;   // RESET needs two taps

function showToast(text) { toast = { text, time: 2.2 }; }

function tryUpgrade(b) {
  const block = upgradeBlock(game, b);
  if (block) { showToast(block); return false; }
  const instant = startUpgrade(game, b, clock());
  const p = centerOf(b);
  addPuff(p.x, p.y);
  showToast(instant ? `${BUILDINGS[b.type].name.toUpperCase()} NOW LV ${b.level}` : 'THE BUILDER IS ON IT');
  saveGame();
  return true;
}

// Upgrade every wall at this level that you can afford and reach, nearest the House first.
function upgradeAllWalls(level) {
  const h = house();
  const reach = reachableSet();
  const walls = game.buildings
    .filter((b) => b.type === 'wall' && b.level === level && b.hp > 0 && reach.has(b))
    .sort((a, b) => Math.hypot(a.c - h.c, a.r - h.r) - Math.hypot(b.c - h.c, b.r - h.r));
  let n = 0;
  for (const w of walls) {
    if (upgradeBlock(game, w)) break;
    startUpgrade(game, w, clock());
    n++;
  }
  saveGame();
  const broken = game.buildings.some((b) => b.type === 'wall' && b.level === level && b.hp <= 0);
  showToast(n ? `UPGRADED ${n} WALLS` : walls.length ? upgradeBlock(game, walls[0]) : broken ? 'REPAIR WALLS FIRST' : 'NOTHING TO UPGRADE');
}

function placeNew(type, c, r) {
  const block = buildBlock(game, type);
  if (block) { showToast(block); placing = null; return; }
  const size = BUILDINGS[type].size || 1;
  const half = Math.floor(size / 2);
  if (!fits(null, c - half, r - half, size)) { showToast('NOT ENOUGH ROOM THERE'); return; }
  const b = build(game, type, c - half, r - half, clock());
  const p = centerOf(b);
  addPuff(p.x, p.y);
  saveGame();
  // Walls keep placing (like laying a fence); everything else is one at a time.
  if (type !== 'wall' || buildBlock(game, 'wall')) placing = null;
}

function buyLand([cx, cy]) {
  const price = landPrice(game.bought);
  if (game.gold < price) { showToast('NOT ENOUGH GOLD'); return; }
  game.gold -= price;
  game.bought++;
  owned.add(chunkKey(cx, cy));
  game.owned = [...owned];
  for (let r = cy * CHUNK; r < (cy + 1) * CHUNK; r++) {
    for (let c = cx * CHUNK; c < (cx + 1) * CHUNK; c++) {
      if (forestTree(c, r)) addPuff(c * T + 12, r * T + 12, Math.random() * 0.35);
    }
  }
  buildTerrain();
  saveGame();
  showToast('LAND BOUGHT!');
}

// ---------- Your look ----------
// Tap your own character to open it. Colours are free and saved right away.
let lookOpen = false;

function onLookTap(p) {
  LOOK_PARTS.forEach((part, i) => {
    const row = buttons.lookRows[i];
    const step = inRect(p, row.prev) ? -1 : inRect(p, row.next) || inRect(p, row.swatch) ? 1 : 0;
    if (!step) return;
    const opts = part.options;
    const at = Math.max(0, opts.indexOf(game.look[part.key]));
    game.look[part.key] = opts[(at + step + opts.length) % opts.length];
    saveGame();
  });
  if (inRect(p, buttons.menuClose) || !inRect(p, buttons.menu)) lookOpen = false;
}

function drawLook(time) {
  const m = buttons.menu;
  ctx.fillStyle = 'rgba(26,28,44,0.5)';
  ctx.fillRect(0, 0, UW, UH);
  panelBox(m);
  drawText(ctx, 'YOUR LOOK', m.x + 6, m.y + 8, PAL.y);
  // A big preview of you, turning around.
  const dirs = ['down', 'left', 'up', 'right'];
  const dir = dirs[Math.floor(time / 1.2) % 4];
  const size = 72;
  const px = m.x + 10, py = m.y + 30;
  ctx.fillStyle = '#272b3a';
  ctx.fillRect(px - 2, py - 2, size + 4, size + 4);
  ctx.drawImage(heroImg(dir, Math.floor(time * 3) % 2), px, py, size, size);
  LOOK_PARTS.forEach((part, i) => {
    const row = buttons.lookRows[i];
    drawText(ctx, part.name, row.prev.x - 4 - textWidth(part.name), row.prev.y + 5, PAL.w);
    drawButton(row.prev);
    ctx.fillStyle = PAL.k; ctx.fillRect(row.swatch.x, row.swatch.y, row.swatch.w, row.swatch.h);
    ctx.fillStyle = game.look[part.key]; ctx.fillRect(row.swatch.x + 1, row.swatch.y + 1, row.swatch.w - 2, row.swatch.h - 2);
    drawButton(row.next);
  });
  drawText(ctx, 'TAP < > OR THE COLOUR TO CHANGE', m.x + 6, m.y + m.h - 34, PAL.S);
  drawButton(buttons.menuClose, 'DONE');
}

// ---------- Shops ----------
let shopOpen = null; // 'petshop' | 'store' | 'tavern'

function payFor(price) {
  if (!canAfford(game, price)) return false;
  for (const k of RES) game[k] -= price[k] || 0;
  return true;
}

function shopItems() {
  if (shopOpen === 'hero') {
    const lvl = game.hero.level, st = heroStats(lvl), max = lvl >= HERO_MAX_LEVEL;
    const cost = heroUpgradeCost(lvl);
    return [
      { title: 'STAND GUARD SOMEWHERE ELSE', sub: 'THEN TAP A SPOT - EVEN MID-WAVE', label: 'MOVE', style: 'primary',
        act: () => { movingHero = true; shopOpen = null; showToast('TAP WHERE YOUR HERO SHOULD STAND GUARD'); } },
      { title: `HP ${st.hp}  DMG ${Math.round(st.damage)}  RANGE ${st.range}`,
        sub: max ? 'MAX LEVEL' : `NEXT LEVEL ${formatCost(cost)}`,
        label: max ? 'MAX' : 'UPGRADE', style: !max && canAfford(game, cost) && phase === 'home' ? 'primary' : 'off', act: upgradeHero },
      { title: 'YOUR LOOK', sub: 'HAIR, SKIN, SHIRT AND PANTS', label: 'CHANGE', style: 'normal',
        act: () => { shopOpen = null; lookOpen = true; } },
    ];
  }
  if (shopOpen === 'petshop') {
    const rows = Object.entries(PETS).map(([id, p]) => {
      const owned = game.pets.owned.includes(id);
      const active = game.pets.active === id;
      return {
        title: `${p.name.toUpperCase()}${owned ? (petFed(id) ? '  HAPPY' : '  HUNGRY!') : ''}`,
        sub: owned ? p.perk : `${p.perk}  ${formatCost(p.price)}`,
        label: active ? 'WITH YOU' : owned ? 'TAKE' : 'BUY',
        style: active ? 'off' : owned ? 'normal' : canAfford(game, p.price) ? 'primary' : 'off',
        act: () => {
          if (active) return;
          if (!owned) {
            if (!payFor(p.price)) { showToast(`NOT ENOUGH ${missing(game, p.price).toUpperCase()}`); return; }
            game.pets.owned.push(id);
            game.pets.fedAt[id] = clock();
            showToast(`${p.name.toUpperCase()} JOINED YOU!`);
          }
          game.pets.active = id;
          pet.x = hero.x; pet.y = hero.y;
        },
      };
    });
    const a = game.pets.active;
    rows.push({
      title: a ? `FEED ${PETS[a].name.toUpperCase()}` : 'FEED YOUR PET',
      sub: a ? `KEEPS IT HAPPY ${PET_FED_HOURS}H  ${formatCost(PET_MEAL)}` : 'GET A PET FIRST',
      label: 'FEED', style: a && canAfford(game, PET_MEAL) ? 'good' : 'off',
      act: () => {
        if (!a) return;
        if (!payFor(PET_MEAL)) { showToast('NOT ENOUGH GOLD'); return; }
        game.pets.fedAt[a] = clock();
        showToast(`${PETS[a].name.toUpperCase()} IS HAPPY!`);
      },
    });
    return rows;
  }
  if (shopOpen === 'store') {
    return Object.entries(STORE_ITEMS).map(([id, it]) => ({
      title: it.name.toUpperCase(), sub: `${it.about}  ${formatCost(it.price)}`, label: 'BUY',
      style: canAfford(game, it.price) ? 'primary' : 'off',
      act: () => {
        if (!payFor(it.price)) { showToast(`NOT ENOUGH ${missing(game, it.price).toUpperCase()}`); return; }
        if (id === 'snack') {
          if (game.builder) game.builder.until -= 10 * 60_000;
          showToast(game.builder ? 'THE BUILDER WORKS FASTER!' : 'THE BUILDER ENJOYED IT ANYWAY');
        }
      },
    }));
  }
  // Tavern: hire your people.
  const cap = npcCap(houseLevel(game));
  const full = game.npcs.length >= cap;
  // Tavern: whoever happens to be looking for work today (roguelike: you adapt to who turns up).
  if (!game.applicants) rollApplicants();
  const rows = game.applicants.map((a, i) => {
    if (!a) return { title: '(HIRED)', sub: 'SOMEONE NEW COMES AFTER YOUR NEXT RUN', label: '-', style: 'off', act: () => {} };
    const r = NPC_ROLES[a.role], t = TRAITS[a.trait];
    return {
      title: `${a.name} - ${t.name} ${r.name.toUpperCase()}`,
      sub: `${formatCost(a.price)} - ${t.about}`,
      label: full ? 'FULL' : 'HIRE',
      style: !full && canAfford(game, a.price) ? 'primary' : 'off',
      act: () => hireApplicant(i),
    };
  });
  rows.push({
    title: 'NEW FACES', sub: `SEND THEM AWAY AND SEE WHO ELSE COMES  ${formatCost(REROLL_PRICE)}`,
    label: 'REROLL', style: canAfford(game, REROLL_PRICE) ? 'primary' : 'off', act: rerollApplicants,
  });
  const unmanned = game.buildings.filter((b) => b.type === 'tower' && b.hp > 0 && !game.npcs.some((n) => n.post === b.id)).length;
  rows.push({
    title: `PEOPLE ${game.npcs.length}/${cap}`,
    sub: unmanned ? `${unmanned} TOWER${unmanned > 1 ? 'S' : ''} WITH NO ARCHER!` : full ? 'UPGRADE YOUR HOUSE FOR MORE ROOM' : 'EVERY TOWER IS MANNED',
    label: 'INFO', style: 'off', act: () => {},
  });
  return rows;
}

function openShop(id) {
  shopOpen = id;
  selected = null;
  hero.dir = 'up';
}

function onShopTap(p) {
  const items = shopItems();
  const i = buttons.shopRows.findIndex((b, k) => k < items.length && inRect(p, b));
  if (i >= 0) { items[i].act(); saveGame(); return; }
  if (inRect(p, buttons.menuClose) || !inRect(p, buttons.menu)) shopOpen = null;
}

function onWorldTap(sx, sy) {
  const w = screenToWorld(sx, sy);
  const c = Math.floor(w.x / T), r = Math.floor(w.y / T);
  if (!inWorld(c, r)) return;
  if (isCave(c, r)) { selected = null; showToast('ZOMBIES COME OUT OF THIS DEN'); return; }
  // Your hero: tap them for their menu; after MOVE, the next tap picks their guard spot.
  if (movingHero) {
    movingHero = false;
    if (ownsTile(c, r) || isRoad(c, r)) sendHero(c, r); else showToast('PICK A SPOT ON YOUR LAND');
    return;
  }
  const ht = heroTile();
  if (!buildMode && !placing && !hero.down && c === ht.c && (r === ht.r || r === ht.r - 1)) { selected = null; shopOpen = 'hero'; return; }
  if (phase === 'wave') { showToast('TAP YOUR HERO TO MOVE THEM'); return; }
  // The wild parts of the valley: say what they are.
  const gr = ground(c, r);
  if (!isRoad(c, r) && !isTrail(c, r) && !isBridge(c, r) && !isPlaza(c, r)) {
    if (r < DANGER_BOTTOM) { showToast('ZOMBIE COUNTRY - TOO DANGEROUS TO GO'); return; }
    if (gr === 'mountain' || gr === 'stream') { showToast("MOUNTAINS - YOU CAN'T CLIMB THEM (YET)"); return; }
    if (gr === 'ocean') { showToast('THE OCEAN - NO BOATS (YET)'); return; }
    if (isRiver(c, r)) { showToast('THE RIVER - CROSS AT THE BRIDGE'); return; }
    if (gr === 'forest' || gr === 'riverband') { showToast('DEEP FOREST - STAY ON THE PATH'); return; }
  }
  // The village: tap a shop (or its keeper) to go in.
  if (inVillage(c, r) || isTrail(c, r) || isBridge(c, r) || isPlaza(c, r)) {
    const shop = shopAt(c, r) || shopkeeperAt(c, r)?.shop;
    if (shop) { openShop(shop.id); return; }
    if (c === WELL.c && r === WELL.r) { showToast('A WISHING WELL. NOTHING HAPPENS... YET'); return; }
    selected = null;
    return;
  }
  const [cx, cy] = chunkOfTile(c, r);

  if (placingItem) {
    if (!ownsChunk(cx, cy)) { showToast('PLACE IT ON YOUR LAND'); return; }
    placeItem(placingItem, c, r);
    return;
  }
  if (placing) {
    if (!ownsChunk(cx, cy)) { showToast('PLACE IT ON YOUR LAND'); return; }
    placeNew(placing, c, r);
    return;
  }

  if (isRoad(c, r) && !ownsChunk(cx, cy) && !selected) { showToast('THE ZOMBIE ROAD'); return; }
  if (!ownsChunk(cx, cy)) {
    if (selected) { selected = null; return; }
    if (phase !== 'home') showToast('BUY LAND WHEN YOU ARE HOME');
    else if (canBuy(cx, cy)) offer = [cx, cy];
    else showToast('BUY LAND NEXT TO YOUR BASE');
    return;
  }

  const hit = buildingAt(c, r);

  // Build mode: pick any building up and put it down somewhere else. No walking needed.
  if (buildMode) {
    if (!selected) { if (hit) { selected = hit; itemsOpen = false; } return; }
    if (hit === selected) { selected = null; return; }
    if (hit) { selected = hit; return; }
    // Big buildings are centred on the tapped tile.
    const half = Math.floor(sizeOf(selected) / 2);
    if (fits(selected, c - half, r - half)) {
      selected.c = c - half;
      selected.r = r - half;
      selected = null;
      saveGame();
    } else {
      showToast('NOT ENOUGH ROOM THERE');
    }
    return;
  }

  // Normal mode: tap a building to use it (collect / open its panel).
  if (!hit) { selected = null; return; }
  if (hit === selected) { selected = null; return; }
  selected = hit;
  itemsOpen = false;
  placingItem = null;
}

const inRect = (p, b) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;
const toUI = (sx, sy) => ({ x: (sx * dpr) / ui, y: (sy * dpr) / ui });
const showPanel = () => selected && phase !== 'wave' && phase !== 'end' && !placing && !itemsOpen;
const showRepair = () => phase === 'home' && !buildMode && !itemsOpen && !showPanel() && repairCost() > 0;
// Anything but the House and trees can be put away in your items (between waves).
const canStore = (b) => phase === 'home' && b && b.type !== 'house' && b.type !== 'tree';
const storeButton = (b) => (BUILDINGS[b.type].run || BUILDINGS[b.type].decor ? buttons.storeTop : buttons.store);

// Is this screen point on top of a UI element (so it shouldn't pan the map)?
function onUI(sx, sy) {
  const p = toUI(sx, sy);
  if (offer || menuOpen || shopOpen || lookOpen || runsOpen || phase === 'end' || phase === 'title' || run.choices) return true;
  if (phase === 'home' && !showPanel()) { const { bar, tab } = itemsLayout(); if (inRect(p, tab) || (itemsOpen && inRect(p, bar))) return true; }
  return p.y < HUD_H || p.y >= UH - BAR_H || inRect(p, buttons.zoomIn) || inRect(p, buttons.zoomOut)
    || (showRepair() && inRect(p, buttons.repair)) || (showPanel() && inRect(p, buttons.panel));
}

// Cycle through the art packs you own.
function setTheme(step) {
  let i = THEMES.findIndex((t) => t.id === game.theme);
  for (let n = 0; n < THEMES.length; n++) {
    i = (i + step + THEMES.length) % THEMES.length;
    if (game.ownedThemes.includes(THEMES[i].id)) break;
  }
  game.theme = THEMES[i].id;
  saveGame();
}

// Store: buy an art pack with gems, or wear one you own.
function storeTap(theme) {
  if (game.ownedThemes.includes(theme.id)) {
    game.theme = theme.id;
    showToast(`NOW WEARING ${theme.name.toUpperCase()}`);
  } else if (game.gems >= theme.price) {
    game.gems -= theme.price;
    game.ownedThemes.push(theme.id);
    game.theme = theme.id;
    showToast(`${theme.name.toUpperCase()} UNLOCKED!`);
  } else {
    showToast(`NEED ${theme.price - game.gems} MORE GEMS - WIN RUNS TO EARN THEM`);
  }
  saveGame();
}

function onMenuTap(p) {
  if (inRect(p, buttons.tabBuild)) { menuTab = 'build'; return; }
  if (inRect(p, buttons.tabLooks)) { menuTab = 'looks'; return; }
  if (inRect(p, buttons.tabStore)) { menuTab = 'store'; return; }
  if (menuTab === 'store') {
    const i = buttons.storeRows.findIndex((row) => inRect(p, row));
    if (i >= 0) return storeTap(THEMES[i]);
    if (inRect(p, buttons.menuClose) || !inRect(p, buttons.menu)) menuOpen = false;
    return;
  }
  if (menuTab === 'looks') {
    if (inRect(p, buttons.themePrev)) return setTheme(-1);
    if (inRect(p, buttons.themeNext)) return setTheme(1);
    for (const row of buttons.decorRows) {
      if (!inRect(p, row)) continue;
      const block = buildBlock(game, row.type);
      if (block) { showToast(block); return; }
      placing = row.type;
      menuOpen = false;
      selected = null;
      return;
    }
    if (inRect(p, buttons.menuClose) || !inRect(p, buttons.menu)) menuOpen = false;
    return;
  }
  for (const row of buttons.menuRows) {
    if (!inRect(p, row)) continue;
    const block = buildBlock(game, row.type);
    if (block) { showToast(block); return; }
    placing = row.type;
    menuOpen = false;
    selected = null;
    return;
  }
  if (inRect(p, buttons.menuReset)) {
    if (performance.now() < resetArmed) {
      const keep = carryOver();
      newLife();
      Object.assign(game, keep);
      saveGame();
      resetArmed = 0;
      showToast('NEW GAME');
      return;
    }
    resetArmed = performance.now() + 2000;
    showToast('TAP RESET AGAIN TO START OVER');
    return;
  }
  if (inRect(p, buttons.menuClose) || !inRect(p, buttons.menu)) menuOpen = false;
}

function onTap(sx, sy) {
  const p = toUI(sx, sy);
  if (runsOpen) {
    if (inRect(p, buttons.menuClose) || !inRect(p, buttons.menu)) runsOpen = false;
    return;
  }
  if (phase === 'title') {
    if (inRect(p, buttons.titlePlay)) { phase = 'home'; homeView(); }
    else if (inRect(p, buttons.titleRuns)) runsOpen = true;
    return;
  }
  if (phase === 'end') {
    if (inRect(p, buttons.goHome)) afterEnd();
    return;
  }
  if (offer) {
    if (inRect(p, buttons.buy)) buyLand(offer);
    if (inRect(p, buttons.buy) || inRect(p, buttons.cancel) || !inRect(p, buttons.popup)) offer = null;
    return;
  }
  if (menuOpen) return onMenuTap(p);
  if (shopOpen) return onShopTap(p);
  if (lookOpen) return onLookTap(p);
  if (run.choices) {
    const i = buttons.cards.findIndex((b, k) => k < run.choices.length && inRect(p, b));
    if (i >= 0) return pickCard(i);
    if (inRect(p, buttons.reroll)) return run.rerolls > 0 ? rerollCards() : showToast('NO REROLLS LEFT');
    if (inRect(p, buttons.skip)) return skipCard();
    return;
  }
  if (inRect(p, buttons.zoomIn)) return zoomAt(viewW / 2, viewH / 2, cam.z * 1.5);
  if (inRect(p, buttons.zoomOut)) return zoomAt(viewW / 2, viewH / 2, cam.z / 1.5);
  // The ITEMS tab and bar.
  if (phase === 'home' && !showPanel()) {
    const { bar, tab } = itemsLayout();
    if (inRect(p, tab)) { itemsOpen = !itemsOpen; if (!itemsOpen) placingItem = null; selected = null; return; }
    if (itemsOpen && inRect(p, bar)) {
      const at = p.x - 6 + itemsScroll, i = Math.floor(at / (ITEM_SLOT + ITEM_GAP));
      const it = game.items[i];
      if (it && at - i * (ITEM_SLOT + ITEM_GAP) < ITEM_SLOT) {
        placingItem = placingItem === it ? null : it;
        placing = null; buildMode = false; selected = null;
      }
      return;
    }
  }
  if (showPanel() && inRect(p, buttons.panel)) {
    if (canStore(selected) && inRect(p, storeButton(selected))) return storeBuilding(selected);
    // Only the buttons the panel actually draws respond (none in build mode).
    if (buildMode) return;
    const def = BUILDINGS[selected.type];
    if (def.run || def.decor || selected.type === 'tree') return;
    if (phase === 'home' && inRect(p, buttons.upgrade) && repairCostOf(selected) > 0) repairOne(selected);
    else if (phase === 'home' && inRect(p, buttons.upgrade)) tryUpgrade(selected);
    else if (phase === 'home' && selected.type === 'wall' && inRect(p, buttons.upgradeAll)) upgradeAllWalls(selected.level);
    else if (phase !== 'home' && (inRect(p, buttons.upgrade) || inRect(p, buttons.upgradeAll))) showToast('UPGRADE WHEN YOU ARE HOME');
    return;
  }
  if (showRepair() && inRect(p, buttons.repair)) return repairAll();
  if (inRect(p, buttons.home)) {
    // In build mode this is ADD: the catalog of new buildings, looks and the store.
    if (buildMode) { menuOpen = true; selected = null; placing = null; return; }
    // HOME: back to looking at your base.
    return homeView();
  }
  if (inRect(p, buttons.main)) {
    if (phase === 'home') { buildMode = false; return nextWave(); } // START WAVE
    return;
  }
  if (inRect(p, buttons.left)) {
    if (placingItem) { placingItem = null; return; } // DONE placing an item
    if (phase !== 'home') {
      speed = speed % 3 + 1;
      return;
    }
    // BUILD toggles build mode (home only). While placing, DONE first stops placing.
    if (placing) { placing = null; return; }
    buildMode = !buildMode;
    selected = null;
    showToast(buildMode ? 'BUILD MODE - TAP A BUILDING TO MOVE IT, ADD FOR NEW' : 'BACK TO EXPLORING');
    return;
  }
  if (p.y < HUD_H || p.y >= UH - BAR_H) return;
  onWorldTap(sx, sy);
}

// ---------- Touch & mouse: tap, drag to pan, pinch / wheel to zoom ----------

const pointers = new Map();
let drag = null;  // { sx, sy, camX, camY, moved, ui }
let pinch = null; // { d0, z0, mid }

const midpoint = () => {
  const [a, b] = [...pointers.values()];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
};

canvas.addEventListener('pointerdown', (e) => {
  try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    const pu = toUI(e.clientX, e.clientY);
    const onBar = phase === 'home' && itemsOpen && inRect(pu, itemsLayout().bar);
    drag = { sx: e.clientX, sy: e.clientY, camX: cam.x, camY: cam.y, moved: false, ui: onUI(e.clientX, e.clientY), bar: onBar, scroll0: itemsScroll };
  } else if (pointers.size === 2) {
    const m = midpoint();
    pinch = { d0: Math.max(1, m.d), z0: cam.z, mid: m };
    if (drag) drag.moved = true; // a pinch is never a tap
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size >= 2) {
    const m = midpoint();
    const w = screenToWorld(pinch.mid.x, pinch.mid.y);
    cam.z = Math.max(minZ(), Math.min(MAX_Z, (pinch.z0 * m.d) / pinch.d0));
    cam.x = w.x - (m.x - viewW / 2) / cam.z;
    cam.y = w.y - (m.y - viewH / 2) / cam.z;
    clampCam();
    pinch.mid = m;
  } else if (drag) {
    // Any press that slides counts as a drag (so sliding off a button never taps the map),
    // but only presses that started on the map pan the camera.
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 8) { drag.moved = true; if (!drag.ui) follow = false; }
    if (drag.moved && drag.bar) {
      // Sliding the ITEMS bar.
      const max = Math.max(0, game.items.length * (ITEM_SLOT + ITEM_GAP) + 8 - UW);
      itemsScroll = Math.max(0, Math.min(max, drag.scroll0 - (dx * dpr) / ui));
    }
    if (drag.moved && !drag.ui) {
      cam.x = drag.camX - dx / cam.z;
      cam.y = drag.camY - dy / cam.z;
      clampCam();
    }
  }
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  if (drag && !drag.moved && pointers.size === 1 && e.type === 'pointerup') onTap(e.clientX, e.clientY);
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (pointers.size === 1) {
    // Lifting one finger of a pinch: keep panning with the other.
    const [p] = pointers.values();
    drag = { sx: p.x, sy: p.y, camX: cam.x, camY: cam.y, moved: true, ui: false };
  }
  if (pointers.size === 0) drag = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, cam.z * Math.exp(-e.deltaY * 0.0015));
}, { passive: false });

// ---------- Drawing ----------

function drawButton(b, label = b.label, style = b.primary ? 'primary' : 'normal') {
  const colors = {
    primary: [PAL.r, PAL.R], normal: [PAL.S, PAL.s], good: [PAL.G, PAL.g], off: [PAL.t, PAL.t],
  }[style];
  ctx.fillStyle = PAL.k;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = colors[0];
  ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  ctx.fillStyle = colors[1];
  ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 2);
  const s = b.h >= 24 && textWidth(label, 2) <= b.w - 8 && style !== 'normal' ? 2 : 1;
  drawText(ctx, label, b.x + (b.w - textWidth(label, s)) / 2, b.y + Math.round((b.h - 5 * s) / 2) + 1,
    style === 'off' ? PAL.S : PAL.w, s);
}

function drawSelection(b, time) {
  if (Math.floor(time * 4) % 2) return;
  const x = b.c * T, y = b.r * T, w = sizeOf(b) * T;
  ctx.fillStyle = PAL.y;
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [w - 1, 0, -1, 1], [0, w - 1, 1, -1], [w - 1, w - 1, -1, -1]]) {
    ctx.fillRect(x + cx + (sx < 0 ? -4 : 0), y + cy, 5, 1);
    ctx.fillRect(x + cx, y + cy + (sy < 0 ? -4 : 0), 1, 5);
  }
}

function drawChunkOutline([cx, cy], color) {
  const x = cx * CHUNK * T, y = cy * CHUNK * T, s = CHUNK * T;
  const t = Math.max(1, 2 / cam.z);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, s, t);
  ctx.fillRect(x, y + s - t, s, t);
  ctx.fillRect(x, y, t, s);
  ctx.fillRect(x + s - t, y, t, s);
}

function drawBar(x, y, w, frac, color) {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(x - 1, y - 1, w + 2, 4);
  ctx.fillStyle = PAL.t;
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = color || (frac > 0.5 ? PAL.l : frac > 0.25 ? PAL.y : PAL.R);
  ctx.fillRect(x, y, Math.max(1, Math.round(w * frac)), 2);
}

function drawPuffs() {
  for (const p of puffs) {
    if (p.t < 0) continue;
    const rad = 3 + p.t * 26;
    ctx.fillStyle = p.t < 0.25 ? PAL.w : PAL.l;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + p.t * 3;
      ctx.fillRect(Math.round(p.x + Math.cos(a) * rad) - 1, Math.round(p.y + Math.sin(a) * rad) - 1, 3, 3);
    }
  }
}

const centerOf = (b) => ({ x: (b.c + sizeOf(b) / 2) * T, y: (b.r + sizeOf(b) / 2) * T });

function drawBuilding(b, now) {
  const x = b.c * T, y = b.r * T, s = sizeOf(b), w = s * T;
  if (b.hp <= 0) {
    for (let r = 0; r < s; r++) for (let c = 0; c < s; c++) ctx.drawImage(img.rubble, x + c * T, y + r * T);
    return;
  }
  const flashing = battle.flash.has(b);
  if (isWallType(b.type)) {
    // Join up with standing walls (and run barricades) on each side. Barricades look like log walls.
    const isWall = (c, r) => { const o = buildingAt(c, r); return o && isWallType(o.type) && o.hp > 0; };
    const mask = (isWall(b.c, b.r - 1) ? WALL_N : 0) | (isWall(b.c + 1, b.r) ? WALL_E : 0)
      | (isWall(b.c, b.r + 1) ? WALL_S : 0) | (isWall(b.c - 1, b.r) ? WALL_W : 0);
    ctx.drawImage(levelImg('wall', b.type === 'barricade' ? 2 : b.level || 1, mask, flashing), x, y);
  } else if (BUILDINGS[b.type].trap) {
    ctx.drawImage(levelImg(b.type, 1, 0, false), x, y);
  } else {
    ctx.drawImage(img.shadow, x, y, w, w);
    if (b.type === 'tree') ctx.drawImage((flashing ? flashImg : img).tree, x, y);
    else if (b.type === 'tower') {
      const ty = y + T - TOWER_H; // tall: overhangs upward
      ctx.drawImage(levelImg('tower', b.level || 1, 0, flashing), x, ty);
      if (!isManned(b)) {
        // Nobody inside: an empty, dark lookout and a red "!" asking for an archer.
        ctx.fillStyle = PAL.k; ctx.fillRect(x + 7, ty + 15, 10, 6);
        if (Math.floor(now / 500) % 2 && phase !== 'wave') {
          ctx.fillStyle = PAL.k; ctx.fillRect(x + 8, ty - 9, 9, 10);
          ctx.fillStyle = PAL.r; ctx.fillRect(x + 9, ty - 8, 7, 8);
          ctx.fillStyle = PAL.w; ctx.fillRect(x + 12, ty - 7, 1, 4); ctx.fillRect(x + 12, ty - 2, 1, 1);
        }
      }
    }
    else ctx.drawImage(levelImg(b.type, b.level || 1, 0, flashing), x, y);
  }
  if (b.hp < maxHp(b) && b.type !== 'tree' && !BUILDINGS[b.type].trap) drawBar(x + 4, y + 1, w - 8, b.hp / maxHp(b));
  // Run cards wear a little gold corner so you can tell they're temporary.
  if (isRunObject(b)) {
    ctx.fillStyle = PAL.y;
    ctx.fillRect(x + 1, y + w - 3, 2, 2);
  }

  // Under construction: scaffold poles and a progress bar.
  if (underConstruction(game, b)) {
    const { start, until } = game.builder;
    ctx.fillStyle = PAL.N;
    ctx.fillRect(x + 1, y + 2, 1, w - 4);
    ctx.fillRect(x + w - 2, y + 2, 1, w - 4);
    ctx.fillRect(x + 1, y + Math.round(w / 2), w - 2, 1);
    drawBar(x + 4, y + w - 4, w - 8, Math.min(1, (now - start) / (until - start)), PAL.y);
  }


}

function drawMonster(m) {
  const big = m.def.big;
  let x = m.x + m.ox, y = m.y + m.oy;
  // Lunge toward what it's hitting, right after a hit.
  if (m.attacking && m.atk > m.def.rate - 0.15) {
    const tc = m.attacking.npc || m.attacking.isHero ? { x: m.attacking.x + T / 2, y: m.attacking.y + T / 2 } : centerOf(m.attacking);
    if (Math.abs(tc.x - m.x) > T / 2) x += Math.sign(tc.x - m.x) * 3;
    if (Math.abs(tc.y - m.y) > T / 2) y += Math.sign(tc.y - m.y) * 3;
  }
  const hop = !m.attacking && Math.floor(m.t * 7) % 2 ? -1 : 0;
  const s = big ? 2 : 1;
  const sx = Math.round(x - 12 * s), sy = Math.round(y - 12 * s - (big ? 8 : 2) + hop);
  ctx.drawImage(img.shadow, sx, Math.round(y - 12 * s - (big ? 8 : 2)), 24 * s, 24 * s);
  ctx.drawImage(m.flash > 0 ? flashImg[m.type] : img[m.type], sx, sy, 24 * s, 24 * s);
  // Status: frost (blue sparkles), poison (green drip), stunned (yellow stars).
  const fx = Math.round(x), fy = sy + 10 * s;
  if (battle.time < m.slowUntil) { ctx.fillStyle = PAL.c; ctx.fillRect(fx - 6, fy, 2, 2); ctx.fillRect(fx + 5, fy - 3, 2, 2); }
  if (m.poison > 0) { ctx.fillStyle = PAL.l; ctx.fillRect(fx + 3, fy + 4 + (Math.floor(m.t * 4) % 3), 1, 2); }
  if (m.stun > 0) { ctx.fillStyle = PAL.y; ctx.fillRect(fx - 4 + Math.round(Math.sin(m.t * 8) * 4), sy + 4, 2, 2); }
  if (m.hp < m.maxHp) drawBar(Math.round(x - 6 * s), sy + (big ? 14 : 8), 12 * s, m.hp / m.maxHp);
}

// A fighter's sword or gun, held on the side they face. The sword swings flat for a moment after a hit.
function drawWeapon(v) {
  const x = Math.round(v.x), y = Math.round(v.y);
  const left = v.dir === 'left';
  const hx = left ? x + 4 : x + 18, hy = y + 15;  // the hand
  const swing = v.swing > 0;
  if (fightOf(v).weapon === 'sword') {
    ctx.fillStyle = PAL.N; ctx.fillRect(hx - 1, hy, 3, 1);          // cross-guard
    ctx.fillStyle = PAL.w;
    if (swing) ctx.fillRect(left ? hx - 7 : hx + 1, hy - 1, 7, 1); // blade out flat
    else ctx.fillRect(hx, hy - 7, 1, 7);                            // blade up
  } else {
    ctx.fillStyle = PAL.k; ctx.fillRect(left ? hx - 4 : hx, hy - 1, 5, 2);
    if (swing) { ctx.fillStyle = PAL.y; ctx.fillRect(left ? hx - 6 : hx + 5, hy - 1, 2, 2); }
  }
  if (battle.active && v.hp < fighterMaxHp(v)) drawBar(x + 6, y + 2, 12, v.hp / fighterMaxHp(v));
}

// Your hero, with their bow (drawn back for a moment after a shot), health during a wave, and a little
// flag on their guard spot while they walk there.
function drawHero() {
  const x = Math.round(hero.x), y = Math.round(hero.y);
  const p = heroPost(), t = heroTile();
  if (t.c !== p.c || t.r !== p.r) {
    ctx.fillStyle = PAL.N; ctx.fillRect(p.c * T + 11, p.r * T + 8, 1, 12);
    ctx.fillStyle = PAL.y; ctx.fillRect(p.c * T + 12, p.r * T + 8, 5, 4);
  }
  if (hero.down) {
    ctx.globalAlpha = 0.45;
    ctx.drawImage(heroImg('down', 0), x, y + 3);
    ctx.globalAlpha = 1;
    if (Math.floor(hero.t * 2) % 2) { ctx.fillStyle = PAL.R; ctx.fillRect(x + 11, y + 2, 2, 2); }
    return;
  }
  const frame = hero.moving ? Math.floor(hero.t * 7) % 2 : 0;
  ctx.drawImage(img.shadow, x, y);
  ctx.drawImage(heroImg(hero.dir, frame), x, y - (hero.moving && frame ? 1 : 0));
  // The bow: a curved stave and a string, held on the side they face.
  const left = hero.dir === 'left';
  const bx = left ? x + 3 : x + 19, by = y + 9;
  ctx.fillStyle = PAL.n;
  ctx.fillRect(bx + (left ? 0 : 1), by, 1, 1); ctx.fillRect(bx + (left ? -1 : 2), by + 1, 1, 5); ctx.fillRect(bx + (left ? 0 : 1), by + 6, 1, 1);
  ctx.fillStyle = PAL.w;
  ctx.fillRect(bx + (left ? 1 : 0) + (hero.swing > 0 ? (left ? 1 : -1) : 0), by + 1, 1, 5);
  if (battle.active && hero.hp < heroMaxHp()) drawBar(x + 6, y + 1, 12, hero.hp / heroMaxHp());
}

function drawDownedFighter(v) {
  ctx.globalAlpha = 0.45;
  ctx.drawImage(personImg(v.look, 'down', 0), Math.round(v.x), Math.round(v.y) + 3);
  ctx.globalAlpha = 1;
  if (Math.floor(v.t * 2) % 2) { ctx.fillStyle = PAL.R; ctx.fillRect(Math.round(v.x) + 11, Math.round(v.y) + 2, 2, 2); }
}

function drawShots() {
  for (const a of battle.shots) {
    const X = Math.round(a.x), Y = Math.round(a.y);
    if (a.kind === 'bullet') { ctx.fillStyle = PAL.y; ctx.fillRect(X - 1, Y, 2, 1); continue; }
    if (a.kind === 'ball') { ctx.fillStyle = PAL.k; ctx.fillRect(X - 2, Y - 2, 4, 4); continue; }
    if (a.kind === 'ice') { ctx.fillStyle = PAL.c; ctx.fillRect(X - 1, Y - 1, 3, 3); ctx.fillStyle = PAL.w; ctx.fillRect(X, Y, 1, 1); continue; }
    const len = a.kind === 'bolt' ? 7 : 4;
    ctx.fillStyle = PAL.N;
    for (let i = 2; i <= len; i += 1) ctx.fillRect(Math.round(a.x - a.vx * i), Math.round(a.y - a.vy * i), 1, 1);
    ctx.fillStyle = PAL.w;
    ctx.fillRect(X, Y, 2, 2);
  }
  for (const e of battle.effects) {
    const k = e.t / e.life;
    if (e.kind === 'zap') {
      ctx.fillStyle = Math.floor(e.t * 40) % 2 ? PAL.w : PAL.v;
      for (let i = 1; i < e.pts.length; i++) {
        const a = e.pts[i - 1], b = e.pts[i];
        const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
        for (let s = 0; s <= steps; s++) {
          const jit = s % 4 === 2 ? (Math.random() - 0.5) * 6 : 0;
          ctx.fillRect(Math.round(a.x + ((b.x - a.x) * s) / steps + jit), Math.round(a.y + ((b.y - a.y) * s) / steps + jit), 2, 2);
        }
      }
    } else if (e.kind === 'blast' || e.kind === 'burst') {
      const rad = (e.r || 8) * (0.3 + 0.7 * k);
      ctx.fillStyle = e.color === 'w' ? PAL.w : k < 0.5 ? PAL.y : PAL.R;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ctx.fillRect(Math.round(e.x + Math.cos(a) * rad) - 1, Math.round(e.y + Math.sin(a) * rad) - 1, 3, 3);
      }
    }
  }
}

const RARITY_COLOR = { common: PAL.s, rare: PAL.c, epic: '#c86bff' };
const cardImgCache = new Map();
function cardIcon(id) {
  if (!cardImgCache.has(id)) cardImgCache.set(id, rowsToCanvas(cardRows(id === 'barricade' ? 'stonemason' : id)));
  return cardImgCache.get(id);
}

function drawCardPick() {
  const box = buttons.cardBox;
  ctx.fillStyle = 'rgba(26,28,44,0.55)';
  ctx.fillRect(0, 0, UW, UH);
  panelBox(box);
  const wave = run.wave + 1;
  drawText(ctx, `WAVE ${wave} - PICK A CARD`, box.x + 6, box.y + 5, PAL.w);
  drawText(ctx, `OMEN: ${run.omen.name.toUpperCase()}  +${run.omen.good}`, box.x + 6, box.y + 13, PAL.l);
  if (run.omen.bad !== run.omen.good) drawText(ctx, `-${run.omen.bad}`, box.x + 6 + textWidth('OMEN: ') , box.y + 19, PAL.R);
  run.choices.forEach((id, i) => {
    const c = CARDS[id], b = buttons.cards[i];
    ctx.fillStyle = PAL.k; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#272b3a'; ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.fillStyle = RARITY_COLOR[c.rarity]; ctx.fillRect(b.x + 1, b.y + 1, 3, b.h - 2);
    const icon = cardIcon(id === 'barricade' ? 'barricade' : id);
    if (id === 'barricade') ctx.drawImage(levelImg('wall', 2, WALL_E | WALL_W, false), b.x + 6, b.y + 3);
    else ctx.drawImage(icon, b.x + 6, b.y + 3, 24, 24);
    const tx = b.x + 34;
    drawText(ctx, c.name.toUpperCase(), tx, b.y + 4, PAL.w);
    const tag = `${c.rarity.toUpperCase()} ${c.kind.toUpperCase()}`;
    drawText(ctx, tag, b.x + b.w - 4 - textWidth(tag), b.y + 4, RARITY_COLOR[c.rarity]);
    drawText(ctx, c.lines[0], tx, b.y + 13, PAL.s);
    drawText(ctx, c.lines[1] || '', tx, b.y + 20, PAL.s);
  });
  drawButton(buttons.reroll, `REROLL (${run.rerolls})`, run.rerolls > 0 ? 'normal' : 'off');
  drawButton(buttons.skip, `SKIP +${SKIP_GOLD}G`, 'normal');
}

// The ITEMS tab sits just above the bottom bar; pulled up, the bar of item slots sits between them.
function itemsLayout() {
  const barH = itemsOpen ? ITEM_SLOT + 8 : 0;
  const bar = { x: 0, y: UH - BAR_H - barH, w: UW, h: barH };
  const tab = { x: Math.round(UW / 2) - 32, y: bar.y - 11, w: 64, h: 11 };
  return { bar, tab };
}

// A small picture of an item: its building art (or card art), shrunk to fit a slot.
function itemIcon(it) {
  if (it.type === 'wall' || it.type === 'barricade') return levelImg('wall', it.type === 'wall' ? it.level : 2, WALL_E | WALL_W, false);
  return levelImg(it.type, it.level, 0, false);
}

function drawItems() {
  const { bar, tab } = itemsLayout();
  const count = game.items.reduce((sum, i) => sum + i.n, 0);
  panelBox(tab, itemsOpen ? PAL.S : PAL.t);
  const label = `ITEMS ${count}`;
  drawText(ctx, label, tab.x + Math.round((tab.w - textWidth(label)) / 2) + 3, tab.y + 3, count ? PAL.y : PAL.s);
  // A little arrow: up to open, down to close.
  ctx.fillStyle = PAL.w;
  const ax = tab.x + 5, ay = tab.y + 4;
  if (itemsOpen) { ctx.fillRect(ax, ay, 5, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax + 2, ay + 2, 1, 1); }
  else { ctx.fillRect(ax + 2, ay, 1, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax, ay + 2, 5, 1); }
  if (!itemsOpen) return;
  ctx.fillStyle = PAL.k;
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  if (!game.items.length) {
    centeredText('EMPTY - PICKED CARDS AND STORED BUILDINGS GO HERE', bar.y + 14, PAL.s);
    return;
  }
  game.items.forEach((it, i) => {
    const x = 6 + i * (ITEM_SLOT + ITEM_GAP) - itemsScroll, y = bar.y + 4;
    if (x + ITEM_SLOT < 0 || x > UW) return;
    const on = it === placingItem;
    ctx.fillStyle = on ? PAL.y : PAL.S; ctx.fillRect(x, y, ITEM_SLOT, ITEM_SLOT);
    ctx.fillStyle = '#272b3a'; ctx.fillRect(x + 1, y + 1, ITEM_SLOT - 2, ITEM_SLOT - 2);
    const img = itemIcon(it);
    const k = Math.min(22 / img.width, 22 / img.height);
    const w = Math.round(img.width * k), h = Math.round(img.height * k);
    ctx.drawImage(img, x + Math.round((ITEM_SLOT - w) / 2), y + Math.round((ITEM_SLOT - h) / 2), w, h);
    if (it.n > 1) { const t = `${it.n}`; drawText(ctx, t, x + ITEM_SLOT - 2 - textWidth(t), y + ITEM_SLOT - 7, PAL.w); }
    if (!BUILDINGS[it.type].run && !BUILDINGS[it.type].decor) drawText(ctx, `L${it.level}`, x + 2, y + 2, PAL.y);
  });
}

// Attack range: a dashed ring around a selected tower (or card tower, or the hero).
function drawRange(x, y, radius) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,205,117,0.10)';
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,205,117,0.8)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.restore();
}

function rangeOf(b) {
  const def = battle.towerDef(b);
  return def ? def.range : 0;
}

function centeredText(text, y, color, scale = 1) {
  drawText(ctx, text, Math.round((UW - textWidth(text, scale)) / 2), y, color, scale);
}

function panelBox(b, fill = PAL.t) {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = fill;
  ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
}

// The info panel for the selected building.
function drawInfoPanel(b, now) {
  const box = buttons.panel;
  panelBox(box);
  const x = box.x + 5, y = box.y + 5;
  const def = BUILDINGS[b.type];
  const lv = b.level || 1;
  const title = b.type === 'house' ? `HOUSE LV ${lv} - ${HOUSE_LEVELS[lv - 1].name.toUpperCase()}`
    : def.decor || b.type === 'tree' || def.run ? def.name.toUpperCase() : `${def.name.toUpperCase()} LV ${lv}`;
  drawText(ctx, title, x, y, PAL.w);
  if (canStore(b)) drawButton(storeButton(b), 'STORE', b.hp >= maxHp(b) && !underConstruction(game, b) ? 'normal' : 'off');
  if (buildMode) {
    drawText(ctx, 'TAP GRASS TO MOVE IT HERE', x, y + 12, PAL.y);
    drawText(ctx, 'OR STORE IT IN YOUR ITEMS', x, y + 24, PAL.S);
    return;
  }
  if (def.run) {
    const card = CARDS[b.type] || CARDS.barricade;
    drawText(ctx, card.lines.join('  '), x, y + 10, PAL.s);
    if (!def.trap) drawText(ctx, `HP ${Math.ceil(b.hp)}/${maxHp(b)}`, x, y + 20, PAL.s);
    drawText(ctx, 'CARD - LASTS THIS RUN', x, y + 30, PAL.y);
    return;
  }

  // What it does.
  let info = '';
  if (b.type === 'tower') {
    const st = towerStats(lv);
    info = `DMG ${st.damage} RNG ${(st.range / T).toFixed(1)}  ${isManned(b) ? 'ARCHER ON DUTY' : 'NO ARCHER - HIRE AT TAVERN'}`;
  } else if (b.type === 'house') {
    info = `HOLDS UP TO ${storageCap(lv).gold} GOLD`;
  } else if (b.type === 'tree' || def.decor) {
    info = 'DECORATION - JUST FOR LOOKS';
  }
  if (b.type !== 'tree' && !def.decor) info = `HP ${Math.ceil(b.hp)}/${maxHp(b)}  ${info}`;
  drawText(ctx, info, x, y + 10, PAL.s);

  // Upgrade status.
  if (b.type === 'tree' || def.decor) return;
  const atHome = phase === 'home';
  if (underConstruction(game, b)) {
    const left = (game.builder.until - now) / 1000;
    drawText(ctx, `UPGRADING - ${realTime(left)} LEFT`, x, y + 22, PAL.y);
    drawBar(x, y + 32, box.w - 80, Math.min(1, (now - game.builder.start) / (game.builder.until - game.builder.start)), PAL.y);
    drawButton(buttons.upgrade, 'BUSY', 'off');
    return;
  }
  // Damaged: fix it first (you're standing in reach, so you can).
  const fix = repairCostOf(b);
  if (fix > 0) {
    drawText(ctx, `DAMAGED - FIX FOR ${fix}G`, x, y + 22, game.gold >= fix ? PAL.y : PAL.R);
    drawButton(buttons.upgrade, `FIX ${fix}G`, atHome && game.gold >= fix ? 'good' : 'off');
    return;
  }
  const cost = upgradeCost(b.type, lv);
  const block = upgradeBlock(game, b);
  if (cost) {
    drawText(ctx, `NEXT: ${formatCost(cost)}${cost.time ? `  ${realTime(cost.time)}` : ''}`, x, y + 22,
      canAfford(game, cost) ? PAL.y : PAL.R);
  }
  if (block) drawText(ctx, block, x, y + 32, PAL.R);
  drawButton(buttons.upgrade, lv >= MAX_LEVEL ? 'MAX' : 'UPGRADE', !block && atHome ? 'primary' : 'off');
  if (b.type === 'wall') {
    const same = game.buildings.filter((w) => w.type === 'wall' && w.level === lv && w.hp > 0).length;
    drawButton(buttons.upgradeAll, `ALL ${same}`, !block && atHome ? 'normal' : 'off');
  }
}

function drawShop() {
  const m = buttons.menu;
  ctx.fillStyle = 'rgba(26,28,44,0.5)';
  ctx.fillRect(0, 0, UW, UH);
  panelBox(m);
  const title = shopOpen === 'hero' ? `YOUR HERO - LV ${game.hero.level}` : SHOPS.find((s) => s.id === shopOpen).name;
  drawText(ctx, title.toUpperCase(), m.x + 6, m.y + 8, PAL.y);
  const res = `G ${game.gold}`;
  drawText(ctx, res, m.x + m.w - 6 - textWidth(res), m.y + 8, PAL.s);
  shopItems().forEach((it, i) => {
    const b = buttons.shopRows[i];
    drawText(ctx, it.title, m.x + 6, b.y + 1, PAL.w);
    drawText(ctx, it.sub, m.x + 6, b.y + 9, PAL.S);
    drawButton(b, it.label, it.style);
  });
  drawButton(buttons.menuClose);
}

function drawBuildMenu() {
  const m = buttons.menu;
  ctx.fillStyle = 'rgba(26,28,44,0.5)';
  ctx.fillRect(0, 0, UW, UH);
  panelBox(m);
  const hl = houseLevel(game);
  drawButton(buttons.tabBuild, 'BUILD', menuTab === 'build' ? 'primary' : 'normal');
  drawButton(buttons.tabLooks, 'LOOKS', menuTab === 'looks' ? 'primary' : 'normal');
  drawButton(buttons.tabStore, 'STORE', menuTab === 'store' ? 'primary' : 'normal');
  const corner = menuTab === 'store' ? `GEMS ${game.gems}` : `HOUSE LV ${hl}`;
  drawText(ctx, corner, m.x + m.w - 6 - textWidth(corner), m.y + 8, menuTab === 'store' ? PAL.v : PAL.s);
  if (menuTab === 'store') {
    THEMES.forEach((th, i) => {
      const row = buttons.storeRows[i];
      const pal = themePalette(th.id);
      // Little swatch of the pack's roof, wall and wood colours.
      [pal.r, pal.s, pal.n, pal.w].forEach((col, k) => {
        ctx.fillStyle = PAL.k; ctx.fillRect(m.x + 6 + k * 6, row.y + 2, 6, 12);
        ctx.fillStyle = col; ctx.fillRect(m.x + 7 + k * 6, row.y + 3, 4, 10);
      });
      const owned = game.ownedThemes.includes(th.id);
      const wearing = game.theme === th.id;
      drawText(ctx, th.name.toUpperCase(), m.x + 34, row.y + 1, PAL.w);
      drawText(ctx, owned ? th.tag : `${th.tag}  ${th.price} GEMS`, m.x + 34, row.y + 9, owned ? PAL.S : PAL.v);
      drawButton(row, wearing ? 'ON' : owned ? 'WEAR' : 'BUY', wearing ? 'off' : owned ? 'normal' : game.gems >= th.price ? 'primary' : 'off');
    });
    drawButton(buttons.menuClose);
    return;
  }
  if (menuTab === 'looks') {
    const th = themeById(game.theme);
    const ty = buttons.themePrev.y;
    drawText(ctx, `THEME: ${th.name.toUpperCase()}`, m.x + 6, ty + 1, PAL.w);
    drawText(ctx, `OWN ${game.ownedThemes.length}/${THEMES.length} - MORE IN STORE`, m.x + 6, ty + 9, PAL.S);
    drawButton(buttons.themePrev);
    drawButton(buttons.themeNext);
    buttons.decorRows.forEach((row) => {
      const limit = limitFor(row.type, hl);
      const block = buildBlock(game, row.type);
      drawText(ctx, `${BUILDINGS[row.type].name.toUpperCase()}  ${countOf(game, row.type)}/${limit}`, m.x + 6, row.y + 1, limit === 0 ? PAL.S : PAL.w);
      drawText(ctx, block || formatCost(BUILD_COST[row.type]), m.x + 6, row.y + 9, block ? PAL.R : PAL.y);
      drawButton(row, 'BUY', block ? 'off' : 'primary');
    });
    drawButton(buttons.menuClose);
    return;
  }
  buttons.menuRows.forEach((row) => {
    const type = row.type;
    const limit = limitFor(type, hl);
    const count = countOf(game, type);
    const block = buildBlock(game, type);
    const ry = row.y;
    drawText(ctx, `${BUILDINGS[type].name.toUpperCase()}  ${count}/${limit}`, m.x + 6, ry + 1, block && limit === 0 ? PAL.S : PAL.w);
    drawText(ctx, block || formatCost(BUILD_COST[type]), m.x + 6, ry + 9, block ? PAL.R : PAL.y);
    drawButton(row, 'BUY', block ? 'off' : 'primary');
  });
  const rr = buttons.menuReset;
  drawText(ctx, 'START OVER', m.x + 6, rr.y + 1, PAL.s);
  drawText(ctx, 'TAP TWICE', m.x + 6, rr.y + 9, PAL.S);
  drawButton(rr, 'RESET', 'normal');
  drawButton(buttons.menuClose);
}

function render(time, dt) {
  const now = clock();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- World ---
  const s = cam.z * dpr;
  const ox = Math.round(canvas.width / 2 - cam.x * s);
  const oy = Math.round(canvas.height / 2 - cam.y * s);
  ctx.setTransform(s, 0, 0, s, ox, oy);
  ctx.imageSmoothingEnabled = false;
  drawTerrain(s, ox, oy);

  const person = (look, x, y, dir, moving, t) => {
    const frame = moving ? Math.floor(t * 7) % 2 : 0;
    ctx.drawImage(img.shadow, Math.round(x), Math.round(y));
    ctx.drawImage(personImg(look, dir, frame), Math.round(x), Math.round(y - (moving && frame ? 1 : 0)));
  };
  // Only what's on screen gets drawn (zoomed out, that saves hundreds of trees).
  const vx0 = -ox / s - 2 * T, vx1 = (canvas.width - ox) / s + T, vy0 = -oy / s - T, vy1 = (canvas.height - oy) / s + 3 * T;
  const onScreen = (b) => (b.c + sizeOf(b)) * T > vx0 && b.c * T < vx1 && (b.r + sizeOf(b)) * T > vy0 && b.r * T < vy1;
  const things = [
    ...game.buildings.filter(onScreen).map((b) => ({ y: (b.r + sizeOf(b) - 1) * T, draw: () => drawBuilding(b, now) })),
    // The village: shops, the well, shopkeepers and townsfolk.
    ...SHOPS.map((s) => ({ y: (s.r + 1) * T, draw: () => {
      ctx.drawImage(img.shadow, s.c * T, s.r * T, 2 * T, 2 * T);
      ctx.drawImage(villageImg(s.id), s.c * T, s.r * T);
    } })),
    { y: WELL.r * T, draw: () => ctx.drawImage(villageImg('well'), WELL.c * T, WELL.r * T) },
    ...SHOPKEEPERS.map((k) => ({ y: k.r * T, draw: () => person(k.look, k.c * T, k.r * T, 'down', false, 0) })),
    ...townsfolk.map((v) => ({ y: v.y, draw: () => person(v.look, v.x, v.y, v.dir, v.moving, v.t) })),
    ...(game.pets.active && !hero.inside ? [{ y: pet.y - 0.1, draw: () => {
      const frame = pet.moving ? Math.floor(pet.t * 8) % 2 : 0;
      ctx.drawImage(petImg(game.pets.active, frame), Math.round(pet.x), Math.round(pet.y + 2));
      if (!petFed(game.pets.active) && Math.floor(pet.t * 2) % 2) { ctx.fillStyle = PAL.R; ctx.fillRect(Math.round(pet.x) + 16, Math.round(pet.y) + 4, 2, 5); ctx.fillRect(Math.round(pet.x) + 16, Math.round(pet.y) + 10, 2, 2); }
    } }] : []),
    { y: hero.y + 0.1, draw: drawHero },
    ...villagers.filter((v) => !v.inside && !v.atPost).map((v) => ({ y: v.y, draw: () => {
      if (v.down) { drawDownedFighter(v); return; }
      person(v.look, v.x, v.y, v.dir, v.moving, v.t);
      if (isFighter(v)) drawWeapon(v);
      // A builder at work: a little hammer going up and down.
      if (v.working) {
        const up = Math.floor(v.t * 6) % 2;
        ctx.fillStyle = PAL.N; ctx.fillRect(Math.round(v.x) + 17, Math.round(v.y) + 9 - up * 2, 1, 5);
        ctx.fillStyle = PAL.S; ctx.fillRect(Math.round(v.x) + 16, Math.round(v.y) + 8 - up * 2, 3, 2);
      }
    } })),
    ...battle.monsters.map((m) => ({ y: m.y - 12 + 0.5, draw: () => drawMonster(m) })),
  ].sort((a, b) => a.y - b.y);
  for (const t of things) t.draw();

  drawShots();
  if (selected) drawSelection(selected, time);
  // Attack ranges: the selected tower's, and the hero's while you're giving them orders.
  if (selected && phase !== 'end') {
    const rr = rangeOf(selected);
    if (rr) drawRange((selected.c + sizeOf(selected) / 2) * T, selected.r * T + 6, rr);
  }
  if ((shopOpen === 'hero' || movingHero) && !hero.down) drawRange(hero.x + T / 2, hero.y + T / 2, heroStats(game.hero.level).range * T);
  if (offer) drawChunkOutline(offer, PAL.y);
  drawPuffs();

  // --- UI ---
  ctx.setTransform(ui, 0, 0, ui, 0, 0);

  // Floating numbers.
  for (const f of floats) {
    const sc = worldToScreen(f.x, f.y);
    const p = toUI(sc.x, sc.y);
    drawText(ctx, f.text, Math.round(p.x - textWidth(f.text) / 2), Math.round(p.y - f.t * 14), f.color);
  }

  // Builder countdown over the building being upgraded.
  if (game.builder) {
    const b = game.buildings.find((x) => x.id === game.builder.id);
    if (b) {
      const sc = worldToScreen(centerOf(b).x, b.r * T);
      const p = toUI(sc.x, sc.y);
      const label = realTime((game.builder.until - now) / 1000);
      const w = textWidth(label) + 6;
      ctx.fillStyle = PAL.k;
      ctx.fillRect(Math.round(p.x - w / 2), Math.round(p.y - 12), w, 9);
      drawText(ctx, label, Math.round(p.x - w / 2) + 3, Math.round(p.y - 10), PAL.y);
    }
  }

  // Price tags on plots you can buy (only at home).
  const price = landPrice(game.bought);
  if (phase === 'home') {
    const tag = `${price}G`;
    for (let cy = LAND0; cy <= LAND1; cy++) {
      for (let cx = LAND0; cx <= LAND1; cx++) {
        if (!canBuy(cx, cy)) continue;
        const sc = worldToScreen((cx + 0.5) * CHUNK * T, (cy + 0.5) * CHUNK * T);
        const p = toUI(sc.x, sc.y);
        const w = textWidth(tag) + 8;
        const x = Math.round(p.x - w / 2), y = Math.round(p.y - 6);
        if (x < -w || y < -12 || x > UW || y > UH) continue;
        ctx.fillStyle = PAL.k;
        ctx.fillRect(x, y, w, 11);
        ctx.fillStyle = game.gold >= price ? PAL.N : PAL.t;
        ctx.fillRect(x + 1, y + 1, w - 2, 9);
        drawText(ctx, tag, x + 4, y + 3, game.gold >= price ? PAL.y : PAL.s);
      }
    }
  }

  // Cave marker: a red "!" over the cave, pinned to the screen edge when the cave is off-screen.
  {
    const blink = Math.floor(time * 3) % 2 === 0;
    const sc = worldToScreen(CAVE.x + T / 2, CAVE.y + 4);
    const p = toUI(sc.x, sc.y);
    const x = Math.round(Math.max(4, Math.min(UW - 13, p.x - 4.5)));
    const y = Math.round(Math.max(HUD_H + 4, Math.min(UH - BAR_H - 15, p.y - 14)));
    ctx.fillStyle = PAL.k;
    ctx.fillRect(x, y, 9, 11);
    ctx.fillStyle = blink ? PAL.r : PAL.R;
    ctx.fillRect(x + 1, y + 1, 7, 9);
    drawText(ctx, '!', x + 3, y + 3, PAL.w);
  }

  // Top bar: resources on the left; builder or wave on the right.
  ctx.fillStyle = 'rgba(26,28,44,0.85)';
  ctx.fillRect(0, 0, UW, HUD_H);
  const h = house();
  if (phase === 'home') {
    let x = 6;
    for (const r of RES) {
      const t = `${RES_LETTER[r]} ${game[r]}`;
      drawText(ctx, t, x, 6, RES_COLOR[r]);
      x += textWidth(t) + 8;
    }
    const right = game.builder ? `BUILDER ${realTime((game.builder.until - now) / 1000)}` : 'BUILDER FREE';
    drawText(ctx, right, UW - 6 - textWidth(right), 6, game.builder ? PAL.y : PAL.s);
  } else {
    drawText(ctx, `G ${game.gold}`, 6, 6, PAL.y);
    const right = `WAVE ${run.wave}`;
    drawText(ctx, right, UW - 6 - textWidth(right), 6, PAL.w);
    // House health in the middle of the top bar.
    const bw = 40, bx = Math.round(UW / 2 - bw / 2);
    drawText(ctx, 'HOUSE', bx - 24, 6, PAL.s);
    ctx.fillStyle = PAL.t;
    ctx.fillRect(bx, 6, bw, 5);
    ctx.fillStyle = h.hp / maxHp(h) > 0.3 ? PAL.l : PAL.R;
    ctx.fillRect(bx, 6, Math.round((bw * h.hp) / maxHp(h)), 5);
  }

  // Zoom buttons, repair button, info panel
  drawButton(buttons.zoomIn);
  drawButton(buttons.zoomOut);
  if (showRepair()) drawButton(buttons.repair, `REPAIR ${repairCost()}G`, game.gold > 0 ? 'good' : 'off');
  if (showPanel()) drawInfoPanel(selected, now);

  // Bottom bar
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, UH - BAR_H, UW, BAR_H);
  let hint;
  if (movingHero) hint = 'TAP WHERE YOUR HERO SHOULD STAND GUARD';
  else if (phase === 'wave') hint = `WAVE ${run.wave} - ${battle.remaining} ZOMBIES LEFT`;
  else if (placingItem) hint = `TAP YOUR LAND TO PLACE ${BUILDINGS[placingItem.type].name.toUpperCase()}${placingItem.n > 1 ? ` (${placingItem.n} LEFT)` : ''}`;
  else if (placing) hint = `TAP YOUR LAND TO PLACE A ${BUILDINGS[placing].name.toUpperCase()}`;
  else if (phase === 'home' && !buildMode) hint = isKingWave(run.wave + 1) ? `WAVE ${run.wave + 1} IS A KING WAVE - GET READY` : `WAVE ${run.wave + 1} NEXT - BUILD, THEN START IT`;
  else if (buildMode && selected) hint = 'TAP GRASS TO MOVE IT HERE';
  else if (buildMode) hint = 'BUILD MODE - TAP A BUILDING TO MOVE IT';
  else hint = 'TAP A BUILDING - DRAG TO LOOK AROUND';
  centeredText(hint, UH - BAR_H + 4, phase === 'wave' ? PAL.R : placing ? PAL.y : PAL.s);
  if (phase === 'home') drawButton(buttons.left, buildMode || placingItem ? 'DONE' : 'BUILD', buildMode || placingItem ? 'good' : 'normal');
  else drawButton(buttons.left, `SPEED ${speed}X`);
  drawButton(buttons.home, buildMode ? 'ADD' : 'HOME', buildMode ? 'primary' : 'normal');
  if (phase === 'home') {
    const ready = !run.choices;
    const label = !ready ? 'PICK A CARD' : isKingWave(run.wave + 1) ? 'KING WAVE!' : 'START WAVE';
    drawButton(buttons.main, label, ready ? 'primary' : 'off');
  } else drawButton(buttons.main, 'SURVIVE...', 'off');

  if (phase === 'home' && !run.choices && !showPanel()) drawItems(); // the info panel covers it
  if (menuOpen) drawBuildMenu();
  if (shopOpen) drawShop();
  if (lookOpen) drawLook(time);
  if (run.choices && phase === 'home') drawCardPick();

  // The director's current goal, under the top bar (at home).
  const goal = GOALS[game.goal];
  if (goal && phase === 'home') {
    const reward = Object.entries(goal.reward).map(([k, v]) => `${v}${k === 'gems' ? ' GEMS' : RES_LETTER[k]}`).join(' ');
    const text = `GOAL: ${goal.text}  (+${reward})`;
    ctx.fillStyle = 'rgba(26,28,44,0.8)';
    ctx.fillRect(0, HUD_H, UW, 11);
    drawText(ctx, text, Math.max(4, Math.round((UW - textWidth(text)) / 2)), HUD_H + 3, PAL.y);
  }

  if (toast) {
    const w = textWidth(toast.text) + 12;
    const x = Math.round((UW - w) / 2), y = HUD_H + 14;
    ctx.fillStyle = PAL.k;
    ctx.fillRect(x, y, w, 13);
    drawText(ctx, toast.text, x + 6, y + 4, PAL.w);
  }

  if (offer || phase === 'end') {
    const b = buttons.popup;
    ctx.fillStyle = 'rgba(26,28,44,0.5)';
    ctx.fillRect(0, 0, UW, UH);
    panelBox(b);
    if (offer) {
      centeredText('BUY THIS LAND?', b.y + 8, PAL.w);
      centeredText(`COST ${price} GOLD`, b.y + 20, game.gold >= price ? PAL.y : PAL.R);
      drawButton(buttons.buy);
      drawButton(buttons.cancel);
    } else {
      centeredText('YOUR HOUSE FELL - GAME OVER', b.y + 6, PAL.R);
      centeredText(`YOU SURVIVED ${Math.max(0, run.wave - 1)} WAVES - ${run.kills} KILLS`, b.y + 16, PAL.w);
      centeredText(run.rank === 1 ? 'NEW BEST RUN!' : run.rank ? `TOP RUN NUMBER ${run.rank}!` : `GEMS +${run.gems}`, b.y + 26, PAL.y);
      drawButton(buttons.goHome, 'HOME');
    }
  }
  if (phase === 'title') drawTitle(time);
  if (runsOpen) drawTopRuns();
}

// ---------- Home screen ----------
// The game opens here: PLAY (carry on with your run, or start one) and TOP RUNS (your best runs ever).
let runsOpen = false;

function drawTitle(time) {
  ctx.fillStyle = 'rgba(26,28,44,0.72)';
  ctx.fillRect(0, 0, UW, UH);
  ctx.fillStyle = PAL.k; // cover the HUD and the bottom bar
  ctx.fillRect(0, 0, UW, HUD_H);
  ctx.fillRect(0, UH - BAR_H, UW, BAR_H);
  const y0 = Math.round(UH / 2) - 70;
  const bob = Math.floor(time * 2) % 2;
  centeredText('DEFENSE', y0 + bob, PAL.y, 3);
  centeredText('HOW LONG CAN YOU LAST?', y0 + 28, PAL.w);
  const best = game.records.runs[0];
  centeredText(best ? `BEST: ${best.waves} WAVES` : 'NO RUNS YET', y0 + 44, PAL.s);
  centeredText(run.wave > 0 ? `YOUR RUN: WAVE ${run.wave} - HOUSE LV ${houseLevel(game)}` : `LIFE ${game.records.lives}`, y0 + 56, PAL.l);
  drawButton(buttons.titlePlay, run.wave > 0 ? 'CONTINUE' : 'NEW RUN', 'primary');
  drawButton(buttons.titleRuns);
  centeredText('IF YOUR HOUSE FALLS, THE RUN IS OVER', UH - BAR_H + 16, PAL.s);
}

function drawTopRuns() {
  const m = buttons.menu;
  ctx.fillStyle = 'rgba(26,28,44,0.5)';
  ctx.fillRect(0, 0, UW, UH);
  panelBox(m);
  drawText(ctx, 'TOP RUNS', m.x + 6, m.y + 8, PAL.y);
  drawText(ctx, `LIVES ${game.records.lives}`, m.x + m.w - 6 - textWidth(`LIVES ${game.records.lives}`), m.y + 8, PAL.s);
  const runs = game.records.runs;
  if (!runs.length) centeredText('DIE ONCE AND YOUR RUN SHOWS UP HERE', m.y + 40, PAL.s);
  runs.forEach((r, i) => {
    const y = m.y + 22 + i * 13;
    const d = new Date(r.at);
    drawText(ctx, `${i + 1}.`, m.x + 6, y, i === 0 ? PAL.y : PAL.s);
    drawText(ctx, `WAVE ${r.waves}`, m.x + 26, y, PAL.w);
    drawText(ctx, `${r.kills} KILLS H${r.house} HERO${r.hero}  ${d.getMonth() + 1}/${d.getDate()}`, m.x + 70, y, PAL.s);
  });
  drawButton(buttons.menuClose);
}

// ---------- Loop ----------

// Hook for testing tools and the bot players.
window.defense = {
  get game() { return game; },
  get offer() { return offer; },
  get phase() { return phase; },
  get run() { return run; },
  get selected() { return selected; },
  battle,
  get villagers() { return villagers; },
  hero,
  get shopOpen() { return shopOpen; },
  get buildMode() { return buildMode; },
  setBuildMode: (on) => { if (phase === 'home') { buildMode = on; selected = null; placing = null; } },
  shopItems,
  closeShop: () => { shopOpen = null; },
  openShop,
  get lookOpen() { return lookOpen; },
  hireNpc, hireApplicant, rerollApplicants, rollApplicants,
  isManned: (b) => isManned(b),
  openLook: () => { lookOpen = true; },
  SHOPS,
  cam,
  worldToScreen,
  chunkCenterOnScreen: (cx, cy) => worldToScreen((cx + 0.5) * CHUNK * T, (cy + 0.5) * CHUNK * T),
  setSpeed: (s) => { speed = s; },
  startRun: () => phase === 'home' && startRun(),
  nextWave: () => phase === 'home' && nextWave(),
  afterEnd: () => phase === 'end' && afterEnd(),
  goHome: () => phase === 'end' && afterEnd(),
  repairAll,
  // Run cards.
  get cardChoices() { return run.choices; },
  pickCard,
  skipCard,
  rerollCards,
  autoPlace,
  // Preview art: set every building of a type to a level (1–10).
  setLevel: (type, level) => { for (const b of game.buildings) if (b.type === type) b.level = level; saveGame(); },
  // Economy, for tests and bots.
  upgrade: (b) => tryUpgrade(b),
  upgradeAllWalls,
  rushBuilder: () => { const b = rushBuilder(game, clock()); saveGame(); return b; },
  build: (type, c, r) => {
    const before = game.buildings.length;
    placing = type;
    placeNew(type, c, r);
    placing = null;
    return game.buildings.length > before;
  },
  // Pretend `hours` have passed for resource buildings (testing only).
  passHours: (hours) => { for (const b of game.buildings) if (b.since) b.since -= hours * 3_600_000; },
  // Buy the buyable plot nearest the House, if affordable. Returns true if something was bought.
  buyNextPlot: () => {
    if (game.gold < landPrice(game.bought)) return false;
    const h = house();
    const [hc, hr] = chunkOfTile(h.c + 1, h.r + 1);
    let best = null, bd = Infinity;
    for (let cy = LAND0; cy <= LAND1; cy++) {
      for (let cx = LAND0; cx <= LAND1; cx++) {
        const d = Math.hypot(cx - hc, cy - hr);
        if (canBuy(cx, cy) && d < bd) { bd = d; best = [cx, cy]; }
      }
    }
    if (!best) return false;
    buyLand(best);
    return true;
  },
  // Fresh game (used by the bot testers).
  resetGame: () => { newLife(); saveGame(); },
};

// Advance the game by dt seconds (at most 0.05 at a time, so nothing skips past anything).
function tick(dt) {
  if (phase !== 'end' && phase !== 'title') game.clock += dt * 1000 * TIME_SCALE;
  if (phase === 'wave') {
    for (let i = 0; i < speed; i++) battle.update(dt);
    if (battle.houseLost) endRun();
    else if (battle.cleared) waveCleared();
  }
  heroKeyStep();
  if (villagers.length !== game.npcs.length || villagers.some((v, i) => v.npc !== game.npcs[i])) syncNpcBodies();
  for (const v of villagers) npcThink(v, dt);
  heroThink(dt);
  for (const v of [hero, ...villagers, ...townsfolk]) if (!v.atPost) updateVillager(v, dt);
  checkGoals(dt);
  updatePet(dt);
  // Walk away from something and its panel closes (you have to be in reach to use it).
  // Camera follows the hero while they walk (until you drag the map).
  if (follow && !hero.inside) {
    const k = Math.min(1, dt * 6);
    cam.x += (hero.x + T / 2 - cam.x) * k;
    cam.y += (hero.y + T / 2 - cam.y) * k;
    clampCam();
  }
  // The builder only hands over finished work while you're home (no mid-fight House heals).
  const done = phase === 'home' ? finishBuilder(game, clock()) : null;
  if (done) {
    const p = centerOf(done);
    addPuff(p.x, p.y);
    showToast(`${BUILDINGS[done.type].name.toUpperCase()} REACHED LV ${done.level}!`);
    saveGame();
  }
  if (toast && (toast.time -= dt) <= 0) toast = null;
  puffs = puffs.filter((p) => (p.t += dt) < 0.5);
  floats = floats.filter((f) => (f.t += dt) < 0.9);
}

// Run the game faster than real time, for tests and bots.
window.defense.step = (seconds) => {
  for (let t = 0; t < seconds; t += 0.05) tick(0.05);
};

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt);
  render(now / 1000, dt);
  requestAnimationFrame(frame);
}
restoreRun(); // pick the run up where you left it (or start one)
phase = 'title'; // ...but open on the home screen
requestAnimationFrame(frame);

// Save when the app goes to the background, so timers and collections aren't lost.
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
