#!/usr/bin/env node
// Draw the site icons from one set of shapes, in the same spirit as the village art: no image
// assets, everything generated. Run with `npm run icons`.

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/*
  Roof & Sun, printed like a two-drum riso job on a 64-unit grid: a teal roof with an arched
  door, and an orange sun over its slope where the two inks multiply. The sun's drum lands a
  little off register, as a real second pass does. That offset is baked into the sun's centre,
  so the overlap can be clipped to the roof without the clip moving with it.
*/
const paper = '#f4efe6';

const roofInk = '#00838a'; // Riso Teal

const sunInk = '#ff6c2f'; // Riso Orange

const misregister = { x: 1.5, y: -0.75 };

const roof = { apex: [31, 13], left: [10, 53], right: [52, 53] };

// An arch: a rectangle with a half circle on top
const door = { left: 27, right: 35, top: 44, bottom: 53 };

const sun = { x: 42 + misregister.x, y: 23 + misregister.y, r: 12 };

function rgb(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/** Two inks printed over each other darken like a multiply blend. */
function multiply(a, b) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);

  return `#${[ar * br, ag * bg, ab * bb]
    .map((channel) => Math.round(channel / 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

/*
  The tab icon. SVG favicons are drawn as images, where blend-mode support is patchy, so the
  overprint is painted as its own colour rather than left to `mix-blend-mode`. The paper tile
  stays behind it in both light and dark browser chrome, like a print on a desk.
*/
function faviconSvg() {
  const roofPath = `M${roof.left.join(' ')}L${roof.apex.join(' ')}L${roof.right.join(' ')}Z`;
  const arch = (door.right - door.left) / 2;
  const doorPath = `M${door.left} ${door.bottom}V${door.top}A${arch} ${arch} 0 0 1 ${door.right} ${door.top}V${door.bottom}Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="A roof and the sun, printed in two inks">
  <defs>
    <clipPath id="roof"><path d="${roofPath}"/></clipPath>
  </defs>
  <rect width="64" height="64" rx="14" fill="${paper}"/>
  <path fill="${roofInk}" fill-rule="evenodd" d="${roofPath} ${doorPath}"/>
  <circle cx="${sun.x}" cy="${sun.y}" r="${sun.r}" fill="${sunInk}"/>
  <circle cx="${sun.x}" cy="${sun.y}" r="${sun.r}" fill="${multiply(roofInk, sunInk)}" clip-path="url(#roof)"/>
</svg>
`;
}

function inDoor(x, y) {
  if (x < door.left || x > door.right || y > door.bottom) return false;

  if (y >= door.top) return true;

  const arch = (door.right - door.left) / 2;

  return (x - door.left - arch) ** 2 + (y - door.top) ** 2 <= arch ** 2;
}

function inRoof(x, y) {
  const [apexX, apexY] = roof.apex;
  const baseY = roof.left[1];

  if (y < apexY || y > baseY) return false;

  const along = (y - apexY) / (baseY - apexY);
  const leftX = apexX + (roof.left[0] - apexX) * along;
  const rightX = apexX + (roof.right[0] - apexX) * along;

  return x >= leftX && x <= rightX && !inDoor(x, y);
}

function inSun(x, y) {
  return (x - sun.x) ** 2 + (y - sun.y) ** 2 <= sun.r ** 2;
}

/** A repeatable 0–1 value per lattice point, so every run prints the same sheet. */
function hash(x, y, seed) {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 144269504);

  value = Math.imul(value ^ (value >>> 13), 1274126177);

  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const ease = (t) => t * t * (3 - 2 * t);
  const sx = ease(x - x0);
  const sy = ease(y - y0);
  const top = hash(x0, y0, seed) + (hash(x0 + 1, y0, seed) - hash(x0, y0, seed)) * sx;
  const bottom = hash(x0, y0 + 1, seed) + (hash(x0 + 1, y0 + 1, seed) - hash(x0, y0 + 1, seed)) * sx;

  return top + (bottom - top) * sy;
}

/** How much ink one drum put down at a pixel: specks where it missed, and a slow swell across the sheet. */
function inkDensity(x, y, seed) {
  const grain = 0.6 * valueNoise(x / 1.5, y / 1.5, seed) + 0.4 * valueNoise(x / 0.7, y / 0.7, seed + 10);
  const speck = Math.min(1, Math.max(0, (0.78 - grain) / 0.08));
  const swell = 0.84 + 0.14 * valueNoise(x / 45, y / 45, seed + 20);

  return speck * swell;
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

/*
  The home-screen icon: the same print, opaque and full bleed, because iOS rounds the corners
  itself and fills transparency with black. At this size there is room for the riso texture a
  16px tab cannot hold. Each pixel is sampled 4×4 so the edges stay smooth.
*/
function iconPng(size) {
  const scale = size / 64;
  const samples = 4;
  const background = rgb(paper);

  const inks = [
    { colour: rgb(roofInk), covers: inRoof, seed: 1 },
    { colour: rgb(sunInk), covers: inSun, seed: 2 },
  ];

  const raw = Buffer.alloc(size * (1 + size * 3));
  let offset = 0;

  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0;
    offset += 1;

    for (let x = 0; x < size; x += 1) {
      const densities = inks.map((ink) => inkDensity(x, y, ink.seed));
      const total = [0, 0, 0];

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const u = (x + (sx + 0.5) / samples) / scale;
          const v = (y + (sy + 0.5) / samples) / scale;
          let colour = background;

          inks.forEach((ink, index) => {
            if (!ink.covers(u, v)) return;

            const density = densities[index];

            colour = colour.map((channel, c) => channel * (1 - density + (density * ink.colour[c]) / 255));
          });

          colour.forEach((channel, c) => {
            total[c] += channel;
          });
        }
      }

      total.forEach((channel, c) => {
        raw[offset + c] = Math.round(channel / samples ** 2);
      });
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

console.log(`icons ${path.relative(repoRoot, svg)} (roof & sun)`);

console.log(`icons ${path.relative(repoRoot, touchIcon)} (180×180)`);
