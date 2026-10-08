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
  // Your hero's pad: the hero stands on it. Zombies hunt it like a tower; it heals over time (HERO_PAD_HEAL).
  heropad: { name: 'Hero Pad', hp: 200, repair: 0 },
  tree: { name: 'Tree', hp: 40, repair: 0 },               // grows back for free
  // Run cards placed on the base (gone when the run ends). hp here is before CARD_POWER. Card towers can be
  // repaired from rubble like archer towers (repair = gold to fix one from nothing).
  crossbow: { name: 'Crossbow Post', hp: 60, repair: 20, run: true },
  cannon: { name: 'Cannon Tower', hp: 120, repair: 40, size: 2, run: true },
  frost: { name: 'Frost Tower', hp: 70, repair: 25, run: true },
  ballista: { name: 'Ballista', hp: 100, repair: 40, size: 2, run: true },
  lightning: { name: 'Lightning Rod', hp: 50, repair: 50, run: true },
  brazier: { name: 'Flame Brazier', hp: 60, repair: 25, run: true },
  // The Gold Mine pays at the end of every wave it survives. Zombies hunt it; once broken it's gone for good.
  goldmine: { name: 'Gold Mine', hp: 120, repair: 0, run: true, noRepair: true },
  spikes: { name: 'Spike Pit', hp: 1, repair: 0, run: true, trap: true },
  bomb: { name: 'Bomb', hp: 1, repair: 0, run: true, trap: true },
  tar: { name: 'Tar Pit', hp: 1, repair: 0, run: true, trap: true },
  scarecrow: { name: 'Scarecrow', hp: 150, repair: 15, run: true },
  barricade: { name: 'Barricade', hp: 90, repair: 8, run: true },   // older runs' card walls (no card gives them now)
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
// v2: there's no House. Nothing caps how many walls or towers you have, or how much gold you hold.
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
// Six cards are shown after every wave and you take two (PICKS). Each pick you skip pays about a quarter of
// what the wave just brought in.
export const CARDS_SHOWN = 6;
export const PICKS = 2;
export const skipGold = (wave) => Math.round(0.25 * waveIncome(Math.max(1, wave)));
// One free reroll a run, then rerolls cost gold, more each time. A reroll redraws all six.
export const FREE_REROLLS = 1;
export const rerollPrice = (paidSoFar) => ({ gold: 50 + 25 * paidSoFar });

// Gems: the premium currency for art packs in the store. Earned from runs for now;
// buying them with real money comes later, once the game is online.
export const gemsForRun = (wavesSurvived) => 1 + Math.floor(wavesSurvived / 5);

// kind: tower | trap | walls | mine | blessing. Towers: damage, range (tiles), rate (s).
// lines: what the card says (short, pixel font). weight: how often it's drawn within its rarity (default 1).
// (Numbers were cut ~20% when the pick went from 1 of 3 to 2 of 6.)
export const CARDS = {
  crossbow: { name: 'Crossbow Post', kind: 'tower', rarity: 'common', size: 1, hp: 60, damage: 5, range: 3.5, rate: 0.35, shot: 'arrow', lines: ['RAPID FIRE', '5 DMG 3.5 RNG'] },
  cannon: { name: 'Cannon Tower', kind: 'tower', rarity: 'common', size: 2, hp: 120, damage: 18, range: 4.5, rate: 2.0, shot: 'ball', splash: 1.5, lines: ['SPLASH DAMAGE', '18 DMG 2X2'] },
  frost: { name: 'Frost Tower', kind: 'tower', rarity: 'rare', size: 1, hp: 70, damage: 3, range: 3.5, rate: 0.9, shot: 'ice', slow: 0.6, slowFor: 2, lines: ['SLOWS FOES', 'TO 60% SPEED'] },
  ballista: { name: 'Ballista', kind: 'tower', rarity: 'rare', size: 2, hp: 100, damage: 18, range: 7, rate: 2.5, shot: 'bolt', pierce: 3, lines: ['LONG RANGE', 'PIERCES 3'] },
  lightning: { name: 'Lightning Rod', kind: 'tower', rarity: 'epic', size: 1, hp: 50, damage: 24, range: 6, rate: 4, shot: 'zap', chain: 2, chainDamage: 12, lines: ['24 DMG ZAP', 'CHAINS TO 2'] },
  brazier: { name: 'Flame Brazier', kind: 'tower', rarity: 'epic', size: 1, hp: 60, damage: 2, range: 2, rate: 0.25, shot: 'aura', lines: ['BURNS ALL', 'NEARBY'] },
  spikes: { name: 'Spike Pit', kind: 'trap', rarity: 'common', damage: 12, charges: 8, lines: ['12 DMG ON STEP', '8 USES'] },
  bomb: { name: 'Bomb', kind: 'trap', rarity: 'common', damage: 48, splash: 2, lines: ['48 DMG BLAST', 'ONE USE'] },
  tar: { name: 'Tar Pit', kind: 'trap', rarity: 'rare', slow: 0.5, lines: ['SLOWS 3X3', 'ALL RUN'] },
  scarecrow: { name: 'Scarecrow', kind: 'trap', rarity: 'rare', hp: 150, decoy: true, lines: ['MONSTERS', 'HIT IT FIRST'] },
  // Wall packs: plain walls into your items (they last the run and upgrade like any wall). Drawn often.
  walls8: { name: 'Walls X8', kind: 'walls', rarity: 'common', count: 8, weight: 3, lines: ['8 WALLS', 'INTO YOUR ITEMS'] },
  walls15: { name: 'Walls X15', kind: 'walls', rarity: 'rare', count: 15, weight: 3, lines: ['15 WALLS', 'INTO YOUR ITEMS'] },
  goldmine: { name: 'Gold Mine', kind: 'mine', rarity: 'rare', size: 1, hp: 120, lines: ['GOLD EVERY WAVE', 'ZOMBIES HUNT IT'] },
  arrows: { name: 'Sharp Arrows', kind: 'blessing', rarity: 'common', stacks: 3, lines: ['TOWERS', '+25% DAMAGE'] },
  hawkeye: { name: 'Hawk Eye', kind: 'blessing', rarity: 'rare', lines: ['TOWERS', '+1 RANGE'] },
  poison: { name: 'Poison Tips', kind: 'blessing', rarity: 'epic', lines: ['HITS POISON', '2 DMG/S 4S'] },
  stonemason: { name: 'Stonemason', kind: 'blessing', rarity: 'common', lines: ['WALLS +50% HP', 'AND HEALED'] },
  secondwind: { name: 'Second Wind', kind: 'blessing', rarity: 'epic', lines: ['FIRST ZOMBIE TO', 'GET THROUGH DIES'] },
};

// One random twist per run: an upside and a downside.
export const OMENS = [
  { id: 'bloodmoon', name: 'Blood Moon', good: 'KILL GOLD +50%', bad: 'ZOMBIES +25% HP', hpMul: 1.25, goldMul: 1.5 },
  { id: 'fog', name: 'Thick Fog', good: 'PICK 3 CARDS', bad: 'TOWER RANGE -0.25', rangeAdd: -0.25, picks: 3 },
  { id: 'zombierush', name: 'Runner Rush', good: 'TRAP AND WALL CARDS X2', bad: 'EXTRA RUNNERS FROM WAVE 2', runners: true, pairs: true },
  { id: 'luckystars', name: 'Lucky Stars', good: 'RARER CARDS', bad: 'ZOMBIES 5% FASTER', luck: true, speedMul: 1.05 },
  { id: 'calm', name: 'Calm Skies', good: 'WAVE BONUS +25%', bad: 'NOTHING STRANGE', bonusMul: 1.25 },
];

// ---------- Your hero: a mobile tower ----------
// The hero stands on a 1-tile pad. Tap the pad to MOVE it (even mid-wave), UPGRADE the hero or change their
// look. They shoot any zombie in range. Zombies hunt the pad like a tower: its health is the hero's hp, and it
// heals over time. If it breaks, the hero is down until the wave ends, then the pad heals back up by itself.
export const HERO_MAX_LEVEL = 10;
export const heroStats = (level) => ({
  hp: Math.round(200 * 1.3 ** (level - 1)),
  damage: 12 * 1.28 ** (level - 1),
  rate: 0.7,
  range: 3.5 + 0.25 * (level - 1),
  weapon: 'bow',
});
export const HERO_PAD_HEAL = 0.02; // share of its health the pad heals a second during a wave (10x between waves)
export const heroUpgradeCost = (level) => ({ gold: Math.round((100 * 1.75 ** (level - 1)) / 10) * 10 }); // level -> level+1

// ---------- Monsters ----------

// Zombies hunt your towers: each heads for the nearest standing tower, card tower, hero pad or Gold Mine (by
// path cost) and smashes it. Only when nothing is left standing do they head down the path to the village.
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
  // Late-game types, one every ~10 waves (debut: the first wave they come). Wall-breakers walk straight through
  // walls (they hardly mind them) and hit walls x4; the swarm is many weak runners; the tank is huge and slow.
  breaker: { name: 'Wall-Breaker', hp: 60, speed: 24, damage: 10, rate: 1.0, gold: 6, debut: 15, wallMul: 4, breaker: true },
  swarm: { name: 'Swarm', hp: 8, speed: 58, damage: 2, rate: 0.6, gold: 1, debut: 25 },
  tank: { name: 'Tank', hp: 600, speed: 12, damage: 20, rate: 1.6, gold: 40, debut: 30, big: true },
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
// What a wave brings in: its clear bonus plus the gold of every zombie in it.
export const waveIncome = (wave) => waveBonus(wave)
  + waveList(wave).reduce((sum, s) => sum + killGold(MONSTERS[s.type].gold, wave), 0);
// A Gold Mine's payout for each wave it survives.
export const mineGold = (wave) => Math.round(0.5 * waveBonus(wave));

// Who comes out of the cave, in order. gap = seconds until the next one.
export function waveList(wave, omen = {}) {
  const out = [];
  const add = (type, count, gap) => { for (let i = 0; i < count; i++) out.push({ type, gap }); };
  add('zombie', 3 + 2 * wave, 1.0);
  if (omen.runners && wave >= 2) add('runner', Math.ceil(wave * 1.2), 0.6);
  else if (wave >= 3) add('runner', wave, 0.6);
  if (wave >= 5) add('brute', Math.floor((wave - 3) / 2), 2.0);
  if (wave >= MONSTERS.breaker.debut) add('breaker', Math.floor((wave - MONSTERS.breaker.debut) / 2) + 2, 1.5);
  if (wave >= MONSTERS.swarm.debut) add('swarm', 3 * (wave - MONSTERS.swarm.debut) + 12, 0.25);
  if (wave >= MONSTERS.tank.debut) add('tank', Math.floor((wave - MONSTERS.tank.debut) / 3) + 1, 4);
  if (wave % BOSS_EVERY === 0) add('king', wave / BOSS_EVERY, 3);
  return out;
}
