import { z } from 'zod';

/** Both ends parse at the socket boundary, before any state is accepted. */
const colour = z.string().regex(/^#[0-9a-f]{6}$/i);

const visitor = z.object({
  id: z.string().max(64),
  name: z.string().max(12),
  look: z.object({
    shirt: colour,
    hair: colour,
    skin: colour.optional(),
    pants: colour.optional(),
    hat: colour.optional(),
  }),
});

const state = z.object({
  area: z.enum(['village', 'cave']),
  tx: z.number().int().min(0).max(127),
  ty: z.number().int().min(0).max(127),
  facing: z.enum(['up', 'right', 'down', 'left']),
  mode: z.enum(['walk', 'bike', 'surf']),
});

const visitorEvent = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('join'), visitor, state }),
  z.object({ kind: z.literal('move'), id: z.string().max(64), state }),
  z.object({ kind: z.literal('leave'), id: z.string().max(64) }),
]);

export const clientMessage = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('hello'), name: z.string().max(128), state }),
  z.object({ kind: z.literal('move'), state }),
]);

export const serverMessage = z.union([
  visitorEvent,
  z.object({ kind: z.literal('welcome'), visitors: z.array(visitorEvent).max(24) }),
]);

export const wireText = z.string().max(2048);

export type Visitor = z.infer<typeof visitor>;

export type VisitorState = z.infer<typeof state>;

export type VisitorEvent = z.infer<typeof visitorEvent>;

export type ClientMessage = z.infer<typeof clientMessage>;
