import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Users, Calendar, Store, Hash, UserPlus, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";

interface TrendingPost {
  _id: string;
  content: string;
  author: { _id: string; fullName: string; avatar: string };
  likes: number;
  comments: number;
}

interface SuggestedUser {
  _id: string;
  fullName: string;
  avatar: string;
  bio?: string;
  followers: string[];
}

interface TrendingEvent {
  _id: string;
  name: string;
  date: string;
  location: string;
}

interface TrendingProduct {
  _id: string;
  name: string;
  price: number;
  images: string[];
}

export default function Explore() {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<TrendingEvent[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "people" | "posts" | "events" | "products">("all");
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    loadExploreData();
  }, []);

  const loadExploreData = async () => {
    setLoading(true);
    try {
      const [posts, users, events, products] = await Promise.all([
        api.getTrendingPosts().catch(() => []),
        api.getSuggestedUsers().catch(() => []),
        api.getTrendingEvents().catch(() => []),
        api.getTrendingProducts().catch(() => []),
      ]);
      
      setTrendingPosts(posts as TrendingPost[]);
      setSuggestedUsers(users as SuggestedUser[]);
      setTrendingEvents(events as TrendingEvent[]);
      setTrendingProducts(products as TrendingProduct[]);
    } catch (err) {
      console.error("Failed to load explore data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!token || !isAuthenticated) {
      navigate("/login");
      return;
    }
    setActionError('');
    try {
      await api.followUser(token, userId);
      setFollowingUsers([...followingUsers, userId]);
    } catch (err) {
      console.error("Failed to follow:", err);
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!token || !isAuthenticated) {
      navigate("/login");
      return;
    }
    setActionError('');
    try {
      await api.unfollowUser(token, userId);
      setFollowingUsers(followingUsers.filter(id => id !== userId));
    } catch (err) {
      console.error("Failed to unfollow:", err);
    }
  };

  const handleToggleFollow = (userId: string) => {
    if (followingUsers.includes(userId)) {
      handleUnfollow(userId);
    } else {
      handleFollow(userId);
    }
  };

  const tabs = [
    { id: "all", label: "All" },
    { id: "people", label: "People" },
    { id: "posts", label: "Posts" },
    { id: "events", label: "Events" },
    { id: "products", label: "Products" },
  ] as const;

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-4xl mx-auto px-4 py-8"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Explore</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* People to Follow */}
              {(activeTab === "all" || activeTab === "people") &&
                suggestedUsers.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    People You May Know
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {suggestedUsers.slice(0, 6).map((suggestedUser) => (
                      <motion.div
                        key={suggestedUser._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
                      >
                        <div className="flex flex-col items-center text-center">
                          {suggestedUser.avatar ? (
                            <img
                              src={suggestedUser.avatar}
                              alt={suggestedUser.fullName}
                              className="w-16 h-16 rounded-full object-cover mb-2"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-ivory text-xl mb-2">
                              {suggestedUser.fullName.charAt(0)}
                            </div>
                          )}
                          <h3 className="font-semibold truncate w-full">
                            {suggestedUser.fullName}
                          </h3>
                          <p className="text-sm text-gray-500 truncate w-full">
                            {suggestedUser.bio || "KE Town member"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {suggestedUser.followers?.length || 0} followers
                          </p>
                          <button
                            onClick={() => handleToggleFollow(suggestedUser._id)}
                            className={`mt-3 w-full py-1.5 rounded-full text-sm transition-colors flex items-center justify-center gap-1 ${
                              followingUsers.includes(suggestedUser._id)
                                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                : "bg-primary text-white hover:bg-primary/90"
                            }`}
                          >
                            <UserPlus className="w-4 h-4" />
                            {followingUsers.includes(suggestedUser._id) ? "Following" : "Follow"}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Trending Posts */}
              {(activeTab === "all" || activeTab === "posts") &&
                trendingPosts.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    Trending Posts
                  </h2>
                  <div className="space-y-4">
                    {trendingPosts.slice(0, 5).map((post) => (
                      <motion.div
                        key={post._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(`/posts/${post._id}`)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {post.author.avatar ? (
                            <img
                              src={post.author.avatar}
                              alt={post.author.fullName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-ivory text-sm">
                              {post.author.fullName.charAt(0)}
                            </div>
                          )}
                          <span className="font-semibold text-sm">
                            {post.author.fullName}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{post.likes} likes</span>
                          <span>{post.comments} comments</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Upcoming Events */}
              {(activeTab === "all" || activeTab === "events") &&
                trendingEvents.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Upcoming Events
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trendingEvents.slice(0, 4).map((event) => (
                      <motion.div
                        key={event._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm cursor-pointer"
                        onClick={() => navigate(`/events/${event._id}`)}
                      >
                        <div className="h-24 bg-gradient-to-br from-primary to-secondary" />
                        <div className="p-4">
                          <h3 className="font-semibold">{event.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(event.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">{event.location}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Popular Products */}
              {(activeTab === "all" || activeTab === "products") &&
                trendingProducts.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Trending Products
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {trendingProducts.slice(0, 8).map((product) => (
                      <motion.div
                        key={product._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm cursor-pointer"
                        onClick={() => navigate(`/product/${product._id}`)}
                      >
                        {product.images && product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full aspect-square object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <Store className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="font-semibold text-sm truncate">
                            {product.name}
                          </p>
                          <p className="text-primary font-bold">
                            ₦{product.price.toLocaleString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Empty States */}
              {!loading &&
                activeTab === "people" &&
                suggestedUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No suggested users</p>
                </div>
              )}

              {!loading &&
                activeTab === "posts" &&
                trendingPosts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Hash className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No trending posts</p>
                </div>
              )}

              {!loading &&
                activeTab === "events" &&
                trendingEvents.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming events</p>
                </div>
              )}

              {!loading &&
                activeTab === "products" &&
                trendingProducts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No trending products</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}