import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Users, Calendar, Newspaper, Image, MapPin, Mail, 
  TreePine, FolderKanban, Settings, LogOut, Check, X, 
  Eye, Trash2, Plus, Edit 
} from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface DashboardStats {
  totalEvents: number;
  totalNews: number;
  totalGallery: number;
  totalDirectory: number;
  totalContacts: number;
  totalEnvironment: number;
  totalProjects: number;
  totalUsers: number;
  pendingGallery: number;
  pendingDirectory: number;
  unreadContacts: number;
}

interface Event {
  _id: string;
  title: string;
  date: string;
  type: string;
}

interface NewsItem {
  _id: string;
  title: string;
  published: boolean;
  createdAt: string;
}

interface GalleryItem {
  _id: string;
  title: string;
  category: string;
  approved: boolean;
  imageUrl: string;
}

interface DirectoryMember {
  _id: string;
  fullName: string;
  city: string;
  country: string;
  approved: boolean;
}

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  subject: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const Admin = () => {
  const { user, token, isAuthenticated, isAdmin, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [directory, setDirectory] = useState<DirectoryMember[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) {
      navigate("/login");
      return;
    }
    loadDashboardData();
  }, [isAuthenticated, isAdmin, navigate, authLoading, token]);

  const loadDashboardData = async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError("");

    try {
      const [dashboardData, eventsData, newsData, galleryData, directoryData, contactsData] = await Promise.all([
        api.getAdminDashboard(token),
        api.getAdminEvents(token),
        api.getAdminNews(token),
        api.getAdminGallery(token),
        api.getAdminDirectory(token),
        api.getAdminContacts(token)
      ]);

      setStats(dashboardData.stats);
      setEvents(eventsData);
      setNews(newsData);
      setGallery(galleryData);
      setDirectory(directoryData);
      setContacts(contactsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveGallery = async (id: string) => {
    if (!token) return;
    try {
      await api.approveGalleryItem(token, id);
      setGallery(gallery.map(item => 
        item._id === id ? { ...item, approved: true } : item
      ));
      if (stats) {
        setStats({ ...stats, pendingGallery: stats.pendingGallery - 1 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve gallery item");
    }
  };

  const handleRejectGallery = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to reject and delete this gallery item?")) return;
    try {
      await api.deleteGalleryItem(token, id);
      setGallery(gallery.filter(item => item._id !== id));
      if (stats) {
        setStats({ ...stats, pendingGallery: stats.pendingGallery - 1 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject gallery item");
    }
  };

  const handleApproveDirectory = async (id: string) => {
    if (!token) return;
    try {
      await api.approveDirectoryMember(token, id);
      setDirectory(directory.map(member => 
        member._id === id ? { ...member, approved: true } : member
      ));
      if (stats) {
        setStats({ ...stats, pendingDirectory: stats.pendingDirectory - 1 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve directory member");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.deleteEvent(token, id);
      setEvents(events.filter(e => e._id !== id));
      if (stats) setStats({ ...stats, totalEvents: stats.totalEvents - 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this news item?")) return;
    try {
      await api.deleteNews(token, id);
      setNews(news.filter(n => n._id !== id));
      if (stats) setStats({ ...stats, totalNews: stats.totalNews - 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete news item");
    }
  };

  const handleMarkContactRead = async (id: string) => {
    if (!token) return;
    try {
      await api.markContactRead(token, id);
      setContacts(contacts.map(contact => 
        contact._id === id ? { ...contact, read: true } : contact
      ));
      if (stats) {
        setStats({ ...stats, unreadContacts: stats.unreadContacts - 1 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark contact as read");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Settings },
    { id: "events", label: "Events", icon: Calendar },
    { id: "news", label: "News", icon: Newspaper },
    { id: "gallery", label: "Gallery", icon: Image },
    { id: "directory", label: "Directory", icon: Users },
    { id: "contacts", label: "Contacts", icon: Mail },
    { id: "environment", label: "Environment", icon: TreePine },
    { id: "projects", label: "Projects", icon: FolderKanban },
  ];

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
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">
                  Admin Panel
                </span>
                <h1 className="font-display text-4xl font-bold text-primary-foreground mb-2">
                  Welcome, {user?.fullName}
                </h1>
                <p className="text-primary-foreground/70 font-body">
                  Manage KE Kingdom Digital Heritage content
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg font-ui text-sm hover:bg-destructive/20 transition-all"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 mb-6 font-ui text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 mb-8 pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full font-ui text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dashboard Content */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-muted-foreground font-ui">Loading dashboard...</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)]">
                {activeTab === "dashboard" && stats && (
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-6">Dashboard Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Events", value: stats.totalEvents, icon: Calendar, color: "bg-ke-gold/10 text-ke-gold" },
                        { label: "News", value: stats.totalNews, icon: Newspaper, color: "bg-ke-water/10 text-ke-water" },
                        { label: "Gallery", value: stats.totalGallery, icon: Image, color: "bg-ke-deep/10 text-ke-deep" },
                        { label: "Directory", value: stats.totalDirectory, icon: Users, color: "bg-secondary/10 text-secondary" },
                        { label: "Contacts", value: stats.totalContacts, icon: Mail, color: "bg-accent/10 text-accent" },
                        { label: "Environment", value: stats.totalEnvironment, icon: TreePine, color: "bg-destructive/10 text-destructive" },
                        { label: "Projects", value: stats.totalProjects, icon: FolderKanban, color: "bg-ke-gold/10 text-ke-gold" },
                        { label: "Users", value: stats.totalUsers, icon: Users, color: "bg-ke-water/10 text-ke-water" },
                      ].map((stat, i) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-background rounded-lg p-4 border border-border"
                        >
                          <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                            <stat.icon size={20} />
                          </div>
                          <div className="text-2xl font-display font-bold text-foreground">{stat.value}</div>
                          <div className="text-xs font-ui text-muted-foreground">{stat.label}</div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Pending Actions */}
                    <div className="mt-8">
                      <h3 className="font-display text-lg font-semibold text-foreground mb-4">Pending Actions</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        {stats.pendingGallery > 0 && (
                          <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/20">
                            <div className="text-2xl font-display font-bold text-secondary">{stats.pendingGallery}</div>
                            <div className="text-sm font-ui text-muted-foreground">Gallery items to approve</div>
                          </div>
                        )}
                        {stats.pendingDirectory > 0 && (
                          <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                            <div className="text-2xl font-display font-bold text-accent">{stats.pendingDirectory}</div>
                            <div className="text-sm font-ui text-muted-foreground">Directory members to approve</div>
                          </div>
                        )}
                        {stats.unreadContacts > 0 && (
                          <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/20">
                            <div className="text-2xl font-display font-bold text-destructive">{stats.unreadContacts}</div>
                            <div className="text-sm font-ui text-muted-foreground">Unread contact messages</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "events" && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="font-display text-2xl font-bold text-foreground">Events</h2>
                        <Link to="/events/create" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui text-sm hover:bg-secondary/90 transition-all">
                          <Plus size={16} />
                          Add Event
                        </Link>
                      </div>
                      <div className="space-y-4">
                        {events.map((event) => (
                          <div key={event._id} className="bg-background rounded-lg p-4 border border-border flex items-center justify-between">
                            <div>
                              <h3 className="font-display font-semibold text-foreground">{event.title}</h3>
                              <p className="text-sm text-muted-foreground font-ui">
                                {new Date(event.date).toLocaleDateString()} • {event.type}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => navigate(`/events/create`)} className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Edit event">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDeleteEvent(event._id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors" title="Delete event">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                )}

                {activeTab === "news" && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-display text-2xl font-bold text-foreground">News</h2>
                      <Link to="/news/create" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui text-sm hover:bg-secondary/90 transition-all">
                        <Plus size={16} />
                        Add News
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {news.map((item) => (
                        <div key={item._id} className="bg-background rounded-lg p-4 border border-border flex items-center justify-between">
                          <div>
                            <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
                            <p className="text-sm text-muted-foreground font-ui">
                              {new Date(item.createdAt).toLocaleDateString()} • {item.published ? "Published" : "Draft"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => navigate(`/news/create?id=${item._id}`)} className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Edit news">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDeleteNews(item._id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors" title="Delete news">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "gallery" && (
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-6">Gallery</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {gallery.map((item) => (
                        <div key={item._id} className="bg-background rounded-lg border border-border overflow-hidden">
                          <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover" />
                          <div className="p-4">
                            <h3 className="font-display font-semibold text-foreground mb-1">{item.title}</h3>
                            <p className="text-sm text-muted-foreground font-ui mb-3">{item.category}</p>
                            {!item.approved && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleApproveGallery(item._id)}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui text-sm hover:bg-secondary/90 transition-all"
                                >
                                  <Check size={14} />
                                  Approve
                                </button>
                              <button onClick={() => handleRejectGallery(item._id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors" title="Reject & delete">
                                <X size={16} />
                              </button>
                              </div>
                            )}
                            {item.approved && (
                              <span className="tag-ke bg-secondary/10 text-secondary">Approved</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "directory" && (
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-6">Directory</h2>
                    <div className="space-y-4">
                      {directory.map((member) => (
                        <div key={member._id} className="bg-background rounded-lg p-4 border border-border flex items-center justify-between">
                          <div>
                            <h3 className="font-display font-semibold text-foreground">{member.fullName}</h3>
                            <p className="text-sm text-muted-foreground font-ui">
                              {member.city}, {member.country}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!member.approved && (
                              <button
                                onClick={() => handleApproveDirectory(member._id)}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui text-sm hover:bg-secondary/90 transition-all"
                              >
                                <Check size={14} />
                                Approve
                              </button>
                            )}
                            {member.approved && (
                              <span className="tag-ke bg-secondary/10 text-secondary">Approved</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "contacts" && (
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-6">Contact Messages</h2>
                    <div className="space-y-4">
                      {contacts.map((contact) => (
                        <div key={contact._id} className={`bg-background rounded-lg p-4 border border-border ${!contact.read ? "border-l-4 border-l-secondary" : ""}`}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-display font-semibold text-foreground">{contact.subject}</h3>
                            <div className="flex items-center gap-2">
                              <span className="tag-ke bg-accent/10 text-accent">{contact.type}</span>
                              {!contact.read && (
                                <button
                                  onClick={() => handleMarkContactRead(contact._id)}
                                  className="p-2 text-muted-foreground hover:text-secondary transition-colors"
                                >
                                  <Eye size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground font-ui mb-2">
                            From: {contact.name} ({contact.email})
                          </p>
                          <p className="text-xs text-muted-foreground font-ui">
                            {new Date(contact.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "environment" && (
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-6">Environment Reports</h2>
                    <p className="text-muted-foreground font-body">Environment reports management coming soon...</p>
                  </div>
                )}

                {activeTab === "projects" && (
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-6">Projects</h2>
                    <p className="text-muted-foreground font-body">Projects management coming soon...</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Admin;
