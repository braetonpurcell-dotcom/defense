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

## Code
- `js/art.js`: palette, 24×24 sprites, generated grass/trees, pixel font
- `js/gfx.js`: turns sprite data into images, draws text
- `js/main.js`: the home base screen
- `sw.js`: offline support
