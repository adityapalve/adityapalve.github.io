# Aditya Palve - Personal Website

A minimal, text-first personal website built with [Astro](https://astro.build).

## Features

- **Home** – Introduction and selected writing
- **Writing** – Blog posts and long-form content
- **Bookshelf** – Books I've read with covers from Open Library
- **Footpaths** – Interactive map of places I've visited with photos
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

### Books

Edit `src/data/books.json`:

```json
{
  "title": "Book Title",
  "author": "Author Name",
  "isbn": "9780123456789",
  "year": "2024",
  "notes": "Brief note about the book"
}
```

### Footpaths / Locations

Edit `src/data/footpaths.json`:

```json
{
  "id": "unique-id",
  "location": "Place Name",
  "lat": 37.7749,
  "lng": -122.4194,
  "date": "2024-01-15",
  "photos": [
    {
      "src": "/photos/photo-name.jpg",
      "caption": "Photo description"
    }
  ]
}
```

Photos go in `public/photos/`.

## Original Quartz Site

The original Quartz-based site is preserved in the `stash/` folder.

## Tech Stack

- [Astro](https://astro.build) – Static site generator
- [Leaflet](https://leafletjs.com) – Interactive maps
- [Open Library](https://openlibrary.org) – Book cover images

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
