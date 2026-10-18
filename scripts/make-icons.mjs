#!/usr/bin/env node
// Draw the site icons from one pixel grid, in the same spirit as the village art: no image
// assets, everything generated. Run with `npm run icons`.

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/*
  A hut from the village, on a 16×16 grid: a two-tone roof over a body with a door, with the
  chimney breaking the right slope and a line of ground under it. It has to survive being 16px
  wide in a tab, so it is a single ink silhouette with the door cut out.
*/
const grid = [
  '................',
  '..........##....',
  '.......##.##....',
  '......######....',
  '.....######.....',
  '....########....',
  '...##########...',
  '..############..',
  '.##############.',
  '...##########...',
  '...##########...',
  '...###....###...',
  '...###....###...',
  '...###....###...',
  '...###....###...',
  '..############..',
];

// Porcelain ink and the dark theme's, for the tab; paper and ink for the touch icon.
const ink = '#1a1a1a';

const inkDark = '#e0e0e0';

const paper = '#fafafa';

const paperInk = '#1a1a1a';

const gridWidth = grid[0].length;

const gridHeight = grid.length;

function runs() {
  const found = [];

  grid.forEach((row, y) => {
    let x = 0;

    while (x < row.length) {
      if (row[x] !== '#') {
        x += 1;
        continue;
      }

      let width = 0;

      while (row[x + width] === '#') width += 1;

      found.push({ x, y, width });
      x += width;
    }
  });

  return found;
}

function faviconSvg() {
  const path = runs()
    .map((run) => `M${run.x} ${run.y}h${run.width}v1h-${run.width}z`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${gridWidth} ${gridHeight}" shape-rendering="crispEdges" role="img" aria-label="A hut from the village">
  <style>
    path { fill: ${ink}; }
    @media (prefers-color-scheme: dark) {
      path { fill: ${inkDark}; }
    }
  </style>
  <path d="${path}"/>
</svg>
`;
}

const crcTable = new Uint32Array(256);

for (let n = 0; n < 256; n += 1) {
  let value = n;

  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;

  crcTable[n] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);

  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, data.length + 8)), data.length + 8);

  return out;
}

function rgb(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/** The same hut, opaque and inset, for the home screen where a transparent icon reads as a hole. */
function iconPng(size) {
  const background = rgb(paper);
  const foreground = rgb(paperInk);
  const cell = Math.floor((size - 20) / gridWidth);
  const margin = Math.round((size - cell * gridWidth) / 2);
  const raw = Buffer.alloc(size * (1 + size * 3));
  let offset = 0;

  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0;
    offset += 1;

    for (let x = 0; x < size; x += 1) {
      const column = Math.floor((x - margin) / cell);
      const row = Math.floor((y - margin) / cell);
      const painted = grid[row]?.[column] === '#';
      const [r, g, b] = painted ? foreground : background;

      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += 3;
    }
  }

  const header = Buffer.alloc(13);

  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const svg = path.join(repoRoot, 'public/favicon.svg');

const touchIcon = path.join(repoRoot, 'public/apple-touch-icon.png');

await writeFile(svg, faviconSvg());

await writeFile(touchIcon, iconPng(180));

console.log(`icons ${path.relative(repoRoot, svg)} (${runs().length} blocks)`);

console.log(`icons ${path.relative(repoRoot, touchIcon)} (180×180)`);
