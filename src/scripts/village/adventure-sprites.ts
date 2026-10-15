import { flipHorizontal, makeCanvas, spriteFromRows, type Palette } from './pixels';
import type { Facing } from './sprites';

const colors: Palette = new Map([
  ['k', '#253440'],
  ['b', '#65c4de'],
  ['d', '#368eae'],
  ['h', '#a2e6ed'],
  ['s', '#a5673b'],
  ['r', '#71472e'],
  ['c', '#ead49a'],
  ['w', '#fff5df'],
  ['e', '#723d50'],
  ['t', '#242d36'],
  ['m', '#b9c9cd'],
  ['f', '#da6354'],
]);

// A rounded blue head, cream belly, segmented brown shell and curled blue tail.
const turtleDown = [
  '.....kkkkkk.....',
  '....kbhhhhbk....',
  '...kbbbbbbbbk...',
  '...kbwebbwebk...',
  '...kbekbbkebk...',
  '...kbbbbbbbbk...',
  '....kbbbbbbk....',
  '..kkdccccccdk...',
  '.kbbkcckcckbbk..',
  '..kkcccccccckk..',
  '...kscckccsksbk.',
  '...krsscssrkbkk.',
  '....krrrrrk.kdk.',
  '...kbbkkbbk..k..',
  '...kddkkddk.....',
  '....kk..kk......',
];

const turtleUp = [
  '.....kkkkkk.....',
  '....kbhhhhbk....',
  '...kbbbbbbbbk...',
  '...kbbbbbbbbk...',
  '....kdbbbbdk....',
  '....kcccccck....',
  '...kcssssssck...',
  '..kkcsrssrsckk..',
  '.kbbksrkkrskbbk.',
  '..kkcsrssrssckk.',
  '...kcssrrssck...',
  '...kcrssssrck...',
  '....kcccccck....',
  '...kbbkkbbkbkk..',
  '...kddkkddkbdk..',
  '....kk..kk.kk...',
];

const turtleLeft = [
  '...kkkkkk.......',
  '..kbhhhbbk......',
  '.kbbbbbbbbk.....',
  '.kbwebbbbbk.....',
  '.kbekbbbbdk.....',
  '.kbbbbbbdk......',
  '..kbbbbbkckk....',
  '...kdbbkcssrk...',
  '..kbbbkcsrsrsk..',
  '...kkbkcssrssk..',
  '....kckcsrssrk..',
  '....kcckcssrckk.',
  '....kddkcccckbk.',
  '...kbbkkddkkbbk.',
  '...kddkkbbk.kdk.',
  '....kk..kk...k..',
];

function turtleFrames(rows: string[]): HTMLCanvasElement[] {
  const stand = spriteFromRows(rows, colors);
  const step = [...rows];

  step[13] = step[13]!.replace('bb', 'hh');
  step[14] = step[14]!.replace('dd', 'bb');

  return [stand, spriteFromRows(step, colors), stand];
}

function bicycles(): Record<Facing, HTMLCanvasElement> {
  const side = spriteFromRows([
    '........................',
    '...............kkk......',
    '......kkkk.....mm.......',
    '........m......m........',
    '........mf....fm........',
    '...kkkk.f.f..f.f.kkkk...',
    '..ktmmtk.f..f..fktmmtk..',
    '.ktm..mtk.fff..ktm..mtk.',
    '.kt...mmfffffffmm...tk.',
    '.ktm..mtk..m...ktm..mtk.',
    '..ktmmtk..kkk...ktmmtk..',
    '...kkkk..........kkkk...',
  ], colors);

  const end = spriteFromRows([
    '........................',
    '.......mmmmmmmmmm.......',
    '...........mm...........',
    '..........kmmk..........',
    '..........kmmk..........',
    '..........kffk..........',
    '..........kffk..........',
    '.........kkffkk.........',
    '..........kmmk..........',
    '..........kmmk..........',
    '..........kttk..........',
    '...........kk...........',
  ], colors);

  return { down: end, up: end, left: side, right: flipHorizontal(side) };
}

/** Build once per scene; all movement frames, mounts and ripples are cached canvases. */
export function adventureSprites(player: Map<Facing, HTMLCanvasElement[]>) {
  const left = turtleFrames(turtleLeft);

  const squirtle: Record<Facing, HTMLCanvasElement[]> = {
    down: turtleFrames(turtleDown),
    up: turtleFrames(turtleUp),
    left,
    right: left.map(flipHorizontal),
  };

  const bike = bicycles();
  const cycling = new Map<Facing, HTMLCanvasElement[]>();
  const surfing = new Map<Facing, HTMLCanvasElement[]>();

  for (const [facing, frames] of player) {
    const ridingFrames: HTMLCanvasElement[] = [];
    const surfingFrames: HTMLCanvasElement[] = [];

    for (let frame = 0; frame < frames.length; frame++) {
      const rider = frames[frame]!;
      const [cycle, cycleContext] = makeCanvas(24, 24);

      cycleContext.drawImage(bike[facing], 0, 12);
      cycleContext.drawImage(rider, 0, 0, 16, 13, 4, frame === 1 ? 1 : 0, 16, 13);
      ridingFrames.push(cycle);

      const [surf, surfContext] = makeCanvas(24, 26);

      surfContext.drawImage(squirtle[facing][frame]!, 4, 10);
      surfContext.drawImage(rider, 0, 0, 16, 11, 4, 0, 16, 11);
      surfingFrames.push(surf);
    }

    cycling.set(facing, ridingFrames);
    surfing.set(facing, surfingFrames);
  }

  const wake = [0, 1].map((frame) => {
    const [canvas, context] = makeCanvas(24, 16);

    context.fillStyle = '#c2eeef';
    context.fillRect(1 + frame, 4, 3, 1);
    context.fillRect(20 - frame, 4, 3, 1);
    context.fillRect(frame, 9, 4, 1);
    context.fillRect(20 - frame, 9, 4, 1);
    context.fillRect(5, 14 - frame, 5, 1);
    context.fillRect(14, 14 - frame, 5, 1);

    return canvas;
  });

  return { squirtle, bike, cycling, surfing, wake };
}
