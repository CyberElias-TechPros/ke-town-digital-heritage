import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Clock, User, Tag, ChevronRight, Search, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import SEO from "@/components/PageSEO";
import { api, asList } from "@/lib/api";

interface ElderStory {
  _id: string;
  title: string;
  description: string;
  elderName: string;
  elderPhoto?: string;
  elderTitle?: string;
  content?: string;
  audioUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  category: string;
  tags?: string[];
  language: string;
  transcript?: string;
  isFeatured: boolean;
}

const categories = [
  { id: "all", label: "All Stories" },
  { id: "history", label: "History" },
  { id: "tradition", label: "Traditions" },
  { id: "customs", label: "Customs" },
  { id: "war-canoe", label: "War Canoe" },
  { id: "masquerade", label: "Masquerade" },
  { id: "fishing", label: "Fishing" },
  { id: "marriage", label: "Marriage" },
  { id: "spirituality", label: "Spirituality" },
];

export default function ElderStories() {
  const [stories, setStories] = useState<ElderStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStory, setSelectedStory] = useState<ElderStory | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    loadStories();
  }, [selectedCategory]);

  const loadStories = async () => {
    setLoading(true);
    setError("");
    try {
      const category = selectedCategory === "all" ? undefined : selectedCategory;
      const data = await api.getElderStories(category);
      setStories(asList<ElderStory>(data));
    } catch (err: any) {
      console.error("Failed to load stories:", err);
      setError(err.message || "Unable to load stories");
    } finally {
      setLoading(false);
    }
  };

  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.elderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || story.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredStory = filteredStories.find(s => s.isFeatured) || filteredStories[0];

  const handlePlay = (story: ElderStory) => {
    if (playingId === story._id) {
      setPlayingId(null);
    } else {
      setPlayingId(story._id);
      setSelectedStory(story);
      setTimeout(() => setPlayingId(null), 2000);
    }
  };

  return (
    <Layout>
      <SEO page="/elder-stories" />
      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">Oral History</span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Elder <span className="text-gradient-gold">Stories</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-lg max-w-2xl mx-auto">
              Listen to the wisdom of our elders — preserved oral histories, traditions, and cultural knowledge passed down through generations.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Story */}
      {featuredStory && (
        <section className="py-12 bg-muted/50">
          <div className="container-narrow px-4">
            <SectionHeading title="Featured Story" subtitle="A highlighted oral history from our collection" />
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-border overflow-hidden shadow-[var(--shadow-elevated)]"
            >
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative h-64 md:h-auto bg-gradient-to-br from-secondary/20 to-accent/20">
                  {featuredStory.thumbnailUrl ? (
                    <img 
                      src={featuredStory.thumbnailUrl} 
                      alt={featuredStory.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={64} className="text-secondary/30" />
                    </div>
                  )}
                  <button 
                    onClick={() => handlePlay(featuredStory)}
                    className="absolute inset-0 flex items-center justify-center bg-primary/40 hover:bg-primary/30 transition-colors"
                  >
                    <div className="w-20 h-20 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:scale-110 transition-transform">
                      {playingId === featuredStory._id ? (
                        <Pause size={32} />
                      ) : (
                        <Play size={32} className="ml-1" />
                      )}
                    </div>
                  </button>
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="tag-ke bg-secondary/10 text-secondary">{featuredStory.category}</span>
                    {featuredStory.duration && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock size={14} /> {featuredStory.duration}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground mb-2">{featuredStory.title}</h3>
                  <p className="text-muted-foreground font-body mb-4">{featuredStory.description}</p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                      <User size={20} className="text-secondary" />
                    </div>
                    <div>
                      <p className="font-ui font-semibold text-foreground">{featuredStory.elderName}</p>
                      {featuredStory.elderTitle && (
                        <p className="text-sm text-muted-foreground">{featuredStory.elderTitle}</p>
                      )}
                    </div>
                  </div>
                  {featuredStory.tags && (
                    <div className="flex flex-wrap gap-2">
                      {featuredStory.tags.map((tag, i) => (
                        <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Browse Stories */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Browse Collection" subtitle="Explore our archive of oral histories" />

          {/* Search and Filter */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search stories..."
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

          {/* Stories Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
            </div>
          ) : filteredStories.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStories.map((story, i) => (
                <motion.div
                  key={story._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-xl border border-border overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow cursor-pointer"
                  onClick={() => setSelectedStory(story)}
                >
                  <div className="relative h-40 bg-gradient-to-br from-secondary/10 to-accent/10">
                    {story.thumbnailUrl ? (
                      <img src={story.thumbnailUrl} alt={story.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={48} className="text-secondary/30" />
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlay(story);
                      }}
                      className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      {playingId === story._id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                    </button>
                    {story.duration && (
                      <span className="absolute top-3 right-3 bg-primary/80 text-primary-foreground text-xs px-2 py-1 rounded">
                        {story.duration}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-ui text-secondary bg-secondary/10 px-2 py-0.5 rounded">
                        {story.category}
                      </span>
                    </div>
                    <h4 className="font-display text-lg font-semibold text-foreground mb-1 line-clamp-2">{story.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{story.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                        <User size={14} className="text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm font-ui font-medium text-foreground">{story.elderName}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No stories found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>

      {/* Story Detail Modal */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedStory(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-64 bg-gradient-to-br from-secondary/20 to-accent/20">
                {selectedStory.thumbnailUrl ? (
                  <img src={selectedStory.thumbnailUrl} alt={selectedStory.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={64} className="text-secondary/30" />
                  </div>
                )}
                <button 
                  onClick={() => handlePlay(selectedStory)}
                  className="absolute inset-0 flex items-center justify-center bg-primary/40 hover:bg-primary/30 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                    {playingId === selectedStory._id ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                  </div>
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="tag-ke bg-secondary/10 text-secondary">{selectedStory.category}</span>
                  {selectedStory.duration && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock size={14} /> {selectedStory.duration}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-2xl font-bold text-foreground mb-2">{selectedStory.title}</h3>
                <p className="text-muted-foreground font-body mb-6">{selectedStory.description}</p>
                
                <div className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-xl">
                  <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center">
                    <User size={24} className="text-secondary" />
                  </div>
                  <div>
                    <p className="font-ui font-semibold text-foreground">{selectedStory.elderName}</p>
                    {selectedStory.elderTitle && (
                      <p className="text-sm text-muted-foreground">{selectedStory.elderTitle}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{selectedStory.language}</p>
                  </div>
                </div>

                {selectedStory.transcript && (
                  <div className="mb-6">
                    <h4 className="font-display text-lg font-semibold text-foreground mb-2">Transcript</h4>
                    <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground font-body max-h-48 overflow-y-auto">
                      {selectedStory.transcript}
                    </div>
                  </div>
                )}

                {selectedStory.tags && (
                  <div className="flex flex-wrap gap-2">
                    {selectedStory.tags.map((tag, i) => (
                      <span key={i} className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">
                        <Tag size={12} className="inline mr-1" />{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}