# Design questions (2026-10-06)

Built: base, economy, 10-wave roguelike runs, art store. The hero sprite exists (`js/art-hero.js`) but nothing walks yet; runs don't cost food yet. Ordered by the roadmap. **[OWNER]** marks the five taste/vision calls the owner should confirm; the rest the builder can take as decided.

## Open world / movement

**1. Is the hero required, or optional on top of tap-to-build?** [OWNER]
Answer: optional at home, required away. At home you still tap to build/move/collect and the hero auto-walks to what you tapped. Forest, village and pond are hero-only with a thumb joystick. Why: one-thumb building works; forcing walking on it slows the core loop.

**2. How does the hero move, what blocks it?**
Answer: free movement at 48 px/s (2 tiles/s), blocked by buildings, trees, water; camera follows the hero off-base. Why: Pokémon feel without tile-step jank on touch.

**3. Where is the hero during a wave?**
Answer: inside the House with the villagers; the wave plays untouched. Why: the fight is "no taps"; a fighting hero means a whole combat system.

**4. How big is the world beyond the 48×48 base?**
Answer: three fixed screens, not a map: Base (existing), Forest path (48×24), Village (48×32). The pond is a plot feature on the base map. Why: three hand-made screens take days; an open map takes months.

## Fishing

**5. What does the fisher make, and how is it unlocked?**
Answer: pond = free 2×2 water tile on one bought plot, one per base. Fisher = villager role, 300 gold at the village, House 3+. Makes **food** at 1.5× a same-level farm, passively (works while closed). Why: a second food source without a fourth resource.

## Farm care

**6. What does "tending" a farm mean?**
Answer: Planted → Ready (2 h) → Wilted (6 h unharvested). Tap to harvest, tap to replant (free). Wilted pays 25% and needs 2 taps. A Farmer NPC auto-replants. Why: real cost for neglect, still one tap each.

**7. Do quarries and labs need tending?**
Answer: no. Only farms and pets need care. Why: one chore system is enough on a phone.

## Village & shops

**8. What do shops sell that the build menu doesn't?** [OWNER]
Answer: only things you can't build: pets, NPC roles (Fisher, Farmer, Archer), tower blueprints (Cannon at House 3, Frost 5, Ballista 7), wall skins. Why: the walk to town must be worth it.

**9. Village currency?**
Answer: gold and food only; gems stay art-only. Why: keeps gems "cosmetic premium" so later monetising never touches balance.

## Pets

**10. What does a pet do, and what does neglect do?** [OWNER]
Answer: follows the hero, one passive bonus (dog: villagers run home 50% faster; cat: +10% farm food; owl: 4 cards on wave 1). Feed 10 food/day; 2 days unfed → bonus off. Never dies. 1 active, 3 owned. Why: light buffs, no guilt mechanic.

## Economy & pacing

**11. How much should a run pay versus passive income?**
Answer: a House-1 win pays ~250 gold today = 6 h of a level-1 quarry. Add run entry **20 food × House level** (not built) and cap run gold at one full quarry collect (6 × hourly output × quarries). Why: free 8-minute runs beat the whole timer economy.

**12. Do farms, pets and fisher run while the game is closed?**
Answer: yes, all timers run offline (builder and producers already do); wilting and hunger cap at "one bad state", never worse. Why: slow pacing needs offline time; punishing a 3-day break kills retention.

## Roguelike runs

**13. Do cards and Omens stay purely temporary now there's a village?**
Answer: yes; only gold, gems and damage persist. Blueprints are permanent towers; cards are the spice. Why: already decided (QUESTIONS.md Q18); don't reopen.

## Store / gems

**14. Does character customisation cost gems or gold?** [OWNER]
Answer: colours (skin, hair, shirt, pants, already in `HERO_DEFAULT`) are free; outfits ship inside art packs at the same price (Candy pack = candy outfit). Why: one store, one SKU type.

## Zombies

**15. Can zombies attack the hero outside the base?** [OWNER]
Answer: yes, in the forest at night only (10 min day / 5 min night). Touched = hero auto-runs home, drops 10% carried gold, no death. Why: survival flavour without a health bar or fail state.

## Contradictions and risks

- **Run gold vs. slow economy.** ~250 gold per 8-minute win vs. 40/h quarry. `goldScale` grows 50%/House level, quarries 60%, so runs stay dominant all the way up. Fix the ratio (Q11) first; everything balances off it.
- **Food is overloaded.** Proposed sinks: House upgrades, run entry, pet feeding; sources: farms, fisher. It becomes either the only bottleneck or trivial. Track food/hour vs. sinks in `tools/bots.html` before pets land.
- **Two gates on one item.** If Cannon is both House-gated and village-sold, players get confused. Rule: House level unlocks, village sells.
- **Hero vs. one-thumb.** DESIGN.md says one-thumb taps; a joystick and build taps on one screen collide. The home/away split (Q1) is what keeps both.
- **"Open world" vs. three screens.** The owner's words say open world; the recommendation is three screens. Say so before the forest is built.
- **Zombie-only roster.** QUESTIONS.md Q19 still lists Bat/Witch/Troll. Decide whether they become zombie variants or are dropped; art is the cost.
