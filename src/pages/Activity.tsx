import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, UserPlus, Image, Send, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, asList } from "@/lib/api";

interface Activity {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    avatar?: string;
  };
  type: "post" | "like" | "comment" | "follow" | "galleryUpload";
  targetId?: string;
  targetType?: string;
  description: string;
  createdAt: string;
}

export default function ActivityPage() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"following" | "global" | "me">("following");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadActivities();
  }, [isAuthenticated, activeTab, isLoading]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      let data: unknown;
      if (activeTab === "me") {
        if (!token) return;
        data = await api.getMyActivity(token);
      } else if (activeTab === "global") {
        data = await api.getGlobalActivity();
      } else {
        if (!token) return;
        data = await api.getFollowingActivity(token);
      }
      setActivities(asList<Activity>(data));
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "post":
        return <Send size={14} className="text-blue-500" />;
      case "like":
        return <Heart size={14} className="text-red-500" />;
      case "comment":
        return <MessageCircle size={14} className="text-green-500" />;
      case "follow":
        return <UserPlus size={14} className="text-purple-500" />;
      case "galleryUpload":
        return <Image size={14} className="text-orange-500" />;
      default:
        return <Activity size={14} className="text-gray-500" />;
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
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="container-narrow max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-4">Activity Feed</h1>
          
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("following")}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === "following" 
                  ? "text-secondary border-b-2 border-secondary" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Following
            </button>
            <button
              onClick={() => setActiveTab("global")}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === "global" 
                  ? "text-secondary border-b-2 border-secondary" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setActiveTab("me")}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === "me" 
                  ? "text-secondary border-b-2 border-secondary" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              My Activity
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {activeTab === "following" 
              ? "No activity from people you follow yet. Follow some users to see their activity!" 
              : activeTab === "global" 
                ? "No recent activity in the community."
                : "You haven't done anything yet. Create posts and interact with others!"}
          </div>
        ) : (
          <div className="space-y-3">
            {activities?.map((activity) => (
              <div key={activity?._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <Link to={`/profile/${activity?.user?._id}`}>
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-medium flex-shrink-0">
                      {activity?.user?.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/profile/${activity?.user?._id}`} className="font-semibold text-gray-900 hover:text-secondary">
                        {activity?.user?.fullName || 'Unknown User'}
                      </Link>
                      {getActivityIcon(activity?.type)}
                    </div>
                    <p className="text-gray-600 text-sm mt-0.5">{activity?.description}</p>
                    <p className="text-gray-400 text-xs mt-1">{formatDate(activity?.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}