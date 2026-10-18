# Aditya Palve - Personal Website

A minimal, text-first personal website built with [Astro](https://astro.build).

## Features

- **Home** – Introduction, a live postcard of the village, and recent writing
- **Village** – My work as a small pixel-art village you walk around
- **Experience** – The same story as a plain page, for anyone who skips the walk
- **Writing** – Blog posts and long-form content
- **Bookshelf** – Books I've read as a shelf of generated spines, linked to my notes
- **Footpaths** – Map of places I've visited, generated from photo EXIF data
- **Contact** – Ways to get in touch

The type is [ABC Areal](https://abcdinamo.com/typefaces/areal) for text and
[Paper Mono](https://paper.design/mono) for labels and code. Both the palette and the typeface
can be changed from the pickers in the footer.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Adding Content

Everything on the site is generated from files in the repo. Nothing is hand-edited in `src/pages`.

### Writing (from Obsidian)

Posts live in `src/content/writing/*.md` and are published from the Obsidian vault:

1. In any note, add `publish: true` to the frontmatter. Optional: `title`, `date`,
   `description`, `tags`, `slug`. Without a `date` the first publish date is kept.
2. Run:

   ```bash
   npm run notes:publish
   ```

3. Commit the generated files.

The vault defaults to `~/irendel`; override with `OBSIDIAN_VAULT=/path npm run notes:publish`.
Wikilinks to other published notes become site links, other wikilinks become plain text,
and embedded images are copied next to the post. Removing `publish: true` and re-running
deletes the published copy.

### Books

Books live in `src/content/books/*.md`. Frontmatter:

```yaml
title: The Power Broker
author: Robert Caro
year: 2024            # year finished
isbn: "9780394720241" # optional
status: finished      # reading | finished | abandoned
pages: 1246           # optional, drives spine thickness
spine: "#5a2e2e"      # optional, spine color (derived from the title otherwise)
description: One line for the home page
```

The markdown body is your notes. A book with a body gets a page and a clickable spine on
the shelf; a book without one is just a spine. Books can also be published from Obsidian:
set `type: book` alongside `publish: true` and the fields above.

### Footpaths / Photos

Drop photos in `src/assets/footpaths/<Place Name>/`. The build reads GPS and dates from
EXIF and writes `src/data/footpaths.json` automatically (`npm run photos:import` to run
it by hand). See [src/assets/footpaths/README.md](src/assets/footpaths/README.md) for
overrides and captions.

### The village (/village)

A small pixel-art village built from the experience data. Each of the four `cases` in
`src/data/experience.json` becomes a hut whose keeper reads out that case's `points`
one bullet at a time; the keeper at the workshop stall by the pond covers `side`, with
links. Art is drawn in code in `src/scripts/village/`; there are no image assets.

The game fills the window. The home page shows a non-interactive postcard of the same
village (`postcard.ts`), and `/experience` renders the full `experience.json` as a plain
page; both "skip" links point there.

The map also has an eastern lake, a small island, and a southern grove:

- **Companion:** face Squirtle northwest of the plaza and press Enter (or touch A).
  Squirtle joins you and follows one tile behind on land.
- **Bicycle:** collect the bicycle west of the plaza. Press B or the Cycle button to
  toggle faster land travel. Entering water dismounts the bicycle.
- **Surf:** with Squirtle, walk into water to surf. Walk onto land to come ashore.
  Without Squirtle, water blocks movement; interact with it for a hint.
- **Frostfall Cave:** surf to the island and walk into the opening in its northern ridge.
  This original Icefall-inspired cavern has sliding ice, rocky stopping points, an animated
  waterfall, and a surfable pool. On ice you keep moving straight until reaching dry ground
  or an obstacle; after stopping, choose another direction. Bicycles stay dismounted inside.
  Walk through the glowing southern doorway to return to the island. Your companion,
  bicycle, visited huts, and discoveries are retained when changing areas.
- **Secrets:** read the island lookout, grove, and frozen chamber signs to discover three
  hidden messages. Re-reading a sign does not increase the discovery count.

Movement uses arrows or WASD; Enter, Space, E, or Z interacts; Escape closes dialogue.
Touch controls provide a d-pad and A, plus a Cycle button after collecting the bike.
Companion, bicycle, and discovery progress last for the current visit and reset on reload.

#### Reusing the game with p5.js

The current renderer uses Canvas 2D, not p5.js. A p5 migration does not require rebuilding
the whole game:

- `map.ts` owns village terrain and locations; `cave-map.ts` defines the cave interior.
- `adventure.ts` owns movement, collision, companion following, unlocks, ice sliding,
  and area-transition state, without DOM or drawing dependencies.
- `sprites.ts`, `tiles.ts`, and `adventure-sprites.ts` generate cached canvas sprites.
- `dialog.ts` and the page's HTML HUD can stay outside the sketch, keeping text and
  controls accessible.

Use a p5 **instance-mode** sketch for this page. Its `draw` loop can update the adventure
and pass its Canvas 2D `drawingContext` to `createScene().draw`, reusing the existing art.
The canvas creation/sizing, input binding, timing, and sketch teardown need adapting;
the Astro markup is not itself a p5 component. The home postcard already shares the
world and renderer and remains non-interactive.

## Themes

Themes are tokens on `<html data-theme>`, defined at the top of
[`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro):

| Value | What it is |
| :---- | :--------- |
| *(no attribute)* | Follows `prefers-color-scheme`; what you get with JavaScript off |
| `light` / `dark` | Porcelain, and ink for reading at night |
| `paper` | Warm stock and iron-gall ink — the village textbox, the book spines |
| `frostfall` | The cave, the waterfall, and the lake at night |
| `gameboy` | The four DMG greens, in the order Nintendo named them |
| `terminal` | Phosphor on a tube, for the pages that are mostly mono |

A theme only moves five tokens: `--color-bg`, `--color-text`, `--color-muted`, `--color-link`
and `--color-link-hover`, plus `--font-body-variation` for Areal's `DRKM` axis. Code fills,
card rings, drop shadows and image edges are all mixed from `--color-text` in `:root`, so a new
theme gets correct depth for free — add one block and an `<option>` in the picker and it works.

The picker in the footer writes to `localStorage`, and a small inline script in the `<head>`
puts the remembered value on `<html>` before the first frame so there is no light flash. It also
pins `<meta name="theme-color">` so the browser chrome matches.

## Type

The second picker swaps the reading face, and is meant for comparing rather than for visitors:

| Value | Family |
| :---- | :----- |
| `areal` | ABC Areal, the default |
| `georgia` | The serif stack the site used before, for a calmer long-form voice |
| `mono` | Paper Mono throughout, the way it is meant for long-form text |

`mono` turns on `ss02` (Duospace glyphs) and `ss03` (Narrow space) via `--font-body-features`.
Paper Mono ships those for exactly this: duospacing narrows the wide glyphs so a paragraph of mono
stops reading as a table of cells, while everything stays on a grid. It fits around 55 characters
per line at this measure, against 52 without.

Adding a picker is markup only: the `preferences` list in the layout renders the `<select>`, and
`src/scripts/preferences.ts` takes the rest from it — the `id` becomes both the `data-` attribute
on `<html>` and the storage key, and the select's own options are its values.

## Fonts

| | Text | Labels, code, numbers |
| :-- | :-- | :-- |
| Family | ABC Areal (variable, `wght` 400–700, `slnt`, `DRKM`) | Paper Mono (variable, `wght` 100–800) |
| Licence | Free from Dinamo | SIL OFL |
| In this repo | Yes, `public/fonts/areal/` | Yes, `public/fonts/paper-mono/` |

**Paper Mono** is OFL, so it is committed and served without a caveat.

**ABC Areal** is free from Dinamo, but their [licence](https://abcdinamo.com/licenses) bars putting
the binaries in public repositories or on public servers. This repository is public and served by
GitHub Pages, so committing the subset is exactly what that clause is about: a risk knowingly
accepted for a personal site, not a reading of the licence. Everything else here follows the terms,
and removing it again is two edits — the files plus the links in the layout.

- `scripts/sync-fonts.mjs` subsets the copy installed on this machine
  (`~/Library/Fonts/ABCArealVariable.ttf`, override with `AREAL_FONT=`) into
  `public/fonts/areal/`, and writes the `@font-face` stylesheet beside it. It runs automatically
  before `npm run dev`, and only rebuilds when the local source is newer than the subset, so a
  clone without the font still builds against what is committed.
- Download it from [abcdinamo.com/free/areal](https://abcdinamo.com/free/areal) if it is not
  installed. Subsetting needs `pip install fonttools brotli`; without it the script keeps the
  committed subset and warns.

The layout links the stylesheet unconditionally; if the request fails the stack falls back to
Helvetica/Arial, which is what Areal is a redraw of, so the site degrades almost identically.

## Icons

`npm run icons` regenerates `public/favicon.svg` and `public/apple-touch-icon.png` from one
16×16 pixel grid in [`scripts/make-icons.mjs`](scripts/make-icons.mjs) — a hut from the village,
drawn in code like the rest of the art. The tab icon is a silhouette that flips for
`prefers-color-scheme`; the touch icon is the same hut inset on opaque paper, because a
transparent icon reads as a hole on the home screen.

## Checks

```bash
npm run lint    # oxlint with the vendored anti-slop rules (tools/oxlint/anti-slop)
npm run check   # astro check (TypeScript)
```

## Original Quartz Site

The original Quartz-based site is preserved in the `stash/` folder.

## Tech Stack

- [Astro](https://astro.build) – Static site generator
- [Leaflet](https://leafletjs.com) – Interactive maps
- [Obsidian](https://obsidian.md) – Where the writing happens; published with `npm run notes:publish`

## Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run fonts:sync`      | Rebuild the web fonts from the installed copies  |
| `npm run icons`           | Regenerate the favicon and touch icon            |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
