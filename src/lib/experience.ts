import { z } from 'astro/zod';
import data from '../data/experience.json';

const piece = z.object({
  tags: z.array(z.string()),
  body: z.array(z.string()).min(1),
});

const experience = z.object({
  hero: z.object({
    greeting: z.string(),
    headline: z.string(),
    /** A phrase inside `headline` that gets the hand-drawn circle. */
    circled: z.string().optional(),
    sub: z.string(),
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

/** Split the headline around the circled phrase: [before, phrase, after]. */
export function splitHeadline(headline: string, circled: string | undefined): [string, string, string] {
  if (circled === undefined) return [headline, '', ''];

  const at = headline.indexOf(circled);

  if (at < 0) return [headline, '', ''];

  return [headline.slice(0, at), circled, headline.slice(at + circled.length)];
}
