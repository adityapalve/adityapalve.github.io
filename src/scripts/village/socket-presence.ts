import { serverMessage, type ClientMessage, type VisitorEvent, type VisitorState } from './protocol';
import type { Presence } from './presence';

/** Same-origin room, with solo play during outages and a fresh roster after reconnecting. */
export function createSocketPresence(name = ''): Presence {
  const url = new URL('/village/room', window.location.href);

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  const events: VisitorEvent[] = [];
  const peers = new Set<string>();
  let latest: VisitorState | undefined;
  let socket: WebSocket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let attempts = 0;
  let closed = false;
  let suspended = false;
  let heard = 0;

  const forget = () => {
    const departed = new Set(peers);

    for (const event of events) departed.add(event.kind === 'join' ? event.visitor.id : event.id);

    events.length = 0;

    for (const id of departed) events.push({ kind: 'leave', id });

    peers.clear();
  };

  const send = (message: ClientMessage) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };

  const connect = () => {
    if (closed || suspended || latest === undefined || socket !== undefined) return;

    const connection = new WebSocket(url);

    socket = connection;
    connection.addEventListener('open', () => {
      heard = Date.now();

      if (latest !== undefined) send({ kind: 'hello', name: name.slice(0, 128), state: latest });

      heartbeat = setInterval(() => {
        if (Date.now() - heard > 60_000) connection.close();
        else if (connection.readyState === WebSocket.OPEN) connection.send('ping');
      }, 25_000);
    });

    connection.addEventListener('message', (message) => {
      heard = Date.now();

      if (message.data === 'pong') return;

      try {
        const data = serverMessage.parse(JSON.parse(String(message.data)));

        let arrived: VisitorEvent[];

        if (data.kind === 'welcome') {
          arrived = data.visitors;
          attempts = 0;
        } else {
          arrived = [data];
        }

        for (const event of arrived) {
          if (event.kind === 'join') peers.add(event.visitor.id);
          else if (event.kind === 'leave') peers.delete(event.id);

          events.push(event);
        }

        // A background tab must not accumulate an unbounded replay history.
        if (events.length > 512) connection.close();
      } catch {
        connection.close();
      }
    });

    connection.addEventListener('close', () => {
      clearInterval(heartbeat);
      socket = undefined;
      forget();

      if (closed || suspended) return;

      const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempts, 5));

      attempts += 1;
      retry = setTimeout(() => {
        retry = undefined;
        connect();
      }, delay + Math.random() * 500);
    });

    // Browsers deliver close after a failed handshake; retries are scheduled in one place.
    connection.addEventListener('error', () => {});
  };

  const pause = () => {
    suspended = true;
    clearTimeout(retry);
    retry = undefined;
    socket?.close();
  };

  const resume = () => {
    suspended = false;
    connect();
  };

  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', resume);

  return {
    publish: (state) => {
      latest = state;

      if (socket === undefined && retry === undefined) connect();
      else send({ kind: 'move', state });
    },
    drain: () => events.splice(0, events.length),
    close: () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(heartbeat);
      socket?.close();
      window.removeEventListener('pagehide', pause);
      window.removeEventListener('pageshow', resume);
    },
  };
}
