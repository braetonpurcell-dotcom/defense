# Defense — Design

A phone game: build and level up your home base, then defend it from 10 waves of monsters.
Each wave you pick a card that adds a tower, wall, trap or upgrade.

Inspired by the premise of Clash of Clans (a village you grow and defend), with its own look and rules.

## The big picture (idea drop, 2026-10-06)
A survival-flavoured open world, Pokémon-style:
- **You are a character** you customise and walk around with (Game Boy Color Pokémon feel).
- **Your base is the home area.** Develop your land to your heart's content, and defend it from zombie attacks.
- **Walk south through the forest to a village:** shops for pets, walls, towers and more.
- **Things to look after:** pets you take care of; farms that need tending (not just collecting).
- **A pond** on one of your plots, where you can unlock a **fisher**.
- **Monsters are zombies** for now (all the current monster types become zombie variants).

Roadmap order: zombies → walkable character → pond and fisher → farm care → the village to the south
(shops) → pets → character customisation.

Built: zombies (Zombie, Runner, Brute, Zombie King). Walkable character: tap an empty tile (or the road) to
walk there tile by tile, or use arrow keys / WASD; the camera follows; the ME button jumps to them. They run
into the House with the villagers when a wave starts. Colours (skin, hair, shirt, trousers) are stored in the
save (`look`), ready for the customisation screen.

Built: **Pond and fisher.** A pond sits in the plot just east of your starting land (a small clearing you can
see from home). Buy that plot, reach House LV 2, then build a **Fishing Dock** (150 gold) right next to the
water: your fisher catches 50 food/hour (a farm makes 30). Water blocks walking and building.

Built: **Farm care.** Crops grow for 2 hours, then wait for you. Tap to harvest (replants automatically).
Leave them 6 more hours and they wilt: brown, and pay only 25%. Quarries, labs and docks need no care.
(Design decisions taken from `reports/design-questions.md`; the village goes on the same map, south
through the forest, rather than separate screens.)

**Owner's world sketch v1 (2026-10-06, `sketches/overall-rough-world-design.json` + `.png`; NOT built yet):**
a 24×24 rough map. Reading (to confirm with the owner):
- **North:** a black **danger zone** (zombie country) across the top, widening.
- **Forest band** (labelled "trees/forest unbuyable"), 2 rows, between the danger zone and the land; the
  **zombie route** cuts through its middle (cols 11–12).
- **Main build area** (labelled "grass main build area"): 8×8 in the middle (cols 8–15, rows 8–15), with
  **water** spots (pond) at (9,13), (14,13), (9,14).
- **West:** **mountains** the whole height (diagonal edge), with a little **river** source in them.
- **East:** **ocean** the whole height.
- **South of the land:** a **river** running east–west (rows 16–17) with forest bits; the **dirt path** (col 11–12)
  crosses it: the owner's note says **the river needs a bridge** ("bridge" is a named colour, not yet placed).
- **Bottom:** the **open world** (rows 18–23), widening to the south-west, boxed in by mountains and ocean.
Owner's note: "This is the overall look. River needs a bridge to go over and so on."
**Owner decided:** 1 sketch square = 1 plot, so the world will be **24×24 plots (144×144 tiles)** with today's
8×8 buyable land in the middle; **mountains and ocean are walls of the world for now** (no walking or building;
may open up later). Still open: exact bridge spot and look; whether the danger zone has its own content.

**BUILT (2026-10-06, step 16):** the world is now the 24×24-plot valley, with `WORLD_MAP` in config.js being the
sketch's own letters. Your land is plots 8–15 (tiles 48–95); old saves are moved in by +48 tiles / +8 plots
(`worldV: 2`). Ground types: danger zone (dark, dead trees; you can't enter, zombies come from a den on the road
at row 33), mountains (rock + peaks; mountain lakes where the sketch has "H" up high), ocean (waves, sandy beach
edge), forest band (unbuyable trees; the zombie road runs through), your land, river band (river 3 tiles wide,
rows 96–107, winding from the mountains to the ocean) with a **wooden bridge** where the path crosses, and the
**open world** meadow at the bottom (village plaza at rows 110–113, shops along row 108). Borders between wild
areas wiggle. Ponds follow the sketch: a long lake on the west of your land and a small pond on the east.
Drawing: each plot is drawn into its own small image when first on screen (cache of 160); zoomed far out, a
4-px-per-tile overview is drawn instead. Tapping wild ground says what it is ("MOUNTAINS - YOU CAN'T CLIMB THEM (YET)").
A base nobody touches now lasts to wave 7 (the road is ~15 tiles longer); waves take ~70 s at 1X.
(`sketches/untitled-sketch.json` is an earlier save of the same drawing.)

**World layout (updated 2026-10-06):** the world is **8 plots wide × 9 plots tall** (48 × 54 tiles; config
`N`, `NR`, `WORLD`, `WORLD_H`). Rows 1–8 are the buyable 8×8 land. The **9th row (tiles 48–53) is the open-world
strip**: never buyable, no forest, reserved for the village and future NPC design. A **straight dirt path** runs
down the middle between plot columns 4 and 5 (tiles 23–24) from the bottom of the starting land (row 30) to the
strip's plaza; plots it crosses stay buyable and the path stays dirt. The old village clearing inside the 8×8
(rows 38–46) is gone; those are normal forest plots now.

Built: **The village** (now in the strip; layout is a placeholder until the NPC/village design pass). Shops along
the top of the strip, a plaza and a well (zombies never go there):
- **Pet Shop:** Dog (300G, you walk 50% faster), Cat (250G + 50F, farm crops +25%), Owl (400G + 30S,
  +1 card reroll a run). One pet walks with you; its perk works while it's been fed in the last 48 hours
  (10 food a meal). Hungry pets show a red "!". Pets never die.
- **General Store:** Fertiliser (40G, all growing farms ready now), Builder Snack (30F, builder 10 min faster).
- **Tavern:** helpers for hire (NPC roles), coming next.
Shopkeepers stand by each door; townsfolk wander the plaza. Walk into reach of a shop to go in.

## You are the director (idea drop, 2026-10-06)
"A story type progression with buying upgrades, towers, pets and NPCs. NPCs have to be put into towers and
defenses for them to work; a wall builder repairs any damaged wall. Almost like a self-sustaining NPC world,
and you are the director in the game."
- **NPCs with jobs**, hired at the Tavern: **Archer** (mans a tower; an empty tower doesn't shoot), **Builder**
  (walks to damaged walls/buildings and repairs them for free, even during waves), **Farmer** (harvests and
  replants farms). More roles later (miner, fisher, scientist, cannoneer).
- **Director's goals**: a chain of goals with rewards that tells the story of growing from a trailer to a bunker.
- **Fighters (idea drop):** some NPCs fight with **guns and swords** (planned roles: Guard with a sword who
  meets zombies at the gate, Gunner who shoots from walls).
- **Walls per House level (owner rule):** always enough to keep all your stuff behind walls, plus enough
  extra for creative designs (funnelling zombies, walling off sections). Limits: 70 / 85 / 100 / 120 / 140 /
  165 / 190 / 215 / 245 / 280 for House 1–10 (land perimeter at that level + ~50%).
- **Design your village (idea drop):** you build up your base *and your population*, and lay out your
  village yourself (homes for your people, workplaces), not just defences.
- Character customisation: tap your own character → YOUR LOOK (skin, hair, shirt, trousers; free).

## The two layers
1. **Your base (permanent).** Built and upgraded at home, Clash of Clans style. Never lost.
2. **The fight (roguelike, never saved).** DEFEND! starts a 10-wave run. Before each wave you pick a
   card: a tower, trap or ability you place on your base *for this run only*. When the run ends, win or
   lose, every card disappears. Same base, different run every time, so it never gets stale.

### Run cards (spec, designed 2026-10-06)
- **Picks:** 3 cards before every wave (10 picks a run). Pick, then place; blessings apply at once. Run
  objects are ordinary buildings marked `run: true`; they vanish when the run ends. If destroyed, gone for the run.
- **Rarity** Common/Rare/Epic, odds by wave: 1–3: 75/22/3 · 4–6: 55/35/10 · 7–9: 40/40/20 · 10: 25/45/30.
  Three distinct cards; a non-stacking blessing you own isn't offered again.
- **One free REROLL per run.** SKIP gives +15 gold.
- **Cards:**
  Crossbow Post (C, 1×1, 6 dmg, 3.5 tiles, 0.35s) · Cannon Tower (C, 2×2, 22 splash r1.5, 4.5 tiles, 2s) ·
  Frost Tower (R, 3 dmg, slows to 60% for 2s) · Ballista (R, 2×2, 30 dmg, 7 tiles, 2.5s, pierces 3) ·
  Lightning Rod (E, every 4s 40 dmg + chains 2×20) · Flame Brazier (E, aura 2 dmg/0.25s in 2 tiles) ·
  Spike Pit (C, 15 dmg on entry, 8 charges) · Bomb (C, 60 splash r2, once) · Tar Pit (R, 50% slow in 3×3) ·
  Scarecrow (R, 150 hp decoy monsters attack first) · Barricade ×6 (C, 90 hp walls) ·
  Sharpened Arrows (C, +25% tower damage, stacks 3) · Hawk Eye (R, +1 tile range) ·
  Poisoned Tips (E, hits poison 2/s for 4s) · Stonemason (C, walls +50% hp, healed) ·
  Second Wind (E, House under 50%: stun all 3s, House +100)
- **Tuning knob:** `CARD_POWER` multiplies card damage/hp/slow. Target: first runs clear 8–9 waves, ~25% wins.
- **Omens** (never stale): one random twist per run, an upside and a downside. Blood Moon (monsters +30% hp,
  kill gold ×2) · Thick Fog (range −1, see 4 cards) · Goblin Rush (goblins from wave 1, +50%; trap cards come
  in pairs) · Twin Caves (later: second road from wave 4; extra picks).

## Looks (both badass and cute)
Bases should be a canvas: competitive players can make theirs look menacing, others can make theirs
colourful and cute. Cosmetic themes and decorations, separate from stats.

## Progression (the long game)
- **The House gates everything.** Like Clash of Clans' town hall: you can't upgrade towers or walls past
  what your House level allows. Upgrade the House first, then the rest catches up
- **It takes a long time.** Levelling up should feel like Clash of Clans: slow, with real waiting and
  saving up. The difference: instead of PvP, monsters attack, and the game is about defending
- **10 levels of House and walls.** Level 1 is a trailer behind a plank fence; level 10 is a bunker
  behind glowing concrete. Levels in between: shack, log cabin, cottage, stone house, brick manor, keep,
  fortress, vault. Walls follow the same path: planks, logs, rough stone, cut stone, brick, iron-banded,
  steel, obsidian, gilded marble, bunker
- **Towers level up by upgrading** (spending resources), never from dealing damage
- **Resources:** gold (from quarries), food (from farms), science (from labs). Each has its own building
  you place on your land; higher levels produce more
- **NPCs with roles:** you unlock villagers who are good at one thing: farming, mining, archery, science,
  building, cannons, ... Assign them to a building to boost it (or a tower to man it)
- **Visiting friends' bases** (later; needs the game online, so after the local-first phase)

Open: what each level costs, how resources tie to waves, which NPCs come from cards vs. buildings.

Built so far: the art for all 10 House and wall levels (`tools/art-gallery.html` shows them side by side).
The game starts at level 1. Upgrading isn't in the game yet; `defense.setLevel()` previews a level.

## Moving around
- **Tap where to go and your character walks there** (owner confirmed they like this). This is the main
  movement everywhere: base, road, trail, village. No joystick. Arrow keys / WASD also work on a computer.
- **Two modes at home:** normal (you're your character) and **build mode** (BUILD button → DONE · ADD ·
  DEFEND!), where you tap buildings to pick them up and move them, and ADD opens the catalog (build, looks,
  store). Build mode is home-only, never during a run.

## Reach (you have to walk up to things)
- Your character's **reach is the 3×3 square around them** (shown faintly). Anything touching it can be used:
  tap it and its panel opens. Tap something further away and your character walks into reach first, then
  it opens. Walk away and the panel closes. Shops work the same way.
- **This shapes base design:** a building your character can't get within reach of can't be repaired or
  upgraded. A 5-thick wall is a trap for its owner: the middle walls can never be fixed. REPAIR and ALL
  WALLS only touch what you can reach, and say how many were out of reach.
- Building placement (BUILD menu, moving a selected building) stays a direct tap.

## Scale and camera (rules for all art)
- **Three-quarter view, like Game Boy Color Pokémon:** the ground is seen from above; buildings and people
  are drawn from the front (front wall, door, roof on top).
- **1 tile = 24 px.** People (hero, villagers, fisher, shopkeepers, zombies) are ~16 px tall, standing on
  one tile, all from the same body template. Pets are smaller (~12 px). The Zombie King is the one 2× exception.
- **Buildings may be taller than their footprint** and overhang the tile behind them (Archer Tower: 1 tile,
  40 px tall). Footprint = what blocks the grid; height = how it reads.
- No person is ever drawn *inside* a building sprite at a smaller scale; workers (like the fisher) are drawn
  as full-size people on top.

## Style
- Top-down grid in Game Boy Color style, made of 24×24 pixel sprites drawn in code (no image files)
- Portrait phone layout, one-thumb taps
- Played locally for now (`Play Defense.cmd`). Later: installable web app on GitHub Pages with a live link
  and a preview link (`tools/publish.ps1` is ready for that)

## Loop

### World map
- 48×48 tiles, split into an 8×8 grid of land plots (6×6 tiles each)
- You start owning the middle 4 plots; the rest is forest
- Buy a plot that touches your land to clear its trees and expand (price: 50 gold, +25 for each plot bought). Starting gold: 200
- One monster cave at the top (north) edge. A winding 2-tile dirt road runs from it through the forest
  to the top of your base; that road is where monsters come from. A red **!** marker always shows the cave
- The road stays dirt when you buy land along it, so you can build on it (e.g. block it with walls)
- Camera: drag to pan, pinch / mouse wheel / + − buttons to zoom, BASE to jump home

### Home (between runs)
- Your base looks like a Clash of Clans village: a **House** (the core), other buildings, and NPC villagers
- Customize it by moving and placing buildings and defenses
- Spend **gold** to repair damaged buildings and upgrade them
- A **Defend** button starts a run

### Run (10 waves)
1. **Card pick:** choose 1 of 3 cards (tower, wall, trap or upgrade), then place it
2. **Wave:** a horde comes down the road from the north cave. The battle plays out on its own, with no taps
3. Each wave is harder than the last. Wave 10 is the big finale

### Waves (built)
- DEFEND! starts wave 1. Between waves: move things around, then NEXT WAVE. SPEED 1X/2X/3X during a run
- Monsters walk out of the cave, down the road, toward the House. They go around walls if there's a gap
  and smash through if there isn't
- Monsters: **Slime** (basic), **Goblin** (fast, from wave 3), **Orc** (tough, hits hard, from wave 5),
  **King Slime** (boss, wave 10). They get 15% tougher every wave
- Monsters always head for the House (3×3 tiles, 300 health). They'll walk up to 30 extra tiles to get
  around a full-health wall (`DETOUR_PER_HP` in config); past that, or when a wall is damaged, they smash
  through
- Starting base: the House in the middle, a 7×7 wall ring with a 1-tile gate at the **bottom** (monsters
  walk around the ring to reach it), and 2 archer towers in the bottom corners covering the gate
- Walls join up with their neighbours into one continuous wall
- Villagers walk tile by tile around buildings and through gaps, never through walls
- Your own land shows a faint tile grid for counting when building

Balance check (no player action, starting base):
- Gate at top, towers at top: loses on wave 5
- Gate at bottom, towers at top: loses on wave 3 (towers can't reach monsters at the gate)
- Gate at bottom, towers at bottom (current): loses on wave 6
- Gold: each kill (2–50) plus a wave-clear bonus (10 + 2 × wave)
- Villagers hide in the House during waves (for now they're plain villagers; roles come with the NPC system)
- All numbers live in `js/config.js`

Bot testers (`tools/bots.html`, 3 seasons each, 2026-10-06): every bot clears 5–6 waves whether or not
it repairs or buys land. Takeaway: with the gate open, walls take almost no damage, so repairs don't matter
yet. Walls will only matter once players close gaps and monsters have to smash through.

Cards and upgrades are meant to close the gap to wave 10.

### Win / lose
- **Lose:** the House is destroyed
- **Win:** survive all 10 waves
- How safe your NPCs and buildings stayed decides your reward; damage carries home and costs gold to repair
- After a run the House is rebuilt for free and trees grow back. Walls (6 gold) and towers (15 gold) need
  REPAIR; partly damaged ones cost less

## Open questions
See [QUESTIONS.md](QUESTIONS.md): the running list of things to decide, with proposed answers.

## Tooling (from Deep Dig Heroes)
- Bot players test the real game: slow, medium and fast players, plus one that never taps
- Drag-and-copy layout tool for deciding where things go
- Screenshots before anything ships
- Drafts on a branch until approved

## BUILT step 18: fighters and roguelike hiring (2026-10-06)
- **Fighters** (`NPC_ROLES.guard` / `gunner` in config.js). Guard: sword, unlocked at House 2. Gunner: gun, range 4, unlocked at House 3.
  - They stay outside when a wave starts and go to meet any zombie within `GUARD_RADIUS` (9) tiles of the House.
  - Zombies stop and fight a fighter they touch. A fighter who drops lies there until the wave ends, then gets up healed.
  - Fighters live at the base and walk home after being hired.
- **Hiring is roguelike** (owner: "make it rogue like so people have to always adapt to the rng"). The Tavern shows 3 random applicants, each with a name, role, trait and price.
  - The board reshuffles after every run, or right away with REROLL (40G).
  - Traits: QUICK, TOUGH, STRONG, EAGLE EYE, CHEAP, LAZY, HEROIC. They only roll on roles they help.
  - An archer's trait powers their tower (`crew` hook in battle.js).
- **OPEN QUESTION (owner, 2026-10-06):** a cozy, long-lasting survival base, or a roguelike with worlds (about an hour each) where death wipes the save? Recommendation: a hybrid.
  - The valley and village stay permanent and cozy.
  - "Worlds" become expeditions: an hour-long roguelike campaign where death ends that expedition but not the base. Beating World N unlocks World N+1 for good.
  - A full-wipe "Hardcore" save could be an opt-in mode later.
  - Waiting on the owner's pick.

## PIVOT (2026-10-06, later): complete roguelike, gold only, hero as a mobile tower
Owner decisions, in order. HANDOFF.md section 0 has the details.
- Complete roguelike: death wipes the save, a world is 10 waves, beat it for the next world. The cozy version can be a separate game later.
- No day/night and no timer: between waves you design your base for as long as you like.
- Gold from zombies is the only income. Quarry, farm, lab, dock, food, science and the farmer are removed.
- The walkable main character is removed. The hero is now a mobile tower: tap them, MOVE to a guard spot, UPGRADE, change their look.
- The step 18 "OPEN QUESTION" (cozy vs. roguelike) is answered: full roguelike.
- Parked: a wall card for extra walls; card upgrades that visibly change buildings.

## Endless (2026-10-06, latest)
No more worlds: endless waves, a King every 10th wave (and more after that), and the goal is to get as far as possible. Each run is saved to TOP RUNS on a new home screen (PLAY / TOP RUNS). Death wipes the save, but top runs, lives, gems and cosmetics stay.


## v2 DESIGN (2026-10-06, latest): defend the village
Owner: "get rid of the house we are now protecting the village from zombies the starter plot is now near the path. fully develope the village. we are the last line of defense. if 1 zombie gets through the path and out of range then we lose."
Owner's answers:
- v2 replaces v1 now.
- **No limits:** no House means no level gates, no storage cap, no people cap. Gold is the only limit.
- Start plot just before the village bridge.
- Walls may go on the path; zombies smash them or go around.

What was built:
- **The path:** zombies walk from the den down the winding path through the forest, straight down through your land and over the bridge. The first one to step off the bridge into the village ends the run. Second Wind now kills the first zombie that gets through instead.
- **Your start:** the 4 plots just above the bridge, astride the path. You get 2 manned archer towers and 12 walls in your ITEMS. More land is bought plot by plot as before.
- **Guard point:** the middle of your starting land. Fighters defend around it, new hires walk to it, and the hero starts there.
- **The village:**
  - Along the river: the Pet Shop, General Store and Tavern.
  - The plaza: the well, two market stalls and lamps.
  - The **Blacksmith** sells building kits into your items: walls x10, an archer tower kit, spike pits, barricades.
  - The **Chapel** offers a prayer: +1 card reroll this run for 50G.
  - Ten family **cottages** line the main street, with lamps and flower gardens.
  - The **Town Hall** sits at the end of the street. The mayor shows your goals.
  - Ten townsfolk wander the village and go indoors during waves.
- **Settings gear** (top right): CONTINUE, RESTART (3 taps within 4 s; the run still counts) and TOP RUNS. The game pauses while it's open.
- **Save:** key `defense.save.v5`. A v1 save passes on top runs, lives, gems, art packs and look.
