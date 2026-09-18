/** Muted, dark cloth-and-paper tones; white type stays legible on every one. */
export const palette = [
  '#3b3a5a',
  '#5a2e2e',
  '#2f4f4f',
  '#4a3f2a',
  '#2c3e50',
  '#5b3a29',
  '#3d4d2a',
  '#4b2c4a',
  '#333d55',
  '#6b2d3a',
  '#1f4e4e',
  '#5c4a1f',
];

export function hashText(text: string): number {
  let hash = 0;

  for (const character of text) {
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  }

  return hash;
}

export function paletteColor(text: string): string {
  return palette[hashText(text) % palette.length]!;
}

/** Deterministic pseudo-random in [0, 1) so builds are reproducible. */
export function seeded(seed: string): number {
  return (hashText(seed) % 10_000) / 10_000;
}
