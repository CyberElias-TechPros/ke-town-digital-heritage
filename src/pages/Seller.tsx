import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Store, Package, DollarSign, Users, TrendingUp, Star, Plus, Loader2, Settings, MessageCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";

interface SellerStats {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalFollowers: number;
  rating: number;
}

interface RecentOrder {
  _id: string;
  buyer: { fullName: string };
  items: Array<{ product: { name: string }; quantity: number; price: number }>;
  total: number;
  status: string;
  createdAt: string;
}

export default function Seller() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadSellerData();
  }, [isAuthenticated, token, navigate, isLoading]);

  const loadSellerData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.getShop(token);
      if (data) {
        const shopData = data as { stats: SellerStats; recentOrders: RecentOrder[] };
        setStats(shopData.stats);
        setRecentOrders(shopData.recentOrders);
      }
    } catch (err) {
      console.error("Failed to load seller data:", err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "products", label: "Products", icon: Package },
    { id: "orders", label: "Orders", icon: DollarSign },
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(price);
  };

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-4xl mx-auto px-4 py-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Seller Dashboard</h1>
            </div>
            <button
              onClick={() => navigate("/marketplace/create")}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex gap-6">
              {/* Sidebar */}
              <div className="w-48 space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1">
                {activeTab === "dashboard" && (
                  <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-sm">Total Sales</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {stats?.totalSales
                            ? formatPrice(stats.totalSales)
                            : "₦0.00"}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Package className="w-4 h-4" />
                          <span className="text-sm">Orders</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {stats?.totalOrders || 0}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Store className="w-4 h-4" />
                          <span className="text-sm">Products</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {stats?.totalProducts || 0}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">Followers</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {stats?.totalFollowers || 0}
                        </p>
                      </div>
                    </div>

                    {/* Rating */}
                    {stats?.rating && (
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <Star className="w-5 h-5 text-yellow-500 fill-current" />
                        <span className="font-semibold">{stats.rating}</span>
                        <span className="text-gray-500">rating</span>
                      </div>
                    )}

                    {/* Recent Orders */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-semibold">Recent Orders</h2>
                      </div>
                      {recentOrders.length > 0 ? (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                          {recentOrders.slice(0, 5).map((order) => (
                            <div
                              key={order._id}
                              className="p-4 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium">
                                  {order.buyer.fullName}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {order.items.map((i) => i.product.name).join(", ")}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  {formatPrice(order.total)}
                                </p>
                                <p className="text-sm text-gray-500 capitalize">
                                  {order.status}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          No orders yet
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "products" && (
                  <div className="text-center py-12">
                    <Store className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h2 className="text-xl font-semibold mb-2">Products</h2>
                    <p className="text-gray-500 mb-4">
                      Manage your products
                    </p>
                    <button
                      onClick={() => navigate("/marketplace/create")}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Add Product
                    </button>
                  </div>
                )}

                {activeTab === "orders" && (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h2 className="text-xl font-semibold mb-2">Orders</h2>
                    <p className="text-gray-500">
                      View and manage your orders
                    </p>
                  </div>
                )}

                {activeTab === "messages" && (
                  <div className="text-center py-12">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h2 className="text-xl font-semibold mb-2">Messages</h2>
                    <p className="text-gray-500">
                      View messages from customers
                    </p>
                  </div>
                )}

                {activeTab === "settings" && (
                  <div className="text-center py-12">
                    <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h2 className="text-xl font-semibold mb-2">Settings</h2>
                    <p className="text-gray-500">
                      Manage your shop settings
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}