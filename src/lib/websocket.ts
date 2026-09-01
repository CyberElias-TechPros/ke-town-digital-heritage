// Real-time client for the KE Kingdom Cloudflare backend.
//
// The Cloudflare backend exposes real-time chat/presence/typing through a
// Durable Object at {API_BASE}/chat/ws. This module wraps the native WebSocket
// API (browser / workers-compatible) in a small event bus and exposes two
// conveniences:
//   1. A generic event-based API (on/off/emit) used by useWebSocket hook.
//   2. A conversation-focused API (onNewMessage, onUserTyping, …) used by Chat.
//
// Wire protocol (JSON messages exchanged with the Durable Object):
//   client -> server:
//     { type: "join", conversationId }
//     { type: "leave", conversationId }
//     { type: "message", conversationId, content, media }
//     { type: "typing", conversationId, isTyping }
//     { type: "read", conversationId, messageIds }
//   server -> client:
//     { type: "connected", userId }
//     { type: "onlineUsers", userIds }
//     { type: "joinedConversation", conversationId }
//     { type: "userTyping", userId, conversationId, isTyping }
//     { type: "message", message }
//     { type: "messageRead", conversationId, messageIds, readBy }

export interface WebSocketMessage {
  _id: string;
  id?: string;
  conversationId: string;
  content: string;
  media?: { type: string; url: string }[];
  sender: { _id: string; fullName?: string; avatar?: string };
  readAt?: string;
  createdAt: string;
}

export interface TypingIndicator {
  userId: string;
  isTyping: boolean;
  conversationId?: string;
  typingUsers: string[];
}

export interface OnlineUser {
  userId: string;
  user?: { id: string; fullName: string; avatar?: string; isOnline: boolean };
}

export interface WebSocketEvents {
  connect: () => void;
  disconnect: () => void;
  error: (err: unknown) => void;
  new_message: (message: WebSocketMessage) => void;
  message_read: (data: { messageIds: string[]; conversationId: string; readBy: string }) => void;
  typing: (data: { userId: string; isTyping: boolean; conversationId?: string; typingUsers?: string[] }) => void;
  notification: (notification: unknown) => void;
  notification_read: (id: string) => void;
  post_update: (post: unknown) => void;
  new_reaction: (data: unknown) => void;
  comment_added: (comment: unknown) => void;
  follow_update: (data: unknown) => void;
  product_update: (product: unknown) => void;
  order_status_update: (order: unknown) => void;
  new_order: (order: unknown) => void;
  event_update: (event: unknown) => void;
  new_rsvp: (data: unknown) => void;
  user_online: (data: OnlineUser) => void;
  system_alert: (alert: unknown) => void;
  [key: string]: ((...args: any[]) => void) | undefined;
}

type AnyFn = (...args: any[]) => void;

const API_SERVERS =
  import.meta.env.VITE_API_SERVERS ||
  "https://ke-town-digital-heritage-production.up.railway.app";
const API_BASE = API_SERVERS.split(",")[0].trim();

function wsBase() {
  return API_BASE.replace(/^https/, "wss").replace(/^http/, "ws");
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<AnyFn>> = new Map();
  private connectedResolvers: Array<() => void> = [];
  private manualClose = false;
  private onlineUsers: string[] = [];

  // ----- connection -----------------------------------------------------
  // Supports two call styles:
  //   connect(userId: string, token: string)            (useWebSocket)
  //   connect(token: string, user: { id: string })      (Chat)
  connect(a?: string | { id?: string } | null, b?: string | { id?: string } | null): Promise<void> {
    if (a && typeof a === "object") {
      // connect(user, token)
      this.userId = a.id || null;
      this.token = (typeof b === "string" ? b : null) || null;
    } else if (b && typeof b === "object") {
      // connect(token, user)
      this.userId = b.id || null;
      this.token = (a as string) || null;
    } else {
      // connect(userId, token) OR connect(token)
      this.userId = (a as string) || null;
      this.token = (b as string) || null;
    }
    this.manualClose = false;
    this.reconnectAttempts = 0;
    this.initializeSocket();
    return new Promise<void>((resolve) => {
      this.connectedResolvers.push(resolve);
    });
  }

  disconnect(): void {
    this.manualClose = true;
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
    this.emit("disconnect");
  }

  private initializeSocket(): void {
    if (!this.userId || !this.token || this.manualClose) return;
    try {
      const url = `${wsBase()}/api/chat/ws?userId=${encodeURIComponent(this.userId)}&token=${encodeURIComponent(this.token)}`;
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        let data: any;
        try { data = JSON.parse(event.data as string); } catch { return; }
        this.handleServerMessage(data);
      };

      ws.onerror = () => {
        this.emit("error", new Error("WebSocket error"));
      };

      ws.onclose = () => {
        this.emit("disconnect");
        this.handleReconnect();
      };
    } catch {
      this.emit("error", new Error("WebSocket connection failed"));
    }
  }

  private handleReconnect(): void {
    if (this.manualClose) return;
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.initializeSocket();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
    }
  }

  private handleServerMessage(data: any): void {
    switch (data.type) {
      case "connected":
        this.emit("connect");
        this.connectedResolvers.forEach((r) => r());
        this.connectedResolvers = [];
        break;
      case "onlineUsers":
        this.onlineUsers = data.userIds || [];
        this.emit("user_online", { userIds: this.onlineUsers });
        this.onOnlineUsersCbs.forEach((cb) => cb(this.onlineUsers.map((id) => ({ userId: id }))));
        break;
      case "joinedConversation":
        this.emit("joinedConversation" as any, data);
        this.onJoinedCbs.forEach((cb) => cb({ conversationId: data.conversationId }));
        break;
      case "leftConversation":
        this.onLeftCbs.forEach((cb) => cb({ conversationId: data.conversationId }));
        break;
      case "userTyping":
        {
          const payload = {
            userId: data.userId,
            isTyping: data.isTyping,
            conversationId: data.conversationId,
            typingUsers: [data.userId],
          };
          this.emit("typing", payload);
          this.onTypingCbs.forEach((cb) => cb(payload as TypingIndicator));
        }
        break;
      case "message":
        this.emit("new_message", data.message);
        this.onNewMessageCbs.forEach((cb) => cb(data.message as WebSocketMessage));
        break;
      case "messageRead":
        this.emit("message_read", data);
        this.onReadCbs.forEach((cb) => cb({ messageIds: data.messageIds || [], conversationId: data.conversationId, readBy: data.readBy }));
        break;
      case "notification":
        this.emit("notification", data.notification);
        break;
      default:
        break;
    }
  }

  // ----- generic event bus ----------------------------------------------
  on<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    if (!this.listeners.has(event as string)) this.listeners.set(event as string, new Set());
    this.listeners.get(event as string)!.add(listener as AnyFn);
  }

  off<K extends keyof WebSocketEvents>(event: K, listener?: WebSocketEvents[K]): void {
    if (!this.listeners.has(event as string)) return;
    if (listener) {
      this.listeners.get(event as string)!.delete(listener as AnyFn);
    } else {
      this.listeners.delete(event as string);
    }
  }

  emit(event: string, data?: any): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((listener) => {
      try { listener(data); } catch { /* isolate listener errors */ }
    });
  }

  private send(payload: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  // ----- send helpers ----------------------------------------------------
  // Support both calling styles used across the codebase:
  //   sendMessage({ conversationId, content, media })   (useWebSocket hook)
  //   sendMessage(conversationId, content, media)       (Chat page)
  sendMessage(a: any, b?: any, c?: any): void {
    let conversationId, content, media;
    if (typeof a === "object" && a !== null) {
      conversationId = a.conversationId;
      content = a.content;
      media = a.media;
    } else {
      conversationId = a;
      content = b;
      media = c;
    }
    this.send({ type: "message", conversationId, content, media: media || [] });
  }

  sendTyping(a: any, b?: any): void {
    if (typeof a === "object" && a !== null) {
      this.send({ type: "typing", conversationId: a.conversationId, isTyping: a.isTyping });
    } else {
      this.send({ type: "typing", conversationId: a, isTyping: b });
    }
  }

  markAsRead(a: any, b?: any): void {
    if (typeof a === "object" && a !== null) {
      this.send({ type: "read", conversationId: a.conversationId, messageIds: [a.messageId] });
    } else {
      this.send({ type: "read", conversationId: a, messageIds: b || [] });
    }
  }

  joinRoom(room: string): void {
    this.send({ type: "join", conversationId: room });
  }

  leaveRoom(room: string): void {
    this.send({ type: "leave", conversationId: room });
  }

  joinConversation(id: string): void {
    this.joinRoom(id);
  }

  leaveConversation(id: string): void {
    this.leaveRoom(id);
  }

  markNotificationRead(id: string): void {
    this.send({ type: "notificationRead", id });
  }

  requestNotificationPermission(): void {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  isConnected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionStatus(): "connected" | "connecting" | "disconnected" {
    if (!this.ws) return "disconnected";
    if (this.ws.readyState === WebSocket.OPEN) return "connected";
    return "connecting";
  }

  // ----- conversation-focused callbacks (Chat.tsx) -----------------------
  private onNewMessageCbs: Array<(m: WebSocketMessage) => void> = [];
  private onTypingCbs: Array<(t: TypingIndicator) => void> = [];
  private onReadCbs: Array<(d: { messageIds: string[]; conversationId: string; readBy: string }) => void> = [];
  private onOnlineUsersCbs: Array<(users: OnlineUser[]) => void> = [];
  private onJoinedCbs: Array<(d: { conversationId: string }) => void> = [];
  private onLeftCbs: Array<(d: { conversationId: string }) => void> = [];

  onNewMessage(cb: (m: WebSocketMessage) => void): void { this.onNewMessageCbs.push(cb); }
  onUserTyping(cb: (t: TypingIndicator) => void): void { this.onTypingCbs.push(cb); }
  onMessagesRead(cb: (d: { messageIds: string[]; conversationId: string; readBy: string }) => void): void { this.onReadCbs.push(cb); }
  onOnlineUsers(cb: (users: OnlineUser[]) => void): void { this.onOnlineUsersCbs.push(cb); }
  onJoinedConversation(cb: (d: { conversationId: string }) => void): void { this.onJoinedCbs.push(cb); }
  onLeftConversation(cb: (d: { conversationId: string }) => void): void { this.onLeftCbs.push(cb); }
  onUserOnline(_cb: (u: OnlineUser) => void): void { /* presence via onlineUsers */ }
  onUserOffline(_cb: (d: { userId: string; lastSeen: string }) => void): void { /* no-op */ }
  onUserStatusChanged(_cb: (d: unknown) => void): void { /* no-op */ }
  onNewMessageNotification(_cb: (d: unknown) => void): void { /* no-op */ }
  onError(_cb: (e: { message: string }) => void): void { /* handled via generic events */ }
}

export const websocketClient = new WebSocketService();
export const websocket = websocketClient;

// React hook for components that need the client + connection state.
export function useWebSocket() {
  return {
    client: websocketClient,
    isConnected: websocketClient.isConnected(),
    connectionStatus: websocketClient.getConnectionStatus(),
  };
}

export default websocketClient;
