import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Play, Loader2, Check, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import SEO from "@/components/PageSEO";
import heroImg from "@/assets/hero-waterway.jpg";
import cultureImg from "@/assets/culture-masquerade.jpg";
import historyImg from "@/assets/history-canoe.jpg";
import attireImg from "@/assets/attire-george.jpg";
import envImg from "@/assets/environment-mangrove.jpg";
import cuisineImg from "@/assets/cuisine-onunu.jpg";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const categories = ["All", "Historical", "Cultural", "Contemporary", "Environment"];

const defaultGalleryItems = [
  { src: heroImg, title: "Ke Kingdom Waterways", category: "Contemporary", desc: "Aerial view of the mangrove waterways surrounding Ke Kingdom" },
  { src: cultureImg, title: "Masquerade Festival", category: "Cultural", desc: "Kalabari masquerade dancers during the Owu-Aru-Sun festival" },
  { src: historyImg, title: "War Canoe Heritage", category: "Historical", desc: "Historical illustration of the Kalabari war canoe house system" },
  { src: attireImg, title: "Traditional Attire", category: "Cultural", desc: "Kalabari woman in traditional George fabric and coral beads" },
  { src: envImg, title: "Mangrove Ecosystem", category: "Environment", desc: "The lush mangrove swamps of the Niger Delta" },
  { src: cuisineImg, title: "Kalabari Cuisine", category: "Cultural", desc: "Traditional Onunu dish and Fisherman's Soup" },
];

interface GalleryItem {
  _id?: string;
  src: string;
  title: string;
  category: string;
  desc: string;
  submittedBy?: string;
  approved?: boolean;
}

const Gallery = () => {
  const { isAuthenticated, token } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(defaultGalleryItems);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Cultural");
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const fetchGalleryItems = async () => {
    try {
      const items = await api.getGallery() as any[];
      if (items && items.length > 0) {
        const formattedItems = items.map((item: any) => ({
          _id: item._id,
          src: item.imageUrl,
          title: item.title,
          category: item.category,
          desc: item.description || "",
          submittedBy: item.submittedBy,
          approved: item.approved,
        }));
        setGalleryItems([...defaultGalleryItems, ...formattedItems.filter((item: GalleryItem) => item.approved)]);
      }
    } catch (error) {
      console.error("Failed to fetch gallery items:", error);
    }
  };

  const filtered = activeCategory === "All" ? galleryItems : galleryItems.filter(item => item.category === activeCategory);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadError("");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadFile) {
      setUploadError("Please select a file to upload");
      return;
    }

    if (!uploadTitle.trim()) {
      setUploadError("Please enter a title for your submission");
      return;
    }

    if (!token) {
      setUploadError("Please log in to upload images");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      // Upload file to server
      const uploadResult = await api.uploadFile(token, uploadFile) as any;
      
      // Create gallery item
      await api.createGalleryItem(token, {
        title: uploadTitle,
        category: uploadCategory,
        description: uploadDescription,
        imageUrl: uploadResult.file.url,
      });

      setUploadSuccess(true);
      setUploadFile(null);
      setUploadTitle("");
      setUploadCategory("Cultural");
      setUploadDescription("");
      
      // Refresh gallery items
      await fetchGalleryItems();

      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(false);
      }, 2000);
    } catch (error: any) {
      setUploadError(error.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle("");
    setUploadCategory("Cultural");
    setUploadDescription("");
    setUploadError("");
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Layout>
      <SEO page="/gallery" />
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">Gallery & Media</span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Visual <span className="text-gradient-gold">Archive</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-lg max-w-2xl mx-auto">
              A collection of photographs, artwork, and media documenting the beauty and heritage of Ke Kingdom and Kalabari culture.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Gallery */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          {/* Filters */}
          <div className="flex overflow-x-auto gap-2 mb-10 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-full font-ui text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Masonry Grid */}
          <motion.div layout className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            <AnimatePresence>
              {filtered.map((item, i) => (
                <motion.div
                  key={item._id || item.title}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="break-inside-avoid cursor-pointer group"
                  onClick={() => setSelectedImage(item)}
                >
                  <div className="rounded-xl overflow-hidden border border-border shadow-[var(--shadow-card)] hover-lift">
                    <div className="relative">
                      <img src={item.src} alt={item.title} loading="lazy" className="w-full object-cover" />
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/40 transition-all duration-300 flex items-center justify-center">
                        <span className="text-primary-foreground font-ui text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          View Full Size
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-base font-semibold text-foreground">{item.title}</h3>
                      <span className="tag-ke bg-secondary/10 text-secondary mt-1 inline-block">{item.category}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-primary-foreground hover:text-secondary transition-colors"
              >
                <X size={28} />
              </button>
              <img src={selectedImage.src} alt={selectedImage.title} className="w-full rounded-xl shadow-2xl" />
              <div className="mt-4 text-center">
                <h3 className="font-display text-xl font-bold text-primary-foreground">{selectedImage.title}</h3>
                <p className="text-primary-foreground/70 font-body text-sm mt-1">{selectedImage.desc}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => {
              setShowUploadModal(false);
              resetUploadForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-lg w-full bg-card rounded-xl shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Submit Your Media</h2>
              
              {uploadSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">Upload Successful!</h3>
                  <p className="text-muted-foreground font-body">
                    Your submission has been received and is pending approval.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleUpload} className="space-y-4">
                  {uploadError && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 flex items-center gap-2">
                      <AlertCircle size={18} />
                      <span className="text-sm font-ui">{uploadError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-ui font-medium text-foreground mb-1.5">
                      Select File *
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-ui text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/90"
                    />
                    {uploadFile && (
                      <p className="text-xs text-muted-foreground mt-1 font-ui">
                        Selected: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-ui font-medium text-foreground mb-1.5">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="Enter a title for your submission"
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-ui font-medium text-foreground mb-1.5">
                      Category *
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                    >
                      {categories.filter(cat => cat !== "All").map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-ui font-medium text-foreground mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="Describe your submission (optional)"
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading || !uploadFile}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Submit for Review
                      </>
                    )}
                  </button>

                  <p className="text-xs text-muted-foreground text-center font-ui">
                    Your submission will be reviewed before being added to the gallery.
                  </p>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submission CTA */}
      <section className="section-padding bg-muted/50">
        <div className="container-narrow text-center">
          <SectionHeading title="Contribute to the Archive" subtitle="Share your photos, videos, and memories of Ke Kingdom" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-xl border-2 border-dashed border-border p-12 max-w-lg mx-auto"
          >
            <Upload size={40} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">Submit Your Media</h3>
            <p className="text-sm text-muted-foreground font-body mb-4">
              Help preserve Kalabari heritage. Submit historical photos, festival recordings, or community moments.
            </p>
            {isAuthenticated ? (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all"
              >
                <Upload size={18} />
                Upload Media
              </button>
            ) : (
              <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all">
                Log In to Submit
              </a>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Gallery;
