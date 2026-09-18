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
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
