import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Plus, Settings, UserPlus, MessageCircle, Calendar, Image, Lock, Globe } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";

interface Group {
  _id: string;
  name: string;
  description: string;
  coverImage?: string;
  privacy: 'public' | 'private' | 'secret';
  category: string;
  creator: { _id: string; fullName: string; avatar?: string };
  memberCount: number;
  isMember?: boolean;
  joinMethod?: string;
}

const groupCategories = [
  { id: "all", label: "All Groups" },
  { id: "general", label: "General" },
  { id: "education", label: "Education" },
  { id: "business", label: "Business" },
  { id: "culture", label: "Culture" },
  { id: "sports", label: "Sports" },
  { id: "technology", label: "Technology" },
  { id: "health", label: "Health" },
  { id: "religion", label: "Religion" },
];

export default function Groups() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>(myGroups as Group[]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [myGroups, setMyGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadGroups();
    loadMyGroups();
  }, [isAuthenticated, selectedCategory, isLoading]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const category = selectedCategory === "all" ? undefined : selectedCategory;
      const data = await api.getGroups(category, searchQuery || undefined) as { groups: Group[] };
      setGroups(data.groups || []);
    } catch (err) {
      console.error("Failed to load groups:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyGroups = async () => {
    if (!token) return;
    try {
      const data = await api.getMyGroups(token) as Group[];
      setMyGroups(data);
    } catch (err) {
      console.error("Failed to load my groups:", err);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!token) return;
    try {
      const result = await api.joinGroup(token, groupId) as { status: string };
      if (result.status === 'joined' || result.status === 'pending') {
        loadGroups();
        loadMyGroups();
      }
    } catch (err) {
      console.error("Failed to join group:", err);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!token) return;
    try {
      await api.leaveGroup(token, groupId);
      loadGroups();
      loadMyGroups();
    } catch (err) {
      console.error("Failed to leave group:", err);
    }
  };

  const handleSearch = () => {
    loadGroups();
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'private':
      case 'secret':
        return <Lock size={14} className="text-muted-foreground" />;
      default:
        return <Globe size={14} className="text-muted-foreground" />;
    }
  };

  const allGroups = [...myGroups, ...groups.filter(g => !myGroups.some(mg => mg._id === g._id))];

  return (
    <Layout>
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="text-secondary" size={28} />
                <h1 className="font-display text-2xl font-bold text-foreground">Groups</h1>
              </div>
              {isAuthenticated && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all"
                >
                  <Plus size={16} /> Create Group
                </button>
              )}
            </div>

            {/* Search */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {groupCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg font-ui text-sm whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* My Groups */}
            {myGroups.length > 0 && (
              <div className="mb-8">
                <h2 className="font-display text-lg font-semibold text-foreground mb-4">My Groups</h2>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {myGroups.slice(0, 5).map((group) => (
                    <Link
                      key={group._id}
                      to={`/groups/${group._id}`}
                      className="flex-shrink-0 w-40"
                    >
                      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all">
                        <div className="h-20 bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center">
                          {group.coverImage ? (
                            <img src={group.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users size={32} className="text-secondary/30" />
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-medium text-foreground text-sm truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.memberCount} members</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* All Groups */}
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">Discover Groups</h2>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : allGroups.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allGroups.map((group, i) => (
                    <motion.div
                      key={group._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card rounded-xl border border-border overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all"
                    >
                      <div className="relative h-24 bg-gradient-to-br from-secondary/20 to-accent/20">
                        {group.coverImage ? (
                          <img src={group.coverImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users size={40} className="text-secondary/30" />
                          </div>
                        )}
                        <span className="absolute top-2 right-2 bg-card/90 px-2 py-1 rounded text-xs font-ui text-muted-foreground flex items-center gap-1">
                          {getPrivacyIcon(group.privacy)}
                          {group.privacy}
                        </span>
                      </div>
                      <div className="p-4">
                        <span className="text-xs font-ui text-muted-foreground bg-muted px-2 py-0.5 rounded mb-2 inline-block">
                          {group.category}
                        </span>
                        <h3 className="font-display text-base font-semibold text-foreground mb-1 line-clamp-1">{group.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{group.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{group.memberCount} members</span>
                          {group._id === myGroups.find(mg => mg._id === group._id)?._id ? (
                            <Link
                              to={`/groups/${group._id}`}
                              className="px-3 py-1.5 bg-secondary/10 text-secondary rounded-lg text-sm font-medium"
                            >
                              View
                            </Link>
                          ) : (
                            <button
                              onClick={() => handleJoinGroup(group._id)}
                              className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/90"
                            >
                              Join
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No groups found matching your criteria.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(group) => {
          setMyGroups([...myGroups, group]);
          setShowCreateModal(false);
        }}
      />
    </Layout>
  );
}

function CreateGroupModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: (group: Group) => void }) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<'public' | 'private' | 'secret'>('public');
  const [category, setCategory] = useState('general');
  const [joinMethod, setJoinMethod] = useState<'open' | 'approval'>('open');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !name.trim()) return;

    setLoading(true);
    try {
      const group = await api.createGroup(token, { name, description, privacy, category, joinMethod }) as Group;
      onCreated(group);
      setName("");
      setDescription("");
      setPrivacy('public');
      setCategory('general');
      setJoinMethod('open');
    } catch (err) {
      console.error("Failed to create group:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl border border-border max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="font-display text-xl font-bold text-foreground mb-4">Create Group</h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Group Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this group about?"
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="general">General</option>
                  <option value="education">Education</option>
                  <option value="business">Business</option>
                  <option value="culture">Culture</option>
                  <option value="sports">Sports</option>
                  <option value="technology">Technology</option>
                  <option value="health">Health</option>
                  <option value="religion">Religion</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Privacy</label>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as 'public' | 'private' | 'secret')}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="public">Public - Anyone can see and join</option>
                  <option value="private">Private - Only members can see</option>
                  <option value="secret">Secret - Only members can find</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Join Method</label>
                <select
                  value={joinMethod}
                  onChange={(e) => setJoinMethod(e.target.value as 'open' | 'approval')}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="open">Open - Anyone can join freely</option>
                  <option value="approval">Approval - Admin must approve</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}