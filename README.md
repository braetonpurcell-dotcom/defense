# Defense

A phone game: you're the last line of defense between the zombies' den and a village. Zombies come down the path
and hunt your towers; you buy plots, lay walls, build archer towers, take run cards and move your hero. Waves
go on forever and get harder. If one zombie gets into the village, the run is over and your save is wiped;
the run goes into TOP RUNS. Game Boy Color-style pixel art, all drawn in code.

See [DESIGN.md](DESIGN.md) for the game's design history (the last sections are current) and
[HANDOFF.md](HANDOFF.md) for how everything works (sections 0a and 0 are current).

## Play
**On your phone:** https://braetonpurcell-dotcom.github.io/defense/ — use **Add to Home Screen**.
After the first visit it works offline.

**On this computer:** double-click **`Play Defense.cmd`**. It opens the game in your browser.
Keep its window open while you play; close it when you're done.

## Develop
| Task | Command |
| --- | --- |
| Run locally at http://localhost:8080 | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1` |
| Publish the phone site (from `main`) | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/publish.ps1 -Preview main` |
| Remake app icons | open `tools/icon-maker.html`, then run `tools/make-icons.ps1 -Base64 <window.iconBase64>` |
| Review the tower and wall art, levels 1–10 | open http://localhost:8080/tools/art-gallery.html while the game is running |
| Sketch an idea for Claude (labelled map colours or game-palette pixel art) | open http://localhost:8080/tools/sketchbook.html while the game is running; SAVE writes `sketches/<name>.json` + `.png` |
| Listen to the chiptunes | open http://localhost:8080/music/jukebox.html while the game is running |
| Run the bot testers (smoke test, not balance data) | open http://localhost:8080/tools/bots.html while the game is running |
| Sandbox that never touches your save | http://localhost:8080/?bots=1 |
| Preview a level in the game | in the browser console: `defense.setLevel('tower', 7)` or `defense.setLevel('wall', 7)` |

## Code
- `js/config.js`: all the game numbers (health, damage, prices, cards, omens, the hero, what each wave sends)
- `js/main.js`: the valley, the village, saving, your people, the hero, items, the UI and the game loop
- `js/battle.js`: a wave in progress: zombies, flow-field pathfinding, towers, shots, traps
- `js/economy.js`: gold, building and upgrading
- `js/art.js`: palette, ground tiles, trees, shadows, pixel font · `js/paint.js`: tiny pixel painter · `js/gfx.js`: sprite data to images, text
- `js/art-walls.js` (walls 1–10), `js/art-buildings.js` (the tower), `js/art-cards.js` (run cards), `js/art-decor.js` (decorations and art packs), `js/art-hero.js` (people), `js/art-village.js` (the village)
- `window.defense` in the browser console: test hook (`step(seconds)`, `nextWave()`, ...) for tests and bots
- `js/bots.js` + `tools/bots.html`: bot players that play the real game fast-forwarded
- `music/chip.js` + `music/jukebox.html`: a Game Boy-style sound chip and the game's tunes (not wired into the game yet)
- `sw.js`: offline support (lists every module; a missing one breaks the install)
