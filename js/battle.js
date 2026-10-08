// A wave in progress: monsters, towers shooting, traps, run-card effects.
//
// Zombies hunt your towers. They follow a "flow field": every walkable tile knows how costly it is to reach the
// nearest target from there. Targets are every standing tower, card tower, the hero's pad, a Gold Mine and a
// Scarecrow; only when none is left standing is the village entrance the target. Open ground costs 1 per tile;
// a tile with a wall costs more the more health it has, so zombies walk around walls when there's a way and
// smash through when there isn't (walls are never targets themselves: Clash of Clans style).
// Traps are walkable: monsters step on them.

import {
  T, N, NR, MONSTERS, BUILDINGS, CARDS, CARD_POWER, waveList, hpScale, damageScale, sizeOf, towerStats, DETOUR_PER_HP,
  waveLevel,
} from './config.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Tiny binary heap of [cost, index] pairs for the flow field.
function makeHeap() {
  const h = [];
  return {
    get size() { return h.length; },
    push(d, i) {
      h.push([d, i]);
      let k = h.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (h[p][0] <= h[k][0]) break;
        [h[p], h[k]] = [h[k], h[p]];
        k = p;
      }
    },
    pop() {
      const top = h[0];
      const last = h.pop();
      if (h.length) {
        h[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1, r = l + 1;
          let m = k;
          if (l < h.length && h[l][0] < h[m][0]) m = l;
          if (r < h.length && h[r][0] < h[m][0]) m = r;
          if (m === k) break;
          [h[m], h[k]] = [h[k], h[m]];
          k = m;
        }
      }
      return top;
    },
  };
}

const isTrap = (b) => !!BUILDINGS[b.type].trap;
// What zombies hunt: towers (archer and card towers), the hero's pad, a Gold Mine and the Scarecrow decoy.
export const isTarget = (b) => b.type === 'tower' || b.type === 'heropad' || CARDS[b.type]?.kind === 'tower'
  || CARDS[b.type]?.kind === 'mine' || !!CARDS[b.type]?.decoy;
const isWallish = (b) => b.type === 'wall' || b.type === 'barricade';
// Wall-breakers care this much (of a normal zombie) about a wall in the way: they walk straight through.
const BREAKER_WALL_COST = 0.08;
const tileCenter = (c, r) => ({ x: c * T + T / 2, y: r * T + T / 2 });

export class Battle {
  // world: { buildings(), goals() -> [{c, r}] (the village entrance), walkable(c, r), cave() -> {c, r},
  //          onKill(monster), onDestroyed(building), onBreakthrough(monster),
  //          maxHp(building), run() -> { blessings, omen } }
  constructor(world) {
    this.w = world;
    this.reset();
  }

  reset() {
    this.monsters = [];
    this.shots = [];
    this.effects = [];   // short-lived visuals: zaps, blasts, bursts
    this.queue = [];
    this.active = false;
    this.villageLost = false;
    this.wave = 0;
    this.time = 0;
    this.spawnCount = 0;
    this.spawnClock = 0;
    this.secondWindUsed = false;
    this.cooldown = new WeakMap(); // tower -> seconds until next shot
    this.flash = new WeakMap();    // building -> seconds of white hit flash
    this.flowDirty = false;
  }

  // The wave is over (cleared): nothing left to fight, no hit flashes left lit.
  endWave() {
    this.active = false;
    this.monsters = [];
    this.shots = [];
    this.flash = new WeakMap();
  }

  get mods() {
    const r = this.w.run?.() || {};
    return { blessings: r.blessings || {}, omen: r.omen || {} };
  }

  startWave(n) {
    this.wave = n;
    this.level = waveLevel(n); // zombie scaling follows the wave
    this.queue = waveList(n, this.mods.omen);
    this.spawnClock = 0.5;
    this.active = true;
    this.villageLost = false;
    this.recomputeFlow();
  }

  get remaining() { return this.queue.length + this.monsters.length; }
  get cleared() { return this.active && this.remaining === 0; }

  recomputeFlow() {
    // Every tile a standing building covers. Traps don't block.
    const bmap = new Map();
    for (const b of this.w.buildings()) {
      if (b.hp <= 0 || isTrap(b)) continue;
      const s = sizeOf(b);
      for (let r = b.r; r < b.r + s; r++) for (let c = b.c; c < b.c + s; c++) bmap.set(r * N + c, b);
    }
    this.bmap = bmap;
    this.traps = this.w.buildings().filter((b) => isTrap(b) && b.hp > 0);
    // The targets: every standing tower, pad, mine and decoy. With none left, the village entrance.
    const sources = [];
    for (const b of this.w.buildings()) {
      if (!isTarget(b) || b.hp <= 0) continue;
      const s = sizeOf(b);
      for (let r = b.r; r < b.r + s; r++) for (let c = b.c; c < b.c + s; c++) sources.push(r * N + c);
    }
    this.goalSet = new Set(this.w.goals().map((g) => g.r * N + g.c));
    this.huntingVillage = !sources.length;
    if (this.huntingVillage) sources.push(...this.goalSet);

    // Cost of stepping onto tile i: 1, plus the effort of smashing whatever stands there (a target costs
    // nothing extra: it's what they came for).
    const enterCost = (i) => {
      const b = bmap.get(i);
      return b && !isTarget(b) ? 1 + b.hp * DETOUR_PER_HP : 1;
    };
    this.enterCost = enterCost;
    this.dist = this.flood(this.distBuf ||= new Float32Array(N * NR), sources, enterCost);
    // Wall-breakers get their own field, where walls barely count.
    if (this.wave >= MONSTERS.breaker.debut) {
      const breakerCost = (i) => {
        const b = bmap.get(i);
        return b && !isTarget(b) ? 1 + b.hp * DETOUR_PER_HP * (isWallish(b) ? BREAKER_WALL_COST : 1) : 1;
      };
      this.breakerCost = breakerCost;
      this.distBreaker = this.flood(this.distBreakerBuf ||= new Float32Array(N * NR), sources, breakerCost);
    }
  }

  // Dijkstra out from the source tiles over walkable ground (N wide × NR tall, index r * N + c).
  flood(dist, sources, enterCost) {
    dist.fill(Infinity);
    const heap = makeHeap();
    for (const i of sources) { dist[i] = 0; heap.push(0, i); }
    while (heap.size) {
      const [d, i] = heap.pop();
      if (d > dist[i]) continue;
      const c = i % N, r = (i - c) / N;
      const nd = d + enterCost(i);
      for (const [dc, dr] of DIRS) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= N || nr >= NR || !this.w.walkable(nc, nr)) continue;
        const j = nr * N + nc;
        if (nd < dist[j]) { dist[j] = nd; heap.push(nd, j); }
      }
    }
    return dist;
  }

  update(dt) {
    if (!this.active) return;
    this.time += dt;
    if (this.queue.length) {
      this.spawnClock -= dt;
      if (this.spawnClock <= 0) {
        const s = this.queue.shift();
        this.spawn(s.type);
        this.spawnClock = s.gap;
      }
    }
    for (const m of this.monsters) this.updateMonster(m, dt);
    this.updateTowers(dt);
    this.updateShots(dt);
    this.effects = this.effects.filter((e) => (e.t += dt) < e.life);
    this.monsters = this.monsters.filter((m) => !m.dead);
    // A building fell (or the hero's pad moved) this update: the routes change once, at the end.
    if (this.flowDirty) { this.flowDirty = false; this.recomputeFlow(); }
  }

  spawn(type) {
    const def = MONSTERS[type];
    const cave = this.w.cave();
    const c = cave.c + (this.spawnCount++ % 2);
    const hp = Math.round(def.hp * hpScale(this.wave) * (this.mods.omen.hpMul || 1));
    this.monsters.push({
      type, def, hp, maxHp: hp, damage: Math.round(def.damage * damageScale(this.level)),
      c, r: cave.r, x: c * T + T / 2, y: cave.r * T + T / 2,
      next: null, atk: 0.3, flash: 0, t: Math.random() * 10, attacking: null,
      slowUntil: 0, slowMul: 1, poison: 0, stun: 0, dead: false,
      ox: Math.round((Math.random() - 0.5) * 6), oy: Math.round((Math.random() - 0.5) * 4),
    });
  }

  // Step to the neighbouring tile that's the cheapest way to a target, counting the effort of
  // smashing anything standing there (random pick among equally good ones).
  pickNext(m) {
    const breaker = m.def.breaker && this.distBreaker;
    const dist = breaker ? this.distBreaker : this.dist, cost = breaker ? this.breakerCost : this.enterCost;
    let best = Infinity;
    let options = [];
    for (const [dc, dr] of DIRS) {
      const c = m.c + dc, r = m.r + dr;
      if (c < 0 || r < 0 || c >= N || r >= NR) continue;
      const d = dist[r * N + c] + cost(r * N + c);
      if (d < best - 1e-4) { best = d; options = [{ c, r }]; } else if (Math.abs(d - best) <= 1e-4) options.push({ c, r });
    }
    return best < Infinity ? options[Math.floor(Math.random() * options.length)] : null;
  }

  speedOf(m) {
    if (m.stun > 0) return 0;
    let mul = this.time < m.slowUntil ? m.slowMul : 1;
    for (const t of this.traps) {
      if (t.type === 'tar' && t.hp > 0 && Math.abs(t.c - m.c) <= 1 && Math.abs(t.r - m.r) <= 1) {
        mul = Math.min(mul, 1 - CARDS.tar.slow * CARD_POWER);
      }
    }
    return m.def.speed * (this.mods.omen.speedMul || 1) * Math.max(0.15, mul);
  }

  updateMonster(m, dt) {
    if (m.dead) return;
    m.t += dt;
    m.flash = Math.max(0, m.flash - dt);
    m.stun = Math.max(0, m.stun - dt);
    if (m.poison > 0) {
      m.poison -= dt;
      this.hitMonster(m, 2 * CARD_POWER * dt, true);
      if (m.dead) return;
    }
    m.attacking = null;
    if (m.stun > 0) return;
    if (!m.next) {
      m.next = this.pickNext(m);
      if (!m.next) return;
    }
    const b = this.bmap.get(m.next.r * N + m.next.c);
    if (b && b.hp > 0) {
      m.attacking = b;
      m.atk -= dt;
      if (m.atk <= 0) {
        m.atk = m.def.rate;
        this.hitBuilding(b, m.damage * (isWallish(b) ? m.def.wallMul || 1 : 1));
      }
      return;
    }
    const tx = m.next.c * T + T / 2, ty = m.next.r * T + T / 2;
    const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
    const step = this.speedOf(m) * dt;
    if (d <= step) {
      m.x = tx; m.y = ty; m.c = m.next.c; m.r = m.next.r; m.next = null;
      if (this.goalSet.has(m.r * N + m.c)) { this.breakthrough(m); return; }
      this.stepOnTraps(m);
    } else {
      m.x += (dx / d) * step;
      m.y += (dy / d) * step;
    }
  }

  stepOnTraps(m) {
    for (const t of this.traps) {
      if (t.hp <= 0 || t.c !== m.c || t.r !== m.r) continue;
      if (t.type === 'spikes') {
        this.hitMonster(m, CARDS.spikes.damage * CARD_POWER);
        t.charges = (t.charges ?? CARDS.spikes.charges) - 1;
        this.effects.push({ kind: 'burst', x: m.x, y: m.y, t: 0, life: 0.2, color: 'w' });
        if (t.charges <= 0) this.breakTrap(t);
      } else if (t.type === 'bomb') {
        const p = tileCenter(t.c, t.r);
        this.blast(p.x, p.y, CARDS.bomb.splash * T, CARDS.bomb.damage * CARD_POWER);
        this.breakTrap(t);
      }
    }
  }

  breakTrap(t) {
    t.hp = 0;
    this.w.onDestroyed(t);
  }

  blast(x, y, radius, damage) {
    this.effects.push({ kind: 'blast', x, y, r: radius, t: 0, life: 0.3 });
    for (const m of this.monsters) if (!m.dead && Math.hypot(m.x - x, m.y - y) <= radius) this.hitMonster(m, damage);
  }

  hitBuilding(b, damage) {
    b.hp = Math.max(0, b.hp - damage);
    this.flash.set(b, 0.12);
    if (b.hp > 0) return;
    this.w.onDestroyed(b);
    this.flowDirty = true;
  }

  // A zombie reached the village. That's the run over - unless Second Wind is still unused: then that
  // zombie drops dead and every other one is stunned for 3 seconds.
  breakthrough(m) {
    if (this.mods.blessings.secondwind && !this.secondWindUsed) {
      this.secondWindUsed = true;
      for (const o of this.monsters) o.stun = 3;
      this.effects.push({ kind: 'blast', x: m.x, y: m.y, r: 5 * T, t: 0, life: 0.6, color: 'w' });
      this.hitMonster(m, m.hp + 1);
      return;
    }
    this.villageLost = true;
    this.w.onBreakthrough?.(m);
  }

  // Stats for anything that shoots, with run blessings and the omen applied.
  towerDef(b) {
    let d;
    if (b.type === 'tower') d = { ...towerStats(b.level || 1), shot: 'arrow' };
    else {
      const c = CARDS[b.type];
      if (!c || c.kind !== 'tower') return null;
      d = { ...c, damage: c.damage * CARD_POWER, range: c.range * T, chainDamage: (c.chainDamage || 0) * CARD_POWER };
    }
    const { blessings, omen } = this.mods;
    d.damage *= 1 + 0.25 * (blessings.arrows || 0);
    d.chainDamage = (d.chainDamage || 0) * (1 + 0.25 * (blessings.arrows || 0));
    if (d.shot !== 'aura') d.range = Math.max(1.5 * T, d.range + ((blessings.hawkeye ? 1 : 0) + (omen.rangeAdd || 0)) * T);
    return d;
  }

  updateTowers(dt) {
    for (const b of this.w.buildings()) {
      if (this.flash.has(b)) {
        const f = this.flash.get(b) - dt;
        if (f <= 0) this.flash.delete(b); else this.flash.set(b, f);
      }
      if (b.hp <= 0) continue;
      if (b.type !== 'tower' && CARDS[b.type]?.kind !== 'tower') continue;
      // Cooldown first: most towers can't fire this update, so don't build their stats.
      const cd = (this.cooldown.get(b) || 0) - dt;
      this.cooldown.set(b, cd);
      if (cd > 0) continue;
      const def = this.towerDef(b);
      if (!def) continue;
      const s = sizeOf(b);
      const cx = (b.c + s / 2) * T, cy = b.r * T + 6;

      if (def.shot === 'aura') {
        const near = this.monsters.filter((m) => !m.dead && Math.hypot(m.x - cx, m.y - (b.r + 0.5) * T) <= def.range);
        if (near.length) {
          this.cooldown.set(b, def.rate);
          for (const m of near) this.hitMonster(m, def.damage);
        }
        continue;
      }

      let target = null, best = Infinity;
      for (const m of this.monsters) {
        if (m.dead || Math.hypot(m.x - cx, m.y - cy) > def.range) continue;
        const progress = this.dist[m.r * N + m.c]; // lower = closer to the village
        if (progress < best) { best = progress; target = m; }
      }
      if (!target) continue;
      this.cooldown.set(b, def.rate);

      if (def.shot === 'zap') {
        // Instant: hit the target, then jump to the nearest unhit monsters.
        const hit = new Set([target]);
        const pts = [{ x: cx, y: b.r * T }, { x: target.x, y: target.y }];
        this.hitMonster(target, def.damage);
        let from = target;
        for (let i = 0; i < (def.chain || 0); i++) {
          let next = null, nd = 2 * T;
          for (const m of this.monsters) {
            if (m.dead || hit.has(m)) continue;
            const d = Math.hypot(m.x - from.x, m.y - from.y);
            if (d < nd) { nd = d; next = m; }
          }
          if (!next) break;
          hit.add(next);
          pts.push({ x: next.x, y: next.y });
          this.hitMonster(next, def.chainDamage);
          from = next;
        }
        this.effects.push({ kind: 'zap', pts, t: 0, life: 0.18 });
        continue;
      }

      const dx = target.x - cx, dy = target.y - 4 - cy, len = Math.hypot(dx, dy) || 1;
      this.shots.push({
        x: cx, y: cy, vx: dx / len, vy: dy / len, target, def, kind: def.shot, travelled: 0, hits: new Set(),
      });
    }
  }

  updateShots(dt) {
    for (const s of this.shots) {
      if (s.kind === 'bolt') {
        // Flies straight, piercing through up to `pierce` monsters.
        const step = 340 * dt;
        s.x += s.vx * step; s.y += s.vy * step; s.travelled += step;
        for (const m of this.monsters) {
          if (m.dead || s.hits.has(m) || Math.hypot(m.x - s.x, m.y - 4 - s.y) > 10) continue;
          s.hits.add(m);
          this.applyHit(m, s.def);
          if (s.hits.size >= s.def.pierce) { s.done = true; break; }
        }
        if (s.travelled > s.def.range + T) s.done = true;
        continue;
      }
      const t = s.target;
      if (t.dead) {
        // Splash shots still land where the target was; others fizzle.
        if (s.def.splash) { this.blast(s.x, s.y, s.def.splash * T, s.def.damage); }
        s.done = true;
        continue;
      }
      const dx = t.x - s.x, dy = t.y - 4 - s.y, d = Math.hypot(dx, dy);
      const step = (s.kind === 'ball' ? 180 : 260) * dt;
      if (d <= step) {
        s.done = true;
        if (s.def.splash) this.blast(t.x, t.y, s.def.splash * T, s.def.damage);
        else this.applyHit(t, s.def);
      } else {
        s.vx = dx / d; s.vy = dy / d;
        s.x += s.vx * step;
        s.y += s.vy * step;
      }
    }
    this.shots = this.shots.filter((s) => !s.done);
  }

  applyHit(m, def) {
    this.hitMonster(m, def.damage);
    if (def.slow) {
      // def.slow = speed multiplier (0.6 = 60% speed); CARD_POWER makes it stronger.
      m.slowUntil = this.time + (def.slowFor || 2);
      m.slowMul = Math.max(0.2, 1 - (1 - def.slow) * CARD_POWER);
    }
  }

  hitMonster(m, damage, quiet = false) {
    if (m.dead) return;
    m.hp -= damage;
    if (!quiet) {
      m.flash = 0.12;
      if (this.mods.blessings.poison) m.poison = 4;
    }
    if (m.hp <= 0) { m.dead = true; this.w.onKill(m); }
  }
}
