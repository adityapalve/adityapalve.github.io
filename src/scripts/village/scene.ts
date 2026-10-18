import type { TravelMode } from './adventure';
import { adventureSprites } from './adventure-sprites';
import { drawText, textWidth } from './font';
import { key, mapHeight, mapWidth, type World } from './map';
import { makeCanvas, tileSize } from './pixels';
import { characterSprites, npcLooks, playerLook, type CharacterLook, type Facing } from './sprites';
import { carSprite, caveSprite, drawGround, fenceSprite, hutSprite, plateHeight, signSprite, stallSprite, treeSprite } from './tiles';

/** Positions are world pixels; optional adventure state keeps the home postcard reusable. */
export type Walker = {
  x: number;
  y: number;
  facing: Facing;
  frame: number;
  mode?: TravelMode;
  companion?: { x: number; y: number; facing: Facing; frame: number };
  bikeUnlocked?: boolean;
  /** Another visitor's own colours. Left off, a walker wears yours. */
  look?: CharacterLook;
  /** Shown over the head. You never wear your own name. */
  name?: string;
};

export type Scene = {
  draw: (context: CanvasRenderingContext2D, camX: number, camY: number, seconds: number, walker: Walker, others?: Walker[]) => void;
};

/** Every walker needs the same handful of frames, so they are built once per look. */
type Bundle = { sprites: Map<Facing, HTMLCanvasElement[]>; adventure: ReturnType<typeof adventureSprites> };

function lookKey(look: CharacterLook): string {
  return [look.shirt, look.hair, look.skin ?? '', look.pants ?? '', look.hat ?? ''].join('|');
}

/** Two pre-rendered ground layers (water and flowers alternate between them). */
function renderGround(world: World): HTMLCanvasElement[] {
  const layers: HTMLCanvasElement[] = [];

  for (let frame = 0; frame < 2; frame++) {
    const [canvas, context] = makeCanvas(mapWidth * tileSize, mapHeight * tileSize);

    for (let ty = 0; ty < mapHeight; ty++) {
      for (let tx = 0; tx < mapWidth; tx++) {
        context.save();
        context.translate(tx * tileSize, ty * tileSize);
        drawGround(context, world.ground[ty]![tx]!, tx, ty, frame);
        context.restore();
      }
    }

    layers.push(canvas);
  }

  return layers;
}

/** Paint everything once up front; `draw` then only blits sprites for one frame. */
export function createScene(world: World): Scene {
  const ground = renderGround(world);
  const trees = [treeSprite(0), treeSprite(1)];
  const fence = fenceSprite();
  const sign = signSprite();
  const cave = caveSprite();
  const hutSprites = new Map(world.huts.map((hut) => [hut, hutSprite(hut.roof, hut.data.label, hut.emblem)]));
  const stall = world.workshop === undefined ? undefined : stallSprite('Projects');
  const carSprites = new Map(world.cars.map((car) => [car, carSprite(car.color)]));
  const npcSprites = new Map(world.npcs.map((npc) => [npc, characterSprites(npcLooks[npc.look % npcLooks.length]!)]));
  const bundles = new Map<string, Bundle>();

  const bundleFor = (look: CharacterLook): Bundle => {
    const lookup = lookKey(look);
    const known = bundles.get(lookup);

    if (known !== undefined) return known;

    const sprites = characterSprites(look);
    const bundle: Bundle = { sprites, adventure: adventureSprites(sprites) };

    bundles.set(lookup, bundle);

    return bundle;
  };

  const drawActor = (context: CanvasRenderingContext2D, actor: Walker, camX: number, camY: number, ripple: number) => {
    const x = Math.round(actor.x) - camX;
    const y = Math.round(actor.y) - camY;
    const { sprites, adventure } = bundleFor(actor.look ?? playerLook);

    if (actor.mode === 'surf') {
      context.drawImage(adventure.wake[ripple]!, x - 4, y + 2);
      context.drawImage(adventure.surfing.get(actor.facing)![actor.frame]!, x - 4, y - 8);
    } else if (actor.mode === 'bike') {
      context.drawImage(adventure.cycling.get(actor.facing)![actor.frame]!, x - 4, y - 8);
    } else {
      context.drawImage(sprites.get(actor.facing)![actor.frame]!, x, y - 2);
    }

    if (actor.name === undefined) return;

    // A nameplate over the head, in the village's own 3x5 font and so on the same pixel grid
    const left = x + Math.round((tileSize - textWidth(actor.name)) / 2);

    drawText(context, actor.name, left + 1, y - 8, '#1d1a1f');
    drawText(context, actor.name, left, y - 9, '#fbf7ee');
  };

  const drawCompanion = (context: CanvasRenderingContext2D, companion: NonNullable<Walker['companion']>, camX: number, camY: number) => {
    const squirtle = bundleFor(playerLook).adventure.squirtle;

    context.drawImage(squirtle[companion.facing][companion.frame]!, Math.round(companion.x) - camX, Math.round(companion.y) - camY);
  };

  // Row by row, so things lower on the map paint over things above them
  const draw: Scene['draw'] = (context, camX, camY, seconds, walker, others = []) => {
    const frame = Math.floor(seconds * 1.6) % 2;
    const bob = Math.floor(seconds * 1.25) % 2;
    const companion = walker.mode === 'surf' ? undefined : walker.companion;

    if (world.area === 'cave') {
      context.fillStyle = '#192d45';
      context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    } else {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    }

    context.drawImage(ground[frame]!, -camX, -camY);

    /*
      Everyone on foot, in the same depth order as the scenery: the row decides what paints over
      what, and within a row the lower walker is in front. The companion goes in first so that at
      the same depth it still tucks behind you, as it always has.
    */
    const standing: { y: number; paint: () => void }[] = [];

    if (companion !== undefined) standing.push({ y: companion.y, paint: () => drawCompanion(context, companion, camX, camY) });

    standing.push({ y: walker.y, paint: () => drawActor(context, walker, camX, camY, frame) });

    for (const other of others) {
      standing.push({ y: other.y, paint: () => drawActor(context, other, camX, camY, frame) });
    }

    // A stable sort, so walkers at identical depths keep the order above
    standing.sort((a, b) => a.y - b.y);

    for (let ty = 0; ty < mapHeight; ty++) {
      for (const hut of world.huts) {
        if (hut.ty + 2 === ty) context.drawImage(hutSprites.get(hut)!, hut.tx * tileSize - camX, hut.ty * tileSize - plateHeight - camY);
      }

      if (world.workshop !== undefined && stall !== undefined && world.workshop.ty + 1 === ty) {
        context.drawImage(stall, world.workshop.tx * tileSize - camX, world.workshop.ty * tileSize - plateHeight - camY);
      }

      for (const car of world.cars) {
        if (car.ty === ty) context.drawImage(carSprites.get(car)!, car.tx * tileSize - camX, car.ty * tileSize - camY);
      }

      for (let tx = 0; tx < mapWidth; tx++) {
        const prop = world.props.get(key(tx, ty));

        if (prop === undefined) continue;

        const x = tx * tileSize - camX;
        const y = ty * tileSize - camY;

        if (prop.kind === 'tree') context.drawImage(trees[prop.variant % trees.length]!, x, y - 8);
        else if (prop.kind === 'fence') context.drawImage(fence, x, y);
        else if (prop.kind === 'cave') context.drawImage(cave, x - tileSize, y - tileSize * 2);
        else context.drawImage(sign, x, y);
      }

      for (const feature of world.features) {
        if (feature.ty !== ty) continue;

        const x = feature.tx * tileSize - camX;
        const y = feature.ty * tileSize - camY;

        if (feature.id === 'starter') {
          if (walker.companion === undefined) context.drawImage(bundleFor(playerLook).adventure.squirtle.down[0]!, x, y - bob);
        } else if (feature.id === 'bike') {
          if (!walker.bikeUnlocked) context.drawImage(bundleFor(playerLook).adventure.bike.left, x - 4, y + 4);
        }
      }

      for (const npc of world.npcs) {
        if (npc.ty !== ty) continue;

        const sprite = npcSprites.get(npc)!.get(npc.facing)![0]!;

        context.drawImage(sprite, npc.tx * tileSize - camX, npc.ty * tileSize - camY - bob);
      }

      for (const actor of standing) {
        if (Math.floor(actor.y / tileSize) !== ty) continue;

        actor.paint();
      }
    }
  };

  return { draw };
}

/**
 * Size the canvas to fill `box` at a whole-number scale, so every art pixel covers the same
 * number of device pixels. Roughly `tiles` tiles fit across the shorter side, and the view never
 * grows past the map, so the camera always has village to show. The canvas may overhang the box
 * by less than one art pixel; the box clips it.
 */
export function fitCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, box: HTMLElement, tiles: number): void {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(box.clientWidth * ratio));
  const height = Math.max(1, Math.round(box.clientHeight * ratio));
  let scale = Math.max(1, Math.round(Math.min(width, height) / (tiles * tileSize)));

  while (width / scale > mapWidth * tileSize || height / scale > mapHeight * tileSize) scale += 1;

  canvas.width = Math.ceil(width / scale);
  canvas.height = Math.ceil(height / scale);
  canvas.style.width = `${(canvas.width * scale) / ratio}px`;
  canvas.style.height = `${(canvas.height * scale) / ratio}px`;

  // Resizing the backing store resets context state
  context.imageSmoothingEnabled = false;
}
