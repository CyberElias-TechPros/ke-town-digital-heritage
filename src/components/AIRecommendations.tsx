import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Sparkles, TrendingUp, Users, Calendar, BookOpen,
  Heart, MessageCircle, Share2, Clock, ArrowRight, RefreshCw,
  Filter, ChevronDown, X, CheckCircle, AlertCircle
} from 'lucide-react';
import { api, asList } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Recommendation {
  id: string;
  type: 'post' | 'event' | 'marketplace' | 'story' | 'user' | 'group';
  title: string;
  description?: string;
  content?: string;
  author?: {
    id: string;
    fullName: string;
    avatar?: string;
  };
  image?: string;
  url: string;
  score: number;
  reasons: string[];
  metadata: {
    category?: string;
    tags?: string[];
    location?: string;
    date?: string;
    price?: number;
    attendees?: number;
    rating?: number;
    language?: string;
  };
}

interface RecommendationProfile {
  interests: string[];
  categories: string[];
  locations: string[];
  languages: string[];
  priceRange: {
    min: number;
    max: number;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  behavior: {
    viewingTime: number;
    clickThrough: number;
    conversion: number;
  };
}

const recommendationTypes = [
  { id: 'all', label: 'All Recommendations', icon: Sparkles },
  { id: 'content', label: 'Content', icon: BookOpen },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'marketplace', label: 'Marketplace', icon: TrendingUp },
  { id: 'people', label: 'People', icon: Users },
  { id: 'cultural', label: 'Cultural', icon: Brain },
];

const categories = [
  'History', 'Culture', 'Traditions', 'Language', 'Music', 'Art',
  'Food', 'Fashion', 'Business', 'Education', 'Technology', 'Entertainment'
];

const interests = [
  'Kalabari History', 'Nigerian Culture', 'Traditional Music', 'Local Art',
  'Cultural Events', 'Heritage Preservation', 'Community Stories', 'Local Business',
  'Education', 'Technology', 'Sustainable Development', 'Tourism'
];

export function AIRecommendations() {
  const { user, token } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [profile, setProfile] = useState<RecommendationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  useEffect(() => {
    if (token) {
      loadRecommendations();
      loadUserProfile();
    }
  }, [token, selectedType]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const data = await api.getAIRecommendations(token, selectedType);
      setRecommendations(asList<Recommendation>(data));
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const data = await api.getRecommendationProfile(token);
      setProfile(data as RecommendationProfile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Set default profile
      setProfile({
        interests: [],
        categories: [],
        locations: [],
        languages: ['en'],
        priceRange: { min: 0, max: 100000 },
        engagement: { likes: 0, comments: 0, shares: 0 },
        behavior: { viewingTime: 0, clickThrough: 0, conversion: 0 }
      });
    }
  };

  const refreshRecommendations = async () => {
    setRefreshing(true);
    try {
      await loadRecommendations();
    } finally {
      setRefreshing(false);
    }
  };

  const updateProfile = async (newProfile: RecommendationProfile) => {
    try {
      await api.updateRecommendationProfile(token, newProfile);
      setProfile(newProfile);
      setShowProfileEditor(false);
      // Refresh recommendations with new profile
      await loadRecommendations();
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleRecommendationClick = async (recommendation: Recommendation) => {
    try {
      // Track interaction for better recommendations
      await api.trackRecommendationInteraction(token, recommendation.id, recommendation.type);
      
      // Navigate to the content
      window.location.href = recommendation.url;
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  };

  const dismissRecommendation = async (recommendationId: string) => {
    try {
      await api.dismissRecommendation(token, recommendationId);
      setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
    } catch (error) {
      console.error('Failed to dismiss recommendation:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return BookOpen;
      case 'event': return Calendar;
      case 'marketplace': return TrendingUp;
      case 'story': return Brain;
      case 'user': return Users;
      case 'group': return Users;
      default: return Sparkles;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'post': return 'bg-blue-500';
      case 'event': return 'bg-green-500';
      case 'marketplace': return 'bg-purple-500';
      case 'story': return 'bg-orange-500';
      case 'user': return 'bg-pink-500';
      case 'group': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const formatScore = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Recommendations</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Personalized content based on your interests and behavior
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowProfileEditor(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Brain className="w-4 h-4" />
                Edit Profile
              </button>
              <button
                onClick={refreshRecommendations}
                className="p-2 text-gray-600 hover:text-primary transition-colors"
                disabled={refreshing}
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Type Selector */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 py-4 overflow-x-auto">
            {recommendationTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  selectedType === type.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <type.icon className="w-4 h-4" />
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Summary */}
        {profile && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Recommendation Profile</h3>
              <button
                onClick={() => setShowProfileEditor(true)}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Interests</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.slice(0, 3).map((interest) => (
                    <span key={interest} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      {interest}
                    </span>
                  ))}
                  {profile.interests.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                      +{profile.interests.length - 3} more
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.categories.slice(0, 3).map((category) => (
                    <span key={category} className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs">
                      {category}
                    </span>
                  ))}
                  {profile.categories.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                      +{profile.categories.length - 3} more
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((language) => (
                    <span key={language} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {recommendations.map((recommendation, index) => (
            <motion.div
              key={recommendation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 ${getTypeColor(recommendation.type)} rounded-lg`}>
                      {React.createElement(getTypeIcon(recommendation.type), { className: 'w-4 h-4 text-white' })}
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {recommendation.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary">
                      {formatScore(recommendation.score)}
                    </span>
                    <button
                      onClick={() => dismissRecommendation(recommendation.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {recommendation.title}
                </h3>
                
                {recommendation.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                    {recommendation.description}
                  </p>
                )}

                {/* Recommendation Reasons */}
                <div className="space-y-1">
                  {recommendation.reasons.slice(0, 2).map((reason, reasonIndex) => (
                    <div key={reasonIndex} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {recommendation.image && (
                  <div className="mb-4">
                    <img
                      src={recommendation.image}
                      alt={recommendation.title}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-2 mb-4">
                  {recommendation.author && (
                    <div className="flex items-center gap-2">
                      <img
                        src={recommendation.author.avatar || '/default-avatar.png'}
                        alt={recommendation.author.fullName}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {recommendation.author.fullName}
                      </span>
                    </div>
                  )}

                  {recommendation.metadata.category && (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                        {recommendation.metadata.category}
                      </span>
                    </div>
                  )}

                  {recommendation.metadata.price && (
                    <div className="text-sm font-semibold text-green-600">
                      ₦{recommendation.metadata.price.toLocaleString()}
                    </div>
                  )}

                  {recommendation.metadata.attendees && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{recommendation.metadata.attendees} attending</span>
                    </div>
                  )}

                  {recommendation.metadata.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(recommendation.metadata.rating!)
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        >
                          ★
                        </div>
                      ))}
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                        {recommendation.metadata.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Engagement Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {recommendation.metadata.date && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(recommendation.metadata.date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleRecommendationClick(recommendation)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <span>View {recommendation.type}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {recommendations.length === 0 && (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No recommendations yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start interacting with content to get personalized recommendations
            </p>
            <button
              onClick={() => setShowProfileEditor(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Set Up Your Profile
            </button>
          </div>
        )}
      </div>

      {/* Profile Editor Modal */}
      {showProfileEditor && profile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Edit Recommendation Profile
              </h3>
              <button
                onClick={() => setShowProfileEditor(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ProfileEditorForm
              profile={profile}
              onSave={updateProfile}
              onCancel={() => setShowProfileEditor(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Profile Editor Form Component
function ProfileEditorForm({
  profile,
  onSave,
  onCancel
}: {
  profile: RecommendationProfile;
  onSave: (profile: RecommendationProfile) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<RecommendationProfile>(profile);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Interests
        </label>
        <div className="grid grid-cols-2 gap-2">
          {interests.map((interest) => (
            <label key={interest} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.interests.includes(interest)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({
                      ...prev,
                      interests: [...prev.interests, interest]
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      interests: prev.interests.filter(i => i !== interest)
                    }));
                  }
                }}
                className="rounded text-primary"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{interest}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Categories
        </label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((category) => (
            <label key={category} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.categories.includes(category)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({
                      ...prev,
                      categories: [...prev.categories, category]
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      categories: prev.categories.filter(c => c !== category)
                    }));
                  }
                }}
                className="rounded text-primary"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Languages
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['en', 'kal', 'pidgin', 'ig', 'yo'].map((lang) => (
            <label key={lang} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.languages.includes(lang)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({
                      ...prev,
                      languages: [...prev.languages, lang]
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      languages: prev.languages.filter(l => l !== lang)
                    }));
                  }
                }}
                className="rounded text-primary"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {lang === 'en' ? 'English' : lang === 'kal' ? 'Kalabari' : lang === 'pidgin' ? 'Nigerian Pidgin' : lang === 'ig' ? 'Igbo' : 'Yoruba'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Price Range (₦)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Min</label>
            <input
              type="number"
              value={formData.priceRange.min}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                priceRange: { ...prev.priceRange, min: parseInt(e.target.value) || 0 }
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Max</label>
            <input
              type="number"
              value={formData.priceRange.max}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                priceRange: { ...prev.priceRange, max: parseInt(e.target.value) || 0 }
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving}
        >
          {saving ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </div>
          ) : (
            'Save Profile'
          )}
        </button>
      </div>
    </form>
  );
}
