import type { CollectionEntry } from 'astro:content';
import { hashText, paletteColor } from './palette';

export type Book = CollectionEntry<'books'>;

const thinnestSpine = 40;

const thickestSpine = 72;

const defaultSpine = 52;

const pagesPerPixel = 8;

export function spineColor(book: Book): string {
  if (book.data.spine) return book.data.spine;

  return paletteColor(book.data.title);
}

/** Thickness in px, from page count when known. */
export function spineThickness(book: Book): number {
  if (book.data.pages === undefined) return defaultSpine;

  return Math.min(thickestSpine, Math.max(thinnestSpine, Math.round(book.data.pages / pagesPerPixel)));
}

/** Width as a percentage of the shelf; varies a little so the stack reads as real books. */
export function spineLength(book: Book): number {
  return 84 + (hashText(book.data.author + book.data.title) % 17);
}

export function spineStyle(book: Book): string {
  return `--spine-color: ${spineColor(book)}; --spine-thickness: ${spineThickness(book)}px; --spine-length: ${spineLength(book)}%;`;
}

export function hasNotes(book: Book): boolean {
  return book.body !== undefined && book.body.trim().length > 0;
}

export function sortBooks(books: Book[]): Book[] {
  return books.toSorted((a, b) => b.data.year - a.data.year || a.data.title.localeCompare(b.data.title));
}

export function groupByYear(books: Book[]): Map<number, Book[]> {
  const groups = new Map<number, Book[]>();

  for (const book of sortBooks(books)) {
    const group = groups.get(book.data.year) ?? [];

    group.push(book);
    groups.set(book.data.year, group);
  }

  return groups;
}
