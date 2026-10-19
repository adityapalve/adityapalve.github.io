// Run against `npm run worker:dev`; no remote resources or credentials are used.
//
// The room is shared with whoever is playing, so every assertion is scoped to this run's own
// names and ids instead of assuming an empty village.
import assert from 'node:assert/strict';
import WebSocket from 'ws';

const origin = process.env.VILLAGE_TEST_ORIGIN ?? 'http://localhost:8787';

const url = new URL('/village/room', origin);

url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

const nonce = crypto.randomUUID().slice(0, 4).toUpperCase();

const sockets = [];

const state = { area: 'village', tx: 15, ty: 12, facing: 'down', mode: 'walk' };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect(name) {
  const socket = new WebSocket(url, { origin });
  const messages = [];

  sockets.push(socket);
  socket.on('message', (data) => {
    const text = data.toString();

    messages.push(text === 'pong' ? text : JSON.parse(text));
  });

  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  socket.send(JSON.stringify({ kind: 'hello', name, state }));

  const next = async (kind, match = () => true) => {
    const deadline = Date.now() + 5000;

    while (Date.now() < deadline) {
      const index = messages.findIndex((message) => (message === kind || message.kind === kind) && match(message));

      if (index !== -1) return messages.splice(index, 1)[0];

      await sleep(10);
    }

    throw new Error(`Timed out waiting for ${kind}`);
  };

  return { socket, next };
}

/** Expect the room to refuse a connection outright, before the upgrade completes. */
async function refused(socket, status) {
  await new Promise((resolve, reject) => {
    socket.on('unexpected-response', (_request, response) => {
      assert.equal(response.statusCode, status);
      response.resume();
      socket.terminate();
      resolve();
    });
    socket.on('error', () => {});
    socket.on('open', () => reject(new Error(`Expected ${status}, but the room accepted`)));
  });
}

try {
  const page = await fetch(`${origin}/village`);

  assert.equal(page.status, 200);
  assert.match(await page.text(), /<body class="bleed">/);
  assert.equal((await fetch(`${origin}/not-a-real-page`)).status, 404);
  assert.equal((await fetch(`${origin}/village/room`)).status, 426);
  assert.equal((await fetch(`${origin}/fonts/areal/ABC-Areal-Variable.woff2`)).status, 200);

  await refused(new WebSocket(url, { origin: 'https://not-palve.example' }), 403);

  const aliceName = `ALICE-${nonce}`;
  const bobName = `BOB-${nonce}`;
  const alice = await connect(aliceName);
  const bob = await connect(bobName);

  // Alice learns Bob's id from his join; Bob learns Alice's from his welcome roster.
  const bobJoin = await alice.next('join', (message) => message.visitor?.name === bobName);
  const roster = await bob.next('welcome');
  const aliceEntry = roster.visitors.find((visitor) => visitor.visitor.name === aliceName);

  assert.ok(aliceEntry, 'Bob sees Alice when he arrives');
  assert.notEqual(bobJoin.visitor.id, aliceEntry.visitor.id);

  const aliceId = aliceEntry.visitor.id;
  const bobId = bobJoin.visitor.id;

  // A client cannot impersonate another visitor: the room stamps the sender's own id.
  const moved = { ...state, tx: 16 };

  bob.socket.send(JSON.stringify({ kind: 'move', state: moved, id: aliceId }));

  const move = await alice.next('move', (message) => message.id === bobId);

  assert.equal(move.id, bobId, 'Bob cannot move Alice');
  assert.deepEqual(move.state, moved);

  // Idle pings are answered without waking the object or counting against the rate limit.
  bob.socket.send('ping');
  await bob.next('pong');

  // Leaving clears the walker for everyone else.
  bob.socket.close();
  await alice.next('leave', (message) => message.id === bobId);

  // Reconnecting is a new visitor, not the old id resurrected.
  const returning = await connect(bobName);
  const rejoin = await alice.next('join', (message) => message.visitor?.name === bobName);

  assert.notEqual(rejoin.visitor.id, bobId);
  assert.ok((await returning.next('welcome')).visitors.some((visitor) => visitor.visitor.id === aliceId));

  // A malformed position closes the connection and clears the walker.
  returning.socket.send(JSON.stringify({ kind: 'move', state: { ...state, tx: 'bad' } }));
  await alice.next('leave', (message) => message.id === rejoin.visitor.id);

  // So does a message that is not JSON at all.
  const badName = `BAD-${nonce}`;
  const bad = await connect(badName);
  const badJoin = await alice.next('join', (message) => message.visitor?.name === badName);

  bad.socket.send('not json');
  await alice.next('leave', (message) => message.id === badJoin.visitor.id);

  // More than 30 updates a second closes the connection.
  const fastName = `FAST-${nonce}`;
  const fast = await connect(fastName);
  const fastJoin = await alice.next('join', (message) => message.visitor?.name === fastName);

  for (let i = 0; i < 35; i += 1) fast.socket.send(JSON.stringify({ kind: 'move', state }));

  await alice.next('leave', (message) => message.id === fastJoin.visitor.id);

  // Fill the room until it refuses, however many real visitors are already here. Accepted
  // connections stay open, so the cap is reached rather than freed.
  let full = false;

  for (let i = 0; i < 40 && !full; i += 1) {
    const guest = new WebSocket(url, { origin });

    sockets.push(guest);

    await new Promise((resolve, reject) => {
      guest.on('unexpected-response', (_request, response) => {
        assert.equal(response.statusCode, 503);
        response.resume();
        guest.terminate();
        full = true;
        resolve();
      });
      guest.on('open', resolve);
      guest.on('error', reject);
    });
  }

  assert.ok(full, 'the room eventually refuses connections at its cap');

  console.log('PASS: static assets, full-bleed layout, 404s, origin gate, roster, movement, identity, ping, leave, reconnect, validation, rate limit, room cap');
} finally {
  for (const socket of sockets) socket.terminate();
}
