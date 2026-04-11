import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, ArrowLeft, MoreVertical, Phone, Video, Image, Smile, Paperclip, Check, CheckCheck } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";
import { formatDistanceToNow } from "date-fns";

interface Message {
  _id: string;
  sender: { _id: string; fullName: string; avatar: string };
  content: string;
  media?: { type: string; url: string }[];
  readAt?: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  participants: { _id: string; fullName: string; avatar: string; isOnline?: boolean }[];
  lastMessage?: { content: string; createdAt: string };
  unreadCount: number;
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (id && token) {
      loadConversation(id);
    }
  }, [isAuthenticated, id, token, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversation = async (conversationId: string) => {
    setLoading(true);
    try {
      const convData = await api.getConversation(token!, conversationId);
      setConversation(convData as Conversation);
      
      const msgData = await api.getMessages(token!, conversationId);
      setMessages(msgData as Message[]);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !token || !id || sending) return;
    
    setSending(true);
    try {
      await api.sendMessage(token, id, newMessage);
      setNewMessage("");
      loadConversation(id);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    // Socket.io typing indicator would go here
  };

  const getOtherParticipant = () => {
    return conversation?.participants?.find((p) => p._id !== user?.id);
  };

  const otherUser = getOtherParticipant();

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="min-h-screen pt-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col h-[calc(100vh-5rem)]"
        >
          {/* Chat Header */}
          <div className="sticky top-20 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/messages")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative">
                {otherUser?.avatar ? (
                  <img
                    src={otherUser.avatar}
                    alt={otherUser.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-ivory">
                    {otherUser?.fullName?.charAt(0) || "?"}
                  </div>
                )}
                {otherUser?.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {otherUser?.fullName || "Chat"}
                </h3>
                <p className="text-xs text-gray-500">
                  {otherUser?.isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-lg mb-2">No messages yet</p>
                <p className="text-sm">Send a message to start the conversation</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender._id === user?.id;
                return (
                  <motion.div
                    key={message._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? "bg-primary text-white rounded-br-sm"
                          : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm shadow-sm"
                      }`}
                    >
                      {message.media && message.media.length > 0 && (
                        <div className="mb-2">
                          {message.media.map((m, i) => (
                            <img
                              key={i}
                              src={m.url}
                              alt="attachment"
                              className="max-w-full rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                          isOwn ? "text-white/70" : "text-gray-400"
                        }`}
                      >
                        <span>
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </span>
                        {isOwn && (
                          message.readAt ? (
                            <CheckCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-2 text-gray-500 hover:text-primary transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="p-2 text-gray-500 hover:text-primary transition-colors"
              >
                <Image className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Type a message..."
                className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                className="p-2 text-gray-500 hover:text-primary transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}