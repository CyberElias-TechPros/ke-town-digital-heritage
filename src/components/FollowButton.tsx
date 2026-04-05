import { useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface FollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
  initialFollowersCount?: number;
  onUpdate?: (following: boolean, count: number) => void;
  size?: "sm" | "md" | "lg";
}

export default function FollowButton({ userId, initialFollowing = false, initialFollowersCount = 0, onUpdate, size = "md" }: FollowButtonProps) {
  const { user, token, isAuthenticated } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialFollowersCount);
  const [loading, setLoading] = useState(false);

  const isSelf = user?.id === userId;

  const handleFollow = async () => {
    if (!isAuthenticated || !token || isSelf || loading) return;
    
    setLoading(true);
    try {
      const result: any = await api.followUser(token, userId);
      setFollowing(result.following);
      const newCount = result.following ? count + 1 : count - 1;
      setCount(newCount);
      onUpdate?.(result.following, newCount);
    } catch (error) {
      console.error('Failed to follow user:', error);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base"
  };

  if (isSelf) return null;

  return (
    <button
      onClick={handleFollow}
      disabled={!isAuthenticated || isSelf || loading}
      className={`flex items-center gap-1.5 rounded-full font-medium transition-all ${
        following 
          ? "bg-gray-100 text-gray-700 border border-gray-200 hover:border-red-300 hover:text-red-600"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
      } ${sizeClasses[size]} ${!isAuthenticated || isSelf ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}