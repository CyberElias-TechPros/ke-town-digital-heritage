// ChatDurableObject — real-time messaging, presence and typing over WebSockets.
//
// The REST API (see routes/community.js) is the source of truth for message
// persistence. This Durable Object provides the real-time push layer:
//   - a client connects to /api/chat/ws (WebSocket upgrade),
//   - it then joins a conversation room by sending { type: "join", conversationId },
//   - sends messages with { type: "message", conversationId, content, media },
//   - sends typing presence with { type: "typing", conversationId, isTyping }.
//
// Messages are persisted to D1 and fanned out to every other connection in the room.

export class ChatDurableObject {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    // userId -> WebSocket
    this.sessions = new Map();
    // conversationId -> Set<userId>
    this.rooms = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/ws")) {
      return this.handleWebSocket(request);
    }
    return new Response("ChatDurableObject", { status: 200 });
  }

  async handleWebSocket(request) {
    // Parse ?userId= & ?token= from the connection query and verify the session.
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || "";
    const token = url.searchParams.get("token") || "";

    if (!userId || !token) {
      return new Response("Unauthorized", { status: 401 });
    }
    // Verify the JWT and ensure it belongs to the claimed user.
    try {
      const { verifyJwt } = await import("./lib/auth.js");
      const secret = this.env.JWT_SECRET || "ke-kingdom-dev-secret-change-me";
      const payload = await verifyJwt(token, secret);
      if (!payload || payload.sub !== userId) {
        return new Response("Unauthorized", { status: 401 });
      }
    } catch {
      return new Response("Unauthorized", { status: 401 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    // Store session
    this.sessions.set(userId, server);

    server.send(JSON.stringify({ type: "connected", userId }));
    server.send(JSON.stringify({ type: "onlineUsers", userIds: Array.from(this.sessions.keys()) }));

    server.addEventListener("message", async (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (data.type) {
        case "join":
          this.joinRoom(server, userId, data.conversationId);
          break;
        case "leave":
          this.leaveRoom(server, userId, data.conversationId);
          break;
        case "typing":
          this.broadcast(data.conversationId, userId, {
            type: "userTyping", userId, conversationId: data.conversationId, isTyping: !!data.isTyping,
          });
          break;
        case "message":
          await this.handleMessage(userId, data);
          break;
      }
    });

    server.addEventListener("close", () => {
      this.sessions.delete(userId);
      for (const [convId, members] of this.rooms) {
        members.delete(userId);
      }
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  joinRoom(server, userId, conversationId) {
    if (!conversationId) return;
    if (!this.rooms.has(conversationId)) this.rooms.set(conversationId, new Set());
    this.rooms.get(conversationId).add(userId);
    server.send(JSON.stringify({ type: "joinedConversation", conversationId }));
  }

  leaveRoom(server, userId, conversationId) {
    this.rooms.get(conversationId)?.delete(userId);
  }

  // Broadcast to every connection in the room, including the sender, so the
  // sender sees their own message reflected immediately with its server id.
  broadcast(conversationId, senderId, payload) {
    const members = this.rooms.get(conversationId);
    if (!members) return;
    const msg = JSON.stringify(payload);
    for (const userId of members) {
      const ws = this.sessions.get(userId);
      if (ws && ws.readyState === 1) {
        try { ws.send(msg); } catch { /* skip */ }
      }
    }
  }

  async handleMessage(userId, data) {
    const { conversationId, content, media } = data;
    if (!conversationId || !content) return;

    // Persist to D1
    const id = crypto.randomUUID().replace(/-/g, "");
    const ts = Date.now();
    try {
      await this.env.DB.prepare(
        "INSERT INTO messages (id, conversation_id, sender_id, content, media, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(id, conversationId, userId, String(content), JSON.stringify(media || []), ts).run();
      await this.env.DB.prepare(
        "UPDATE conversations SET last_message = ?, updated_at = ? WHERE id = ?"
      ).bind(JSON.stringify({ content, createdAt: ts }), ts, conversationId).run();
    } catch (e) {
      console.error("Failed to persist message in DO", e);
    }

    this.broadcast(conversationId, userId, {
      type: "message",
      message: {
        id, _id: id, conversationId, content, media: media || [],
        sender: { _id: userId },
        createdAt: ts,
      },
    });
  }
}
