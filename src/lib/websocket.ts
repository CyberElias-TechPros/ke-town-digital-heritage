import { io, Socket } from 'socket.io-client';

export interface WebSocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  error: (error: Error) => void;
  
  // Message events
  new_message: (message: any) => void;
  message_read: (data: { messageId: string; userId: string }) => void;
  typing: (data: { userId: string; conversationId: string; isTyping: boolean }) => void;
  
  // Notification events
  notification: (notification: any) => void;
  notification_read: (notificationId: string) => void;
  
  // Social events
  post_update: (post: any) => void;
  new_reaction: (data: { postId: string; reaction: any; userId: string }) => void;
  comment_added: (comment: any) => void;
  follow_update: (data: { followerId: string; followingId: string; type: 'follow' | 'unfollow' }) => void;
  
  // Marketplace events
  product_update: (product: any) => void;
  order_status_update: (order: any) => void;
  new_order: (order: any) => void;
  
  // Event events
  event_update: (event: any) => void;
  new_rsvp: (data: { eventId: string; userId: string }) => void;
  
  // Admin events
  user_online: (data: { userId: string; status: 'online' | 'away' | 'offline' }) => void;
  system_alert: (alert: any) => void;
}

export interface WebSocketMessage {
  _id: string;
  sender: {
    _id: string;
    fullName: string;
    avatar: string;
  };
  content: string;
  media?: { type: string; url: string }[];
  conversationId: string;
  createdAt: string;
  readAt?: string;
}

export interface TypingIndicator {
  userId: string;
  isTyping: boolean;
  typingUsers: string[];
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    const token = localStorage.getItem('keKingdom_token');
    if (!token) return;

    this.socket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('disconnect');
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('error', error);
      this.handleReconnect();
    });

    // Message events
    this.socket.on('new_message', (message) => {
      this.emit('new_message', message);
    });

    this.socket.on('message_read', (data) => {
      this.emit('message_read', data);
    });

    this.socket.on('typing', (data) => {
      this.emit('typing', data);
    });

    // Notification events
    this.socket.on('notification', (notification) => {
      this.emit('notification', notification);
      this.showBrowserNotification(notification);
    });

    this.socket.on('notification_read', (notificationId) => {
      this.emit('notification_read', notificationId);
    });

    // Social events
    this.socket.on('post_update', (post) => {
      this.emit('post_update', post);
    });

    this.socket.on('new_reaction', (data) => {
      this.emit('new_reaction', data);
    });

    this.socket.on('comment_added', (comment) => {
      this.emit('comment_added', comment);
    });

    this.socket.on('follow_update', (data) => {
      this.emit('follow_update', data);
    });

    // Marketplace events
    this.socket.on('product_update', (product) => {
      this.emit('product_update', product);
    });

    this.socket.on('order_status_update', (order) => {
      this.emit('order_status_update', order);
    });

    this.socket.on('new_order', (order) => {
      this.emit('new_order', order);
    });

    // Event updates
    this.socket.on('event_update', (event) => {
      this.emit('event_update', event);
    });

    this.socket.on('new_rsvp', (data) => {
      this.emit('new_rsvp', data);
    });

    // Admin events
    this.socket.on('user_online', (data) => {
      this.emit('user_online', data);
    });

    this.socket.on('system_alert', (alert) => {
      this.emit('system_alert', alert);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.reconnectDelay *= 2; // Exponential backoff
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        this.initializeSocket();
      }, this.reconnectDelay);
    }
  }

  private showBrowserNotification(notification: any) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico',
        tag: notification.id,
        data: notification,
      });
    }
  }

  // Public API methods
  public connect(): void {
    this.initializeSocket();
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public emit(event: keyof WebSocketEvents, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        if (data !== undefined) {
          listener(data);
        } else {
          listener();
        }
      });
    }
  }

  public on<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  public off<K extends keyof WebSocketEvents>(event: K, listener?: WebSocketEvents[K]): void {
    if (!this.listeners.has(event)) return;

    if (listener) {
      const eventListeners = this.listeners.get(event)!;
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  // Send methods
  public sendMessage(data: { conversationId: string; content: string; media?: any[] }): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_message', data);
    }
  }

  public markAsRead(data: { messageId: string; conversationId: string }): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark_as_read', data);
    }
  }

  public sendTyping(data: { conversationId: string; isTyping: boolean }): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing', data);
    }
  }

  public markNotificationRead(notificationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark_notification_read', notificationId);
    }
  }

  public joinRoom(room: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_room', room);
    }
  }

  public leaveRoom(room: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_room', room);
    }
  }

  public getConnectionStatus(): boolean {
    return this.socket?.connected || false;
  }

  public requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

// Singleton instance
export const websocket = new WebSocketService();
export default websocket;

export interface OnlineUser {
  userId: string;
  user: {
    id: string;
    fullName: string;
    avatar?: string;
    isOnline: boolean;
  };
}

export class WebSocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;
  private user: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Handle page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.disconnect();
        } else if (this.token && this.user) {
          this.connect(this.token, this.user);
        }
      });
    }

    // Handle page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
    }
  }

  connect(token: string, user: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.token = token;
      this.user = user;

      const serverUrl = import.meta.env.VITE_WS_URL || 
        (import.meta.env.MODE === 'production' 
          ? 'wss://ke-town-digital-heritage-production.up.railway.app'
          : 'ws://localhost:5000');

      this.socket = io(serverUrl, {
        auth: {
          token,
          userId: user.id
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Authenticate with the server
        this.socket?.emit('authenticate', { token, userId: user.id });
      });

      this.socket.on('authenticated', () => {
        console.log('WebSocket authenticated');
        resolve();
      });

      this.socket.on('authenticationError', (error) => {
        console.error('WebSocket authentication failed:', error);
        reject(new Error(error.message));
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect
          this.disconnect();
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
        this.socket?.emit('authenticate', { token, userId: user.id });
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('WebSocket reconnection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.disconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
    this.user = null;
  }

  // Conversation methods
  joinConversation(conversationId: string) {
    this.socket?.emit('joinConversation', conversationId);
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('leaveConversation', conversationId);
  }

  sendMessage(conversationId: string, content: string, media?: { type: string; url: string }[]) {
    this.socket?.emit('sendMessage', {
      conversationId,
      content,
      media
    });
  }

  markAsRead(conversationId: string, messageIds: string[]) {
    this.socket?.emit('markAsRead', { conversationId, messageIds });
  }

  // Typing indicators
  sendTyping(conversationId: string, isTyping: boolean) {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  // User status
  updateStatus(status: string) {
    this.socket?.emit('updateStatus', { status });
  }

  // Event listeners
  onNewMessage(callback: (message: WebSocketMessage) => void) {
    this.socket?.on('newMessage', callback);
  }

  onUserTyping(callback: (typing: TypingIndicator) => void) {
    this.socket?.on('userTyping', callback);
  }

  onMessagesRead(callback: (data: { conversationId: string; messageIds: string[]; readBy: string }) => void) {
    this.socket?.on('messagesRead', callback);
  }

  onUserOnline(callback: (user: OnlineUser) => void) {
    this.socket?.on('userOnline', callback);
  }

  onUserOffline(callback: (data: { userId: string; lastSeen: string }) => void) {
    this.socket?.on('userOffline', callback);
  }

  onOnlineUsers(callback: (users: OnlineUser[]) => void) {
    this.socket?.on('onlineUsers', callback);
  }

  onUserStatusChanged(callback: (data: { userId: string; status: string; lastSeen: string }) => void) {
    this.socket?.on('userStatusChanged', callback);
  }

  onNewMessageNotification(callback: (data: { conversationId: string; message: WebSocketMessage & { conversation: any } }) => void) {
    this.socket?.on('newMessageNotification', callback);
  }

  onJoinedConversation(callback: (data: { conversationId: string }) => void) {
    this.socket?.on('joinedConversation', callback);
  }

  onLeftConversation(callback: (data: { conversationId: string }) => void) {
    this.socket?.on('leftConversation', callback);
  }

  onError(callback: (error: { message: string }) => void) {
    this.socket?.on('error', callback);
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    return 'connecting';
  }
}

// Create singleton instance
export const websocketClient = new WebSocketClient();

// Hook for React components
export function useWebSocket() {
  return {
    client: websocketClient,
    isConnected: websocketClient.isConnected(),
    connectionStatus: websocketClient.getConnectionStatus()
  };
}
