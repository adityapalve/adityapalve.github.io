import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    /** Vault-relative path of the Obsidian note this was published from. */
    source: z.string().optional(),
  }),
});

const books = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/books' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    /** Year finished (or started, while still reading). */
    year: z.coerce.number().int(),
    isbn: z.string().optional(),
    status: z.enum(['reading', 'finished', 'abandoned']).default('finished'),
    /** Page count drives spine thickness on the shelf. */
    pages: z.coerce.number().int().positive().optional(),
    /** CSS color for the spine; derived from the title when omitted. */
    spine: z.string().optional(),
    description: z.string().optional(),
    source: z.string().optional(),
  }),
});

export const collections = { writing, books };
