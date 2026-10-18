import { advanceTraveller, walkerView, type TravelMode, type Traveler } from './adventure';
import type { World } from './map';
import type { Walker } from './scene';
import type { CharacterLook, Facing } from './sprites';

/** Someone else in the village: who they are, and how they look. */
export type Visitor = { id: string; name: string; look: CharacterLook };

/** Where a visitor is, in the village's own coordinates, so every client agrees without asking. */
export type VisitorState = { area: World['area']; tx: number; ty: number; facing: Facing; mode: TravelMode };

/** What the village learns about everyone else. */
export type VisitorEvent =
  | { kind: 'join'; visitor: Visitor; state: VisitorState }
  | { kind: 'move'; id: string; state: VisitorState }
  | { kind: 'leave'; id: string };

/** A tile change that has arrived, but is not due on the replay clock yet. */
type Arrival = { at: number; state: VisitorState };

type Entry = { visitor: Visitor; traveller: Traveler; state: VisitorState; arrivals: Arrival[] };

/**
 * How far behind the live clock other visitors walk.
 *
 * Their tiles arrive when the network feels like it, so their walk is replayed a little late: by
 * then the next tile has usually arrived, and a packet that is late shows up as a longer stride
 * rather than a stumble. It costs a sixth of a second, which nobody can see.
 */
const replayDelay = 0.15;

/** How far behind a visitor has to fall before we stop pretending and stand them where they are. */
const maxArrivals = 8;

export function createVisitors() {
  const entries = new Map<string, Entry>();
  let clock = 0;

  /**
   * Put a visitor on a tile. Only a single tile of travel can be drawn as a walk; anything else
   * is a doorway, an arrival, or a stall long enough that a jump looks better than a slow-motion
   * replay of the whole thing.
   */
  const place = (entry: Entry, state: VisitorState): void => {
    const travelled = Math.abs(state.tx - entry.traveller.tx) + Math.abs(state.ty - entry.traveller.ty);
    const previous = { tx: entry.traveller.tx, ty: entry.traveller.ty };

    entry.state = state;
    entry.traveller.facing = state.facing;
    entry.traveller.from = travelled === 1 ? previous : { tx: state.tx, ty: state.ty };
    entry.traveller.tx = state.tx;
    entry.traveller.ty = state.ty;
    entry.traveller.step = travelled === 1 ? 0 : 1;
    entry.traveller.moving = travelled === 1;
  };

  const handle = (event: VisitorEvent): void => {
    if (event.kind === 'leave') {
      entries.delete(event.id);

      return;
    }

    if (event.kind === 'join') {
      const state = event.state;

      const traveller: Traveler = {
        tx: state.tx, ty: state.ty, from: { tx: state.tx, ty: state.ty }, facing: state.facing, step: 1, moving: false, cycle: 0,
      };

      // Someone arriving is shown where they stand straight away: there is nothing to smooth
      entries.set(event.visitor.id, { visitor: event.visitor, traveller, state, arrivals: [] });

      return;
    }

    const entry = entries.get(event.id);

    // A move for somebody we never saw arrive: there is no look to draw them with
    if (entry === undefined) return;

    if (entry.arrivals.length >= maxArrivals) {
      entry.arrivals.length = 0;
      place(entry, event.state);

      return;
    }

    entry.arrivals.push({ at: clock + replayDelay, state: event.state });
  };

  const update = (dt: number): void => {
    clock += dt;

    for (const entry of entries.values()) {
      // Replay whatever is due, oldest first; the traveller walks the rest of the way itself
      while (entry.arrivals.length > 0 && entry.arrivals[0]!.at <= clock) {
        place(entry, entry.arrivals[0]!.state);
        entry.arrivals.shift();
      }

      advanceTraveller(entry.traveller, dt, entry.state.mode);
    }
  };

  /** Everyone in `area`, ready for the scene. Visitors elsewhere are not in this world at all. */
  const walkers = (area: World['area']): Walker[] => {
    const list: Walker[] = [];

    for (const entry of entries.values()) {
      if (entry.state.area !== area) continue;

      const view = walkerView(entry.traveller);

      list.push({
        x: view.x,
        y: view.y,
        facing: entry.traveller.facing,
        frame: view.frame,
        mode: entry.state.mode,
        look: entry.visitor.look,
        name: entry.visitor.name,
      });
    }

    return list;
  };

  return { handle, update, walkers };
}
