import { z } from 'astro/zod';
import data from '../data/experience.json';

const piece = z.object({
  tags: z.array(z.string()),
  body: z.array(z.string()).min(1),
});

const experience = z.object({
  hero: z.object({
    headline: z.string(),
  }),
  cases: z.array(piece.extend({ years: z.string(), title: z.string(), role: z.string(), points: z.array(z.string()).min(1), label: z.string().max(9) })),
  side: z.array(piece.extend({ name: z.string(), url: z.string().url().optional() })),
  about: z.array(z.string()),
  path: z.array(
    z.object({
      period: z.string(),
      kind: z.enum(['practice', 'study']),
      title: z.string(),
      org: z.string(),
      blurb: z.string(),
    }),
  ),
  contact: z.object({
    blurb: z.string(),
    email: z.string().email(),
    links: z.array(z.object({ label: z.string(), url: z.string().url() })),
  }),
});

export type Experience = z.infer<typeof experience>;

export function loadExperience(): Experience {
  return experience.parse(data);
}
