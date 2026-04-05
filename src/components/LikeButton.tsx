import { useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  onUpdate?: (liked: boolean, count: number) => void;
}

export default function LikeButton({ postId, initialLiked, initialCount, onUpdate }: LikeButtonProps) {
  const { token, isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (!isAuthenticated || !token || loading) return;
    
    setLoading(true);
    try {
      const result: any = await api.likePost(token, postId);
      setLiked(result.liked);
      setCount(result.likeCount);
      onUpdate?.(result.liked, result.likeCount);
    } catch (error) {
      console.error('Failed to like post:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={!isAuthenticated || loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
        liked 
          ? "bg-red-100 text-red-600" 
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      } ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <Heart size={18} className={liked ? "fill-current" : ""} />
      <span className="text-sm font-medium">{count}</span>
    </button>
  );
}