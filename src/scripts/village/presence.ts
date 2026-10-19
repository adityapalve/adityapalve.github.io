import { directions, speeds } from './adventure';
import { noise } from './pixels';
import type { CharacterLook, Facing } from './sprites';
import type { Visitor, VisitorEvent, VisitorState } from './visitors';

/**
 * The other visitors in the village.
 *
 * Deliberately the whole of the transport: say where you are, and take away whatever everyone
 * else did since you last looked. The live socket and the offline ghosts both implement these
 * three calls, without the game needing to know which one it is using.
 */
export type Presence = {
  /** Say where you are now. */
  publish: (state: VisitorState) => void;
  /** Everything that has arrived since the last call, oldest first. */
  drain: () => VisitorEvent[];
  close: () => void;
};

/** Who the stand-in visitors are, so they are never mistaken for the hut keepers. */
const ghostNames = ['MISTY', 'BROCK', 'JOY', 'KURT', 'DAISY', 'OAK'];

const ghostLooks: CharacterLook[] = [
  { shirt: '#3b6ea5', hair: '#1d1a1f' },
  { shirt: '#2f7d4f', hair: '#7a4a1a' },
  { shirt: '#6b4a8f', hair: '#d9c29a', hat: '#e8c46a' },
  { shirt: '#b8862e', hair: '#1d1a1f' },
];

const facings: Facing[] = ['up', 'right', 'down', 'left'];

type Ghost = { visitor: Visitor; state: VisitorState; since: number; salt: number; steps: number };

export type LoopbackOptions = {
  /** Which tiles a visitor may stand on, so the ghosts keep to the village's own rules. */
  canEnter: (tx: number, ty: number) => boolean;
  /** Where they set off from. */
  start: { tx: number; ty: number };
  count: number;
};

/**
 * A room with nobody in it: a few visitors who live in this browser and walk about on their own.
 *
 * It is here so that the way other people are drawn — the depth, the nameplates, a stride that
 * is interpolated rather than snapped — can be looked at without a server, and so that a real
 * socket has something to be measured against later. Turn it on with `?ghost=3`.
 */
export function createLoopbackPresence(options: LoopbackOptions): Presence {
  const events: VisitorEvent[] = [];
  const ghosts: Ghost[] = [];

  for (let index = 0; index < options.count; index += 1) {
    const state: VisitorState = {
      area: 'village',
      tx: options.start.tx,
      ty: options.start.ty + index + 1,
      facing: 'down',
      mode: 'walk',
    };

    const visitor: Visitor = {
      id: `ghost-${index}`,
      name: ghostNames[index % ghostNames.length]!,
      look: ghostLooks[index % ghostLooks.length]!,
    };

    ghosts.push({ visitor, state, since: 0, salt: index * 17 + 3, steps: 0 });

    // They were here all along, as far as the village is concerned
    events.push({ kind: 'join', visitor, state });
  }

  /** Someone with somewhere to be: they hold their line most of the time. */
  const roam = (ghost: Ghost): void => {
    ghost.steps += 1;

    // The direction comes from the same noise the village scatters its detail with, so a ghost
    // walks the same walk every time you look at it
    const wander = noise(ghost.salt, ghost.steps, 3) < 0.25;
    const offset = Math.floor(noise(ghost.salt, ghost.steps, 5) * facings.length);
    const order: Facing[] = [];

    if (!wander) order.push(ghost.state.facing);

    for (let index = 0; index < facings.length; index += 1) {
      order.push(facings[(offset + index) % facings.length]!);
    }

    for (const facing of order) {
      const delta = directions[facing];
      const tx = ghost.state.tx + delta.dx;
      const ty = ghost.state.ty + delta.dy;

      if (!options.canEnter(tx, ty)) continue;

      ghost.state = { ...ghost.state, tx, ty, facing };
      events.push({ kind: 'move', id: ghost.visitor.id, state: ghost.state });

      return;
    }

    // Nowhere to go: turn on the spot, which the other end reads as a turn and not a step
    ghost.state = { ...ghost.state, facing: facings.find((facing) => facing !== ghost.state.facing)! };
    events.push({ kind: 'move', id: ghost.visitor.id, state: ghost.state });
  };

  return {
    // There is nobody out there to hear it; this is one browser talking to itself
    publish: () => {},
    drain: () => {
      const now = performance.now() / 1000;

      for (const ghost of ghosts) {
        if (now - ghost.since < 1 / speeds.walk) continue;

        ghost.since = now;
        roam(ghost);
      }

      return events.splice(0, events.length);
    },
    close: () => {},
  };
}
