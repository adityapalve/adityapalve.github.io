import { DurableObject } from 'cloudflare:workers';
import { clientMessage, wireText, type Visitor, type VisitorEvent, type VisitorState } from '../src/scripts/village/protocol';
import { suggestedName, tidyName } from '../src/scripts/village/identity';

type Session = {
  visitor: Visitor;
  state?: VisitorState;
  window: number;
  messages: number;
};

const capacity = 24;

const shirts = ['#3b6ea5', '#2f7d4f', '#6b4a8f', '#b8862e'];

/** One live village. Socket attachments survive hibernation; no world progress is stored. */
export class VillageRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  fetch(): Response {
    if (this.ctx.getWebSockets().length >= capacity) {
      return new Response('The village is full. Solo play is still available.', { status: 503 });
    }

    const pair = new WebSocketPair();
    const id = crypto.randomUUID();

    const session: Session = {
      visitor: { id, name: suggestedName(), look: { shirt: shirts[parseInt(id[0]!, 16) % shirts.length]!, hair: '#1d1a1f' } },
      window: Date.now(),
      messages: 0,
    };

    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment(session);

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
    const text = wireText.safeParse(message);

    if (!text.success) {
      socket.close(1009, 'Message too large');
      this.depart(socket);

      return;
    }

    const session: Session | null = socket.deserializeAttachment();

    if (session === null) return;

    const now = Date.now();

    if (now - session.window >= 1000) {
      session.window = now;
      session.messages = 0;
    }

    session.messages += 1;

    if (session.messages > 30) {
      socket.close(1008, 'Too many messages');
      this.depart(socket);

      return;
    }

    let data: unknown;

    try {
      data = JSON.parse(text.data);
    } catch {
      socket.close(1008, 'Invalid JSON');
      this.depart(socket);

      return;
    }

    const parsed = clientMessage.safeParse(data);

    if (!parsed.success
      || (parsed.data.kind === 'hello' && session.state !== undefined)
      || (parsed.data.kind === 'move' && session.state === undefined)) {
      socket.close(1008, 'Invalid presence message');
      this.depart(socket);

      return;
    }

    const update = parsed.data;

    if (update.kind === 'hello') {
      const name = tidyName(update.name);

      if (name !== '') session.visitor.name = name;

      const visitors: VisitorEvent[] = [];

      for (const other of this.ctx.getWebSockets()) {
        if (other === socket) continue;

        const peer: Session | null = other.deserializeAttachment();

        if (peer?.state !== undefined) visitors.push({ kind: 'join', visitor: peer.visitor, state: peer.state });
      }

      socket.send(JSON.stringify({ kind: 'welcome', visitors }));
    }

    session.state = update.state;
    socket.serializeAttachment(session);
    this.broadcast(socket, update.kind === 'hello'
      ? { kind: 'join', visitor: session.visitor, state: session.state }
      : { kind: 'move', id: session.visitor.id, state: session.state });
  }

  webSocketClose(socket: WebSocket): void {
    this.depart(socket);
    // Explicitly complete the close handshake on local runtimes as well as production.
    socket.close(1000, 'Left the village');
  }

  webSocketError(socket: WebSocket): void {
    this.depart(socket);
    socket.close(1011, 'Connection error');
  }

  private depart(socket: WebSocket): void {
    const session: Session | null = socket.deserializeAttachment();

    socket.serializeAttachment(null);

    if (session?.state !== undefined) this.broadcast(socket, { kind: 'leave', id: session.visitor.id });
  }

  private broadcast(sender: WebSocket, event: VisitorEvent): void {
    const message = JSON.stringify(event);

    for (const socket of this.ctx.getWebSockets()) {
      if (socket === sender || socket.readyState !== WebSocket.OPEN) continue;

      try {
        socket.send(message);
      } catch {
        // A broken peer must not prevent delivery to the rest of the room.
        socket.close(1011, 'Send failed');
      }
    }
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> | Response {
    const url = new URL(request.url);

    if (url.pathname !== '/village/room') return env.ASSETS.fetch(request);

    if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket upgrade required', { status: 426 });
    }

    // Browser-only same-origin access. This is not authentication against non-browser clients.
    if (request.headers.get('Origin') !== url.origin) return new Response('Forbidden', { status: 403 });

    return env.VILLAGE.getByName('village-v1').fetch(request);
  },
} satisfies ExportedHandler<Env>;
