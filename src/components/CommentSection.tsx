import { useState, useEffect } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Comment {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
}

interface CommentSectionProps {
  targetType: "post" | "galleryItem";
  targetId: string;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentSection({ targetType, targetId, onCommentCountChange }: CommentSectionProps) {
  const { user, token, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [targetType, targetId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data: Comment[] = await api.getComments(targetType, targetId);
      setComments(data);
      onCommentCountChange?.(data.length);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const comment: Comment = await api.createComment(token, {
        content: newComment,
        targetType,
        targetId
      });
      setComments([...comments, comment]);
      setNewComment("");
      onCommentCountChange?.(comments.length + 1);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!token) return;
    
    try {
      await api.deleteComment(token, commentId);
      const updated = comments.filter(c => c._id !== commentId);
      setComments(updated);
      onCommentCountChange?.(updated.length);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-600">
        <MessageCircle size={18} />
        <span className="font-medium text-sm">Comments ({comments.length})</span>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading comments...</div>
      ) : comments.length > 0 ? (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment._id} className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary text-sm font-medium flex-shrink-0">
                {comment.user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-gray-900">{comment.user.fullName}</span>
                    <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 break-words">{comment.content}</p>
                </div>
                {user?.id === comment.user._id && (
                  <button
                    onClick={() => handleDelete(comment._id)}
                    className="text-xs text-gray-500 hover:text-red-600 mt-1 flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-sm">No comments yet. Be the first to comment!</div>
      )}

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-secondary"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      ) : (
        <div className="text-sm text-gray-500">Login to comment</div>
      )}
    </div>
  );
}