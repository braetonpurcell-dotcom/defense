# Answers from the owner (Design Interviewer)

Written by the Design Interviewer sidebar session. Append only. Builder: act on `Status: NEW` entries, then mark them done/declined.

### How do you clear rubble from a destroyed tower? — 2026-10-07
- **Answer:** Free tap to clear.
- **Decision for the builder:** Between waves, tapping tower rubble offers two buttons: CLEAR (free; removes the rubble and frees the tiles) and REPAIR (pays the existing repair cost and puts the tower back in place). Losing a tower costs you what it takes to rebuild it; clearing it never costs anything. Goes with the inbox entry "Playtest batch: tower destruction, rubble & repair": zombies must be able to attack and destroy towers that block their path.
- **Status:** DONE (draft/v3-hunt): rubble panel has CLEAR (free) and FIX nG.

### How should the card pick work? — 2026-10-07
- **Answer:** 6 cards shown, pick 2.
- **Decision for the builder:** After every wave, show 6 cards and let the player take 2 before START WAVE. Make sure all 6 are different, keep the rarity odds as they are, and keep REROLL (one reroll redraws all 6). Because players now get twice as many cards, lower card strength (`CARD_POWER` or each card's numbers) so runs don't get easier overall. Owner's inbox note "Review pass: buildings & cards" also asks for a full balance review of every card.
- **Status:** DONE - 6 shown, take 2 (Thick Fog: 3). Card numbers cut ~20%.

### What should skipping a card pay? — 2026-10-07
- **Answer:** Scale it with the wave.
- **Decision for the builder:** Replace the flat `SKIP_GOLD` 15 with about 25% of that wave's income (wave-clear bonus plus typical kill gold for the wave), so a skip stays worth considering late in a run. Show the amount on the SKIP button ("SKIP +240G"). With 6-pick-2, each skipped pick pays this separately.
- **Status:** DONE - skipGold = 25% of the wave income, per skipped pick, shown on the button.

### Many more wall options: what did it mean? — 2026-10-07
- **Answer:** "more walls in the card options. blacksmith building is no longer a thing."
- **Decision for the builder:** Walls should come from the card pick, and wall cards should show up much more often than Barricade does now. Remove the Blacksmith from the village (and its wall/tower/spike/barricade kits); if anything else depended on it, flag it. Exactly which wall cards to add and how many walls each gives is in the next entry.
- **Status:** DONE - Blacksmith removed (its spot is now a cottage, the Old Smithy); walls come from cards.

### Wall cards: what do they give, and how often? — 2026-10-07
- **Answer:** Plain wall packs, offered often but at random.
- **Decision for the builder:** Add plain wall-pack cards, e.g. "Walls x8" (Common) and "Walls x15" (Rare). They drop ordinary walls into ITEMS. Those walls last the whole run and can be upgraded like any other wall. Give wall cards a high weight in the card draw, but don't guarantee one: some picks will have none. Barricade can stay or be folded into the packs, builder's call. Nothing special (spike, heavy, gate walls) for now.
- **Status:** DONE - Walls X8 (common) and Walls X15 (rare), weight 3 in the draw; Barricade card folded into them.

### Gold Mine card: payout and how zombies treat it — 2026-10-07
- **Answer:** It pays at the end of each wave. Zombies leave the path to attack it if they pass close by.
- **Decision for the builder:** The Gold Mine is a rare run card. You place it like a tower. Each wave it survives, it adds a lump of gold to the wave-clear payout (show it as its own line, e.g. "MINE +120G"). The amount grows with the wave, and maybe with the mine's level if it's upgradeable. If it's destroyed, it's gone for the rest of the run, with no repair. Zombies that pass within about 3 tiles break off their path to attack it. Zombies farther away ignore it. That makes where you put it a real risk-vs-bait choice. Fits the inbox entry "Gold mines" (also asks for cards that boost gold, such as gold multipliers).
- **Status:** DONE - rare card, pays 50% of the wave bonus per wave survived (own MINE +nG in the clear toast), hunted like a tower, gone when broken. Not upgradeable.

### What is the village for now? — 2026-10-07
- **Answer:** It's the thing you protect.
- **Decision for the builder:** The village is mostly scenery and the stakes: townsfolk, cottages and the plaza show what you're defending. Cut it down to only the useful buildings listed in the next entry. Don't add new shops there. Spending happens through cards, the Tavern and upgrades on your land.
- **Status:** DONE - scenery only.

### Which village buildings still do something? — 2026-10-07
- **Answer:** "there are no buildings that do anything anymore."
- **Decision for the builder:** No village building is usable any more. Tavern, Blacksmith, Chapel, Pet Shop, General Store and the Town Hall's goals all become scenery: no tapping, no panels. **Open, ask the owner:** the code still hires NPCs only through the Tavern (`hireApplicant`, `rollApplicants`), and unmanned towers don't shoot. Where does hiring go (a button on your land, a card, gone completely)? Where do the Chapel reroll and the goals checklist go? Don't remove hiring until the owner answers.
- **Status:** DONE - nothing in the village can be used; taps just name the building.

### What happens to hiring NPCs? — 2026-10-07
- **Answer:** Drop people entirely ("no more npcs for the battleing").
- **Decision for the builder:** Remove hired NPCs from combat: no Tavern applicants, no Archers, Builders, Guards or Gunners, no traits, no `GUARD_RADIUS` fighters. Towers shoot on their own with no manning. Walls and towers are no longer repaired for free mid-wave; repairs are paid for between waves. The hero (the mobile tower) stays. Townsfolk can still wander the village as scenery and go indoors during waves. Remove the hiring goals from `GOALS`, and the "people" column from TOP RUNS. A save holding hired NPCs should just drop them.
- **Status:** DONE - hiring, NPCs, traits, the hiring goals and the TOP RUNS people field are gone; old saves drop them.

### Where do the Chapel reroll and the goals go? — 2026-10-07
- **Answer:** Rerolls go on the card screen, and the goals are cut.
- **Decision for the builder:** The card-pick screen keeps the free REROLL and adds a paid one (start around 50G and let the price grow with the wave, or each time you use it within a run; builder's call). Remove `GOALS` and the mayor/Town Hall goals panel. TOP RUNS is the long-term thing to chase.
- **Status:** DONE - 1 free reroll a run, then 50G +25G each time. GOALS removed.

### How do walls and towers get repaired with no NPCs? — 2026-10-07
- **Answer:** Pay between waves.
- **Decision for the builder:** Nothing heals during a wave. Between waves, tap a damaged building and use FIX nG, or use REPAIR ALL, and pay with gold. Keep the existing repair-cost formula. Rubble: free CLEAR or paid REPAIR, as in the rubble entry above.
- **Status:** DONE - no healing in a wave; FIX / REPAIR ALL between waves. Card towers now have a repair price too.

### What is the hero's role with NPCs gone? — 2026-10-07
- **Answer:** Keep the hero as a mobile tower.
- **Decision for the builder:** No change. Tap the hero to MOVE them (works mid-wave) or UPGRADE them with gold, up to level 10. No abilities and no hero cards for now.
- **Status:** DONE, changed by the later tower-hunting answer: the hero stands on a pad (see below).

### What does a TOP RUNS entry show? — 2026-10-07
- **Answer:** All of it.
- **Decision for the builder:** Each entry shows waves survived (the main score, used for sorting), zombies killed, total gold earned and the run's omen. Remove the "people" field, since NPCs are gone.
- **Status:** DONE - waves, kills, gold, omen.

### What carries over between lives? — 2026-10-07
- **Answer:** Only cosmetics.
- **Decision for the builder:** No change: `carryOver()` keeps only gems, art packs, the player's look and records. No card unlocks and no permanent perks, so every run starts equal and TOP RUNS stays a fair comparison. Gems buy looks only.
- **Status:** DONE - No change needed.

### What should the starting kit be? — 2026-10-07
- **Answer:** Keep it.
- **Decision for the builder:** No change: 2 archer towers and 12 walls in ITEMS, then cards from wave 1. Note: these towers used to need an Archer, but now they shoot without one (see the hiring entry).
- **Status:** DONE - No change needed (2 towers + 12 walls, plus the hero pad).

### How do late waves get harder? — 2026-10-07
- **Answer:** New zombie types join over time.
- **Decision for the builder:** On top of normal scaling, introduce a new zombie type every ~10 waves so late waves need different answers. Starting proposal: wall-breaker at 15 (targets walls, big damage to them), a fast swarm at 25 (many weak runners), a tank at 35 (huge HP, slow). Each new type needs its own GBC sprite at the scale rule. When a new type first appears, show a short toast or card ("NEW: WALL-BREAKER"). The exact roster is open; next question asks the owner.
- **Status:** DONE - Wall-Breaker at 15, Swarm at 25, Tank at 30 (palette-swap sprites; the breaker carries a hammer), NEW: toast on their first wave.

### Wave preview before START WAVE? — 2026-10-07
- **Answer:** Yes, show what's coming.
- **Decision for the builder:** Between waves, show the next wave's contents near the START WAVE button, e.g. "WAVE 12: 30 ZOMBIES, 12 RUNNERS, 4 BRUTES", with a KING marker on boss waves, from `waveList(w)`. Use small sprite icons with counts if text gets too long on a phone.
- **Status:** DONE - the bottom bar shows the next wave (short form if too wide).

### Zombies break all your towers before heading to the village — 2026-10-07
- **Answer (owner's idea):** "i want zombies to attack and break all of your towers before heading to the village." They go for the nearest tower first, every zombie does it, and the hero counts as a tower: "they attack the platform of the hero. give the hero a 1 tile spawn pad that you click on to move and upgrade the hero. no more clicking on the hero himself to move him."
- **Decision for the builder:**
  - **Targeting:** each zombie heads for the nearest standing tower (by path cost, so walls in the way still count), smashes it, then picks the next nearest. Card towers count as towers. Only when no tower is left (or none can be reached) does it head down the path to the village. One zombie in the village still ends the run.
  - **Hero pad:** the hero stands on a 1×1 pad building. Tap the pad (not the hero) to open MOVE / UPGRADE / LOOK. MOVE relocates the pad and the hero. Zombies attack the pad like a tower. While the pad is broken, the hero is down until the wave ends; between waves, use REPAIR or a free CLEAR like other rubble. Tapping the hero sprite no longer opens anything.
  - **Knock-on effects to check:** walls now protect towers rather than steer zombies away from the village, so funnelling changes meaning. The Gold Mine's "detour if close" could become "counts as a target, like a tower". Traps on the path matter less unless they sit on the routes to towers. Retune wave strength after this; it's a lot harder for the player.
- **Status:** DONE - one flow field from every standing target; the village only when none are left. Hero pad: tap it for MOVE/UPGRADE/LOOK; it heals over time (owner, 2026-10-07) instead of repair/clear.

### With tower-hunting zombies: the Gold Mine and walls — 2026-10-07
- **Answer:** The Gold Mine is hunted like a tower. Walls are attacked "only if in the way like clash of clans type".
- **Decision for the builder:** The Gold Mine goes into the same nearest-target list as towers and the hero pad. This replaces the earlier "detour if within 3 tiles" rule. Walls are never targets themselves: a zombie only smashes a wall when that's cheaper than walking around it on the way to its current target (Clash of Clans style; keep the flow-field `DETOUR_PER_HP` logic, aimed at the target instead of the village).
- **Status:** DONE.

### Where do tower-hunting zombies enter your land? — 2026-10-07
- **Answer:** Still from the north path.
- **Decision for the builder:** Spawns are unchanged: zombies come down the forest path from the den. Once they reach your land, they leave the path toward their nearest target. The north edge of your land is the front line, so towers close to it get hit first.
- **Status:** DONE - No change needed.
