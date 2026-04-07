import { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Filter, ShoppingBag, User, MapPin, Loader2, MessageCircle, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import SEO from "@/components/PageSEO";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  artisanName: string;
  artisanLocation?: string;
  stock: number;
  isFeatured: boolean;
  contact?: string;
  tags: string[];
}

const categories = [
  { id: "all", label: "All Products" },
  { id: "textiles", label: "Textiles" },
  { id: "jewelry", label: "Jewelry" },
  { id: "masquerade", label: "Masquerade Art" },
  { id: "art", label: "Art & Paintings" },
  { id: "crafts", label: "Crafts" },
  { id: "food", label: "Food & Drinks" },
];

export default function Marketplace() {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const category = selectedCategory === "all" ? undefined : selectedCategory;
      const data = await api.getProducts(category);
      setProducts(data as Product[]);
    } catch (err: any) {
      console.error("Failed to load products:", err);
      setError(err.message || "Unable to load products");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.artisanName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredProducts = filteredProducts.filter(p => p.isFeatured);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(price);
  };

  return (
    <Layout>
      <SEO page="/marketplace" />
      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">Community</span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Artisan <span className="text-gradient-gold">Marketplace</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-lg max-w-2xl mx-auto">
              Discover and purchase authentic Kalabari crafts, textiles, and artworks directly from local artisans.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-12 bg-muted/50">
          <div className="container-narrow px-4">
            <SectionHeading title="Featured Items" subtitle="Handpicked artisan creations" />
            <div className="grid md:grid-cols-3 gap-6">
              {featuredProducts.slice(0, 3).map((product, i) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-xl border border-border overflow-hidden shadow-[var(--shadow-elevated)] hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="relative h-48 bg-gradient-to-br from-secondary/10 to-accent/10">
                    {product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={48} className="text-secondary/30" />
                      </div>
                    )}
                    {product.isFeatured && (
                      <span className="absolute top-3 left-3 tag-ke bg-ke-gold/20 text-secondary">Featured</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-display text-lg font-semibold text-foreground mb-1">{product.name}</h4>
                    <p className="text-2xl font-bold text-secondary">{formatPrice(product.price, product.currency)}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <User size={14} /> {product.artisanName}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Browse Products */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
            <SectionHeading title="Browse Collection" subtitle="Explore all artisan products" />
            {isAuthenticated && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all"
              >
                <Plus size={16} /> List Your Product
              </button>
            )}
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg font-ui text-sm whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, i) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-xl border border-border overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all hover:-translate-y-1 cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="relative h-40 bg-gradient-to-br from-secondary/10 to-accent/10">
                    {product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={40} className="text-secondary/30" />
                      </div>
                    )}
                    {product.stock === 0 && (
                      <span className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">Sold Out</span>
                    )}
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-ui text-muted-foreground bg-muted px-2 py-0.5 rounded mb-2 inline-block">
                      {product.category}
                    </span>
                    <h4 className="font-display text-base font-semibold text-foreground mb-1 line-clamp-1">{product.name}</h4>
                    <p className="text-lg font-bold text-secondary mb-2">{formatPrice(product.price, product.currency)}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User size={14} />
                      <span className="line-clamp-1">{product.artisanName}</span>
                    </div>
                    {product.artisanLocation && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin size={14} />
                        <span>{product.artisanLocation}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBag size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No products found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-56 bg-gradient-to-br from-secondary/10 to-accent/10">
                {selectedProduct.images[0] ? (
                  <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={64} className="text-secondary/30" />
                  </div>
                )}
              </div>
              <div className="p-6">
                <span className="text-xs font-ui text-muted-foreground bg-muted px-2 py-1 rounded mb-3 inline-block">
                  {selectedProduct.category}
                </span>
                <h3 className="font-display text-2xl font-bold text-foreground mb-2">{selectedProduct.name}</h3>
                <p className="text-3xl font-bold text-secondary mb-4">{formatPrice(selectedProduct.price, selectedProduct.currency)}</p>
                <p className="text-muted-foreground font-body mb-6">{selectedProduct.description}</p>

                <div className="flex items-center gap-4 mb-4 p-4 bg-muted/50 rounded-xl">
                  <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center">
                    <User size={24} className="text-secondary" />
                  </div>
                  <div>
                    <p className="font-ui font-semibold text-foreground">{selectedProduct.artisanName}</p>
                    {selectedProduct.artisanLocation && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin size={12} /> {selectedProduct.artisanLocation}
                      </p>
                    )}
                  </div>
                </div>

                {selectedProduct.stock > 0 ? (
                  <p className="text-sm text-green-600 mb-4">✓ {selectedProduct.stock} in stock</p>
                ) : (
                  <p className="text-sm text-destructive mb-4">✗ Currently out of stock</p>
                )}

                {selectedProduct.contact && (
                  <a
                    href={`https://wa.me/${selectedProduct.contact}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 w-full justify-center px-4 py-3 bg-green-500 text-white rounded-lg font-ui font-semibold hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle size={18} /> Contact Seller on WhatsApp
                  </a>
                )}

                {!selectedProduct.contact && (
                  <button className="inline-flex items-center gap-2 w-full justify-center px-4 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold hover:bg-secondary/90 transition-colors">
                    Request Information
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}