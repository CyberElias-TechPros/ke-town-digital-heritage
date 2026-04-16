import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Truck, MapPin, Loader2, Check } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";

interface CartItem {
  _id: string;
  product: { _id: string; name: string; price: number; images: string[] };
  quantity: number;
}

interface Address {
  _id: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  isDefault: boolean;
}

export default function Checkout() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("card");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadCheckoutData();
  }, [isAuthenticated, token, navigate, isLoading]);

  const loadCheckoutData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [cartData, addressesData] = await Promise.all([
        api.getCart(token),
        api.getAddresses(token).catch(() => []),
      ]);
      setCartItems(cartData as CartItem[]);
      setAddresses(addressesData as Address[]);
      
      const defaultAddr = (addressesData as Address[]).find((a: Address) => a.isDefault);
      if (defaultAddr) setSelectedAddress(defaultAddr._id);
    } catch (err) {
      console.error("Failed to load checkout data:", err);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shipping = deliveryMethod === "express" ? 2500 : 1000;
  const total = subtotal + shipping;

  const handlePlaceOrder = async () => {
    if (!token) return;
    if (!selectedAddress) {
      alert("Please select a shipping address");
      return;
    }

    setLoading(true);
    try {
      await api.createCheckout(token, {
        addressId: selectedAddress,
        deliveryMethod,
        paymentMethod,
      });
      navigate("/orders");
    } catch (err) {
      console.error("Failed to place order:", err);
      alert("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deliveryMethods = [
    { id: "standard", label: "Standard Delivery", time: "5-7 days", price: 1000 },
    { id: "express", label: "Express Delivery", time: "2-3 days", price: 2500 },
    { id: "pickup", label: "Pickup", time: "Same day", price: 0 },
  ];

  const paymentMethods = [
    { id: "card", label: "Pay with Card" },
    { id: "transfer", label: "Bank Transfer" },
    { id: "ussd", label: "USSD" },
    { id: "cod", label: "Cash on Delivery" },
  ];

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto px-4 py-8"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate("/cart")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Checkout</h1>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    step >= s
                      ? "bg-primary text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  }`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-1 ${
                      step > s ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Step 1: Address */}
              {step === 1 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
                  {addresses.length > 0 ? (
                    <div className="space-y-2">
                      {addresses.map((addr) => (
                        <label
                          key={addr._id}
                          className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedAddress === addr._id
                              ? "border-primary bg-primary/10"
                              : "border-gray-300 dark:border-gray-700 hover:border-primary"
                          }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddress === addr._id}
                            onChange={() => setSelectedAddress(addr._id)}
                            className="hidden"
                          />
                          <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="font-semibold">{addr.fullName}</p>
                            <p className="text-sm text-gray-500">{addr.address}</p>
                            <p className="text-sm text-gray-500">
                              {addr.city}, {addr.state}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No saved addresses</p>
                  )}
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedAddress}
                    className="w-full mt-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 2: Delivery */}
              {step === 2 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Delivery Method</h2>
                  <div className="space-y-2">
                    {deliveryMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                          deliveryMethod === method.id
                            ? "border-primary bg-primary/10"
                            : "border-gray-300 dark:border-gray-700 hover:border-primary"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="delivery"
                            checked={deliveryMethod === method.id}
                            onChange={() => setDeliveryMethod(method.id)}
                            className="hidden"
                          />
                          <Truck className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="font-semibold">{method.label}</p>
                            <p className="text-sm text-gray-500">{method.time}</p>
                          </div>
                        </div>
                        <p className="font-semibold">
                          {method.price === 0 ? "Free" : `₦${method.price.toLocaleString()}`}
                        </p>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                          paymentMethod === method.id
                            ? "border-primary bg-primary/10"
                            : "border-gray-300 dark:border-gray-700 hover:border-primary"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="hidden"
                        />
                        <CreditCard className="w-5 h-5 text-gray-500" />
                        <span className="font-semibold">{method.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Order Summary */}
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-semibold mb-2">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal ({cartItems.length} items)</span>
                        <span>₦{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span>₦{shipping.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                        <span>Total</span>
                        <span>₦{total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={loading}
                      className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Pay ₦${total.toLocaleString()}`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}