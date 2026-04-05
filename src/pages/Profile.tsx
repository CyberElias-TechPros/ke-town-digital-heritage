import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  User, Mail, MapPin, Globe, Calendar, Edit, Camera, 
  Save, X, Check, Clock, FileText, MessageCircle
} from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

const Profile = () => {
  const { user, token, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    avatar: user?.avatar || ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await api.updateProfile(token, formData);
      updateUser(result.user);
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.updateProfile(token, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setSuccess("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

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
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center overflow-hidden">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt={formData.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-secondary" />
                  )}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {user?.fullName}
                  </h1>
                  <p className="text-sm text-muted-foreground font-ui">{user?.email}</p>
                  <span className="tag-ke bg-secondary/10 text-secondary text-xs mt-1 inline-block">
                    {user?.role || 'Member'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-ui text-sm transition-all ${
                  isEditing 
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                }`}
              >
                {isEditing ? <><X size={16} /> Cancel</> : <><Edit size={16} /> Edit Profile</>}
              </button>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 mb-6 font-ui text-sm"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary/10 border border-secondary/20 text-secondary rounded-lg p-4 mb-6 font-ui text-sm"
              >
                {success}
              </motion.div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { id: "profile", label: "Profile", icon: User },
                { id: "password", label: "Password", icon: Check },
                { id: "activity", label: "Activity", icon: Clock }
              ].map((tab) => (
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

            {/* Tab Content */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)]">
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-ui text-sm font-medium text-foreground mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg font-ui text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>
                    <div>
                      <label className="block font-ui text-sm font-medium text-foreground mb-2">
                        Location
                      </label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          placeholder="e.g., Lagos, Nigeria"
                          className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg font-ui text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-secondary"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-ui text-sm font-medium text-foreground mb-2">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      rows={4}
                      placeholder="Tell us about yourself..."
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg font-ui text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                    />
                  </div>

                  <div>
                    <label className="block font-ui text-sm font-medium text-foreground mb-2">
                      Avatar URL
                    </label>
                    <div className="relative">
                      <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        name="avatar"
                        value={formData.avatar}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg font-ui text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-ui text-sm hover:bg-muted/80 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isLoading}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui text-sm hover:bg-secondary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        Save Changes
                      </button>
                    </div>
                  )}

                  {/* Read-only info */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="font-display text-lg font-semibold text-foreground mb-4">Account Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <Mail size={18} className="text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground font-ui">Email</p>
                          <p className="text-sm text-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <Calendar size={18} className="text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground font-ui">Member Since</p>
                          <p className="text-sm text-foreground">
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "password" && (
                <div className="space-y-6 max-w-md">
                  <h3 className="font-display text-lg font-semibold text-foreground">Change Password</h3>
                  
                  <div>
                    <label className="block font-ui text-sm font-medium text-foreground mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg font-ui text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>

                  <div>
                    <label className="block font-ui text-sm font-medium text-foreground mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg font-ui text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>

                  <div>
                    <label className="block font-ui text-sm font-medium text-foreground mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg font-ui text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui text-sm hover:bg-secondary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Change Password
                  </button>
                </div>
              )}

              {activeTab === "activity" && (
                <div className="space-y-6">
                  <h3 className="font-display text-lg font-semibold text-foreground">Recent Activity</h3>
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-ui">No recent activity</p>
                    <p className="text-sm mt-2">Your actions will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Profile;