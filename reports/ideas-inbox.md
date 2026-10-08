
## 2026-10-06 (owner, parked: "note that. lets just get the base game down")
- **Wall card:** a card that gives extra walls (raises the wall limit), so cards and items can get you more walls than the House level allows.
- **Upgrades change how buildings look:** card upgrades should visibly change individual buildings and get stronger-looking as they stack. Example: Hawk Eye gives archer towers a distinct look along with the extra range. Same idea for Sharp Arrows, Stonemason and so on.

### Playtest batch: tower destruction, rubble & repair — 2026-10-07
- **Idea (user's words):** "Destroyed towers leave rubble that cannot currently be removed. Repairing a destroyed tower requires payment. Zombies need to be able to destroy towers; otherwise, an archer tower can function as a wall and extend funneling."
- **Clarified:** Bug/gap: rubble from destroyed towers is stuck on the map; there must be a way to clear it. Repairing a destroyed tower costs gold (keep that). Zombies must be able to attack and destroy towers that block them, so a tower can't act as an indestructible wall for funnelling. Open: should clearing rubble be free, cost gold, or only happen via repair?
- **Touches:** base, zombies (pathing/targeting), economy (repair cost)
- **Status:** NEW

### Upgrades: newly acquired towers upgradeable, instantly — 2026-10-07
- **Idea (user's words):** "Newly acquired towers should be upgradeable. Upgrading should be instant; upgrades should not consume time."
- **Clarified:** Any tower you get (from cards, shops, items) can be upgraded right away, and upgrades complete instantly with no build timer. **User answer:** applies to EVERYTHING: every upgrade is instant, no build timers anywhere (remove the game-clock upgrade timers, `TIME_SCALE`/`realTime()`). Gold is the only limit (fits v2: no House, no caps).
- **Touches:** base, run cards, economy, progression
- **Status:** NEW

### Many more wall options — 2026-10-07
- **Idea (user's words):** "Add many more wall options; in a run with no walls, towers became the primary way to funnel zombies."
- **Clarified:** More wall variety and more ways to get walls (wall types, wall cards, shop kits), so funnelling is done with walls rather than towers. Related to parked "Wall card" idea from 2026-10-06.
- **Touches:** base, run cards, shops/economy
- **Status:** NEW

### Review pass: buildings & cards, card refund, 6-pick-2 — 2026-10-07
- **Idea (user's words):** "Review all buildings. Review all cards. Card refunds may be unbalanced: 15 gold is too low when a round can generate about 1,000 gold. Consider showing 6 cards each round and letting the player choose 2."
- **Clarified:** (1) Builder should do a full balance review of every building and every card. (2) The 15-gold refund for skipping/refunding a card is far too low next to ~1,000 gold per round — scale it up (e.g. relative to round income). (3) Try a new card pick: 6 cards shown per round, pick 2 (instead of 1 of 3).
- **Touches:** run cards, economy, balance
- **Status:** NEW

### Gold mines (possible feature) — 2026-10-07
- **Idea (user's words):** "Introduce gold mines as a very rare resource. Once destroyed, a gold mine does not return. Zombies are attracted to gold mines because they are important targets. Add skills that increase gold multipliers and provide other gold-related bonuses."
- **Clarified:** Very rare gold mines that produce gold; if zombies destroy one it's gone for good. Zombies prioritise attacking gold mines, so they're a high-value thing to defend (and can act as bait). Add skills/cards boosting gold: gold multipliers and other gold bonuses. **User answer:** it's a CARD. You pick it and place it down, like the banana farm in Bloons Tower Defense: a placed generator that makes gold during the run. Being a run card, it vanishes when the run ends; "never returns once destroyed" means within that run.
- **Touches:** economy, zombies (targeting), run cards/skills, base
- **Status:** NEW
