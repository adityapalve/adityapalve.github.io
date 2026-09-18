import { flipHorizontal, spriteFromRows, type Palette } from './pixels';

export type Facing = 'down' | 'up' | 'left' | 'right';

export type CharacterLook = { shirt: string; hair: string; skin?: string; pants?: string; hat?: string };

/** 16×16 character, seen from the front. Rows 11–15 are the legs and get swapped for walking. */
const downBody = [
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...kssssssssk...',
  '...ksEssssEsk...',
  '...kssssssssk...',
  '....kssssssk....',
  '..kkccccccccckk.',
  '.kssccccccccssk.',
  '.kssccccccccssk.',
  '..kkccccccccckk.',
];

const upBody = [
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...kshhhhhhsk...',
  '....kssssssk....',
  '..kkccccccccckk.',
  '.kssccccccccssk.',
  '.kssccccccccssk.',
  '..kkccccccccckk.',
];

const sideBody = [
  '.....khhhhhk....',
  '....khhhhhhhk...',
  '....khhhhhhhk...',
  '....khsssshhk...',
  '....kEssssshk...',
  '....kssssshhk...',
  '.....kssssk.....',
  '....kcccccck....',
  '...kscccccck....',
  '...kscccccck....',
  '....kcccccck....',
];

const legsStand = ['....kpppppppk...', '....kpppppppk...', '....kppkkpppk...', '....kbbk.kbbk...', '....kkkk.kkkk...'];

const legsLeft = ['....kpppppppk...', '....kppkkpppk...', '....kbbk.kppk...', '....kkkk.kbbk...', '.........kkkk...'];

const legsRight = ['....kpppppppk...', '....kpppkkppk...', '....kppk.kbbk...', '....kbbk.kkkk...', '....kkkk........'];

const sideLegsStand = ['....kpppppk.....', '....kpppppk.....', '....kppkppk.....', '....kbbkbbk.....', '....kkkkkkk.....'];

const sideLegsStep = ['....kpppppk.....', '...kpppkppk.....', '...kbbk.kppk....', '...kkkk.kbbk....', '........kkkk....'];

const hatRows = ['...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '.kkkkkkkkkkkkkk.'];

function palette(look: CharacterLook): Palette {
  return new Map([
    ['k', '#1d1a1f'],
    ['h', look.hair],
    ['s', look.skin ?? '#f1c9a5'],
    ['E', '#1d1a1f'],
    ['c', look.shirt],
    ['p', look.pants ?? '#3b4a8a'],
    ['b', '#3a2a1a'],
    ['a', look.hat ?? '#000000'],
  ]);
}

function withHat(body: string[], look: CharacterLook): string[] {
  if (look.hat === undefined) return body;

  return [...hatRows, ...body.slice(3)];
}

/** Frames per facing: [stand, step A, step B]. */
export function characterSprites(look: CharacterLook): Map<Facing, HTMLCanvasElement[]> {
  const colors = palette(look);
  const down = withHat(downBody, look);
  const up = withHat(upBody, look);
  const side = withHat(sideBody, look);

  const left = [
    spriteFromRows([...side, ...sideLegsStand], colors),
    spriteFromRows([...side, ...sideLegsStep], colors),
    spriteFromRows([...side, ...sideLegsStand], colors),
  ];

  return new Map<Facing, HTMLCanvasElement[]>([
    ['down', [spriteFromRows([...down, ...legsStand], colors), spriteFromRows([...down, ...legsLeft], colors), spriteFromRows([...down, ...legsRight], colors)]],
    ['up', [spriteFromRows([...up, ...legsStand], colors), spriteFromRows([...up, ...legsLeft], colors), spriteFromRows([...up, ...legsRight], colors)]],
    ['left', left],
    ['right', left.map(flipHorizontal)],
  ]);
}

export const playerLook: CharacterLook = { shirt: '#c8442e', hair: '#3a2416' };

export const npcLooks: CharacterLook[] = [
  { shirt: '#3b3a5a', hair: '#5a3a1a', hat: '#e8c46a' },
  { shirt: '#2f6f5f', hair: '#1d1a1f' },
  { shirt: '#6b2d3a', hair: '#8a5a2a', hat: '#d9d2c5' },
  { shirt: '#5c4a1f', hair: '#c9c9c9' },
  { shirt: '#2c3e50', hair: '#3a2416', hat: '#c8442e' },
];
