# Questions

The running list of things to decide. Each has a proposed answer to react to: say yes, change it, or
replace it. Answered ones move into DESIGN.md.

## 1. The House and gating
1. **What does a House level unlock?** Proposal: House level N lets walls and towers go up to level N,
   unlocks one new building or NPC role per level, and raises the number of land plots you can own.
2. **What does upgrading the House cost?** Proposal: gold *and* a second resource from level 3 up
   (food), with science needed from level 6 up, so every resource matters by mid-game.
3. **How long should a House upgrade take, in real time?** Proposal: a build timer that runs even when
   the game is closed. Level 2: 5 minutes. Level 5: a few hours. Level 10: a couple of days. You can't
   Defend while the House is being upgraded (or can you?).
4. **Who does the building work?** Proposal: a Builder NPC. One builder = one upgrade at a time. A second
   builder is a big unlock later.

## 2. Pace and the long game
5. **Where does the "takes forever" feeling come from?** Options: (a) build timers, (b) resources that
   trickle in slowly, (c) both. Proposal: both, like Clash of Clans, but with Defend runs as the way to
   speed things up: a good run pays well.
6. **How often do you Defend?** Proposal: whenever you want, but each run costs food to start (feeding
   the villagers), so you can't farm runs endlessly.
7. **Do waves scale with your House level?** Proposal: yes. A level 1 base sees slimes; a level 6 base
   sees orcs and new monster types. Wave 10 is always the boss.

## 3. Resources
8. **Three resources: gold, food, science. What is each for?** Proposal: gold = walls, towers, land;
   food = House upgrades and starting runs; science = tower upgrades and traps.
9. **How do quarries, farms and labs work?** Proposal: each produces per hour up to a storage cap;
   you tap to collect. Higher level = more per hour and bigger cap. Assigning the right NPC boosts it.
10. **Can monsters damage resource buildings?** Proposal: yes, and they drop part of their stored
    resources when broken, so you want them inside the walls.
11. **Do you need storage buildings (like CoC's gold storage)?** Proposal: no at first. The House stores
    everything, with a cap that grows with its level.

## 4. NPCs
12. **Where do NPCs come from?** Proposal: each House level brings one new villager. Their role is random
    from a pool you've unlocked, so two players get different villages.
13. **What does a role do?** Proposal: an NPC assigned to a matching building doubles its output or power
    (a Miner at a quarry, an Archer in a tower, a Builder on an upgrade).
14. **What happens to NPCs during a wave?** Proposal: unassigned ones hide in the House. Assigned ones
    stay at their building. If it falls, they're hurt and need time (or food) to recover.
15. **Can NPCs level up?** Proposal: yes, slowly, by doing their job; a level 3 Archer is noticeably better.

## 5. Towers and traps
16. **Tower types?** Proposal: Archer (fast, single target), Cannon (slow, splash, from House level 3),
    Frost (slows, from level 5), Ballista (long range, pierces, from level 7). Each has 10 levels.
17. **Traps?** Proposal: spike pit (damages once, rearms with gold), bomb (big splash, one use), tar
    (slows, permanent). Placed on tiles like walls.
18. **Where do cards fit now?** The original idea was a card pick each wave. With permanent progression,
    options: (a) keep cards as temporary run-only boosts (a free tower for this run), (b) cards become the
    way you get NPCs and blueprints, (c) drop cards. Proposal: (a), as the roguelike spice on top.

## 6. Waves and monsters
19. **More monster types?** Proposal: Wall-breaker (targets walls, explodes), Bat (flies over walls, weak),
    Troll (very tough, slow), Witch (heals others). Each appears from a certain House level.
20. **Multiple roads later?** Proposal: at House level 5 a second cave opens on the east with its own road,
    so you have to defend two sides.

## 6b. Monster smarts (idea drop, 2026-10-06)
"Monsters should be able to destroy walls and every building on their path to the House, but be smart
enough to decide whether to destroy a wall or go around it."
- Already true: they pick the cheapest route counting wall health, and smash anything that blocks it
  (walls, towers, trees). `DETOUR_PER_HP` sets how far they'll walk to avoid smashing.
- To decide: should they also attack a tower that's shooting them even if it's not in the way?
  Proposal: most monsters ignore it; a "Raider" type goes for towers and farms first.
- To decide: should damaged walls look more tempting? (Yes now: a half-health wall counts as half the detour.)

## 6c. Villagers at wave start (idea drop, 2026-10-06) — TO BUILD
"When starting a round, the NPCs shouldn't just disappear; they should run into the base."
- Plan: on DEFEND!/NEXT WAVE, villagers run (faster than walking) along a real path to the House door,
  then go inside. The wave can start at the same time; monsters take ~20s to arrive anyway.
- To decide: what if a villager is caught outside when monsters arrive? Proposal: they can be hurt, which
  is where "keep your NPCs safe" starts to matter.

## 7. Friends' bases (later)
21. **What do you do at a friend's base?** Options: just look, or watch a replay of their last defense,
    or send them help (an NPC on loan). Proposal: look + replay first.

## 8. Already decided
- One north road from a cave through the forest; monsters always target the House.
- 3×3 House, 10 levels, trailer → bunker. 10 wall levels to match.
- Towers level by upgrading, never from dealing damage.
- Play is local for now; online (and friends' bases) later.
