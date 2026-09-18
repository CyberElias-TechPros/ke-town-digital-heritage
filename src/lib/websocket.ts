/**
 * Realtime client for the KE Town Cloudflare Worker.
 *
 * Workers cannot host a Socket.IO server, so this speaks the plain-JSON
 * WebSocket protocol exposed by the `RealtimeHub` Durable Object at
 * `/api/realtime`. It stays on the same origin as the app, so it needs no
 * extra host configuration in development or production.
 *
 * Durability rule: **writes go through REST, delivery comes over the socket.**
 * Sending a message POSTs to `/api/conversations/:id/messages` (which persists
 * it in D1 and then publishes to the hub) — so nothing is lost if the socket
 * drops mid-flight.
 */
import { api } from './api';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketEvents {
  connect: () => void;
  disconnect: () => void;
  error: (error: Error) => void;

  new_message: (message: WebSocketMessage) => void;
  message_read: (data: { conversationId: string; messageIds: string[]; readBy: string }) => void;
  typing: (data: { conversationId: string; userId: string; isTyping: boolean }) => void;

  notification: (notification: unknown) => void;
  notification_read: (notificationId: string) => void;

  post_update: (post: unknown) => void;
  new_reaction: (data: { postId: string; userId: string; reactionType: string }) => void;
  comment_added: (comment: unknown) => void;
  follow_update: (data: { followerId: string; followingId: string; type: string }) => void;

  product_update: (product: unknown) => void;
  order_status_update: (order: unknown) => void;
  new_order: (order: unknown) => void;

  event_update: (event: unknown) => void;
  new_rsvp: (data: { eventId: string; userId: string; status: string }) => void;
  group_update: (data: { groupId: string; userId: string; status: string }) => void;
  conversation_created: (data: { conversationId: string }) => void;

  user_online: (data: { userId: string; status: string }) => void;
  user_offline: (data: { userId: string; at: string }) => void;
  online_users: (userIds: string[]) => void;
  system_alert: (alert: unknown) => void;
}

export interface WebSocketMessage {
  _id: string;
  id?: string;
  conversationId: string;
  sender: { _id: string; fullName: string; avatar?: string };
  senderId?: string;
  content: string;
  media?: { type: string; url: string }[];
  readBy?: string[];
  readAt?: string;
  createdAt: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  typingUsers?: string[];
}

export interface OnlineUser {
  userId: string;
  user?: { id: string; fullName: string; avatar?: string; isOnline: boolean };
  isOnline?: boolean;
}

type Listener = (payload: never) => void;

const realtimeUrl = (): string => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/realtime`;
};

class RealtimeService {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Listener[]>();
  private rooms = new Set<string>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 8;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private identity: { userId: string; token: string } | null = null;
  private intentionallyClosed = false;

  /** Opens (or re-opens) the socket. Safe to call repeatedly. */
  connect(token?: string | null, userId?: string | null): void {
    const resolvedToken = token ?? localStorage.getItem('keKingdom_token');
    let resolvedUser = userId ?? null;
    if (!resolvedUser) {
      try {
        resolvedUser = JSON.parse(localStorage.getItem('keKingdom_user') ?? 'null')?.id ?? null;
      } catch {
        resolvedUser = null;
      }
    }
    if (!resolvedToken || !resolvedUser) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.identity = { userId: resolvedUser, token: resolvedToken };
    this.intentionallyClosed = false;

    const url = new URL(realtimeUrl());
    url.searchParams.set('token', resolvedToken);
    url.searchParams.set('userId', resolvedUser);

    try {
      this.socket = new WebSocket(url.toString());
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.send({ type: 'auth', userId: resolvedUser });
      for (const room of this.rooms) this.send({ type: 'subscribe', room });
      this.emit('connect');
      this.heartbeat = setInterval(() => this.send({ type: 'ping' }), 25_000);
    };

    this.socket.onmessage = (event) => {
      let frame: { type?: string; event?: string; payload?: unknown };
      try {
        frame = JSON.parse(typeof event.data === 'string' ? event.data : '');
      } catch {
        return;
      }
      if (frame.type !== 'event' || !frame.event) return;
      this.emit(frame.event as keyof WebSocketEvents, frame.payload);
      if (frame.event === 'notification') this.showBrowserNotification(frame.payload);
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      this.socket = null;
      this.emit('disconnect');
      if (!this.intentionallyClosed) this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      this.emit('error', new Error('Realtime connection failed'));
    };
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
    this.identity = null;
  }

  private stopHeartbeat() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(15_000, 500 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    setTimeout(() => {
      if (!this.intentionallyClosed && this.identity) {
        this.emit('error', new Error('reconnecting'));
        this.connect(this.identity.token, this.identity.userId);
      }
    }, delay);
  }

  private send(payload: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  private showBrowserNotification(payload: unknown) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const n = (payload ?? {}) as { title?: string; message?: string; id?: string; _id?: string };
    try {
      new Notification(n.title || 'KE Town', {
        body: n.message ?? '',
        icon: '/favicon.ico',
        tag: n._id ?? n.id,
      });
    } catch {
      /* some browsers require a service worker registration */
    }
  }

  /* ----------------------------- public API ----------------------------- */

  on<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    const list = this.listeners.get(event) ?? [];
    list.push(listener as Listener);
    this.listeners.set(event, list);
  }

  off<K extends keyof WebSocketEvents>(event: K, listener?: WebSocketEvents[K]): void {
    if (!listener) {
      this.listeners.delete(event);
      return;
    }
    const list = this.listeners.get(event) ?? [];
    const index = list.indexOf(listener as Listener);
    if (index > -1) list.splice(index, 1);
  }

  /** Internal fan-out; also lets UI code broadcast locally. */
  emit<K extends keyof WebSocketEvents>(event: K, payload?: unknown): void {
    const list = this.listeners.get(event);
    if (!list) return;
    for (const listener of [...list]) {
      try {
        (listener as (p: unknown) => void)(payload);
      } catch (err) {
        console.error(`[realtime] listener for "${event}" threw`, err);
      }
    }
  }

  joinRoom(room: string): void {
    this.rooms.add(room);
    this.send({ type: 'subscribe', room });
  }

  leaveRoom(room: string): void {
    this.rooms.delete(room);
    this.send({ type: 'unsubscribe', room });
  }

  /** REST-backed: persists first, then the hub fans the event out. */
  async sendMessage(data: { conversationId: string; content: string; media?: { type: string; url: string }[] }): Promise<void> {
    const token = localStorage.getItem('keKingdom_token');
    if (!token) throw new Error('Not authenticated');
    await api.sendMessage(token, data.conversationId, data.content, data.media);
  }

  async markAsRead(data: { conversationId: string; messageId?: string }): Promise<void> {
    const token = localStorage.getItem('keKingdom_token');
    if (!token) return;
    await api.markMessagesAsRead(token, data.conversationId, data.messageId ? [data.messageId] : []);
  }

  async sendTyping(data: { conversationId: string; isTyping: boolean }): Promise<void> {
    const token = localStorage.getItem('keKingdom_token');
    if (!token) return;
    await api.typingIndicator(token, data.conversationId, data.isTyping);
  }

  markNotificationRead(notificationId: string): void {
    this.emit('notification_read', notificationId);
  }

  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }

  getConnectionStatus(): ConnectionStatus {
    if (!this.socket) return 'disconnected';
    if (this.socket.readyState === WebSocket.OPEN) return 'connected';
    if (this.socket.readyState === WebSocket.CONNECTING) return 'connecting';
    return 'reconnecting';
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

/** Singleton shared by the whole app. */
export const websocket = new RealtimeService();
export default websocket;

/**
 * Thin adapter kept for pages that were written against the old Socket.IO
 * client. Same method names, now backed by the REST + Durable Object path.
 */
export class WebSocketClient {
  private token: string | null = null;
  private userId: string | null = null;

  connect(token: string, user: { id: string }): Promise<void> {
    this.token = token;
    this.userId = user.id;
    websocket.connect(token, user.id);
    return new Promise((resolve) => {
      if (websocket.isConnected()) {
        resolve();
        return;
      }
      const done = () => {
        websocket.off('connect', done);
        resolve();
      };
      websocket.on('connect', done);
      // Never leave the caller hanging if the socket cannot be established.
      setTimeout(done, 3000);
    });
  }

  disconnect(): void {
    websocket.disconnect();
    this.token = null;
    this.userId = null;
  }

  joinConversation(conversationId: string): void {
    websocket.joinRoom(`conversation:${conversationId}`);
  }

  leaveConversation(conversationId: string): void {
    websocket.leaveRoom(`conversation:${conversationId}`);
  }

  sendMessage(conversationId: string, content: string, media?: { type: string; url: string }[]): void {
    void websocket.sendMessage({ conversationId, content, media });
  }

  markAsRead(conversationId: string, messageIds: string[]): void {
    if (!this.token) return;
    void api.markMessagesAsRead(this.token, conversationId, messageIds);
  }

  sendTyping(conversationId: string, isTyping: boolean): void {
    void websocket.sendTyping({ conversationId, isTyping });
  }

  updateStatus(): void {
    /* presence is derived from the live socket, no explicit call needed */
  }

  onNewMessage(cb: (message: WebSocketMessage) => void): void {
    websocket.on('new_message', cb);
  }

  onUserTyping(cb: (typing: TypingIndicator) => void): void {
    websocket.on('typing', cb);
  }

  onMessagesRead(cb: (data: { conversationId: string; messageIds: string[]; readBy: string }) => void): void {
    websocket.on('message_read', cb);
  }

  onUserOnline(cb: (user: OnlineUser) => void): void {
    websocket.on('user_online', cb);
  }

  onUserOffline(cb: (data: { userId: string; at: string }) => void): void {
    websocket.on('user_offline', cb);
  }

  onOnlineUsers(cb: (users: OnlineUser[]) => void): void {
    websocket.on('online_users', (ids: string[]) => cb(ids.map((userId) => ({ userId, isOnline: true }))));
  }

  onError(cb: (error: { message: string }) => void): void {
    websocket.on('error', cb);
  }

  isConnected(): boolean {
    return websocket.isConnected();
  }

  getConnectionStatus(): ConnectionStatus {
    return websocket.getConnectionStatus();
  }

  get identity() {
    return { token: this.token, userId: this.userId };
  }
}

export const websocketClient = new WebSocketClient();

/** Hook for components that only need connection state. */
export function useWebSocket() {
  return {
    client: websocketClient,
    service: websocket,
    isConnected: websocket.isConnected(),
    connectionStatus: websocket.getConnectionStatus(),
  };
}
