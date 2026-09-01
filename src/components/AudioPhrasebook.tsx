import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, ChevronDown, ChevronUp, Search } from "lucide-react";

interface Phrase {
  id: string;
  kalabari: string;
  english: string;
  pronunciation?: string;
  context?: string;
  category: string;
  audioUrl?: string;
}

interface AudioPhrasebookProps {
  phrases: Phrase[];
  title?: string;
  subtitle?: string;
}

const AudioPhrasebook = ({
  phrases,
  title = "Kalabari Phrasebook",
  subtitle = "Learn basic phrases in the Kalabari (Awome) language",
}: AudioPhrasebookProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get unique categories
  const categories = Array.from(new Set(phrases.map((p) => p.category)));

  // Filter phrases
  const filteredPhrases = phrases.filter((phrase) => {
    const matchesSearch =
      phrase.kalabari.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phrase.english.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || phrase.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group phrases by category
  const groupedPhrases = filteredPhrases.reduce((acc, phrase) => {
    if (!acc[phrase.category]) {
      acc[phrase.category] = [];
    }
    acc[phrase.category].push(phrase);
    return acc;
  }, {} as Record<string, Phrase[]>);

  const handlePlay = (phrase: Phrase) => {
    if (playingId === phrase.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      // Simulate audio playback (in real app, would use actual audio files)
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(phrase.id);

      // Auto-stop after 2 seconds (simulated)
      setTimeout(() => {
        setPlayingId(null);
      }, 2000);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground font-body">{subtitle}</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search phrases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-ui text-sm transition-all ${
              !selectedCategory
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-ui text-sm transition-all ${
                selectedCategory === category
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Phrases List */}
      <div className="space-y-6">
        {Object.entries(groupedPhrases).map(([category, categoryPhrases]) => (
          <div key={category}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              {category}
            </h3>
            <div className="space-y-3">
              {categoryPhrases.map((phrase) => (
                <motion.div
                  key={phrase.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl border border-border overflow-hidden shadow-[var(--shadow-card)]"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleExpand(phrase.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlay(phrase);
                            }}
                            className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary hover:bg-secondary/20 transition-colors"
                          >
                            {playingId === phrase.id ? (
                              <Pause size={18} />
                            ) : (
                              <Play size={18} />
                            )}
                          </button>
                          <div>
                            <h4 className="font-display text-lg font-semibold text-foreground">
                              {phrase.kalabari}
                            </h4>
                            <p className="text-sm text-muted-foreground font-body">
                              {phrase.english}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {phrase.pronunciation && (
                          <span className="text-xs font-ui text-muted-foreground bg-muted px-2 py-1 rounded">
                            /{phrase.pronunciation}/
                          </span>
                        )}
                        {expandedId === phrase.id ? (
                          <ChevronUp size={18} className="text-muted-foreground" />
                        ) : (
                          <ChevronDown size={18} className="text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === phrase.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border"
                      >
                        <div className="p-4 bg-muted/20">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-ui text-muted-foreground uppercase tracking-wider">
                                Context
                              </span>
                              <p className="text-sm text-foreground font-body mt-1">
                                {phrase.context}
                              </p>
                            </div>
                            {phrase.pronunciation && (
                              <div>
                                <span className="text-xs font-ui text-muted-foreground uppercase tracking-wider">
                                  Pronunciation
                                </span>
                                <p className="text-sm text-foreground font-body mt-1">
                                  {phrase.pronunciation}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex items-center gap-2">
                            <button
                              onClick={() => handlePlay(phrase)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui text-sm hover:bg-secondary/90 transition-all"
                            >
                              {playingId === phrase.id ? (
                                <>
                                  <Pause size={14} />
                                  Playing...
                                </>
                              ) : (
                                <>
                                  <Play size={14} />
                                  Play Audio
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setIsMuted(!isMuted)}
                              className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                            >
                              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredPhrases.length === 0 && (
        <div className="text-center py-12">
          <Search size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground font-ui">No phrases found</p>
          <p className="text-muted-foreground/60 font-ui text-sm mt-1">
            Try adjusting your search or filter
          </p>
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio ref={audioRef} muted={isMuted} />
    </div>
  );
};

export default AudioPhrasebook;