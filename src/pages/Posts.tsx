import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Image, Send, MoreHorizontal, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, asList } from "@/lib/api";
import LikeButton from "@/components/LikeButton";
import CommentSection from "@/components/CommentSection";

interface Post {
  _id: string;
  author: {
    _id: string;
    fullName: string;
    avatar?: string;
    bio?: string;
  };
  content: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  likes?: string[];
}

export default function Posts() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "my">("feed");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [showCommentId, setShowCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadPosts();
    loadMyPosts();
  }, [isAuthenticated, isLoading]);

  const loadPosts = async () => {
    try {
      const data: Post[] = await api.getPosts();
      setPosts(asList(data));
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyPosts = async () => {
    if (!token) return;
    try {
      const data: Post[] = await api.getMyPosts(token);
      setMyPosts(asList(data));
    } catch (error) {
      console.error('Failed to load my posts:', error);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || (!newPost.trim() && !newImageUrl)) return;

    setSubmitting(true);
    try {
      const post = await api.createPost(token, {
        content: newPost,
        imageUrl: newImageUrl || undefined,
        isPublic: true
      });
      setPosts([post, ...posts]);
      setMyPosts([post, ...myPosts]);
      setNewPost("");
      setNewImageUrl("");
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploadingImage(true);
    try {
      const result: any = await api.uploadFile(token, file);
      setNewImageUrl(result.url);
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!token || !confirm("Are you sure you want to delete this post?")) return;

    try {
      await api.deletePost(token, postId);
      setPosts(posts.filter(p => p._id !== postId));
      setMyPosts(myPosts.filter(p => p._id !== postId));
    } catch (error) {
      console.error('Failed to delete post:', error);
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

  const isLiked = (post: Post) => post.likes?.includes(user?.id || "") || false;

  const displayPosts = activeTab === "feed" ? posts : myPosts;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="container-narrow max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-4">Community Posts</h1>
          
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab("feed")}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === "feed" 
                  ? "text-secondary border-b-2 border-secondary" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Community Feed
            </button>
            <button
              onClick={() => setActiveTab("my")}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === "my" 
                  ? "text-secondary border-b-2 border-secondary" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              My Posts
            </button>
          </div>

          <form onSubmit={handleSubmitPost} className="space-y-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-medium flex-shrink-0">
                {user?.fullName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's on your mind? Share your thoughts about our community..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-secondary"
                  rows={3}
                  maxLength={5000}
                />
                {newImageUrl && (
                  <div className="mt-2 relative inline-block">
                    <img src={newImageUrl} alt="Preview" className="max-h-40 rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setNewImageUrl("")}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-gray-600 hover:text-secondary cursor-pointer">
                <Image size={20} />
                <span className="text-sm">Add Image</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              <button
                type="submit"
                disabled={submitting || uploadingImage || (!newPost.trim() && !newImageUrl)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <Send size={18} />
                {submitting ? "Posting..." : "Post"}
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading posts...</div>
        ) : displayPosts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {activeTab === "feed" ? "No posts yet. Be the first to share!" : "You haven't created any posts yet."}
          </div>
        ) : (
          <div className="space-y-4">
            {displayPosts.map((post) => (
              <div key={post._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-3">
                  <Link to={`/profile/${post.author._id}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-medium">
                      {post.author.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{post.author.fullName}</span>
                      <div className="text-xs text-gray-500">{formatDate(post.createdAt)}</div>
                    </div>
                  </Link>
                  {user?.id === post.author._id && (
                    <button
                      onClick={() => handleDeletePost(post._id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <p className="text-gray-700 whitespace-pre-wrap mb-3">{post.content}</p>
                
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt="Post" 
                    className="w-full rounded-lg mb-4 max-h-96 object-cover" 
                  />
                )}

                <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                  <LikeButton
                    postId={post._id}
                    initialLiked={isLiked(post)}
                    initialCount={post.likeCount}
                    onUpdate={(liked, count) => {
                      post.likes = liked 
                        ? [...(post.likes || []), user?.id || ""]
                        : post.likes?.filter(id => id !== user?.id);
                      post.likeCount = count;
                    }}
                  />
                  <button
                    onClick={() => setShowCommentId(showCommentId === post._id ? null : post._id)}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-secondary"
                  >
                    <MessageCircle size={18} />
                    <span className="text-sm font-medium">{post.commentCount}</span>
                  </button>
                </div>

                {showCommentId === post._id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <CommentSection
                      targetType="post"
                      targetId={post._id}
                      onCommentCountChange={(count) => post.commentCount = count}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}