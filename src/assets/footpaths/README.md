# Footpaths photos

Drop photos here. One folder per place:

```
src/assets/footpaths/
  Golden Gate Bridge/
    foggy-morning.jpg
    from-the-headlands.jpg
  Central Park/
    winter-walk.jpg
```

`npm run build` (and `npm run dev`) first runs `scripts/import-photos.mjs`, which:

- reads GPS and capture date from each photo's EXIF,
- places the folder at the average of its photos' coordinates,
- dates it by the earliest photo,
- turns the filename into a caption (`foggy-morning.jpg` → "Foggy morning"),
- writes `src/data/footpaths.json`.

Published images are re-encoded by Astro, which strips EXIF, so location and
device metadata never ship. The originals here stay in the repo as-is.

Supported: `.jpg`, `.jpeg`, `.png`, `.webp`. HEIC is skipped with a warning;
export those as JPEG first.

Optional `location.json` inside a folder overrides anything EXIF got wrong:

```json
{
  "name": "Golden Gate Bridge",
  "lat": 37.8199,
  "lng": -122.4783,
  "date": "2024-03-15",
  "captions": { "foggy-morning.jpg": "Fog rolling under the bridge at 7am" }
}
```

A photo dropped directly in this folder (not in a subfolder) becomes its own place,
named from the filename.
