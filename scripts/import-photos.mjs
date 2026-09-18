#!/usr/bin/env node
// Build src/data/footpaths.json from photos dropped in src/assets/footpaths.
// Runs automatically before `astro dev` and `astro build`. See the README in that folder.

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import exifr from 'exifr';
import { z } from 'astro/zod';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const photosRoot = path.join(repoRoot, 'src/assets/footpaths');

const outputPath = path.join(repoRoot, 'src/data/footpaths.json');

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const unsupportedExtensions = new Set(['.heic', '.heif']);

const locationOverride = z.object({
  name: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  captions: z.record(z.string(), z.string()).default({}),
});

const exifDates = z.object({
  DateTimeOriginal: z.coerce.date().optional(),
  CreateDate: z.coerce.date().optional(),
});

const exifGps = z.object({ latitude: z.number(), longitude: z.number() });

function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function captionFromFilename(fileName) {
  const words = path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, ' ').trim();

  return words.charAt(0).toUpperCase() + words.slice(1);
}

function round(value) {
  return Math.round(value * 1e5) / 1e5;
}

async function readPhoto(filePath) {
  const gps = exifGps.safeParse(await exifr.gps(filePath).catch(() => undefined));

  const dates = exifDates.safeParse(
    await exifr.parse(filePath, { pick: ['DateTimeOriginal', 'CreateDate'] }).catch(() => undefined),
  );

  const fileInfo = await stat(filePath);

  return {
    file: path.relative(photosRoot, filePath),
    coordinates: gps.success ? gps.data : undefined,
    takenAt: (dates.success ? (dates.data.DateTimeOriginal ?? dates.data.CreateDate) : undefined) ?? fileInfo.mtime,
  };
}

async function readOverride(directory) {
  const overridePath = path.join(directory, 'location.json');

  try {
    const parsed = locationOverride.safeParse(JSON.parse(await readFile(overridePath, 'utf8')));

    if (!parsed.success) {
      console.warn(`ignore ${path.relative(repoRoot, overridePath)}: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`);

      return locationOverride.parse({});
    }

    return parsed.data;
  } catch {
    return locationOverride.parse({});
  }
}

async function imageFilesIn(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();

    if (unsupportedExtensions.has(extension)) {
      console.warn(`skip  ${path.relative(repoRoot, path.join(directory, entry.name))}: HEIC is not supported, export as JPEG`);
    } else if (imageExtensions.has(extension)) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files.sort();
}

/** One place: a folder of photos, or a single photo dropped at the root. */
async function buildLocation(name, photoPaths, override) {
  const photos = [];

  for (const photoPath of photoPaths) photos.push(await readPhoto(photoPath));

  const located = photos.flatMap((photo) => (photo.coordinates ? [photo.coordinates] : []));
  const lat = override.lat ?? (located.length > 0 ? located.reduce((sum, c) => sum + c.latitude, 0) / located.length : undefined);
  const lng = override.lng ?? (located.length > 0 ? located.reduce((sum, c) => sum + c.longitude, 0) / located.length : undefined);

  if (lat === undefined || lng === undefined) {
    console.warn(`skip  ${name}: no GPS data in any photo; add lat/lng to location.json`);

    return undefined;
  }

  photos.sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());

  return {
    id: slugify(override.name ?? name),
    location: override.name ?? name,
    lat: round(lat),
    lng: round(lng),
    date: override.date ?? isoDate(photos[0].takenAt),
    photos: photos.map((photo) => ({
      file: photo.file,
      caption: override.captions[path.basename(photo.file)] ?? captionFromFilename(photo.file),
    })),
  };
}

async function main() {
  const locations = [];
  const rootPhotos = await imageFilesIn(photosRoot);

  for (const entry of await readdir(photosRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const directory = path.join(photosRoot, entry.name);
    const photoPaths = await imageFilesIn(directory);

    if (photoPaths.length === 0) continue;

    const location = await buildLocation(entry.name, photoPaths, await readOverride(directory));

    if (location !== undefined) locations.push(location);
  }

  for (const photoPath of rootPhotos) {
    const location = await buildLocation(captionFromFilename(photoPath), [photoPath], locationOverride.parse({}));

    if (location !== undefined) locations.push(location);
  }

  locations.sort((a, b) => b.date.localeCompare(a.date));
  await writeFile(outputPath, JSON.stringify(locations, null, 2) + '\n');
  console.log(`footpaths: ${locations.length} place(s), ${locations.reduce((n, l) => n + l.photos.length, 0)} photo(s) → ${path.relative(repoRoot, outputPath)}`);
}

await main();
