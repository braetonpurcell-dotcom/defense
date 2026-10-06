# Defense — Design

A phone game: build your home base, then defend it from 10 waves of monsters.
Each wave you pick a card that adds a tower, wall, trap or upgrade.

## Style
- Top-down grid in Game Boy Color style, made of 24×24 pixel sprites drawn in code (no image files)
- Portrait phone layout, one-thumb taps
- Installable web app (PWA) on GitHub Pages, with a live link and a preview link

## Loop

### Home (between runs)
- Your base looks like a Clash of Clans village: a **House** (the core), other buildings, and NPC villagers
- Customize it by moving and placing buildings and defenses
- Spend **gold** to repair damaged buildings and upgrade them
- A **Defend** button starts a run

### Run (10 waves)
1. **Card pick:** choose 1 of 3 cards (tower, wall, trap or upgrade), then place it
2. **Wave:** a horde attacks from the edges. The battle plays out on its own, with no taps
3. Each wave is harder than the last. Wave 10 is the big finale

### Win / lose
- **Lose:** the House is destroyed
- **Win:** survive all 10 waves
- How safe your NPCs and buildings stayed decides your reward; damage carries home and costs gold to repair

## Open questions
- Do run cards stay in your base after the run, or only the gold and unlocks?
- How do NPCs behave in a wave (hide, flee, fight back)?
- How is gold earned: per monster, per wave, or a win bonus?
- Which monster types? (e.g. grunt, runner, wall-breaker, flyer, boss)

## Tooling (from Deep Dig Heroes)
- Bot players test the real game: slow, medium and fast players, plus one that never taps
- Drag-and-copy layout tool for deciding where things go
- Screenshots before anything ships
- Drafts on a branch until approved
