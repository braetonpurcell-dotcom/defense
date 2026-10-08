// Bot players: they play the real game through the `window.defense` hook, fast-forwarded.
// Each bot plays several lives (roguelike: a fresh start each time) and we record how far it got.
// Used for balance checks: see tools/bots.html.
//
// Bots differ in how they handle the run cards and how well they look after the base.

const TOWER_FIRST = ['lightning', 'brazier', 'ballista', 'cannon', 'frost', 'crossbow', 'arrows', 'poison', 'hawkeye',
  'goldmine', 'walls15', 'bomb', 'tar', 'scarecrow', 'secondwind', 'walls8', 'spikes', 'stonemason'];

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
    about: 'Strongest cards. Repairs and upgrades.',
    pick: (choices) => choices.indexOf([...choices].sort((a, b) => TOWER_FIRST.indexOf(a) - TOWER_FIRST.indexOf(b))[0]),
    atHome(d) { d.repairAll(); upgradeBase(d); },
  },
  fast: {
    name: 'Fast player',
    about: 'Strongest cards, rerolls a weak hand (while it is free), repairs, upgrades, the hero too, and buys land.',
    pick: (choices, d) => {
      const best = [...choices].sort((a, b) => TOWER_FIRST.indexOf(a) - TOWER_FIRST.indexOf(b))[0];
      if (TOWER_FIRST.indexOf(best) > 8 && d.run.rerolls > 0) return 'reroll';
      return choices.indexOf(best);
    },
    atHome(d) {
      d.repairAll();
      d.upgradeHero();
      upgradeBase(d);
      for (let i = 0; i < 2 && d.buyNextPlot(); i++);
    },
  },
};

const yieldFrame = () => new Promise((r) => setTimeout(r, 0));


// Spend on upgrades: towers first, then walls (the lowest level first).
function upgradeBase(d) {
  const g = d.game;
  for (const t of g.buildings.filter((b) => b.type === 'tower')) d.upgrade(t);
  const wall = [...g.buildings].filter((b) => b.type === 'wall').sort((a, b) => a.level - b.level)[0];
  if (wall) d.upgradeAllWalls(wall.level);
}

// Handle the card pick (two of six) and placement between waves. Taken cards are null in the hand.
function handleCards(d, bot) {
  for (let guard = 0; guard < 6 && d.cardChoices; guard++) {
    const hand = d.cardChoices.map((id) => id || '~');
    const choice = bot.pick(hand.filter((id) => id !== '~'), d);
    if (choice !== 'reroll' && choice >= 0) { d.pickCard(hand.indexOf(hand.filter((id) => id !== '~')[choice])); continue; }
    if (choice === 'reroll') { d.rerollCards(); continue; }
    if (choice < 0) d.skipCard();
  }
  for (let guard = 0; guard < 10 && d.autoPlace(); guard++); // put every picked card somewhere sensible
}

// Play `lives` lives (endless waves, so each ends in death) with one bot (roguelike: each life starts from nothing).
// Between waves the bot picks its card, looks after its base, and starts the next wave after 20 seconds.
// Returns one row per life.
export async function playSeasons(d, bot, lives, onSeason) {
  const rows = [];
  for (let life = 1; life <= lives; life++) {
    d.resetGame();
    let secs = 0, homeSecs = 0;
    while (d.phase !== 'end' && secs < 4000) {
      if (d.phase === 'home') {
        // Between waves: pick the card, look after the base, then start the next wave.
        handleCards(d, bot);
        homeSecs++;
        if (homeSecs === 5) bot.atHome(d, life);
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
      towers: d.game.buildings.filter((b) => b.type === 'tower' && b.hp > 0).length,
      minutes: Math.round(secs / 60),
    };
    rows.push(row);
    onSeason?.(row);
  }
  return rows;
}