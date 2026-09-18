import { buildWorld, mapHeight, mapWidth, type VillageData } from './map';
import { tileSize } from './pixels';
import { createScene, fitCanvas } from './scene';

/** Roughly how many tiles fit across the shorter side of the postcard. */
const viewTiles = 10;

/** Seconds for one sweep across and back; different periods trace a loop past every hut. */
const sweepX = 48;

const sweepY = 31;

/**
 * A living window onto the village for the home page. Nobody plays it: the water ripples, the
 * keepers bob, you stand in the plaza, and the camera drifts slowly round the map. It only
 * animates while on screen, and holds still on the plaza when motion is reduced.
 */
export function startPostcard(canvas: HTMLCanvasElement, box: HTMLElement, data: VillageData): void {
  const context = canvas.getContext('2d');

  if (context === null) return;

  const world = buildWorld(data.huts, data.workshop, data.roofs);
  const scene = createScene(world);
  const walker = { x: world.start.tx * tileSize, y: world.start.ty * tileSize, facing: 'down' as const, frame: 0 };
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = false;
  let started: number | undefined;
  let elapsed = 0;

  const render = (seconds: number) => {
    const rangeX = mapWidth * tileSize - canvas.width;
    const rangeY = mapHeight * tileSize - canvas.height;

    // Still: centre on the player. Moving: start in the top-left corner, by the first hut
    const camX = still ? walker.x + tileSize / 2 - canvas.width / 2 : (rangeX * (1 - Math.cos((seconds * 2 * Math.PI) / sweepX))) / 2;
    const camY = still ? walker.y + tileSize / 2 - canvas.height / 2 : (rangeY * (1 - Math.cos((seconds * 2 * Math.PI) / sweepY))) / 2;

    scene.draw(context, Math.round(Math.min(Math.max(camX, 0), rangeX)), Math.round(Math.min(Math.max(camY, 0), rangeY)), seconds, walker);
  };

  const loop = (now: number) => {
    if (!running) return;

    started ??= now;
    elapsed = (now - started) / 1000;
    render(elapsed);
    requestAnimationFrame(loop);
  };

  const fit = () => {
    fitCanvas(canvas, context, box, viewTiles);
    render(elapsed);
  };

  fit();
  new ResizeObserver(fit).observe(box);

  if (still) return;

  // Rendering stops the moment the postcard scrolls out of view
  new IntersectionObserver(([entry]) => {
    const visible = entry?.isIntersecting ?? false;

    if (visible && !running) {
      running = true;
      requestAnimationFrame(loop);
    }

    if (!visible) running = false;
  }).observe(box);
}
