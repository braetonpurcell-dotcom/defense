# Playtest report: run balance, cards, omens, House levels, economy

Date: 2026-10-06. Playtest agent. All play used the real game at `http://localhost:8080/?bots=1` (sandbox save),
driven through `window.defense` and fast-forwarded with `step()`. About 1,500 runs in total.

**Method.** Each player type played 12 consecutive seasons from a fresh save. Between seasons I passed 1 hour
(`passHours(1)`, `rushBuilder`, `collectAll`), the same as `js/bots.js`. I then ran controlled experiments, starting
each run from a fresh base: forced omens, forced card hands, set House/tower/wall levels, and number changes
emulated at runtime by changing the `CARDS`/`BUILDINGS`/`MONSTERS`/`OMENS` objects, plus a wrapper on
`battle.spawn` for `hpScale`. No project file was edited. Card placement uses AUTO (`autoPlace`) unless it says
"smart placement". Smart placement means my script moved the card to the free tile that covers the most
monster-path tiles without blocking the path.

Caveat: `js/economy.js` changed on disk partway through (the farm care work). My tab kept the code it had loaded
at the start, so the economy-pace numbers come from the version before the farm change. Samples of 10 to 40 runs
carry about ±15% noise on win rates; the headline comparisons use 60 to 80 runs.

---

## 1. Results by player type (12 seasons each, consecutive, random omens)

| Player type | What it does | Avg waves cleared | Win % | Range | House LV over the 12 seasons | Avg gold/run |
|---|---|---|---|---|---|---|
| Do-nothing | skips every card, never repairs | **5.33** | 0% | 5–6 | 1 throughout | 60* |
| Casual | takes the first card, AUTO places, repairs every other season | **8.58** | 50% | 5–10 | 1 throughout | 60* |
| Builder | rushes the House, all walls and towers, builds a 3rd tower; picks towers first (no synergy) | **9.92** | 92% | 9–10 | 1→2→3, then stuck at 3 | 557 |
| Card-maximiser | scored picks with synergy bonuses, rerolls weak hands, moves cards next to their combo partner | **9.92** | 92% | 9–10 | 1→2→3, then stuck at 3 | 526 |
| Turtle | closes the south gate with a wall; picks Barricade, Stonemason and Second Wind first; stacks barricades in front of the breach | **0.83** | 0% | 0–7 | 1→2→3 | 79 |
| Greedy economist | skips every card (+15 g each), buys land, builds and upgrades producers, rushes the House | **3.67** | 0% | 3–6 | 1→2→3→…→4 | 386 |

\* Do-nothing and Casual never upgrade, so they sit at the **1,000-gold cap of House LV 1** after about 2 runs.
From then on, almost all run gold is silently thrown away (see Bugs).

**What killed the House:** in 38 of the 44 losses in the player-type table it was **zombies (the basic monster)**,
attacking the House from the gate side in waves 5 to 8, or in wave 1 for the Turtle. The **Zombie King** caused
the other 4 losses: both of the Builder's and Card-maximiser's, and 2 of the Casual player's. Runners landed the
final blow twice. **Brutes never landed a killing blow.**

**Notable outliers**
- **Turtle:** 10 of 12 runs died **in wave 1 or 2.** With the gate closed, monsters smash the top wall (24,21), the
  one nearest the road. All the wall damage landed on that one tile. The two starting archer towers sit in the
  bottom corners and **fire 0 shots** in that wave. The House's top face is 4.25 tiles from the towers, which have a
  range of 4. Even with 300-hp walls, a closed gate still loses in wave 1 (towers out of range, nothing kills the
  attackers). Moving both towers to the top gets 4 waves, still worse than leaving the gate open (6).
- **Economist:** waves cleared *fell* as the House rose (6 at LV 1 → 3 at LV 3–4): monsters scale with House
  level, but its towers stayed at LV 1 and it took no cards.
- **Casual:** wins swing heavily on luck. A run that offers Ballista, Lightning or Crossbow early tends to win; a
  run that opens with Scarecrow, Bomb or Barricade loses around wave 6–7.

---

## 2. Balance findings

### 2a. Overall difficulty: much too easy once cards are taken
The design target is "first runs clear 8–9 waves, ~25% wins". Measured on a fresh LV 1 base, random omens:

| Policy (fresh LV 1 base) | Avg waves | Win % | n |
|---|---|---|---|
| Do-nothing | 5.6 | 0% | 60+ |
| Takes the first card, AUTO placement | 9.06 | **63%** | 80 |
| Takes the strongest card (`TOWER_FIRST` order), AUTO | 9.97 | **97%** | 30 |

A single well-placed tower card raises a do-nothing base from about 5.6 to **about 9 waves** on its own (table
below). Ten picks per run is far more than the curve needs.

### 2b. Card value: one copy picked at wave 1, nothing else, Calm Skies (baseline 5.6 waves)

| Card | 1 copy, AUTO | 1 copy, smart placement | Picked every wave, AUTO | Verdict |
|---|---|---|---|---|
| Lightning Rod (E) | **9.0** | 9.0 | 10.0 (100% wins) | **Overpowered** |
| Ballista (R) | **8.9** | 9.0 | 10.0 (100% wins) | **Overpowered** (a rare card that out-performs epics) |
| Crossbow Post (C) | 7.6 | 8.75 | 10.0 (100% wins) | Strong for a common |
| Cannon Tower (C) | **5.0** (below baseline!) | **9.0** | 9.0 (0% wins) | Fine on paper; **AUTO wrecks it** |
| Flame Brazier (E) | 5.9 | **9.0** | 6.5 | Fine on paper; **AUTO wrecks it** |
| Arrows (C blessing) | 7.0 | – | 7.8 (×3) | Good |
| Frost Tower (R) | 6.4 | 6.9 | 9.9 | Weak alone, fine stacked |
| Poison Tips (E) | 6.6 | – | – | Weak for an epic |
| Tar Pit (R) | 6.5 | – | 7.1 | Okay |
| Hawk Eye (R) | 6.0 | – | – | Weak |
| Second Wind (E) | 6.0 | – | – | Weak for an epic |
| Spike Pit (C) | 5.6 | – | 7.0 | Near useless as a single pick |
| Bomb (C) | 5.8 | – | 6.2 | **Useless** (one 60-damage blast) |
| Stonemason (C) | 5.6 | – | – | **Useless** while the gate is open (walls are never hit) |
| Barricade (C) | **5.0** | – | 5.0 | **Useless to slightly harmful** with AUTO |
| Scarecrow (R) | **5.5** | 5.75 | **4.9** | **Harmful.** The decoy pulls the horde away from the gate, outside tower range |

**Synergies (2 forced cards, Calm, 12 runs each):**
- Tar Pit + Flame Brazier placed next to each other: 9.0, against 6.3 when AUTO places them. But a well-placed
  Brazier alone also reaches 9.0. The combo is really just "put the Brazier on the path".
- Tar Pit + Bomb: 6.4 placed together, 6.25 placed by AUTO. No real synergy, because the Bomb fires once.
- Frost + Poison: 7.4, against 6.9 for Frost + Frost. A small, real synergy.
- Scarecrow + Cannon: 6.0 placed together, 5.75 by AUTO. A well-placed Cannon alone gets 9.0. **The Scarecrow
  drags the Cannon down.**
- In the season runs, the synergy-aware Card-maximiser did no better than the Builder (both 92%). At the current
  numbers, raw tower damage beats any synergy.

**Pattern:** most players will use AUTO, and AUTO decides whether Cannon and Brazier are top-tier or dead
cards. AUTO places towers on the free tile nearest the House and never checks range. On the starting base it put
the Cannon at (28,24), on the east side, while the monster path runs down the **west** side (column 20) and along
row 28 to the gate. Ballista and Lightning survive this because their range is 7 and 6 tiles.

### 2c. Omens: playable, but not equal

First-card + AUTO player, current numbers, 20 runs per omen:

| Omen | Avg waves | Win % | Do-nothing avg | Strongest-card win % |
|---|---|---|---|---|
| Calm Skies | 9.50 | 65% | 5.8 | 100% |
| Lucky Stars | 9.45 | **80%** | 5.2 | 100% |
| Runner Rush | 9.10 | 75% | 5.0 | 100% |
| Blood Moon | 8.75 | 55% | 5.0 | 90% |
| Thick Fog | **7.85** | **25%** | 5.3 | 90% |

- **Thick Fog is the harsh one for casual players.** Range −1 cuts the archers from 4 tiles to 3, and the upside
  (a 4th card) is worth nothing to someone who takes the first card. Range −0.5 brings the average back to
  Calm's level (8.53 against 8.6 under the proposed tuning).
- **Lucky Stars is a net upside.** Rarer cards are worth far more than losing 75 hp of House. It's fine as a "good
  omen", but it isn't a real trade-off.
- **Blood Moon becomes brutal once waves are tuned harder.** With the wave-scaling change in section 3 it fell to
  **0% wins** (6.5 avg). At hpMul 1.15 it recovers to 28%, against 40% for Calm, which is fair for double kill gold.
- Runner Rush is close to neutral. Its trap pairs offset the early runners.

### 2d. Does upgrading the House make runs harder than it helps?

Fresh runs with levels set directly, Calm Skies for do-nothing and random omens for first-card (10 runs each):

| Base | Do-nothing avg | First-card avg | First-card wins |
|---|---|---|---|
| H1, towers 1, walls 1 | 5.7 | 9.2 | 70% |
| H2 only (towers and walls LV 1) | 5.0 | 7.8 | 20% |
| H3 only | 4.0 | 6.1 | 10% |
| H4 only | 3.4 | 5.6 | 0% |
| H5 only | 3.0 | 5.2 | 10% |
| H2, everything LV 2 | 5.8 | 8.9 | 50% |
| H3, everything LV 3 | 6.0 | 9.4 | 60% |
| H4, everything LV 4 | 6.9 | 9.5 | 70% |
| H5, everything LV 5 | 7.9 | 9.8 | 90% |
| H6, everything LV 6 | 9.0 | 9.75 | 75% |
| H7 / H8, everything maxed | **10.0 (wins with no cards)** | 10 | 100% |

- **Rushing the House alone is a trap.** Every House level without the towers to match costs about 1 wave. This
  is very much like Clash of Clans, but nothing in the game warns the player. The Economist and Turtle players
  walked straight into it.
- **When everything is kept at the House level, runs get *easier* as levels rise.** At **House 7 the starting
  two archer towers win every run with no cards at all.** Tower damage grows ×1.35 per level (exponential); House
  HP grows ×1.45 per level. Monster HP grows only +45% per level and monster damage +35% per level (both linear).
  The long game therefore turns trivial, and the cards stop mattering.
- **Cards don't scale with House level** (`CARD_POWER` is flat), so their share of a run shrinks as the House
  grows. With the harder tuning proposed below, this creates a **difficulty dip at House 3–5**: first-card players
  win 0% at H3 and 13% at H5, against 21% at H1, before the base takes over at H7 (94%).
  Recommended code change, beyond the number edits: multiply card damage and hp by `towerStats`' damage growth
  for the current House level, e.g. `CARD_POWER * 1.35 ** (houseLevel - 1)`. Then raise the House term in `hpScale`
  so it is exponential too (e.g. `1.35 ** (houseLevel - 1)` in place of `1 + 0.45 * (houseLevel - 1)`). I tried
  the plain number change (0.45 → 0.7): it flattens H1–H5 but makes H3–H5 too hard for card players
  (5% and 0% wins) and still leaves H7 trivial. A number alone can't fix this.

### 2e. Economy pace

Simulated perfect player: collects every hour, upgrades the House the moment it can afford it, builds producers
up to the limits, then upgrades them. Builder time is real, simulated in 1-hour steps.

| House level reached | Idle (no runs) | One run per hour (first-card player) |
|---|---|---|
| LV 2 | 2 h | 2 h |
| LV 3 | 10 h | 3 h |
| LV 4 | 27 h | 13 h |
| LV 5 | 45 h | 20 h |
| LV 6 | 68 h | 35 h |
| LV 7 | 110 h | – |
| LV 8 / 9 | 156 h / 180 h | – |

- **Run gold dwarfs production.** One run at House 3–4 pays **400–1,750 gold**, against 102 gold per hour from
  a LV 3 quarry. Runs fund almost everything, so producers feel optional. At most, production is the slow
  "wait" layer the design wants.
- **Food is never the bottleneck:** the idle sim ended with about 58,000 surplus food; gold and science gate
  everything. Food costs could double, or farm output could drop, before anyone notices.
- **LV 2 → LV 3 is the first wall** (8 idle hours, with a single 40 g/h quarry). Every step after that is about
  1.5× the one before, which matches the Clash of Clans feel the design asks for.
- Players who don't upgrade hit the **1,000-gold cap** after two runs and stop earning. The game should nudge them
  toward their first House upgrade.

---

## 3. Top 5 tuning changes (js/config.js)

Tested together as one set ("E2" plus the omen fix), 40–80 runs per cell, fresh LV 1 base, random omens:

| Policy | Now | With the changes |
|---|---|---|
| Do-nothing | 5.6 waves | 4.65–4.9 waves |
| First card + AUTO (casual) | 9.06, 63% wins | **7.9, 21–23% wins** |
| Strongest card | 97% wins | 58–75% wins |

1. **`CARD_POWER` 1.0 → 0.8**
   The global knob the design set aside for this. At 0.7 on its own, casual wins only fell from 63% to 44%, so it
   has to be combined with #2. It also cuts card hp and slow strength evenly, so no single card becomes dead.

2. **`hpScale`: `0.15 * (wave - 1)` → `0.22 * (wave - 1)`**
   Cards stack linearly through a run (one per wave), so the late waves need to scale faster. At 0.22, wave 10
   monsters have 2.98× their base HP instead of 2.35×. The do-nothing baseline drops by only about one wave, and
   the 8–9-wave climax becomes real. Combined with #1, this alone gave casual 28% wins.

3. **`CARDS.ballista.damage` 30 → 22**
   A rare card that matched the epic Lightning: one AUTO-placed copy took a base from 5.6 to 8.9 waves, and it
   was the Builder's most-picked card (23 picks). Range 7 plus pierce 3 makes it immune to bad placement, so it
   should hit softer.

4. **`CARDS.lightning.damage` 40 → 30 and `CARDS.lightning.chainDamage` 20 → 15** (also change the card text
   `'40 DMG ZAP'` → `'30 DMG ZAP'`)
   One copy gave 9.0 waves, and picking it every wave won 100%. #3 and #4 together brought the strongest-card
   player from 80% wins (after #1 and #2) down to 58%. That keeps skill rewarded without making the win automatic.

5. **Blood Moon `hpMul` 1.3 → 1.15** (in `OMENS`), plus **Thick Fog `rangeAdd` −1 → −0.5**
   Once #2 is in, a +30% HP omen falls to 0% wins and a 6.5-wave average. At 1.15 it is 28%, against 40% for
   Calm. Fog is the worst omen for casual players today (25% wins, against 65% for Calm). At −0.5 its average
   waves match Calm's.

Next in line, if you want more:
- `towerStats` `range: (4 + …)` → `(4.5 + …)`: the starting towers then cover the top face of the House. A closed
  gate goes from 0 to 2 waves; an open gate is barely affected.
- `CARDS.bomb.damage` 60 → 100: it is currently a wasted pick.
- `CARDS.scarecrow`: it needs a mechanic change (a decoy that pulls monsters *into* range, or that only draws
  monsters already within N tiles), not a number.
- `PRODUCTION.gold` 40 → 60, or a smaller `goldScale` (0.5 → 0.3), so runs don't make producers pointless.

---

## 4. Bugs and rough edges hit along the way (brief; QA covers these in depth)

1. **AUTO places towers out of range.** `autoPlace` scores non-trap cards only by distance to the House. On the
   starting base the Cannon landed at (28,24), on the east side, while the path runs down the west side and along
   row 28. As a result, Cannon (5.0) and Brazier (5.9) do worse than or no better than having no card, against
   9.0 each when placed sensibly.
2. **AUTO places the Scarecrow about 7 tiles out (18,27),** which pulls the horde out of tower range. The net
   effect is negative.
3. **Closing the gate loses in wave 1:** the starting towers fire 0 shots, because the breach point (24,21) and the
   House's north face are out of range. There is no warning. This is a trap for the "build walls" instinct the
   design wants to reward.
4. **Run gold is silently lost at the storage cap.** Players who don't upgrade stay at the 1,000-gold cap; in the
   sims some runs showed +0 gold after a win. This needs a toast or a "storage full" marker on the result screen.
5. **Walls broken during a run stay broken for the rest of it.** Once the top wall falls, the ring is open from the
   north for every later wave. This may be by design, but together with #3 it means walls are pure delay with no
   kill zone.
6. Minor: in the Builder and Card-maximiser season runs, both stalled at House 3 for 9 seasons. LV 4 needs
   300 food, and the starting single farm (30/h, refilled 1 hour per season) plus spending on walls never got
   there. Real players with more time between runs won't hit this, but the bot season model undercounts food.
