import { drawText, textWidth } from './font';
import { makeCanvas, noise, tileSize } from './pixels';

export type Ground = 'grass' | 'path' | 'water' | 'flower';

export type Prop = 'tree' | 'fence' | 'sign';

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
