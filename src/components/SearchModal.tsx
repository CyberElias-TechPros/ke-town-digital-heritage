import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, FileText, Image, MapPin, Calendar, Users, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string;
  url: string;
  image?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    const searchContent = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const data = await api.search(query);
        setResults(data as SearchResult[]);
      } catch (err: any) {
        setError(err.message || "Search failed");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchContent, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "news":
        return <FileText size={16} />;
      case "gallery":
        return <Image size={16} />;
      case "event":
        return <Calendar size={16} />;
      case "environment":
        return <Leaf size={16} />;
      case "diaspora":
        return <Users size={16} />;
      case "visit":
        return <MapPin size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "news":
        return "News";
      case "gallery":
        return "Gallery";
      case "event":
        return "Event";
      case "environment":
        return "Environment";
      case "diaspora":
        return "Diaspora";
      case "visit":
        return "Visit";
      default:
        return type;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-primary/80 backdrop-blur-md flex items-start justify-center pt-20 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Search size={20} className="text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search news, events, gallery, and more..."
                className="flex-1 bg-transparent text-foreground font-ui text-base focus:outline-none placeholder:text-muted-foreground"
              />
              {isLoading && <Loader2 size={20} className="animate-spin text-muted-foreground" />}
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {error && (
                <div className="p-4 text-center text-destructive font-ui text-sm">
                  {error}
                </div>
              )}

              {!error && query.trim().length >= 2 && !isLoading && results.length === 0 && (
                <div className="p-8 text-center">
                  <Search size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground font-ui">No results found for "{query}"</p>
                  <p className="text-muted-foreground/60 font-ui text-sm mt-1">Try different keywords</p>
                </div>
              )}

              {!error && query.trim().length < 2 && (
                <div className="p-8 text-center">
                  <Search size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground font-ui">Start typing to search</p>
                  <p className="text-muted-foreground/60 font-ui text-sm mt-1">Search across news, events, gallery, and more</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="py-2">
                  {results.map((result) => (
                    <Link
                      key={result.id}
                      to={result.url}
                      onClick={onClose}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      {result.image ? (
                        <img
                          src={result.image}
                          alt={result.title}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                          {getTypeIcon(result.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-ui text-secondary bg-secondary/10 px-2 py-0.5 rounded">
                            {getTypeLabel(result.type)}
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-semibold text-foreground truncate">
                          {result.title}
                        </h4>
                        <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-2">
                          {result.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-ui">
                <span>Press ESC to close</span>
                <span>⌘K to open search</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;