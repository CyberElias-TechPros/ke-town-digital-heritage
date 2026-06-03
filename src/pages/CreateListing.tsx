import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, X, Loader2, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";

const categories = [
  { id: "textiles", label: "Textiles" },
  { id: "jewelry", label: "Jewelry" },
  { id: "masquerade", label: "Masquerade Art" },
  { id: "art", label: "Art & Paintings" },
  { id: "crafts", label: "Crafts" },
  { id: "food", label: "Food & Drinks" },
  { id: "electronics", label: "Electronics" },
  { id: "fashion", label: "Fashion" },
  { id: "home", label: "Home & Living" },
  { id: "services", label: "Services" },
  { id: "jobs", label: "Jobs" },
  { id: "other", label: "Other" },
];

const conditions = [
  { id: "new", label: "New" },
  { id: "like-new", label: "Like New" },
  { id: "gently-used", label: "Gently Used" },
  { id: "used", label: "Used" },
  { id: "fair", label: "Fair" },
];

export default function CreateListing() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "other",
    condition: "used",
    price: "",
    negotiable: true,
    quantity: 1,
    location: "",
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate, isLoading]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !token) return;

    const files = Array.from(e.target.files);
    if (images.length + files.length > 10) {
      setFormError("Maximum 10 images allowed");
      setTimeout(() => setFormError(""), 5000);
      return;
    }

    setUploading(true);
    try {
      const uploaded = await api.uploadMultipleFiles(token, files);
      const urls = (uploaded as { urls: string[] }).urls;
      setImages([...images, ...urls]);
    } catch (err) {
      setFormError("Failed to upload images. Please try again.");
      setTimeout(() => setFormError(""), 5000);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!token) return;

    if (!formData.name.trim()) {
      setFormError("Please enter a product name");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Please enter a description");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setFormError("Please enter a valid price");
      return;
    }

    setLoading(true);
    try {
      await api.createListing(token, {
        ...formData,
        price: parseFloat(formData.price),
        images,
      });
      setFormSuccess("Listing created successfully!");
      setTimeout(() => navigate("/marketplace"), 1500);
    } catch (err) {
      setFormError("Failed to create listing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate("/marketplace")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Create Listing</h1>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 flex items-center gap-2">
              <AlertCircle size={18} />
              <span className="text-sm">{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 mb-6 flex items-center gap-2">
              <span className="text-sm">{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Images */}
            <div>
              <h2 className="font-semibold mb-2">Photos</h2>
              <div className="grid grid-cols-3 gap-2">
                {images.map((url, index) => (
                  <div key={index} className="relative aspect-square">
                    <img src={url} alt={`Upload ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {images.length < 10 && (
                  <label className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500 mt-1">{uploading ? "Uploading..." : "Add Photo"}</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} className="hidden" />
                  </label>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">Add up to 10 photos. First photo is the cover.</p>
            </div>

            {/* Title */}
            <div>
              <label className="block font-semibold mb-2">Title <span className="text-red-500">*</span></label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="What are you selling?" maxLength={80}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary" />
              <p className="text-sm text-gray-500 mt-1">{formData.name.length}/80 characters</p>
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold mb-2">Description <span className="text-red-500">*</span></label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe your product in detail..." rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>

            {/* Category & Condition */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2">Category</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary">
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-2">Condition</label>
                <select value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary">
                  {conditions.map((cond) => (<option key={cond.id} value={cond.id}>{cond.label}</option>))}
                </select>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block font-semibold mb-2">Price (₦) <span className="text-red-500">*</span></label>
              <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" min="0" step="0.01"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary" />
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={formData.negotiable} onChange={(e) => setFormData({ ...formData, negotiable: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm">Price is negotiable</span>
              </label>
            </div>

            {/* Location */}
            <div>
              <label className="block font-semibold mb-2">Location</label>
              <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="City, State"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            {/* Quantity */}
            <div>
              <label className="block font-semibold mb-2">Quantity</label>
              <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })} min="1"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish Listing"
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}
