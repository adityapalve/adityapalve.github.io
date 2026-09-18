import { key, mapHeight, mapWidth, type World } from './map';
import { makeCanvas, tileSize } from './pixels';
import { characterSprites, npcLooks, playerLook, type Facing } from './sprites';
import { carSprite, drawGround, fenceSprite, hutSprite, plateHeight, signSprite, stallSprite, treeSprite } from './tiles';

/** The player as drawn this frame, in world pixels. `frame` 0 stands, 1 and 2 walk. */
export type Walker = { x: number; y: number; facing: Facing; frame: number };

export type Scene = { draw: (context: CanvasRenderingContext2D, camX: number, camY: number, seconds: number, walker: Walker) => void };

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
  const hutSprites = new Map(world.huts.map((hut) => [hut, hutSprite(hut.roof, hut.data.label, hut.emblem)]));
  const stall = stallSprite('Projects');
  const carSprites = new Map(world.cars.map((car) => [car, carSprite(car.color)]));
  const npcSprites = new Map(world.npcs.map((npc) => [npc, characterSprites(npcLooks[npc.look % npcLooks.length]!)]));
  const playerSprites = characterSprites(playerLook);

  // Row by row, so things lower on the map paint over things above them
  const draw: Scene['draw'] = (context, camX, camY, seconds, walker) => {
    const frame = Math.floor(seconds * 1.6) % 2;
    const bob = Math.floor(seconds * 1.25) % 2;
    const walkerRow = Math.round(walker.y / tileSize);

    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.drawImage(ground[frame]!, -camX, -camY);

    for (let ty = 0; ty < mapHeight; ty++) {
      for (const hut of world.huts) {
        if (hut.ty + 2 === ty) context.drawImage(hutSprites.get(hut)!, hut.tx * tileSize - camX, hut.ty * tileSize - plateHeight - camY);
      }

      if (world.workshop.ty + 1 === ty) {
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
        else context.drawImage(sign, x, y);
      }

      for (const npc of world.npcs) {
        if (npc.ty !== ty) continue;

        const sprite = npcSprites.get(npc)!.get(npc.facing)![0]!;

        context.drawImage(sprite, npc.tx * tileSize - camX, npc.ty * tileSize - camY - bob);
      }

      if (ty === walkerRow) {
        const sprite = playerSprites.get(walker.facing)![walker.frame]!;

        context.drawImage(sprite, Math.round(walker.x) - camX, Math.round(walker.y) - camY - 2);
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
