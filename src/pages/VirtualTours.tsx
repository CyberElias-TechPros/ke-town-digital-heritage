import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Info, ExternalLink, ChevronRight, Compass, Camera, Eye } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import SEO from "@/components/PageSEO";

interface TourLocation {
  id: string;
  name: string;
  description: string;
  fullDescription: string;
  category: string;
  image: string;
  images: string[];
  coordinates?: { lat: number; lng: number };
  features: string[];
  history?: string;
  visitorTips?: string[];
}

const tourLocations: TourLocation[] = [
  {
    id: "king-palace",
    name: "King's Palace (Obi's House)",
    description: "The traditional palace of the King of Ke Kingdom",
    fullDescription: "The King's Palace serves as the traditional seat of authority for HRM King Agolia Cookey Aboko XIII. This sacred space houses the monarchy's regalia and serves as a venue for important cultural ceremonies and community gatherings.",
    category: "Historic",
    image: "https://images.unsplash.com/photo-1523821741446-edb2b68bb7a0?w=800",
    images: [
      "https://images.unsplash.com/photo-1523821741446-edb2b68bb7a0?w=800",
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800"
    ],
    features: ["Traditional Architecture", "Royal Regalia", "Ceremonial Hall"],
    history: "The palace has been the center of Ke Kingdom's governance for centuries, with each successive king adding to its cultural significance.",
    visitorTips: ["Dress modestly", "Remove shoes before entering", "Ask permission before taking photos"]
  },
  {
    id: "ekine-ground",
    name: "Ekine Masquerade Ground",
    description: "The sacred grounds where traditional masquerades are performed",
    fullDescription: "The Ekine Masquerade Ground is a culturally significant site where the famous Ekine Sekiapu Society performs sacred masquerade dances representing water spirits and ancestors. The ground comes alive during the dry season when performances are held.",
    category: "Cultural",
    image: "https://images.unsplash.com/photo-1517220901313-1411bc38c9b4?w=800",
    images: [
      "https://images.unsplash.com/photo-1517220901313-1411bc38c9b4?w=800",
      "https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=800"
    ],
    features: ["Performance Arena", "Spiritual Significance", "Seasonal Events"],
    history: "This ground has been used for Ekine performances for over 400 years, with each play telling stories of Kalabari cosmology.",
    visitorTips: ["Respect the spiritual nature", "No flash photography during performances", "Observe quiet during ceremonies"]
  },
  {
    id: "waterfront",
    name: "Ke Kingdom Waterfront",
    description: "The scenic waterways that define Kalabari life",
    fullDescription: "The waterfront is the heart of Ke Kingdom, where traditional fishing, trading, and transportation occur daily. The mangrove-lined waterways support over 270 fish species and are central to the community's maritime heritage.",
    category: "Natural",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
    images: [
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800"
    ],
    features: ["Mangrove Ecosystem", "Fishing Activities", "Boat Transportation"],
    history: "These waterways have been the lifeline of Ke Kingdom since its founding around 800 AD, supporting trade and daily life.",
    visitorTips: ["Bring insect repellent", "Wear comfortable water shoes", "Morning visits recommended"]
  },
  {
    id: "war-canoe-houses",
    name: "War Canoe House Sites",
    description: "Historical sites of the famous Wari (war canoe) houses",
    fullDescription: "The War Canoe House sites represent the political and military backbone of traditional Kalabari society. Ke Kingdom holds the Kemsaipruye-Igbo group of houses - one of the historic war canoe house lineages.",
    category: "Historic",
    image: "https://images.unsplash.com/photo-1559825481-12a05cc00344?w=800",
    images: [
      "https://images.unsplash.com/photo-1559825481-12a05cc00344?w=800",
      "https://images.unsplash.com/photo-1460518451285-97b6aa326961?w=800"
    ],
    features: ["Historical Architecture", "Cultural Heritage", "Community Halls"],
    history: "The war canoe house system developed in the 1500s-1600s as both military and political organizations.",
    visitorTips: ["Respect private property", "Ask for guidance from locals", "Learn about the house lineages"]
  },
  {
    id: "ancestral-shrines",
    name: "Ancestral Shrines (Inkpu)",
    description: "Sacred spaces for ancestor veneration",
    fullDescription: "The Inkpu (ancestral shrines) are sacred spaces throughout Ke Kingdom where the community honors its forebears. These sites are central to traditional spirituality and are maintained by specific family lines.",
    category: "Spiritual",
    image: "https://images.unsplash.com/photo-1602192509153-0fcdb5b42507?w=800",
    images: [
      "https://images.unsplash.com/photo-1602192509153-0fcdb5b42507?w=800",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800"
    ],
    features: ["Spiritual Practices", "Cultural Preservation", "Traditional Rites"],
    history: "Ancestor veneration has been a cornerstone of Kalabari spirituality for centuries, maintaining connections to the community's origins.",
    visitorTips: ["Show respect", "Do not touch ceremonial objects", "Ask permission from caretakers"]
  },
  {
    id: "market-square",
    name: "Traditional Market Square",
    description: "The bustling center of commerce and community interaction",
    fullDescription: "The market square is where daily trading occurs, with vendors selling fresh fish, local produce, and traditional goods. It's a vibrant space that showcases the entrepreneurial spirit of the community.",
    category: "Cultural",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800",
    images: [
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800",
      "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800"
    ],
    features: ["Local Produce", "Fresh Seafood", "Traditional Crafts"],
    history: "Markets have been trading centers in the Delta for centuries, with Kalabari traders known throughout the region.",
    visitorTips: ["Bargain politely", "Try local foods", "Visit in the morning for freshest produce"]
  },
];

const categories = ["All", "Historic", "Cultural", "Natural", "Spiritual"];

export default function VirtualTours() {
  const [selectedLocation, setSelectedLocation] = useState<TourLocation | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const filteredLocations = activeCategory === "All" 
    ? tourLocations 
    : tourLocations.filter(l => l.category === activeCategory);

  return (
    <Layout>
      <SEO page="/virtual-tours" />
      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920" 
            alt="Ke Kingdom" 
            className="w-full h-full object-cover" 
          />
        </div>
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">Explore</span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Virtual <span className="text-gradient-gold">Tours</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-lg max-w-2xl mx-auto">
              Explore the landmarks and sacred sites of Ke Kingdom from anywhere in the world.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 bg-muted/50 border-b border-border">
        <div className="container-narrow px-4">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full font-ui text-sm transition-all ${
                  activeCategory === cat
                    ? "bg-secondary text-secondary-foreground shadow-[var(--shadow-gold)]"
                    : "bg-card text-muted-foreground hover:bg-secondary/10 hover:text-secondary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tour Cards */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLocations.map((location, i) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl border border-border overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all hover:-translate-y-1 cursor-pointer"
                onClick={() => {
                  setSelectedLocation(location);
                  setCurrentImageIndex(0);
                }}
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={location.image} 
                    alt={location.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="tag-ke bg-secondary/90 text-secondary-foreground text-xs">{location.category}</span>
                  </div>
                  <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Eye size={18} className="text-secondary" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">{location.name}</h3>
                  <p className="text-muted-foreground font-body text-sm mb-4 line-clamp-2">{location.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {location.features.slice(0, 2).map((feature, idx) => (
                        <span key={idx} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                    <span className="text-secondary font-ui text-sm font-medium flex items-center gap-1">
                      View <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Location Detail Modal */}
      <AnimatePresence>
        {selectedLocation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary/95 backdrop-blur-md overflow-y-auto"
            onClick={() => setSelectedLocation(null)}
          >
            <div className="min-h-screen py-8 px-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card rounded-2xl border border-border max-w-4xl mx-auto shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Image Gallery */}
                <div className="relative h-80 md:h-96 bg-muted">
                  <img 
                    src={selectedLocation.images[currentImageIndex]} 
                    alt={selectedLocation.name} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                  
                  {/* Navigation */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((currentImageIndex - 1 + selectedLocation.images.length) % selectedLocation.images.length);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/50 text-primary-foreground hover:bg-primary/70 flex items-center justify-center"
                  >
                    <ChevronRight className="rotate-180" size={20} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((currentImageIndex + 1) % selectedLocation.images.length);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/50 text-primary-foreground hover:bg-primary/70 flex items-center justify-center"
                  >
                    <ChevronRight size={20} />
                  </button>

                  {/* Image indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {selectedLocation.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentImageIndex ? "bg-secondary w-6" : "bg-primary-foreground/50"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="absolute bottom-4 left-4">
                    <span className="tag-ke bg-secondary/90 text-secondary-foreground">{selectedLocation.category}</span>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <h2 className="font-display text-3xl font-bold text-foreground mb-4">{selectedLocation.name}</h2>
                  <p className="text-muted-foreground font-body text-lg mb-6">{selectedLocation.fullDescription}</p>

                  {/* Features */}
                  <div className="mb-6">
                    <h3 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Compass size={20} className="text-secondary" /> Key Features
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedLocation.features.map((feature, idx) => (
                        <span key={idx} className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-ui">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* History */}
                  {selectedLocation.history && (
                    <div className="mb-6 p-4 bg-muted/50 rounded-xl">
                      <h3 className="font-display text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Navigation size={20} className="text-accent" /> Historical Background
                      </h3>
                      <p className="text-muted-foreground font-body">{selectedLocation.history}</p>
                    </div>
                  )}

                  {/* Visitor Tips */}
                  {selectedLocation.visitorTips && (
                    <div className="mb-6">
                      <h3 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Info size={20} className="text-secondary" /> Visitor Tips
                      </h3>
                      <ul className="space-y-2">
                        {selectedLocation.visitorTips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0" />
                            <span className="font-body">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                    <button className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold hover:bg-secondary/90 transition-colors">
                      <Camera size={18} /> Save to Favorites
                    </button>
                    <button className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-muted text-muted-foreground rounded-lg font-ui font-semibold hover:bg-muted/80 transition-colors">
                      <MapPin size={18} /> Get Directions
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Plan Your Visit
            </h2>
            <p className="text-primary-foreground/70 font-body text-lg max-w-xl mx-auto mb-8">
              Experience the beauty and culture of Ke Kingdom in person. Contact us to arrange your visit.
            </p>
            <a
              href="/visit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all shadow-[var(--shadow-gold)]"
            >
              Plan Your Trip <ChevronRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}