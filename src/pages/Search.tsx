import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search as SearchIcon, X, Loader2, User, MessageCircle, Store, Calendar, Hash } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";

interface SearchResult {
  type: "user" | "post" | "product" | "event" | "group";
  _id: string;
  fullName?: string;
  name?: string;
  content?: string;
  description?: string;
  avatar?: string;
  images?: string[];
  price?: number;
  date?: string;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await api.search(searchQuery, activeFilter === "all" ? undefined : activeFilter);
      setResults(data as SearchResult[]);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearchParams({ q: query });
    
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(newRecent);
    localStorage.setItem("recentSearches", JSON.stringify(newRecent));
    
    performSearch(query);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case "user":
        navigate(`/profile/${result._id}`);
        break;
      case "post":
        navigate(`/posts/${result._id}`);
        break;
      case "product":
        navigate(`/product/${result._id}`);
        break;
      case "event":
        navigate(`/events/${result._id}`);
        break;
      case "group":
        navigate(`/groups/${result._id}`);
        break;
      default:
        break;
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="w-5 h-5" />;
      case "post":
        return <Hash className="w-5 h-5" />;
      case "product":
        return <Store className="w-5 h-5" />;
      case "event":
        return <Calendar className="w-5 h-5" />;
      case "group":
        return <MessageCircle className="w-5 h-5" />;
      default:
        return <Hash className="w-5 h-5" />;
    }
  };

  const filters = [
    { id: "all", label: "All" },
    { id: "user", label: "People" },
    { id: "post", label: "Posts" },
    { id: "product", label: "Products" },
    { id: "event", label: "Events" },
    { id: "group", label: "Groups" },
  ];

  const filteredResults = activeFilter === "all" 
    ? results 
    : results.filter(r => r.type === activeFilter);

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-4xl mx-auto px-4 py-8"
        >
          {/* Search Header */}
          <div className="mb-6">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search KE Town..."
                className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    setSearchParams({});
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm transition-colors ${
                  activeFilter === filter.id
                    ? "bg-primary text-white"
                    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : query && filteredResults.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-4">
                {filteredResults.length} results for "{query}"
              </p>
              {filteredResults.map((result) => (
                <motion.div
                  key={result._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleResultClick(result)}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                    {result.avatar ? (
                      <img
                        src={result.avatar}
                        alt={result.fullName || result.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : result.images && result.images[0] ? (
                      <img
                        src={result.images[0]}
                        alt={result.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getResultIcon(result.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {result.fullName || result.name || result.content?.slice(0, 50)}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {result.description || result.content?.slice(0, 100)}
                    </p>
                    {result.price && (
                      <p className="text-primary font-semibold mt-1">
                        ₦{result.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 uppercase">
                    {result.type}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : query && filteredResults.length === 0 ? (
            <div className="text-center py-20">
              <SearchIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold mb-2">No results found</h2>
              <p className="text-gray-500">
                Try different keywords or filters
              </p>
            </div>
          ) : (
            <div>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Searches</h2>
                    <button
                      onClick={clearRecentSearches}
                      className="text-sm text-primary hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setQuery(search);
                          setSearchParams({ q: search });
                          performSearch(search);
                        }}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Search Suggestions */}
              {!query && (
                <section>
                  <h2 className="text-lg font-semibold mb-4">Suggestions</h2>
                  <div className="space-y-2">
                    {["Festival", "Textiles", "Events", "Community", "Marketplace"].map(
                      (suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setQuery(suggestion);
                            setSearchParams({ q: suggestion });
                            performSearch(suggestion);
                          }}
                          className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-sm transition-shadow flex items-center gap-3"
                        >
                          <SearchIcon className="w-5 h-5 text-gray-400" />
                          {suggestion}
                        </button>
                      )
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}