import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, ArrowRight, ShoppingBag } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api, asList } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";

interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
    stock: number;
  };
  quantity: number;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
}

export default function Cart() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: user?.fullName || "",
    phone: "",
    address: "",
    city: "",
    state: ""
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadCart();
  }, [isAuthenticated, token, isLoading]);

  const loadCart = async () => {
    if (!token) return;
    try {
      const data = await api.getCart(token) as CartItem[];
      setCartItems(asList<CartItem>(data));
    } catch (err) {
      console.error("Failed to load cart:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    if (!token) return;
    try {
      await api.updateCartItem(token, productId, quantity);
      loadCart();
    } catch (err) {
      console.error("Failed to update cart:", err);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!token) return;
    try {
      await api.removeFromCart(token, productId);
      loadCart();
    } catch (err) {
      console.error("Failed to remove item:", err);
    }
  };

  const handleClearCart = async () => {
    if (!token) return;
    try {
      await api.clearCart(token);
      setCartItems([]);
    } catch (err) {
      console.error("Failed to clear cart:", err);
    }
  };

  const handleCheckout = async () => {
    if (!token) return;
    setPlacingOrder(true);
    try {
      const items = cartItems.map(item => ({
        product: item.product._id,
        quantity: item.quantity
      }));
      
      const order = await api.createOrder(token, {
        items,
        shippingAddress: address,
        paymentMethod: 'transfer'
      });
      
      await api.clearCart(token);
      setCartItems([]);
      setShowCheckout(false);
      navigate('/orders');
    } catch (err) {
      console.error("Failed to place order:", err);
    } finally {
      setPlacingOrder(false);
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shipping = subtotal > 5000 ? 0 : 1000;
  const total = subtotal + shipping;

  if (!isAuthenticated) return null;

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
                <ShoppingCart className="text-secondary" size={28} />
                <h1 className="font-display text-2xl font-bold text-foreground">Shopping Cart</h1>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-sm text-destructive hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag size={64} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">Your cart is empty</h2>
                <p className="text-muted-foreground mb-6">Discover our artisan products and add something special!</p>
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold hover:bg-secondary/90 transition-all"
                >
                  Browse Marketplace <ArrowRight size={18} />
                </Link>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                  {cartItems.map((item) => (
                    <div
                      key={item._id}
                      className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)] flex gap-4"
                    >
                      <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {item.product.images?.[0] ? (
                          <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ShoppingBag size={32} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base font-semibold text-foreground truncate">{item.product.name}</h3>
                        <p className="text-lg font-bold text-secondary mt-1">₦{item.product.price.toLocaleString()}</p>
                        {item.product.stock === 0 && (
                          <span className="text-xs text-destructive">Out of stock</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => handleRemoveItem(item.product._id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(item.product._id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 disabled:opacity-50"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.product._id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 disabled:opacity-50"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <div className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)] sticky top-24">
                    <h2 className="font-display text-lg font-semibold text-foreground mb-4">Order Summary</h2>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal ({cartItems.length} items)</span>
                        <span className="text-foreground">₦{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="text-foreground">
                          {shipping === 0 ? <span className="text-secondary">Free</span> : `₦${shipping.toLocaleString()}`}
                        </span>
                      </div>
                      {subtotal < 5000 && (
                        <p className="text-xs text-muted-foreground">Add ₦{(5000 - subtotal).toLocaleString()} more for free shipping!</p>
                      )}
                    </div>
                    
                    <div className="border-t border-border mt-4 pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-foreground">Total</span>
                        <span className="text-secondary">₦{total.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowCheckout(true)}
                      className="w-full mt-6 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold hover:bg-secondary/90 transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard size={18} />
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Checkout Modal */}
      {showCheckout && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowCheckout(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-2xl border border-border max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="font-display text-xl font-bold text-foreground mb-4">Checkout</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                  <input
                    type="text"
                    value={address.fullName}
                    onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    placeholder="08012345678"
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Delivery Address</label>
                  <textarea
                    value={address.address}
                    onChange={(e) => setAddress({ ...address, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">City</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">State</label>
                    <input
                      type="text"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>₦{shipping.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-2">
                  <span>Total</span>
                  <span className="text-secondary">₦{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={placingOrder || !address.fullName || !address.phone || !address.address}
                  className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {placingOrder ? (
                    <div className="w-4 h-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CreditCard size={16} />
                  )}
                  Place Order
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </Layout>
  );
}