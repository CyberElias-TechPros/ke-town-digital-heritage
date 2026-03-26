import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Play } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import heroImg from "@/assets/hero-waterway.jpg";
import cultureImg from "@/assets/culture-masquerade.jpg";
import historyImg from "@/assets/history-canoe.jpg";
import attireImg from "@/assets/attire-george.jpg";
import envImg from "@/assets/environment-mangrove.jpg";
import cuisineImg from "@/assets/cuisine-onunu.jpg";

const categories = ["All", "Historical", "Cultural", "Contemporary", "Environment"];

const galleryItems = [
  { src: heroImg, title: "Ke Town Waterways", category: "Contemporary", desc: "Aerial view of the mangrove waterways surrounding Ke Town" },
  { src: cultureImg, title: "Masquerade Festival", category: "Cultural", desc: "Kalabari masquerade dancers during the Owu-Aru-Sun festival" },
  { src: historyImg, title: "War Canoe Heritage", category: "Historical", desc: "Historical illustration of the Kalabari war canoe house system" },
  { src: attireImg, title: "Traditional Attire", category: "Cultural", desc: "Kalabari woman in traditional George fabric and coral beads" },
  { src: envImg, title: "Mangrove Ecosystem", category: "Environment", desc: "The lush mangrove swamps of the Niger Delta" },
  { src: cuisineImg, title: "Kalabari Cuisine", category: "Cultural", desc: "Traditional Onunu dish and Fisherman's Soup" },
];

const Gallery = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedImage, setSelectedImage] = useState<typeof galleryItems[0] | null>(null);

  const filtered = activeCategory === "All" ? galleryItems : galleryItems.filter(item => item.category === activeCategory);

  return (
    <Layout>
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
              A collection of photographs, artwork, and media documenting the beauty and heritage of Ke Town and Kalabari culture.
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
                  key={item.title}
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

      {/* Submission CTA */}
      <section className="section-padding bg-muted/50">
        <div className="container-narrow text-center">
          <SectionHeading title="Contribute to the Archive" subtitle="Share your photos, videos, and memories of Ke Town" />
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
            <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all">
              Submit via Contact Form
            </a>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Gallery;
