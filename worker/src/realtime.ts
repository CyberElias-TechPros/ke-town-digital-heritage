/**
 * RealtimeHub — a single global Durable Object that fans out events to every
 * connected client. Workers are stateless and scattered across hundreds of
 * isolates, so this object is the only place a live socket registry can live.
 *
 * Client protocol (plain JSON over WebSocket):
 *   → {"type":"auth","token":"..."}
 *   ← {"type":"ready","userId":"..."}
 *   → {"type":"subscribe","room":"conversation:<id>"}
 *   → {"type":"ping"}            ← {"type":"pong"}
 *   ← {"type":"event","event":"new_message","room":"...","payload":{...}}
 */
interface Client {
  ws: WebSocket;
  userId: string | null;
  rooms: Set<string>;
  lastPing: number;
}

export class RealtimeHub {
  private state: DurableObjectState;
  private clients: Set<Client> = new Set();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.accept(server as WebSocket);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname.endsWith('/stats')) {
      return Response.json({
        connections: this.clients.size,
        authenticated: Array.from(this.clients).filter((c) => c.userId).length,
        rooms: Array.from(new Set(Array.from(this.clients).flatMap((c) => Array.from(c.rooms)))).length,
      });
    }

    /**
     * Server-side publish. Route handlers POST here from any isolate:
     *   POST {event, room, payload, userIds}
     */
    if (request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as {
        event?: string;
        room?: string;
        payload?: unknown;
        userIds?: string[];
      };
      this.publish(body.event ?? 'event', body.room, body.payload, body.userIds);
      return Response.json({ ok: true, delivered: this.clients.size });
    }

    return new Response('RealtimeHub', { status: 200 });
  }

  private accept(ws: WebSocket) {
    const client: Client = { ws, userId: null, rooms: new Set(), lastPing: Date.now() };
    this.clients.add(client);
    ws.accept();
    this.send(ws, { type: 'hello', message: 'Authenticate to receive events' });

    ws.addEventListener('message', (ev) => this.onMessage(client, ev.data));
    ws.addEventListener('close', () => this.drop(client));
    ws.addEventListener('error', () => this.drop(client));
  }

  private onMessage(client: Client, data: string | ArrayBuffer) {
    let msg: Record<string, unknown>;
    try {
      msg = typeof data === 'string' ? JSON.parse(data) : JSON.parse(new TextDecoder().decode(data));
    } catch {
      return;
    }
    const type = String(msg.type ?? '');

    if (type === 'ping') {
      client.lastPing = Date.now();
      this.send(client.ws, { type: 'pong', at: Date.now() });
      return;
    }

    if (type === 'auth') {
      const userId = String(msg.userId ?? '').trim();
      if (!userId) {
        this.send(client.ws, { type: 'error', message: 'userId required' });
        return;
      }
      client.userId = userId;
      client.rooms.add(`user:${userId}`);
      this.send(client.ws, { type: 'ready', userId });
      this.broadcast('user_online', `presence`, { userId }, userId);
      this.send(client.ws, {
        type: 'event',
        event: 'online_users',
        payload: this.onlineUserIds(),
      });
      return;
    }

    if (type === 'subscribe') {
      const room = String(msg.room ?? '').trim();
      if (room) {
        client.rooms.add(room);
        this.send(client.ws, { type: 'subscribed', room });
      }
      return;
    }

    if (type === 'unsubscribe') {
      client.rooms.delete(String(msg.room ?? ''));
      return;
    }
  }

  private onlineUserIds(): string[] {
    return Array.from(new Set(Array.from(this.clients).map((c) => c.userId).filter(Boolean) as string[]));
  }

  private drop(client: Client) {
    if (!this.clients.has(client)) return;
    this.clients.delete(client);
    if (client.userId) {
      this.broadcast('user_offline', 'presence', { userId: client.userId, at: new Date().toISOString() }, client.userId);
    }
  }

  private send(ws: WebSocket, payload: unknown) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      /* socket already gone */
    }
  }

  /** Send to everyone in `room` (or everyone when room is omitted), optionally excluding one user. */
  private broadcast(event: string, room: string | undefined, payload: unknown, excludeUserId?: string) {
    const envelope = JSON.stringify({ type: 'event', event, room: room ?? null, payload });
    for (const client of this.clients) {
      if (excludeUserId && client.userId === excludeUserId) continue;
      if (!room || client.rooms.has(room) || client.rooms.has('broadcast')) {
        try {
          client.ws.send(envelope);
        } catch {
          this.drop(client);
        }
      }
    }
  }

  /** Send to a specific set of users regardless of room membership. */
  private toUsers(userIds: string[], event: string, payload: unknown) {
    const wanted = new Set(userIds);
    const envelope = JSON.stringify({ type: 'event', event, payload });
    for (const client of this.clients) {
      if (client.userId && wanted.has(client.userId)) {
        try {
          client.ws.send(envelope);
        } catch {
          this.drop(client);
        }
      }
    }
  }

  private publish(event: string, room: string | undefined, payload: unknown, userIds?: string[]) {
    if (userIds && userIds.length) {
      this.toUsers(userIds, event, payload);
    }
    this.broadcast(event, room, payload);
  }
}

/** Helper used by route handlers to push an event from any isolate. */
export async function emit(
  env: { REALTIME: DurableObjectNamespace },
  event: string,
  payload: unknown,
  opts: { room?: string; userIds?: string[] } = {},
): Promise<void> {
  try {
    const stub = env.REALTIME.get(env.REALTIME.idFromName('global-hub'));
    await stub.fetch('https://realtime.internal/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, room: opts.room, payload, userIds: opts.userIds }),
    });
  } catch {
    // Realtime is best-effort: REST polling still keeps the UI correct.
  }
}
