// The base-building economy: gold (the only money - you earn it killing zombies), building and upgrading
// (with the builder's timer). v2: no limits, gold is the only one.
// Everything takes `game` (the save object) and `now` (game-clock milliseconds), so it can be tested.

import {
  MAX_LEVEL, BUILD_COST, upgradeCost, hpFor,
} from './config.js';

export const RES = ['gold'];
const SHORT = { gold: 'G' };

// How many you own: on the map plus any put away in your items (so storing things never gets you extra).
export const countOf = (game, type) => game.buildings.filter((b) => b.type === type).length
  + (game.items || []).filter((i) => i.type === type).reduce((sum, i) => sum + i.n, 0);

export const canAfford = (game, cost) => RES.every((r) => (game[r] || 0) >= (cost[r] || 0));
export const missing = (game, cost) => RES.find((r) => (game[r] || 0) < (cost[r] || 0));
const pay = (game, cost) => { for (const r of RES) game[r] -= cost[r] || 0; };

export const formatCost = (cost) => RES.filter((r) => cost[r]).map((r) => `${cost[r]}${SHORT[r]}`).join(' ') || 'FREE';

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `${s}S`;
  if (s < 3600) return `${Math.floor(s / 60)}M ${s % 60}S`;
  if (s < 86400) return `${Math.floor(s / 3600)}H ${Math.floor((s % 3600) / 60)}M`;
  return `${Math.floor(s / 86400)}D ${Math.floor((s % 86400) / 3600)}H`;
}

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
export function build(game, type, c, r, now) {
  pay(game, BUILD_COST[type]);
  const b = { id: game.nextId++, type, c, r, level: 1, hp: hpFor(type, 1) };
  game.buildings.push(b);
  return b;
}

// ---------- Upgrading ----------

export const underConstruction = (game, b) => game.builder?.id === b.id;

// Why can't this be upgraded right now? null = it can.
export function upgradeBlock(game, b) {
  const cost = upgradeCost(b.type, b.level || 1);
  if (!cost) return b.level >= MAX_LEVEL ? 'MAX LEVEL' : 'CANNOT UPGRADE';
  if (b.hp <= 0) return 'REPAIR IT FIRST';
  if (underConstruction(game, b)) return 'UPGRADING';
  if (cost.time > 0 && game.builder) return 'BUILDER IS BUSY';
  if (!canAfford(game, cost)) return `NOT ENOUGH ${missing(game, cost).toUpperCase()}`;
  return null;
}

function levelUp(game, b) {
  const wasFull = b.hp >= hpFor(b.type, b.level);
  b.level++;
  if (wasFull) b.hp = hpFor(b.type, b.level);
}

// Pay and start. Walls finish instantly; everything else hands the job to the builder.
export function startUpgrade(game, b, now) {
  const cost = upgradeCost(b.type, b.level || 1);
  pay(game, cost);
  if (cost.time <= 0) { levelUp(game, b); return true; }
  game.builder = { id: b.id, start: now, until: now + cost.time * 1000 };
  return false;
}

// If the builder's job is done, apply it. Returns the finished building, or null.
export function finishBuilder(game, now) {
  if (!game.builder || now < game.builder.until) return null;
  const b = game.buildings.find((x) => x.id === game.builder.id);
  game.builder = null;
  if (b) levelUp(game, b);
  return b || null;
}

// For testing: make the builder finish now.
export function rushBuilder(game, now) {
  if (game.builder) game.builder.until = now;
  return finishBuilder(game, now);
}
