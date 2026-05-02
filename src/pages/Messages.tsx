import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Send, User, Search, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useWebSocket, useConversationWebSocket } from "@/hooks/useWebSocket";

const Messages = () => {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { isConnected, sendTyping, sendMessage, markAsRead, typingUsers } = useWebSocket();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Use WebSocket for selected conversation
  const { messages: wsMessages, typingIndicator } = useConversationWebSocket(selectedConversation?._id || '');

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
      const data = await api.getConversations(token);
      setConversations(data as any[]);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (!token) return;
    try {
      const data = await api.getMessages(token, conversationId);
      // Note: wsMessages is managed by WebSocket hook
      // This API call is for initial load only
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectConversation = (conv: any) => {
    setSelectedConversation(conv);
    loadMessages(conv._id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    setIsLoading(true);
    try {
      const messageData = {
        conversationId: selectedConversation._id,
        content: newMessage,
        media: [] // TODO: Add media upload
      };
      
      // Send via WebSocket for real-time delivery
      sendMessage(messageData);
      setNewMessage("");
      
      // Note: wsMessages is managed by WebSocket hook
      // No need to optimistically update local state
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTyping = () => {
    if (selectedConversation) {
      sendTyping(selectedConversation._id, true);
      
      // Clear typing indicator after 3 seconds
      setTimeout(() => {
        sendTyping(selectedConversation._id, false);
      }, 3000);
    }
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
                        <p>No conversations yet</p>
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
                              <p className="font-medium text-foreground truncate">
                                {otherUser(conv).fullName}
                              </p>
                              {otherUser(conv).isSeller && (
                                <span className="text-xs text-secondary">Seller</span>
                              )}
                            </div>
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
                              <p>{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

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
                    </div>
                  
                  {/* Typing Indicator */}
                  {typingIndicator && selectedConversation && typingUsers.get(selectedConversation._id) && (
                    <div className="px-4 py-2 bg-muted/50 border-t border-border">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                        <span className="text-sm text-muted-foreground">
                          Someone is typing...
                        </span>
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