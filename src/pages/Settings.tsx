import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Settings, User, Bell, Lock, Eye, Shield, MessageSquare, Users, LogOut, Save } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface SettingsData {
  profileVisibility: 'public' | 'followers' | 'private';
  allowMessages: boolean;
  showOnlineStatus: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  followNotifications: boolean;
  likeNotifications: boolean;
  commentNotifications: boolean;
  messageNotifications: boolean;
}

export default function SettingsPage() {
  const { user, token, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("privacy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [banner, setBanner] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);
  
  const showBanner = (type: "info" | "success" | "error", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
    if (type === "success") setSuccess(text);
    if (type === "error") setError(text);
  };
  
  const [settings, setSettings] = useState<SettingsData>({
    profileVisibility: user?.profileVisibility || 'public',
    allowMessages: user?.allowMessages !== undefined ? user.allowMessages : true,
    showOnlineStatus: user?.showOnlineStatus !== undefined ? user.showOnlineStatus : true,
    emailNotifications: true,
    pushNotifications: true,
    followNotifications: true,
    likeNotifications: true,
    commentNotifications: true,
    messageNotifications: true
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate, authLoading]);

  const handleSaveSettings = async () => {
    if (!token) return;
    
    setLoading(true);
    setBanner(null);
    
    try {
      await api.updateProfile(token, {
        profileVisibility: settings.profileVisibility,
        allowMessages: settings.allowMessages,
        showOnlineStatus: settings.showOnlineStatus
      });
      showBanner("success", "Settings saved successfully!");
    } catch (err: any) {
      showBanner("error", err.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    
    const confirmDelete = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (!confirmDelete) return;
    
    setLoading(true);
    setBanner(null);
    
    try {
      await api.deleteAccount(token);
      logout();
      navigate('/');
    } catch (err: any) {
      showBanner("error", err.message || "Failed to delete account");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChangePassword = async () => {
    if (!token) return;
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.updatePassword(token, passwordData.currentPassword, passwordData.newPassword);
      setSuccess("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  const tabs = [
    { id: "privacy", label: "Privacy", icon: Eye },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Lock },
    { id: "account", label: "Account", icon: Shield },
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
            <div className="flex items-center gap-3 mb-6">
              <Settings className="text-secondary" size={28} />
              <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
            </div>

            {/* Banner Messages */}
            {banner && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg p-4 mb-6 font-ui text-sm ${
                  banner.type === "error"
                    ? "bg-destructive/10 border border-destructive/20 text-destructive"
                    : banner.type === "success"
                    ? "bg-secondary/10 border border-secondary/20 text-secondary"
                    : "bg-blue-50 border border-blue-200 text-blue-700"
                }`}
              >
                {banner.text}
              </motion.div>
            )}

            <div className="grid lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)]">
                  <nav className="space-y-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                          activeTab === tab.id
                            ? "bg-secondary text-secondary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <tab.icon size={18} />
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Content */}
              <div className="lg:col-span-3">
                <div className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)]">
                  {activeTab === "privacy" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Profile Visibility</h3>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 p-4 bg-background rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                            <input
                              type="radio"
                              name="profileVisibility"
                              value="public"
                              checked={settings.profileVisibility === 'public'}
                              onChange={() => setSettings({ ...settings, profileVisibility: 'public' })}
                              className="w-4 h-4 text-secondary"
                            />
                            <div>
                              <p className="font-medium text-foreground">Public</p>
                              <p className="text-sm text-muted-foreground">Everyone can see your profile</p>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-4 bg-background rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                            <input
                              type="radio"
                              name="profileVisibility"
                              value="followers"
                              checked={settings.profileVisibility === 'followers'}
                              onChange={() => setSettings({ ...settings, profileVisibility: 'followers' })}
                              className="w-4 h-4 text-secondary"
                            />
                            <div>
                              <p className="font-medium text-foreground">Followers Only</p>
                              <p className="text-sm text-muted-foreground">Only your followers can see your profile</p>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-4 bg-background rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                            <input
                              type="radio"
                              name="profileVisibility"
                              value="private"
                              checked={settings.profileVisibility === 'private'}
                              onChange={() => setSettings({ ...settings, profileVisibility: 'private' })}
                              className="w-4 h-4 text-secondary"
                            />
                            <div>
                              <p className="font-medium text-foreground">Private</p>
                              <p className="text-sm text-muted-foreground">Only you can see your profile</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="border-t border-border pt-6">
                        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Messaging</h3>
                        <div className="space-y-4">
                          <label className="flex items-center justify-between p-4 bg-background rounded-lg">
                            <div className="flex items-center gap-3">
                              <MessageSquare size={18} className="text-muted-foreground" />
                              <div>
                                <p className="font-medium text-foreground">Allow Messages</p>
                                <p className="text-sm text-muted-foreground">Let people send you messages</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.allowMessages}
                              onChange={(e) => setSettings({ ...settings, allowMessages: e.target.checked })}
                              className="w-5 h-5 rounded text-secondary"
                            />
                          </label>
                          <label className="flex items-center justify-between p-4 bg-background rounded-lg">
                            <div className="flex items-center gap-3">
                              <Users size={18} className="text-muted-foreground" />
                              <div>
                                <p className="font-medium text-foreground">Show Online Status</p>
                                <p className="text-sm text-muted-foreground">Let others see when you're online</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.showOnlineStatus}
                              onChange={(e) => setSettings({ ...settings, showOnlineStatus: e.target.checked })}
                              className="w-5 h-5 rounded text-secondary"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "notifications" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Notification Preferences</h3>
                        <div className="space-y-4">
                          <label className="flex items-center justify-between p-4 bg-background rounded-lg">
                            <div>
                              <p className="font-medium text-foreground">Follow Notifications</p>
                              <p className="text-sm text-muted-foreground">When someone follows you</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.followNotifications}
                              onChange={(e) => setSettings({ ...settings, followNotifications: e.target.checked })}
                              className="w-5 h-5 rounded text-secondary"
                            />
                          </label>
                          <label className="flex items-center justify-between p-4 bg-background rounded-lg">
                            <div>
                              <p className="font-medium text-foreground">Like Notifications</p>
                              <p className="text-sm text-muted-foreground">When someone likes your post</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.likeNotifications}
                              onChange={(e) => setSettings({ ...settings, likeNotifications: e.target.checked })}
                              className="w-5 h-5 rounded text-secondary"
                            />
                          </label>
                          <label className="flex items-center justify-between p-4 bg-background rounded-lg">
                            <div>
                              <p className="font-medium text-foreground">Comment Notifications</p>
                              <p className="text-sm text-muted-foreground">When someone comments on your post</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.commentNotifications}
                              onChange={(e) => setSettings({ ...settings, commentNotifications: e.target.checked })}
                              className="w-5 h-5 rounded text-secondary"
                            />
                          </label>
                          <label className="flex items-center justify-between p-4 bg-background rounded-lg">
                            <div>
                              <p className="font-medium text-foreground">Message Notifications</p>
                              <p className="text-sm text-muted-foreground">When you receive a new message</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.messageNotifications}
                              onChange={(e) => setSettings({ ...settings, messageNotifications: e.target.checked })}
                              className="w-5 h-5 rounded text-secondary"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "security" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Change Password</h3>
                        <div className="space-y-4 max-w-md">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Current Password</label>
                            <input
                              type="password"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                              placeholder="Enter current password"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
                            <input
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                              placeholder="Enter new password"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Confirm New Password</label>
                            <input
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                              placeholder="Confirm new password"
                            />
                          </div>
                          <button
                            onClick={handleChangePassword}
                            disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui text-sm hover:bg-secondary/90 transition-all disabled:opacity-50"
                          >
                            {loading ? "Updating..." : "Update Password"}
                          </button>
                        </div>
                      </div>
                      
                       <div className="border-t border-border pt-6">
                         <h3 className="font-display text-lg font-semibold text-foreground mb-4">Two-Factor Authentication</h3>
                         <p className="text-muted-foreground mb-4">Add an extra layer of security to your account.</p>
                         <button onClick={() => showBanner("info", "Two-factor authentication coming soon! Contact support for enhanced security.")} className="px-4 py-2 border border-secondary text-secondary rounded-lg font-ui text-sm hover:bg-secondary/10 transition-all">
                           Enable 2FA
                         </button>
                       </div>
                    </div>
                  )}

                  {activeTab === "account" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Account Actions</h3>
                        <div className="space-y-4">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                          >
                            <LogOut size={18} />
                            Log Out
                          </button>
                        </div>
                      </div>
                      
                      <div className="border-t border-border pt-6">
                        <h3 className="font-display text-lg font-semibold text-foreground mb-4 text-destructive">Danger Zone</h3>
                        <p className="text-muted-foreground mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                        <button 
                          onClick={handleDeleteAccount}
                          disabled={loading}
                          className="px-4 py-2 border border-destructive text-destructive rounded-lg font-ui text-sm hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          {loading ? "Deleting..." : "Delete Account"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end mt-8 pt-6 border-t border-border">
                    <button
                      onClick={handleSaveSettings}
                      disabled={loading}
                      className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold hover:bg-secondary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}