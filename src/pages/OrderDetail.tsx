import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Package, MapPin, Clock, DollarSign, Loader2, Check, Truck, X } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";
import { formatDistanceToNow, format } from "date-fns";

interface OrderDetail {
  _id: string;
  buyer: { _id: string; fullName: string; email: string };
  items: Array<{
    product: { _id: string; name: string; images: string[]; seller: { fullName: string } };
    quantity: number;
    price: number;
  }>;
  status: string;
  total: number;
  shipping: {
    address: { fullName: string; phone: string; address: string; city: string; state: string };
    method: string;
    fee: number;
    estimatedDelivery?: string;
  };
  payment: { method: string; status: string; reference?: string };
  timeline: Array<{ status: string; timestamp: string; note?: string }>;
  createdAt: string;
  updatedAt: string;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (id) {
      loadOrder(id);
    }
  }, [isAuthenticated, id, navigate, isLoading]);

  const loadOrder = async (orderId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.getOrder(token, orderId);
      setOrder(data as OrderDetail);
    } catch (err) {
      console.error("Failed to load order:", err);
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "processing": return "bg-blue-100 text-blue-700";
      case "shipped": return "bg-purple-100 text-purple-700";
      case "delivered": return "bg-green-100 text-green-700";
      case "completed": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-5 h-5 text-yellow-500" />;
      case "processing": return <Package className="w-5 h-5 text-blue-500" />;
      case "shipped": return <Truck className="w-5 h-5 text-purple-500" />;
      case "delivered": return <Check className="w-5 h-5 text-green-500" />;
      case "completed": return <Check className="w-5 h-5 text-green-500" />;
      case "cancelled": return <X className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen pt-32 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="min-h-screen pt-32 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Order not found</h2>
            <button onClick={() => navigate("/orders")} className="text-primary hover:underline">
              Back to orders
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => navigate("/orders")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Order #{order._id.slice(-8).toUpperCase()}</h1>
              <p className="text-gray-500">Placed {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</p>
            </div>
            <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="font-semibold mb-4">Order Progress</h2>
            <div className="flex items-center justify-between">
              {["pending", "processing", "shipped", "delivered"].map((step, index) => {
                const isCompleted = ["pending", "processing", "shipped", "delivered"].indexOf(order.status) >= index;
                return (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? "bg-primary text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}>
                      {getStatusIcon(step)}
                    </div>
                    <span className="text-xs mt-2 capitalize">{step}</span>
                  </div>
                );
              })}
            </div>
            {order.shipping.estimatedDelivery && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Estimated delivery: {format(new Date(order.shipping.estimatedDelivery), "MMMM d, yyyy")}
              </p>
            )}
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden mb-6 shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold">Items</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {order.items.map((item, index) => (
                <div key={index} className="p-4 flex gap-4">
                  {item.product.images && item.product.images[0] ? (
                    <img src={item.product.images[0]} alt={item.product.name} className="w-20 h-20 rounded-lg object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-500">Sold by {item.product.seller?.fullName}</p>
                    <p className="text-sm text-gray-500">{formatPrice(item.price)} x {item.quantity}</p>
                  </div>
                  <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Shipping */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </h2>
              <div className="text-sm space-y-1">
                <p className="font-medium">{order.shipping.address.fullName}</p>
                <p>{order.shipping.address.address}</p>
                <p>{order.shipping.address.city}, {order.shipping.address.state}</p>
                <p className="text-gray-500">{order.shipping.address.phone}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm">
                  <span className="text-gray-500">Method:</span> {order.shipping.method}
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">Shipping fee:</span> {formatPrice(order.shipping.fee)}
                </p>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment
              </h2>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-gray-500">Method:</span> {order.payment.method}
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">Status:</span> <span className={`capitalize ${order.payment.status === 'paid' ? 'text-green-600' : ''}`}>{order.payment.status}</span>
                </p>
                {order.payment.reference && (
                  <p className="text-sm">
                    <span className="text-gray-500">Reference:</span> {order.payment.reference}
                  </p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatPrice(order.total - order.shipping.fee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span>{formatPrice(order.shipping.fee)}</span>
                </div>
                <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}