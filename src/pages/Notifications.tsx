import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, UserPlus, ShoppingBag, Calendar, Check, Trash2, RefreshCw } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Notification {
  _id: string;
  type: string;
  from?: { _id: string; fullName: string; avatar?: string };
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function Notifications() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadNotifications();
  }, [isAuthenticated, token, isLoading]);

  const loadNotifications = async () => {
    if (!token) return;
    try {
      const data = await api.getNotifications(token) as Notification[];
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!token) return;
    try {
      await api.markNotificationRead(token, notificationId);
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await api.markAllNotificationsRead(token);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart size={18} className="text-red-500" />;
      case 'comment':
        return <MessageCircle size={18} className="text-blue-500" />;
      case 'follow':
        return <UserPlus size={18} className="text-green-500" />;
      case 'order':
        return <ShoppingBag size={18} className="text-secondary" />;
      case 'event':
        return <Calendar size={18} className="text-purple-500" />;
      default:
        return <Bell size={18} className="text-muted-foreground" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Bell className="text-secondary" size={28} />
                <h1 className="font-display text-2xl font-bold text-foreground">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-secondary hover:underline flex items-center gap-1"
                >
                  <Check size={14} /> Mark all as read
                </button>
              )}
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-ui text-sm transition-all ${
                  filter === 'all'
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg font-ui text-sm transition-all ${
                  filter === 'unread'
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell size={64} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">No notifications</h2>
                <p className="text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification, i) => (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all cursor-pointer ${
                      !notification.read ? 'border-l-4 border-l-secondary' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        handleMarkAsRead(notification._id);
                      }
                      if (notification.link) {
                        navigate(notification.link);
                      }
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        {notification.from?.avatar ? (
                          <img src={notification.from.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          getNotificationIcon(notification.type)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground">
                          {notification.from ? (
                            <span className="font-semibold">{notification.from.fullName}</span>
                          ) : null}
                          {' '}{notification.message}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-secondary rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}