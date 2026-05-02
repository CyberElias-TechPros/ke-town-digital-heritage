import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Eye, Heart, MessageCircle, Calendar,
  DollarSign, ShoppingCart, Clock, Globe, BarChart3,
  PieChart, Activity, Download, Filter, RefreshCw,
  AlertCircle, CheckCircle, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalPosts: number;
    totalEvents: number;
    totalMarketplaceItems: number;
    totalRevenue: number;
    engagementRate: number;
    retentionRate: number;
  };
  userMetrics: {
    dailyActiveUsers: Array<{ date: string; count: number }>;
    weeklyActiveUsers: Array<{ week: string; count: number }>;
    monthlyActiveUsers: Array<{ month: string; count: number }>;
    userGrowth: Array<{ period: string; newUsers: number; totalUsers: number }>;
    userDemographics: {
      ageGroups: Array<{ range: string; count: number; percentage: number }>;
      locations: Array<{ country: string; city: string; count: number }>;
      devices: Array<{ type: string; count: number; percentage: number }>;
    };
  };
  contentMetrics: {
    postEngagement: Array<{
      date: string;
      posts: number;
      likes: number;
      comments: number;
      shares: number;
      views: number;
    }>;
    topContent: Array<{
      id: string;
      type: 'post' | 'event' | 'marketplace' | 'story';
      title: string;
      engagement: number;
      views: number;
      likes: number;
      comments: number;
    }>;
    contentCategories: Array<{
      category: string;
      count: number;
      engagement: number;
      growth: number;
    }>;
  };
  marketplaceMetrics: {
    salesData: Array<{
      date: string;
      revenue: number;
      orders: number;
      items: number;
      avgOrderValue: number;
    }>;
    topProducts: Array<{
      id: string;
      name: string;
      price: number;
      sales: number;
      revenue: number;
      rating: number;
    }>;
    sellerPerformance: Array<{
      id: string;
      name: string;
      products: number;
      sales: number;
      revenue: number;
      rating: number;
    }>;
  };
  eventsMetrics: {
    attendanceData: Array<{
      date: string;
      events: number;
      totalAttendees: number;
      avgAttendance: number;
    }>;
    upcomingEvents: Array<{
      id: string;
      title: string;
      date: string;
      registered: number;
      capacity: number;
      category: string;
    }>;
    eventCategories: Array<{
      category: string;
      count: number;
      attendance: number;
      satisfaction: number;
    }>;
  };
  culturalMetrics: {
    storiesRecorded: Array<{
      date: string;
      count: number;
      duration: number;
      languages: string[];
    }>;
    culturalCategories: Array<{
      category: string;
      count: number;
      engagement: number;
      preservation: number;
    }>;
    languageDistribution: Array<{
      language: string;
      count: number;
      percentage: number;
    }>;
  };
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
}

const timeRanges = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '1y', label: 'Last year' },
  { id: 'all', label: 'All time' },
];

export function AnalyticsDashboard() {
  const { user, token, isAdmin } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (token && isAdmin) {
      loadAnalyticsData();
    }
  }, [token, selectedTimeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalytics(token, selectedTimeRange);
      setAnalyticsData(data as AnalyticsData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await loadAnalyticsData();
    } finally {
      setRefreshing(false);
    }
  };

  const exportData = async (format: 'csv' | 'json' | 'pdf') => {
    setExporting(true);
    try {
      await api.exportAnalytics(token, selectedTimeRange, format);
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'decrease':
        return <ArrowDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-500';
      case 'decrease':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
          <p className="text-gray-500">You need administrator privileges to view analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const metricCards: MetricCard[] = analyticsData ? [
    {
      title: 'Total Users',
      value: formatNumber(analyticsData.overview.totalUsers),
      change: 12.5,
      changeType: 'increase',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Users',
      value: formatNumber(analyticsData.overview.activeUsers),
      change: 8.3,
      changeType: 'increase',
      icon: Activity,
      color: 'bg-green-500',
    },
    {
      title: 'Total Posts',
      value: formatNumber(analyticsData.overview.totalPosts),
      change: -2.1,
      changeType: 'decrease',
      icon: MessageCircle,
      color: 'bg-purple-500',
    },
    {
      title: 'Total Events',
      value: formatNumber(analyticsData.overview.totalEvents),
      change: 15.7,
      changeType: 'increase',
      icon: Calendar,
      color: 'bg-orange-500',
    },
    {
      title: 'Marketplace Items',
      value: formatNumber(analyticsData.overview.totalMarketplaceItems),
      change: 5.2,
      changeType: 'increase',
      icon: ShoppingCart,
      color: 'bg-pink-500',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(analyticsData.overview.totalRevenue),
      change: 22.4,
      changeType: 'increase',
      icon: DollarSign,
      color: 'bg-emerald-500',
    },
    {
      title: 'Engagement Rate',
      value: formatPercentage(analyticsData.overview.engagementRate),
      change: 3.8,
      changeType: 'increase',
      icon: Heart,
      color: 'bg-red-500',
    },
    {
      title: 'Retention Rate',
      value: formatPercentage(analyticsData.overview.retentionRate),
      change: -1.2,
      changeType: 'decrease',
      icon: TrendingUp,
      color: 'bg-indigo-500',
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Comprehensive insights into KE Kingdom performance</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Time Range Selector */}
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                {timeRanges.map((range) => (
                  <option key={range.id} value={range.id}>
                    {range.label}
                  </option>
                ))}
              </select>
              
              {/* Export Button */}
              <div className="relative">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  disabled={exporting}
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
                {exporting && (
                  <div className="absolute top-full mt-1 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-10">
                    <button
                      onClick={() => exportData('csv')}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => exportData('json')}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      Export as JSON
                    </button>
                    <button
                      onClick={() => exportData('pdf')}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={refreshData}
                className="p-2 text-gray-600 hover:text-primary transition-colors"
                disabled={refreshing}
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricCards.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${metric.color} rounded-lg`}>
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 ${getChangeColor(metric.changeType)}`}>
                  {getChangeIcon(metric.changeType)}
                  <span className="text-sm font-medium">
                    {Math.abs(metric.change)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {metric.title}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Growth</h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                <p>User growth chart will be rendered here</p>
              </div>
            </div>
          </div>

          {/* Engagement Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Engagement Overview</h3>
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-2" />
                <p>Engagement metrics will be rendered here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performing Content</h3>
            <Eye className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {analyticsData?.contentMetrics.topContent.slice(0, 5).map((content, index) => (
              <div key={content.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{content.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">{content.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span>{formatNumber(content.views)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-gray-400" />
                    <span>{formatNumber(content.likes)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                    <span>{formatNumber(content.comments)}</span>
                  </div>
                  <div className="font-semibold text-primary">
                    {formatNumber(content.engagement)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cultural Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stories Recorded */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cultural Stories</h3>
              <Globe className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {analyticsData?.culturalMetrics.culturalCategories.slice(0, 3).map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{category.category}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formatNumber(category.count)} stories
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-primary">
                      {formatPercentage(category.engagement)}
                    </div>
                    <div className="text-xs text-gray-500">engagement</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Language Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Language Distribution</h3>
              <Globe className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {analyticsData?.culturalMetrics.languageDistribution.slice(0, 3).map((lang) => (
                <div key={lang.language} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{lang.language}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formatNumber(lang.count)} recordings
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-primary">
                      {formatPercentage(lang.percentage)}
                    </div>
                    <div className="text-xs text-gray-500">share</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Marketplace Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Products</h3>
              <ShoppingCart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {analyticsData?.marketplaceMetrics.topProducts.slice(0, 3).map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formatNumber(product.sales)} sold
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-primary">
                      {formatCurrency(product.revenue)}
                    </div>
                    <div className="text-xs text-gray-500">revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
