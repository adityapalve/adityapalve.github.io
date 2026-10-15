import { key, mapHeight, mapWidth } from './map';
import type { World } from './map';
import type { Ground } from './tiles';

export function buildCave(): World {
  const ground = Array.from({ length: mapHeight }, () => Array<Ground>(mapWidth).fill('cave-wall'));
  const solid = Array.from({ length: mapHeight }, () => Array<boolean>(mapWidth).fill(true));
  const props: World['props'] = new Map();

  const fill = (x0: number, y0: number, x1: number, y1: number, kind: Ground, blocked = false): void => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        ground[y]![x] = kind;
        solid[y]![x] = blocked;
      }
    }
  };

  // Uneven blue-rock walls enclose a continuous, dry route around the ice.
  fill(15, 4, 29, 4, 'cave-floor');
  fill(11, 5, 35, 6, 'cave-floor');
  fill(9, 7, 37, 9, 'cave-floor');
  fill(8, 10, 38, 11, 'cave-floor');
  fill(7, 12, 38, 19, 'cave-floor');
  fill(8, 20, 37, 22, 'cave-floor');
  fill(8, 23, 34, 23, 'cave-floor');
  fill(9, 24, 30, 24, 'cave-floor');
  fill(9, 25, 12, 25, 'cave-floor');

  fill(12, 10, 24, 21, 'ice');

  // These outcrops stop a slide; every ice edge still has a dry escape.
  for (const [x, y] of [[16, 12], [16, 13], [20, 17], [21, 17], [24, 13]] as const) {
    fill(x, y, x, y, 'cave-wall', true);
  }

  // The falls cannot be climbed. Both banks and the southern landing stay open.
  fill(28, 10, 36, 20, 'water');
  fill(28, 10, 28, 10, 'cave-floor');
  fill(36, 10, 36, 10, 'cave-floor');
  fill(28, 20, 28, 20, 'cave-floor');
  fill(36, 20, 36, 20, 'cave-floor');
  fill(30, 5, 33, 9, 'waterfall', true);

  // Small wall spurs frame the room without blocking its perimeter paths.
  for (const [x, y] of [[11, 5], [35, 6], [37, 8], [7, 15], [38, 17], [34, 23], [29, 24]] as const) {
    fill(x, y, x, y, 'cave-wall', true);
  }

  const features: World['features'] = [
    { id: 'cave-guide', title: 'Frostfall cave guide', tx: 9, ty: 23 },
    { id: 'cave-reward', title: 'Frozen chamber discovery', tx: 22, ty: 6 },
  ];

  for (const feature of features) {
    props.set(key(feature.tx, feature.ty), { kind: 'sign', variant: 0 });
    solid[feature.ty]![feature.tx] = true;
  }

  fill(10, 25, 10, 25, 'cave-exit');

  return {
    area: 'cave',
    ground,
    props,
    solid,
    huts: [],
    workshop: undefined,
    cars: [],
    npcs: [],
    sign: undefined,
    features,
    start: { tx: 10, ty: 24 },
    portals: [{ tx: 10, ty: 25, to: 'village', arrival: { tx: 39, ty: 13, facing: 'down' } }],
  };
}
