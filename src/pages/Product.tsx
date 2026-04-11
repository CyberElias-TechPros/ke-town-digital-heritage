import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Share2, MessageCircle, Store, MapPin, Eye, Clock, Shield, Truck, ChevronLeft, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";
import { formatDistanceToNow } from "date-fns";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  condition: string;
  seller: {
    _id: string;
    fullName: string;
    avatar: string;
    isVerified: boolean;
    shopName?: string;
    totalSales?: number;
    sellerRating?: number;
    followers?: string[];
  };
  location: { name: string };
  views: number;
  likes: number;
  isNegotiable: boolean;
  stock: number;
  isFeatured: boolean;
  createdAt: string;
}

export default function Product() {
  const { id } = useParams<{ id: string }>();
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  const loadProduct = async (productId: string) => {
    setLoading(true);
    try {
      const data = await api.getProduct(productId);
      setProduct(data as Product);
    } catch (err) {
      console.error("Failed to load product:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!token || !id) return;
    try {
      if (isLiked) {
        await api.unlikeProduct(token, id);
      } else {
        await api.likeProduct(token, id);
      }
      setIsLiked(!isLiked);
    } catch (err) {
      console.error("Failed to like product:", err);
    }
  };

  const handleAddToCart = async () => {
    if (!token || !id || !isAuthenticated) {
      navigate("/login");
      return;
    }
    setAddingToCart(true);
    try {
      await api.addToCart(token, id, 1);
      navigate("/cart");
    } catch (err) {
      console.error("Failed to add to cart:", err);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleMessageSeller = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (product?.seller?._id) {
      navigate(`/chat/${product.seller._id}`);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
    }).format(price);
  };

  const nextImage = () => {
    if (product && currentImageIndex < product.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen pt-32 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="min-h-screen pt-32 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Product not found</h2>
            <button
              onClick={() => navigate("/marketplace")}
              className="text-primary hover:underline"
            >
              Browse marketplace
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="sticky top-20 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => navigate("/marketplace")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className={`p-2 rounded-full transition-colors ${
                  isLiked ? "text-red-500 bg-red-50" : "hover:bg-gray-100"
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Gallery */}
          <div className="relative bg-gray-100 dark:bg-gray-800">
            {product.images && product.images.length > 0 ? (
              <>
                <div className="aspect-square">
                  <img
                    src={product.images[currentImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      disabled={currentImageIndex === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-900/80 rounded-full disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      disabled={currentImageIndex === product.images.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-900/80 rounded-full disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                      {product.images.map((_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i === currentImageIndex
                              ? "bg-primary"
                              : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="aspect-square flex items-center justify-center">
                <Store className="w-20 h-20 text-gray-300" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-4 space-y-4">
            {/* Price & Title */}
            <div>
              <p className="text-2xl font-bold text-primary">
                {formatPrice(product.price, product.currency)}
                {product.isNegotiable && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Negotiable)
                  </span>
                )}
              </p>
              <h1 className="text-xl font-semibold mt-1">{product.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {product.views} views
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {product.likes} likes
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDistanceToNow(new Date(product.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Location */}
            {product.location && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                {product.location.name}
              </div>
            )}

            {/* Seller Info */}
            {product.seller && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {product.seller.avatar ? (
                      <img
                        src={product.seller.avatar}
                        alt={product.seller.fullName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-ivory">
                        {product.seller.fullName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {product.seller.shopName || product.seller.fullName}
                        </span>
                        {product.seller.isVerified && (
                          <Shield className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {product.seller.totalSales} sales •{" "}
                        {product.seller.sellerRating}★ rating
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleMessageSeller}
                    className="flex-1 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 inline-block mr-2" />
                    Message
                  </button>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            {/* Details */}
            <div>
              <h2 className="font-semibold mb-2">Details</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Category</div>
                <div className="capitalize">{product.category}</div>
                <div className="text-gray-500">Condition</div>
                <div className="capitalize">{product.condition}</div>
                <div className="text-gray-500">Stock</div>
                <div>{product.stock > 0 ? `${product.stock} available` : "Out of stock"}</div>
              </div>
            </div>

            {/* Safety Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Safety Tips</h3>
              <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                <li>• Meet in a public place</li>
                <li>• Check the item before paying</li>
                <li>• Use secure payment methods</li>
              </ul>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex gap-2">
            <button
              onClick={handleAddToCart}
              disabled={addingToCart || product.stock === 0}
              className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Truck className="w-5 h-5" />
              {addingToCart ? "Adding..." : "Buy Now"}
            </button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}