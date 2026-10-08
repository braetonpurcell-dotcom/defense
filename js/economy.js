// The economy: gold (the only money: you earn it killing zombies), building and upgrading. There are no
// limits and no timers: if you can pay for it, it happens now.
// Everything takes `game` (the save object), so it can be tested.

import { MAX_LEVEL, BUILD_COST, upgradeCost, hpFor } from './config.js';

export const RES = ['gold'];
const SHORT = { gold: 'G' };

// How many you own: on the map plus any put away in your items (so storing things never gets you extra).
export const countOf = (game, type) => game.buildings.filter((b) => b.type === type).length
  + (game.items || []).filter((i) => i.type === type).reduce((sum, i) => sum + i.n, 0);

export const canAfford = (game, cost) => RES.every((r) => (game[r] || 0) >= (cost[r] || 0));
export const missing = (game, cost) => RES.find((r) => (game[r] || 0) < (cost[r] || 0));
const pay = (game, cost) => { for (const r of RES) game[r] -= cost[r] || 0; };

export const formatCost = (cost) => RES.filter((r) => cost[r]).map((r) => `${cost[r]}${SHORT[r]}`).join(' ') || 'FREE';

// Add resources. Returns how much went in.
export function earn(game, res, amount) {
  const take = Math.max(0, amount);
  game[res] = (game[res] || 0) + take;
  return take;
}

// ---------- Building new things ----------

// Why can't you build another of this type? null = you can.
export function buildBlock(game, type) {
  const cost = BUILD_COST[type];
  if (!canAfford(game, cost)) return `NOT ENOUGH ${missing(game, cost).toUpperCase()}`;
  return null;
}

// Add a new building (placement already checked). Returns it.
export function build(game, type, c, r) {
  pay(game, BUILD_COST[type]);
  const b = { id: game.nextId++, type, c, r, level: 1, hp: hpFor(type, 1) };
  game.buildings.push(b);
  return b;
}

// ---------- Upgrading ----------

// Why can't this be upgraded right now? null = it can.
export function upgradeBlock(game, b) {
  const cost = upgradeCost(b.type, b.level || 1);
  if (!cost) return b.level >= MAX_LEVEL ? 'MAX LEVEL' : 'CANNOT UPGRADE';
  if (b.hp <= 0) return 'REPAIR IT FIRST';
  if (!canAfford(game, cost)) return `NOT ENOUGH ${missing(game, cost).toUpperCase()}`;
  return null;
}

// Pay and level up on the spot. A building at full health stays at full health.
export function upgrade(game, b) {
  pay(game, upgradeCost(b.type, b.level || 1));
  const wasFull = b.hp >= hpFor(b.type, b.level);
  b.level++;
  if (wasFull) b.hp = hpFor(b.type, b.level);
}
