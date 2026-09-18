import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, MessageCircle, Heart, Share2, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api, asList } from "../lib/api";
import { formatDistanceToNow } from "date-fns";

interface SavedPost {
  _id: string;
  post: {
    _id: string;
    content: string;
    media: { type: string; url: string }[];
    author: { _id: string; fullName: string; avatar: string };
    reactions: { user: string; type: string }[];
    commentCount: number;
    viewCount: number;
    createdAt: string;
  };
  savedAt: string;
}

export default function SavedPosts() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadSavedPosts();
  }, [isAuthenticated, token, navigate, isLoading]);

  const loadSavedPosts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.getSavedPosts(token);
      setSavedPosts(asList<SavedPost>(data));
    } catch (err) {
      console.error("Failed to load saved posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (postId: string) => {
    if (!token) return;
    try {
      await api.unsavePost(token, postId);
      setSavedPosts(savedPosts.filter(s => s.post._id !== postId));
      setBanner({ type: 'success', text: 'Post removed from saved' });
      setTimeout(() => setBanner(null), 3000);
    } catch (err) {
      setBanner({ type: 'error', text: 'Failed to remove saved post' });
      setTimeout(() => setBanner(null), 5000);
    }
  };

  const handleShare = async (postId: string) => {
    const url = `${window.location.origin}/posts/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this post',
          text: 'Shared from KE Town',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setBanner({ type: 'success', text: 'Link copied to clipboard' });
        setTimeout(() => setBanner(null), 3000);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setBanner({ type: 'error', text: 'Failed to share' });
        setTimeout(() => setBanner(null), 5000);
      }
    }
  };

  const handleMoreOptions = (postId: string) => {
    navigate(`/posts/${postId}`);
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    if (!token) return;
    
    setActiveReaction(reactionType);
    try {
      if (reactionType === activeReaction) {
        await api.removeReaction(token, postId);
      } else {
        await api.reactToPost(token, postId, reactionType);
      }
      loadSavedPosts();
    } catch (err) {
      console.error("Failed to react:", err);
    } finally {
      setActiveReaction(null);
    }
  };

  const getReactionCount = (reactions: { user: string; type: string }[], reactionType: string) => {
    return reactions.filter(r => r.type === reactionType).length;
  };

  const getUserReaction = (reactions: { user: string; type: string }[]) => {
    const reaction = reactions.find(r => r.user === user?.id);
    return reaction?.type || null;
  };

  const reactions = ["like", "love", "laugh", "wow", "sad", "angry", "celebrate", "support"];

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto px-4 py-8"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <Bookmark className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Saved Posts</h1>
          </div>

          {banner && (
            <div className={`rounded-lg p-3 mb-4 flex items-center gap-2 text-sm ${
              banner.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <span>{banner.text}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : savedPosts.length === 0 ? (
            <div className="text-center py-20">
              <Bookmark className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold mb-2">No saved posts</h2>
              <p className="text-gray-500 mb-6">
                Posts you save will appear here
              </p>
              <button
                onClick={() => navigate("/feed")}
                className="px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
              >
                Explore Posts
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {savedPosts.map(({ post, savedAt }) => (
                <motion.article
                  key={post._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
                >
                  {/* Author */}
                  <div className="flex items-center gap-3 p-4">
                    {post.author.avatar ? (
                      <img
                        src={post.author.avatar}
                        alt={post.author.fullName}
                        className="w-10 h-10 rounded-full object-cover cursor-pointer"
                        onClick={() => navigate(`/profile/${post.author._id}`)}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-ivory cursor-pointer"
                        onClick={() => navigate(`/profile/${post.author._id}`)}
                      >
                        {post.author.fullName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3
                        className="font-semibold cursor-pointer hover:underline"
                        onClick={() => navigate(`/profile/${post.author._id}`)}
                      >
                        {post.author.fullName}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMoreOptions(post._id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div
                    className="px-4 pb-2 cursor-pointer"
                    onClick={() => navigate(`/posts/${post._id}`)}
                  >
                    <p className="whitespace-pre-wrap">{post.content}</p>
                  </div>

                  {/* Media */}
                  {post.media && post.media.length > 0 && (
                    <div
                      className={`grid gap-1 ${
                        post.media.length === 1
                          ? "grid-cols-1"
                          : post.media.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-3"
                      }`}
                    >
                      {post.media.slice(0, 4).map((m, i) => (
                        <div
                          key={i}
                          className="aspect-square cursor-pointer overflow-hidden"
                          onClick={() => navigate(`/posts/${post._id}`)}
                        >
                          <img
                            src={m.url}
                            alt="post media"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reactions Preview */}
                  {post.reactions.length > 0 && (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      {post.reactions.length} reactions
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1">
                      {reactions.slice(0, 4).map((reaction) => (
                        <button
                          key={reaction}
                          onClick={() => handleReaction(post._id, reaction)}
                          className={`p-2 rounded-full transition-colors ${
                            getUserReaction(post.reactions) === reaction
                              ? "text-red-500 bg-red-50"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          <span className="text-lg">
                            {reaction === "like" && "👍"}
                            {reaction === "love" && "😍"}
                            {reaction === "laugh" && "😂"}
                            {reaction === "wow" && "😮"}
                            {reaction === "sad" && "😢"}
                            {reaction === "angry" && "😠"}
                            {reaction === "celebrate" && "🎉"}
                            {reaction === "support" && "💪"}
                          </span>
                        </button>
                      ))}
                      <button
                        onClick={() => navigate(`/posts/${post._id}`)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleShare(post._id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        aria-label="Share post"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleUnsave(post._id)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-full"
                    >
                      <Bookmark className="w-5 h-5 fill-current" />
                    </button>
                  </div>

                  {/* Saved At */}
                  <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700">
                    Saved {formatDistanceToNow(new Date(savedAt), { addSuffix: true })}
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}