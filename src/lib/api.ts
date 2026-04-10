export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  bio?: string;
  location?: string;
  isSeller?: boolean;
  shopName?: string;
  shopVerified?: boolean;
  sellerRating?: number;
  totalSales?: number;
  followers?: string[];
  following?: string[];
  profileVisibility?: 'public' | 'followers' | 'private';
  allowMessages?: boolean;
  showOnlineStatus?: boolean;
}

const API_SERVERS = import.meta.env.VITE_API_SERVERS || 
  (import.meta.env.MODE === 'production' 
    ? 'https://ke-town-digital-heritage-production.up.railway.app,https://kesrv.freegameplay.site'
    : 'https://ke-town-digital-heritage-production.up.railway.app,https://kesrv.freegameplay.site');

console.log('API Servers:', API_SERVERS);

const API_BASE = API_SERVERS.split(',')[0] + '/api';

let workingServer: string | null = null;
let serverHealthStatus: Map<string, boolean> = new Map();

async function getWorkingServer(): Promise<string> {
  const servers = API_SERVERS.split(',').map(s => s.trim());
  
  if (workingServer && serverHealthStatus.get(workingServer) === true) {
    return workingServer;
  }

  for (const server of servers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(server + '/api/health', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        workingServer = server;
        serverHealthStatus.set(server, true);
        return server;
      }
    } catch {
      serverHealthStatus.set(server, false);
    }
  }

  return servers[0];
}

async function clearServerCache() {
  workingServer = null;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const servers = API_SERVERS.split(',').map(s => s.trim());
    let lastError: Error | null = null;

    for (let i = 0; i < servers.length; i++) {
      const server = servers[i];
      const { method = 'GET', body, headers = {}, token } = options;

      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`,
        };
      }

      if (body) {
        config.body = JSON.stringify(body);
      }

      try {
        const url = `${server}/api${endpoint}`;
        console.log(`Trying ${url}...`);
        const response = await fetch(url, config);
        console.log(`Response from ${server}:`, response.status);

        if (response.ok) {
          workingServer = server;
          serverHealthStatus.set(server, true);
          console.log(`Success using ${server}`);
          return response.json();
        }

        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        const errMsg = errorData.error || `HTTP ${response.status}`;
        console.error(`${server} returned ${response.status}: ${errMsg}`);
        throw new Error(errMsg);
      } catch (err: unknown) {
        const error = err as Error;
        console.error(`Server ${server} failed:`, error.message);
        lastError = error;
        serverHealthStatus.set(server, false);
        if (i < servers.length - 1) {
          console.warn(`Trying next server...`);
        }
      }
    }

    throw lastError || new Error('All servers failed');
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    }) as Promise<{ user: User; token: string }>;
  }

  async register(fullName: string, email: string, password: string): Promise<{ user: User; token: string }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: { fullName, email, password },
    }) as Promise<{ user: User; token: string }>;
  }

  async getProfile(token: string): Promise<{ user: User }> {
    return this.request('/auth/me', { token }) as Promise<{ user: User }>;
  }

  async updateProfile(token: string, data: Record<string, unknown>): Promise<{ user: User }> {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: data,
      token,
    }) as Promise<{ user: User }>;
  }

  // Events
  async getEvents() {
    return this.request('/events');
  }

  async getEvent(id: string) {
    return this.request(`/events/${id}`);
  }

  async createEvent(token: string, data: Record<string, unknown>) {
    return this.request('/events', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateEvent(token: string, id: string, data: Record<string, unknown>) {
    return this.request(`/events/${id}`, {
      method: 'PUT',
      body: data,
      token,
    });
  }

  async deleteEvent(token: string, id: string) {
    return this.request(`/events/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // News
  async getNews() {
    return this.request('/news');
  }

  async getNewsItem(id: string) {
    return this.request(`/news/${id}`);
  }

  async createNews(token: string, data: Record<string, unknown>) {
    return this.request('/news', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateNews(token: string, id: string, data: Record<string, unknown>) {
    return this.request(`/news/${id}`, {
      method: 'PUT',
      body: data,
      token,
    });
  }

  async deleteNews(token: string, id: string) {
    return this.request(`/news/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // Gallery
  async getGallery(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request(`/gallery${query}`);
  }

  async createGalleryItem(token: string, data: Record<string, unknown>) {
    return this.request('/gallery', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateGalleryItem(token: string, id: string, data: Record<string, unknown>) {
    return this.request(`/gallery/${id}`, {
      method: 'PUT',
      body: data,
      token,
    });
  }

  async deleteGalleryItem(token: string, id: string) {
    return this.request(`/gallery/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // Directory
  async getDirectory() {
    return this.request('/directory');
  }

  async registerDirectory(data: Record<string, unknown>) {
    return this.request('/directory', {
      method: 'POST',
      body: data,
    });
  }

  // Contact
  async submitContact(data: Record<string, unknown>) {
    return this.request('/contact', {
      method: 'POST',
      body: data,
    });
  }

  // Newsletter
  async subscribeNewsletter(email: string) {
    return this.request('/newsletter', {
      method: 'POST',
      body: { email },
    });
  }

  async unsubscribeNewsletter(email: string) {
    return this.request(`/newsletter/${email}`, {
      method: 'DELETE',
    });
  }

  // Environment
  async getEnvironmentReports() {
    return this.request('/environment');
  }

  async submitEnvironmentReport(data: Record<string, unknown>) {
    return this.request('/environment', {
      method: 'POST',
      body: data,
    });
  }

  // Projects
  async getProjects() {
    return this.request('/projects');
  }

  async createProject(token: string, data: Record<string, unknown>) {
    return this.request('/projects', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateProject(token: string, id: string, data: Record<string, unknown>) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: data,
      token,
    });
  }

  // Search
  async search(query: string, type?: string) {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    return this.request(`/search?${params.toString()}`);
  }

  async getSearchSuggestions(query: string) {
    return this.request(`/search/suggestions?q=${encodeURIComponent(query)}`);
  }

  // Upload
  async uploadFile(token: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/upload/single`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async uploadMultipleFiles(token: string, files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${this.baseUrl}/upload/multiple`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  // Donations
  async initializeDonation(data: Record<string, unknown>) {
    return this.request('/donations/initialize', {
      method: 'POST',
      body: data,
    });
  }

  async verifyDonation(reference: string) {
    return this.request('/donations/verify', {
      method: 'POST',
      body: { reference },
    });
  }

  async getDonationStats() {
    return this.request('/donations/stats');
  }

  async getRecentDonations() {
    return this.request('/donations/recent');
  }

  // Admin
  async getAdminDashboard(token: string) {
    return this.request('/admin/dashboard', { token });
  }

  async getAdminEvents(token: string) {
    return this.request('/admin/events', { token });
  }

  async getAdminNews(token: string) {
    return this.request('/admin/news', { token });
  }

  async getAdminGallery(token: string, approved?: boolean) {
    const query = approved !== undefined ? `?approved=${approved}` : '';
    return this.request(`/admin/gallery${query}`, { token });
  }

  async approveGalleryItem(token: string, id: string) {
    return this.request(`/admin/gallery/${id}/approve`, {
      method: 'PUT',
      token,
    });
  }

  async getAdminDirectory(token: string, approved?: boolean) {
    const query = approved !== undefined ? `?approved=${approved}` : '';
    return this.request(`/admin/directory${query}`, { token });
  }

  async approveDirectoryMember(token: string, id: string) {
    return this.request(`/admin/directory/${id}/approve`, {
      method: 'PUT',
      token,
    });
  }

  async getAdminContacts(token: string, read?: boolean) {
    const query = read !== undefined ? `?read=${read}` : '';
    return this.request(`/admin/contacts${query}`, { token });
  }

  async markContactRead(token: string, id: string) {
    return this.request(`/admin/contacts/${id}/read`, {
      method: 'PUT',
      token,
    });
  }

  async getAdminEnvironment(token: string) {
    return this.request('/admin/environment', { token });
  }

  async getAdminProjects(token: string) {
    return this.request('/admin/projects', { token });
  }

  async updateProjectStatus(token: string, id: string, status: string) {
    return this.request(`/admin/projects/${id}/status`, {
      method: 'PUT',
      body: { status },
      token,
    });
  }

  async addProjectUpdate(token: string, id: string, text: string) {
    return this.request(`/admin/projects/${id}/updates`, {
      method: 'POST',
      body: { text },
      token,
    });
  }

  // Calendar
  async getCalendar(year?: number, start?: string, end?: string, type?: string, category?: string) {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    if (type) params.append('type', type);
    if (category) params.append('category', category);
    return this.request(`/calendar?${params.toString()}`);
  }

  async getFestivals(year?: number) {
    const params = year ? `?year=${year}` : '';
    return this.request(`/calendar/festivals${params}`);
  }

  async getUpcomingEvents(limit = 5) {
    return this.request(`/calendar/upcoming?limit=${limit}`);
  }

  async getBestTimeToVisit() {
    return this.request('/calendar/best-time-to-visit');
  }

  // Jobs
  async getJobs(type?: string, category?: string, location?: string, search?: string, limit = 20, page = 1) {
    const params = new URLSearchParams({ limit: limit.toString(), page: page.toString() });
    if (type) params.append('type', type);
    if (category) params.append('category', category);
    if (location) params.append('location', location);
    if (search) params.append('search', search);
    return this.request(`/jobs?${params.toString()}`);
  }

  async getJob(id: string) {
    return this.request(`/jobs/${id}`);
  }

  async createJob(token: string, data: Record<string, unknown>) {
    return this.request('/jobs', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateJob(token: string, id: string, data: Record<string, unknown>) {
    return this.request(`/jobs/${id}`, {
      method: 'PUT',
      body: data,
      token,
    });
  }

  async deleteJob(token: string, id: string) {
    return this.request(`/jobs/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // War Canoe Houses / Genealogy
  async getWarCanoeHouses(community?: string, status?: string) {
    const params = new URLSearchParams();
    if (community) params.append('community', community);
    if (status) params.append('status', status);
    return this.request(`/genealogy/houses?${params.toString()}`);
  }

  async getWarCanoeHouse(id: string) {
    return this.request(`/genealogy/houses/${id}`);
  }

  async getGenealogyTree() {
    return this.request('/genealogy/tree');
  }

  // Oral Histories
  async getOralHistories(category?: string, language?: string, search?: string, limit = 20, page = 1) {
    const params = new URLSearchParams({ limit: limit.toString(), page: page.toString() });
    if (category) params.append('category', category);
    if (language) params.append('language', language);
    if (search) params.append('search', search);
    return this.request(`/oral-history?${params.toString()}`);
  }

  async getOralHistory(id: string) {
    return this.request(`/oral-history/${id}`);
  }

  async createOralHistory(token: string, data: Record<string, unknown>) {
    return this.request('/oral-history', {
      method: 'POST',
      body: data,
      token,
    });
  }

  // Mentorship
  async getMentors(skill?: string, limit = 20, page = 1) {
    const params = new URLSearchParams({ limit: limit.toString(), page: page.toString() });
    if (skill) params.append('skill', skill);
    return this.request(`/mentorship/mentors?${params.toString()}`);
  }

  async getMentees(limit = 20, page = 1) {
    return this.request(`/mentorship/mentees?limit=${limit}&page=${page}`);
  }

  async registerAsMentor(token: string, data: Record<string, unknown>) {
    return this.request('/mentorship/register', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async requestMentorship(token: string, mentorId: string, note?: string) {
    return this.request('/mentorship/request', {
      method: 'POST',
      body: { mentorId, note },
      token,
    });
  }

  async getMyMentorship(token: string) {
    return this.request('/mentorship/my', { token });
  }

  // Posts
  async getPosts() {
    return this.request('/posts');
  }

  async getMyPosts(token: string) {
    return this.request('/posts/my', { token });
  }

  async getUserPosts(token: string, userId: string) {
    return this.request(`/posts/user/${userId}`, { token });
  }

  async createPost(token: string, data: { content: string; imageUrl?: string; isPublic?: boolean }) {
    return this.request('/posts', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updatePost(token: string, id: string, data: Record<string, unknown>) {
    return this.request(`/posts/${id}`, {
      method: 'PUT',
      body: data,
      token,
    });
  }

  async deletePost(token: string, id: string) {
    return this.request(`/posts/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  async likePost(token: string, id: string) {
    return this.request(`/posts/${id}/like`, {
      method: 'POST',
      token,
    });
  }

  // Comments
  async getComments(targetType: string, targetId: string) {
    return this.request(`/comments/${targetType}/${targetId}`);
  }

  async createComment(token: string, data: { content: string; targetType: string; targetId: string }) {
    return this.request('/comments', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async deleteComment(token: string, id: string) {
    return this.request(`/comments/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // Social / Activity
  async getFollowingActivity(token: string) {
    return this.request('/social/following', { token });
  }

  async getMyActivity(token: string) {
    return this.request('/social/me', { token });
  }

  async getGlobalActivity() {
    return this.request('/social/global');
  }

  async followUser(token: string, userId: string) {
    return this.request(`/social/follow/${userId}`, {
      method: 'POST',
      token,
    });
  }

  async getUserProfile(userId: string) {
    return this.request(`/auth/user/${userId}`);
  }

  // Elder Stories
  async getElderStories(category?: string, featured?: boolean) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (featured) params.append('featured', 'true');
    return this.request(`/elder-stories?${params.toString()}`);
  }

  async getElderStory(id: string) {
    return this.request(`/elder-stories/${id}`);
  }

  async createElderStory(token: string, data: Record<string, unknown>) {
    return this.request('/elder-stories', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateElderStory(token: string, id: string, data: Record<string, unknown>) {
    return this.request(`/elder-stories/${id}`, {
      method: 'PUT',
      body: data,
      token,
    });
  }

  async deleteElderStory(token: string, id: string) {
    return this.request(`/elder-stories/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // Marketplace
  async getProducts(category?: string, search?: string, featured?: boolean) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (featured) params.append('featured', 'true');
    return this.request(`/marketplace?${params.toString()}`);
  }

  async getProduct(id: string) {
    return this.request(`/marketplace/${id}`);
  }

  async createProduct(token: string, data: Record<string, unknown>) {
    return this.request('/marketplace', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateProduct(token: string, id: string, data: Record<string, unknown>) {
    return this.request(`/marketplace/${id}`, {
      method: 'PUT',
      body: data,
      token,
    });
  }

  async deleteProduct(token: string, id: string) {
    return this.request(`/marketplace/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // Cart
  async getCart(token: string) {
    return this.request('/cart', { token });
  }

  async addToCart(token: string, productId: string, quantity = 1) {
    return this.request('/cart/add', {
      method: 'POST',
      body: { productId, quantity },
      token,
    });
  }

  async updateCartItem(token: string, productId: string, quantity: number) {
    return this.request(`/cart/update/${productId}`, {
      method: 'PUT',
      body: { quantity },
      token,
    });
  }

  async removeFromCart(token: string, productId: string) {
    return this.request(`/cart/remove/${productId}`, {
      method: 'DELETE',
      token,
    });
  }

  async clearCart(token: string) {
    return this.request('/cart/clear', {
      method: 'DELETE',
      token,
    });
  }

  // Orders
  async createOrder(token: string, data: { items: Array<{ product: string; quantity: number }>; shippingAddress: Record<string, string>; paymentMethod?: string; notes?: string }) {
    return this.request('/orders', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async getMyOrders(token: string) {
    return this.request('/orders/my-orders', { token });
  }

  async getMySales(token: string) {
    return this.request('/orders/my-sales', { token });
  }

  async getOrder(token: string, id: string) {
    return this.request(`/orders/${id}`, { token });
  }

  async updateOrderStatus(token: string, id: string, status: string) {
    return this.request(`/orders/${id}/status`, {
      method: 'PUT',
      body: { status },
      token,
    });
  }

  // Shop
  async getShopProfile(token: string) {
    return this.request('/shop/profile', { token });
  }

  async becomeSeller(token: string, shopName: string, shopDescription?: string) {
    return this.request('/shop/become-seller', {
      method: 'POST',
      body: { shopName, shopDescription },
      token,
    });
  }

  async updateShop(token: string, data: Record<string, unknown>) {
    return this.request('/shop/update-shop', {
      method: 'PUT',
      body: data,
      token,
    });
  }

  async getMyProducts(token: string) {
    return this.request('/shop/my-products', { token });
  }

  async closeShop(token: string) {
    return this.request('/shop/close-shop', {
      method: 'DELETE',
      token,
    });
  }

  // Messages
  async getConversations(token: string) {
    return this.request('/messages/conversations', { token });
  }

  async getMessages(token: string, conversationId: string) {
    return this.request(`/messages/conversations/${conversationId}`, { token });
  }

  async startConversation(token: string, recipientId: string, productId?: string, initialMessage?: string) {
    return this.request('/messages/conversations', {
      method: 'POST',
      body: { recipientId, productId, initialMessage },
      token,
    });
  }

  async sendMessage(token: string, conversationId: string, content: string) {
    return this.request(`/messages/${conversationId}`, {
      method: 'POST',
      body: { content },
      token,
    });
  }

  async markMessageRead(token: string, messageId: string) {
    return this.request(`/messages/${messageId}/read`, {
      method: 'PUT',
      token,
    });
  }

  async getUnreadMessageCount(token: string) {
    return this.request('/messages/unread/count', { token });
  }

  // Notifications
  async getNotifications(token: string) {
    return this.request('/notifications', { token });
  }

  async getUnreadNotificationCount(token: string) {
    return this.request('/notifications/unread-count', { token });
  }

  async markAllNotificationsRead(token: string) {
    return this.request('/notifications/mark-read', {
      method: 'PUT',
      token,
    });
  }

  async markNotificationRead(token: string, notificationId: string) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
      token,
    });
  }

  // Search suggestions (enhanced)
  async getAllSuggestions(query: string) {
    const suggestions: Array<{text: string, type: string}> = [];
    try {
      const searchResults = await this.getSearchSuggestions(query);
      if (Array.isArray(searchResults)) {
        suggestions.push(...searchResults.slice(0, 5));
      }
    } catch {}
    
    // Add calendar events
    try {
      const events = await this.getUpcomingEvents(3) as { upcoming?: Array<{ title: string }> };
      if (events?.upcoming) {
        events.upcoming.forEach((e) => {
          suggestions.push({ text: e.title, type: 'event' });
        });
      }
    } catch {}

    // Add jobs
    try {
      const jobs = await this.getJobs(undefined, undefined, undefined, query, 3) as { jobs?: Array<{ title: string }> };
      if (jobs?.jobs) {
        jobs.jobs.forEach((j) => {
          suggestions.push({ text: j.title, type: 'job' });
        });
      }
    } catch {}

    return suggestions.slice(0, 10);
  }
}

export const api = new ApiClient(API_BASE);
export { getWorkingServer, clearServerCache, API_SERVERS };
