// Bot players: they play the real game through the `window.defense` hook, fast-forwarded.
// Each bot plays several lives (roguelike: a fresh start each time) and we record how far it got.
// Used for balance checks: see tools/bots.html.
//
// Bots differ in how they handle the run cards and how well they look after the base.

const TOWER_FIRST = ['lightning', 'brazier', 'ballista', 'cannon', 'frost', 'crossbow', 'arrows', 'poison', 'hawkeye',
  'bomb', 'tar', 'scarecrow', 'secondwind', 'spikes', 'stonemason', 'barricade'];

export const BOTS = {
  none: {
    name: 'Never taps',
    about: 'Skips every card, never repairs. The baseline.',
    pick: () => -1,
    atHome() {},
  },
  slow: {
    name: 'Slow player',
    about: 'Takes the first card offered, every time. Repairs, never upgrades.',
    pick: () => 0,
    atHome(d) { d.repairAll(); },
  },
  medium: {
    name: 'Medium player',
    about: 'Strongest card. Repairs, upgrades and hires.',
    pick: (choices) => choices.indexOf([...choices].sort((a, b) => TOWER_FIRST.indexOf(a) - TOWER_FIRST.indexOf(b))[0]),
    hires: true,
    atHome(d) { d.repairAll(); upgradeBase(d); },
  },
  fast: {
    name: 'Fast player',
    about: 'Strongest card, rerolls a weak hand, repairs, upgrades, hires and buys land.',
    pick: (choices, d) => {
      const best = [...choices].sort((a, b) => TOWER_FIRST.indexOf(a) - TOWER_FIRST.indexOf(b))[0];
      if (TOWER_FIRST.indexOf(best) > 8 && d.run.rerolls > 0) return 'reroll';
      return choices.indexOf(best);
    },
    hires: true,
    atHome(d) {
      d.repairAll();
      upgradeBase(d);
      for (let i = 0; i < 2 && d.buyNextPlot(); i++);
    },
  },
};

const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

// Hire whoever on the Tavern board is affordable (fighters and builders first).
function hire(d) {
  const order = ['builder', 'guard', 'gunner', 'archer', 'farmer'];
  const board = (d.game.applicants || []).map((a, i) => ({ a, i })).filter((x) => x.a)
    .sort((x, y) => order.indexOf(x.a.role) - order.indexOf(y.a.role));
  for (const { i } of board) d.hireApplicant(i);
}

// Spend on upgrades: towers first, then walls (the lowest level first).
function upgradeBase(d) {
  const g = d.game;
  for (const t of g.buildings.filter((b) => b.type === 'tower')) if (!g.builder) d.upgrade(t);
  const wall = [...g.buildings].filter((b) => b.type === 'wall').sort((a, b) => a.level - b.level)[0];
  if (wall) d.upgradeAllWalls(wall.level);
}

// Handle the card pick and placement between waves.
function handleCards(d, bot) {
  for (let guard = 0; guard < 5 && d.cardChoices; guard++) {
    const choice = bot.pick(d.cardChoices, d);
    if (choice === 'reroll') { d.rerollCards(); continue; }
    if (choice < 0) d.skipCard(); else d.pickCard(choice);
  }
  for (let guard = 0; guard < 10 && d.run.pending; guard++) d.autoPlace();
}

// Play `lives` lives (endless waves, so each ends in death) with one bot (roguelike: each life starts from nothing).
// Every 15 seconds of daylight the bot collects, looks after its base and handles the dawn card.
// Returns one row per life.
export async function playSeasons(d, bot, lives, onSeason) {
  const rows = [];
  for (let life = 1; life <= lives; life++) {
    d.resetGame();
    let secs = 0, homeSecs = 0;
    while (d.phase !== 'end' && secs < 4000) {
      if (d.phase === 'home') {
        // Between waves: pick the card, look after the base, then start the next wave after 20 seconds.
        handleCards(d, bot);
        homeSecs++;
        if (homeSecs === 5) { bot.atHome(d, life); if (bot.hires) hire(d); }
        if (homeSecs >= 20) { homeSecs = 0; d.nextWave(); }
      }
      d.step(1);
      secs++;
      if (secs % 30 === 0) await yieldFrame();
    }
    const row = {
      season: life,
      omen: d.run.omen.name,
      cleared: d.run.wave - 1,
      earned: d.run.earned,
      gold: d.game.gold,
      land: d.game.owned.length,
      towers: d.game.buildings.filter((b) => b.type === 'tower').length,
      minutes: Math.round(secs / 60),
    };
    rows.push(row);
    onSeason?.(row);
  }
  return rows;
}