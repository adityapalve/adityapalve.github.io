import { noise, tileSize } from './pixels';
import type { Facing } from './sprites';
import type { Emblem, Ground, Prop } from './tiles';

export type HutData = { id: string; title: string; label: string; role: string; points: string[] };

export type Project = { name: string; blurb: string; url?: string };

export type WorkshopData = { title: string; projects: Project[] };

export type Hut = { data: HutData; tx: number; ty: number; roof: string; emblem: Emblem };

export type Workshop = { data: WorkshopData; tx: number; ty: number };

export type Npc = { tx: number; ty: number; facing: Facing; look: number } & ({ kind: 'hut'; hut: Hut } | { kind: 'workshop'; workshop: Workshop });

export type World = {
  ground: Ground[][];
  props: Map<string, { kind: Prop; variant: number }>;
  solid: boolean[][];
  huts: Hut[];
  workshop: Workshop;
  cars: { tx: number; ty: number; color: string }[];
  npcs: Npc[];
  sign: { tx: number; ty: number };
  start: { tx: number; ty: number };
};

export const mapWidth = 30;

export const mapHeight = 22;

export const viewTilesX = 20;

export const viewTilesY = 14;

export const viewWidth = viewTilesX * tileSize;

export const viewHeight = viewTilesY * tileSize;

export const key = (tx: number, ty: number): string => `${tx},${ty}`;

const hutAnchors = [
  { tx: 3, ty: 2 },
  { tx: 24, ty: 2 },
  { tx: 3, ty: 13 },
  { tx: 24, ty: 13 },
];

const emblems: Emblem[] = ['graph', 'terminal', 'chart', 'car'];

const workshopAnchor = { tx: 18, ty: 14 };

function grid<T>(fill: T): T[][] {
  return Array.from({ length: mapHeight }, () => Array.from({ length: mapWidth }, () => fill));
}

function line(ground: Ground[][], x0: number, y0: number, x1: number, y1: number, kind: Ground): void {
  const dx = Math.sign(x1 - x0);
  const dy = Math.sign(y1 - y0);
  let x = x0;
  let y = y0;

  ground[y]![x] = kind;

  while (x !== x1 || y !== y1) {
    if (x !== x1) x += dx;
    else y += dy;

    ground[y]![x] = kind;
  }
}

export function buildWorld(huts: HutData[], workshopData: WorkshopData, roofs: string[]): World {
  const ground = grid<Ground>('grass');
  const solid = grid(false);
  const props = new Map<string, { kind: Prop; variant: number }>();

  const block = (tx: number, ty: number) => {
    solid[ty]![tx] = true;
  };

  // Tree border, two deep at the corners
  for (let x = 0; x < mapWidth; x++) {
    for (let y = 0; y < mapHeight; y++) {
      const edge = x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1;
      const inner = (x === 1 || x === mapWidth - 2) && (y < 3 || y > mapHeight - 4);

      if (edge || inner) {
        props.set(key(x, y), { kind: 'tree', variant: Math.floor(noise(x, y, 5) * 2) });
        block(x, y);
      }
    }
  }

  // Pond with a fence along its top
  for (let x = 18; x <= 22; x++) {
    for (let y = 9; y <= 11; y++) {
      if ((x === 18 || x === 22) && (y === 9 || y === 11)) continue;

      ground[y]![x] = 'water';
      block(x, y);
    }
  }

  for (const x of [18, 19, 21, 22]) {
    props.set(key(x, 8), { kind: 'fence', variant: 0 });
    block(x, 8);
  }

  // Huts, their keepers on the doorstep, and the one parked car
  const builtHuts: Hut[] = [];
  const npcs: Npc[] = [];
  const cars: World['cars'] = [];

  for (const [index, data] of huts.slice(0, 4).entries()) {
    const anchor = hutAnchors[index]!;
    const emblem = emblems[index]!;
    const hut: Hut = { data, tx: anchor.tx, ty: anchor.ty, roof: roofs[index] ?? '#5a2e2e', emblem };

    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) block(anchor.tx + x, anchor.ty + y);

    builtHuts.push(hut);
    npcs.push({ kind: 'hut', hut, tx: anchor.tx + 1, ty: anchor.ty + 3, facing: 'down', look: index });
    block(anchor.tx + 1, anchor.ty + 3);

    if (emblem === 'car') {
      cars.push({ tx: anchor.tx + 3, ty: anchor.ty + 2, color: '#3b6fb0' });
      block(anchor.tx + 3, anchor.ty + 2);
      block(anchor.tx + 4, anchor.ty + 2);
    }
  }

  // Workshop stall for the side projects, keeper out front
  const workshop: Workshop = { data: workshopData, tx: workshopAnchor.tx, ty: workshopAnchor.ty };

  for (let x = 0; x < 3; x++) for (let y = 0; y < 2; y++) block(workshopAnchor.tx + x, workshopAnchor.ty + y);

  npcs.push({ kind: 'workshop', workshop, tx: workshopAnchor.tx + 1, ty: workshopAnchor.ty + 2, facing: 'down', look: 4 });
  block(workshopAnchor.tx + 1, workshopAnchor.ty + 2);

  // Paths: each doorstep to the ring road around the plaza
  line(ground, 4, 6, 4, 9, 'path');
  line(ground, 4, 9, 14, 9, 'path');
  line(ground, 25, 6, 25, 7, 'path');
  line(ground, 25, 7, 16, 7, 'path');
  line(ground, 16, 7, 16, 9, 'path');
  line(ground, 4, 17, 4, 18, 'path');
  line(ground, 4, 18, 14, 18, 'path');
  line(ground, 14, 18, 14, 14, 'path');
  line(ground, 25, 17, 25, 18, 'path');
  line(ground, 25, 18, 16, 18, 'path');
  line(ground, 16, 18, 16, 14, 'path');
  line(ground, workshopAnchor.tx + 1, workshopAnchor.ty + 3, workshopAnchor.tx + 1, 18, 'path');

  for (let x = 13; x <= 16; x++) for (let y = 9; y <= 13; y++) ground[y]![x] = 'path';

  // Welcome sign at the plaza, flowers in the meadows
  const sign = { tx: 12, ty: 11 };

  props.set(key(sign.tx, sign.ty), { kind: 'sign', variant: 0 });
  block(sign.tx, sign.ty);

  for (let x = 2; x < mapWidth - 2; x++) {
    for (let y = 2; y < mapHeight - 2; y++) {
      if (ground[y]![x] === 'grass' && !solid[y]![x] && noise(x, y, 99) > 0.86) ground[y]![x] = 'flower';
    }
  }

  for (const [x, y] of [[10, 3], [11, 3], [22, 15], [23, 16], [9, 19], [21, 3], [8, 15]]) {
    if (!solid[y!]![x!]) {
      props.set(key(x!, y!), { kind: 'tree', variant: 1 });
      block(x!, y!);
    }
  }

  return { ground, props, solid, huts: builtHuts, workshop, cars, npcs, sign, start: { tx: 15, ty: 12 } };
}
