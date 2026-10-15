import { drawText, textWidth } from './font';
import { makeCanvas, noise, tileSize } from './pixels';

export type Ground = 'grass' | 'path' | 'water' | 'flower' | 'cave-floor' | 'cave-wall' | 'ice' | 'waterfall' | 'cave-door' | 'cave-exit';

export type Prop = 'tree' | 'fence' | 'sign' | 'cave';

/** What hangs over each hut's door: a hint of the work inside. */
export type Emblem = 'graph' | 'terminal' | 'chart' | 'car';

export const plateHeight = 12;

const grassLight = '#8fd06f';

const grassDark = '#6fb050';

const pathLight = '#e6cf98';

const pathDark = '#cdb27a';

const ink = '#1d1a1f';

const wood = '#6a4a2a';

const woodDark = '#4a3018';

const plank = '#d9b070';

function grassBase(context: CanvasRenderingContext2D, tx: number, ty: number): void {
  context.fillStyle = grassLight;
  context.fillRect(0, 0, tileSize, tileSize);

  for (let index = 0; index < 5; index++) {
    const x = Math.floor(noise(tx, ty, index) * 14);
    const y = Math.floor(noise(ty, tx, index + 9) * 14);

    context.fillStyle = grassDark;
    context.fillRect(x, y, 2, 1);
    context.fillRect(x + 1, y - 1, 1, 1);
  }
}

/** One ground tile, drawn fresh per map cell so tufts and speckles never repeat visibly. */
export function drawGround(context: CanvasRenderingContext2D, kind: Ground, tx: number, ty: number, frame: number): void {
  if (kind === 'cave-floor' || kind === 'cave-wall' || kind === 'ice' || kind === 'waterfall' || kind === 'cave-door' || kind === 'cave-exit') {
    drawCaveGround(context, kind, tx, ty, frame);

    return;
  }

  if (kind === 'grass' || kind === 'flower') {
    grassBase(context, tx, ty);

    if (kind === 'flower') {
      const colors = ['#f25c5c', '#ffd85c', '#ffffff', '#f2a0d0'];
      const color = colors[Math.floor(noise(tx, ty, 77) * colors.length)]!;
      const x = 4 + Math.floor(noise(tx, ty, 3) * 6);
      const y = 5 + Math.floor(noise(ty, tx, 4) * 5) + (frame % 2);

      context.fillStyle = color;
      context.fillRect(x, y, 1, 1);
      context.fillRect(x + 2, y, 1, 1);
      context.fillRect(x + 1, y - 1, 1, 1);
      context.fillRect(x + 1, y + 1, 1, 1);
      context.fillStyle = '#ffe680';
      context.fillRect(x + 1, y, 1, 1);
      context.fillStyle = '#3f7f2f';
      context.fillRect(x + 1, y + 2, 1, 2);
    }

    return;
  }

  if (kind === 'path') {
    context.fillStyle = pathLight;
    context.fillRect(0, 0, tileSize, tileSize);

    for (let index = 0; index < 6; index++) {
      context.fillStyle = pathDark;
      context.fillRect(Math.floor(noise(tx, ty, index + 20) * 15), Math.floor(noise(ty, tx, index + 30) * 15), 1, 1);
    }

    return;
  }

  context.fillStyle = '#4f9fe8';
  context.fillRect(0, 0, tileSize, tileSize);
  context.fillStyle = '#7fc0ff';

  for (let index = 0; index < 3; index++) {
    const x = Math.floor(noise(tx, ty, index + 40) * 10);
    const y = (Math.floor(noise(ty, tx, index + 50) * 14) + frame * 2) % 16;

    context.fillRect(x, y, 4, 1);
    context.fillRect(x + 1, y + 1, 2, 1);
  }
}

/** Original cave textures, baked into the scene's two ground layers. */
function drawCaveGround(context: CanvasRenderingContext2D, kind: Ground, tx: number, ty: number, frame: number): void {
  if (kind === 'cave-wall') {
    context.fillStyle = '#233952';
    context.fillRect(0, 0, 16, 16);

    for (let row = 0; row < 3; row++) {
      const top = row * 5;
      const seam = 3 + Math.floor(noise(tx, ty, row + 100) * 9);
      context.fillStyle = row === 0 ? '#6088a4' : '#42647f';
      context.fillRect(0, top, 16, 1);
      context.fillStyle = '#35536f';
      context.fillRect(1, top + 1, seam - 1, 3);
      context.fillStyle = '#4a718c';
      context.fillRect(seam + 1, top + 1, 15 - seam, 2);
      context.fillStyle = '#192d45';
      context.fillRect(seam, top + 1, 1, 4);
    }

    return;
  }

  if (kind === 'waterfall') {
    context.fillStyle = '#377cae';
    context.fillRect(0, 0, 16, 16);

    for (let streak = 0; streak < 5; streak++) {
      const x = streak * 3 + 1;
      const y = (streak * 5 + frame * 7) % 16;
      context.fillStyle = streak % 2 === 0 ? '#c5f3ff' : '#79cce8';
      context.fillRect(x, y, 1, 16 - y);
      context.fillRect(x, 0, 1, Math.max(0, y - 4));
    }

    context.fillStyle = '#e4fbff';
    context.fillRect(frame * 2, 13, 5, 2);
    context.fillRect(8 - frame * 2, 14, 6, 2);
    context.fillStyle = '#a9e5f5';
    context.fillRect(3, 11 + frame, 2, 1);
    context.fillRect(12, 12 - frame, 3, 1);

    return;
  }

  if (kind === 'cave-door' || kind === 'cave-exit') {
    context.fillStyle = '#283e55';
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = kind === 'cave-exit' ? '#8ed7e8' : '#101f31';
    context.fillRect(2, 0, 12, 16);
    context.fillStyle = kind === 'cave-exit' ? '#d5f7ed' : '#0b1423';
    context.fillRect(4, 0, 8, 13);
    context.fillStyle = kind === 'cave-exit' ? '#f4ffe9' : '#172b40';
    context.fillRect(6, 0, 4, 12);
    context.fillStyle = kind === 'cave-exit' ? '#9bcbd2' : '#4a6273';
    context.fillRect(2, 14, 12, 2);

    return;
  }

  context.fillStyle = kind === 'ice' ? '#9dd9e9' : '#697f90';
  context.fillRect(0, 0, 16, 16);

  if (kind === 'ice') {
    context.fillStyle = '#c6eff6';
    context.fillRect(0, 0, 16, 1);
    context.fillRect(0, 1, 1, 15);
    context.fillRect(3, 3, 7, 1);
    context.fillRect(2, 4, 4, 1);
    context.fillStyle = '#79bace';
    context.fillRect(0, 15, 16, 1);
    context.fillRect(15, 0, 1, 16);
    const crack = 7 + Math.floor(noise(tx, ty, 112) * 4);
    context.fillRect(crack, 7, 1, 4);
    context.fillRect(crack - 2, 10, 2, 1);
    context.fillRect(crack - 3, 11, 1, 3);
    context.fillStyle = '#e5fbff';
    context.fillRect(crack + 1, 7, 1, 3);
    context.fillRect(11, 3, 2, 1);
  } else {
    for (let index = 0; index < 5; index++) {
      const x = Math.floor(noise(tx, ty, index + 120) * 14);
      const y = Math.floor(noise(ty, tx, index + 130) * 14);
      context.fillStyle = index % 2 === 0 ? '#536b7f' : '#8297a5';
      context.fillRect(x, y, 2, 1);
    }
  }
}

/** A hand-pixelled, three-tile blue-rock arch; its bottom centre is the doorway. */
export function caveSprite(): HTMLCanvasElement {
  const [canvas, context] = makeCanvas(tileSize * 3, tileSize * 3);
  const widths = [20, 30, 38, 44, 48, 48, 48, 48];

  for (const [row, width] of widths.entries()) {
    const x = (48 - width) / 2;
    const y = row * 6;
    context.fillStyle = '#24394c';
    context.fillRect(x, y, width, 6);
    context.fillStyle = row < 3 ? '#698ca2' : '#45677f';
    context.fillRect(x + 1, y, width - 2, 2);
    context.fillStyle = '#36546d';
    context.fillRect(x + 3, y + 3, width - 6, 2);
    context.fillStyle = '#1c3045';
    context.fillRect(x + 6 + (row % 3) * 7, y + 2, 2, 4);
  }

  context.fillStyle = '#182a3e';
  context.fillRect(16, 23, 16, 25);
  context.fillRect(13, 29, 22, 19);
  context.fillStyle = '#090f1e';
  context.fillRect(18, 27, 12, 21);
  context.fillRect(16, 33, 16, 15);
  context.fillStyle = '#91bdce';
  context.fillRect(13, 27, 3, 9);
  context.fillRect(16, 23, 15, 2);
  context.fillRect(33, 31, 2, 10);
  context.fillStyle = '#c0e5e9';
  context.fillRect(8, 12, 8, 1);
  context.fillRect(30, 17, 7, 1);
  context.fillStyle = '#6c8999';
  context.fillRect(14, 46, 20, 2);

  return canvas;
}

export function treeSprite(variant: number): HTMLCanvasElement {
  const [canvas, context] = makeCanvas(tileSize, tileSize + 8);
  const canopy = variant % 2 === 0 ? '#3f8f3f' : '#4a9a3a';
  const shadeColor = '#2f6f2f';
  const light = '#7fcf5f';

  context.fillStyle = wood;
  context.fillRect(6, 16, 4, 8);
  context.fillStyle = woodDark;
  context.fillRect(6, 22, 4, 2);

  const widths = [6, 10, 12, 14, 14, 16, 16, 16, 16, 14, 14, 12, 10, 8, 6, 4];

  for (const [row, width] of widths.entries()) {
    context.fillStyle = row > 9 ? shadeColor : canopy;
    context.fillRect((tileSize - width) / 2, row, width, 1);
  }

  context.fillStyle = light;
  context.fillRect(4, 3, 3, 1);
  context.fillRect(3, 4, 2, 2);
  context.fillRect(9, 2, 2, 1);
  context.fillStyle = shadeColor;
  context.fillRect(10, 8, 3, 2);
  context.fillRect(4, 11, 2, 2);

  return canvas;
}

export function fenceSprite(): HTMLCanvasElement {
  const [canvas, context] = makeCanvas(tileSize, tileSize);

  context.fillStyle = '#a5763e';
  context.fillRect(0, 6, 16, 2);
  context.fillRect(0, 11, 16, 2);
  context.fillStyle = '#7a5227';
  context.fillRect(2, 3, 3, 12);
  context.fillRect(11, 3, 3, 12);
  context.fillStyle = '#c99a5e';
  context.fillRect(2, 3, 3, 1);
  context.fillRect(11, 3, 3, 1);

  return canvas;
}

export function signSprite(): HTMLCanvasElement {
  const [canvas, context] = makeCanvas(tileSize, tileSize);

  context.fillStyle = '#7a5227';
  context.fillRect(7, 8, 2, 8);
  context.fillStyle = plank;
  context.fillRect(2, 2, 12, 7);
  context.fillStyle = '#a5763e';
  context.fillRect(2, 8, 12, 1);
  context.fillStyle = wood;
  context.fillRect(4, 4, 8, 1);
  context.fillRect(4, 6, 6, 1);

  return canvas;
}

/** Hanging wooden nameplate, centred on `centerX`, drawn at the top of a building sprite. */
function nameplate(context: CanvasRenderingContext2D, label: string, centerX: number): void {
  const width = textWidth(label) + 6;
  const x = Math.round(centerX - width / 2);

  context.fillStyle = ink;
  context.fillRect(x - 1, 0, width + 2, 9);
  context.fillStyle = plank;
  context.fillRect(x, 1, width, 7);
  context.fillStyle = '#a5763e';
  context.fillRect(x, 7, width, 1);
  drawText(context, label, x + 3, 2, ink);
  // Chains down to the roof
  context.fillStyle = ink;
  context.fillRect(x + 2, 9, 1, 3);
  context.fillRect(x + width - 3, 9, 1, 3);
}

function emblemBoard(context: CanvasRenderingContext2D, emblem: Emblem, x: number, y: number, roof: string): void {
  context.fillStyle = ink;
  context.fillRect(x, y, 14, 9);

  if (emblem === 'graph') {
    context.fillStyle = '#1f2a4a';
    context.fillRect(x + 1, y + 1, 12, 7);
    context.fillStyle = '#7fb0ff';
    context.fillRect(x + 3, y + 3, 4, 1);
    context.fillRect(x + 6, y + 2, 1, 4);
    context.fillRect(x + 5, y + 5, 5, 1);
    context.fillStyle = '#ffffff';
    context.fillRect(x + 2, y + 2, 2, 2);
    context.fillRect(x + 9, y + 1, 2, 2);
    context.fillRect(x + 4, y + 5, 2, 2);
    context.fillRect(x + 9, y + 5, 2, 2);
  } else if (emblem === 'terminal') {
    context.fillStyle = '#10241a';
    context.fillRect(x + 1, y + 1, 12, 7);
    context.fillStyle = '#5cff8a';
    context.fillRect(x + 2, y + 3, 1, 1);
    context.fillRect(x + 3, y + 4, 1, 1);
    context.fillRect(x + 2, y + 5, 1, 1);
    context.fillRect(x + 5, y + 6, 4, 1);
    context.fillRect(x + 6, y + 3, 5, 1);
  } else if (emblem === 'chart') {
    context.fillStyle = '#fbf7ee';
    context.fillRect(x + 1, y + 1, 12, 7);
    context.fillStyle = roof;
    context.fillRect(x + 3, y + 5, 2, 2);
    context.fillRect(x + 6, y + 3, 2, 4);
    context.fillRect(x + 9, y + 2, 2, 5);
    context.fillStyle = ink;
    context.fillRect(x + 2, y + 7, 10, 1);
  } else {
    context.fillStyle = '#e9e2d0';
    context.fillRect(x + 1, y + 1, 12, 7);
    context.fillStyle = '#c8442e';
    context.fillRect(x + 3, y + 3, 8, 3);
    context.fillRect(x + 5, y + 2, 4, 1);
    context.fillStyle = ink;
    context.fillRect(x + 4, y + 6, 2, 1);
    context.fillRect(x + 9, y + 6, 2, 1);
    context.fillStyle = '#9fd6ff';
    context.fillRect(x + 6, y + 2, 2, 1);
  }
}

/** A 3×3-tile hut with a nameplate floating above the roof and an emblem over the door. */
export function hutSprite(roof: string, label: string, emblem: Emblem): HTMLCanvasElement {
  const size = tileSize * 3;
  const [canvas, context] = makeCanvas(size, size + plateHeight);
  const roofDark = shade(roof, -28);
  const roofLight = shade(roof, 26);
  const top = plateHeight;

  nameplate(context, label, size / 2);

  context.fillStyle = '#efe0c0';
  context.fillRect(4, top + 22, 40, 24);
  context.fillStyle = '#d6c39c';

  for (let y = top + 26; y < top + 46; y += 5) context.fillRect(4, y, 40, 1);

  for (let row = 0; row < 22; row++) {
    const width = 8 + row * 2;

    context.fillStyle = row % 4 === 3 ? roofDark : roof;
    context.fillRect((size - width) / 2, top + row, width, 1);
  }

  context.fillStyle = roofLight;
  context.fillRect(20, top + 1, 8, 1);
  context.fillRect(16, top + 5, 4, 1);
  context.fillStyle = roofDark;
  context.fillRect(2, top + 21, 44, 2);

  // Roof-top detail per emblem: antenna, aerial, weather vane, or nothing (the car is parked outside)
  if (emblem === 'graph') {
    context.fillStyle = '#9a9aa5';
    context.fillRect(36, top + 2, 1, 8);
    context.fillRect(33, top + 2, 7, 1);
    context.fillRect(34, top + 1, 5, 1);
    context.fillStyle = '#ffffff';
    context.fillRect(36, top, 1, 1);
  } else if (emblem === 'terminal') {
    context.fillStyle = '#9a9aa5';
    context.fillRect(12, top + 4, 1, 7);
    context.fillRect(10, top + 4, 5, 1);
    context.fillRect(11, top + 6, 3, 1);
  } else if (emblem === 'chart') {
    context.fillStyle = '#9a9aa5';
    context.fillRect(24, top - 2, 1, 5);
    context.fillRect(22, top - 1, 5, 1);
    context.fillStyle = '#c8442e';
    context.fillRect(25, top - 2, 2, 1);
  }

  emblemBoard(context, emblem, 17, top + 23, roof);

  context.fillStyle = wood;
  context.fillRect(20, top + 33, 8, 13);
  context.fillStyle = woodDark;
  context.fillRect(20, top + 33, 8, 1);
  context.fillStyle = '#e8c46a';
  context.fillRect(26, top + 39, 1, 1);

  for (const x of [7, 33]) {
    context.fillStyle = wood;
    context.fillRect(x, top + 28, 8, 8);
    context.fillStyle = '#9fd6ff';
    context.fillRect(x + 1, top + 29, 6, 6);
    context.fillStyle = wood;
    context.fillRect(x + 4, top + 29, 1, 6);
    context.fillRect(x + 1, top + 32, 6, 1);
  }

  context.fillStyle = 'rgba(0,0,0,0.18)';
  context.fillRect(4, top + 46, 40, 2);

  return canvas;
}

/** A parked hatchback, two tiles wide. */
export function carSprite(color: string): HTMLCanvasElement {
  const [canvas, context] = makeCanvas(tileSize * 2, tileSize);

  context.fillStyle = ink;
  context.fillRect(3, 5, 26, 8);
  context.fillRect(7, 2, 16, 4);
  context.fillStyle = color;
  context.fillRect(4, 6, 24, 6);
  context.fillRect(8, 3, 14, 3);
  context.fillStyle = '#9fd6ff';
  context.fillRect(9, 3, 5, 3);
  context.fillRect(16, 3, 5, 3);
  context.fillStyle = shade(color, 30);
  context.fillRect(4, 6, 24, 1);
  context.fillStyle = ink;
  context.fillRect(6, 11, 5, 4);
  context.fillRect(21, 11, 5, 4);
  context.fillStyle = '#9a9aa5';
  context.fillRect(7, 12, 3, 2);
  context.fillRect(22, 12, 3, 2);
  context.fillStyle = '#ffe680';
  context.fillRect(28, 8, 1, 2);
  context.fillStyle = '#ff5c5c';
  context.fillRect(3, 8, 1, 2);

  return canvas;
}

/** The projects workshop: a market stall with a striped awning, three tiles wide and two deep. */
export function stallSprite(label: string): HTMLCanvasElement {
  const width = tileSize * 3;
  const height = tileSize * 2;
  const [canvas, context] = makeCanvas(width, height + plateHeight);
  const top = plateHeight;

  nameplate(context, label, width / 2);

  // posts
  context.fillStyle = wood;
  context.fillRect(3, top + 8, 2, 22);
  context.fillRect(43, top + 8, 2, 22);

  // awning
  for (let x = 0; x < width; x += 6) {
    context.fillStyle = (x / 6) % 2 === 0 ? '#c8442e' : '#fbf7ee';
    context.fillRect(x, top + 2, 6, 7);
    context.fillRect(x + 1, top + 9, 4, 1);
  }

  context.fillStyle = ink;
  context.fillRect(0, top + 1, width, 1);

  // counter
  context.fillStyle = plank;
  context.fillRect(2, top + 18, 44, 12);
  context.fillStyle = '#a5763e';
  context.fillRect(2, top + 18, 44, 1);
  context.fillRect(2, top + 24, 44, 1);
  context.fillStyle = ink;
  context.fillRect(1, top + 30, 46, 1);

  // wares: a globe, a scroll, a crate
  context.fillStyle = '#4f9fe8';
  context.fillRect(8, top + 11, 6, 6);
  context.fillStyle = '#6fb050';
  context.fillRect(9, top + 12, 2, 2);
  context.fillRect(12, top + 14, 1, 2);
  context.fillStyle = '#fbf7ee';
  context.fillRect(20, top + 13, 8, 4);
  context.fillStyle = '#9a9aa5';
  context.fillRect(21, top + 14, 6, 1);
  context.fillRect(21, top + 16, 4, 1);
  context.fillStyle = wood;
  context.fillRect(33, top + 11, 7, 6);
  context.fillStyle = woodDark;
  context.fillRect(33, top + 14, 7, 1);

  context.fillStyle = 'rgba(0,0,0,0.18)';
  context.fillRect(2, top + 30, 44, 2);

  return canvas;
}

function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (value >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((value >> 8) & 255) + amount));
  const b = Math.min(255, Math.max(0, (value & 255) + amount));

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
