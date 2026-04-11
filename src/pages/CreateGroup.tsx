import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, X, Loader2, Users, Lock, Globe, EyeOff } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";

const groupCategories = [
  { id: "education", label: "Education" },
  { id: "business", label: "Business" },
  { id: "culture", label: "Culture" },
  { id: "sports", label: "Sports" },
  { id: "technology", label: "Technology" },
  { id: "religion", label: "Religion" },
  { id: "entertainment", label: "Entertainment" },
  { id: "community", label: "Community" },
  { id: "other", label: "Other" },
];

export default function CreateGroup() {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "community",
    privacy: "public",
    isOpen: true,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !token) return;
    
    setUploading(true);
    try {
      const uploaded = await api.uploadFile(token, e.target.files[0]);
      setCoverImage((uploaded as { url: string }).url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formData.name.trim()) {
      alert("Please enter a group name");
      return;
    }
    if (!formData.description.trim()) {
      alert("Please enter a description");
      return;
    }

    setLoading(true);
    try {
      await api.createGroup(token, {
        ...formData,
        coverImage,
      });
      navigate("/groups");
    } catch (err) {
      console.error("Failed to create group:", err);
      alert("Failed to create group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "public":
        return <Globe className="w-5 h-5" />;
      case "private":
        return <Lock className="w-5 h-5" />;
      case "secret":
        return <EyeOff className="w-5 h-5" />;
      default:
        return <Globe className="w-5 h-5" />;
    }
  };

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
              onClick={() => navigate("/groups")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Create Group</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cover Image */}
            <div>
              <h2 className="font-semibold mb-2">Cover Image</h2>
              <div className="relative h-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                {coverImage ? (
                  <>
                    <img
                      src={coverImage}
                      alt="Group cover"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverImage("")}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500 mt-1">
                      {uploading ? "Uploading..." : "Add Cover Image"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Group Name */}
            <div>
              <label className="block font-semibold mb-2">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="What's the group called?"
                maxLength={50}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this group about?"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block font-semibold mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {groupCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Privacy */}
            <div>
              <label className="block font-semibold mb-2">Privacy</label>
              <div className="space-y-2">
                {[
                  { id: "public", label: "Public", description: "Anyone can see and join" },
                  { id: "private", label: "Private", description: "Requires approval to join" },
                  { id: "secret", label: "Secret", description: "Only members can see" },
                ].map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.privacy === option.id
                        ? "border-primary bg-primary/10"
                        : "border-gray-300 dark:border-gray-700 hover:border-primary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="privacy"
                      value={option.id}
                      checked={formData.privacy === option.id}
                      onChange={(e) =>
                        setFormData({ ...formData, privacy: e.target.value })
                      }
                      className="hidden"
                    />
                    <div className="text-gray-600">{getPrivacyIcon(option.id)}</div>
                    <div>
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Group...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Create Group
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}