// Game numbers in one place, so balancing means editing this file.

export const T = 24;               // tile size in pixels
export const CHUNK = 6;            // tiles per land plot side
export const CHUNKS = 8;           // the buyable land: an 8×8 grid of plots
// The world (owner's sketch v2, sketches/overall-rough-world-design-v2.json): one sketch square per plot.
// The map itself is 10 plots wide (MAP_P0..MAP_P1: mountains on the left edge, ocean on the right) and 24 tall,
// inside a 24×24-plot grid; the camera never shows past the map's edges. The buyable 8×8 land is plots 8..15.
export const WORLD_PLOTS = 24;
export const LAND0 = 8, LAND1 = LAND0 + CHUNKS - 1;   // first/last plot of the buyable land (both axes)
export const N = CHUNK * WORLD_PLOTS;   // 144: world width in tiles
export const NR = N;                    // 144: world height in tiles
export const WORLD = N * T;             // world width in pixels
export const WORLD_H = NR * T;          // world height in pixels
export const MAP_P0 = 7, MAP_P1 = 16;   // first/last plot column of the map (the camera stays inside)

// One letter per plot (the sketch's own letters):
// x danger zone (zombie country) · W mountains · T ocean · t / z forest band (z = where the zombie path runs)
// g your land (the river across its middle, rows 10-11, is drawn in code) · H river band · d river band where the
// path crosses · B open world (the village). Outside the map (columns 0-6 and 17-23) is just mountains and ocean.
export const WORLD_MAP = [
  'WWWWWWWxxxxxxxxxxTTTTTTT',
  'WWWWWWWxxxxxxxxxxTTTTTTT',
  'WWWWWWWxxxxxxxxxxTTTTTTT',
  'WWWWWWWxxxxxxxxxxTTTTTTT',
  'WWWWWWWxxxxxxxxxxTTTTTTT',
  'WWWWWWWxxxxxxxxxxTTTTTTT',
  'WWWWWWWttttzzttttTTTTTTT',
  'WWWWWWWttttzzttttTTTTTTT',
  'WWWWWWWWggggggggTTTTTTTT',
  'WWWWWWWWggggggggTTTTTTTT',
  'WWWWWWWWggggggggTTTTTTTT',
  'WWWWWWWWggggggggTTTTTTTT',
  'WWWWWWWWggggggggTTTTTTTT',
  'WWWWWWWWggggggggTTTTTTTT',
  'WWWWWWWWggggggggTTTTTTTT',
  'WWWWWWWWggggggggTTTTTTTT',
  'WWWWWWWHHttdHHtHTTTTTTTT',
  'WWWWWWWWtHHHdtHtTTTTTTTT',
  'WWWWWWWBBBBBBBBBTTTTTTTT',
  'WWWWWWWBBBBBBBBBTTTTTTTT',
  'WWWWWWWBBBBBBBBTTTTTTTTT',
  'WWWWWWWBBBBBBBTTTTTTTTTT',
  'WWWWWWWBBBBBBBTTTTTTTTTT',
  'WWWWWWWBBBBBBBTTTTTTTTTT',
];

export const START_GOLD = 200;
export const landPrice = (bought) => 50 + 25 * bought;

// Endless roguelike: one life, waves forever, and the goal is to get as far as you can. No clock between
// waves: you start the next one when your defenses are ready. If ONE zombie gets through to the village, the run
// is over: the save is wiped and the run goes into TOP RUNS. Cosmetics (gems, art packs, your look) and records stay.
export const BOSS_EVERY = 10;     // a Zombie King every 10th wave (two at wave 20, and so on)
export const TOP_RUNS = 10;       // how many best runs the home screen keeps
// Zombies get tougher with each wave. waveLevel is the 'level' the zombie (and fighter) scaling uses.
export const waveLevel = (wave) => 1 + 0.35 * (wave - 1);
export const MAX_LEVEL = 10;

// ---------- Buildings ----------
// hp: health at level 1 (grows with level, see hpFor). repair: gold to fix level-1 rubble back to full.
// size: tiles wide and tall (default 1).
export const BUILDINGS = {
  wall: { name: 'Wall', hp: 60, repair: 6 },
  tower: { name: 'Archer Tower', hp: 80, repair: 15 },
  tree: { name: 'Tree', hp: 40, repair: 0 },               // grows back for free
  // Run cards placed on the base (gone when the run ends). hp here is before CARD_POWER.
  crossbow: { name: 'Crossbow Post', hp: 60, repair: 0, run: true },
  cannon: { name: 'Cannon Tower', hp: 120, repair: 0, size: 2, run: true },
  frost: { name: 'Frost Tower', hp: 70, repair: 0, run: true },
  ballista: { name: 'Ballista', hp: 100, repair: 0, size: 2, run: true },
  lightning: { name: 'Lightning Rod', hp: 50, repair: 0, run: true },
  brazier: { name: 'Flame Brazier', hp: 60, repair: 0, run: true },
  spikes: { name: 'Spike Pit', hp: 1, repair: 0, run: true, trap: true },
  bomb: { name: 'Bomb', hp: 1, repair: 0, run: true, trap: true },
  tar: { name: 'Tar Pit', hp: 1, repair: 0, run: true, trap: true },
  scarecrow: { name: 'Scarecrow', hp: 150, repair: 0, run: true },
  barricade: { name: 'Barricade', hp: 90, repair: 0, run: true },
  // Decorations: no stats, just looks. Fixed for free after a run.
  flowers: { name: 'Flower Bed', hp: 20, repair: 0, decor: true },
  lantern: { name: 'Lanterns', hp: 20, repair: 0, decor: true },
  banner: { name: 'Banner', hp: 20, repair: 0, decor: true },
  gnome: { name: 'Garden Gnome', hp: 20, repair: 0, decor: true },
  crystal: { name: 'Crystals', hp: 20, repair: 0, decor: true },
  skulls: { name: 'Skull Totem', hp: 20, repair: 0, decor: true },
};
export const DECOR = ['flowers', 'lantern', 'banner', 'gnome', 'crystal', 'skulls'];

export const sizeOf = (b) => BUILDINGS[b.type].size || 1;

// Health grows 45% per level. Run cards scale with CARD_POWER instead.
export const hpFor = (type, level = 1) => (BUILDINGS[type].run
  ? Math.round(BUILDINGS[type].hp * CARD_POWER)
  : Math.round(BUILDINGS[type].hp * 1.45 ** (level - 1)));

// Archer tower stats per level: damage +45%, range +0.15 tiles, slightly faster. (The steep damage curve
// and the flat upgrade prices below keep 'upgrade a tower' competitive with 'build another one'.)
export const towerStats = (level = 1) => ({
  damage: Math.round(8 * 1.45 ** (level - 1)),
  range: (4 + 0.15 * (level - 1)) * T,
  rate: Math.max(0.45, 0.8 - 0.035 * (level - 1)),
});

// ---------- No limits ----------
// v2: there's no House. Nothing caps how many walls, towers or people you have, or how much gold you hold.
// Gold (from zombies) is the only limit. Things still level up to MAX_LEVEL.

// Cost to build a new one. Gold is the only money: you earn it by killing zombies.
export const BUILD_COST = {
  wall: { gold: 10 },
  tower: { gold: 200 },
  flowers: { gold: 5 },
  lantern: { gold: 15 },
  banner: { gold: 25 },
  gnome: { gold: 25 },
  crystal: { gold: 80 },
  skulls: { gold: 80 },
};

// Gold to go from `level` to `level + 1`. Every upgrade is instant: gold is the only limit.
const UPGRADES = {
  wall: [10, 25, 60, 150, 350, 800, 1800, 4000, 9000].map((gold) => ({ gold })),
  tower: [50, 90, 150, 250, 400, 650, 1000, 1600, 2500].map((gold) => ({ gold })),
};
export const upgradeCost = (type, level) => UPGRADES[type]?.[level - 1] ?? null;

// ---------- Run cards (roguelike, never saved) ----------
// One knob for the whole card set: multiplies card damage, hp and slow strength.
export const CARD_POWER = 0.8; // playtest: 1.0 made runs far too easy (casual players won 63%)

// Common / Rare / Epic odds by wave.
export const rarityOdds = (wave) => (wave <= 3 ? [75, 22, 3] : wave <= 6 ? [55, 35, 10] : wave <= 9 ? [40, 40, 20] : [25, 45, 30]);
export const RARITY = ['common', 'rare', 'epic'];
export const SKIP_GOLD = 15;

// Gems: the premium currency for art packs in the store. Earned from runs for now;
// buying them with real money comes later, once the game is online.
export const gemsForRun = (wavesSurvived) => 1 + Math.floor(wavesSurvived / 5);

// kind: tower | trap | walls | blessing. Towers: damage, range (tiles), rate (s).
// lines: what the card says (short, pixel font).
export const CARDS = {
  crossbow: { name: 'Crossbow Post', kind: 'tower', rarity: 'common', size: 1, hp: 60, damage: 6, range: 3.5, rate: 0.35, shot: 'arrow', lines: ['RAPID FIRE', '6 DMG 3.5 RNG'] },
  cannon: { name: 'Cannon Tower', kind: 'tower', rarity: 'common', size: 2, hp: 120, damage: 22, range: 4.5, rate: 2.0, shot: 'ball', splash: 1.5, lines: ['SPLASH DAMAGE', '22 DMG 2X2'] },
  frost: { name: 'Frost Tower', kind: 'tower', rarity: 'rare', size: 1, hp: 70, damage: 3, range: 3.5, rate: 0.9, shot: 'ice', slow: 0.6, slowFor: 2, lines: ['SLOWS FOES', 'TO 60% SPEED'] },
  ballista: { name: 'Ballista', kind: 'tower', rarity: 'rare', size: 2, hp: 100, damage: 22, range: 7, rate: 2.5, shot: 'bolt', pierce: 3, lines: ['LONG RANGE', 'PIERCES 3'] },
  lightning: { name: 'Lightning Rod', kind: 'tower', rarity: 'epic', size: 1, hp: 50, damage: 30, range: 6, rate: 4, shot: 'zap', chain: 2, chainDamage: 15, lines: ['30 DMG ZAP', 'CHAINS TO 2'] },
  brazier: { name: 'Flame Brazier', kind: 'tower', rarity: 'epic', size: 1, hp: 60, damage: 2, range: 2, rate: 0.25, shot: 'aura', lines: ['BURNS ALL', 'NEARBY'] },
  spikes: { name: 'Spike Pit', kind: 'trap', rarity: 'common', damage: 15, charges: 8, lines: ['15 DMG ON STEP', '8 USES'] },
  bomb: { name: 'Bomb', kind: 'trap', rarity: 'common', damage: 60, splash: 2, lines: ['60 DMG BLAST', 'ONE USE'] },
  tar: { name: 'Tar Pit', kind: 'trap', rarity: 'rare', slow: 0.5, lines: ['SLOWS 3X3', 'ALL RUN'] },
  scarecrow: { name: 'Scarecrow', kind: 'trap', rarity: 'rare', hp: 150, decoy: true, lines: ['MONSTERS', 'HIT IT FIRST'] },
  barricade: { name: 'Barricade', kind: 'walls', rarity: 'common', count: 6, hp: 90, lines: ['6 STRONG WALLS', '90 HP EACH'] },
  arrows: { name: 'Sharp Arrows', kind: 'blessing', rarity: 'common', stacks: 3, lines: ['TOWERS', '+25% DAMAGE'] },
  hawkeye: { name: 'Hawk Eye', kind: 'blessing', rarity: 'rare', lines: ['TOWERS', '+1 RANGE'] },
  poison: { name: 'Poison Tips', kind: 'blessing', rarity: 'epic', lines: ['HITS POISON', '2 DMG/S 4S'] },
  stonemason: { name: 'Stonemason', kind: 'blessing', rarity: 'common', lines: ['WALLS +50% HP', 'AND HEALED'] },
  secondwind: { name: 'Second Wind', kind: 'blessing', rarity: 'epic', lines: ['FIRST ZOMBIE TO', 'GET THROUGH DIES'] },
};

// One random twist per run: an upside and a downside.
export const OMENS = [
  { id: 'bloodmoon', name: 'Blood Moon', good: 'KILL GOLD +50%', bad: 'ZOMBIES +25% HP', hpMul: 1.25, goldMul: 1.5 },
  { id: 'fog', name: 'Thick Fog', good: 'SEE 4 CARDS', bad: 'TOWER RANGE -0.25', rangeAdd: -0.25, choices: 4 },
  { id: 'zombierush', name: 'Runner Rush', good: 'TRAP AND WALL CARDS X2', bad: 'EXTRA RUNNERS FROM WAVE 2', runners: true, pairs: true },
  { id: 'luckystars', name: 'Lucky Stars', good: 'RARER CARDS', bad: 'ZOMBIES 5% FASTER', luck: true, speedMul: 1.05 },
  { id: 'calm', name: 'Calm Skies', good: 'WAVE BONUS +25%', bad: 'NOTHING STRANGE', bonusMul: 1.25 },
];

// ---------- The village ----------
// Pets: one walks with your hero at a time and gives its perk. Never dies.
export const PETS = {
  dog: { name: 'Dog', price: { gold: 300 }, perk: 'YOUR HERO WALKS 50% FASTER' },
  cat: { name: 'Cat', price: { gold: 250 }, perk: 'ZOMBIES DROP +20% GOLD' },
  owl: { name: 'Owl', price: { gold: 400 }, perk: '+1 CARD REROLL A RUN' },
};

// Blacksmith: building kits that go straight into your items (place them from the ITEMS bar).
export const BLACKSMITH_GOODS = [
  { name: 'WALL BUNDLE X10', type: 'wall', n: 10, price: { gold: 90 }, about: 'TEN WOODEN WALLS' },
  { name: 'ARCHER TOWER KIT', type: 'tower', n: 1, price: { gold: 200 }, about: 'SHOOTS ANY ZOMBIE IN RANGE' },
  { name: 'SPIKE PITS X2', type: 'spikes', n: 2, price: { gold: 70 }, about: 'TRAPS FOR THE PATH' },
  { name: 'BARRICADES X3', type: 'barricade', n: 3, price: { gold: 75 }, about: 'TOUGH WALLS FOR THIS RUN' },
];
// Chapel: pray for luck (+1 card reroll this run).
export const CHAPEL_PRAYER = { gold: 50 };

// General store: run upgrades for gold (the same blessings the cards give; they last this run).
export const STORE_ITEMS = {
  arrows: { name: 'Sharp Arrows', price: { gold: 150 }, about: 'TOWERS +25% DAMAGE THIS RUN (MAX 3)', blessing: 'arrows' },
  hawkeye: { name: 'Hawk Eye', price: { gold: 250 }, about: 'TOWERS +1 RANGE THIS RUN', blessing: 'hawkeye' },
  stonemason: { name: 'Stonemason', price: { gold: 120 }, about: 'WALLS +50% HP THIS RUN', blessing: 'stonemason' },
};

// ---------- NPCs: your people, with jobs (you're the director) ----------
// Hired at the Tavern (in the village). No cap: gold is the only limit.
// (Archer towers shoot on their own: there is no archer role to hire.)
export const NPC_ROLES = {
  builder: { name: 'Builder', price: { gold: 150 }, about: 'FIXES DAMAGED WALLS FOR FREE',
    look: { skin: '#e8b088', hair: '#ffcd75', shirt: '#ef7d57', pants: '#566c86' } },
  // Fighters: they go out and fight zombies during a wave. Zombies hit back; a fighter who drops
  // gets back up when the wave ends.
  guard: { name: 'Guard', price: { gold: 180 }, about: 'SWORD - HOLDS ZOMBIES BACK UP CLOSE',
    look: { skin: '#f4c8a0', hair: '#333c57', shirt: '#94b0c2', pants: '#333c57' },
    fight: { hp: 110, damage: 14, rate: 0.7, range: 1.2, weapon: 'sword' } },
  gunner: { name: 'Gunner', price: { gold: 250 }, about: 'GUN - SHOOTS FROM BEHIND THE GUARDS',
    look: { skin: '#c8955a', hair: '#1a1c2c', shirt: '#38b764', pants: '#5a3a1f' },
    fight: { hp: 60, damage: 11, rate: 0.9, range: 4, weapon: 'gun' } },
};
// Fighters get tougher as the waves do (pass waveLevel(wave)), a bit slower than zombies (1.4x per level).
export const fighterScale = (level) => 1.3 ** (level - 1);
export const GUARD_RADIUS = 9;   // tiles from the guard point a fighter will go to meet a zombie

// ---------- Your hero: a mobile tower ----------
// Tap the hero to move them (they stand guard where you send them, even mid-wave), upgrade them or change
// their look. They shoot any zombie in range. If they drop, they get up when the wave ends.
export const HERO_MAX_LEVEL = 10;
export const heroStats = (level) => ({
  hp: Math.round(200 * 1.3 ** (level - 1)),
  damage: 12 * 1.28 ** (level - 1),
  rate: 0.7,
  range: 3.5 + 0.25 * (level - 1),
  weapon: 'bow',
});
export const heroUpgradeCost = (level) => ({ gold: Math.round((100 * 1.75 ** (level - 1)) / 10) * 10 }); // level -> level+1

// ---------- Hiring is roguelike ----------
// The Tavern never has a fixed menu: it shows APPLICANTS random people (role, name, trait, price).
// The board reshuffles after every wave, or right away for REROLL_PRICE. You work with who turns up.
export const APPLICANTS = 3;
export const REROLL_PRICE = { gold: 30 };
// Every applicant has one trait. Some are good, some are a trade-off.
//   speed: walking speed x   hp: fighter health x   power: fighter damage / builder repair x
//   range: tiles added to a gunner   price: hire price x
//   roles: only these roles can have it (no roles = anyone)
export const TRAITS = {
  quick:  { name: 'QUICK',     about: 'WALKS FAST',              speed: 1.35 },
  tough:  { name: 'TOUGH',     about: 'LOTS OF HEALTH',          hp: 1.5, roles: ['guard', 'gunner'] },
  strong: { name: 'STRONG',    about: 'HITS AND WORKS HARDER',   power: 1.3 },
  eagle:  { name: 'EAGLE EYE', about: 'SEES FURTHER (+1 RANGE)', range: 1, roles: ['gunner'] },
  cheap:  { name: 'CHEAP',     about: 'WORKS FOR LESS',          price: 0.65 },
  lazy:   { name: 'LAZY',      about: 'SLOW AND WEAK, VERY CHEAP', speed: 0.7, power: 0.8, price: 0.5 },
  hero:   { name: 'HEROIC',    about: 'GREAT AT EVERYTHING',     speed: 1.2, hp: 1.3, power: 1.25, price: 1.4, roles: ['guard', 'gunner'] },
};
export const NPC_NAMES = ['ADA', 'BO', 'CY', 'DOT', 'ED', 'FAY', 'GUS', 'HAL', 'IVY', 'JO', 'KIT', 'LEO', 'MAE',
  'NED', 'OLA', 'PIP', 'QUIN', 'ROY', 'SAL', 'TEX', 'UMA', 'VIC', 'WES', 'XAN', 'YUL', 'ZED'];
export const BUILDER_REPAIR_PER_SEC = 12;   // health a builder restores per second while working

// ---------- Director's goals (the story) ----------
// The early-game to-do list, one at a time, in order (it teaches the game). `check(game)` says when it's done; the reward is paid then.
export const GOALS = [
  { id: 'hero', text: 'TAP YOUR HERO AND MOVE THEM', reward: { gold: 50 }, check: (g) => !!g.hero?.post },
  { id: 'walls', text: 'PLACE THE WALLS FROM YOUR ITEMS', reward: { gold: 50 }, check: (g) => !g.items?.some((i) => i.type === 'wall') },
  { id: 'builder', text: 'HIRE A BUILDER AT THE VILLAGE TAVERN', reward: { gold: 100 }, check: (g) => g.npcs.some((n) => n.role === 'builder') },
  { id: 'wave3', text: 'SURVIVE 3 WAVES', reward: { gold: 150 }, check: (g) => (g.stats?.bestWave || 0) >= 3 },
  { id: 'fighter', text: 'HIRE A GUARD OR GUNNER', reward: { gold: 150 }, check: (g) => g.npcs.some((n) => n.role === 'guard' || n.role === 'gunner') },
  { id: 'tower3', text: 'BUILD A 3RD ARCHER TOWER', reward: { gold: 200 }, check: (g) => g.buildings.filter((b) => b.type === 'tower' && b.hp > 0).length >= 3 },
  { id: 'tower3lv', text: 'UPGRADE A TOWER TO LEVEL 3', reward: { gold: 250 }, check: (g) => g.buildings.some((b) => b.type === 'tower' && b.level >= 3) },
  { id: 'wave7', text: 'SURVIVE 7 WAVES', reward: { gold: 300 }, check: (g) => (g.stats?.bestWave || 0) >= 7 },
  { id: 'king', text: 'SURVIVE WAVE 10 AND BEAT THE KING', reward: { gold: 500, gems: 5 }, check: (g) => (g.stats?.bestWave || 0) >= 10 },
  { id: 'wave20', text: 'SURVIVE 20 WAVES', reward: { gold: 1000, gems: 10 }, check: (g) => (g.stats?.bestWave || 0) >= 20 },
];

// ---------- Monsters ----------

// How stubborn monsters are about walking around: they'll walk this many extra tiles per
// point of a building's health rather than smash through it. 0.5 means a full 60-health wall
// is worth a 30-tile detour; damaged walls become tempting sooner.
export const DETOUR_PER_HP = 0.5;

// speed in pixels per second, rate = seconds between attacks.
// All monsters are zombies (for now).
export const MONSTERS = {
// (The path from the den to the village gate is ~72 tiles; quiet stretches fast-forward, see main.js tick.)
  zombie: { name: 'Zombie', hp: 20, speed: 29, damage: 4, rate: 1.0, gold: 2 },
  runner: { name: 'Runner', hp: 14, speed: 52, damage: 3, rate: 0.7, gold: 3 },
  brute: { name: 'Brute', hp: 70, speed: 21, damage: 12, rate: 1.2, gold: 6 },
  king: { name: 'Zombie King', hp: 400, speed: 16, damage: 30, rate: 1.5, gold: 100, big: true },
};

// Zombies get tougher each wave: health grows steadily with a curve on top (x5.5 by wave 10, x17 by wave 20,
// x45 by wave 30), damage with waveLevel. Gold grows only linearly, so the first ten waves pay for the base
// and after that every wave is a bigger ask: a run always ends, the question is where.
export const hpScale = (wave) => (1 + 0.25 * (wave - 1)) * 1.06 ** (wave - 1);
export const damageScale = (level = 1) => 1 + 0.35 * (level - 1);

// Gold: the only income. Tougher zombies pay more. KILL_GOLD multiplies every zombie's gold.
export const KILL_GOLD = 3;
export const goldScale = (wave) => 1 + 0.22 * (wave - 1);
export const killGold = (zombieGold, wave) => Math.round(zombieGold * KILL_GOLD * goldScale(wave));
// Gold for clearing a wave.
export const waveBonus = (wave) => Math.round((20 + 6 * wave) * goldScale(wave));

// Who comes out of the cave, in order. gap = seconds until the next one.
export function waveList(wave, omen = {}) {
  const out = [];
  const add = (type, count, gap) => { for (let i = 0; i < count; i++) out.push({ type, gap }); };
  add('zombie', 3 + 2 * wave, 1.0);
  if (omen.runners && wave >= 2) add('runner', Math.ceil(wave * 1.2), 0.6);
  else if (wave >= 3) add('runner', wave, 0.6);
  if (wave >= 5) add('brute', Math.floor((wave - 3) / 2), 2.0);
  if (wave % BOSS_EVERY === 0) add('king', wave / BOSS_EVERY, 3);
  return out;
}
