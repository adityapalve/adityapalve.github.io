import { createChiptune, type Chiptune } from './audio';
import { createAdventure, directions } from './adventure';
import { createTextBox, type Page } from './dialog';
import { buildWorld, mapHeight, mapWidth, type HutData, type Npc, type VillageData, type WorkshopData, type World } from './map';
import { tileSize } from './pixels';
import { createScene, fitCanvas } from './scene';
import type { Facing } from './sprites';

/** What the player is facing and could talk to. */
type Target = { kind: 'npc'; npc: Npc } | { kind: 'sign' } | { kind: 'feature'; feature: World['features'][number] } | { kind: 'water' };

/** Roughly how many tiles fit across the shorter side of the screen. */
const viewTiles = 12;

const opposite = new Map<Facing, Facing>([
  ['up', 'down'],
  ['down', 'up'],
  ['left', 'right'],
  ['right', 'left'],
]);

const keyToFacing = new Map<string, Facing>([
  ['ArrowUp', 'up'],
  ['ArrowDown', 'down'],
  ['ArrowLeft', 'left'],
  ['ArrowRight', 'right'],
  ['w', 'up'],
  ['s', 'down'],
  ['a', 'left'],
  ['d', 'right'],
  ['W', 'up'],
  ['S', 'down'],
  ['A', 'left'],
  ['D', 'right'],
]);

const confirmKeys = new Set(['Enter', ' ', 'z', 'Z', 'e', 'E']);

const cancelKeys = new Set(['Escape', 'x', 'X', 'Backspace']);

const welcomePages: Page[] = [
  { text: 'Welcome to the village. Four huts, one workshop, five keepers.' },
  { text: 'Each hut is one piece of what I built at Jaguar Land Rover. The nameplate tells you which.' },
  { text: 'The workshop by the pond holds the side projects, with links.' },
  { text: 'Meet Squirtle just northwest of the plaza. It follows you, and carries you over water. A bicycle waits west of the plaza; press B to ride.' },
  { text: 'Follow the east path to the lake. Somewhere across the water, and somewhere in the southern grove, a secret is waiting.' },
];

export type Village = { music: Chiptune };

export function startVillage(root: HTMLElement, canvas: HTMLCanvasElement, data: VillageData, onProgress: (visited: number, total: number) => void): Village {
  const context = canvas.getContext('2d');

  if (context === null) throw new Error('village: 2d canvas unavailable');

  // The view grows with the window: the canvas always fills the page at a crisp whole-number scale
  const fit = () => fitCanvas(canvas, context, root, viewTiles);

  fit();
  new ResizeObserver(fit).observe(root);

  const world = buildWorld(data.huts, data.workshop, data.roofs);
  const scene = createScene(world);
  const textBox = createTextBox(root);
  const music = createChiptune();
  const prompt = root.querySelector<HTMLElement>('.prompt');
  const visited = new Set<string>();

  const adventure = createAdventure(world);
  const { state } = adventure;
  const { player } = state;
  const status = root.querySelector<HTMLElement>('.adventure-status');
  const bikeButton = root.querySelector<HTMLButtonElement>('[data-action="bike"]');
  const secrets = new Set<string>();
  let lastStatus = '';

  const reflectAdventure = () => {
    const text = `${state.hasCompanion ? 'Squirtle' : 'Find Squirtle'} · ${state.mode === 'surf' ? 'Surfing' : state.mode === 'bike' ? 'Cycling' : 'Walking'}${state.hasBike ? ' · Bicycle' : ''} · Secrets ${secrets.size}/2`;

    if (text === lastStatus) return;

    if (status !== null) status.textContent = text;
    lastStatus = text;

    if (bikeButton !== null) {
      bikeButton.hidden = !state.hasBike;
      bikeButton.disabled = state.mode === 'surf';
      bikeButton.setAttribute('aria-pressed', String(state.mode === 'bike'));
      bikeButton.textContent = state.mode === 'bike' ? 'B · Walk' : 'B · Cycle';
    }
  };

  reflectAdventure();

  const held: Facing[] = [];

  const hold = (facing: Facing) => {
    if (!held.includes(facing)) held.push(facing);
  };

  const release = (facing: Facing) => {
    const at = held.indexOf(facing);

    if (at >= 0) held.splice(at, 1);
  };

  const npcAt = (tx: number, ty: number): Npc | undefined => world.npcs.find((npc) => npc.tx === tx && npc.ty === ty);

  const facingTile = () => {
    const delta = directions[player.facing];

    return { tx: player.tx + delta.dx, ty: player.ty + delta.dy };
  };

  const talkTarget = (): Target | undefined => {
    const tile = facingTile();
    const npc = npcAt(tile.tx, tile.ty);

    if (npc !== undefined) return { kind: 'npc', npc };

    if (tile.tx === world.sign.tx && tile.ty === world.sign.ty) return { kind: 'sign' };

    const feature = world.features.find((feature) =>
      feature.tx === tile.tx && feature.ty === tile.ty &&
      !(feature.id === 'starter' && state.hasCompanion) && !(feature.id === 'bike' && state.hasBike));

    if (feature !== undefined) return { kind: 'feature', feature };

    if (!state.hasCompanion && world.ground[tile.ty]?.[tile.tx] === 'water') return { kind: 'water' };

    return undefined;
  };

  const hutPages = (data: HutData): Page[] => {
    const remaining = world.huts.length - visited.size;

    const closing: Page =
      remaining === 0
        ? { text: "That's every hut. Thanks for walking round. The long version is on the experience page.", links: [{ label: 'Read the long version', url: '/experience' }] }
        : { text: `That's ${data.title}. ${remaining} hut${remaining === 1 ? '' : 's'} left to visit.` };

    return [{ text: `${data.title}. ${data.role}.` }, ...data.points.map((point) => ({ text: `• ${point}` })), closing];
  };

  const workshopPages = (data: WorkshopData): Page[] => [
    { text: `${data.title}. Things I built on evenings and weekends. Each one has a link.` },
    ...data.projects.map((project) => ({
      text: `${project.name}. ${project.blurb}`,
      links: project.url === undefined ? [] : [{ label: `Open ${project.name}`, url: project.url }],
    })),
    { text: "That's the workshop. The map page here grew out of the photo map." },
  ];

  const talk = () => {
    const target = talkTarget();

    if (target === undefined) return;

    if (target.kind === 'water') {
      music.blip();
      textBox.open('The lake', [{ text: 'The water is too deep to walk through. Meet Squirtle near the plaza, then walk into the water together to Surf.' }], () => {});

      return;
    }

    if (target.kind === 'feature') {
      const { feature } = target;
      let pages: Page[];

      if (feature.id === 'starter') {
        adventure.acquireCompanion();
        pages = [
          { text: 'Squirtle joined you! Your little blue companion will follow wherever you go.' },
          { text: 'Walk into water to Surf on Squirtle. Step onto the bank to come ashore. The lake lies east of the village.' },
        ];
      } else if (feature.id === 'bike') {
        adventure.acquireBike();
        pages = [{ text: 'You found a bicycle! Press B, or the Cycle button, to hop on and off. You travel faster on land; Squirtle handles the water.' }];
      } else if (feature.id === 'shore') {
        pages = [{ text: 'Ripple Lake. Bring Squirtle and walk into the water to Surf. The tiny island to the east has a message for curious travelers.' }];
      } else {
        secrets.add(feature.id);
        pages = feature.id === 'island'
          ? [{ text: 'You found the secret island! The sign says: “There is no Mew under the parked car. We checked.”' }, { text: 'Squirtle looks delighted. Some detours are their own reward.' }]
          : [{ text: 'You found the quiet grove! “A trainer needs a break, too.” The trees rustle. Somewhere, a very sleepy Snorlax approves.' }];
      }

      music.chime();
      reflectAdventure();
      textBox.open(feature.title, pages, () => {});

      return;
    }

    if (target.kind === 'sign') {
      music.blip();
      textBox.open('Sign', welcomePages, () => {});

      return;
    }

    const npc = target.npc;

    npc.facing = opposite.get(player.facing)!;

    if (npc.kind === 'hut') {
      const first = !visited.has(npc.hut.data.id);

      visited.add(npc.hut.data.id);
      onProgress(visited.size, world.huts.length);

      if (first) music.chime();
      else music.blip();

      textBox.open(npc.hut.data.label, hutPages(npc.hut.data), () => {});
    } else {
      music.blip();
      textBox.open(npc.workshop.data.title, workshopPages(npc.workshop.data), () => {});
    }
  };

  const confirm = () => {
    if (textBox.isOpen()) {
      music.blip();
      textBox.advance();
    } else {
      if (player.moving) return;
      talk();
    }
  };

  const toggleBike = () => {
    if (textBox.isOpen()) return;

    if (adventure.toggleBike()) {
      music.blip();
      reflectAdventure();
    }
  };

  bikeButton?.addEventListener('click', () => {
    canvas.focus();
    toggleBike();
  });
  // Keyboard: only while the game has focus, so arrows still scroll the rest of the page
  window.addEventListener('keydown', (event) => {
    if (!root.contains(document.activeElement)) return;

    const facing = keyToFacing.get(event.key);

    if (facing !== undefined) {
      event.preventDefault();
      hold(facing);

      return;
    }

    if (event.key.toLowerCase() === 'b') {
      event.preventDefault();

      if (!event.repeat) toggleBike();

      return;
    }

    if (confirmKeys.has(event.key)) {
      event.preventDefault();
      confirm();
    } else if (cancelKeys.has(event.key) && textBox.isOpen()) {
      event.preventDefault();
      textBox.close();
    }
  });

  window.addEventListener('keyup', (event) => {
    const facing = keyToFacing.get(event.key);

    if (facing !== undefined) release(facing);
  });

  window.addEventListener('blur', () => held.splice(0, held.length));

  // Touch pad
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-dir]')) {
    const facing = keyToFacing.get(`Arrow${button.dataset.dir ?? ''}`);

    if (facing === undefined) continue;

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      canvas.focus();
      hold(facing);
    });

    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
      button.addEventListener(type, () => release(facing));
    }
  }

  root.querySelector<HTMLButtonElement>('[data-action="confirm"]')?.addEventListener('click', () => {
    canvas.focus();
    confirm();
  });

  // Tapping the text box turns the page, like the handhelds; links inside it still work
  textBox.element.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a') !== null) return;

    canvas.focus();
    confirm();
  });

  // Simulation
  const update = (dt: number) => {
    adventure.update(dt, textBox.isOpen() ? undefined : held[held.length - 1]);
    reflectAdventure();

    if (prompt !== null) prompt.hidden = player.moving || textBox.isOpen() || talkTarget() === undefined;
  };

  const draw = (seconds: number) => {
    const px = (player.from.tx + (player.tx - player.from.tx) * player.step) * tileSize;
    const py = (player.from.ty + (player.ty - player.from.ty) * player.step) * tileSize;
    const camX = Math.round(Math.min(Math.max(px + tileSize / 2 - canvas.width / 2, 0), mapWidth * tileSize - canvas.width));
    const camY = Math.round(Math.min(Math.max(py + tileSize / 2 - canvas.height / 2, 0), mapHeight * tileSize - canvas.height));
    const frame = player.moving ? 1 + (Math.floor(player.cycle) % 2) : 0;

    const companion = state.companion;
    const cx = (companion.from.tx + (companion.tx - companion.from.tx) * companion.step) * tileSize;
    const cy = (companion.from.ty + (companion.ty - companion.from.ty) * companion.step) * tileSize;

    scene.draw(context, camX, camY, seconds, {
      x: px, y: py, facing: player.facing, frame, mode: state.mode, bikeUnlocked: state.hasBike,
      companion: state.hasCompanion ? { x: cx, y: cy, facing: companion.facing, frame } : undefined,
    });
  };

  // Fixed-step simulation: movement speed stays the same whether the tab runs at 120 fps or is throttled
  const stepSeconds = 1 / 120;
  let last: number | undefined;
  let backlog = 0;
  let started: number | undefined;

  const loop = (now: number) => {
    requestAnimationFrame(loop);

    // Use the RAF clock from its first callback; its timestamp can precede performance.now().
    started ??= now;
    backlog = Math.min(backlog + (now - (last ?? now)) / 1000, 0.25);
    last = now;

    while (backlog >= stepSeconds) {
      update(stepSeconds);
      backlog -= stepSeconds;
    }

    draw((now - started) / 1000);
  };

  requestAnimationFrame(loop);

  return { music };
}
