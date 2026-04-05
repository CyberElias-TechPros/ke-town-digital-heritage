const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' ? 'https://kesrv.freegameplay.site/api' : 'http://localhost:5000/api');

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

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async register(fullName: string, email: string, password: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: { fullName, email, password },
    });
  }

  async getProfile(token: string) {
    return this.request('/auth/me', { token });
  }

  async updateProfile(token: string, data: Record<string, unknown>) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: data,
      token,
    });
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

export const api = new ApiClient(API_URL);
