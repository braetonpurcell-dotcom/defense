# Bug report (QA pass, 2026-10-06)

Tested in a sandbox tab (`http://localhost:8080/?bots=1`) through `window.defense`. The builder was editing
files during the pass, so line numbers are from the copy on disk at the end (main.js about 1820 lines).
Most severe first.

---

## 1. The House is saved with 0 hp (or damaged), and a reload leaves it broken. The next run's wave never ends.

- **Where:** `js/main.js:790` `endRun()` calls `saveGame()` while the House is rubble. `js/main.js:179` `saveGame()` only caps hp at the maximum and never raises it. `js/main.js:802` `goHome()` is the only place the House is rebuilt. `js/main.js:749` `startRun()` does not heal it. `js/battle.js:117` skips goals with `hp <= 0`. `js/battle.js:181` `pickNext` then returns null.
- **What goes wrong:**
  - Lose a run, then reload or close the app on the "HOUSE DESTROYED" popup without tapping GO HOME. The save has the House at hp 0, and it loads that way.
  - REPAIR can't fix it, because the House has `repair: 0`, so `repairCostOf` is 0 and it is never in the repair list.
  - UPGRADE refuses with "REPAIR IT FIRST".
  - On the next run, with no live House the flow field has no goals and every tile's distance is Infinity. Monsters stand at the cave forever and the wave never ends (soft lock). The only way out is a Lucky Stars omen, which sets House hp to 75%.
  - A milder version happens more often. `saveGame` also runs mid-wave: when the app is backgrounded (`visibilitychange`, main.js:1820), when the builder finishes (main.js:1802), and after each cleared wave. A reload then leaves a damaged House at home that can't be repaired and starts the next run damaged. Trees and decorations also stay broken.
- **Repro (CONFIRMED):**
  ```js
  const d = window.defense; d.resetGame();
  d.game.buildings.find(b => b.type === 'house').hp = 0;   // what a reload after a lost run gives you
  d.startRun(); while (d.cardChoices) d.skipCard(); d.nextWave(); d.step(200);
  [d.phase, d.battle.remaining, [...d.battle.dist].filter(Number.isFinite).length]
  // -> ['wave', 8, 0]  monsters stuck at (24,0)/(25,0) after 200 s
  ```
  Damaged-House variant: `house.hp = 50; d.repairAll()` spends 0 gold and the House stays at 50.
- **Fix:** In `saveGame`, write the House (and trees/decor) at full hp, the same as `goHome` does. That keeps the save in the "after the run" state. In `loadGame`/`upgradeSave`, also restore the House to full hp as a safety net. Optionally, have `startRun` heal the House before applying `houseStart`.

## 2. A House upgrade that finishes during a wave fully heals the House mid-fight

- **Where:** `js/main.js:1802` (`tick` calls `finishBuilder` in every phase) and `js/economy.js:79` `levelUp` (`b.type === 'house'` sets hp to the new full value).
- **What goes wrong:** Start a long House upgrade, then go defend. When the timer ends mid-wave, the House jumps to full hp at the next level, a free heal. Storage caps and building limits also change mid-run, but `battle.houseLevel` (monster scaling) stays the old level until the next wave.
- **Repro (CONFIRMED):**
  ```js
  const d = window.defense; d.resetGame();
  const h = d.game.buildings.find(b => b.type === 'house');
  d.game.gold = 1000; d.upgrade(h);
  d.startRun(); while (d.cardChoices) d.skipCard(); d.nextWave(); d.step(40);
  const before = h.hp;                       // 225
  d.game.builder.until = Date.now(); d.step(0.1);
  [before, h.hp, h.level]                    // -> [225, 435, 2]
  ```
- **Fix:** Don't call `finishBuilder` while `phase !== 'home'`, and let it complete on returning home (the timer has already passed). Or keep the current hp fraction on a House level-up instead of healing it to full.

## 3. Upgrading a resource building pays out the time already stored at the new, higher rate

- **Where:** `js/economy.js` `stored()` (about line 127) works out the amount from `since` with the building's current level. `levelUp` (line 79) doesn't settle what was produced at the old level.
- **What goes wrong:**
  - Quarries and labs: hours stored before the upgrade are paid at the new level's rate and cap.
  - Farms: a ready crop becomes the new level's crop the moment the upgrade finishes.
  - Production also keeps running during the upgrade. Each upgrade gives about 60% extra on whatever was waiting.
- **Repro (CONFIRMED with the farm code before the crop rewrite; the same logic still applies to quarry, lab and farm crop):**
  ```js
  const d = window.defense; d.resetGame();
  const h = d.game.buildings.find(b => b.type === 'house');
  const q = d.game.buildings.find(b => b.type === 'quarry');
  d.game.gold = 900; d.upgrade(h); d.rushBuilder();
  q.since = Date.now() - 6 * 3600e3;    // full at LV1 = 240 gold
  d.game.gold = 80; d.upgrade(q);       // LV1->2 costs 80 gold, leaves 0
  d.rushBuilder(); const g0 = d.game.gold; d.collectAll(); d.game.gold - g0
  // farm before the rewrite: 288 collected instead of 180. Quarry should give 384 instead of 240.
  ```
- **Fix:** When an upgrade starts (or in `levelUp`), first convert what is stored: collect it automatically, or rescale `since` so that `stored` at the new rate equals the old amount (`since = now - oldAmount / newRate`). For farms, keep the crop size fixed when the crop was planted.

## 4. Destroyed resource buildings keep producing, so a repair pays out a full building

- **Where:** `js/economy.js` `stored()`: `b.hp <= 0` returns 0, but `since` keeps counting, and `repairAll` (main.js about line 822) doesn't reset it.
- **What goes wrong:** A quarry or farm smashed during a run fills to its 6-hour cap (or crop) while it is rubble. Repair it and it can be collected straight away.
- **Repro (CONFIRMED):**
  ```js
  const d = window.defense; d.resetGame();
  const f = d.game.buildings.find(b => b.type === 'farm');   // or 'quarry'
  f.hp = 0; f.since = Date.now() - 10 * 3600e3;
  d.repairAll(); const f0 = d.game.food; d.collectAll(); d.game.food - f0   // -> 180 (full)
  ```
- **Fix:** When a building is destroyed (battle `onDestroyed`), store the elapsed amount or a `brokenAt` time. On repair, set `since` so the downtime isn't counted. At minimum, set `b.since = now` in `repairAll` for buildings repaired from 0 hp.

## 5. Pressing on the HUD or bottom bar, dragging onto the map and letting go counts as a tap on the map

- **Where:** `js/main.js:1137` (`drag.ui = onUI(...)`), `js/main.js:1159` (`moved` is only updated when `!drag.ui`), and `js/main.js:1167` `endPointer`, which fires `onTap` because `moved` is still false.
- **What goes wrong:** A press that starts on UI never becomes a drag, so lifting the finger anywhere counts as a tap at that spot. Sliding off a button onto the map can select a building, move the selected building to the release tile, place a wall or decor while placing, or open the buy-land popup.
- **Repro (CONFIRMED):**
  ```js
  const d = window.defense; d.resetGame();
  const cv = document.getElementById('game');
  const fire = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: x, clientY: y, bubbles: true }));
  const p = d.worldToScreen(24.5 * 24, 24.5 * 24);           // House centre
  fire('pointerdown', 10, innerHeight - 5);                    // bottom bar
  fire('pointermove', p.x, p.y); fire('pointerup', p.x, p.y);
  d.selected?.type                                             // -> 'house'
  ```
- **Fix:** In `pointermove`, always update `drag.moved` when the pointer goes past 8 px, and only skip the camera pan when `drag.ui`. Optionally, also require the release point to be on the same UI element as the press.

## 6. Tapping the panel where no button is drawn still upgrades or shows a toast (hit area doesn't match what's drawn)

- **Where:** `js/main.js:1089` `onTap` panel branch, compared with `drawInfoPanel`, which returns before drawing the buttons for run cards (`:1415`) and for trees and decor (`:1444`).
- **What goes wrong:**
  - Tree or decoration selected at home: tapping the empty top-right of the panel calls `tryUpgrade` and shows "CANNOT UPGRADE".
  - Run card selected in the break: the same spot shows "UPGRADE WHEN YOU ARE HOME", which makes no sense for a card that can never be upgraded.
  - Harmless to the save, but the tap areas don't match what's drawn.
- **Status:** Suspected from reading. Not clicked in the browser.
- **Fix:** In `onTap`, use the same condition `drawInfoPanel` uses (`!def.run && b.type !== 'tree' && !def.decor`) before checking `buttons.upgrade` / `upgradeAll`.

## 7. "ALL WALLS" shows the wrong message when there's nothing to upgrade

- **Where:** `js/main.js:879`. `upgradeBlock(game, walls[0] || {})` with an empty list calls `upgradeBlock({})`. That returns "CANNOT UPGRADE" (not null), so the "NOTHING TO UPGRADE" fallback can never show. This happens, for example, when every wall at that level is rubble. The player should be told to repair, not that walls can't be upgraded.
- **Related:** The button label `ALL ${same}` (`drawInfoPanel`) counts rubble walls that the action then skips.
- **Status:** Suspected from reading.
- **Fix:** If `walls.length === 0`, show "NOTHING TO UPGRADE" (or "REPAIR WALLS FIRST" if rubble walls exist at that level). Count only standing walls in the label.

---

### Checked and found OK
- Run cards are never saved: `saveGame` filters `run` objects.
- Stonemason bonus hp doesn't carry over: confirmed in the browser. A wall goes 60 -> 90 during the run and back to 60 after `goHome`, and saves cap hp at the base value.
- Resources can't go negative: every spend path checks the cost first.
- Collecting twice doesn't pay twice: `collect` moves `since` forward.
- Normal runs end: 6 full runs with random cards and auto-placement, at 3x speed and all 5 omens, finished every wave in at most 170 sim seconds, with no stuck monsters.
