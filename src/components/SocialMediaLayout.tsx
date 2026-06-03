import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  Home, Compass, Bell, MessageCircle, Users, Calendar, ShoppingBag, 
  Search, Settings, LogOut, Plus, Image, Video, Bookmark, Shield, ShoppingCart, Star, X, Globe, CalendarDays
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface SocialSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadMessages: number;
  unreadNotifications: number;
}

const navItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: "easeOut"
    }
  })
};

const SocialSidebar = ({ activeTab, onTabChange, unreadMessages, unreadNotifications }: SocialSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isHovered, setIsHovered] = useState<string | null>(null);

  const mainNavItems = [
    { id: "feed", icon: Home, label: "Feed", path: "/feed" },
    { id: "explore", icon: Compass, label: "Explore", path: "/explore" },
    { id: "notifications", icon: Bell, label: "Notifications", path: "/notifications", badge: unreadNotifications },
    { id: "messages", icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadMessages },
    { id: "groups", icon: Users, label: "Groups", path: "/groups" },
    { id: "events", icon: Calendar, label: "Events", path: "/events" },
    { id: "marketplace", icon: ShoppingBag, label: "Marketplace", path: "/marketplace" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.div 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-20 lg:w-72 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 overflow-y-auto hidden md:flex flex-col"
    >
      {/* User Profile Quick Access */}
      <motion.div 
        className="p-4 border-b border-gray-100 dark:border-gray-800"
        whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
      >
        <Link to="/profile" className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group">
          <motion.div 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.fullName} className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary transition-all" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg ring-2 ring-transparent group-hover:ring-primary transition-all">
                {user?.fullName?.charAt(0) || "U"}
              </div>
            )}
          </motion.div>
          <div className="hidden lg:block flex-1 min-w-0">
            <p className="font-semibold truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-500">View profile</p>
          </div>
        </Link>
      </motion.div>

      {/* Quick Stats */}
      <motion.div 
        className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 hidden lg:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-400" />
            <span className="text-gray-500">{user?.followers?.length || 0}</span>
            <span className="text-gray-400">followers</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-gray-400" />
            <span className="text-gray-500">{user?.following?.length || 0}</span>
            <span className="text-gray-400">following</span>
          </div>
        </div>
      </motion.div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {mainNavItems.map((item, i) => (
          <motion.div
            key={item.id}
            variants={navItemVariants}
            initial="hidden"
            animate="visible"
            custom={i}
          >
            <Link
              to={item.path}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
                isActive(item.path)
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-[1.02]"
              }`}
            >
              {isActive(item.path) && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                />
              )}
              <div className="relative z-10">
                <item.icon className="w-5 h-5" />
                {item.badge && item.badge > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </motion.span>
                )}
              </div>
              <span className="hidden lg:block font-medium">{item.label}</span>
            </Link>
          </motion.div>
        ))}

        <div className="border-t border-gray-200 dark:border-gray-700 my-3" />

        {/* Quick Actions */}
        <motion.p 
          className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:block mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Quick Access
        </motion.p>
        
        <motion.div variants={navItemVariants} initial="hidden" animate="visible" custom={7}>
          <Link
            to="/search"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-[1.02]"
          >
            <Search className="w-5 h-5" />
            <span className="hidden lg:block font-medium">Search</span>
          </Link>
        </motion.div>
        
        <motion.div variants={navItemVariants} initial="hidden" animate="visible" custom={8}>
          <Link
            to="/saved"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02] ${
              isActive("/saved")
                ? "bg-primary/10 text-primary"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Bookmark className="w-5 h-5" />
            <span className="hidden lg:block font-medium">Saved</span>
          </Link>
        </motion.div>

        <motion.div variants={navItemVariants} initial="hidden" animate="visible" custom={9}>
          <Link
            to="/cart"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-[1.02]"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden lg:block font-medium">Cart</span>
          </Link>
        </motion.div>

        {user?.role === "admin" && (
          <motion.div variants={navItemVariants} initial="hidden" animate="visible" custom={10}>
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-[1.02]"
            >
              <Shield className="w-5 h-5" />
              <span className="hidden lg:block font-medium">Admin</span>
            </Link>
          </motion.div>
        )}
      </nav>

      {/* User Settings */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          <Settings className="w-5 h-5" />
          <span className="hidden lg:block font-medium">Settings</span>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden lg:block font-medium">Logout</span>
        </button>
      </div>
    </motion.div>
  );
};

// Quick Create floating button
const FloatingCreateButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-primary/90 transition-colors"
    >
      <Plus className="w-6 h-6" />
    </motion.button>
  );
};

// Create Post Modal
interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreatePostModal = ({ isOpen, onClose }: CreatePostModalProps) => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ text: string; type: "info" | "error" } | null>(null);

  const showToast = (text: string, type: "info" | "error" = "info") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePost = async () => {
    if (!content.trim() || !token) return;
    setPosting(true);
    try {
      await api.createPost(token, { content, visibility: "community" });
      setContent("");
      onClose();
      queryClient.invalidateQueries({ queryKey: ['/posts'] });
    } catch (err) {
      console.error("Failed to post:", err);
    } finally {
      setPosting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold">Create Post</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4">
            <div className="flex gap-3">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                  {user?.fullName?.charAt(0) || "U"}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">{user?.fullName}</p>
                <select className="text-xs text-gray-500 mt-1 bg-transparent">
                  <option>Community</option>
                  <option>Public</option>
                  <option>Friends</option>
                </select>
              </div>
            </div>
            
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening in the community?"
              className="w-full mt-4 p-3 bg-transparent border-none resize-none focus:outline-none text-lg"
              rows={5}
            />
            
            <div className="flex items-center gap-2 mt-4">
              <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                <Image className="w-5 h-5" />
              </button>
              <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                <Globe className="w-5 h-5" />
              </button>
              <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                <Calendar className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handlePost}
              disabled={!content.trim() || posting}
              className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Unified Social Media Layout
export default function SocialMediaLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState("feed");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    // Load unread counts
    const loadUnreadCounts = async () => {
      if (!token) return;
      try {
        const [msgCount, notifCount] = await Promise.all([
          api.getUnreadMessageCount(token).catch(() => 0),
          api.getUnreadNotificationCount(token).catch(() => 0),
        ]);
        setUnreadMessages(msgCount as number || 0);
        setUnreadNotifications(notifCount as number || 0);
      } catch (err) {
        console.error("Failed to load unread counts:", err);
      }
    };
    
    loadUnreadCounts();
  }, [isAuthenticated, token, navigate, isLoading]);

  // Determine active tab from current route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/feed")) setActiveTab("feed");
    else if (path.startsWith("/explore")) setActiveTab("explore");
    else if (path.startsWith("/notifications")) setActiveTab("notifications");
    else if (path.startsWith("/messages")) setActiveTab("messages");
    else if (path.startsWith("/groups")) setActiveTab("groups");
    else if (path.startsWith("/events")) setActiveTab("events");
    else if (path.startsWith("/marketplace")) setActiveTab("marketplace");
  }, [location.pathname]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar Navigation */}
      <SocialSidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar for Mobile */}
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between sticky top-0 z-40">
          <h1 className="font-bold text-lg capitalize">{activeTab}</h1>
          <button onClick={() => setShowCreateModal(true)} className="p-2 bg-primary text-white rounded-full">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Page Content - renders the current route */}
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 p-4 md:p-6"
        >
          <Outlet />
        </motion.main>
      </div>

      {/* Floating Create Button */}
      <FloatingCreateButton onClick={() => setShowCreateModal(true)} />

      {/* Create Post Modal */}
      <CreatePostModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
}