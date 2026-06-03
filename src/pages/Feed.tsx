import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { Image, Smile } from 'lucide-react';

interface Post {
  _id: string;
  content: string;
  media: { type: string; url: string }[];
  author: { _id: string; fullName: string; avatar: string; role: string };
  reactions: { user: string; type: string }[];
  commentCount: number;
  viewCount: number;
  isPinned: boolean;
  createdAt: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
  bio?: string;
}

export default function Feed() {
  const { user, token, isLoading } = useAuth() as { user: User | null; token: string | null; isLoading: boolean };
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      navigate('/login');
      return;
    }
    loadFeed();
  }, [token, navigate, isLoading]);

  const loadFeed = async () => {
    try {
      const data = await api.getFeed(token!);
      setPosts(data as Post[]);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !token) return;

    setPosting(true);
    try {
      const post = await api.createPost(token, {
        content: newPost,
        visibility: 'community'
      }) as Post;
      setPosts([post, ...posts]);
      setNewPost('');
    } catch (err) {
      console.error('Failed to post:', err);
    } finally {
      setPosting(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !token) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadError('');
    try {
      const uploaded = await api.uploadMultipleFiles(token, files);
      const urls = (uploaded as { urls: string[] }).urls;
      const post = await api.createPost(token, {
        content: newPost || 'Shared a photo',
        media: urls,
        visibility: 'community'
      }) as Post;
      setPosts([post, ...posts]);
      setNewPost('');
    } catch (err) {
      setUploadError('Failed to upload images. Please try again.');
      setTimeout(() => setUploadError(''), 5000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
      loadFeed();
    } catch (err) {
      console.error('Failed to react:', err);
    } finally {
      setActiveReaction(null);
    }
  };

  const getReactionCount = (post: Post, reactionType: string) => {
    return post.reactions.filter(r => r.type === reactionType).length;
  };

  const getUserReaction = (post: Post) => {
    const reaction = post.reactions.find(r => r.user === user?.id);
    return reaction?.type || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-secondary">KE Town</Link>
          <nav className="flex gap-4">
            <Link to="/feed" className="text-secondary font-medium">Feed</Link>
            <Link to="/marketplace" className="text-gray-600 hover:text-secondary">Market</Link>
            <Link to="/messages" className="text-gray-600 hover:text-secondary">Messages</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {uploadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {uploadError}
          </div>
        )}
        {/* Create Post */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-medium">
              {user.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <form onSubmit={handlePost} className="flex-1">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's happening in the community?"
                className="w-full resize-none border-0 focus:ring-0 text-gray-700 placeholder-gray-400"
                rows={3}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t">
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  <button type="button" onClick={triggerFileUpload} disabled={uploading} className="text-gray-400 hover:text-secondary disabled:opacity-50">
                    {uploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Image className="w-5 h-5" />
                    )}
                  </button>
                  <button type="button" className="text-gray-400 hover:text-secondary">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!newPost.trim() || posting}
                  className="px-4 py-1.5 bg-secondary text-white rounded-full font-medium disabled:opacity-50"
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500 mb-4">No posts yet. Be the first to share!</p>
            <Link to="/posts" className="text-secondary hover:underline">Go to Posts</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Author */}
                <div className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-medium flex-shrink-0">
                    {post.author.fullName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/profile/${post.author._id}`} className="font-semibold text-gray-900 hover:text-secondary">
                        {post.author.fullName}
                      </Link>
                      {post.author.role === 'admin' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Admin</span>
                      )}
                      <span className="text-gray-400 text-sm">• {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-3">
                  <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Media */}
                {post.media && post.media.length > 0 && (
                  <div className={`grid gap-1 ${post.media.length === 1 ? '' : 'grid-cols-2'}`}>
                    {post.media.map((media, idx) => (
                      <div key={idx} className="aspect-video bg-gray-100">
                        <img src={media.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Reactions */}
                <div className="px-4 py-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {['like', 'love', 'celebrate'].map((type) => (
                      <button
                        key={type}
                        onClick={() => handleReaction(post._id, type)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                          getUserReaction(post) === type ? 'bg-secondary/10 text-secondary' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <span>{type === 'like' ? '👍' : type === 'love' ? '❤️' : '🎉'}</span>
                        <span className="text-xs">{getReactionCount(post, type)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>{post.commentCount} comments</span>
                    <span>{post.viewCount} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}