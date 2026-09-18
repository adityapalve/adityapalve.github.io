/** Tiny pixel-art toolkit: sprites are rows of characters looked up in a palette. */
export type Palette = Map<string, string>;

export const tileSize = 16;

export function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (context === null) throw new Error('village: 2d canvas unavailable');

  context.imageSmoothingEnabled = false;

  return [canvas, context];
}

/** Paint a character map; `.` (or any key missing from the palette) is transparent. */
export function paintRows(context: CanvasRenderingContext2D, rows: string[], palette: Palette, x: number, y: number): void {
  for (const [row, line] of rows.entries()) {
    for (let column = 0; column < line.length; column++) {
      const color = palette.get(line.charAt(column));

      if (color === undefined) continue;

      context.fillStyle = color;
      context.fillRect(x + column, y + row, 1, 1);
    }
  }
}

export function spriteFromRows(rows: string[], palette: Palette): HTMLCanvasElement {
  const width = Math.max(...rows.map((row) => row.length));
  const [canvas, context] = makeCanvas(width, rows.length);

  paintRows(context, rows, palette, 0, 0);

  return canvas;
}

export function flipHorizontal(source: HTMLCanvasElement): HTMLCanvasElement {
  const [canvas, context] = makeCanvas(source.width, source.height);

  context.translate(source.width, 0);
  context.scale(-1, 1);
  context.drawImage(source, 0, 0);

  return canvas;
}

/** Deterministic hash in [0, 1) for scattering detail pixels. */
export function noise(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) >>> 0;

  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;

  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
