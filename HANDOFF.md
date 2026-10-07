# DEFENSE — Session Handoff (master document)

Written 2026-10-06 at the end of a long build session, right before the conversation context was compacted.
Read this top to bottom before touching anything. Where this file and the code disagree, **trust the code**
and fix this file. Where this file and `DESIGN.md` / `QUESTIONS.md` / `README.md` disagree, this file is newer.

## 0. READ FIRST: the roguelike pivot (later on 2026-10-06; this overrides older sections below)

The owner changed direction at the end of the session. Where sections 3 to 11 describe the old
"Clash-of-Clans base with slow real-time progression, quarries, farms and a walkable hero", **this section
wins**. The older sections are still accurate for the art, the map/valley, pathing, cards and the code layout.

**The game now (owner's words in quotes):**
- **Complete roguelike.** "lets go with a complete rogue like game ... I can always create a cozy survival game
  with defense later."
  - One life = one save. If the House falls, the save is wiped at once (`endRun(false)` writes a fresh game
    to localStorage right away, so reloading can't undo it).
  - What survives a death (`carryOver()`): gems, art packs, your look and records (top runs, lives).
- **Endless** (owner: "i dont want world 1 and world 2 ... just make the game never ending. The goal of the game is
  to get as far as possible"). Waves go on forever; a Zombie King comes every `BOSS_EVERY` (10) waves, two at
  wave 20 and so on. On death the run (waves survived, kills, gold, House level, hero level, people) goes into
  `game.records.runs` (top `TOP_RUNS` = 10, kept through deaths by `carryOver()`).
- **Home screen** (`phase = 'title'`, `drawTitle`): the game opens here. PLAY (CONTINUE/NEW RUN) and TOP RUNS
  (`drawTopRuns`). After a death, HOME takes you back to it.
- **No day/night, no timer between waves.** "always day. inbetween waves people can move around their base
  and design it." You tap START WAVE when ready.
  - After each wave: a card pick, new Tavern applicants, the House heals `WAVE_HEAL` (30%).
- **Gold from zombies is the only income.** "get rid of quarry and farm. focus solely on gold from zombies as
  income."
  - Quarry, farm, lab, dock, fisher, farmer, food and science are deleted.
  - Pay comes from `killGold(zombieGold, wave)` and `waveBonus(wave)`, both scaling with the wave.
  - The House's gold cap (`storageCap`) is the pressure to upgrade it.
- **Zombie strength follows the wave, not your House** (`waveLevel(wave)` feeds `hpScale`/`damageScale`), so
  upgrading never makes things harder.
- **Game clock** (`game.clock`, `clock()`): runs only while playing, `TIME_SCALE` = 60× real time. A
  "1 hour" upgrade takes a real minute. Timers display via `realTime()`.
- **You are the director.** NPCs from the Tavern do the work:
  - **Archer:** mans a tower; an unmanned tower doesn't shoot.
  - **Builder:** repairs walls and towers for free, mid-wave too.
  - **Guard:** sword, House 2.
  - **Gunner:** gun, House 3.
  - Fighters meet zombies within `GUARD_RADIUS` of the House. Zombies fight them back. Downed fighters get
    up when the wave ends.
- **Hiring is roguelike.** The Tavern shows 3 random applicants (role + trait + name + price). The board
  rerolls after every wave, or for 40G. Traits (`TRAITS`) only roll on roles they help.
- **The hero is a mobile tower** (no more walking around as your character).
  - Tap the hero for their menu: MOVE (then tap a guard spot; works mid-wave), UPGRADE (`heroStats`,
    `heroUpgradeCost`, max level 10) and YOUR LOOK.
  - They shoot zombies in range with a bow and get up when the wave ends.
  - Everything else is tap-to-use (no reach rule). Repairs and wall upgrades still need a walkable route
    from the House door (`reachableSet`).
- **Goals** (`GOALS`) are the early-game tutorial checklist (up to surviving 20 waves).

**Parked ideas (owner: "note that. lets just get the base game down"):** see `reports/ideas-inbox.md`.
- A wall card that raises the wall limit.
- Card upgrades that visibly change buildings (for example, Hawk Eye changes how archer towers look).

**Bots are NOT balance data** (owner: "your simulations dont even move walls or redesign the actual base ...
there is no strategy with them"). `js/bots.js` now plays roguelike lives, but bots never build funnels, move
walls or place the hero. Use them only as a do-nothing floor and smoke test. Real balance needs the owner
playing, or a strategy bot that designs a base.

**Rough numbers (do-nothing base, smoke test only):** wave 1 pays about 56G, wave 5 about 276G. An idle base
hits the 1000G House cap by about wave 5 and dies around wave 5–7.

**On GitHub (2026-10-06):** public repo https://github.com/braetonpurcell-dotcom/defense; phone link
https://braetonpurcell-dotcom.github.io/defense/ (GitHub Pages from the gh-pages branch, built by `tools/publish.ps1`).
To republish: commit, merge to main, push, then run publish.ps1. Git here has no stored GitHub login, so pass gh's
credentials per command: `git -c "credential.helper=!gh auth git-credential" push`, and for publish.ps1 set
`GIT_CONFIG_COUNT=1`, `GIT_CONFIG_KEY_0=credential.helper`, `GIT_CONFIG_VALUE_0=!gh auth git-credential`.

**Next steps (owner: "The fundamentals need to be put in order"):**
1. Owner playtest for feel and balance (how far can a good player get?).
2. Tune costs (`UPGRADES` gold-only, NPC prices, `heroUpgradeCost`) against kill income.
3. A strategy bot that builds a wall funnel and parks the hero at the choke.
4. Remove leftovers: art for the deleted producers (`art-buildings.js` farm/quarry/lab/dock rows, the fisher),
   the village general store and pet shop if they no longer fit, `art-gallery.html` entries, and `QUESTIONS.md`.
5. A start screen and a death screen that explain the roguelike rules.

## Table of contents

1. [Quick start](#1-quick-start)
2. [The owner and how to work with them](#2-the-owner-and-how-to-work-with-them)
3. [The vision and core pillars](#3-the-vision-and-core-pillars)
4. [Decision log](#4-decision-log)
5. [What's built, by system](#5-whats-built-by-system)
6. [Code map](#6-code-map)
7. [Data / save format and migrations](#7-data--save-format-and-migrations)
8. [Balance state](#8-balance-state)
9. [Bugs: fixed and open](#9-bugs-fixed-and-open)
10. [Open questions and pending owner decisions](#10-open-questions-and-pending-owner-decisions)
11. [Next steps (prioritised backlog)](#11-next-steps-prioritised-backlog)
12. [Environment and gotchas](#12-environment-and-gotchas)

---

## 1. Quick start

**Project:** "Defense", a phone-first Game Boy Color-style pixel-art base-defense / open-world game.
Plain ES modules, one `<canvas>`, zero dependencies, zero image files (every sprite is drawn in code).

| Item | Value |
|---|---|
| Repo | `C:\Users\Name\Documents\GitHub\defense` |
| Branch with ALL the work | `draft/initial-scaffold` (everything since commit `b829989` is **uncommitted**, see section 12) |
| Main branch | `main` (only 3 old commits: `8bbb269`, `3871b01`, `b829989`) |
| Other branches | `claude/friendly-murdock-15d438`, `claude/modest-carson-a6936f` (worktrees under `.claude/worktrees`, leftovers from helper agents; ignore) |
| Owner | GitHub `braetonpurcell-dotcom` (git user.name `brachell-dotcom`); `gh` CLI logged in |
| Platform | Windows 11, PowerShell 5.1 + Git Bash. **No node, no python.** |
| Previous game with Claude | Deep Dig Heroes (same owner) |

### Run the game

- Owner's way: double-click `Play Defense.cmd` in the repo root. It runs
  `powershell -NoProfile -ExecutionPolicy Bypass -File tools\serve.ps1 -Open`, which starts a
  `System.Net.HttpListener` static server on `http://localhost:8080` and opens the browser. If the port is already
  busy it just opens the browser.
- Claude's way: `.claude/launch.json` has a configuration named **`game`** (same serve.ps1, port 8080). Use
  `mcp__Claude_Browser__preview_start` with `name: "game"`, then `navigate` to the URL you need.
- Sandbox / test URL: **`http://localhost:8080/?bots=1`**. Any `?bots` query puts the game in SANDBOX mode:
  `loadGame()` returns a fresh `newGame()` and `saveGame()` is a no-op, so the owner's real save is never touched.
- Real play URL: `http://localhost:8080/` (save key `defense.save.v4` in localStorage).

### Test hook

`window.defense` is exposed by `js/main.js` (around lines 2081-2195). Full member list in section 6. The most used:
`defense.step(seconds)` fast-forwards the game loop in 0.05 s ticks (needed because `requestAnimationFrame`
pauses when the Browser pane is hidden), `defense.startRun()`, `defense.nextWave()`, `defense.pickCard(i)`,
`defense.autoPlace()`, `defense.passHours(h)`, `defense.rushBuilder()`, `defense.collectAll()`,
`defense.setLevel(type, level)`, `defense.build(type,c,r)`, `defense.buyNextPlot()`, `defense.resetGame()`,
`defense.game` (live save object), `defense.battle`, `defense.hero`, `defense.worldToScreen(x,y)`.

### Tools (all served under `/tools/` when the server is running)

| Tool | What it does |
|---|---|
| `tools/bots.html` | Bot testers. Loads `../index.html?bots=1` in an iframe, runs every bot in `js/bots.js` (none / slow / medium / fast) for N seasons (default 3, max 20), prints per-run tables (omen, waves cleared, gold earned, House level, land, minutes) plus a summary. Auto-runs on load. |
| `tools/art-gallery.html` | Shows `houseRows(level)` and `wallRows(level, mask)` for levels 1-10 (3x3 ring + lone piece) at scale 2, with `HOUSE_LEVELS`/`WALL_LEVELS` names. |
| `tools/serve.ps1` | Static server (`-Port 8080`, `-Open`). Mime map for .html .js .css .json .webmanifest .png .svg .md; `Cache-Control: no-cache`. Also the sketchbook's save endpoint: `PUT /sketches/<name>.json|png` (name `^[a-z0-9][a-z0-9_-]{0,59}$`, max 4 MB, writes only into `sketches/`), `GET /sketches/` lists the json files. (This file is **modified**, uncommitted.) |
| `tools/sketchbook.html` | **The owner's drawing tool** (built so they can sketch ideas for Claude). Two modes: **map** (one square = one game tile, labelled colours for layouts, plot borders every 6 tiles; the owner asked to **design the world here**, so every colour has an inline name box, the swatch opens a colour picker, **+ Add colour** creates new named colours (with × to remove), **Reset colours** restores defaults; the palette is remembered per mode in localStorage `defense.sketchbook.palette.map|pixel`, and each saved sketch stores its own `legend`/`fullLegend`/`order`, so read a sketch's labels from its file, never assume the defaults) and **pixel** (one square = one pixel, letters = `js/art.js` `PAL` keys, so sprites can go straight into the game). SAVE writes `sketches/<slug>.json` (title, mode, width, height, legend, rows of letters, note, savedAt) plus a `.png` preview via serve.ps1; OPEN reloads one. **Check `sketches/` at the start of every session** and act on anything new. |
| `tools/publish.ps1 [-Preview branch]` | Builds a `gh-pages` branch from `git archive main` (live at `/`) plus the preview branch at `/preview/` (manifest renamed "Defense Preview"), writes `version.json`, `.nojekyll`, force-pushes, enables Pages via `gh api` the first time. **Never run yet.** Does not include uncommitted work. |
| `tools/icon-maker.html` + `tools/make-icons.ps1 -Base64 <png>` | Builds `icons/icon-192.png` and `icons/icon-512.png` (nearest-neighbour upscale). Icons already exist. |
| `music/jukebox.html` + `music/chip.js` | Web Audio chip-tune player (`SONGS.home/wave/victory/defeat`). Not wired into the game. |

### Where things live

- Screenshots: `screenshots/step-1-home-base.jpg` through `screenshots/step-15-world-8x9.jpg` (27 files; the
  "step" number matches the order features were built; the owner wants a screenshot before anything "ships").
  Step 15 is the latest: the world became 8 plots wide x 9 tall with the village in the bottom strip.
- Owner sketches: `sketches/*.json` + `.png` (written by `tools/sketchbook.html`; folder is created by serve.ps1 on
  first run and may not exist yet). Read the json (`rows` of letters + `legend`) when the owner says they drew
  something, or at session start.
- Reports from helper agents: `reports/bugs.md` (7 bugs, all fixed), `reports/design-questions.md`
  (15 proposals, 5 flagged `[OWNER]`), `reports/playtest.md` (~1,500 bot runs, balance findings, 246 lines, **finished**;
  its numbers are NOT yet applied). Expected but not yet present: `reports/ideas-inbox.md` and `reports/answers.md`
  (written by the owner's sidebar sessions; check for them at the start of every session).
- Design docs: `DESIGN.md` (198 lines; vision + 8x9 world layout + card spec + scale rules; the "Loop / World map"
  and "Waves" sections near the bottom are stale), `QUESTIONS.md` (84 lines; 21 open questions, partly stale),
  `README.md` (42 lines; play/dev commands incl. sketchbook + jukebox; code map omits most art files, economy.js, bots).
- Memory files (outside the repo): `C:\Users\Name\.claude\projects\C--Users-Name-Documents-GitHub-defense\memory\`
  with `MEMORY.md` (index), `phone-game-preferences`, `defense-local-play`, `defense-vision`, `user-enjoys-building`
  (role split), `break-and-ideas-protocol`.

---

## 2. The owner and how to work with them

### Role split (the most important thing in this file)

- **Owner = "idea man".** They drop ideas, react to what they see, and enjoy *watching the thing get built* more
  than anything else. They said the building process is what they enjoy most.
- **Claude = creator and developer.** The owner handed over full autonomous control: "think for yourself on the
  design". Make design calls yourself; do not stall on questions. When a design question genuinely needs an
  opinion, the owner's instruction was to consult a Fable 5.1 agent (Agent tool, model `fable`) rather than block
  on the owner. The owner also asked, for this handoff, that the highest level of Claude do the compaction.
- Still **ask questions to pull ideas out of the owner** when it is cheap to do so; they like being interviewed.
  That is why the "Design Interviewer" sidebar session exists (writes `reports/answers.md`).
- **Only the builder (the main session) edits game code.** Helper agents write reports under `reports/`; the
  builder reads them, acts, and marks their entries' `Status:` from `NEW` to done/declined.

### Protocols the owner set

| Situation | What to do |
|---|---|
| Owner drops an idea mid-task | Note it (DESIGN.md "idea drop" blocks, QUESTIONS.md, memory if it is a durable direction, or the ideas inbox), keep working on the current task. Do not pivot. |
| Owner says "take a break" | Genuine creative free time for Claude: music, playing the game, designing a special level or base layouts, even light role-play. Keep it reversible; do not lock in design decisions the owner hasn't made. Previous breaks: wrote chip tunes (`music/`), played the game live. **Show the work in the side panel** (`mcp__ccd_view__show_pane`: the file being written, the diff, or the Browser pane) so the owner can watch, without being asked. Afterwards give a short, fun summary. |
| Owner draws something | They use `tools/sketchbook.html`; the result lands in `sketches/`. Read it and build from it. |
| Owner wants to watch play | They want a **live view** (Browser pane open, game visibly running), not a pile of screenshots. |
| Something is about to "ship" | Take a screenshot into `screenshots/step-N-<name>.jpg` first. |
| Anything draft | Stays on `draft/initial-scaffold` until approved. |
| Owner asks about token usage | Give real numbers. They are on the Max plan. Last reported: 5-hour limit 24%, weekly 37%, Fable weekly 50%, context ~38% (that was before the final stretch of this session). |
| Helper agents | Owner likes separate agents for separate jobs (design questions, bug hunting, playtesting). Spawn them freely; have them write to `reports/`. |

### Communication style

- Short, direct, enthusiastic. They respond to seeing the thing. Lead with what changed and a screenshot/live view.
- No emojis in messages.
- Give them copy-pasteable commands when they have to do something themselves (e.g. git commits, see section 12).

### Things they explicitly liked

- **Tap-to-walk** movement (no joystick). Confirmed twice.
- The **"CAN'T REACH IT"** toast when you try to use a building out of reach.
- The level-1 vs level-10 art contrast (plank fence + trailer vs bunker + crazy walls).
- The 24x24 Game Boy Color look; sprites in code, no image files.
- Bot testers that play the *real* game.

### Things they explicitly disliked / complained about

- **Scale.** "Fisher too small", "tower too small". This became the scale rule (section 4). Expect more of this;
  when drawing anything new, make it read at phone size. Card towers (crossbow etc.) are still at the old scale and
  may draw another complaint.
- Towers/walls being upgradeable independently of the House ("more like Clash of Clans": House gates everything).
- Screens that are separate from the world (they chose one big map with the village on it).
- Anything that ships to GitHub Pages before they have seen it locally (they deferred publishing entirely).

---

## 3. The vision and core pillars

Chronological, in the owner's own terms, with the status of each piece.

1. **A Clash-of-Clans-style base you customise.** Top-down grid, persistent home base. *(built)*
2. **DEFEND starts hordes.** Roguelike runs: each round you pick a card (towers / walls / traps / abilities), placed
   on the base **for that run only**. Run cards **never save** and vanish win or lose. 10 waves, each harder. Lose
   if the House is destroyed. Win by keeping NPCs/buildings safe. Money to repair and upgrade. *(built: 16 cards,
   5 omens, 10 waves, run objects stripped on save and at goHome)*
3. **Big map with zoom; small start area; buy square land chunks** filled with trees (trees vanish when bought).
   *(built: 8x8 chunks of 6x6 tiles, 4 start chunks, landPrice 50+25*bought, puffs on forest tiles)*
4. **One north road from a cave through forest to the base**; monsters come from there. *(built; cave at the top of
   a wiggly 2-wide road, rows 0-17)*
5. **House is 3x3; monsters target the House.** Grid lines on owned land. Gate at the bottom of the wall ring; walls
   connect visually. NPCs must not walk through buildings. *(all built)*
6. **"More like Clash of Clans"**: cannot upgrade towers/walls past the House level; progression should take a LONG
   time (this is PvE, not PvP, so the long grind is the game). *(built: `upgradeBlock` enforces `level < houseLevel`,
   upgrade timers up to 48 h, single builder slot)*
7. **10 levels of walls and House**: level 1 = wood plank fence + trailer; level 10 = crazy walls + insane bunker.
   *(art built for all 10 of each, see `tools/art-gallery.html`)*
8. **Visit friends' bases.** *(later; needs online; not built)*
9. **Quarries (gold), farms (food), labs (science).** *(built; plus a Fishing Dock for food)*
10. **Towers level by upgrading, not by combat.** *(built)*
11. **NPCs unlocked with roles** (farming, mining, archery, science, building, cannons...). *(NOT built; the Tavern in
    the village is a placeholder "HELPERS FOR HIRE ... SOON")*
12. **Artsy for everyone**: badass bases for competitive players AND colourful cute bases ("for girls"). *(built as
    themes: Classic is the base style; Meadow / Candy / Midnight / Inferno / Royal unlocked with gems in the store tab;
    future real-money DLC once online)*
13. **Open world**: pets you care for; tend farms; a pond with an unlockable fisher; walk south through the forest to a
    village to buy pets / walls / towers; survival feel; manage zombie attacks; monsters are zombies for now;
    customise the main character you walk around with, like Pokemon. *(mostly built: hero, pond + dock + fisher,
    farm care, village with pet shop / general store / tavern stub, pets with perks; character customisation screen
    NOT built, only the `look` data exists; village does not yet sell walls/towers)*. **Latest layout change
    (step 15):** the world grew to 8 plots wide x 9 tall; the 9th row (tiles 48-53) is a never-buyable "open-world
    strip" that holds the village, reached by a straight 2-wide dirt path (cols 23-24, rows 30-49). The old village
    clearing inside the 8x8 (rows 38-46) is gone; those are normal forest plots again. The strip layout is a
    placeholder until a village/NPC design pass.
14. **Monsters can destroy walls/buildings in their path but are smart enough to go around.** *(built: flow field with
    `DETOUR_PER_HP = 0.5`)*
15. **Villagers run into the House when a wave starts.** *(built: `villagersRunHome`)*
16. **Scale rule** (born from "fisher/tower too small"): 1 tile = 24 px; people ~16 px tall on one tile, all from the
    same body template; buildings may be taller than their footprint; three-quarter view like GBC Pokemon; never draw
    tiny people inside building sprites, draw workers full-size on top. *(applied to hero, fisher, archer tower;
    base villagers and zombies still use the older mirrored template; card towers not yet redrawn)*
17. **You must walk up to buildings to use them.** 3x3 reach around the character (drawn faintly). Smart base design
    matters: you can't build 5-thick walls because the middle walls can't be reached to repair/upgrade. REPAIR and
    ALL WALLS respect reach. *(built: `REACH = 1`, `reachableSet()`, "CAN'T REACH IT")*
18. **Build mode lives in the bottom bar, only when at home (not during waves):** BUILD -> DONE / ADD / DEFEND!.
    *(built)*

### Core pillars (my synthesis; use these to judge new ideas)

- **Two layers:** a permanent base that grows slowly (Clash-style, House gates everything, real-time timers) and
  run-only cards that make each DEFEND different and never persist.
- **Phone first, GBC look:** 24 px tiles, 3x5 font, big buttons, tap-to-walk, pinch zoom. Everything must read on a
  phone screen.
- **The hero is you:** you walk, you reach, you tend. Nothing happens remotely. Reach is a design constraint, not a
  nuisance.
- **Cute or badass, your choice:** themes, decor, future character customisation and pets are first-class.
- **Long game:** progression is measured in days of real time; runs are the daily loop; bots must keep the numbers
  honest.

---

## 4. Decision log

Chronological groups. "Why" is included so the next session does not re-litigate.

### Group A: foundations (steps 1-3)

| Decision | Reason |
|---|---|
| Single canvas, ES modules, no bundler, no image files | No node/python on the machine; owner wants sprites in code; keeps the PWA trivially cacheable. |
| Local play via `Play Defense.cmd` instead of GitHub Pages | Owner chose to play locally first; publishing deferred. `tools/publish.ps1` exists for later. |
| Drafts on `draft/initial-scaffold` | Owner wants to approve before anything hits `main`. |
| Top-down grid, `T = 24`, world `48 x 54` tiles: an 8x8 grid of buyable 6x6 chunks (`N = 48`) plus one extra chunk-row at the bottom (`STRIP_ROWS = 6`, `NR = 54`, `WORLD = 1152`, `WORLD_H = 1296`) | Fits phone zoom range (`minZ` fits the whole world incl. the strip, `MAX_Z = 6`). The strip was added at step 15 so the village is outside the buyable land. |
| Start with 4 chunks `[3,3],[4,3],[3,4],[4,4]` (tiles 18-29) | Small start area, base in the middle, room to grow all four ways. |
| Buyable land must be 4-adjacent to owned land and inside the 8x8 grid (`canBuy`); the bottom strip can never be bought (`villageChunk()` is now a constant `false`, kept for the old checks) | Keeps the base contiguous; village is public space. The plots the trail crosses stay buyable (the trail stays dirt, like the road). |
| One north road from a cave (`roadLeft(r) = 23 + round(1.4*sin((17-r)*0.45))`, 2 wide) | Owner: single approach so base design matters. Road is walkable even on unowned land. |

### Group B: the run loop (steps 4-6, 10)

| Decision | Reason |
|---|---|
| Waves are **auto-battle** (no tapping during a wave) | Phone-friendly; the player's skill is in base design and card picks. |
| Runs are 10 waves, `RUN_WAVES = 10`; King on wave 10 | Owner's spec. |
| Cards offered **before wave 1** as well (`startRun` goes to phase `break` and calls `offerCards`) | Lets the player set up before the first horde; bottom bar says "SET UP YOUR CARD, THEN START". |
| Run objects are stripped in `saveGame` and at `goHome`; blessings cleared at `goHome` | "Run cards never save". |
| House, trees and decor are rebuilt free after a run (full hp on save and at goHome); walls/towers cost repair | Owner wants losing to sting a little but never soft-lock (a dead House with no gold was the first bug). |
| Gate moved from the top (24,21) to the bottom (24,27); towers moved to the bottom corners (22,26),(26,26) | A no-action base now survives to wave 6 instead of 3-5; monsters walk around the ring to the gate, giving towers time. Migration flag `southGate` in `upgradeSave`. |
| Flow-field pathing with `enterCost = 1 + hp * DETOUR_PER_HP`, `DETOUR_PER_HP = 0.5` | Owner: monsters should smash through if that's shorter but go around when it's cheaper. A 60-hp wall is worth a 30-tile detour. |
| Waves scale with House level: `hpScale = (1+0.15(w-1))*(1+0.45(h-1))`, `damageScale = 1+0.35(h-1)`, `goldScale = 1+0.5(h-1)` | Keeps runs relevant as the base grows (Clash-style). Playtest says the wave term is too small and the House term too large; see section 8. |
| Monsters are zombies (zombie / runner / brute / Zombie King) | Owner: "monsters are zombies for now". DESIGN.md still mentions slimes/goblins in one section (stale). |
| 16 run cards + 5 omens, designed by a Fable agent; spec in `DESIGN.md` | Owner handed design control; cards keyed `CARDS` in `config.js`, art in `art-cards.js`. |
| AUTO placement: towers off the monster path, traps on it, barricades ~5 tiles out, scarecrow ~7 tiles out | Needed for bots and for lazy players. Playtest shows AUTO wrecks Cannon/Brazier and makes Scarecrow harmful. |
| Gems: 5 per win + 1 per run; theme prices Meadow 10, Candy 15, Midnight 25, Inferno 30, Royal 40 | Cosmetic currency that cannot be bought yet; real money later. |
| Skip a card = +15 gold (`SKIP_GOLD`); 1 reroll per run (+1 with the owl) | Gives the "greedy" option a value. |

### Group C: economy and progression (step 9)

| Decision | Reason |
|---|---|
| Three resources G/F/S; storage caps double per House level (1000/800/300 at level 1) | Clash-style; the cap forces upgrading. Playtest: the 1000 cap silently eats run gold. |
| Producers hold up to 6 h of output; farms are a 2 h crop that wilts after 6 more hours (pays 25%) | "Tend your farms" survival feel; rewards returning. |
| Single builder slot; walls upgrade instantly; everything else has a timer; `snack` shortens by 10 min | Clash-style; walls are the cheap "always something to do" sink. |
| `upgradeBlock` order: MAX LEVEL / CANNOT UPGRADE -> REPAIR IT FIRST -> NEEDS HOUSE LV n -> UPGRADING -> BUILDER IS BUSY -> NOT ENOUGH X | Shows the most useful block first. |
| Repair cost = `ceil((1 - hp/maxHp) * BUILDINGS[type].repair * 1.5^(level-1))` | Scales with level like everything else. |
| Lab unlocks at House 3, Dock at House 2 | Pacing. |

### Group D: open world (steps 11-14)

| Decision | Reason |
|---|---|
| **Tap-to-walk** (no joystick). Keyboard arrows/WASD also work for desktop testing | Owner loved it; one finger, no overlay. |
| Hero speed 48 px/s (x1.5 with a fed dog); villagers 14 px/s | Fast enough to not be annoying across the 1152 px world. |
| `REACH = 1` (3x3 around hero), drawn as a faint square; `walkUpTo` auto-paths to the nearest reach tile | Owner: "you must walk up to buildings"; makes thick walls a real trade-off. |
| REPAIR ALL and ALL WALLS only touch buildings in `reachableSet()` (flood fill from the hero) and toast the count that was unreachable | Same rule, consistently. |
| Pond at chunk [5,4] (cols 31-34, rows 25-28), east of the base; dock must touch water, needs House 2, 150 g, 50 food/h | Owner wanted a pond + fisher; fisher became a building with a full-size worker drawn on top after the scale complaint. |
| Village on the **same map**, south, first as a clearing at rows 38-46, then (step 15) moved into a dedicated bottom strip (rows 48-53, the whole width), reached by a straight 2-wide trail (cols 23-24, rows 30-49) | Owner rejected separate screens. The strip can't be bought, has no forest, and zombies never go there. Moving it out of the 8x8 freed the buyable plots and gives the village room for the NPC design pass. |
| Shops along the top of the strip: Pet Shop (16,48), General Store (28,48), Tavern (33,48), each 2x2; door tile = `(c+1, r+2)`, shopkeeper stands at `(c, r+2)` (blocked tiles); Wishing Well at (21,52); plaza c19-29 r50-52; 3 townsfolk start at (20|24|28, 51) and wander the strip | Something to walk to. Tavern is the future hiring hall. |
| Pets: dog 300 g (walk 50% faster), cat 250 g + 50 f (farm crops +25%), owl 400 g + 30 s (+1 reroll); perks only while fed; a meal is 10 food and lasts 48 h; unlimited owned, one active | "Pets you care for" with a light, forgiving upkeep. These numbers differ from the design-questions proposals on purpose. |
| General store: fertiliser 40 g (all growing farms ready now), builder snack 30 f (builder 10 min faster) | First consumables; cheap to implement with existing state. |
| Villagers and hero run to the House at wave start, come out at wave end | Owner's request; also hides the hero during waves so reach isn't a thing mid-fight. |
| Scale rule (section 3, item 16); archer tower redrawn 24x40 (`TOWER_H = 40`) | Owner complaints. |

### Group E: process

| Decision | Reason |
|---|---|
| Bot testers in `js/bots.js` + `tools/bots.html`, sandboxed by `?bots=1` | Owner's first-message requirement. |
| Helper agents write to `reports/`; only the builder edits code | Avoids merge chaos and keeps the owner's "one builder" mental model. |
| `window.defense` hook is the official test surface; synthetic PointerEvents for input tests | Screenshots of an emulated viewport were unreliable for coordinates. |

---

## 5. What's built, by system

### 5.1 World and terrain

- **Behaviour:** 48 wide x 54 tall tiles: an 8x8 grid of 6x6 buyable chunks plus a 6-tile-tall open-world strip
  along the bottom (rows 48-53, the village). Terrain is a single offscreen canvas (`WORLD` x `WORLD_H`) rebuilt by
  `buildTerrain()` at load and after `buyLand`: grass variants (4 seeds), road dirt with edges (no south edge at
  r=17), trail/plaza dirt (no north edge at `TRAIL_TOP`), water with rims, grid lines `rgba(26,28,44,0.16)` on
  owned tiles, forest trees (hash-jittered, `hash(c,r,7) < 0.82`) only on unowned non-road/trail/village tiles and
  not next to the pond, the cave, and chunks of the 8x8 that are neither owned nor buyable darkened
  `rgba(26,28,44,0.38)` (the strip is never darkened).
- **Key numbers:** `T=24`, `CHUNK=6`, `CHUNKS=8`, `N=48`, `STRIP_ROWS=6`, `NR=54`, `WORLD=1152`, `WORLD_H=1296`.
  `BASE_TOP=18`. Road rows 0-17. Pond 12 tiles cols 31-34 rows 25-28. `TRAIL_TOP=30`, trail = cols 23-24 rows
  30-49 (`N+1`). `VILLAGE={c0:0,c1:47,r0:48,r1:53}` (the whole strip), plaza c19-29 r50-52 (`N+2..N+4`).
  `inWorld` uses `c < N && r < NR`.
- **Files / functions:** `main.js` `roadLeft`, `ROAD`, `isRoad`, `CAVE`, `isCave`, `POND`, `isWater`,
  `nextToWater(c,r,size)`, `chunkKey`, `chunkOfTile`, `trailLeft`, `isTrail`, `inVillage`, `isPlaza`,
  `villageChunk`, `canBuy(cx,cy)`, `forestTree(c,r)`, `buildTerrain()`, `fits(b,c,r,size)`, `buildingAt`,
  `ownsChunk`, `ownsTile`, `inWorld`. Art: `art.js` `grassRows`, `dirtRows`, `waterRows`, `treeRows`, `hash`.

### 5.2 Base buildings and limits

- **Behaviour:** House 3x3 at (23,23); 7x7 wall ring tiles 21-27 minus the gate at (24,27); archer towers at
  (22,26) and (26,26); starter quarry (18,21) and farm (18,24) (2x2); four trees. Building limits per House level.
  Placement is centred (`half = floor(size/2)`), must `fits()`, docks must `nextToWater`. Walls keep placing after
  one is placed. Build mode (BUILD button) lets you tap-select and tap-move buildings for free (no walking needed).
- **Key numbers:** `BUILDINGS` hp at level 1: house 300, wall 60 (repair 6), tower 80 (15), tree 40, quarry 120
  (10), farm 100 (8), lab 150 (20), dock 60 (6, rate 50 food/h, nearWater), decor 20 (repair 0). `hpFor = round(hp *
  1.45^(level-1))` (level 10: wall ~1700, tower ~2267, house ~8500). `LIMITS` per House level: wall
  30..150, tower 2..7, quarry 1..4, farm 1..4, lab 0,0,1..3 (House 3), dock 0,1..4 (House 2), decor tables.
  `BUILD_COST`: wall 10, tower 150, quarry 100, farm 80, lab 300g+100f, dock 150, flowers 5, lantern 15, banner 25,
  gnome 20g+5f, crystal 60g+10s, skulls 80.
- **Files / functions:** `config.js` `BUILDINGS`, `sizeOf`, `hpFor`, `LIMITS`, `limitFor`, `BUILD_COST`, `DECOR`.
  `economy.js` `buildBlock`, `build`, `countOf`. `main.js` `DEFAULT_BUILDINGS`, `STARTER_PRODUCERS`, `placeNew`,
  `buyLand`, `landPrice` (config), `onWorldTap` build-mode branch.

### 5.3 Upgrades, builder, repair

- **Behaviour:** House must be upgraded before anything else can pass its level. One builder; timed upgrades show
  a scaffold + progress bar and a HUD countdown ("BUILDER mm:ss" / "BUILDER FREE"); `finishBuilder` runs only when
  phase is `home` (so finishing mid-wave can't heal). Walls upgrade instantly (even with the builder busy, by
  design). ALL WALLS upgrades every reachable wall of the selected wall's level, nearest-to-House first, stopping
  at the first block ("REPAIR WALLS FIRST" / "NOTHING TO UPGRADE"). Repair: the panel button becomes "FIX nG" when
  damaged; REPAIR button (top right) repairs all reachable damaged buildings, cheapest-affordable first by distance
  to the House, skipping unaffordable ones. Repairing a broken producer resets its `since`.
- **Key numbers:** `UPGRADES` tables in `config.js` (house 150g/1m -> 60000g+25000f+12000s/48h; walls 10..9000 g
  instant; tower 60g/30s -> 45000g+12000s/24h; quarry/farm/dock/lab tables). `towerStats(level)`: dmg
  `round(8*1.35^(l-1))`, range `(4+0.15(l-1))*T`, rate `max(0.45, 0.8-0.035(l-1))`.
- **Files / functions:** `economy.js` `upgradeBlock`, `startUpgrade`, `finishBuilder`, `rushBuilder`, `levelUp`,
  `underConstruction`, `upgradeCost`. `main.js` `tryUpgrade`, `upgradeAllWalls`, `repairCostOf`, `repairAll`,
  `repairOne`, `maxHp`.

### 5.4 Production and farm care

- **Behaviour:** quarries make gold, farms food, labs science, docks food; each holds up to 6 h of output (farm:
  one 2-hour crop). Tap (walk up to) a building to collect; a resource bubble appears when stored >= 10% of cap;
  farms show growing / ready / wilted art; wilted pays 25%. Collect is all-or-nothing for farms (toast "STORAGE IS
  FULL"); others collect what fits and rewind `since` by the leftover. Cat perk adds 25% food on farm collection.
  Level-ups preserve the stored amount by rescaling `since`; farms keep `cropLevel` until replanted.
- **Key numbers:** `PRODUCTION = {gold:40, food:30, science:10}` per hour at level 1, x1.6 per level; dock 50/h.
  `storageCap`: gold 1000, food 800, science 300, x2 per House level. `FARM = {growHours:2, wiltAfterHours:6,
  wiltedPays:0.25}`.
- **Files / functions:** `config.js` `PRODUCTION`, `productionPerHour`, `productionCap`, `storageCap`, `FARM`.
  `economy.js` `earn`, `stored`, `collect`, `farmState`, `farmHoursLeft`, `makes`. `main.js` `tryCollect`,
  `drawBuilding` (bubble, farm frame).

### 5.5 Runs, waves, cards, omens

- **Behaviour:** DEFEND! -> `startRun` (random omen, House hp = max * `omen.houseStart`, phase `break`, cards
  offered). Card pick overlay: up to 4 cards (fog omen gives 4 choices), REROLL (n), SKIP +15G. Picking a tower /
  trap / walls card sets `run.pending` (barricade = 6 pieces; traps come in pairs under Runner Rush); place by
  tapping owned tiles or press AUTO. Blessings stack up to `card.stacks`. START WAVE / NEXT WAVE -> villagers run
  home, `battle.startWave`. Wave cleared -> `waveBonus = round((10+2w)*goldScale)`, save, next pick. Wave 10
  cleared -> VICTORY (5 gems + 1). House destroyed -> HOUSE DESTROYED (1 gem). GO HOME -> `goHome` strips run
  objects, clears blessings, clamps hp, heals house/tree/decor, speed 1.
- **Key numbers:** `rarityOdds(wave)`: w<=3 [75,22,3]; <=6 [55,35,10]; <=9 [40,40,20]; else [25,45,30] (Lucky
  Stars uses wave+3). `CARD_POWER = 1.0`. Cards (dmg / range tiles / rate s): crossbow C 6/3.5/0.35; cannon C
  22/4.5/2.0 splash 1.5, 2x2; frost R 3/3.5/0.9 slow to 0.6 for 2 s; ballista R 30/7/2.5 pierce 3, 2x2;
  lightning E 40/6/4 chain 2 x20; brazier E aura 2/2/0.25; spikes C trap 15 x8 charges; bomb C trap 60 splash 2;
  tar R trap slow 0.5; scarecrow R decoy 150 hp; barricade C 6 walls 90 hp; arrows C +25% dmg x3; hawkeye R +1
  range; poison E 2 dps 4 s; stonemason C walls +50% hp and healed; secondwind E House <50% once: stun all 3 s
  +100 hp. Omens: bloodmoon hp x1.3 gold x2; fog range -1, 4 choices; zombierush runners from wave 1, trap pairs;
  luckystars rarer cards, House starts at 75%; calm.
- **Files / functions:** `config.js` `CARDS`, `OMENS`, `rarityOdds`, `RARITY`, `SKIP_GOLD`, `GEMS_*`. `main.js`
  `run` object, `drawCards`, `offerCards`, `pickCard`, `skipCard`, `rerollCards`, `placeRunCard`, `autoPlace`,
  `monsterPath`, `startRun`, `nextWave`, `waveCleared`, `endRun`, `goHome`, `drawCardPick`, `isRunObject`.

### 5.6 Battle simulation

- **Behaviour:** `Battle` class. Flow field (Dijkstra from House tiles and live scarecrows over walkable tiles;
  entering a tile with a standing non-trap building costs `1 + hp*0.5`). Monsters pick the cheapest neighbour each
  time they arrive on a tile, attack the building in their way (`atk` delay 0.3 s then `def.rate`), step on traps
  on exact tile arrival. Towers fire at the in-range monster closest to the House; shots home (arrow/ice 260 px/s,
  ball 180, bolt 340 straight line with pierce); zap is instant with chains; brazier aura hits everything in range.
  Hit flash, slow/poison/stun status, Second Wind blast. Monster kill pays `def.gold * goldScale * omen.goldMul`.
  Field recomputed at wave start and whenever a non-House building dies.
- **Key numbers:** `MONSTERS` (hp / speed px/s / dmg / rate / gold): zombie 20/18/4/1.0/2; runner 14/32/3/0.7/3;
  brute 70/13/12/1.2/6; king 600/10/30/1.5/50 (drawn 2x). `waveList(w)`: 3+2w zombies (gap 1 s); runners w>=3:
  w of them (gap 0.6); brutes w>=5: floor((w-3)/2) (gap 2); king at wave 10 (gap 3). Wave 1 = 5 zombies; wave 10 =
  23 zombies, 10 runners, 3 brutes, king. Spawn alternates cave.c / cave.c+1. Monster damage scales with House
  level only, not wave.
- **Files / functions:** `battle.js` `Battle` (`reset`, `startWave`, `recomputeFlow`, `enterCost`, `pickNext`,
  `spawn`, `update`, `updateMonster`, `speedOf`, `stepOnTraps`, `breakTrap`, `blast`, `hitBuilding`, `towerDef`,
  `updateTowers`, `updateShots`, `applyHit`, `hitMonster`, getters `mods`, `remaining`, `cleared`). World
  interface built in `main.js` ~744-758.

### 5.7 Hero, villagers, pets, townsfolk, reach

- **Behaviour:** hero starts at the gate (24,27). Tap a free tile to walk (BFS, max 400 steps, "CAN'T WALK THERE" /
  "CAN'T GET THERE"); tap a building to `walkUpTo` it then collect + select; keyboard arrows/WASD step one tile.
  The hero can walk on owned free tiles, the road (even on unowned land), the trail and free strip tiles
  (`heroCanStand`). Reach = 3x3 around the hero;
  the info panel deselects when the selection falls out of reach. Two base villagers random-walk inside the base.
  At wave start everyone runs to a tile next to the House and goes inside; after the wave they leave by the door.
  Active fed pet trots 14 px behind the hero (teleports if >200 px away); a red mark shows when it is hungry.
  Camera follows the hero (`follow`) until the player drags; ME button recentres (or `homeView` if the hero is
  inside).
- **Key numbers:** hero 48 px/s (72 with dog), fleeing 48, villagers 14, `REACH=1`, path limit 400 (hero) / 120
  (fleeing) / 10 steps random walk.
- **Files / functions:** `main.js` `villagers`, `hero`, `villagerCanStand`, `heroCanStand`, `findPath`,
  `heroWalkTo`, `reachesFrom`, `inReach`, `reachableSet`, `walkUpTo`, `pet`, `petFed`, `petPerk`, `updatePet`,
  `SHOPKEEPERS`, `TOWNSFOLK`, `pickTarget`, `villagersRunHome`, `villagersLeaveHouse`, `updateVillager`,
  `heroKeyStep`, `heroImg`, `personImg`. Art: `art-hero.js` `heroRows`, `heroPalette`, `HERO_DEFAULT`;
  `art-village.js` `petRows`.

### 5.8 Village and shops

- **Behaviour:** tapping a shop (or its keeper) anywhere in the strip/trail calls `walkUpTo(shop, open, 2)`, so
  the hero walks into reach of the 2x2 shop and the shop opens. Pet Shop: one row per pet (BUY / TAKE /
  WITH YOU) + FEED (10 food, 48 h). General Store: fertiliser, builder snack. Tavern: placeholder row. Wishing well
  toast "A WISHING WELL. NOTHING HAPPENS... YET". Shops close on the X or by tapping outside. Every purchase saves.
  Tapping any other strip/trail tile just walks there (no selection).
- **Layout (step 15):** `SHOPS` = petshop (16,48), store (28,48), tavern (33,48); each has `door = {c+1, r+2}`;
  `SHOPKEEPERS` stand at `(c, r+2)`; `WELL` at (21,52); `villageBlocked` = shop tiles + well + keeper tiles;
  `townsfolk` (3 looks) start at (20,51), (24,51), (28,51) and random-walk any free strip tile.
- **Files / functions:** `main.js` `SHOPS`, `WELL`, `shopAt`, `villageBlocked`, `shopOpen`, `payFor`, `shopItems`,
  `openShop`, `onShopTap`, `drawShop`. `config.js` `PETS`, `PET_MEAL`, `PET_FED_HOURS`, `STORE_ITEMS`.
  Art: `art-village.js` `shopRows`, `wellRows`, `PET_ART`.

### 5.9 Themes, decor, store

- **Behaviour:** build menu has three tabs: BUILD (wall/tower/quarry/farm/lab/dock + START OVER / RESET, needing two
  taps), LOOKS (theme prev/next across owned themes + six decor types with count/limit), STORE (six themes with
  swatches; ON / WEAR / BUY with gems). Theme palette applies to House, walls and decor only; towers, cards and
  producers always use the base palette.
- **Files / functions:** `art-decor.js` `THEMES`, `themeById`, `themePalette`, `DECOR_ART`, `decorRows`. `main.js`
  `setTheme`, `storeTap`, `onMenuTap`, `drawBuildMenu`, `levelImg` (cache keyed `type:level:mask:theme:flash`).

### 5.10 UI and input

- **Behaviour:** integer UI scale `max(1, floor(min(viewW/216, viewH/300)*dpr))`; `HUD_H=16`, `BAR_H=42`,
  `PANEL_H=46`. Pointer drag pans (8 px threshold), pinch zooms, wheel zooms, tap on pointerup. Tap priority:
  end popup > land offer > build menu > shop > card pick > zoom > panel > repair > home > main > left > HUD/bar
  swallow > world. Bottom bar: left button (BUILD/DONE at home, AUTO when placing, SPEED nX in runs), home button
  (ADD in build mode, ME otherwise), main button (DEFEND! / START WAVE n / NEXT WAVE / FINAL WAVE / FIGHTING...).
  Toasts at `HUD_H+6` for 2.2 s. Speed cycles 1 -> 2 -> 3.
- **Files / functions:** `main.js` `layoutUI`, `resize`, `onTap`, `onWorldTap`, `onMenuTap`, `onShopTap`,
  pointer handlers, `drawButton`, `drawBar`, `drawInfoPanel`, `drawHUD` parts inside `render`, `showPanel`,
  `showRepair`, `onUI`, `toUI`, `inRect`. Text: `gfx.js` `drawText`, `textWidth`; `art.js` `FONT`.

### 5.11 Bots

- **Behaviour:** `BOTS` none / slow / medium / fast. `pick` returns -1 (skip), 0 (first), or the strongest by
  `TOWER_FIRST` order (lightning, brazier, ballista, cannon, frost, crossbow, arrows, poison, hawkeye, bomb, tar,
  scarecrow, secondwind, spikes, stonemason, barricade); fast rerolls when the best index > 8. `atHome`: repairAll,
  upgrade House then towers then all walls; fast buys 2 plots. `playSeasons`: resetGame, per season passHours(1) +
  rushBuilder + collectAll, startRun, `step(1)` until phase `end` or 2500 s, card handling guarded (5 picks, 10
  autoPlaces), goHome.
- **Files:** `js/bots.js`, `tools/bots.html`. Bots do NOT yet exercise walking/reach (the hook functions bypass
  reach), build-mode moves, shops, or pets.

### 5.12 PWA shell

- `index.html` (fullscreen `canvas#game`, module `js/main.js`, PWA metas), `manifest.webmanifest` (portrait,
  standalone, icons 192/512 + maskable), `sw.js` (cache `defense-${scope}`, precache list of index + manifest + 16
  js files + icons; network-first on localhost and for `version.json`; skips `/preview/`; stale-while-revalidate
  elsewhere). SW registered only on https or localhost.

---

## 6. Code map

All paths relative to `C:\Users\Name\Documents\GitHub\defense\`. Line counts as of handoff.

| File | Lines | Purpose / key exports |
|---|---|---|
| `index.html` | - | Canvas + module entry + PWA metas. |
| `manifest.webmanifest`, `sw.js`, `icons/` | - | PWA shell (section 5.12). |
| `js/main.js` | 2218 | Everything game-side that is not pure data or battle: world layout, save/load, terrain, hero/villagers/pets, reach, runs/cards, repairs, build/upgrade/buy/collect, shops, input, all drawing, `window.defense`, game loop. No exports; it is the entry module. |
| `js/config.js` | 292 | Pure data and formulas: `T, CHUNK, CHUNKS, N, STRIP_ROWS, NR, WORLD, WORLD_H, START_GOLD, START_FOOD, landPrice, RUN_WAVES, MAX_LEVEL, BUILDINGS, DECOR, sizeOf, hpFor, towerStats, storageCap, PRODUCTION, productionPerHour, productionCap, FARM, LIMITS, limitFor, BUILD_COST, upgradeCost, CARD_POWER, rarityOdds, RARITY, SKIP_GOLD, GEMS_PER_WIN, GEMS_PER_RUN, CARDS, OMENS, PETS, PET_MEAL, PET_FED_HOURS, STORE_ITEMS, MONSTERS, DETOUR_PER_HP, hpScale, damageScale, goldScale, waveBonus, waveList`. |
| `js/economy.js` | 160 | Save-object helpers, every fn takes `(game, ..., now)`: `RES, SHORT, houseOf, houseLevel, countOf, formatCost, formatTime, earn, buildBlock, build, underConstruction, upgradeBlock, startUpgrade, finishBuilder, rushBuilder, levelUp, makes, farmState, farmHoursLeft, stored, collect`. Private: `canAfford, missing, pay`. |
| `js/battle.js` | 411 | `class Battle` (section 5.6). Internal `makeHeap`, `DIRS`, `isTrap`, `isGoal`, `tileCenter`. |
| `js/bots.js` | 106 | `BOTS`, `TOWER_FIRST`, `playSeasons`. |
| `js/gfx.js` | 36 | `rowsToCanvas(rows, pal)` (throws "no palette color" on unknown letter), `drawText`, `textWidth` (3x5 font). |
| `js/paint.js` | 50 | `painter(w,h)` with get/put/rect/hline/vline/frame/disc/each/outline/rows; `blocks()` brick pattern. |
| `js/art.js` | 438 | `PAL` + swaps (`PAL_RED, PAL_RUNNER, PAL_BRUTE, PAL_KING, PAL_FLASH`), `FONT`, `SIZE=24`, `mirror`, `hash`, hand-drawn `SPRITES` (house/wall/tower are legacy and unused; rubble/cave/villager/zombie used), `grassRows, dirtRows, waterRows, treeRows, shadowRows, bigHouseRows` (72x72 level-4 Cottage). |
| `js/art-walls.js` | 85 | `wallRows(level, mask)`, `WALL_LEVELS` (10 names), `WALL_N=1, WALL_E=2, WALL_S=4, WALL_W=8`. |
| `js/art-houses.js` | 228 | `houseRows(level)` 72x72, `HOUSE_LEVELS` (Trailer, Shack, Log Cabin, Cottage, Stone House, Brick Manor, Keep, Fortress, Vault, Bunker). |
| `js/art-buildings.js` | 125 | `buildingRows(type)` (quarry/farm/lab 48x48, dock 24x24), `towerRows()` 24x40, `TOWER_H=40`, `towerPalette(level)`, `FARM_STATES`, `farmPalette`, `SIZES`. |
| `js/art-decor.js` | 104 | `THEMES`, `themeById`, `themePalette`, `DECOR_ART`, `decorRows`. |
| `js/art-cards.js` | 115 | `ART` per card, `hasCardArt`, `cardRows`. |
| `js/art-hero.js` | 60 | `HERO_DEFAULT`, `heroPalette(look)`, `heroRows(dir, frame)`. |
| `js/art-village.js` | 104 | `SHOP_ART`, `shopRows`, `wellRows`, `PET_ART`, `petRows`. |
| `tools/*` | - | Section 1 (`serve.ps1` is modified and `sketchbook.html`, `bots.html`, `art-gallery.html` are new; `publish.ps1`, `icon-maker.html`, `make-icons.ps1` are from the first commit). |
| `music/chip.js`, `music/jukebox.html` | - | Chip-tune engine (`SONGS` home/wave/victory/defeat, `createPlayer()` with `play(song)`/`stop()`) + player page, not wired in. |
| `sketches/` | - | Owner's sketchbook output (json + png), created on demand by serve.ps1. |
| `DESIGN.md` (198), `QUESTIONS.md` (84), `README.md` (42) | - | Docs, partly stale (section 10). |
| `reports/*.md` | - | Agent reports (section 1). |

### `window.defense` hook, complete list (main.js 2087-2197, `step` at 2199)

Getters: `game`, `offer`, `phase`, `run`, `selected`, `shopOpen`, `buildMode`, `cardChoices`.
Objects: `battle`, `villagers`, `hero`, `cam`, `SHOPS`.
Functions: `heroWalkTo(c,r,onArrive)`, `walkUpTo(b,then,size)`, `setBuildMode(on)` (home only), `shopItems()`,
`closeShop()`, `worldToScreen(x,y)`, `chunkCenterOnScreen(cx,cy)`, `setSpeed(s)`, `startRun()` (home only),
`nextWave()` (break only), `goHome()` (end only), `repairAll()`, `pickCard(i)`, `skipCard()`, `rerollCards()`,
`autoPlace()`, `setLevel(type, level)` (no clamp), `upgrade(b)`, `upgradeAllWalls(level)`, `rushBuilder()`,
`build(type,c,r) -> bool`, `collectAll()`, `passHours(hours)`, `buyNextPlot() -> bool`, `resetGame()`,
`step(seconds)` (loops `tick(0.05)`).

### main.js landmarks (approximate line numbers; they drift, grep for the name)

World constants 26-81; `run` 84; save/load 98-200; village strip 219-253; art/terrain 255-356; villagers/hero/pets
358-625 (`hero` 406, `REACH` 432, `SHOPKEEPERS` 508, `townsfolk` 520); screen/layout 627-732 (`HUD_H` 632,
`MAX_Z` 635, `homeView` 645); effects ~734; runs ~744-970 (world interface for `Battle` ~750-764); repairs
~973-1013; build state + build/buy/collect ~1015-1105; shops ~1107-1183 (`openShop` 1172); `onWorldTap` 1185;
helpers ~1247; `onMenuTap` ~1287 (`storeTap` 1271); `onTap` ~1341; pointer input ~1405-1470; drawing
~1472-1871; `render` ~1873-2082; hook 2087; `tick`/`frame` ~2167-2218 (`visibilitychange` save 2214).

---

## 7. Data / save format and migrations

- **Key:** `localStorage['defense.save.v4']`. Old keys `defense.save.v3`, `defense.save.v2` are migrated once
  (only `gold`, `bought`, `owned` are kept; buildings reset to defaults).
- **Sandbox:** any `?bots` in the URL -> never reads or writes localStorage.
- **Save on:** wave cleared, run end, goHome, build/move/buy/upgrade/collect/shop purchase, builder finished,
  `visibilitychange` to hidden. There is **no** `pagehide`/`beforeunload` save (open item).

### Fields

| Field | Type / default | Notes |
|---|---|---|
| `gold`, `food`, `science` | numbers (200 / 50 / 0) | Clamped to `storageCap` by `earn`. |
| `gems` | number (0) | Cosmetic currency. |
| `bought` | number (0) | Plots bought; drives `landPrice`. |
| `owned` | array of `"cx,cy"` chunk keys | Mirrored in the in-memory `owned` Set; `buyLand` keeps both in sync. |
| `buildings` | array | See below. |
| `builder` | `null` or `{id, start, until}` | Single builder slot (ms timestamps). |
| `nextId` | number (1) | Building id counter. |
| `theme` | theme id ('classic') | Reset to classic if not in `ownedThemes`. |
| `ownedThemes` | array (['classic']) | |
| `look` | `{skin, hair, shirt, pants}` hex colours (`HERO_DEFAULT`) | Saved but there is no UI to change it yet. |
| `pets` | `{owned: [], active: null, fedAt: {type: ms}}` | |
| `southGate`, `starterProducers` | booleans | One-shot migration flags set by `upgradeSave`. |

Building record: `{id, type, c, r, level (1), hp, since? (producers, ms), cropLevel? (farms), charges? (spike
traps, run-only)}`. `upgradeSave` fills missing `id`/`level`/`hp`, forces house/tree/decor to full hp, gives
producers `since = now`, farms `cropLevel = level`.

### What never saves

- The `run` object (wave, earned, omen, blessings, rerolls, choices, pending).
- Any building whose type has `BUILDINGS[type].run` (all 11 run cards). `saveGame` filters them out.
- Stonemason's +50% wall hp (hp clamped to `hpFor` on save).
- Hero/villager/pet positions, camera, speed, selection, build mode, toasts.
- Battle state (monsters, shots). Reloading mid-run returns you home with the base as it stood at the last save.

### Migrations already in place

- v3/v2 -> v4: gold/bought/owned only.
- `southGate`: moves the old top gate wall (24,27) -> (24,21) and towers (22|26,22) -> (22|26,26).
- `starterProducers`: adds the quarry and farm if absent and the footprint is free (hard-codes size 2).

---

## 8. Balance state

Source: `reports/playtest.md` (finished, ~1,500 runs on the `?bots=1` sandbox, 2026-10-06). Its economy numbers
predate the farm-care change in `economy.js`. **None of its proposed config edits have been applied.**

### Player-type results (12 seasons each, random omens)

| Player type | Avg waves | Win % | House level reached | Avg gold/run |
|---|---|---|---|---|
| Do-nothing (skips every card, never repairs) | 5.33 | 0% | 1 | 60 |
| Casual (first card, AUTO, repairs every other season) | 8.58 | 50% | 1 | 60 |
| Builder (rushes House/towers/walls, picks towers) | 9.92 | 92% | 3 | 557 |
| Card-maximiser (synergy picks + rerolls) | 9.92 | 92% | 3 | 526 |
| Turtle (closes the gate, barricades) | 0.83 | 0% | 3 | 79 |
| Greedy economist (skips cards, builds producers) | 3.67 | 0% | 4 | 386 |

Fresh level-1 base: first card + AUTO = 9.06 waves, **63% wins** (target was ~25%); strongest card = 97% wins.

### Findings

- Lightning Rod and Ballista are overpowered (a single copy alone clears ~9 waves). Crossbow strong for a common.
- Cannon and Brazier are fine with smart placement but **AUTO wrecks them** (placed out of the path's reach).
- Bomb, Spikes, Stonemason (while the gate is open walls are never hit), Barricade are near useless; **Scarecrow is
  harmful** (pulls the horde out of tower range).
- Omens: Thick Fog is the harsh one (25% casual wins); Lucky Stars is net upside (80%); Blood Moon becomes brutal if
  waves are tuned harder.
- **Rushing the House alone is a trap**: each House level without matching towers costs ~1 wave. With everything
  kept at House level, runs get *easier* as levels rise; at House 7 fully upgraded the base wins with no cards
  (tower damage grows x1.35 exponentially vs monster hp +45% linear per level).
- Cards don't scale with House level (`CARD_POWER` flat), so their share shrinks over time.
- Closing the gate kills you in wave 1-2: monsters smash the top wall (24,21), 4.25 tiles from the bottom-corner
  towers (range 4), so the towers fire zero shots.
- Economy pace (idle, no runs): House 2 at 2 h, 3 at 10 h, 4 at 27 h, 5 at 45 h, 6 at 68 h, 7 at 110 h, 8/9 at
  156/180 h. One run at House 3-4 pays 400-1,750 gold vs ~102 gold/h production: **run gold dwarfs production**.
  Food is never the bottleneck (58,000 surplus in the idle sim). The 1,000-gold cap at House 1 silently eats
  almost all run gold after ~2 runs.

### Proposed config edits (top 5, NOT applied; `js/config.js` still has 1.0 / 0.15 / 30 / 40 / 1.3 / -1)

1. `CARD_POWER` 1.0 -> 0.8
2. `hpScale` wave term `0.15*(w-1)` -> `0.22*(w-1)`
3. Ballista `dmg` 30 -> 22
4. Lightning `dmg` 40 -> 30, `chainDamage` 20 -> 15 (and update its `lines` text)
5. Blood Moon `hpMul` 1.3 -> 1.15; Thick Fog `rangeAdd` -1 -> -0.5

Predicted effect: casual 7.9 waves / 21-23% wins; strongest card 58-75%; do-nothing 4.65-4.9.
Also suggested: scale cards by House level (`CARD_POWER * 1.35 ** (houseLevel-1)`) and raise the House term in
`hpScale`; tower base range 4 -> 4.5 tiles; bomb 60 -> 100; give Scarecrow a real mechanic; `PRODUCTION.gold`
40 -> 60 or `goldScale` 0.5 -> 0.3.

### Known balance risks (beyond the report)

- Design-questions proposal: runs should cost an entry fee (20 food x House level) and run gold should be capped,
  so passive production matters. Not applied; owner has not been asked.
- Monster damage ignores wave number (House level only), so late waves differ only by count and hp.
- Second Wind's +100 hp is flat; worthless at high House levels (House 8,500 hp at level 10).
- Starter bots never use the hero/reach system, so "can I actually reach my walls" is untested by bots.

---

## 9. Bugs: fixed and open

### Fixed this session (from `reports/bugs.md`, 7/7; line refs in that report are stale)

| # | Bug | Fix |
|---|---|---|
| 1 | Saving with a destroyed House soft-locked the game (no gold, dead House) | `saveGame` always writes house/tree/decor at full hp; `upgradeSave` forces them full as a safety net. |
| 2 | House upgrade finishing mid-wave healed it to full | `tick` only calls `finishBuilder` when `phase === 'home'`. |
| 3 | Upgrading a producer paid its stored amount at the new (higher) rate | `levelUp` rescales `since` so the stored amount is preserved; farms keep `cropLevel` until replanted. |
| 4 | Destroyed producers kept producing while rubble | `repairAll`/`repairOne` reset `since` when hp was 0 (economy still runs `since` on rubble; repair is the gate). |
| 5 | Dragging that started on a UI element counted as a tap | `pointermove` always sets `drag.moved` past 8 px regardless of `drag.ui`. |
| 6 | Info panel buttons hit run cards / decor / trees | `onTap` panel branch returns early for those types. |
| 7 | ALL WALLS counted broken walls and gave a wrong message | `upgradeAllWalls` filters `hp > 0`; toasts REPAIR WALLS FIRST / NOTHING TO UPGRADE. |

Also addressed: "STORAGE IS FULL" toast on farm collect (playtest #4, partial: no marker on the run result
screen when run gold was capped).

### Known / open (found in code surveys; none are crashes in normal play)

**Could matter to players**
- `pickNext` returns null if the cave tile is cut off from the House (all neighbours Infinity): monsters idle
  forever and the wave never clears. Cannot happen with the default road, but no fallback exists.
- `autoPlace` silently discards the card when no spot qualifies (pending cleared, no toast).
- `villagersRunHome` with no path sets an empty path, so a hero standing in the village "teleports" inside the
  House at wave start. Since step 15 the village is further away (plaza row 50-52 to the House door at row 27 is
  ~25 tiles plus detours); the fleeing path limit is 120 steps, so it usually still finds a path, but any wall
  ring without a reachable gate makes it fail.
- Run gold over the storage cap is thrown away silently (playtest). The result popup should show it.
- `finishBuilder` on a building that was deleted/moved loses the paid resources silently.
- No `pagehide`/`beforeunload` save; only `visibilitychange`.
- `placing` is not cleared when the build menu closes; tapping unowned land then toasts.
- Rubble producers keep `since` running: repairing after a long absence yields up to 6 h instantly (repair resets
  it, so this is only "free stored output at repair"). Farms wilt while rubble.
- Second Wind is skipped when one blow takes the House to exactly 0.

**Cosmetic / code hygiene**
- `drawCardPick`: the "-bad" omen text is offset oddly (`textWidth('OMEN: ')`, `y+19`) and can overlap card 0.
- `cardIcon(id==='barricade'?'barricade':id)` is a no-op ternary; barricade icon uses stonemason art.
- `buttons.shopRows` fixed at 6, menu box 7 rows: adding items/types overflows.
- `onUI` treats `run.choices` as UI so you cannot pan during the card pick; `onTap` handles choices regardless of
  phase while `drawCardPick` draws only in `break`.
- Store/looks rows index `THEMES` by position (must stay in sync with `layoutUI`).
- REPAIR button is styled 'good' whenever `gold > 0`, even if not enough for everything.
- `setLevel` hook does not clamp; `isRunObject` ignores `b.run`; `upgradeSave` starterProducers hard-codes size 2.
- `heroArt` cache key does `JSON.stringify(look)` every frame (perf, minor).
- `battle.js`: `slow` means "resulting multiplier" for frost (0.6) but "amount removed" for tar (0.5); aura centre
  y differs from other towers; tower cooldown drifts negative while idle; dead traps linger in `this.traps` until
  the next recompute (guarded); trap `charges` are written onto building objects (fine since run cards never save);
  towers have no line of sight.
- `economy.js`: `build()`/`buildBlock()` print "NEEDS HOUSE LV undefined" for types absent from LIMITS (house, tree,
  run cards): never call them for those; card hp is duplicated in `BUILDINGS` and `CARDS` (keep in sync); lab
  upgrades cost food, not science; OMEN `calm` has no fields (by design).
- Art: `lab()` loop at `art-buildings.js:51` only touches row 22; cabin gable eave overdraws the wall at y35;
  `art-walls.js bricks()` duplicates `paint.blocks()`; legacy `SPRITES.house/wall/tower` unused; `PAL.U` and
  `PAL.C` are the same colour; base villagers/zombies use the mirrored legacy template, not the hero template.

---

## 10. Open questions and pending owner decisions

Marked **[OWNER]** where the owner needs to confirm; otherwise the builder may decide.

1. **[OWNER] Run entry cost and run-gold cap.** Design agent proposed 20 food x House level to start a run and a
   cap on run gold, so producers matter. Playtest confirms the imbalance. Not applied.
2. **[OWNER] Zombies attacking the hero in the forest at night.** Design agent proposal; owner hasn't said yes.
3. **[OWNER] Hero optional vs required-away** (can the base be used while the hero is elsewhere?). Currently reach is
   required for repairs/upgrades/collect; build-mode moves do not need reach.
4. **[OWNER] Shops sell only unbuildables?** Design agent says yes; the owner's original idea was the village sells
   walls/towers too. Currently shops sell pets and consumables only.
5. **[OWNER] Character customisation**: free colour picks (design agent) vs unlockable looks? Nothing built.
6. **[OWNER] Publishing**: when to run `tools/publish.ps1` (needs commits on `main` first).
7. Should bots exercise reach/walking/build-mode? (Suggest yes: add a "walker" bot that uses `walkUpTo`.)
8. Apply the playtest's top-5 config edits as-is, or first scale cards by House level? (Suggest: apply the 5,
   re-run bots, then decide on card scaling.)
9. Scarecrow: redesign (e.g. must be inside tower range, or attracts only runners) or remove.
10. Second Wind: scale heal with House level (e.g. 20% of max hp) and trigger on the hit that would kill.
11. Music: wire `music/chip.js` into the game with an audio toggle (home/wave/victory/defeat already composed).
12. Card towers still at the old scale; redraw to the tower template (24x40) before the owner notices.
13. `DESIGN.md` / `QUESTIONS.md` / `README.md` are stale in places. DESIGN: the top "big picture" block IS current
    (8x9 world, strip village, pond, farm care, pets) but the bottom "Loop / World map" section still says 48x48,
    "Waves" still lists Slime/Goblin/Orc/King Slime, the card spec lists Goblin Rush/Twin Caves omens (built set is
    Blood Moon / Thick Fog / Runner Rush / Lucky Stars / Calm Skies), it says "BASE to jump home" (button is ME),
    "Upgrading isn't in the game yet" (it is), "choose 1 of 3 cards" (fog gives 4), and its balance lines are
    pre-cards. QUESTIONS 6b/6c/Q18 say "to build" for things that are built; its Q1-Q4 (House gating, costs, timers,
    builder) are answered by the code. README code map omits most art files, `economy.js`, `bots.js` details;
    bots.html says "Cleared is waves survived". `reports/design-questions.md` header says "nothing walks yet" and
    its answers differ from what was built (joystick -> tap-to-walk, three screens -> one map, fisher villager ->
    Fishing Dock, pet numbers, "pond on one bought plot" -> fixed pond at chunk [5,4]).
14. Wishing well does nothing; tavern is a stub. Both need a feature or a clearer "coming soon".
15. **Village / open-world strip design pass.** The strip (rows 48-53) layout is an explicit placeholder: three
    shops in a row, a plaza, a well, three wanderers. What else lives there (tavern hiring, a wardrobe for
    customisation, a market for walls/towers, pet pens, a second road?) is undecided. Good candidate for an
    owner sketch (`tools/sketchbook.html`, map mode) before building.

---

## 11. Next steps (prioritised backlog)

Do these in order unless the owner redirects. Each is sized to fit comfortably in one sitting.

### P0: start-of-session chores (every session)

1. Check for `reports/ideas-inbox.md` and `reports/answers.md` (owner's sidebar sessions write them, entries
   `Status: NEW`) and for new files in `sketches/` (owner's sketchbook). Read, act or queue, mark the status. Also
   re-read `reports/playtest.md` section 4 ("bugs and rough edges") which this handoff only summarises.
2. Ask the owner to commit (section 12 has the commands). Nothing is committed.
3. Start the server (`preview_start` name `game`), open `?bots=1`, confirm the game loads with no console errors.

### P0.5: the owner's world sketch: BUILT (step 16)

Done in the session after this handoff was written; see DESIGN.md "BUILT (2026-10-06, step 16)" and
screenshots `step-16a-valley.jpg`, `step-16b-river-bridge.jpg`, `step-16c-zombie-den.jpg`. Key code facts:
`config.js` now has `WORLD_PLOTS 24, LAND0 8, LAND1 15, N = NR = 144, WORLD = WORLD_H = 3456, WORLD_MAP` (the
sketch letters). `main.js`: `O = 48` (land offset; layout written as `O + old position`), `plotType/plotGround/
ground(c,r)` (cached, wiggly borders, land exact), `isRiver/isBridge/isMountainLake/isWet`, `ROAD_TOP 33`,
`DANGER_BOTTOM 36`, `PLAZA`, `TRAIL_TOP 78`, `PATH_COLS [71,72]`, plot-image cache `plotImg/buildPlot` + `overview`
+ `drawTerrain(s, ox, oy)` (replaces the old single `terrain` canvas; `buildTerrain()` now just clears the cache),
`canBuy` only for land plots, `upgradeSave` shifts old saves (`worldV`), hero can't enter rows < 36.
Every earlier coordinate in this handoff (e.g. House at (23,23), road at cols 23–24, village at rows 48–53) is now
**+48** (House at (71,71), etc.). Follow-ups: wave length (~70 s at 1X, maybe faster zombies on the long road);
an old-save dock may sit where the old pond was (works; can be moved); balance pass still pending.

### Balance pass: APPLIED (after step 16)
Applied the playtest's top-5: `CARD_POWER 0.8`, wave hp term 0.22, Ballista 22, Lightning 30 / chain 15 (card
text updated), Blood Moon hpMul 1.15, Thick Fog rangeAdd −0.5. Plus: monster hp now grows **×1.4 per House
level** (was +45% linear, so towers outgrew zombies); zombie speeds +30% for the longer road (23/42/17/13);
AUTO places tower cards where they cover the most route tiles within their range (playtest bug 1), Scarecrow
~4 tiles from the House (bug 2); a once-per-run toast when gold is lost at the storage cap (bug 4).
Bot check, 6 runs each, noisy: never-taps ~5 waves 0% wins; card players win roughly a third of runs.
Still open from the playtest: closing the gate loses in wave 1 (starting towers can't reach the top breach),
Bomb/Stonemason/Barricade weak, run gold vs producers (run entry cost idea).

#### Original notes (before building)

The owner drew the whole world in the sketchbook at the very end of this session:
`sketches/overall-rough-world-design.json` (+ `.png`; `untitled-sketch.*` is an earlier save of the same thing).
A **valley**: black danger zone (zombie country) across the north → an unbuyable forest band with the zombie
route through its middle → the 8×8 **main build area** (with pond water) → a **river** running east–west south of
the land, crossed by the dirt path where **a bridge is needed** → the brown **open world** at the bottom.
**Mountains** line the whole west side (a river source in them), **ocean** the whole east side.
Full reading is in DESIGN.md ("Owner's world sketch v1"). **Owner answered (2026-10-06):**
1. **Scale: 1 sketch square = 1 plot (big world).** The world becomes **24×24 plots = 144×144 tiles**
   (3456×3456 px). The green 8×8 = today's buyable land, sitting at sketch cols 8–15 / rows 8–15. Needs
   performance work first: split the single terrain canvas into chunk canvases (draw only what's on screen),
   keep pathfinding arrays sized to the world, keep the flow field limited to walkable land (forest/mountain/
   ocean aren't walkable, so it stays cheap). `CHUNKS` (buyable 8) and the world size must become separate
   constants (world 24 plots; buyable grid offset to plot 8,8). Save migration: shift every saved tile
   coordinate and owned-plot key by +48 tiles / +8 plots (or keep land coordinates and offset the world).
2. **Mountains and ocean are walls of the world, for now:** not walkable, not buildable; can open up later.
Still to confirm when building:
3. Bridge: exactly where the path crosses the river (cols 11–12 of the sketch). Anything else on the river?
4. Does the danger zone have its own content (zombie camps, a source to raid), or is it scenery the waves come from?
Then plan the world rebuild (terrain types: mountain, ocean, river, bridge; walkability; the north road through
the forest band; the open world moved to the bottom) and show a zoomed-out screenshot before polishing.

### P1: balance pass (the playtest is done, act on it)

4. Apply the top-5 edits in `js/config.js` (section 8). Update card `lines` text for lightning.
5. Re-run `tools/bots.html` for 6 seasons; target casual ~8 waves / ~25% wins. Screenshot `step-15-balance.jpg`.
6. Show capped run gold on the result popup ("+340 GOLD (120 LOST, STORAGE FULL)") and toast at wave end.
7. Scarecrow fix (open question 9) and Second Wind scaling (10). Bomb 60 -> 100.
8. Decide/ask about run entry cost + run-gold cap (open question 1); if yes, implement in `startRun` with a
   "NOT ENOUGH FOOD" block, and show the cost on the DEFEND! button.

### P2: finish what the owner has seen half-done

9. **Character customisation screen** (owner's Pokemon-style hero): a LOOKS sub-screen or a Wardrobe in the village
   editing `game.look` (skin/hair/shirt/pants) with the GBC palette swatches; `heroImg` cache already keys on look.
10. **Tavern hiring** (NPC roles): first slice = hire a Farmer (auto-collects farms within the base) and an Archer
    (+10% tower damage) for gold + food per day; store as `game.helpers`. Draw them with the hero template.
11. **Wire music**: `music/chip.js` `createPlayer`; home loop at home, wave track during waves, victory/defeat
    stingers; an audio toggle in the build menu (gear row) saved in `game.audio`. Autoplay needs a user gesture:
    start on the first tap.
12. Redraw card towers (crossbow/frost/lightning/brazier 24x40, cannon/ballista 48x48 tall) to the scale rule.
13. Village sells walls/towers? Only if the owner says yes (open question 4).

### P3: tools and process

14. **Drag-and-copy layout tool** (owner's first-message requirement): in build mode, long-press a wall segment to
    select a run of walls, drag to copy/move; plus "copy this ring" presets. Design it so it respects reach rules
    only at upgrade/repair time, not placement. (`tools/sketchbook.html` map mode is the offline half of this:
    the owner can draw a layout and Claude can read `sketches/<name>.json`; an "import sketch as base layout"
    command would close the loop.)
14b. **Village strip design pass** (open question 15) once the owner has reacted to the step-15 layout.
15. Add a "walker" bot that uses `walkUpTo`/`repairAll` with reach so the reach rule is bot-tested; add shop/pet
    coverage.
16. `pagehide` save; `autoPlace` failure toast; `villagersRunHome` fallback (walk to the nearest base tile instead
    of teleporting); `pickNext` null fallback (walk straight to the House ignoring cost).
17. Refresh `DESIGN.md`, `QUESTIONS.md`, `README.md` from this file (open question 13).

### P4: later / needs online

18. Publish: commit to `main`, run `tools/publish.ps1 -Preview draft/initial-scaffold`, verify live and preview
    links, install on the owner's phone.
19. Friends' bases, real-money themes, leaderboards: all need a backend; not before the owner asks.
20. Zombies at night in the forest (open question 2), pets with more depth, more decor and themes.

---

## 12. Environment and gotchas

### Machine

- Windows 11 Home. PowerShell 5.1 (no `&&`, no `??`, no ternary; `2>&1` on native exes is messy). Git Bash is
  available through the Bash tool for POSIX syntax. **No node, no python, no npm.** Any tooling must be PowerShell,
  a browser page, or plain HTML/JS. `gh` CLI is installed and logged in.
- Always use absolute paths; working directory resets between Bash calls.
- `.gitattributes` has `* text=auto`; git warns about LF -> CRLF on modified files. Harmless.

### Git status and blocked commits (important)

- Branch `draft/initial-scaffold`. Modified: `DESIGN.md README.md index.html js/art.js js/main.js sw.js
  tools/serve.ps1`. Untracked: `HANDOFF.md`, `QUESTIONS.md`, 12 new `js/*.js` files (everything except `main.js`,
  `art.js`, `gfx.js`), `music/`, `reports/`, `tools/art-gallery.html`, `tools/bots.html`, `tools/sketchbook.html`,
  26 of the 27 screenshots (only `step-1-home-base.jpg` is committed). **None of it is committed.**
- Every commit Claude attempted (even plain local commits) was **blocked by the auto-mode classifier** as "Create
  Public Surface". Creating a public repo was also blocked. Do not burn time retrying; give the owner the commands:
  ```
  cd C:\Users\Name\Documents\GitHub\defense
  git add -A
  git commit -m "Steps 2-15: runs, cards, economy, hero, pond, village strip, pets, sketchbook"
  git push -u origin draft/initial-scaffold
  ```
  and, when approved, `git checkout main; git merge draft/initial-scaffold; git push`.
- Worktrees under `.claude/worktrees` belong to old helper branches; do not delete without asking.

### Serving and the Browser pane

- `.claude/launch.json` config `game` -> `tools/serve.ps1` on port 8080. Use `preview_start name: "game"`; if the
  port is busy the script just opens a browser, which is fine.
- Sandbox: `http://localhost:8080/?bots=1`. Real save: `http://localhost:8080/`.
- The service worker caches aggressively on non-localhost; on localhost it is network-first, and `serve.ps1` sends
  `no-cache`, so a plain reload picks up edits. If something looks stale, unregister the SW in devtools or bump
  the cache name in `sw.js`.
- Old 404s for `version.json` in the console are stale/expected (publish never ran).
- `requestAnimationFrame` pauses when the pane is hidden: use `defense.step(seconds)` to advance, not wall time.
- `javascript_tool` times out at **45 s**: cap loops (`step(60)` is fine; thousands of waves is not). An infinite
  loop hangs the tab; close the tab (`tabs_close`) and reopen with `preview_start name: "game"`.
- Screenshots of an emulated mobile viewport can have offset coordinates. Prefer `read_page`, `javascript_tool`
  with `window.defense`, and **synthetic pointer events** over clicking by coordinate.

### Synthetic pointer testing recipe

```js
// in javascript_tool on the game tab
const d = window.defense, cv = document.getElementById('game');
const tap = (sx, sy) => {            // sx, sy in CSS px
  const o = {bubbles:true, pointerId:1, pointerType:'touch', clientX:sx, clientY:sy, isPrimary:true};
  cv.dispatchEvent(new PointerEvent('pointerdown', o));
  cv.dispatchEvent(new PointerEvent('pointerup', o));
};
const [sx, sy] = d.worldToScreen(24*24+12, 20*24+12); // tile (24,20) centre
tap(sx, sy); d.step(5); [d.hero.x, d.hero.y, d.phase];
```
`worldToScreen` returns CSS pixels. Bottom-bar buttons are at UI-space rects from `layoutUI()`; multiply UI px by
`ui/dpr` to get CSS px, or just call the hook functions directly (`d.startRun()`, `d.setBuildMode(true)`).

### Timeouts and long tasks

- Bash/PowerShell foreground limit 120 s default, 600 s max; use `run_in_background` for bot batches.
- `tools/bots.html` with 20 seasons x 4 bots takes minutes; run it in the pane and poll `read_page` instead of
  waiting in a JS loop.
- Helper agents: give them the sandbox URL, the hook list, and "never edit project files"; have them write to
  `reports/<name>.md` with `Status:` lines.

### Habits that kept this session smooth

- Grep for function names instead of trusting line numbers; `main.js` moves a lot.
- After any art change, open `tools/art-gallery.html` or the game and take a screenshot before telling the owner.
- When adding a building type: `BUILDINGS`, `LIMITS`, `BUILD_COST`, `UPGRADES` (if upgradeable), art rows, `SIZES`
  if 2x2, `MENU` (and the 7-row menu limit), `sw.js` precache list if a new file, README code map.
- When changing the world shape: `config.js` (`N`, `NR`, `STRIP_ROWS`), `main.js` `inWorld`, `buildTerrain`
  (loops over `NR`), `minZ`, `VILLAGE`/`TRAIL`/`SHOPS`/`WELL`/`isPlaza`, `townsfolk` start tiles, and the
  `sketchbook.html` map-mode plot borders (every 6 tiles). Take a zoomed-out screenshot (like step-15).
- The `?bots=1` sandbox starts from `newGame()`, so anything that only shows up in a migrated save (`southGate`,
  `starterProducers`, old village coordinates in `owned`) must be tested on the real URL with a copied save.
- When adding a card: `CARDS` **and** `BUILDINGS` (hp duplicated), `art-cards.js`, `TOWER_FIRST` in bots, DESIGN.md
  card table.
