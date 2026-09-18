#!/usr/bin/env node
// Publish Obsidian notes marked `publish: true` into the site's content collections.
//
//   npm run notes:publish
//   OBSIDIAN_VAULT=/path/to/vault npm run notes:publish
//
// Posts land in src/content/writing, books (type: book) in src/content/books.
// Wikilinks to other published notes become site links; other wikilinks become
// plain text. Embedded images are copied next to the note. Files this script
// created earlier (marked with `source:`) are removed when the note stops
// being published.

import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { z } from 'astro/zod';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const vaultRoot = process.env.OBSIDIAN_VAULT ?? path.join(os.homedir(), 'irendel');

const skippedDirectories = new Set(['.obsidian', '.trash', 'node_modules']);

const targets = {
  post: { directory: path.join(repoRoot, 'src/content/writing'), route: '/writing' },
  book: { directory: path.join(repoRoot, 'src/content/books'), route: '/bookshelf' },
};

const tagList = z
  .union([z.string(), z.array(z.string()), z.null()])
  .transform((tags) => {
    if (tags === null) return [];

    if (Array.isArray(tags)) return tags;

    return tags.split(/[\s,]+/).filter(Boolean);
  })
  .transform((tags) => tags.map((tag) => tag.replace(/^#/, '')));

/** Obsidian plugins sometimes write single values as one-item lists. */
const text = z.union([z.string(), z.array(z.string())]).transform((value) => (Array.isArray(value) ? value.join(", ") : value));

const noteFrontmatter = z
  .object({
    publish: z.boolean().default(false),
    type: z.enum(["post", "book"]).default("post"),
    title: text.optional(),
    slug: z.string().optional(),
    date: z.coerce.date().optional(),
    description: text.optional(),
    tags: tagList.default([]),
    author: text.optional(),
    year: z.coerce.number().int().optional(),
    isbn: z.union([z.string(), z.number()]).transform(String).optional(),
    status: z.enum(["reading", "finished", "abandoned"]).optional(),
    pages: z.coerce.number().int().positive().optional(),
    spine: z.string().optional(),
  })
  .passthrough();

const publishedFrontmatter = z.object({ source: z.string().optional() }).passthrough();

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

function noteName(filePath) {
  return path.basename(filePath, '.md');
}

/** Walk the vault once, collecting notes and every non-note file by basename. */
async function scanVault(directory, notes = [], attachments = new Map()) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) await scanVault(entryPath, notes, attachments);
    } else if (entry.name.endsWith('.md')) {
      notes.push(entryPath);
    } else {
      attachments.set(entry.name.toLowerCase(), entryPath);
    }
  }

  return { notes, attachments };
}

async function readPublishableNotes(notePaths) {
  const publishable = [];

  for (const notePath of notePaths) {
    const raw = await readFile(notePath, 'utf8');
    const parsed = matter(raw);
    const result = noteFrontmatter.safeParse(parsed.data);
    const relativePath = path.relative(vaultRoot, notePath);

    if (!result.success) {
      console.warn(`skip  ${relativePath}: ${result.error.issues.map((issue) => issue.message).join('; ')}`);
      continue;
    }

    if (!result.data.publish) continue;

    const frontmatter = result.data;
    const title = frontmatter.title ?? noteName(notePath);

    publishable.push({
      notePath,
      relativePath,
      name: noteName(notePath),
      frontmatter,
      title,
      slug: slugify(frontmatter.slug ?? title),
      body: parsed.content,
    });
  }

  return publishable;
}

async function existingDate(targetPath) {
  if (!existsSync(targetPath)) return undefined;

  const parsed = matter(await readFile(targetPath, 'utf8'));
  const date = z.coerce.date().safeParse(parsed.data.date);

  return date.success ? isoDate(date.data) : undefined;
}

const wikilinkPattern = /(!?)\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;

/** Rewrite Obsidian wikilinks and embeds for one note; copies embedded attachments. */
async function convertBody(note, publishedByName, attachments) {
  const target = targets[note.frontmatter.type];
  const assetDirectory = path.join(target.directory, note.slug);
  const replacements = [];

  for (const match of note.body.matchAll(wikilinkPattern)) {
    const [whole, embedMark, rawTarget, , alias] = match;
    const targetName = path.basename(rawTarget.trim(), '.md');
    const label = alias?.trim() || targetName;
    const linked = publishedByName.get(targetName.toLowerCase());
    const attachment = attachments.get(path.basename(rawTarget.trim()).toLowerCase());

    if (embedMark === '!' && attachment !== undefined) {
      const fileName = path.basename(attachment);

      await mkdir(assetDirectory, { recursive: true });
      await copyFile(attachment, path.join(assetDirectory, fileName));
      replacements.push([whole, `![${alias?.trim() ?? ''}](./${note.slug}/${fileName})`]);
    } else if (linked !== undefined) {
      replacements.push([whole, `[${label}](${targets[linked.frontmatter.type].route}/${linked.slug})`]);
    } else {
      replacements.push([whole, label]);
    }
  }

  let body = note.body;

  for (const [from, to] of replacements) body = body.replace(from, to);

  return body.trim() + '\n';
}

function postFrontmatter(note, date) {
  const { description, tags } = note.frontmatter;
  const frontmatter = { title: note.title, date };

  if (description) frontmatter.description = description;

  if (tags.length > 0) frontmatter.tags = tags;

  frontmatter.source = note.relativePath;

  return frontmatter;
}

function bookFrontmatter(note, date) {
  const { author, year, isbn, status, pages, spine, description } = note.frontmatter;

  if (author === undefined) return undefined;

  const frontmatter = { title: note.title, author, year: year ?? Number(date.slice(0, 4)) };

  if (isbn) frontmatter.isbn = isbn;

  if (status) frontmatter.status = status;

  if (pages) frontmatter.pages = pages;

  if (spine) frontmatter.spine = spine;

  if (description) frontmatter.description = description;

  frontmatter.source = note.relativePath;

  return frontmatter;
}

async function writeNote(note, publishedByName, attachments) {
  const target = targets[note.frontmatter.type];
  const targetPath = path.join(target.directory, `${note.slug}.md`);

  const date = note.frontmatter.date
    ? isoDate(note.frontmatter.date)
    : ((await existingDate(targetPath)) ?? isoDate(new Date()));

  const frontmatter =
    note.frontmatter.type === 'book' ? bookFrontmatter(note, date) : postFrontmatter(note, date);

  if (frontmatter === undefined) {
    console.warn(`skip  ${note.relativePath}: a book needs an \`author\``);

    return undefined;
  }

  const body = await convertBody(note, publishedByName, attachments);

  await mkdir(target.directory, { recursive: true });
  await writeFile(targetPath, matter.stringify(body, frontmatter));
  console.log(`wrote ${path.relative(repoRoot, targetPath)}  ←  ${note.relativePath}`);

  return targetPath;
}

/** Remove files this script published earlier whose note is no longer marked publish. */
async function removeUnpublished(keptPaths) {
  for (const target of Object.values(targets)) {
    if (!existsSync(target.directory)) continue;

    for (const entry of await readdir(target.directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

      const filePath = path.join(target.directory, entry.name);

      if (keptPaths.has(filePath)) continue;

      const parsed = publishedFrontmatter.safeParse(matter(await readFile(filePath, 'utf8')).data);

      if (!parsed.success || parsed.data.source === undefined) continue;

      await rm(filePath);
      await rm(path.join(target.directory, path.basename(entry.name, '.md')), { recursive: true, force: true });
      console.log(`removed ${path.relative(repoRoot, filePath)} (no longer published)`);
    }
  }
}

async function main() {
  if (!existsSync(vaultRoot)) {
    console.error(`Vault not found at ${vaultRoot}. Set OBSIDIAN_VAULT to your vault path.`);
    process.exit(1);
  }

  const { notes, attachments } = await scanVault(vaultRoot);
  const publishable = await readPublishableNotes(notes);
  const publishedByName = new Map(publishable.map((note) => [note.name.toLowerCase(), note]));
  const keptPaths = new Set();

  for (const note of publishable) {
    const written = await writeNote(note, publishedByName, attachments);

    if (written !== undefined) keptPaths.add(written);
  }

  await removeUnpublished(keptPaths);
  console.log(`${keptPaths.size} note(s) published from ${vaultRoot} (${notes.length} scanned).`);
}

await main();
