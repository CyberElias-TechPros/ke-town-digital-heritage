import { useEffect, useRef, useState, useCallback } from 'react';
import { websocket, WebSocketEvents } from '../lib/websocket';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface UseWebSocketReturn {
  isConnected: boolean;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  sendMessage: (data: { conversationId: string; content: string; media?: any[] }) => void;
  markAsRead: (data: { messageId: string; conversationId: string }) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  markNotificationRead: (notificationId: string) => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  onlineUsers: any[];
  notifications: any[];
  typingUsers: Map<string, string>;
}

export function useWebSocket(): UseWebSocketReturn {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Initialize WebSocket connection
  useEffect(() => {
    if (token) {
      setConnectionStatus('connecting');
      websocket.connect();
      
      // Request notification permission
      websocket.requestNotificationPermission();
    } else {
      websocket.disconnect();
      setConnectionStatus('disconnected');
    }
  }, [token]);

  // Setup event listeners
  useEffect(() => {
    // Connection events
    websocket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    websocket.on('disconnect', () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    websocket.on('error', () => {
      setConnectionStatus('reconnecting');
    });

    // Message events
    websocket.on('new_message', (message) => {
      // Handle new message - will be handled by individual components
      // This triggers global state updates
    });

    websocket.on('message_read', (data) => {
      // Handle message read receipt
    });

    websocket.on('typing', (data) => {
      // Keyed by conversation so a thread can show *who* is typing, and so two
      // open threads never clobber each other.
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.isTyping) {
          next.set(data.conversationId, data.userId);
        } else {
          next.delete(data.conversationId);
        }
        return next;
      });

      if (data.isTyping) {
        const key = data.conversationId;
        const existing = typingTimeouts.current.get(key);
        if (existing) clearTimeout(existing);
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        }, 3500);
        typingTimeouts.current.set(key, timeout);
      }
    });

    // Notification events
    websocket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    websocket.on('notification_read', (notificationId) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    });

    // Social events
    websocket.on('post_update', (post) => {
      // Handle post updates - will trigger feed refresh
    });

    websocket.on('new_reaction', (data) => {
      // Handle new reactions
    });

    websocket.on('comment_added', (comment) => {
      // Handle new comments
    });

    websocket.on('follow_update', (data) => {
      // Handle follow/unfollow events
    });

    // Marketplace events
    websocket.on('product_update', (product) => {
      // Handle product updates
    });

    websocket.on('order_status_update', (order) => {
      // Handle order status changes
    });

    websocket.on('new_order', (order) => {
      // Handle new orders
    });

    // Event updates
    websocket.on('event_update', (event) => {
      // Handle event updates
    });

    websocket.on('new_rsvp', (data) => {
      // Handle new RSVPs
    });

    // Admin events
    websocket.on('user_online', (data) => {
      setOnlineUsers(prev => {
        const existingIndex = prev.findIndex(u => u.userId === data.userId);
        if (existingIndex >= 0) {
          prev[existingIndex] = { ...prev[existingIndex], ...data };
        } else {
          return [...prev, { userId: data.userId, ...data }];
        }
        return prev;
      });
    });

    websocket.on('system_alert', (alert) => {
      // Handle system alerts
      console.warn('System Alert:', alert);
    });

    // Cleanup
    return () => {
      websocket.off('connect');
      websocket.off('disconnect');
      websocket.off('error');
      websocket.off('new_message');
      websocket.off('message_read');
      websocket.off('typing');
      websocket.off('notification');
      websocket.off('notification_read');
      websocket.off('post_update');
      websocket.off('new_reaction');
      websocket.off('comment_added');
      websocket.off('follow_update');
      websocket.off('product_update');
      websocket.off('order_status_update');
      websocket.off('new_order');
      websocket.off('event_update');
      websocket.off('new_rsvp');
      websocket.off('user_online');
      websocket.off('system_alert');
    };
  }, []);

  // Memoized callback functions
  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    websocket.sendTyping({ conversationId, isTyping });
  }, []);

  const sendMessage = useCallback((data: { conversationId: string; content: string; media?: any[] }) => {
    websocket.sendMessage(data);
  }, []);

  const markAsRead = useCallback((data: { messageId: string; conversationId: string }) => {
    websocket.markAsRead(data);
  }, []);

  const joinRoom = useCallback((room: string) => {
    websocket.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    websocket.leaveRoom(room);
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    websocket.markNotificationRead(notificationId);
  }, []);

  return {
    isConnected,
    sendTyping,
    sendMessage,
    markAsRead,
    joinRoom,
    leaveRoom,
    markNotificationRead,
    connectionStatus,
    onlineUsers,
    notifications,
    typingUsers,
  };
}

// Hook for a specific conversation: loads history over REST, then keeps it
// live over the Durable Object socket.
export function useConversationWebSocket(conversationId: string) {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing thread history whenever the selected conversation changes.
  useEffect(() => {
    let cancelled = false;
    if (!token || !conversationId) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    api.getMessages(token, conversationId)
      .then((data: any) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.messages ?? [];
        setMessages(list);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message ?? 'Could not load this conversation');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, conversationId]);

  // Subscribe to the hub room and apply live frames.
  useEffect(() => {
    if (!conversationId) return;
    websocket.joinRoom(`conversation:${conversationId}`);

    const handleNewMessage = (message: any) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
    };

    const handleMessageRead = (data: any) => {
      if (data.conversationId !== conversationId) return;
      const ids: string[] = data.messageIds ?? [];
      setMessages((prev) => prev.map((msg) => (ids.includes(msg._id) ? { ...msg, readAt: new Date().toISOString() } : msg)));
    };

    const handleTyping = (data: any) => {
      if (data.conversationId !== conversationId) return;
      // Never show our own typing back to us.
      setTypingIndicator(data.isTyping && data.userId !== user?.id);
    };

    websocket.on('new_message', handleNewMessage);
    websocket.on('message_read', handleMessageRead);
    websocket.on('typing', handleTyping);

    return () => {
      websocket.off('new_message', handleNewMessage);
      websocket.off('message_read', handleMessageRead);
      websocket.off('typing', handleTyping);
      websocket.leaveRoom(`conversation:${conversationId}`);
    };
  }, [conversationId, user?.id]);

  /** Send through REST, then reflect it immediately without waiting for the echo. */
  const sendMessage = useCallback(
    async (content: string, media?: { type: string; url: string }[]) => {
      if (!token || !conversationId || !content.trim()) return;
      const sent: any = await api.sendMessage(token, conversationId, content, media);
      setMessages((prev) => (prev.some((m) => m._id === sent._id) ? prev : [...prev, sent]));
      return sent;
    },
    [token, conversationId],
  );

  const markAsRead = useCallback(
    async (messageIds: string[] = []) => {
      if (!token || !conversationId) return;
      await api.markMessagesAsRead(token, conversationId, messageIds);
    },
    [token, conversationId],
  );

  return { messages, setMessages, typingIndicator, isLoading, error, sendMessage, markAsRead };
}

// Hook for real-time notifications
export function useNotificationsWebSocket() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleNotification = (notification: any) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleNotificationRead = (notificationId: string) => {
      setNotifications(prev => {
        const updated = prev.filter(n => n.id !== notificationId);
        setUnreadCount(updated.length);
        return updated;
      });
    };

    websocket.on('notification', handleNotification);
    websocket.on('notification_read', handleNotificationRead);

    return () => {
      websocket.off('notification', handleNotification);
      websocket.off('notification_read', handleNotificationRead);
    };
  }, []);

  const markAsRead = (notificationId: string) => {
    websocket.markNotificationRead(notificationId);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
  };
}

// Hook for real-time feed updates
export function useFeedWebSocket() {
  const [feedUpdates, setFeedUpdates] = useState<any[]>([]);

  useEffect(() => {
    const handlePostUpdate = (post: any) => {
      setFeedUpdates(prev => [post, ...prev]);
    };

    const handleNewReaction = (data: any) => {
      setFeedUpdates(prev => [...prev, { type: 'reaction', data }]);
    };

    const handleCommentAdded = (comment: any) => {
      setFeedUpdates(prev => [...prev, { type: 'comment', data: comment }]);
    };

    websocket.on('post_update', handlePostUpdate);
    websocket.on('new_reaction', handleNewReaction);
    websocket.on('comment_added', handleCommentAdded);

    return () => {
      websocket.off('post_update', handlePostUpdate);
      websocket.off('new_reaction', handleNewReaction);
      websocket.off('comment_added', handleCommentAdded);
    };
  }, []);

  const clearUpdates = () => {
    setFeedUpdates([]);
  };

  return {
    feedUpdates,
    clearUpdates,
  };
}
