import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { Search, Filter, X, ChevronDown, Calendar, User, Tag, MapPin, Clock, FileText, ShoppingBag, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SearchFilters {
  query: string;
  type: 'all' | 'posts' | 'people' | 'marketplace' | 'events' | 'groups' | 'stories';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  category?: string;
  location?: string;
  tags?: string[];
  sortBy: 'relevance' | 'date' | 'popularity';
  sortOrder: 'asc' | 'desc';
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  content?: string;
  author?: {
    id: string;
    fullName: string;
    avatar?: string;
  };
  url: string;
  createdAt: string;
  relevance: number;
  highlights?: {
    title?: string[];
    content?: string[];
  };
  metadata?: Record<string, any>;
}

const searchTypes = [
  { id: 'all', label: 'All Results', icon: Search },
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'people', label: 'People', icon: User },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'groups', label: 'Groups', icon: User },
  { id: 'stories', label: 'Stories', icon: BookOpen },
];

const sortOptions = [
  { id: 'relevance', label: 'Most Relevant' },
  { id: 'date', label: 'Most Recent' },
  { id: 'popularity', label: 'Most Popular' },
];

const dateRanges = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
];

export function AdvancedSearch({ onResults }: { onResults?: (results: SearchResult[]) => void }) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: 'all',
    dateRange: 'all',
    sortBy: 'relevance',
    sortOrder: 'desc',
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Get search suggestions
  const { data: suggestionsData } = useQuery({
    queryKey: ['search-suggestions', filters.query],
    queryFn: () => api.getSearchSuggestions(filters.query),
    enabled: filters.query.length > 2,
  });

  // Main search query
  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['search', filters],
    queryFn: () => performSearch(filters),
    enabled: filters.query.length > 0,
  });

  // Update suggestions when data changes
  useEffect(() => {
    if (suggestionsData && Array.isArray(suggestionsData)) {
      setSuggestions(suggestionsData.slice(0, 5));
    }
  }, [suggestionsData]);

  // Update results when data changes
  useEffect(() => {
    if (searchResults && onResults) {
      onResults(searchResults);
    }
  }, [searchResults, onResults]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (filters.query.length > 0) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        refetch().finally(() => setIsSearching(false));
      }, 300);
    } else {
      setIsSearching(false);
    }
  }, [filters.query, refetch]);

  const performSearch = async (searchFilters: SearchFilters): Promise<SearchResult[]> => {
    try {
      const params = new URLSearchParams();
      params.set('q', searchFilters.query);
      params.set('type', searchFilters.type);
      params.set('dateRange', searchFilters.dateRange);
      params.set('sortBy', searchFilters.sortBy);
      params.set('sortOrder', searchFilters.sortOrder);
      
      if (searchFilters.category) params.set('category', searchFilters.category);
      if (searchFilters.location) params.set('location', searchFilters.location);
      if (searchFilters.tags?.length) params.set('tags', searchFilters.tags.join(','));

      const response = await api.search(searchFilters.query, searchFilters.type);
      
      // Transform response to SearchResult format
      return transformSearchResults(response, searchFilters);
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  };

  const transformSearchResults = (data: any, searchFilters: SearchFilters): SearchResult[] => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map((item: any) => ({
      id: item._id || item.id,
      type: item.type || determineType(item),
      title: item.title || item.name || extractTitle(item),
      description: item.description || item.excerpt,
      content: item.content,
      author: item.author || item.user || item.createdBy,
      url: generateUrl(item),
      createdAt: item.createdAt || item.publishedAt || item.date,
      relevance: calculateRelevance(item, searchFilters.query),
      highlights: item.highlights,
      metadata: extractMetadata(item),
    }));
  };

  const determineType = (item: any): string => {
    if (item.content || item.postType) return 'posts';
    if (item.fullName || item.username) return 'people';
    if (item.price || item.category === 'marketplace') return 'marketplace';
    if (item.eventDate || item.startDate) return 'events';
    if (item.memberCount || item.isGroup) return 'groups';
    if (item.storyType || item.elderName) return 'stories';
    return 'posts';
  };

  const extractTitle = (item: any): string => {
    return item.title || item.name || item.fullName || 
           (item.content ? item.content.substring(0, 100) + '...' : 'Untitled');
  };

  const generateUrl = (item: any): string => {
    const type = determineType(item);
    const id = item._id || item.id;
    
    switch (type) {
      case 'posts': return `/posts/${id}`;
      case 'people': return `/profile/${id}`;
      case 'marketplace': return `/product/${id}`;
      case 'events': return `/events/${id}`;
      case 'groups': return `/groups/${id}`;
      case 'stories': return `/elder-stories/${id}`;
      default: return `/search?q=${encodeURIComponent(item.title || '')}`;
    }
  };

  const calculateRelevance = (item: any, query: string): number => {
    const title = (item.title || item.name || '').toLowerCase();
    const content = (item.content || item.description || '').toLowerCase();
    const searchQuery = query.toLowerCase();
    
    let score = 0;
    
    // Exact title match
    if (title === searchQuery) score += 100;
    // Title contains query
    else if (title.includes(searchQuery)) score += 50;
    // Content contains query
    if (content.includes(searchQuery)) score += 25;
    
    // Boost recent items
    if (item.createdAt) {
      const daysSince = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysSince);
    }
    
    return score;
  };

  const extractMetadata = (item: any): Record<string, any> => {
    const metadata: Record<string, any> = {};
    
    if (item.category) metadata.category = item.category;
    if (item.location) metadata.location = item.location;
    if (item.tags) metadata.tags = item.tags;
    if (item.price) metadata.price = item.price;
    if (item.eventDate) metadata.eventDate = item.eventDate;
    if (item.memberCount) metadata.memberCount = item.memberCount;
    if (item.isVerified) metadata.isVerified = item.isVerified;
    
    return metadata;
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      type: 'all',
      dateRange: 'all',
      sortBy: 'relevance',
      sortOrder: 'desc',
    });
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFilters(prev => ({ ...prev, query: suggestion }));
    setShowFilters(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={inputRef}
            type="text"
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            onFocus={() => setShowFilters(true)}
            placeholder="Search posts, people, marketplace, events..."
            className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {filters.query && (
            <button
              onClick={clearFilters}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Suggestions */}
        {showFilters && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
              >
                <Search className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        {/* Type Filter */}
        <div className="relative">
          <button
            onClick={() => document.getElementById('type-dropdown')?.classList.toggle('hidden')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {searchTypes.find(t => t.id === filters.type)?.icon && (
              <span className="w-4 h-4">{React.createElement(searchTypes.find(t => t.id === filters.type)!.icon)}</span>
            )}
            <span>{searchTypes.find(t => t.id === filters.type)?.label}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <div id="type-dropdown" className="hidden absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[150px]">
            {searchTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  handleFilterChange('type', type.id);
                  document.getElementById('type-dropdown')?.classList.add('hidden');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="w-4 h-4">{React.createElement(type.icon)}</span>
                <span className="text-sm">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="relative">
          <button
            onClick={() => document.getElementById('date-dropdown')?.classList.toggle('hidden')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Clock className="w-4 h-4" />
            <span>{dateRanges.find(d => d.id === filters.dateRange)?.label}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <div id="date-dropdown" className="hidden absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[120px]">
            {dateRanges.map((range) => (
              <button
                key={range.id}
                onClick={() => {
                  handleFilterChange('dateRange', range.id);
                  document.getElementById('date-dropdown')?.classList.add('hidden');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm first:rounded-t-lg last:rounded-b-lg"
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Filter */}
        <div className="relative">
          <button
            onClick={() => document.getElementById('sort-dropdown')?.classList.toggle('hidden')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="w-4 h-4" />
            <span>{sortOptions.find(s => s.id === filters.sortBy)?.label}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <div id="sort-dropdown" className="hidden absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[140px]">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  handleFilterChange('sortBy', option.id);
                  document.getElementById('sort-dropdown')?.classList.add('hidden');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm first:rounded-t-lg last:rounded-b-lg"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location Filter */}
        <input
          type="text"
          value={filters.location || ''}
          onChange={(e) => handleFilterChange('location', e.target.value)}
          placeholder="Location..."
          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        />

        {/* Clear Filters */}
        {(filters.type !== 'all' || filters.dateRange !== 'all' || filters.location) && (
          <button
            onClick={() => {
              setFilters(prev => ({
                ...prev,
                type: 'all',
                dateRange: 'all',
                location: '',
              }));
            }}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loading Indicator */}
      {isSearching && (
        <div className="mt-4 flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Searching...</span>
        </div>
      )}
    </div>
  );
}
