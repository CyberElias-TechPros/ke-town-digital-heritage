import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Users, Image, Calendar, Settings, Loader2, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";
import { formatDistanceToNow } from "date-fns";

interface GroupPost {
  _id: string;
  content: string;
  author: { _id: string; fullName: string; avatar: string };
  reactions: { user: string; type: string }[];
  commentCount: number;
  createdAt: string;
}

interface GroupMember {
  _id: string;
  fullName: string;
  avatar: string;
  role: string;
}

interface GroupData {
  _id: string;
  name: string;
  description: string;
  coverImage?: string;
  category: string;
  privacy: string;
  memberCount: number;
  postCount: number;
  host: { _id: string; fullName: string; avatar: string };
  members: GroupMember[];
  posts: GroupPost[];
  isMember: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"discussion" | "members" | "media" | "events">("discussion");
  const [joining, setJoining] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    if (id) {
      loadGroup(id);
    }
  }, [id]);

  const loadGroup = async (groupId: string) => {
    setLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const data = await api.getGroup(groupId);
      setGroup(data as GroupData);
    } catch (err) {
      console.error("Failed to load group:", err);
      setActionError('Failed to load group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!token || !id) {
      navigate("/login");
      return;
    }

    setJoining(true);
    setActionError('');
    try {
      await api.joinGroup(token, id);
      setActionSuccess('Joined group successfully!');
      loadGroup(id);
    } catch (err) {
      setActionError('Failed to join group. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!token || !id) return;

    try {
      await api.leaveGroup(token, id);
      setActionSuccess('Left group successfully.');
      loadGroup(id);
    } catch (err) {
      setActionError('Failed to leave group. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: group?.name || 'KE Town Group',
          text: `Join ${group?.name} on KE Town`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setActionSuccess('Group link copied to clipboard!');
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setActionError('Failed to share group link.');
        setTimeout(() => setActionError(''), 5000);
      }
    }
  };

  const handleSettings = () => {
    if (group) {
      navigate(`/groups/${group._id}/settings`);
    }
  };

  const getPrivacyBadge = (privacy: string) => {
    switch (privacy) {
      case "public":
        return { label: "Public", color: "bg-green-100 text-green-700" };
      case "private":
        return { label: "Private", color: "bg-yellow-100 text-yellow-700" };
      case "secret":
        return { label: "Secret", color: "bg-red-100 text-red-700" };
      default:
        return { label: privacy, color: "bg-gray-100" };
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen pt-32 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="min-h-screen pt-32 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Group not found</h2>
            <button
              onClick={() => navigate("/groups")}
              className="text-primary hover:underline"
            >
              Browse groups
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const privacy = getPrivacyBadge(group.privacy);

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Banner */}
          {(actionError || actionSuccess) && (
            <div className={`px-4 py-3 flex items-center gap-2 text-sm ${
              actionError ? 'bg-red-50 border-b border-red-200 text-red-700' : 'bg-green-50 border-b border-green-200 text-green-700'
            }`}>
              {actionError && <AlertCircle size={16} />}
              <span>{actionError || actionSuccess}</span>
            </div>
          )}

          {/* Header */}
          <div className="sticky top-20 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/groups")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Share group"
              >
                <Share2 className="w-5 h-5" />
              </button>
              {group.isAdmin && (
                <button
                  onClick={handleSettings}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  aria-label="Group settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Cover Image */}
          {group.coverImage && (
            <div className="h-48 overflow-hidden">
              <img
                src={group.coverImage}
                alt={group.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {!group.coverImage && (
            <div className="h-32 bg-gradient-to-br from-primary to-secondary" />
          )}

          {/* Group Info */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{group.name}</h1>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${privacy.color}`}>
                    {privacy.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 capitalize">{group.category}</p>
              </div>

              {!group.isMember ? (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {joining ? "Joining..." : "Join Group"}
                </button>
              ) : (
                <button
                  onClick={handleLeave}
                  className="px-6 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
                >
                  Leave
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {group.memberCount} members
              </span>
              <span>{group.postCount} posts today</span>
            </div>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {group.description}
            </p>

            {/* Tabs */}
            {group.isMember && (
              <>
                <div className="flex gap-2 overflow-x-auto pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                  {[
                    { id: "discussion", label: "Discussion" },
                    { id: "members", label: "Members" },
                    { id: "media", label: "Media" },
                    { id: "events", label: "Events" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`px-4 py-2 whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? "text-primary border-b-2 border-primary"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {activeTab === "discussion" && (
                  <div className="space-y-4">
                    {group.posts && group.posts.length > 0 ? (
                      group.posts.map((post) => (
                        <motion.div
                          key={post._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm cursor-pointer"
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
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(post.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="line-clamp-2">{post.content}</p>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No posts yet</p>
                        <button
                          onClick={() => navigate(`/groups/${id}/create-post`)}
                          className="mt-2 text-primary hover:underline"
                        >
                          Create the first post
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "members" && (
                  <div className="grid grid-cols-2 gap-2">
                    {group.members ? (
                      group.members.map((member) => (
                        <div
                          key={member._id}
                          className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg"
                        >
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.fullName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-ivory">
                              {member.fullName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-sm">
                              {member.fullName}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {member.role || "Member"}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 col-span-2">
                        No members yet
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "media" && (
                  <div className="text-center py-8 text-gray-500">
                    <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No media shared</p>
                  </div>
                )}

                {activeTab === "events" && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No group events</p>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
