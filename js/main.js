import {
  SPRITES, PAL, PAL_RUNNER, PAL_BRUTE, PAL_KING, PAL_BREAKER, PAL_SWARM, PAL_TANK, PAL_FLASH,
  grassRows, dirtRows, furrowRows, waterRows, treeRows, shadowRows, hash,
  mountainRows, peakRows, oceanRows, dangerRows, deadTreeRows, meadowRows, bridgeRows,
} from './art.js';
import { wallRows, WALL_N, WALL_E, WALL_S, WALL_W } from './art-walls.js';
import { towerPalette, towerRows, TOWER_H, padRows } from './art-buildings.js';
import { THEMES, themeById, themePalette, decorRows } from './art-decor.js';
import { hasCardArt, cardRows } from './art-cards.js';
import { heroRows, heroPalette, HERO_DEFAULT, LOOK_PARTS } from './art-hero.js';
import { rowsToCanvas, drawText, textWidth } from './gfx.js';
import {
  T, CHUNK, CHUNKS, N, NR, WORLD, WORLD_H, WORLD_MAP, LAND0, LAND1, MAP_P0, MAP_P1, START_GOLD, landPrice, BOSS_EVERY, TOP_RUNS, BUILDINGS, waveBonus, killGold, sizeOf,
  hpFor, towerStats, upgradeCost, BUILD_COST,
  MAX_LEVEL, DECOR, CARDS, RARITY, rarityOdds, OMENS, gemsForRun, CARDS_SHOWN, PICKS, skipGold, FREE_REROLLS, rerollPrice,
  HERO_MAX_LEVEL, heroStats, heroUpgradeCost, HERO_PAD_HEAL, MONSTERS, waveList, mineGold,
} from './config.js';
import { villageRows, wellRows } from './art-village.js';
import {
  RES, countOf, canAfford, missing, formatCost, earn, buildBlock, build, upgradeBlock, upgrade,
} from './economy.js';
import { Battle } from './battle.js';

// ---------- World ----------
// The owner's valley (WORLD_MAP in config.js, 24×24 plots): zombie country to the north, a forest band, your
// 8×8 buyable land in the middle, mountains west, ocean east, a river with a bridge to the south, and the
// village (the open world) at the bottom.
// v2: there's no House. You're the last line of defense for the village: the zombies walk the path from their
// den all the way down to the bridge, and if ONE of them gets over it into the village, the run is over.
// You start with the four plots just above the bridge, with the path running through the middle of them.

// Your land starts at tile O (= plot LAND0). Positions below are written as O + their place in the land.
const O = LAND0 * CHUNK; // 48
const START_CHUNKS = [[LAND0 + 3, LAND1 - 1], [LAND0 + 4, LAND1 - 1], [LAND0 + 3, LAND1], [LAND0 + 4, LAND1]];
const START_TOP = (LAND1 - 1) * CHUNK; // 84: the top of your starting plots

// (Clamped, so wiggly borders near the world's edge keep the edge plot's ground.)
const plotType = (px, py) => WORLD_MAP[Math.max(0, Math.min(WORLD_MAP.length - 1, py))][Math.max(0, Math.min(WORLD_MAP[0].length - 1, px))];
const isLandPlot = (px, py) => px >= LAND0 && px <= LAND1 && py >= LAND0 && py <= LAND1;

// The river: runs east–west through the river band below your land (rows 96–107), from the mountains to the
// ocean, 3 tiles wide and gently winding. The path crosses it on a wooden bridge.
const RIVER_TOP = (LAND1 + 1) * CHUNK, RIVER_BOTTOM = RIVER_TOP + 2 * CHUNK - 1; // 96..107
const riverCentre = (c) => RIVER_TOP + 5.5 + 2.5 * Math.sin(c * 0.09);
const PATH_COLS = [O + 23, O + 24];        // the path runs straight down these two columns once it's out of the forest

// The zombie path: 2 tiles wide, from the zombies' den in the danger zone, winding down through the forest
// band, then straight down through your land to the bridge.
const WIGGLE_END = LAND0 * CHUNK;          // 48: from your land down, the path runs straight
const ROAD_TOP = 33;                       // a few tiles inside the danger zone (which ends at row 35)
const roadLeft = (r) => (r >= WIGGLE_END ? O + 23 : O + 23 + Math.round(1.4 * Math.sin((WIGGLE_END - 1 - r) * 0.45)));
const ROAD = new Set();
for (let r = ROAD_TOP; r < RIVER_TOP + 2 * CHUNK; r++) for (const c of [roadLeft(r), roadLeft(r) + 1]) ROAD.add(`${c},${r}`);
// The path stops at the river (the bridge carries it over) and its last bit is the village entrance.
const isRoad = (c, r) => ROAD.has(`${c},${r}`) && r < villageGateRow() && !isRiver(c, r);
// Only the forest stretch and the bridge approach are drawn as a dirt path. Across your land the zombies'
// default line is just grass (your walls decide where they really go), and it shows as a gap in the trees on
// the plots you haven't bought yet.
const isDirtPath = (c, r) => isRoad(c, r) && (r < LAND0 * CHUNK || r >= RIVER_TOP);
const DANGER_BOTTOM = 36;                  // rows above this are zombie country (you can't go there)

// The zombies' den sits at the top of the path, centred on its two tiles.
const CAVE = { x: roadLeft(ROAD_TOP) * T + T / 2, y: ROAD_TOP * T, c: roadLeft(ROAD_TOP), r: ROAD_TOP };
const isCave = (c, r) => r === ROAD_TOP && (c === CAVE.c || c === CAVE.c + 1);

// Ponds: none in sketch v2 (the river across the middle of your land took their place).
const PONDS = [{ cx: 84.5, cy: 110, rx: 2.6, ry: 1.4 }]; // the village duck pond, beside the tavern
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

const chunkKey = (cx, cy) => `${cx},${cy}`;
const chunkOfTile = (c, r) => [Math.floor(c / CHUNK), Math.floor(r / CHUNK)];

// The guard point: the middle of your starting land, on the path just above the bridge. Repairs and upgrades
// start nearest it, and the camera's home view centres on it.
const GUARD_POINT = { c: O + 23, r: START_TOP + 7 };

// Where the hero's pad starts: beside the path, so the hero shoots from the start without blocking it.
const HERO_START = { c: GUARD_POINT.c - 1, r: GUARD_POINT.r };
// Starting layout: an archer tower two tiles off each side of the path (so both cover both path columns), and
// the hero's pad. You also start with walls in your items (see newGame) to design the first defense yourself.
const DEFAULT_BUILDINGS = [
  { type: 'tower', c: O + 21, r: START_TOP + 4 },
  { type: 'tower', c: O + 26, r: START_TOP + 4 },
  { type: 'heropad', c: HERO_START.c, r: HERO_START.r },
];
const START_ITEMS = [{ type: 'wall', level: 1, n: 12 }];
// The current run (roguelike layer). Lives only in memory: it is never saved.
const run = {
  wave: 0, earned: 0, won: false,
  omen: OMENS[OMENS.length - 1], blessings: {}, rerolls: FREE_REROLLS, paidRerolls: 0,
  choices: null,   // card ids on offer (null where one was taken), or null when the pick is done
  picksLeft: 0,    // how many of the cards on offer you can still take
  pending: null,   // { type, left }: a picked card still to be placed
};

// Stonemason (a run blessing) makes walls 50% tougher for the rest of the run.
const isWallType = (t) => t === 'wall' || t === 'barricade';
// The hero's pad has the hero's health.
const maxHp = (b) => (b.type === 'heropad' ? heroStats(game.hero.level).hp
  : Math.round(hpFor(b.type, b.level || 1) * (isWallType(b.type) && run?.blessings?.stonemason ? 1.5 : 1)));
const isRunObject = (b) => !!BUILDINGS[b.type].run;

// ---------- Save ----------

const SAVE_KEY = 'defense.save.v5'; // v5 = the v2 design (no House, defend the village)
// Sandbox: the bot testers load the game with ?bots=1, which must never touch the real save.
const SANDBOX = new URLSearchParams(location.search).has('bots');
// The v1 save (the House design): v2 starts fresh but keeps what outlives a death (top runs, gems, art, look).
const V1_SAVE_KEY = 'defense.save.v4';

function newGame() {
  return {
    gold: START_GOLD,
    bought: 0,
    owned: START_CHUNKS.map(([x, y]) => chunkKey(x, y)),
    buildings: structuredClone(DEFAULT_BUILDINGS),
    items: structuredClone(START_ITEMS),
    theme: 'classic',
    gems: 0,
    ownedThemes: ['classic'],
    runState: null,
  };
}

// Fill in anything a save is missing.
function upgradeSave(s) {
  s.buildings = s.buildings.filter((b) => BUILDINGS[b.type]);
  // Gone from the game: hired people, the Tavern board, pets, the mayor's goals, the upgrade timer and clock.
  for (const k of ['npcs', 'nextNpc', 'applicants', 'pets', 'goalsDone', 'goal', 'builder', 'clock']) delete s[k];
  s.theme ??= 'classic';
  s.gems ??= 0;
  s.look ??= { ...HERO_DEFAULT };
  s.ownedThemes ??= ['classic'];
  if (!s.ownedThemes.includes(s.theme)) s.theme = 'classic'; // art packs must be owned
  s.nextId ??= 1;
  for (const b of s.buildings) {
    b.id ??= s.nextId++;
    b.level ??= 1;
    if (typeof b.hp !== 'number') b.hp = hpFor(b.type, b.level);
    if (b.type === 'tree' || BUILDINGS[b.type].decor) b.hp = hpFor(b.type, b.level); // safety net
  }
  s.stats ??= { bestWave: 0 };
  s.hero ??= { level: 1 }; // your hero (a mobile tower, standing on their pad)
  // Older saves had no pad: put one where the hero stood (or the start spot), on the nearest free tile of your land.
  if (!s.buildings.some((b) => b.type === 'heropad')) {
    const want = s.hero.post || HERO_START;
    const own = new Set(s.owned);
    const free = (c, r) => own.has(chunkKey(...chunkOfTile(c, r))) && !isWet(c, r)
      && !s.buildings.some((b) => c >= b.c && r >= b.r && c < b.c + sizeOf(b) && r < b.r + sizeOf(b));
    let spot = null;
    for (let d = 0; d < 12 && !spot; d++) {
      for (let r = want.r - d; r <= want.r + d && !spot; r++) for (let c = want.c - d; c <= want.c + d && !spot; c++) if (free(c, r)) spot = { c, r };
    }
    if (spot) s.buildings.push({ id: s.nextId++, type: 'heropad', c: spot.c, r: spot.r, level: 1, hp: heroStats(s.hero.level).hp });
  }
  delete s.hero.post;
  s.items ??= []; // your inventory: cards and buildings not on the map ({ type, level, n })
  s.runState ??= null; // the current run (saved, so you can close the app between waves)
  // Records outlive every death: lives played and your top runs (shown on the home screen).
  s.records ??= { lives: 1 };
  s.records.runs ??= [];
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
  const fresh = upgradeSave(newGame());
  const v1 = read(V1_SAVE_KEY);
  if (v1) {
    // Moving to v2: keep the things that outlive a death.
    if (v1.records) fresh.records = { lives: v1.records.lives || 1, runs: v1.records.runs || [] };
    fresh.gems = v1.gems || 0;
    if (Array.isArray(v1.ownedThemes)) fresh.ownedThemes = v1.ownedThemes;
    if (v1.look) fresh.look = v1.look;
  }
  return fresh;
}
// Everything saves, run cards and the current run included (roguelike: the run IS your life).
// Never during a wave (the save made as the wave starts is the one that counts: see nextWave) and never
// once the run is over (endRun has already written the wiped save; a background save would undo the death).
function saveGame(waveStarting = false) {
  if (SANDBOX || run.dead || phase === 'end' || (phase === 'wave' && !waveStarting)) return;
  // Trees and decorations are saved whole (nothing can repair them); everything else as it is.
  const healsFree = (b) => b.type === 'tree' || BUILDINGS[b.type].decor;
  const buildings = game.buildings
    .map((b) => ({ ...b, hp: healsFree(b) ? maxHp(b) : Math.min(b.hp, maxHp(b)) }));
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...game, buildings, runState: runSnapshot(waveStarting) })); } catch { /* storage unavailable */ }
}

// Settings that outlive runs and deaths (the wave speed you chose).
const PREFS_KEY = 'defense.prefs';
function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } }
function savePrefs(p) { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...p })); } catch { /* storage unavailable */ } }

let game = loadGame();
let owned = new Set(game.owned);

const ownsChunk = (cx, cy) => owned.has(chunkKey(cx, cy));
const ownsTile = (c, r) => ownsChunk(...chunkOfTile(c, r));
const covers = (b, c, r) => c >= b.c && r >= b.r && c < b.c + sizeOf(b) && r < b.r + sizeOf(b);
// Which building covers a tile: a map from tile to building, rebuilt whenever the buildings list changes
// length, a building is moved (layoutChanged), or a new game loads. Pathfinding and the wall joins ask this
// thousands of times a second, so it mustn't scan the list.
let tileIndex = new Map(), indexedGame = null, indexedLen = -1, layoutVersion = 0, indexedVersion = -1;
const layoutChanged = () => { layoutVersion++; };
function buildingAt(c, r) {
  if (indexedGame !== game || indexedLen !== game.buildings.length || indexedVersion !== layoutVersion) {
    tileIndex = new Map();
    for (const b of game.buildings) {
      const s = sizeOf(b);
      for (let rr = b.r; rr < b.r + s; rr++) for (let cc = b.c; cc < b.c + s; cc++) tileIndex.set(rr * N + cc, b);
    }
    indexedGame = game; indexedLen = game.buildings.length; indexedVersion = layoutVersion;
  }
  return tileIndex.get(r * N + c);
}
const inWorld = (c, r) => c >= 0 && r >= 0 && c < N && r < NR;

// Can a building of this size (b, or a new one of `type`) sit with its top-left corner at (c, r)?
// Needs your land and no other building.
function fits(b, c, r, size = sizeOf(b)) {
  for (let y = r; y < r + size; y++) {
    for (let x = c; x < c + size; x++) {
      if (!inWorld(x, y) || !ownsTile(x, y) || isWet(x, y)) return false;
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
// Two rivers (sketch v2): one across the middle of your land (plot rows 10-11) and one below it, in front of the
// village. The path crosses each on a wooden bridge.
const MID_RIVER_TOP = (LAND0 + 2) * CHUNK, MID_RIVER_BOTTOM = MID_RIVER_TOP + 2 * CHUNK - 1; // 60..71
const midRiverCentre = (c) => MID_RIVER_TOP + 5.5 + 2.6 * Math.sin(c * 0.13 + 1);
const isRiver = (c, r) => ground(c, r) !== 'ocean' && ((r >= RIVER_TOP && r <= RIVER_BOTTOM && c >= 34 && Math.abs(r - riverCentre(c)) <= 1.2)
  || (r >= MID_RIVER_TOP && r <= MID_RIVER_BOTTOM && Math.abs(r - midRiverCentre(c)) <= 1.2));
const isBridge = (c, r) => isRiver(c, r) && PATH_COLS.includes(c);
// Any water you can't walk on (ponds, river, mountain lakes). Ocean is separate.
const isWet = (c, r) => (isWater(c, r) || isRiver(c, r) || isMountainLake(c, r)) && !isBridge(c, r);
// The village entrance: the first path tile past the bridge, in each of the path's two columns.
// A zombie that steps onto it has got through: the run is over.
const gateRows = new Map();
function villageGateRow(c = PATH_COLS[0]) {
  if (!gateRows.has(c)) {
    let r = RIVER_TOP;
    while (r <= RIVER_BOTTOM && !isRiver(c, r)) r++;
    while (isRiver(c, r)) r++;
    gateRows.set(c, r);
  }
  return gateRows.get(c);
}
const isVillageGate = (c, r) => PATH_COLS.includes(c) && r === villageGateRow(c);

// ---------- The village ----------
// The bottom of the valley (sketch "B") is the village you're defending: never buyable, no forest. From the
// bridge, the village street runs down to the plaza.
// Ground: a market square around the well, a civic square the street flows into (the Town Hall stands in it),
// two lanes of cottages running east-west, and a ploughed field in the south-west. All in absolute tiles.
const PLAZA = { c0: 64, c1: 78, r0: 110, r1: 114 };   // the market square: the well sits in the middle (71,112)
const CIVIC = { c0: 66, c1: 76, r0: 126, r1: 132 };   // the civic square
const STREET_END = 126;                                // the street (cols 71-72) ends where the civic square begins
const LANES = [{ r: 119, c0: 47, c1: 86 }, { r: 124, c0: 53, c1: 81 }];   // Lane A and Lane B
const FIELD = { c0: 51, c1: 61, r0: 134, r1: 139 };   // the field inside the west fence
const inBox = (q, c, r) => c >= q.c0 && c <= q.c1 && r >= q.r0 && r <= q.r1;
const isTrail = (c, r) => PATH_COLS.includes(c) && r >= villageGateRow(c) && r < STREET_END;
const isLane = (c, r) => LANES.some((l) => r === l.r && c >= l.c0 && c <= l.c1);
const isPlaza = (c, r) => inBox(PLAZA, c, r) || inBox(CIVIC, c, r) || isLane(c, r);
const isField = (c, r) => inBox(FIELD, c, r);
const inVillage = (c, r) => ground(c, r) === 'open';
// The village is scenery: the thing you're protecting. Nothing in it can be used and you can't go there; these
// are its big buildings (w×h tiles; their pictures can stand taller than their footprint, doors on the bottom).
const LANDMARKS = [
  { id: 'store', name: 'General Store', c: 65, r: 108 },             // north edge of the market square...
  { id: 'petshop', name: 'Pet Shop', c: 68, r: 108 },
  { id: 'cottage', name: 'Old Smithy', v: 10, c: 74, r: 108 },       // ...east of the street: first past the bridge
  { id: 'tavern', name: 'Tavern', c: 77, r: 108 },                   // next to the duck pond
  { id: 'chapel', name: 'Chapel', c: 82, r: 115 },                   // in its churchyard, gate onto Lane A
  { id: 'townhall', name: 'Town Hall', c: 70, r: 127, w: 3, h: 3 }, // in the civic square
];
for (const s of LANDMARKS) { s.w ??= 2; s.h ??= 2; }
const WELL = { c: 71, r: 112 };
// The families you're protecting: five cottages on each lane, each with a fenced front garden.
const FAMILIES = ['MILLER', 'BAKER', 'FLETCHER', 'COOPER', 'THATCHER', 'POTTER', 'WEAVER', 'TANNER', 'MASON', 'CARTER'];
const HOMES = [
  [47, 116], [53, 116], [59, 116], [65, 116], [74, 116],   // Lane A (doors open onto row 119)
  [53, 121], [59, 121], [65, 121], [74, 121], [80, 121],   // Lane B (doors open onto row 124)
].map(([c, r], i) => ({ id: 'cottage', v: i, c, r, w: 2, h: 2, family: FAMILIES[i] }));
// One cottage's garden: flowers beside the house, a fence along the lane with the door column left open as the
// gate, and a post column on the garden's far side. Two of them hang out their washing instead.
const garden = (c, r, washing) => [
  ...(washing ? [{ id: 'washline', c: c + 2, r, w: 2, h: 1 }] : [{ id: 'flowerbed', v: (c + r) % 3, c: c + 2, r }, { id: 'flowerbed', v: (c + r + 1) % 3, c: c + 3, r }]),
  { id: 'flowerbed', v: (c + r + 2) % 3, c: c + 2, r: r + 1 }, { id: 'flowerbed', v: (c + r) % 3, c: c + 3, r: r + 1 },
  { id: 'fence', v: 'h', c, r: r + 2 }, { id: 'fence', v: 'h', c: c + 2, r: r + 2 }, { id: 'fence', v: 'h', c: c + 3, r: r + 2 },
  { id: 'fence', v: 'se', c: c + 4, r: r + 2 }, { id: 'fence', v: 'v', c: c + 4, r }, { id: 'fence', v: 'v', c: c + 4, r: r + 1 },
];
// A fenced box from (c0,r0) to (c1,r1), with gaps at the gates.
const fenceBox = (c0, r0, c1, r1, gates = []) => [
  { id: 'fence', v: 'nw', c: c0, r: r0 }, { id: 'fence', v: 'ne', c: c1, r: r0 }, { id: 'fence', v: 'sw', c: c0, r: r1 }, { id: 'fence', v: 'se', c: c1, r: r1 },
  ...Array.from({ length: c1 - c0 - 1 }, (_, i) => [{ id: 'fence', v: 'h', c: c0 + 1 + i, r: r0 }, { id: 'fence', v: 'h', c: c0 + 1 + i, r: r1 }]).flat(),
  ...Array.from({ length: r1 - r0 - 1 }, (_, i) => [{ id: 'fence', v: 'v', c: c0, r: r0 + 1 + i }, { id: 'fence', v: 'v', c: c1, r: r0 + 1 + i }]).flat(),
].filter((f) => !gates.some(([gc, gr]) => gc === f.c && gr === f.r));
// Everything else that makes it a village. Nothing sits on the street columns 71-72 or on a lane row.
const PROPS = [
  // The entrance, first thing after the bridge.
  { id: 'signpost', c: 70, r: 108 },
  { id: 'lamp', c: 70, r: 110 }, { id: 'lamp', c: 73, r: 110 },
  // The market square.
  { id: 'crates', c: 67, r: 110 }, { id: 'barrel', c: 76, r: 110 },
  { id: 'stall', v: 0, c: 65, r: 112, w: 2, h: 1 }, { id: 'stall', v: 1, c: 76, r: 112, w: 2, h: 1 },
  { id: 'bench', c: 68, r: 113 }, { id: 'bench', c: 74, r: 113 },
  { id: 'cart', c: 75, r: 114, w: 2, h: 1 },
  { id: 'lamp', c: 64, r: 114 }, { id: 'lamp', c: 78, r: 114 },
  // Street lamps on the grass between the squares and the lanes.
  { id: 'lamp', c: 70, r: 115 }, { id: 'lamp', c: 73, r: 115 }, { id: 'lamp', c: 70, r: 120 }, { id: 'lamp', c: 73, r: 120 },
  // The duck pond by the tavern (water tiles 83-86 × 109, 82-87 × 110, 83-86 × 111).
  { id: 'duck', c: 84, r: 110 }, { id: 'duck', c: 86, r: 111 },
  // Cottage gardens and fences.
  ...HOMES.flatMap((h, i) => garden(h.c, h.r, i === 2 || i === 8)),
  // The churchyard: a fence with a gate below the chapel door, gravestones and two yews.
  ...fenceBox(80, 113, 86, 118, [[83, 118]]),
  { id: 'gravestone', c: 81, r: 116 }, { id: 'gravestone', c: 81, r: 117 }, { id: 'gravestone', c: 85, r: 116 }, { id: 'gravestone', c: 85, r: 117 },
  { id: 'yew', c: 81, r: 114 }, { id: 'yew', c: 85, r: 114 },
  // The civic square around the Town Hall (door at 71,130; the mayor stands at 70,130).
  { id: 'lamp', c: 66, r: 126 }, { id: 'lamp', c: 76, r: 126 }, { id: 'lamp', c: 66, r: 132 }, { id: 'lamp', c: 76, r: 132 },
  { id: 'tubtree', c: 69, r: 130 }, { id: 'tubtree', c: 73, r: 130 },
  { id: 'bench', c: 67, r: 131 }, { id: 'bench', c: 75, r: 131 },
  // The wheat field (west) and the orchard (east) along the south edge; their north fences close the square.
  ...fenceBox(50, 133, 62, 140, [[56, 133]]),
  ...[52, 54, 56, 58, 60].flatMap((c) => [135, 137, 139].map((r) => ({ id: 'crop', c, r }))),
  { id: 'scarecrow', c: 56, r: 136 }, { id: 'hay', c: 51, r: 134 }, { id: 'hay', c: 52, r: 134 },
  { id: 'cart', c: 57, r: 132, w: 2, h: 1 },
  ...fenceBox(66, 133, 80, 140, [[71, 133]]),
  ...[68, 70, 72, 74, 76, 78].flatMap((c) => [135, 138].map((r) => ({ id: 'fruittree', c, r }))),
  // A dock and a boat on the ocean east of the square.
  { id: 'dock', c: 93, r: 112, w: 4, h: 1 }, { id: 'boat', c: 95, r: 114, w: 2, h: 1 },
].map((p) => ({ w: 1, h: 1, ...p }));
const covering = (list, c, r) => list.find((s) => c >= s.c && c < s.c + s.w && r >= s.r && r < s.r + s.h);
const landmarkAt = (c, r) => covering(LANDMARKS, c, r);
const homeAt = (c, r) => covering(HOMES, c, r);
// Tiles the townsfolk don't walk through: buildings, homes, props and the well.
const BLOCKED = new Set();
for (const s of [...LANDMARKS, ...HOMES, ...PROPS]) for (let r = s.r; r < s.r + s.h; r++) for (let c = s.c; c < s.c + s.w; c++) BLOCKED.add(r * N + c);
BLOCKED.add(WELL.r * N + WELL.c);
const villageBlocked = (c, r) => BLOCKED.has(r * N + c);
// Flat props get no shadow under them.
const FLAT_PROPS = new Set(['lamp', 'fence', 'flowerbed', 'crop', 'gravestone', 'duck', 'dock', 'boat', 'hay', 'bench']);
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
  && !(c >= 44 && c <= 96 && r >= 108 && r <= 141); // never inside the village (fields and orchard included)

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
  zombie: sprite('zombie'),
  runner: sprite('zombie', PAL_RUNNER),
  brute: sprite('zombie', PAL_BRUTE),
  king: sprite('zombie', PAL_KING),
  breaker: sprite('zombie', PAL_BREAKER),
  swarm: sprite('zombie', PAL_SWARM),
  tank: sprite('zombie', PAL_TANK),
};
// White versions for the hit flash.
const flashImg = {
  tree: rowsToCanvas(treeRows(), PAL_FLASH),
  zombie: sprite('zombie', PAL_FLASH),
  runner: sprite('zombie', PAL_FLASH),
  brute: sprite('zombie', PAL_FLASH),
  king: sprite('zombie', PAL_FLASH),
  breaker: sprite('zombie', PAL_FLASH),
  swarm: sprite('zombie', PAL_FLASH),
  tank: sprite('zombie', PAL_FLASH),
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
    else if (type === 'tower') { rows = towerRows(); pal = towerPalette(level); }
    else if (hasCardArt(type)) { rows = cardRows(type); pal = PAL; }
    else if (BUILDINGS[type].decor) rows = decorRows(type);
    else throw new Error(`no art for ${type}`);
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
  if (isDirtPath(c, r)) {
    const edges = edgesOf(c, r, (a, b) => isDirtPath(a, b) || isBridge(a, b));
    if (r === ROAD_TOP) edges.n = false;     // the path comes out of the den
    g.drawImage(tileImg('dirt', (c + r) % 4, edges, dirtRows), x, y);
  } else if (isBridge(c, r)) {
    g.drawImage(img.bridge[c === PATH_COLS[0] ? 'w' : 'e'], x, y);
  } else if (isWet(c, r)) {
    g.drawImage(tileImg('water', (c * 3 + r) % 4, edgesOf(c, r, (a, b) => isWet(a, b) || isBridge(a, b) || ground(a, b) === 'ocean'), waterRows), x, y);
  } else if (isField(c, r)) {
    g.drawImage(tileImg('furrow', (c + r) % 4, edgesOf(c, r, isField), furrowRows), x, y);
  } else if (isTrail(c, r) || isPlaza(c, r)) {
    const dirt = (a, b) => isTrail(a, b) || isPlaza(a, b) || isBridge(a, b);
    const edges = edgesOf(c, r, dirt);
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
      if (isDirtPath(c, r) || isTrail(c, r) || isPlaza(c, r) || isBridge(c, r)) col = '#c29a5b';
      else if (isField(c, r)) col = '#8d6a3a';
      else if (isWet(c, r)) col = '#41a6f6';
      else if (forestTree(c, r)) col = '#257179';
      else if (ground(c, r) === 'land' && !ownsTile(c, r) && !canBuy(...chunkOfTile(c, r))) col = '#2c7a52';
      g.fillStyle = col;
      g.fillRect(c * OVERVIEW_PX, r * OVERVIEW_PX, OVERVIEW_PX, OVERVIEW_PX);
    }
  }
}

// Where zombies may walk: the path, the bridges, the village gate and your land (never water). Depends only on
// the terrain and which plots you own, so it's worked out once here and read by the battle's flow field.
const WALK = new Uint8Array(N * NR);
function buildWalkable() {
  for (let r = 0; r < NR; r++) {
    for (let c = 0; c < N; c++) {
      WALK[r * N + c] = !isWet(c, r) && (isRoad(c, r) || isBridge(c, r) || isVillageGate(c, r) || ownsTile(c, r)) ? 1 : 0;
    }
  }
}

// Redraw the ground after the land changes (bought a plot, new game).
function buildTerrain() {
  plotCache.clear();
  buildOverview();
  buildWalkable();
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

// ---------- Walking (the townsfolk) ----------
// Breadth-first search over the tiles canStand allows. Returns the path to the first tile `isGoal` accepts
// (or, with pickRandom, to a random reachable tile within maxSteps).
function findPath(v, isGoal, maxSteps, pickRandom, canStand) {
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

// ---------- Your hero ----------
// The hero stands on their pad (a building, so zombies hunt it like a tower). Tap the pad for MOVE / UPGRADE / LOOK.
const hero = { isHero: true, x: HERO_START.c * T, y: HERO_START.r * T, t: 0, dir: 'down', down: false };
const heroArt = new Map();
const heroImg = (dir, frame) => personImg(game.look, dir, frame);
const heroPad = () => game.buildings.find((b) => b.type === 'heropad');
const padImg = rowsToCanvas(padRows());
// ---------- Village folk ----------
const inVillageFree = (c, r) => inVillage(c, r) && !villageBlocked(c, r);
// Townsfolk: everyday villagers going about their day (they hurry indoors when a wave starts).
const TOWNSFOLK_LOOKS = Array.from({ length: 10 }, (_, i) => {
  const pickPart = (k, salt) => LOOK_PARTS[k].options[(i * salt + k) % LOOK_PARTS[k].options.length];
  return { skin: pickPart(0, 3), hair: pickPart(1, 5), shirt: pickPart(2, 7), pants: pickPart(3, 2) };
});
const townsfolk = TOWNSFOLK_LOOKS.map((look, i) => ({
  look, x: (PLAZA.c0 + 1 + (i % 5) * 2) * T, y: (PLAZA.r0 + 1 + Math.floor(i / 5) * 2) * T, path: null, wait: 1 + i * 0.4,
  t: Math.random() * 5, dir: 'down',
  canStand: inVillageFree,
}));
const villageArt = new Map();
function villageImg(id, v = 0) {
  const key = `${id}:${v}`;
  if (!villageArt.has(key)) villageArt.set(key, rowsToCanvas(id === 'well' ? wellRows() : villageRows(id, v)));
  return villageArt.get(key);
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
function panKeys() {
  const code = [...heldKeys].pop();
  if (!code) return;
  const [dc, dr] = KEY_DIRS[code];
  cam.x += (dc * 6) / cam.z; cam.y += (dr * 6) / cam.z;
  clampCam();
}

// Townsfolk stroll a few tiles at a time, with a rest in between.
function pickTarget(v) {
  const path = findPath(v, null, 10, true, v.canStand);
  if (!path) { v.wait = 2; return; }
  v.path = path;
}

function updateTownsfolk(v, dt) {
  v.t += dt;
  v.moving = false;
  if (v.wait > 0) { v.wait -= dt; if (v.wait <= 0) pickTarget(v); return; }
  const next = v.path?.[0];
  if (!next) { v.wait = 1 + Math.random() * 3; return; }
  if (!v.canStand(next.c, next.r)) { v.path = null; v.wait = 0.5; return; }
  const tx = next.c * T, ty = next.r * T;
  const dx = tx - v.x, dy = ty - v.y;
  const d = Math.hypot(dx, dy);
  if (d > 0.5) v.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  const step = 14 * dt;
  v.moving = true;
  if (d <= step) {
    v.x = tx; v.y = ty;
    v.path.shift();
    if (!v.path.length) v.wait = 1 + Math.random() * 3;
    return;
  }
  v.x += (dx / d) * step;
  v.y += (dy / d) * step;
}


// ---------- Your hero: a mobile tower ----------
// Tap the pad for the hero's menu: MOVE (then tap where the pad should go - works mid-wave too), UPGRADE
// (between waves) and LOOK. The hero shoots any zombie in range. Zombies hunt the pad; while it's broken the
// hero is down. It heals over time (slowly during a wave, fast between waves, from rubble too).
let movingHero = false; // waiting for you to tap the pad's new spot

function moveHeroPad(c, r) {
  const pad = heroPad();
  if (!pad) return false;
  if (!ownsTile(c, r) || !fits(pad, c, r)) { showToast('PICK AN EMPTY SPOT ON YOUR LAND'); return false; }
  pad.c = c; pad.r = r;
  layoutChanged();
  if (battle.active) battle.flowDirty = true; // the zombies re-aim
  addPuff(c * T + T / 2, r * T + T / 2);
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
  const pad = heroPad();
  if (pad) pad.hp = maxHp(pad);
  addPuff(hero.x + T / 2, hero.y + T / 2);
  showToast(`HERO REACHED LV ${game.hero.level}!`);
}

// The pad heals over time: slowly during a wave (never once broken), ten times faster between waves.
function healPad(dt) {
  const pad = heroPad();
  if (!pad || (phase !== 'wave' && phase !== 'home')) return;
  const max = maxHp(pad);
  if (phase === 'wave') { if (pad.hp > 0) pad.hp = Math.min(max, pad.hp + HERO_PAD_HEAL * max * dt); } else pad.hp = Math.min(max, pad.hp + 10 * HERO_PAD_HEAL * max * dt);
}

function heroThink(dt) {
  const pad = heroPad();
  if (pad) { hero.x = pad.c * T; hero.y = pad.r * T; }
  hero.down = !pad || pad.hp <= 0;
  hero.t += dt;
  hero.swing = Math.max(0, (hero.swing || 0) - dt);
  hero.cd = (hero.cd || 0) - dt;
  if (hero.down || !battle.active) return;
  const f = heroStats(game.hero.level);
  const me = { x: hero.x + T / 2, y: hero.y + T / 2 };
  let foe = null, best = Infinity;
  for (const m of battle.monsters) {
    if (m.dead) continue;
    const d = Math.hypot(m.x - me.x, m.y - me.y);
    if (d < best) { best = d; foe = m; }
  }
  if (!foe || best > f.range * T || hero.cd > 0) return;
  hero.cd = f.rate;
  hero.swing = 0.2;
  const dx = foe.x - me.x, dy = foe.y - 4 - me.y, len = Math.hypot(dx, dy) || 1;
  hero.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  battle.shots.push({ x: me.x, y: me.y - 10, vx: dx / len, vy: dy / len, target: foe, def: { damage: f.damage }, kind: 'arrow', travelled: 0, hits: new Set() });
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
// The camera never shows past the map's edges (owner's sketch v2): zoomed all the way out, the map's width or its
// height fills the screen, whichever comes first.
const MAP_X0 = MAP_P0 * CHUNK * T, MAP_X1 = (MAP_P1 + 1) * CHUNK * T;
const minZ = () => Math.max(viewW / (MAP_X1 - MAP_X0), viewH / WORLD_H);

function clampCam() {
  cam.z = Math.max(minZ(), Math.min(MAX_Z, cam.z));
  const hw = viewW / 2 / cam.z, hh = viewH / 2 / cam.z;
  cam.x = Math.max(MAP_X0 + hw, Math.min(MAP_X1 - hw, cam.x));
  cam.y = Math.max(hh, Math.min(WORLD_H - hh, cam.y));
}

// The starting view: your starting land above the bridge (with the bridge and village edge in sight).
function homeView() {
  cam.x = (GUARD_POINT.c + 1) * T;
  cam.y = (RIVER_TOP + 1) * T;
  const area = (CHUNK * 2 + 8) * T;
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
  buttons.home = { x: 52, y: by, w: 44, h: 24, label: 'BASE' };  // back to your land (ADD in build mode)
  buttons.main = { x: 100, y: by, w: UW - 104, h: 24 }; // DEFEND! / NEXT WAVE
  buttons.repair = { x: UW - 80, y: UH - BAR_H - 24, w: 76, h: 20 }; // right side: clear of the ITEMS tab
  buttons.settings = { x: UW - 24, y: HUD_H + 6, w: 20, h: 20 };
  buttons.zoomIn = { x: UW - 24, y: HUD_H + 30, w: 20, h: 20, label: '+' };
  buttons.zoomOut = { x: UW - 24, y: HUD_H + 54, w: 20, h: 20, label: '-' };
  // Settings popup: CONTINUE, RESTART, TOP RUNS.
  const sw = 130, sh = 94, sx = Math.round((UW - sw) / 2), sy = Math.round((UH - sh) / 2);
  buttons.settingsBox = { x: sx, y: sy, w: sw, h: sh };
  buttons.setContinue = { x: sx + 10, y: sy + 18, w: sw - 20, h: 20, label: 'CONTINUE', primary: true };
  buttons.setRestart = { x: sx + 10, y: sy + 42, w: sw - 20, h: 20 };
  buttons.setRuns = { x: sx + 10, y: sy + 66, w: sw - 20, h: 20, label: 'TOP RUNS' };

  // Info panel for the selected building.
  const py0 = UH - BAR_H - PANEL_H - 2;
  buttons.panel = { x: 4, y: py0, w: UW - 8, h: PANEL_H };
  buttons.upgrade = { x: UW - 66, y: py0 + 4, w: 58, h: 18, label: 'UPGRADE', primary: true };
  buttons.upgradeAll = { x: UW - 66, y: py0 + 24, w: 58, h: 18, label: 'ALL WALLS' };
  // PUT AWAY: top right for things with no UPGRADE button (cards, decorations), else beside ALL WALLS.
  buttons.store = { x: UW - 128, y: py0 + 24, w: 58, h: 18, label: 'PUT AWAY' };
  buttons.storeTop = { x: UW - 66, y: py0 + 4, w: 58, h: 18, label: 'PUT AWAY' };

  // Build menu: three tabs (BUILD, LOOKS, PACKS), up to 7 rows each. Rows are 18 px tall: thumb-sized.
  const mw = Math.min(200, UW - 16), rowH = 22, top = 26, mh = top + 7 * rowH + 26;
  const mx = Math.round((UW - mw) / 2), my = Math.round((UH - mh) / 2);
  const rowY = (i) => my + top + i * rowH;
  buttons.menu = { x: mx, y: my, w: mw, h: mh, rowH };
  buttons.tabBuild = { x: mx + 4, y: my + 4, w: 44, h: 17, label: 'BUILD' };
  buttons.tabLooks = { x: mx + 51, y: my + 4, w: 44, h: 17, label: 'LOOKS' };
  buttons.tabStore = { x: mx + 98, y: my + 4, w: 44, h: 17, label: 'PACKS' };
  buttons.storeRows = THEMES.map((t, i) => ({ x: mx + mw - 46, y: rowY(i), w: 40, h: 18 }));
  buttons.menuRows = MENU.map((type, i) => ({ type, x: mx + mw - 46, y: rowY(i), w: 40, h: 18, label: 'BUY' }));
  buttons.themePrev = { x: mx + mw - 46, y: rowY(0), w: 19, h: 18, label: '<' };
  buttons.themeNext = { x: mx + mw - 25, y: rowY(0), w: 19, h: 18, label: '>' };
  buttons.decorRows = DECOR.map((type, i) => ({ type, x: mx + mw - 46, y: rowY(i + 1), w: 40, h: 18, label: 'BUY' }));
  buttons.menuClose = { x: mx + Math.round(mw / 2) - 30, y: my + mh - 22, w: 60, h: 18, label: 'CLOSE' };
  buttons.shopRows = [0, 1, 2, 3, 4, 5].map((i) => ({ x: mx + mw - 50, y: rowY(i), w: 44, h: 18 }));
  // "YOUR LOOK": a preview on the left, one row per body part with < swatch >.
  buttons.lookRows = LOOK_PARTS.map((_, i) => ({
    prev: { x: mx + mw - 74, y: rowY(i) + 8, w: 16, h: 18, label: '<' },
    swatch: { x: mx + mw - 54, y: rowY(i) + 8, w: 28, h: 18 },
    next: { x: mx + mw - 22, y: rowY(i) + 8, w: 16, h: 18, label: '>' },
  }));

  // Card pick: six cards in a 3×2 grid, then REROLL and SKIP.
  const cw = Math.min(210, UW - 12), cardW = Math.floor((cw - 8 - 2 * 3) / 3), cardH = 54, ch = 26 + 2 * cardH + 3 + 26;
  const cx0 = Math.round((UW - cw) / 2), cy0 = Math.max(HUD_H + 2, Math.round((UH - BAR_H - ch) / 2));
  buttons.cardBox = { x: cx0, y: cy0, w: cw, h: ch };
  buttons.cards = [0, 1, 2, 3, 4, 5].map((i) => ({ x: cx0 + 4 + (i % 3) * (cardW + 3), y: cy0 + 26 + Math.floor(i / 3) * (cardH + 3), w: cardW, h: cardH }));
  buttons.reroll = { x: cx0 + 4, y: cy0 + ch - 22, w: Math.floor(cw / 2) - 6, h: 18 };
  buttons.skip = { x: cx0 + Math.floor(cw / 2) + 2, y: cy0 + ch - 22, w: Math.floor(cw / 2) - 6, h: 18 };

  // Popups (buy land, run result).
  const pw = 150, ph = 64, px = Math.round((UW - pw) / 2), py = Math.round((UH - ph) / 2);
  buttons.popup = { x: px, y: py, w: pw, h: ph };
  buttons.buy = { x: px + 8, y: py + ph - 28, w: 64, h: 20, label: 'BUY', primary: true };
  buttons.cancel = { x: px + pw - 72, y: py + ph - 28, w: 64, h: 20, label: 'NO' };
  buttons.goHome = { x: px + 35, y: py + ph - 26, w: 80, h: 20, label: 'MENU', primary: true };

  // Home screen.
  const tx = Math.round(UW / 2 - 55), ty = Math.round(UH / 2);
  buttons.titlePlay = { x: tx, y: ty + 4, w: 110, h: 24, label: 'PLAY', primary: true };
  buttons.titleRuns = { x: tx, y: ty + 34, w: 110, h: 20, label: 'TOP RUNS' };
  buttons.titleInstall = { x: tx, y: ty + 60, w: 110, h: 20, label: 'INSTALL APP' };
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
// phase: 'title' (the home screen) -> 'home' (between waves: build, pick cards) -> 'wave' (fighting) -> 'home' ... -> 'end' (game over)

let phase = 'home';
let speed = Math.min(3, Math.max(1, loadPrefs().speed || 1)); // 1x/2x/3x, remembered across runs and lives
let fastForward = false; // true while the quiet stretch of a wave is being skipped at 3x

const battle = new Battle({
  buildings: () => game.buildings,
  maxHp,
  run: () => run,
  // Zombies walk the path, the bridge and your land (never water), hunting your towers; with none left, the
  // village entrance.
  walkable: (c, r) => inWorld(c, r) && WALK[r * N + c] === 1,
  goals: () => PATH_COLS.map((c) => ({ c, r: villageGateRow(c) })),
  onBreakthrough: (m) => { addPuff(m.x, m.y); showToast('A ZOMBIE GOT INTO THE VILLAGE!'); },
  cave: () => ({ c: CAVE.c, r: CAVE.r }),
  onKill: (m) => {
    // Zombies are your only income.
    const due = Math.round(killGold(m.def.gold, run.wave) * (run.omen.goldMul || 1));
    const gold = earn(game, 'gold', due);
    run.earned += gold;
    run.kills++;
    addPuff(m.x, m.y);
    if (gold) addFloat(`+${gold}`, m.x, m.y - 14);
  },
  onDestroyed: (b) => {
    const p = centerOf(b);
    addPuff(p.x, p.y);
    if (b.type === 'heropad') showToast('YOUR HERO IS DOWN UNTIL THE WAVE ENDS!');
    // A broken Gold Mine is gone for good (no rubble, no repair).
    if (BUILDINGS[b.type].noRepair) { game.buildings.splice(game.buildings.indexOf(b), 1); showToast(`THE ${BUILDINGS[b.type].name.toUpperCase()} WAS DESTROYED!`); }
  },
});

// ---------- Run cards ----------

// Draw `n` distinct cards for the coming wave, by rarity odds (and each card's weight within its rarity:
// wall packs come up often, but some hands still have none).
function drawCards(n, wave) {
  const odds = rarityOdds(run.omen.luck ? Math.min(10, wave + 3) : wave);
  const allowed = (id) => {
    const c = CARDS[id];
    if (c.kind !== 'blessing') return true;
    const have = run.blessings[id] || 0;
    return have < (c.stacks || 1);
  };
  const out = [];
  for (let tries = 0; out.length < n && tries < 400; tries++) {
    let roll = Math.random() * 100, rarity = RARITY[0];
    for (let i = 0; i < RARITY.length; i++) { if (roll < odds[i]) { rarity = RARITY[i]; break; } roll -= odds[i]; }
    const pool = Object.keys(CARDS).filter((id) => CARDS[id].rarity === rarity && allowed(id) && !out.includes(id));
    let w = Math.random() * pool.reduce((sum, id) => sum + (CARDS[id].weight || 1), 0);
    const got = pool.find((id) => (w -= CARDS[id].weight || 1) < 0);
    if (got) out.push(got);
  }
  return out;
}

// After every wave: six cards on offer, and you take two (three under the Thick Fog).
function offerCards() {
  run.choices = drawCards(CARDS_SHOWN, run.wave + 1);
  run.picksLeft = run.omen.picks || PICKS;
}

// One pick used (taken or skipped): when none are left, the pick is over.
function usePick() {
  if (--run.picksLeft <= 0 || run.choices.every((id) => !id)) { run.choices = null; run.picksLeft = 0; }
}

function pickCard(i) {
  const id = run.choices?.[i];
  if (!id) return;
  const card = CARDS[id];
  run.choices[i] = null;
  usePick();
  if (card.kind === 'blessing') { applyBlessing(id); return; }
  // Wall packs drop plain walls into your items (Runner Rush doubles walls and traps).
  const type = card.kind === 'walls' ? 'wall' : id;
  const n = card.kind === 'walls' ? card.count * (run.omen.pairs ? 2 : 1) : card.kind === 'trap' && run.omen.pairs ? 2 : 1;
  addItem(type, 1, n);
  selected = null;
  showToast(`${card.name.toUpperCase()} ADDED TO YOUR ITEMS`);
  saveGame();
}

// A run blessing (from a card): on until the run ends.
function applyBlessing(id) {
  run.blessings[id] = (run.blessings[id] || 0) + 1;
  if (id === 'stonemason') for (const b of game.buildings) if (isWallType(b.type) && b.hp > 0) b.hp = maxHp(b);
  showToast(`${CARDS[id].name.toUpperCase()}!`);
  saveGame();
}

// Skip one pick for gold (about a quarter of what the last wave brought in).
function skipCard() {
  if (!run.choices) return;
  usePick();
  const g = earn(game, 'gold', skipGold(run.wave));
  showToast(`SKIPPED +${g} GOLD`);
  saveGame();
}

// Redraw all six: free while you have free rerolls, then for gold (more each time this run).
const rerollCost = () => (run.rerolls > 0 ? null : rerollPrice(run.paidRerolls));
function rerollCards() {
  if (!run.choices) return false;
  const cost = rerollCost();
  if (cost && !canAfford(game, cost)) { showToast('NOT ENOUGH GOLD TO REROLL'); return false; }
  if (cost) { game.gold -= cost.gold; run.paidRerolls++; } else run.rerolls--;
  const left = run.picksLeft;
  offerCards();
  run.picksLeft = left;
  saveGame();
  return true;
}

// ---------- Items (your inventory) ----------
// Picked cards and buildings you've put away wait here until you place them. Pull the ITEMS bar up from
// above the bottom bar, slide through it, tap an item, then tap your land. Select a building and tap STORE
// to put it away (between waves, at full health). Stored things still count as yours.
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
  if (b.type === 'tree') { showToast("THAT CAN'T BE PUT AWAY"); return false; }
  if (b.hp < maxHp(b)) { showToast('FIX IT FIRST'); return false; }
  game.buildings.splice(game.buildings.indexOf(b), 1);
  addItem(b.type, b.level || 1);
  const p = centerOf(b);
  addPuff(p.x, p.y);
  selected = null;
  itemsOpen = true;
  showToast(`${BUILDINGS[b.type].name.toUpperCase()} PUT IN YOUR ITEMS`);
  saveGame();
  return true;
}
// Bots and tests: put the first run card in your items somewhere sensible. (Players place their own.)
// Traps go on the monsters' route; everything else near the guard point.
function autoPlace() {
  const it = game.items.find((i) => BUILDINGS[i.type].run);
  if (!it) return false;
  const type = it.type;
  const size = BUILDINGS[type].size || 1;
  battle.recomputeFlow();
  const hc = GUARD_POINT;
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
      if (BUILDINGS[type].trap) score = d < 3 ? Infinity : d + Math.random() * 2; // on the path, not right at the guard point
      else if (type === 'barricade') score = Math.abs(near - 5) + Math.random();
      else if (type === 'scarecrow') score = Math.abs(near - 4) + Math.random(); // close enough for the towers to cover it
      else if (CARDS[type]?.kind === 'tower') {
        // Towers go where they cover the most of the zombies' route (the playtest found AUTO put cannons
        // and braziers out of range when it only looked at distance to the base).
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
  let cur = { c: CAVE.c, r: CAVE.r };
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

// ---------- Runs & waves (the roguelike loop) ----------
// One life, endless waves: get as far as you can. Between waves there's no clock: take as long as you like to
// build and rearrange your defenses, then tap START WAVE. Each cleared wave brings a card and new faces at the
// Tavern; every BOSS_EVERY-th wave brings Kings. If one zombie gets into the village, the save is wiped and the
// run goes into your TOP RUNS (on the home screen).

// The run's state, as saved (run cards on the map save with the buildings).
function runSnapshot(inWave = false) {
  return {
    wave: run.wave, earned: run.earned, kills: run.kills, blessings: run.blessings, rerolls: run.rerolls,
    paidRerolls: run.paidRerolls, choices: run.choices, picksLeft: run.picksLeft, omen: OMENS.indexOf(run.omen), inWave,
  };
}
function restoreRun() {
  const r = game.runState;
  if (!r) return startRun();
  Object.assign(run, { kills: 0, paidRerolls: 0, ...r, omen: OMENS[r.omen] || OMENS[OMENS.length - 1] });
  delete run.inWave;
  // Older saves: one card out of three on offer, and cards that no longer exist.
  if (run.choices) {
    run.choices = run.choices.map((id) => (CARDS[id] ? id : null));
    run.picksLeft ??= 1;
    if (!run.choices.some(Boolean)) { run.choices = null; run.picksLeft = 0; }
  }
  phase = 'home';
  // The app was closed during a wave: that wave starts again from the state it began in.
  if (r.inWave) { run.wave = Math.max(0, run.wave - 1); showToast(`WAVE ${run.wave + 1} WAS CUT SHORT - IT STARTS AGAIN`); }
  // Older saves: a card waiting to be placed goes into your items.
  if (r.pending) { addItem(r.pending.type, 1, r.pending.left); delete run.pending; }
}

// A fresh run: wave 0, a new omen, no blessings.
function startRun() {
  resetUiState();
  run.wave = 0;
  run.earned = 0;
  run.kills = 0;
  run.dead = false;
  run.blessings = {};
  run.rerolls = FREE_REROLLS;
  run.paidRerolls = 0;
  run.omen = OMENS[Math.floor(Math.random() * OMENS.length)];
  battle.reset();
  phase = 'home';
  offerCards();
}

const isKingWave = (wave) => wave % BOSS_EVERY === 0;

// What the next wave brings, for the bottom bar: "WAVE 12: 27 ZOMBIES 12 RUNNERS 4 BRUTES" (short form when
// that's too wide for the screen).
const PREVIEW_NAMES = { zombie: ['ZOMBIE', 'ZOMBIES', 'Z'], runner: ['RUNNER', 'RUNNERS', 'R'], brute: ['BRUTE', 'BRUTES', 'B'],
  breaker: ['BREAKER', 'BREAKERS', 'WB'], swarm: ['SWARM', 'SWARM', 'S'], tank: ['TANK', 'TANKS', 'T'], king: ['KING', 'KINGS', 'K'] };
function wavePreview(wave) {
  const counts = {};
  for (const s of waveList(wave, run.omen)) counts[s.type] = (counts[s.type] || 0) + 1;
  const parts = Object.entries(counts);
  const long = `WAVE ${wave}: ${parts.map(([t, n]) => `${n} ${PREVIEW_NAMES[t][n > 1 ? 1 : 0]}`).join(' ')}`;
  if (textWidth(long) <= UW - 8) return long;
  return `WAVE ${wave}: ${parts.map(([t, n]) => `${n}${PREVIEW_NAMES[t][2]}`).join(' ')}`;
}

// START WAVE.
function nextWave() {
  if (run.choices) { showToast('PICK A CARD FIRST'); return; }
  run.wave++;
  resetUiState();
  saveGame(true); // the state the wave starts from: closing the app mid-wave comes back here
  phase = 'wave';
  battle.startWave(run.wave);
  const kings = run.wave / BOSS_EVERY;
  // A new kind of zombie's first wave gets its own warning.
  const debut = Object.values(MONSTERS).find((m) => m.debut === run.wave);
  showToast(debut ? `WAVE ${run.wave} - NEW: ${debut.name.toUpperCase()}!`
    : isKingWave(run.wave) ? (kings > 1 ? `WAVE ${run.wave} - ${kings} KINGS ARE COMING!` : `WAVE ${run.wave} - THE KING IS COMING!`) : `WAVE ${run.wave} - HERE THEY COME!`);
}

// Wave cleared: the clear bonus, each surviving Gold Mine's payout, and the next cards.
function waveCleared() {
  battle.active = false;
  const due = Math.round(waveBonus(run.wave) * (run.omen.bonusMul || 1));
  const bonus = earn(game, 'gold', due);
  run.earned += bonus;
  const mines = game.buildings.filter((b) => b.type === 'goldmine' && b.hp > 0).length;
  const mined = mines ? earn(game, 'gold', mines * mineGold(run.wave)) : 0;
  run.earned += mined;
  for (const b of game.buildings) if (b.type === 'goldmine' && b.hp > 0) { const p = centerOf(b); addFloat(`+${mineGold(run.wave)}`, p.x, p.y - 14); }
  game.stats.bestWave = Math.max(game.stats.bestWave, run.wave);
  for (const b of game.buildings) if (b.type === 'tree' || BUILDINGS[b.type].decor) b.hp = maxHp(b);
  phase = 'home';
  battle.endWave();
  offerCards();
  showToast(`WAVE ${run.wave} CLEARED! +${bonus}G${mined ? `  MINE +${mined}G` : ''}`);
  saveGame();
}

// A zombie got into the village: the run is over. It goes into your top runs, and the save is wiped right now (so reloading
// can't undo it). What survives: art, gems, your look and your records.
function endRun() {
  battle.active = false;
  run.choices = null;
  resetUiState();
  phase = 'end';
  run.dead = true;
  recordRun();
  if (!SANDBOX) {
    const next = upgradeSave(newGame());
    Object.assign(next, carryOver());
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }
}

// Put the run that just ended into your top runs (and pay its gems).
function recordRun() {
  const waves = Math.max(0, phase === 'home' ? run.wave : run.wave - 1); // waves fully survived
  run.gems = gemsForRun(waves);
  game.gems += run.gems;
  const entry = {
    waves, kills: run.kills, gold: run.earned, omen: run.omen.name, life: game.records.lives, at: Date.now(),
  };
  const runs = [...game.records.runs, entry].sort((a, b) => b.waves - a.waves || b.kills - a.kills);
  run.rank = runs.indexOf(entry) < TOP_RUNS ? runs.indexOf(entry) + 1 : 0;
  game.records.runs = runs.slice(0, TOP_RUNS);
}

// What outlives you: cosmetics and records, nothing that makes the next life easier.
const carryOver = (newLifeToo = true) => ({
  gems: game.gems, ownedThemes: game.ownedThemes, theme: game.theme, look: game.look,
  records: { ...game.records, lives: game.records.lives + (newLifeToo ? 1 : 0) },
});

// Everything the UI remembers about the old game: cleared whenever a run starts or ends.
function resetUiState() {
  selected = null; placing = null; placingItem = null; itemsOpen = false; itemsScroll = 0; multi = [];
  buildMode = false; movingHero = false; menuOpen = false; heroOpen = false; lookOpen = false; offer = null;
}

// After the game-over screen: a brand new life, starting at the home screen.
function afterEnd() {
  if (updateReady) { location.reload(); return; } // a new version is waiting; it opens on the menu
  const keep = carryOver();
  newLife();
  Object.assign(game, keep);
  saveGame();
  phase = 'title';
}
// Start a brand new game in memory (the old one is gone).
function newLife() {
  game = upgradeSave(newGame());
  owned = new Set(game.owned);
  battle.reset();
  startRun();
  buildTerrain();
  homeView();
}

// Gold to fix a building back to full health (from rubble: the whole repair price). The hero's pad heals itself.
const repairCostOf = (b) => Math.ceil((1 - b.hp / maxHp(b)) * BUILDINGS[b.type].repair * 1.5 ** ((b.level || 1) - 1));
const repairCost = () => game.buildings.reduce((sum, b) => sum + repairCostOf(b), 0);

// Repair as much as you can afford, nearest the guard point first.
function repairAll() {
  const h = GUARD_POINT;
  const order = game.buildings.filter((b) => repairCostOf(b) > 0)
    .sort((a, b) => Math.hypot(a.c - h.c, a.r - h.r) - Math.hypot(b.c - h.c, b.r - h.r));
  let fixed = 0;
  for (const b of order) {
    const cost = repairCostOf(b);
    if (cost > game.gold) continue;
    game.gold -= cost;
    b.hp = maxHp(b);
    fixed++;
    const p = centerOf(b);
    addPuff(p.x, p.y);
  }
  saveGame();
  showToast(fixed ? (repairCost() ? 'REPAIRED WHAT YOU COULD AFFORD' : 'ALL REPAIRED!') : 'NOT ENOUGH GOLD');
}

// Repair one building (from its panel).
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

// Clear rubble away for free: the tiles are free again (and what stood there is gone).
function clearRubble(b) {
  if (b.hp > 0 || b.type === 'heropad' || !game.buildings.includes(b)) return;
  game.buildings.splice(game.buildings.indexOf(b), 1);
  const p = centerOf(b);
  addPuff(p.x, p.y);
  selected = null;
  showToast('CLEARED');
  saveGame();
}

// ---------- Building & upgrading ----------

let selected = null;  // building tapped (info panel; tap grass to move it)
let placing = null;   // type being placed from the build menu
let menuOpen = false;
let menuTab = 'build'; // 'build' | 'looks' | 'packs'
// Build mode (between waves only): drag buildings around, select lines of walls, and ADD new things.
let buildMode = false;
let offer = null;    // plot the buy popup is asking about: [cx, cy]
let toast = null;     // { text, time }

function showToast(text) { toast = { text, time: 2.2 }; }

function tryUpgrade(b) {
  const block = upgradeBlock(game, b);
  if (block) { showToast(block); return false; }
  upgrade(game, b);
  const p = centerOf(b);
  addPuff(p.x, p.y);
  showToast(`${BUILDINGS[b.type].name.toUpperCase()} NOW LV ${b.level}`);
  saveGame();
  return true;
}

// Upgrade every wall at this level that you can afford, nearest the guard point first.
function upgradeAllWalls(level) {
  const h = GUARD_POINT;
  const walls = game.buildings
    .filter((b) => b.type === 'wall' && b.level === level && b.hp > 0)
    .sort((a, b) => Math.hypot(a.c - h.c, a.r - h.r) - Math.hypot(b.c - h.c, b.r - h.r));
  let n = 0;
  for (const w of walls) {
    if (upgradeBlock(game, w)) break;
    upgrade(game, w);
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
  const b = build(game, type, c - half, r - half);
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

// ---------- The hero's menu (tap the pad) ----------
let heroOpen = false;

function heroMenu() {
  const lvl = game.hero.level, st = heroStats(lvl), max = lvl >= HERO_MAX_LEVEL;
  const cost = heroUpgradeCost(lvl), pad = heroPad();
  return [
    { title: 'MOVE THE HERO PAD', sub: 'THEN TAP A SPOT - EVEN MID-WAVE', label: 'MOVE', style: 'primary',
      act: () => { movingHero = true; heroOpen = false; showToast('TAP WHERE THE HERO PAD SHOULD GO'); } },
    { title: `HP ${st.hp}  DMG ${Math.round(st.damage)}  RANGE ${st.range}`,
      sub: max ? 'MAX LEVEL' : `NEXT LEVEL ${formatCost(cost)}`,
      label: max ? 'MAX' : 'UPGRADE', style: !max && canAfford(game, cost) && phase === 'home' ? 'primary' : 'off', act: upgradeHero },
    { title: 'YOUR LOOK', sub: 'HAIR, SKIN, SHIRT AND PANTS', label: 'CHANGE', style: 'normal',
      act: () => { heroOpen = false; lookOpen = true; } },
    { title: pad ? `PAD ${Math.ceil(pad.hp)}/${maxHp(pad)}` : 'NO PAD', sub: 'ZOMBIES HUNT IT. IT HEALS ITSELF', label: 'INFO', style: 'off', act: () => {} },
  ];
}

function onHeroTap(p) {
  const rows = heroMenu();
  const i = buttons.shopRows.findIndex((b, k) => k < rows.length && inRect(p, b));
  if (i >= 0) { rows[i].act(); saveGame(); return; }
  if (inRect(p, buttons.menuClose) || !inRect(p, buttons.menu)) heroOpen = false;
}
function onWorldTap(sx, sy) {
  const w = screenToWorld(sx, sy);
  const c = Math.floor(w.x / T), r = Math.floor(w.y / T);
  if (!inWorld(c, r)) return;
  if (multi.length) { multi = []; return; } // tapping the map lets go of a wall selection
  if (isCave(c, r)) { selected = null; showToast('ZOMBIES COME OUT OF THIS DEN'); return; }
  // After MOVE, the next tap picks the hero pad's new spot.
  if (movingHero) { movingHero = false; moveHeroPad(c, r); return; }
  // The hero's pad: tap it for the hero's menu (mid-wave too).
  if (!buildMode && !placing && !placingItem && buildingAt(c, r)?.type === 'heropad') { selected = null; heroOpen = true; return; }
  if (phase === 'wave') { showToast('TAP THE HERO PAD TO MOVE YOUR HERO'); return; }
  // The wild parts of the valley: say what they are.
  const gr = ground(c, r);
  if (!isRoad(c, r) && !isTrail(c, r) && !isBridge(c, r) && !isPlaza(c, r)) {
    if (r < DANGER_BOTTOM) { showToast('ZOMBIE COUNTRY - THEY COME FROM UP HERE'); return; }
    if (gr === 'mountain' || gr === 'stream') { showToast('THE MOUNTAINS - NOTHING GETS OVER THEM'); return; }
    if (gr === 'ocean') { showToast('THE OCEAN'); return; }
    if (isRiver(c, r)) { showToast('THE RIVER - ZOMBIES CROSS AT THE BRIDGE'); return; }
    if (gr === 'forest' || gr === 'riverband') { showToast('DEEP FOREST - ONLY ZOMBIES GO IN THERE'); return; }
  }
  // The village: scenery (the thing you protect). Tapping it just says what it is.
  if (inVillage(c, r) || isTrail(c, r) || isBridge(c, r) || isPlaza(c, r)) {
    selected = null;
    const lm = landmarkAt(c, r), home = homeAt(c, r);
    if (lm) showToast(`THE ${lm.name.toUpperCase()} - KEEP THE VILLAGE SAFE`);
    else if (home) showToast(`THE ${home.family} FAMILY LIVES HERE - KEEP THEM SAFE`);
    else if (c === WELL.c && r === WELL.r) showToast('THE VILLAGE WELL');
    else if (isBridge(c, r) && r >= RIVER_TOP) showToast('IF ONE ZOMBIE CROSSES THIS BRIDGE, IT IS OVER');
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

  if (isRoad(c, r) && !ownsChunk(cx, cy) && !selected) { showToast('THE ZOMBIES COME THIS WAY'); return; }
  if (!ownsChunk(cx, cy)) {
    if (selected) { selected = null; return; }
    if (phase !== 'home') showToast('BUY LAND BETWEEN WAVES');
    else if (canBuy(cx, cy)) offer = [cx, cy];
    else showToast('YOU CAN ONLY BUY LAND NEXT TO YOURS');
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
      layoutChanged();
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
const showRepair = () => phase === 'home' && !buildMode && !itemsOpen && !showPanel() && !multi.length && repairCost() > 0;
// Anything standing but trees and the hero's pad can be put away in your items (between waves).
const canStore = (b) => phase === 'home' && b && b.type !== 'tree' && b.type !== 'heropad' && b.hp > 0;
const storeButton = (b) => (BUILDINGS[b.type].run || BUILDINGS[b.type].decor ? buttons.storeTop : buttons.store);

// Is this screen point on top of a UI element (so it shouldn't pan the map)?
function onUI(sx, sy) {
  const p = toUI(sx, sy);
  if (offer || menuOpen || heroOpen || lookOpen || runsOpen || settingsOpen || phase === 'end' || phase === 'title' || run.choices) return true;
  if (inRect(p, buttons.settings)) return true;
  if (showMulti() && inRect(p, buttons.panel)) return true;
  if (phase === 'home' && !showPanel() && !showMulti()) { const { bar, tab } = itemsLayout(); if (inRect(p, tab) || (itemsOpen && inRect(p, bar))) return true; }
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
    showToast(`NEED ${theme.price - game.gems} MORE GEMS - SURVIVE WAVES TO EARN THEM`);
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
  if (inRect(p, buttons.menuClose) || !inRect(p, buttons.menu)) menuOpen = false;
}

function onTap(sx, sy) {
  const p = toUI(sx, sy);
  if (runsOpen) {
    if (inRect(p, buttons.menuClose) || !inRect(p, buttons.menu)) runsOpen = false;
    return;
  }
  if (settingsOpen) return onSettingsTap(p);
  if (phase === 'title') {
    if (inRect(p, buttons.titlePlay)) { phase = 'home'; homeView(); }
    else if (inRect(p, buttons.titleRuns)) runsOpen = true;
    else if (installPrompt && inRect(p, buttons.titleInstall)) { installPrompt.prompt(); installPrompt = null; }
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
  if (heroOpen) return onHeroTap(p);
  if (lookOpen) return onLookTap(p);
  if (inRect(p, buttons.settings)) { settingsOpen = true; restartTaps = 0; return; } // works during the card pick too
  if (run.choices) {
    const i = buttons.cards.findIndex((b, k) => k < run.choices.length && run.choices[k] && inRect(p, b));
    if (i >= 0) return pickCard(i);
    if (inRect(p, buttons.reroll)) return rerollCards();
    if (inRect(p, buttons.skip)) return skipCard();
    return;
  }
  if (inRect(p, buttons.zoomIn)) return zoomAt(viewW / 2, viewH / 2, cam.z * 1.5);
  if (inRect(p, buttons.zoomOut)) return zoomAt(viewW / 2, viewH / 2, cam.z / 1.5);
  // The ITEMS tab and bar.
  if (showMulti() && inRect(p, buttons.panel)) {
    if (inRect(p, buttons.upgrade)) upgradeMulti();
    else if (inRect(p, buttons.store)) storeMulti();
    return;
  }
  if (phase === 'home' && !showPanel() && !showMulti()) {
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
    // Rubble: REPAIR (gold) or CLEAR (free).
    if (selected.hp <= 0) {
      if (buildMode || phase !== 'home') return;
      if (inRect(p, buttons.upgrade) && repairCostOf(selected) > 0) repairOne(selected);
      else if (inRect(p, buttons.store)) clearRubble(selected);
      return;
    }
    const def = BUILDINGS[selected.type];
    // A damaged card tower: FIX sits where its PUT AWAY button would be.
    if (def.run && !buildMode && phase === 'home' && repairCostOf(selected) > 0) { if (inRect(p, buttons.upgrade)) repairOne(selected); return; }
    if (canStore(selected) && inRect(p, storeButton(selected))) return storeBuilding(selected);
    // Only the buttons the panel actually draws respond (none in build mode).
    if (buildMode) return;
    if (def.run || def.decor || selected.type === 'tree') return;
    if (phase === 'home' && inRect(p, buttons.upgrade) && repairCostOf(selected) > 0) repairOne(selected);
    else if (phase === 'home' && inRect(p, buttons.upgrade)) tryUpgrade(selected);
    else if (phase === 'home' && selected.type === 'wall' && inRect(p, buttons.upgradeAll)) upgradeAllWalls(selected.level);
    else if (phase !== 'home' && (inRect(p, buttons.upgrade) || inRect(p, buttons.upgradeAll))) showToast('UPGRADE BETWEEN WAVES');
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
      savePrefs({ speed });
      return;
    }
    // BUILD toggles build mode (home only). While placing, DONE first stops placing.
    if (placing) { placing = null; return; }
    buildMode = !buildMode;
    selected = null;
    showToast(buildMode ? 'DRAG BUILDINGS TO MOVE THEM - ADD FOR NEW' : 'BUILD MODE OFF');
    return;
  }
  if (p.y < HUD_H || p.y >= UH - BAR_H) return;
  onWorldTap(sx, sy);
}

// ---------- Dragging on the map: move buildings, lay and select lines of walls ----------
// Between waves:
//   placing walls (from ITEMS or the build menu): drag to lay a straight line of them;
//   BUILD mode, press on a wall and drag: highlight a straight line of walls (then UPGRADE ALL or STORE ALL);
//   BUILD mode, press on any other building and drag: move it (a ghost shows where it'll go).
// Any other drag pans the camera, and a tap is still a tap.
let multi = [];   // walls highlighted with a line select
const tileAt = (sx, sy) => { const w = screenToWorld(sx, sy); return { c: Math.floor(w.x / T), r: Math.floor(w.y / T) }; };
const placingWalls = () => (placingItem && isWallType(placingItem.type)) || placing === 'wall';

function startEdit(sx, sy) {
  if (phase !== 'home') return null;
  const t = tileAt(sx, sy);
  if (placingWalls()) return { mode: 'line', from: t, to: t };
  if (!buildMode) return null;
  const b = buildingAt(t.c, t.r);
  if (!b || b.type === 'tree') return null;
  if (isWallType(b.type)) return { mode: 'select', from: t, to: t };
  return { mode: 'move', from: t, to: t, b, dc: t.c - b.c, dr: t.r - b.r };
}

// A straight line of tiles from a to b, along whichever way the drag went further.
function lineTiles(a, b) {
  const out = [];
  if (Math.abs(b.c - a.c) >= Math.abs(b.r - a.r)) {
    const s = Math.sign(b.c - a.c) || 1;
    for (let c = a.c; c !== b.c + s; c += s) out.push({ c, r: a.r });
  } else {
    const s = Math.sign(b.r - a.r);
    for (let r = a.r; r !== b.r + s; r += s) out.push({ c: a.c, r });
  }
  return out;
}
const lineSpotOk = (t) => ownsTile(t.c, t.r) && fits(null, t.c, t.r, 1);

function finishEdit(e) {
  if (e.mode === 'line') {
    let n = 0;
    for (const t of lineTiles(e.from, e.to)) {
      if (!lineSpotOk(t)) continue;
      if (placingItem) {
        if (placeItem(placingItem, t.c, t.r)) n++;
        if (!placingItem) break;   // ran out
      } else {
        if (buildBlock(game, 'wall')) break; // out of gold
        const b = build(game, 'wall', t.c, t.r);
        const p = centerOf(b);
        addPuff(p.x, p.y);
        n++;
      }
    }
    showToast(n ? `PLACED ${n} WALL${n > 1 ? 'S' : ''}` : !placingItem && buildBlock(game, 'wall') ? 'NOT ENOUGH GOLD' : 'NO ROOM THERE');
  } else if (e.mode === 'select') {
    multi = [...new Set(lineTiles(e.from, e.to).map((t) => buildingAt(t.c, t.r)).filter((b) => b && isWallType(b.type)))];
    selected = null;
    itemsOpen = false;
  } else if (e.mode === 'move') {
    const b = e.b, nc = e.to.c - e.dc, nr = e.to.r - e.dr;
    if (fits(b, nc, nr)) {
      b.c = nc; b.r = nr;
      layoutChanged();
      const p = centerOf(b);
      addPuff(p.x, p.y);
      selected = null;
    } else showToast('NOT ENOUGH ROOM THERE');
  }
  saveGame();
}

// The preview while dragging: green tiles where things will go, red where they can't.
function drawEditGhost(e) {
  const box = (c, r, w, h, ok) => {
    ctx.fillStyle = ok ? 'rgba(167,240,112,0.45)' : 'rgba(239,125,87,0.5)';
    ctx.fillRect(c * T, r * T, w * T, h * T);
    ctx.fillStyle = ok ? PAL.l : PAL.R;
    ctx.fillRect(c * T, r * T, w * T, 1); ctx.fillRect(c * T, (r + h) * T - 1, w * T, 1);
    ctx.fillRect(c * T, r * T, 1, h * T); ctx.fillRect((c + w) * T - 1, r * T, 1, h * T);
  };
  if (e.mode === 'line') {
    let left = placingItem ? placingItem.n : Math.floor(game.gold / BUILD_COST.wall.gold);
    for (const t of lineTiles(e.from, e.to)) { const ok = lineSpotOk(t) && left > 0; if (ok) left--; box(t.c, t.r, 1, 1, ok); }
  } else if (e.mode === 'select') {
    for (const t of lineTiles(e.from, e.to)) { const b = buildingAt(t.c, t.r); box(t.c, t.r, 1, 1, !!b && isWallType(b.type)); }
  } else if (e.mode === 'move') {
    const s = sizeOf(e.b), nc = e.to.c - e.dc, nr = e.to.r - e.dr;
    box(nc, nr, s, s, fits(e.b, nc, nr));
  }
}

// The walls you highlighted: upgrade them all, or put them all away.
const showMulti = () => multi.length > 0 && phase === 'home';
function upgradeMulti() {
  let n = 0;
  let why = null;
  for (const w of [...multi].sort((a, b) => a.level - b.level)) {
    const block = upgradeBlock(game, w);
    if (block) { why ??= block; continue; }
    upgrade(game, w);
    n++;
  }
  showToast(n ? `UPGRADED ${n} WALLS` : why || 'NOTHING TO UPGRADE');
  saveGame();
}
function storeMulti() {
  let n = 0;
  for (const w of multi) {
    if (w.hp < maxHp(w) || !game.buildings.includes(w)) continue;
    game.buildings.splice(game.buildings.indexOf(w), 1);
    addItem(w.type, w.level || 1);
    n++;
  }
  multi = [];
  showToast(n ? `${n} WALLS PUT IN YOUR ITEMS` : 'FIX THEM FIRST');
  saveGame();
}
function drawMultiPanel() {
  const box = buttons.panel;
  panelBox(box);
  const x = box.x + 5, y = box.y + 5;
  drawText(ctx, `${multi.length} WALL${multi.length > 1 ? 'S' : ''} SELECTED`, x, y, PAL.w);
  const cost = multi.reduce((sum, w) => sum + (upgradeCost(w.type, w.level || 1)?.gold || 0), 0);
  drawText(ctx, `UPGRADE ALL: ${cost}G`, x, y + 12, game.gold >= cost ? PAL.y : PAL.R);
  drawText(ctx, 'TAP THE MAP TO DESELECT', x, y + 24, PAL.S);
  drawButton(buttons.upgrade, 'UPGRADE ALL', 'primary');
  drawButton(buttons.store, 'PUT ALL AWAY', 'normal');
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
    const ui = onUI(e.clientX, e.clientY);
    drag = { sx: e.clientX, sy: e.clientY, camX: cam.x, camY: cam.y, moved: false, ui, bar: onBar, scroll0: itemsScroll,
      edit: ui ? null : startEdit(e.clientX, e.clientY) };
  } else if (pointers.size === 2) {
    const m = midpoint();
    pinch = { d0: Math.max(1, m.d), z0: cam.z, mid: m };
    if (drag) { drag.moved = true; drag.edit = null; } // a pinch is never a tap (or a drag-edit)
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
    if (!drag.moved && Math.hypot(dx, dy) > 8) drag.moved = true;
    if (drag.moved && drag.bar) {
      // Sliding the ITEMS bar.
      const max = Math.max(0, game.items.length * (ITEM_SLOT + ITEM_GAP) + 8 - UW);
      itemsScroll = Math.max(0, Math.min(max, drag.scroll0 - (dx * dpr) / ui));
    }
    if (drag.moved && drag.edit) drag.edit.to = tileAt(e.clientX, e.clientY);
    else if (drag.moved && !drag.ui) {
      cam.x = drag.camX - dx / cam.z;
      cam.y = drag.camY - dy / cam.z;
      clampCam();
    }
  }
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  if (drag?.edit && drag.moved && pointers.size === 1 && e.type === 'pointerup') finishEdit(drag.edit);
  else if (drag && !drag.moved && pointers.size === 1 && e.type === 'pointerup') onTap(e.clientX, e.clientY);
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
  const s = b.h >= 24 && textWidth(label, 2) <= b.w - 8 ? 2 : 1;
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
  if (b.type === 'heropad') {
    ctx.drawImage(padImg, x, y);
  } else if (isWallType(b.type)) {
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
    }
    else ctx.drawImage(levelImg(b.type, b.level || 1, 0, flashing), x, y);
  }
  if (b.hp < maxHp(b) && b.type !== 'tree' && !BUILDINGS[b.type].trap) drawBar(x + 4, y + 1, w - 8, b.hp / maxHp(b));
  // Run cards wear a little gold corner so you can tell they're temporary.
  if (isRunObject(b)) {
    ctx.fillStyle = PAL.y;
    ctx.fillRect(x + 1, y + w - 3, 2, 2);
  }

}

function drawMonster(m) {
  const big = m.def.big;
  let x = m.x + m.ox, y = m.y + m.oy;
  // Lunge toward what it's hitting, right after a hit.
  if (m.attacking && m.atk > m.def.rate - 0.15) {
    const tc = centerOf(m.attacking);
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
  // The wall-breaker carries a big hammer.
  if (m.def.breaker) {
    const hx = sx + 19, hy = sy + 6 - (m.attacking && m.atk > m.def.rate - 0.15 ? 2 : 0);
    ctx.fillStyle = PAL.N; ctx.fillRect(hx, hy + 2, 1, 8);
    ctx.fillStyle = PAL.k; ctx.fillRect(hx - 2, hy - 1, 6, 4);
    ctx.fillStyle = PAL.S; ctx.fillRect(hx - 1, hy, 4, 2);
  }
  if (m.hp < m.maxHp) drawBar(Math.round(x - 6 * s), sy + (big ? 14 : 8), 12 * s, m.hp / m.maxHp);
}

// Your hero, standing on their pad with their bow (drawn back for a moment after a shot). While the pad is
// broken, they lie on the rubble until the wave ends.
function drawHero() {
  const x = Math.round(hero.x), y = Math.round(hero.y) - 5;
  if (hero.down) {
    ctx.globalAlpha = 0.45;
    ctx.drawImage(heroImg('down', 0), x, y + 6);
    ctx.globalAlpha = 1;
    if (Math.floor(hero.t * 2) % 2) { ctx.fillStyle = PAL.R; ctx.fillRect(x + 11, y + 4, 2, 2); }
    return;
  }
  ctx.drawImage(heroImg(hero.dir, 0), x, y);
  // The bow: a curved stave and a string, held on the side they face.
  const left = hero.dir === 'left';
  const bx = left ? x + 3 : x + 19, by = y + 9;
  ctx.fillStyle = PAL.n;
  ctx.fillRect(bx + (left ? 0 : 1), by, 1, 1); ctx.fillRect(bx + (left ? -1 : 2), by + 1, 1, 5); ctx.fillRect(bx + (left ? 0 : 1), by + 6, 1, 1);
  ctx.fillStyle = PAL.w;
  ctx.fillRect(bx + (left ? 1 : 0) + (hero.swing > 0 ? (left ? 1 : -1) : 0), by + 1, 1, 5);
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
  if (CARDS[id]?.kind === 'walls') return levelImg('wall', id === 'walls15' ? 2 : 1, WALL_E | WALL_W, false);
  if (!cardImgCache.has(id)) cardImgCache.set(id, rowsToCanvas(cardRows(id)));
  return cardImgCache.get(id);
}

// The card pick: six cards in a 3×2 grid, take two. A taken card stays as an empty slot.
function drawCardPick() {
  const box = buttons.cardBox;
  ctx.fillStyle = 'rgba(26,28,44,0.55)';
  ctx.fillRect(0, 0, UW, UH);
  panelBox(box);
  const wave = run.wave + 1;
  const head = `WAVE ${wave} - TAKE ${run.picksLeft} MORE`;
  drawText(ctx, head, box.x + 6, box.y + 5, PAL.w);
  drawText(ctx, `OMEN: ${run.omen.name.toUpperCase()}  +${run.omen.good}`, box.x + 6, box.y + 13, PAL.l);
  if (run.omen.bad !== run.omen.good) drawText(ctx, `-${run.omen.bad}`, box.x + 6 + textWidth('OMEN: '), box.y + 19, PAL.R);
  run.choices.forEach((id, i) => {
    const b = buttons.cards[i];
    ctx.fillStyle = PAL.k; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = id ? '#272b3a' : PAL.t; ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    if (!id) { drawText(ctx, 'TAKEN', b.x + Math.round((b.w - textWidth('TAKEN')) / 2), b.y + Math.round(b.h / 2) - 2, PAL.S); return; }
    const c = CARDS[id];
    ctx.fillStyle = RARITY_COLOR[c.rarity]; ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 2);
    const mid = (t) => b.x + Math.round((b.w - textWidth(t)) / 2);
    ctx.drawImage(cardIcon(id), b.x + Math.round((b.w - 24) / 2), b.y + 5, 24, 24);
    const name = c.name.toUpperCase();
    drawText(ctx, name, mid(name), b.y + 31, PAL.w);
    drawText(ctx, c.lines[0], mid(c.lines[0]), b.y + 39, PAL.s);
    if (c.lines[1]) drawText(ctx, c.lines[1], mid(c.lines[1]), b.y + 46, PAL.s);
  });
  const cost = rerollCost();
  drawButton(buttons.reroll, cost ? `REROLL ${formatCost(cost)}` : `REROLL FREE (${run.rerolls})`, !cost || canAfford(game, cost) ? 'normal' : 'off');
  drawButton(buttons.skip, `SKIP +${skipGold(run.wave)}G`, 'normal');
}
// The ITEMS tab sits just above the bottom bar; pulled up, the bar of item slots sits between them.
function itemsLayout() {
  const barH = itemsOpen ? ITEM_SLOT + 8 : 0;
  const bar = { x: 0, y: UH - BAR_H - barH, w: UW, h: barH };
  const tab = { x: Math.round(UW / 2) - 34, y: bar.y - 16, w: 68, h: 16 };
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
  drawText(ctx, label, tab.x + Math.round((tab.w - textWidth(label)) / 2) + 3, tab.y + 6, count ? PAL.y : PAL.s);
  // A little arrow: up to open, down to close.
  ctx.fillStyle = PAL.w;
  const ax = tab.x + 5, ay = tab.y + 7;
  if (itemsOpen) { ctx.fillRect(ax, ay, 5, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax + 2, ay + 2, 1, 1); }
  else { ctx.fillRect(ax + 2, ay, 1, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax, ay + 2, 5, 1); }
  if (!itemsOpen) return;
  ctx.fillStyle = PAL.k;
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  if (!game.items.length) {
    centeredText('EMPTY - CARDS AND PUT-AWAY THINGS GO HERE', bar.y + 14, PAL.s);
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
  const title = def.decor || b.type === 'tree' || def.run || b.type === 'heropad' ? def.name.toUpperCase() : `${def.name.toUpperCase()} LV ${lv}`;
  drawText(ctx, title, x, y, PAL.w);
  // Rubble: REPAIR it for gold or CLEAR it away for free (the hero's pad heals itself).
  if (b.hp <= 0) {
    const fix = repairCostOf(b);
    drawText(ctx, b.type === 'heropad' ? 'BROKEN - IT HEALS ITSELF' : fix ? `RUBBLE - FIX ${fix}G OR CLEAR IT` : 'RUBBLE - CLEAR IT AWAY', x, y + 12, PAL.R);
    if (b.type !== 'heropad' && !buildMode) {
      if (fix) drawButton(buttons.upgrade, `FIX ${fix}G`, phase === 'home' && game.gold >= fix ? 'good' : 'off');
      drawButton(buttons.store, 'CLEAR', phase === 'home' ? 'normal' : 'off');
    }
    return;
  }
  const runFix = def.run && !buildMode ? repairCostOf(b) : 0; // a damaged card tower shows FIX instead of PUT AWAY
  if (canStore(b) && !runFix) drawButton(storeButton(b), 'PUT AWAY', b.hp >= maxHp(b) ? 'normal' : 'off');
  if (runFix) drawButton(buttons.upgrade, `FIX ${runFix}G`, phase === 'home' && game.gold >= runFix ? 'good' : 'off');
  if (buildMode) {
    drawText(ctx, b.type === 'tree' ? 'TAP GRASS TO MOVE IT THERE' : 'DRAG IT, OR TAP GRASS TO MOVE IT THERE', x, y + 12, PAL.y);
    if (canStore(b)) drawText(ctx, 'OR PUT IT AWAY IN YOUR ITEMS', x, y + 24, PAL.S);
    return;
  }
  if (def.run) {
    const card = CARDS[b.type] || CARDS.barricade;
    drawText(ctx, b.type === 'barricade' ? 'A STRONG WALL FROM A CARD' : card.lines.join('  '), x, y + 10, PAL.s);
    if (!def.trap) drawText(ctx, `HP ${Math.ceil(b.hp)}/${maxHp(b)}`, x, y + 20, PAL.s);
    drawText(ctx, 'CARD - LASTS THIS RUN', x, y + 30, PAL.y);
    return;
  }

  // What it does.
  let info = '';
  if (b.type === 'tower') {
    const st = towerStats(lv);
    info = `DMG ${st.damage}  RANGE ${(st.range / T).toFixed(1)}  EVERY ${st.rate.toFixed(2)}S`;
  } else if (b.type === 'tree' || def.decor) {
    info = 'DECORATION - JUST FOR LOOKS';
  }
  if (b.type !== 'tree' && !def.decor) info = `HP ${Math.ceil(b.hp)}/${maxHp(b)}  ${info}`;
  drawText(ctx, info, x, y + 10, PAL.s);

  // Upgrade status.
  if (b.type === 'tree' || def.decor) return;
  const atHome = phase === 'home';
  // Damaged: fix it first.
  const fix = repairCostOf(b);
  if (fix > 0) {
    drawText(ctx, `DAMAGED - FIX ${fix}G`, x, y + 22, game.gold >= fix ? PAL.y : PAL.R);
    drawButton(buttons.upgrade, `FIX ${fix}G`, atHome && game.gold >= fix ? 'good' : 'off');
    return;
  }
  const cost = upgradeCost(b.type, lv);
  const block = upgradeBlock(game, b);
  if (cost) drawText(ctx, `NEXT LV: ${formatCost(cost)}`, x, y + 22, canAfford(game, cost) ? PAL.y : PAL.R);
  if (block) drawText(ctx, block, x, y + 32, PAL.R);
  drawButton(buttons.upgrade, lv >= MAX_LEVEL ? 'MAX' : 'UPGRADE', !block && atHome ? 'primary' : 'off');
  if (b.type === 'wall') {
    const same = game.buildings.filter((w) => w.type === 'wall' && w.level === lv && w.hp > 0).length;
    drawButton(buttons.upgradeAll, `ALL LV${lv} (${same})`, !block && atHome ? 'normal' : 'off');
  }
}

function drawHeroPanel() {
  const m = buttons.menu;
  ctx.fillStyle = 'rgba(26,28,44,0.5)';
  ctx.fillRect(0, 0, UW, UH);
  panelBox(m);
  drawText(ctx, `YOUR HERO - LV ${game.hero.level}`, m.x + 6, m.y + 8, PAL.y);
  const res = `G ${game.gold}`;
  drawText(ctx, res, m.x + m.w - 6 - textWidth(res), m.y + 8, PAL.s);
  heroMenu().forEach((it, i) => {
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
  drawButton(buttons.tabBuild, 'BUILD', menuTab === 'build' ? 'primary' : 'normal');
  drawButton(buttons.tabLooks, 'LOOKS', menuTab === 'looks' ? 'primary' : 'normal');
  drawButton(buttons.tabStore, 'PACKS', menuTab === 'store' ? 'primary' : 'normal');
  const corner = menuTab === 'store' ? `GEMS ${game.gems}` : `G ${game.gold}`;
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
      const block = buildBlock(game, row.type);
      drawText(ctx, `${BUILDINGS[row.type].name.toUpperCase()}  (${countOf(game, row.type)})`, m.x + 6, row.y + 1, PAL.w);
      drawText(ctx, block || formatCost(BUILD_COST[row.type]), m.x + 6, row.y + 9, block ? PAL.R : PAL.y);
      drawButton(row, 'BUY', block ? 'off' : 'primary');
    });
    drawButton(buttons.menuClose);
    return;
  }
  buttons.menuRows.forEach((row) => {
    const type = row.type;
    const count = countOf(game, type);
    const block = buildBlock(game, type);
    const ry = row.y;
    drawText(ctx, `${BUILDINGS[type].name.toUpperCase()}  (${count})`, m.x + 6, ry + 1, PAL.w);
    drawText(ctx, block || formatCost(BUILD_COST[type]), m.x + 6, ry + 9, block ? PAL.R : PAL.y);
    drawButton(row, 'BUY', block ? 'off' : 'primary');
  });
  drawButton(buttons.menuClose);
}

function render(time, dt) {
  const now = performance.now();
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
  const onScreen = (b) => { const z = b.w || sizeOf(b); return (b.c + z) * T > vx0 && b.c * T < vx1 && (b.r + z) * T > vy0 && b.r * T - 2 * T < vy1; };
  const things = [
    ...game.buildings.filter(onScreen).map((b) => ({ y: (b.r + sizeOf(b) - 1) * T, draw: () => drawBuilding(b, now) })),
    // The village: buildings, homes, stalls, lamps and gardens (pictures stand on their footprint's bottom edge),
    // the well, the keepers, and the townsfolk (indoors while a wave is on).
    ...[...LANDMARKS, ...HOMES, ...PROPS].filter(onScreen).map((s) => ({ y: (s.r + s.h - 1) * T, draw: () => {
      if (hasCardArt(s.id) || BUILDINGS[s.id]?.decor) { ctx.drawImage(levelImg(s.id, 1, 0, false), s.c * T, s.r * T); return; } // the scarecrow
      const im = villageImg(s.id, s.v || 0);
      if (!FLAT_PROPS.has(s.id)) ctx.drawImage(img.shadow, s.c * T, s.r * T, s.w * T, s.h * T);
      ctx.drawImage(im, s.c * T + Math.round((s.w * T - im.width) / 2), (s.r + s.h) * T - im.height);
    } })),
    { y: WELL.r * T, draw: () => ctx.drawImage(villageImg('well'), WELL.c * T, WELL.r * T) },
    ...(phase === 'wave' ? [] : townsfolk.map((v) => ({ y: v.y, draw: () => person(v.look, v.x, v.y, v.dir, v.moving, v.t) }))),
    ...(heroPad() ? [{ y: hero.y + 0.1, draw: drawHero }] : []),
    ...battle.monsters.map((m) => ({ y: m.y - 12 + 0.5, draw: () => drawMonster(m) })),
  ].sort((a, b) => a.y - b.y);
  for (const t of things) t.draw();

  drawShots();
  if (selected) drawSelection(selected, time);
  for (const w of multi) drawSelection(w, time);
  if (drag?.edit && drag.moved) drawEditGhost(drag.edit);
  // Attack ranges: the selected tower's, and the hero's while you're giving them orders.
  if (selected && phase !== 'end') {
    const rr = rangeOf(selected);
    if (rr) drawRange((selected.c + sizeOf(selected) / 2) * T, selected.r * T + 6, rr);
  }
  if ((heroOpen || movingHero) && !hero.down) drawRange(hero.x + T / 2, hero.y + T / 2, heroStats(game.hero.level).range * T);
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
    const x = Math.round(Math.max(4, Math.min(UW - 30, p.x - 4.5)));
    const y = Math.round(Math.max(HUD_H + 16, Math.min(UH - BAR_H - 15, p.y - 14)));
    ctx.fillStyle = PAL.k;
    ctx.fillRect(x, y, 9, 11);
    ctx.fillStyle = blink ? PAL.r : PAL.R;
    ctx.fillRect(x + 1, y + 1, 7, 9);
    drawText(ctx, '!', x + 3, y + 3, PAL.w);
  }

  // Top bar: resources on the left; builder or wave on the right.
  ctx.fillStyle = 'rgba(26,28,44,0.85)';
  ctx.fillRect(0, 0, UW, HUD_H);
  if (phase === 'home') {
    let x = 6;
    for (const r of RES) {
      const t = `${RES_LETTER[r]} ${game[r]}`;
      drawText(ctx, t, x, 6, RES_COLOR[r]);
      x += textWidth(t) + 8;
    }
    const right = `WAVE ${run.wave + 1} NEXT`;
    drawText(ctx, right, UW - 34 - textWidth(right), 6, PAL.s);
  } else {
    drawText(ctx, `G ${game.gold}`, 6, 6, PAL.y);
    const right = `WAVE ${run.wave}`;
    drawText(ctx, right, UW - 34 - textWidth(right), 6, PAL.w);
    const mid = `ZOMBIES LEFT ${battle.remaining}`;
    drawText(ctx, mid, Math.round((UW - textWidth(mid)) / 2), 6, PAL.R);
  }

  // Zoom buttons, repair button, info panel (the gear is drawn last, over the goal banner and toasts)
  drawButton(buttons.zoomIn);
  drawButton(buttons.zoomOut);
  if (showRepair()) drawButton(buttons.repair, `REPAIR ${repairCost()}G`, game.gold > 0 ? 'good' : 'off');
  if (showPanel()) drawInfoPanel(selected, now);
  else if (showMulti()) drawMultiPanel();

  // Bottom bar
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, UH - BAR_H, UW, BAR_H);
  let hint;
  if (movingHero) hint = 'TAP AN EMPTY SPOT FOR THE HERO PAD';
  else if (phase === 'wave') hint = `WAVE ${run.wave} - ${battle.remaining} ZOMBIES LEFT`;
  else if (placingItem) hint = `${isWallType(placingItem.type) ? 'TAP OR DRAG A LINE TO PLACE' : 'TAP YOUR LAND TO PLACE'} ${BUILDINGS[placingItem.type].name.toUpperCase()}${placingItem.n > 1 ? ` (${placingItem.n} LEFT)` : ''}`;
  else if (placing) hint = `TAP YOUR LAND TO PLACE A ${BUILDINGS[placing].name.toUpperCase()}`;
  else if (phase === 'home' && !buildMode) hint = wavePreview(run.wave + 1);
  else if (buildMode && selected) hint = selected.type === 'tree' ? 'TAP GRASS TO MOVE IT THERE' : 'DRAG IT, OR TAP GRASS TO MOVE IT THERE';
  else if (buildMode) hint = 'DRAG TO MOVE - DRAG ACROSS WALLS TO SELECT';
  else hint = 'TAP A BUILDING - DRAG TO LOOK AROUND';
  centeredText(hint, UH - BAR_H + 4, phase === 'wave' ? PAL.R : placing ? PAL.y : PAL.s);
  if (phase === 'home') drawButton(buttons.left, buildMode || placingItem ? 'DONE' : 'BUILD', buildMode || placingItem ? 'good' : 'normal');
  else drawButton(buttons.left, fastForward ? 'FAST FWD' : `SPEED ${speed}X`, fastForward ? 'good' : 'normal');
  drawButton(buttons.home, buildMode ? 'ADD' : 'BASE', buildMode ? 'primary' : 'normal');
  if (phase === 'home') {
    const ready = !run.choices;
    const label = !ready ? 'PICK A CARD' : isKingWave(run.wave + 1) ? 'KING WAVE!' : 'START WAVE';
    drawButton(buttons.main, label, ready ? 'primary' : 'off');
  } else drawButton(buttons.main, 'SURVIVE...', 'off');

  if (phase === 'home' && !run.choices && !showPanel() && !showMulti()) drawItems(); // the info panels cover it
  if (menuOpen) drawBuildMenu();
  if (heroOpen) drawHeroPanel();
  if (lookOpen) drawLook(time);
  if (run.choices && phase === 'home') drawCardPick();


  if (toast) {
    const w = textWidth(toast.text) + 12;
    const x = Math.max(2, Math.min(UW - 28 - w, Math.round((UW - w) / 2))), y = HUD_H + 14;
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
      centeredText('A ZOMBIE GOT THROUGH - GAME OVER', b.y + 6, PAL.R);
      centeredText(`YOU SURVIVED ${Math.max(0, run.wave - 1)} WAVES - ${run.kills} KILLS`, b.y + 16, PAL.w);
      centeredText(run.rank === 1 ? 'NEW BEST RUN!' : run.rank ? `TOP RUN NUMBER ${run.rank}!` : `GEMS +${run.gems}`, b.y + 26, PAL.y);
      drawButton(buttons.goHome, 'MENU');
    }
  }
  if (!offer && phase !== 'end') drawGear(buttons.settings);
  if (phase === 'title') drawTitle(time);
  if (settingsOpen) drawSettings();
  if (runsOpen) drawTopRuns();
}

// ---------- Settings (the gear, top right) ----------
// CONTINUE, RESTART and TOP RUNS. The game pauses while it's open. RESTART takes three taps (each within a few
// seconds of the last) so it can't happen by accident; the run you abandon still goes into your top runs.
let settingsOpen = false;
let restartTaps = 0, restartAt = 0;
const RESTART_LABELS = ['RESTART', 'ARE YOU SURE?', 'REALLY? TAP AGAIN'];

function onSettingsTap(p) {
  if (inRect(p, buttons.setContinue) || !inRect(p, buttons.settingsBox)) { settingsOpen = false; restartTaps = 0; return; }
  if (inRect(p, buttons.setRuns)) { runsOpen = true; return; }
  if (inRect(p, buttons.setRestart)) {
    if (performance.now() - restartAt > 4000) restartTaps = 0;
    restartAt = performance.now();
    if (++restartTaps < 3) return;
    restartTaps = 0;
    settingsOpen = false;
    restartRun();
  }
}

// Give up this run and start a new one. A run you actually played still counts as a life and a top run; a run
// you hadn't started yet (wave 0, no kills) just resets.
function restartRun() {
  battle.active = false;
  const played = run.wave > 0 || run.kills > 0;
  if (played) recordRun();
  const keep = carryOver(played);
  newLife();
  Object.assign(game, keep);
  saveGame();
  showToast('A NEW RUN BEGINS');
}

function drawSettings() {
  const b = buttons.settingsBox;
  ctx.fillStyle = 'rgba(26,28,44,0.6)';
  ctx.fillRect(0, 0, UW, UH);
  panelBox(b);
  centeredText('PAUSED', b.y + 6, PAL.y);
  drawButton(buttons.setContinue);
  const fresh = performance.now() - restartAt <= 4000 ? restartTaps : 0;
  drawButton(buttons.setRestart, RESTART_LABELS[fresh], fresh ? 'primary' : 'normal');
  drawButton(buttons.setRuns);
}

// A little pixel gear for the settings button.
function drawGear(b) {
  drawButton(b, '');
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  ctx.fillStyle = PAL.w;
  ctx.fillRect(cx - 4, cy - 4, 8, 8);
  for (const [dx, dy] of [[-1, -6], [-1, 4], [-6, -1], [4, -1], [-5, -5], [3, -5], [-5, 3], [3, 3]]) ctx.fillRect(cx + dx, cy + dy, 2, 2);
  ctx.fillStyle = PAL.S;
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
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
  centeredText(run.wave > 0 ? `YOUR RUN: WAVE ${run.wave}` : `LIFE ${game.records.lives}`, y0 + 56, PAL.l);
  drawButton(buttons.titlePlay, run.wave > 0 ? 'CONTINUE' : 'PLAY', 'primary');
  drawButton(buttons.titleRuns);
  if (installPrompt) drawButton(buttons.titleInstall, 'INSTALL APP', 'good');
  centeredText('IF ONE ZOMBIE GETS THROUGH, IT IS OVER', UH - BAR_H + 16, PAL.s);
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
    // Waves survived (the score), zombies killed, gold earned and the run's omen.
    const y = m.y + 22 + i * 13;
    drawText(ctx, `${i + 1}.`, m.x + 6, y, i === 0 ? PAL.y : PAL.s);
    drawText(ctx, `WAVE ${r.waves}`, m.x + 20, y, PAL.w);
    drawText(ctx, `${r.kills}K ${r.gold ?? 0}G`, m.x + 62, y, PAL.y);
    const omen = (r.omen || '').toUpperCase();
    drawText(ctx, omen, m.x + m.w - 6 - textWidth(omen), y, PAL.s);
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
  get hero() { return hero; },
  heroPad,
  moveHeroPad,
  upgradeHero,
  get heroOpen() { return heroOpen; },
  get selected() { return selected; },
  select: (b) => { selected = b; },
  clearRubble,
  repairOne,
  battle,
  get buildMode() { return buildMode; },
  setBuildMode: (on) => { if (phase === 'home') { buildMode = on; selected = null; placing = null; } },
  get lookOpen() { return lookOpen; },
  openLook: () => { lookOpen = true; },
  LANDMARKS,
  cam,
  worldToScreen,
  chunkCenterOnScreen: (cx, cy) => worldToScreen((cx + 0.5) * CHUNK * T, (cy + 0.5) * CHUNK * T),
  setSpeed: (s) => { speed = s; savePrefs({ speed }); },
  startRun: () => phase === 'home' && startRun(),
  nextWave: () => phase === 'home' && nextWave(),
  afterEnd: () => phase === 'end' && afterEnd(),
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
  build: (type, c, r) => {
    const before = game.buildings.length;
    placing = type;
    placeNew(type, c, r);
    placing = null;
    return game.buildings.length > before;
  },
  // Buy the buyable plot nearest the guard point, if affordable. Returns true if something was bought.
  buyNextPlot: () => {
    if (game.gold < landPrice(game.bought)) return false;
    const [hc, hr] = chunkOfTile(GUARD_POINT.c, GUARD_POINT.r);
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
// One step of everything that moves: the battle, the hero (and their pad healing) and the townsfolk.
function simulate(dt) {
  if (phase === 'wave') battle.update(dt);
  healPad(dt);
  heroThink(dt);
  if (phase !== 'wave') for (const v of townsfolk) updateTownsfolk(v, dt);
}

// Is the wave in a quiet stretch (every zombie still far up the path, nothing being hit)? Then it can run at
// 3x on its own: nobody wants to watch zombies walk through the forest.
function waveIsQuiet() {
  if (phase !== 'wave' || !battle.monsters.length) return battle.queue.length > 0;
  let front = Infinity;
  for (const k of owned) front = Math.min(front, Number(k.split(',')[1]) * CHUNK);
  front = Math.min(front, Math.round(hero.y / T)) - 8;
  return battle.monsters.every((m) => m.r < front && !m.attacking);
}

function tick(dt) {
  if (settingsOpen) return; // paused
  fastForward = phase === 'wave' && speed < 3 && waveIsQuiet();
  const steps = phase === 'wave' ? (fastForward ? 3 : speed) : 1;
  for (let i = 0; i < steps; i++) {
    simulate(dt);
    if (phase !== 'wave') break;
    if (battle.villageLost) { endRun(); break; }
    if (battle.cleared) { waveCleared(); break; }
  }
  panKeys();
  clampCam(); // the camera always stays inside the map
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

// Offline copy of the game (sw.js). When a new version takes over: reload on the home screen, where there's
// nothing to lose; mid-game, say so and reload once the run ends.
let updateReady = false;
// Chrome's 'install this app' prompt: kept so the home screen can offer an INSTALL APP button.
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
window.addEventListener('appinstalled', () => { installPrompt = null; });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    // Phones keep the app open for days: look for a new version whenever it comes back to the front.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } // the very first install: nothing to swap
    if (phase === 'title') location.reload();
    else { updateReady = true; showToast('UPDATE READY - IT LOADS NEXT TIME YOU OPEN THE GAME'); }
  });
}
