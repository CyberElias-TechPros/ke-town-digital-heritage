import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Send, User, Search, ArrowLeft, Check, CheckCheck } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useWebSocket, useConversationWebSocket } from "@/hooks/useWebSocket";

const Messages = () => {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { isConnected, sendTyping, typingUsers } = useWebSocket();

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // History load + live delivery + optimistic send all live in this hook.
  const {
    messages: wsMessages,
    typingIndicator,
    isLoading: messagesLoading,
    error: messagesError,
    sendMessage,
    markAsRead,
  } = useConversationWebSocket(selectedConversation?._id || "");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
    } else if (token) {
      loadConversations();
    }
  }, [isAuthenticated, token, navigate, authLoading]);

  const loadConversations = async () => {
    if (!token) return;
    try {
      setConversationError(null);
      const data = await api.getConversations(token);
      setConversations(Array.isArray(data) ? (data as any[]) : []);
    } catch (err) {
      console.error(err);
      setConversationError("Could not load your conversations. Pull to retry.");
    }
  };

  // Opening a thread marks it read and scrolls to the newest message.
  useEffect(() => {
    if (!selectedConversation) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [wsMessages, selectedConversation]);

  useEffect(() => {
    if (!selectedConversation || !selectedConversation.unreadCount) return;
    void markAsRead();
    setConversations((prev) =>
      prev.map((c) => (c._id === selectedConversation._id ? { ...c, unreadCount: 0 } : c)),
    );
  }, [selectedConversation, markAsRead]);

  const handleSelectConversation = (conv: any) => {
    setSelectedConversation(conv);
  };

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!content || !selectedConversation) return;

    setIsLoading(true);
    try {
      await sendMessage(content);
      setNewMessage("");
      void loadConversations();
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message ?? "Message not sent. Please try again." });
      setTimeout(() => setBanner(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTyping = () => {
    if (!selectedConversation) return;
    sendTyping(selectedConversation._id, true);
    setTimeout(() => sendTyping(selectedConversation._id, false), 3000);
  };

  if (!isAuthenticated) return null;

  const otherUser = (conv: any) => {
    return conv.participants?.find((p: any) => p._id !== user?.id) || {};
  };

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
            <div className="flex items-center gap-3 mb-6">
              <MessageCircle className="text-secondary" size={28} />
              <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[var(--shadow-card)]">
              <div className="grid md:grid-cols-3 min-h-[500px]">
                {/* Conversations List */}
                <div className={`border-r border-border ${selectedConversation ? 'hidden md:block' : ''}`}>
                  <div className="p-4 border-b border-border">
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search conversations..."
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[450px]">
                    {conversations.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <MessageCircle size={40} className="mx-auto mb-2 opacity-50" />
                        <p className="font-medium">No conversations yet</p>
                        <p className="text-xs mt-1">
                          Open any profile and press <span className="text-secondary">Message</span> to start one.
                        </p>
                        <button
                          onClick={() => navigate("/feed")}
                          className="mt-4 text-xs font-semibold text-secondary hover:underline"
                        >
                          Find people to message
                        </button>
                        {conversationError && <p className="text-xs mt-3 text-destructive">{conversationError}</p>}
                      </div>
                    ) : (
                      conversations.map((conv: any) => (
                        <button
                          key={conv._id}
                          onClick={() => handleSelectConversation(conv)}
                          className={`w-full p-4 text-left border-b border-border hover:bg-muted/50 transition-colors ${
                            selectedConversation?._id === conv._id ? 'bg-secondary/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center overflow-hidden">
                              {otherUser(conv).avatar ? (
                                <img src={otherUser(conv).avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User size={20} className="text-secondary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="font-medium text-foreground truncate">
                                  {otherUser(conv).fullName || "Conversation"}
                                </p>
                                {conv.lastMessage?.createdAt && (
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.lastMessage?.content ?? (conv.type === "group" ? "Group conversation" : "Say hello")}
                              </p>
                            </div>
                            {!!conv.unreadCount && conv.unreadCount > 0 && (
                              <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold flex items-center justify-center">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className={`md:col-span-2 ${!selectedConversation ? 'hidden md:block' : ''}`}>
                  {selectedConversation ? (
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-border flex items-center gap-3">
                        <button
                          onClick={() => setSelectedConversation(null)}
                          className="md:hidden"
                        >
                          <ArrowLeft size={20} />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center overflow-hidden">
                          {otherUser(selectedConversation).avatar ? (
                            <img src={otherUser(selectedConversation).avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className="text-secondary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {otherUser(selectedConversation).fullName}
                          </p>
                          {otherUser(selectedConversation).shopName && (
                            <p className="text-xs text-muted-foreground">
                              {otherUser(selectedConversation).shopName}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messagesLoading && (
                          <p className="text-center text-xs text-muted-foreground py-6">Loading conversation…</p>
                        )}
                        {messagesError && (
                          <p className="text-center text-xs text-destructive py-6">{messagesError}</p>
                        )}
                        {!messagesLoading && wsMessages.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-6">
                            No messages yet — say something.
                          </p>
                        )}
                        {wsMessages.map((msg: any) => (
                          <div
                            key={msg._id}
                            className={`flex ${msg.sender._id === user?.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] px-4 py-2 rounded-lg ${
                                msg.sender._id === user?.id
                                  ? 'bg-secondary text-secondary-foreground'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              <p className="break-words">{msg.content}</p>
                              {(msg.media ?? []).map((m: any, i: number) =>
                                m.type === "image" ? (
                                  <img key={i} src={m.url} alt="" className="mt-2 rounded-lg max-h-64 object-cover" />
                                ) : (
                                  <a key={i} href={m.url} target="_blank" rel="noreferrer" className="mt-2 block underline text-xs">
                                    Attachment
                                  </a>
                                ),
                              )}
                              <p className="text-[10px] opacity-70 mt-1 flex items-center justify-end gap-1">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {msg.sender._id === user?.id &&
                                  (msg.readAt || (msg.readBy ?? []).some((r: string) => r !== user?.id) ? (
                                    <CheckCheck size={12} />
                                  ) : (
                                    <Check size={12} />
                                  ))}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={bottomRef} />
                      </div>

                      {banner && (
                        <div
                          className={`px-4 py-2 text-sm border-t border-border ${
                            banner.type === "error" ? "text-destructive" : "text-secondary"
                          }`}
                        >
                          {banner.text}
                        </div>
                      )}

                      <div className="p-4 border-t border-border">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            onInput={handleTyping}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                          />
                          <button
                            onClick={handleSendMessage}
                            disabled={isLoading || !newMessage.trim()}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50"
                          >
                            <Send size={20} />
                          </button>
                        </div>
                      </div>
                      {/* Typing indicator — belongs inside the conversation pane */}
                      {typingIndicator && typingUsers.get(selectedConversation._id) && (
                        <div className="px-4 py-2 bg-muted/50 border-t border-border">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                            <span className="text-sm text-muted-foreground">Someone is typing…</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <MessageCircle size={48} className="mx-auto mb-4 text-muted-foreground" />
                        <p>Select a conversation to start messaging</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Messages;