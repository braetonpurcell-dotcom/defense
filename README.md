# Defense

A phone game: build your home base, then hold off 10 waves of monsters, picking a card
(tower, wall, trap or upgrade) before each wave. Game Boy Color-style pixel art, all drawn in code.

See [DESIGN.md](DESIGN.md) for the game plan.

## Play
**On this computer:** double-click **`Play Defense.cmd`**. It opens the game in your browser.
Keep its window open while you play; close it when you're done.

**Online (optional, later):**
- **Live:** `https://<user>.github.io/defense/` (the `main` branch)
- **Preview:** `https://<user>.github.io/defense/preview/` (the latest draft branch)

Open a link on your phone and use **Add to Home Screen**. After the first visit it works offline.

## Develop
| Task | Command |
| --- | --- |
| Run locally at http://localhost:8080 | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1` |
| Publish live + preview | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/publish.ps1` |
| Remake app icons | open `tools/icon-maker.html`, then run `tools/make-icons.ps1 -Base64 <window.iconBase64>` |
| Review the House and wall art, levels 1–10 | open http://localhost:8080/tools/art-gallery.html while the game is running |
| Sketch an idea for Claude (labelled map colours or game-palette pixel art) | open http://localhost:8080/tools/sketchbook.html while the game is running; SAVE writes `sketches/<name>.json` + `.png` |
| Listen to the chiptunes | open http://localhost:8080/music/jukebox.html while the game is running |
| Run the bot testers (balance check) | open http://localhost:8080/tools/bots.html while the game is running |
| Preview a level in the game | in the browser console: `defense.setLevel('house', 7)` or `defense.setLevel('wall', 7)` |

## Code
- `js/art.js`: palette, 24×24 sprites, generated grass/trees, pixel font
- `js/paint.js`: tiny pixel painter (rect, frame, disc, outline) used by the bigger sprites
- `js/art-walls.js`: walls, levels 1–10, each joining up with its neighbours
- `js/art-houses.js`: the 3×3 House, levels 1–10
- `js/gfx.js`: turns sprite data into images, draws text
- `js/config.js`: all the game numbers (health, damage, prices, what each wave sends)
- `js/battle.js`: waves: monsters, pathfinding, towers, arrows
- `js/main.js`: the map, camera, base building, buttons, and the run flow
- `window.defense` in the browser console: test hook (`startRun()`, `step(seconds)`, ...) for tests and bots
- `js/bots.js` + `tools/bots.html`: bot players that play the real game fast-forwarded, for balance checks
- `music/chip.js` + `music/jukebox.html`: a Game Boy-style sound chip and the game's tunes (not wired into the game yet)
- `sw.js`: offline support
