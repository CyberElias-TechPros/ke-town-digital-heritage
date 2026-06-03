import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams, Link } from "react-router-dom";
import { 
  User, Mail, MapPin, Globe, Calendar, Edit, Camera, 
  Save, X, Check, Clock, FileText, MessageCircle, ShoppingBag,
  Store, Package, DollarSign, TrendingUp, Users, Settings, ArrowLeft
} from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

const Profile = () => {
  const { user: currentUser, token, isAuthenticated, isLoading: authLoading, updateUser } = useAuth();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [viewUser, setViewUser] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  
  const [formData, setFormData] = useState({
    fullName: currentUser?.fullName || "",
    bio: currentUser?.bio || "",
    location: currentUser?.location || "",
    avatar: currentUser?.avatar || ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [activeTab, setActiveTab] = useState("profile");
  const [shopData, setShopData] = useState<any>(null);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [mySales, setMySales] = useState<any[]>([]);
  const [shopForm, setShopForm] = useState({ shopName: "", shopDescription: "", shopBanner: "" });
  const [showBecomeSeller, setShowBecomeSeller] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate, authLoading]);

  useEffect(() => {
    if (username && username !== currentUser?.fullName?.toLowerCase().replace(/\s+/g, '-')) {
      loadOtherUserProfile();
    } else {
      setIsOwnProfile(true);
      setViewUser(null);
      setFormData({
        fullName: currentUser?.fullName || "",
        bio: currentUser?.bio || "",
        location: currentUser?.location || "",
        avatar: currentUser?.avatar || ""
      });
    }
  }, [username, currentUser]);

  const loadOtherUserProfile = async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const userData = await api.getUserProfile(username);
      setViewUser(userData.user || userData);
      setIsOwnProfile(false);
    } catch (err) {
      console.error("Failed to load user profile:", err);
      navigate("/feed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token && activeTab === "shop") {
      loadShopData();
    }
    if (token && activeTab === "orders") {
      loadOrderData();
    }
  }, [token, activeTab]);

  const loadShopData = async () => {
    if (!token) return;
    try {
      const profile = await api.getShopProfile(token);
      setShopData(profile);
      const products = await api.getMyProducts(token);
      setMyProducts(products as any[]);
      setShopForm({
        shopName: profile.shopName || "",
        shopDescription: profile.shopDescription || "",
        shopBanner: profile.shopBanner || ""
      });
    } catch (err) {
      console.error(err);
    }
  };

  const loadOrderData = async () => {
    if (!token) return;
    try {
      const orders = await api.getMyOrders(token);
      const sales = await api.getMySales(token);
      setMyOrders(orders as any[]);
      setMySales(sales as any[]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBecomeSeller = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await api.becomeSeller(token, shopForm.shopName, shopForm.shopDescription);
      updateUser({ ...user!, isSeller: true, shopName: shopForm.shopName });
      setShopData(result);
      setShowBecomeSeller(false);
      setSuccess("Congratulations! You are now a seller!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateShop = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await api.updateShop(token, shopForm);
      setShopData(result);
      setSuccess("Shop updated successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
                { id: "activity", label: "Activity", icon: Clock },
                { id: "shop", label: "My Shop", icon: Store },
                { id: "orders", label: "Orders", icon: ShoppingBag }
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

              {activeTab === "shop" && (
                <div className="space-y-6">
                  {!user?.isSeller && !showBecomeSeller && (
                    <div className="text-center py-8">
                      <Store size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-display text-lg font-semibold text-foreground mb-2">Become a Seller</h3>
                      <p className="text-muted-foreground mb-4">Start selling your products to the community</p>
                      <button
                        onClick={() => setShowBecomeSeller(true)}
                        className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui hover:bg-secondary/90 transition-all"
                      >
                        Open Your Shop
                      </button>
                    </div>
                  )}

                  {(user?.isSeller || showBecomeSeller) && (
                    <>
                      {showBecomeSeller && (
                        <div className="bg-muted/50 rounded-lg p-6 mb-6">
                          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Create Your Shop</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block font-ui text-sm font-medium text-foreground mb-2">Shop Name</label>
                              <input
                                type="text"
                                value={shopForm.shopName}
                                onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })}
                                className="w-full px-4 py-3 bg-background border border-border rounded-lg font-ui text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                                placeholder="Your Shop Name"
                              />
                            </div>
                            <div>
                              <label className="block font-ui text-sm font-medium text-foreground mb-2">Description</label>
                              <textarea
                                value={shopForm.shopDescription}
                                onChange={(e) => setShopForm({ ...shopForm, shopDescription: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-3 bg-background border border-border rounded-lg font-ui text-foreground focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                                placeholder="Tell customers about your shop..."
                              />
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={handleBecomeSeller}
                                disabled={isLoading || !shopForm.shopName}
                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui hover:bg-secondary/90 transition-all disabled:opacity-50"
                              >
                                {isLoading ? "Creating..." : "Create Shop"}
                              </button>
                              <button
                                onClick={() => setShowBecomeSeller(false)}
                                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-ui hover:bg-muted/80"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {shopData && user?.isSeller && (
                        <>
                          <div className="grid md:grid-cols-4 gap-4">
                            <div className="bg-secondary/10 rounded-lg p-4">
                              <div className="flex items-center gap-3">
                                <Store className="text-secondary" size={24} />
                                <div>
                                  <p className="text-sm text-muted-foreground">Shop Name</p>
                                  <p className="font-semibold text-foreground">{shopData.shopName}</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-secondary/10 rounded-lg p-4">
                              <div className="flex items-center gap-3">
                                <Package className="text-secondary" size={24} />
                                <div>
                                  <p className="text-sm text-muted-foreground">Products</p>
                                  <p className="font-semibold text-foreground">{myProducts.length}</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-secondary/10 rounded-lg p-4">
                              <div className="flex items-center gap-3">
                                <DollarSign className="text-secondary" size={24} />
                                <div>
                                  <p className="text-sm text-muted-foreground">Total Sales</p>
                                  <p className="font-semibold text-foreground">{shopData.totalSales || 0}</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-secondary/10 rounded-lg p-4">
                              <div className="flex items-center gap-3">
                                <TrendingUp className="text-secondary" size={24} />
                                <div>
                                  <p className="text-sm text-muted-foreground">Rating</p>
                                  <p className="font-semibold text-foreground">{shopData.sellerRating?.toFixed(1) || "New"}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-border pt-6">
                            <h4 className="font-display text-lg font-semibold text-foreground mb-4">Your Products</h4>
                            {myProducts.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <Package size={40} className="mx-auto mb-2 opacity-50" />
                                <p>No products yet</p>
                                <Link to="/marketplace" className="text-secondary hover:underline text-sm">Add your first product</Link>
                              </div>
                            ) : (
                              <div className="grid md:grid-cols-3 gap-4">
                                {myProducts.map((product: any) => (
                                  <div key={product._id} className="border border-border rounded-lg p-3">
                                    <div className="aspect-square bg-muted rounded-lg mb-2 overflow-hidden">
                                      {product.images?.[0] ? (
                                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                          <Package size={32} />
                                        </div>
                                      )}
                                    </div>
                                    <p className="font-medium text-foreground truncate">{product.name}</p>
                                    <p className="text-sm text-secondary">₦{product.price?.toLocaleString()}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "orders" && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground mb-4">My Purchases</h3>
                      {myOrders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <ShoppingBag size={40} className="mx-auto mb-2 opacity-50" />
                          <p>No orders yet</p>
                           <Link to="/marketplace" className="text-secondary hover:underline text-sm">Start shopping</Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {myOrders.map((order: any) => (
                            <div key={order._id} className="border border-border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm text-muted-foreground">Order #{order._id.slice(-8)}</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  order.status === 'delivered' ? 'bg-secondary/20 text-secondary' :
                                  order.status === 'cancelled' ? 'bg-destructive/20 text-destructive' :
                                  'bg-yellow-500/20 text-yellow-600'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                              <p className="font-medium text-foreground">{order.items?.length} item(s)</p>
                              <p className="text-sm text-secondary">₦{order.totalAmount?.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground mb-4">My Sales</h3>
                      {mySales.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <DollarSign size={40} className="mx-auto mb-2 opacity-50" />
                          <p>No sales yet</p>
                          {user?.isSeller && <p className="text-sm">Share your products to get sales</p>}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {mySales.map((sale: any) => (
                            <div key={sale._id} className="border border-border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm text-muted-foreground">Order #{sale._id.slice(-8)}</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  sale.status === 'delivered' ? 'bg-secondary/20 text-secondary' :
                                  sale.status === 'cancelled' ? 'bg-destructive/20 text-destructive' :
                                  'bg-yellow-500/20 text-yellow-600'
                                }`}>
                                  {sale.status}
                                </span>
                              </div>
                              <p className="font-medium text-foreground">{sale.items?.length} item(s) to {sale.buyer?.fullName}</p>
                              <p className="text-sm text-secondary">₦{sale.totalAmount?.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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