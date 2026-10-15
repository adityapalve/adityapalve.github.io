import { mapHeight, mapWidth, type Portal, type World } from './map';
import type { Facing } from './sprites';

export type TravelMode = 'walk' | 'bike' | 'surf';

export type Traveler = {
  tx: number;
  ty: number;
  from: { tx: number; ty: number };
  facing: Facing;
  step: number;
  moving: boolean;
  cycle: number;
};

type AdventureState = {
  player: Traveler;
  companion: Traveler;
  hasCompanion: boolean;
  hasBike: boolean;
  mode: TravelMode;
  area: World['area'];
  sliding: boolean;
};

export const directions: Record<Facing, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const speeds: Record<TravelMode, number> = { walk: 5.2, bike: 9, surf: 4.2 };

/** World-space rules only: no canvas, input events, or DOM dependencies. */
export function createAdventure(initialWorld: World) {
  let world = initialWorld;
  const player: Traveler = { ...world.start, from: { ...world.start }, facing: 'up', step: 1, moving: false, cycle: 0 };
  const companion: Traveler = { ...player, from: { ...world.start } };
  const state: AdventureState = { player, companion, hasCompanion: false, hasBike: false, mode: 'walk', area: world.area, sliding: false };

  const clearPickup = (id: 'starter' | 'bike') => {
    const feature = world.features.find((feature) => feature.id === id);

    if (feature !== undefined) world.solid[feature.ty]![feature.tx] = false;
  };

  const acquireCompanion = () => {
    state.hasCompanion = true;
    Object.assign(companion, player, { from: { tx: player.tx, ty: player.ty } });
    clearPickup('starter');
  };

  const acquireBike = () => {
    state.hasBike = true;
    clearPickup('bike');
  };

  const toggleBike = (): boolean => {
    if (!state.hasBike || player.moving || state.mode === 'surf' || state.area === 'cave') return false;

    state.mode = state.mode === 'bike' ? 'walk' : 'bike';

    return true;
  };

  const travelTo = (nextWorld: World, arrival: Portal['arrival']) => {
    world = nextWorld;
    state.area = world.area;
    state.mode = 'walk';
    state.sliding = false;

    for (const traveler of [player, companion]) {
      Object.assign(traveler, arrival, { from: { tx: arrival.tx, ty: arrival.ty }, step: 1, moving: false, cycle: 0 });
    }
  };

  const canEnter = (tx: number, ty: number): boolean =>
    tx >= 0 && ty >= 0 && tx < mapWidth && ty < mapHeight && !world.solid[ty]![tx] &&
    (world.ground[ty]![tx] !== 'water' || state.hasCompanion);

  const update = (dt: number, facing?: Facing): Portal | undefined => {
    if (player.moving) {
      const speed = state.sliding ? 10 : speeds[state.mode];

      player.step = Math.min(1, player.step + dt * speed);
      player.cycle += dt * speed * 2;
      companion.step = player.step;
      companion.cycle = player.cycle;

      if (player.step >= 1) {
        player.moving = false;
        const portal = world.portals.find((portal) => portal.tx === player.tx && portal.ty === player.ty);

        if (portal !== undefined) return portal;
      }
    }

    if (player.moving) return;

    const nextFacing = state.sliding ? player.facing : facing;

    if (nextFacing === undefined) return;

    player.facing = nextFacing;
    const delta = directions[nextFacing];
    const tx = player.tx + delta.dx;
    const ty = player.ty + delta.dy;

    if (!canEnter(tx, ty)) {
      state.sliding = false;

      return;
    }

    companion.from = { tx: companion.tx, ty: companion.ty };
    const dx = player.tx - companion.tx;
    const dy = player.ty - companion.ty;

    companion.facing = dx !== 0 ? (dx > 0 ? 'right' : 'left') : dy !== 0 ? (dy > 0 ? 'down' : 'up') : player.facing;
    companion.tx = player.tx;
    companion.ty = player.ty;
    companion.step = 0;
    player.from = { tx: player.tx, ty: player.ty };
    player.tx = tx;
    player.ty = ty;
    player.step = 0;
    player.moving = true;
    state.mode = world.ground[ty]![tx] === 'water' ? 'surf' : state.mode === 'surf' ? 'walk' : state.mode;
    state.sliding = world.ground[ty]![tx] === 'ice';
  };

  return { state, acquireCompanion, acquireBike, toggleBike, canEnter, travelTo, update };
}
