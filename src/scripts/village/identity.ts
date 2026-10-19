/**
 * How a visitor is named.
 *
 * The start card and the room share these rules, so the nameplate always shows exactly what the
 * room accepted: uppercase, letters, digits, spaces and dashes only, clipped to the width the
 * pixel font can draw. Nothing here touches the DOM, so the Durable Object can use it too.
 */
export const nameLimit = 12;

export function tidyName(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, nameLimit)
    .trim();
}

const callings = ['WAYFARER', 'RAMBLER', 'WALKER', 'DRIFTER', 'TRAVELLER', 'VISITOR', 'VOYAGER'];

/** For anyone who would rather not choose: a calling and a number, like a trail marker. */
export function suggestedName(): string {
  const calling = callings[Math.floor(Math.random() * callings.length)]!;

  return `${calling} ${Math.floor(Math.random() * 90) + 10}`;
}
