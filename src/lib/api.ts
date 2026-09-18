export interface User {
  id: string;
  fullName: string;
  email: string;
  username?: string;
  role: 'user' | 'moderator' | 'content_manager' | 'seller_manager' | 'admin';
  accountStatus?: 'active' | 'suspended' | 'deactivated';
  emailVerified?: boolean;
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
  blockedUsers?: string[];
  mutedUsers?: string[];
  profileVisibility?: 'public' | 'followers' | 'private';
  allowMessages?: boolean;
  showOnlineStatus?: boolean;
  verified?: boolean;
}

/**
 * API origin resolution.
 *
 * The Cloudflare Worker serves the SPA *and* the JSON API from one origin, so
 * the default is the current origin (an empty string). In local development the
 * Vite dev server proxies /api to `wrangler dev`, which is also same-origin from
 * the browser's point of view — so no CORS is involved in either environment.
 *
 * VITE_API_SERVERS can still list extra origins (comma separated); they are
 * used as automatic failover targets if the primary origin is unreachable.
 */
const CONFIGURED_SERVERS = (import.meta.env.VITE_API_SERVERS as string | undefined)
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean) ?? [];

/** '' means "same origin" — resolved against window.location at call time. */
const API_ORIGINS: string[] = ['', ...CONFIGURED_SERVERS];
const API_SERVERS = API_ORIGINS.join(',');

/** Absolute base used for the few direct `fetch` calls (uploads). */
export const resolveApiBase = (): string => (API_ORIGINS[0] || '') + '/api';
const API_BASE = resolveApiBase();

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

export interface UploadedFile {
  _id: string;
  id?: string;
  url: string;
  key?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  type?: string;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
  timeout?: number;
}

/**
 * Normalises the Worker's collection envelopes into a plain array.
 *
 * List endpoints answer with a single descriptive wrapper — `{ news: [...] }`,
 * `{ stories: [...] }`, `{ events: [...] }` — which keeps the JSON readable but
 * crashes any page that calls `.map()` on the response directly. Pass an
 * explicit `key` when an endpoint returns several arrays and you want one of
 * them; otherwise the first array-valued property wins.
 */
export function asList<T = any>(data: unknown, key?: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  if (key && Array.isArray(record[key])) return record[key] as T[];
  const found = Object.values(record).find((v) => Array.isArray(v));
  return (found as T[]) ?? [];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const servers = API_SERVERS.split(',').map(s => s.trim());
    let lastError: Error | null = null;
    const timeout = options.timeout || 10000;

    for (let i = 0; i < servers.length; i++) {
      const server = servers[i];
      const { method = 'GET', body, headers = {}, token } = options;

      // AbortSignal.timeout() only exists in newer engines (Chrome 103+,
      // Safari 16.4+). Fall back to a manual controller so a slow network on
      // an older device degrades to a proper error instead of a crash.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
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
        const response = await fetch(url, config);
        if (import.meta.env.DEV) console.debug(`[api] ${method} ${url} → ${response.status}`);

        if (response.ok) {
          workingServer = server;
          serverHealthStatus.set(server, true);
          return response.json();
        }

        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        const errMsg = errorData.error || `HTTP ${response.status}`;
        throw new Error(errMsg);
      } catch (err: unknown) {
        const error = err as Error;
        lastError = error;
        serverHealthStatus.set(server, false);
        if (import.meta.env.DEV) {
          console.warn(`[api] ${method} ${endpoint} on ${server || 'same-origin'} failed:`, error.message);
        }
      } finally {
        clearTimeout(timer);
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
    return this.request('/auth/me', { token, timeout: 5000 }) as Promise<{ user: User }>;
  }

  async updateProfile(token: string, data: Record<string, unknown>): Promise<{ user: User }> {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: data,
      token,
    }) as Promise<{ user: User }>;
  }

  async updatePassword(token: string, currentPassword: string, newPassword: string) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
      token,
    });
  }

  async deleteAccount(token: string) {
    return this.request('/auth/account', {
      method: 'DELETE',
      token,
    });
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    });
  }

  async verifyEmail(token: string) {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: { token },
    });
  }

  async getPermissions(token: string) {
    return this.request('/auth/permissions', { token });
  }

  async getUsers(token: string, page?: number, limit?: number, role?: string, status?: string, search?: string) {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (role) params.append('role', role);
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return this.request(`/auth/users?${params.toString()}`, { token });
  }

  async updateUserRole(token: string, userId: string, role: string) {
    return this.request(`/auth/users/${userId}/role`, {
      method: 'PUT',
      body: { role },
      token,
    });
  }

  async updateUserStatus(token: string, userId: string, accountStatus: string) {
    return this.request(`/auth/users/${userId}/status`, {
      method: 'PUT',
      body: { accountStatus },
      token,
    });
  }

  async getUserActivity(token: string, userId: string, page?: number, limit?: number) {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    return this.request(`/auth/users/${userId}/activity?${params.toString()}`, { token });
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

  // Events
  async getEvents(token?: string) {
    return this.request('/events', { token });
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

  
  // Upload
  /**
   * Uploads one file to R2. Returns the stored file descriptor, flattened so
   * callers can read `result.url` directly.
   */
  async uploadFile(
    token: string,
    file: File,
  ): Promise<UploadedFile & { message?: string; file?: UploadedFile }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/upload/single`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();
    return { ...(data.file ?? data), ...data };
  }

  /**
   * Uploads several files in one request. The Worker answers with
   * `{ message, files: [...] }`; this normalises it to always expose both the
   * descriptor list and a bare `urls` array, whichever a caller wants.
   */
  async uploadMultipleFiles(
    token: string,
    files: File[],
  ): Promise<{ files: UploadedFile[]; urls: string[]; count: number; message?: string }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await fetch(`${this.baseUrl}/upload/multiple`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();
    const list: UploadedFile[] = Array.isArray(data) ? data : data.files ?? data.uploaded ?? [];
    return {
      files: list,
      urls: list.map((f) => f.url),
      count: list.length,
      message: data.message,
    };
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

  // Posts / Social Feed
  async getFeed(token: string) {
    return this.request('/posts/feed', { token });
  }

  async getPosts() {
    return this.request('/posts');
  }

  async getPost(id: string) {
    return this.request(`/posts/${id}`);
  }

  async getMyPosts(token: string) {
    return this.request('/posts/user/my', { token });
  }

  
  /**
   * Creates a post. Accepts both the current shape (`media`, `visibility`) and
   * the older one still used by a couple of pages (`imageUrl`, `isPublic`),
   * normalising to what the Worker persists.
   */
  async createPost(
    token: string,
    data: {
      content: string;
      media?: ({ type?: string; url: string } | string)[];
      imageUrl?: string;
      imageUrls?: string[];
      location?: string;
      feeling?: string;
      privacy?: string;
      visibility?: string;
      isPublic?: boolean;
    },
  ) {
    const media: { type: string; url: string }[] = (data.media ?? []).map((m) =>
      typeof m === 'string' ? { type: 'image', url: m } : { type: m.type ?? 'image', url: m.url },
    );
    for (const url of [data.imageUrl, ...(data.imageUrls ?? [])]) {
      if (url && !media.some((m) => m.url === url)) media.push({ type: 'image', url });
    }
    const visibility = data.visibility ?? data.privacy ?? (data.isPublic === false ? 'private' : 'community');
    return this.request('/posts', {
      method: 'POST',
      body: { content: data.content, media, location: data.location, feeling: data.feeling, visibility },
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

  async reactToPost(token: string, id: string, reactionType: string) {
    return this.request(`/posts/${id}/reaction`, {
      method: 'POST',
      body: { reactionType },
      token,
    });
  }

  async removeReaction(token: string, id: string) {
    return this.request(`/posts/${id}/reaction`, {
      method: 'DELETE',
      token,
    });
  }

  async addComment(token: string, postId: string, content: string, parentCommentId?: string) {
    return this.request(`/posts/${postId}/comment`, {
      method: 'POST',
      body: { content, parentCommentId },
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

  
  
  
  async getUserPosts(userId: string, page = 1, limit = 20) {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    return this.request(`/users/${userId}/posts?${params.toString()}`);
  }

  async getUserFollowers(userId: string, page = 1, limit = 20) {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    return this.request(`/users/${userId}/followers?${params.toString()}`);
  }

  async getUserFollowing(userId: string, page = 1, limit = 20) {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    return this.request(`/users/${userId}/following?${params.toString()}`);
  }

  
  
  
  async getProduct(id: string) {
    return this.request(`/marketplace/${id}`);
  }

  async createProduct(token: string, data: { title: string; description: string; category: string; condition: string; price: number; negotiable?: boolean; images?: string[]; video?: string; brand?: string; model?: string; location?: unknown; contact?: string; tags?: string[]; quantity?: number }) {
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

  async likeProduct(token: string, id: string) {
    return this.request(`/marketplace/${id}/like`, {
      method: 'POST',
      token,
    });
  }

  // Cart
  async getCart(token: string) {
    return this.request('/cart', { token });
  }

  
  async updateCartItem(token: string, productId: string, quantity: number) {
    return this.request(`/cart/update/${productId}`, {
      method: 'PUT',
      body: { quantity },
      token,
    });
  }


  // Addresses
  async getAddresses(token: string) {
    return this.request('/addresses', { token });
  }

  async addAddress(token: string, data: { fullName: string; phone: string; address: string; city: string; state: string; isDefault?: boolean }) {
    return this.request('/addresses', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateAddress(token: string, id: string, data: Record<string, unknown>) {
    return this.request(`/addresses/${id}`, {
      method: 'PUT',
      body: data,
      token,
    });
  }

  async deleteAddress(token: string, id: string) {
    return this.request(`/addresses/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // Additional functions for new pages
  async getTrendingPosts() {
    return this.request('/posts/trending');
  }

  async getSuggestedUsers() {
    return this.request('/users/suggested');
  }

  async getTrendingEvents() {
    return this.request('/events/trending');
  }

  async getTrendingProducts() {
    return this.request('/marketplace/trending');
  }

  async getOrders(token: string) {
    return this.request('/orders', { token });
  }

  async getOrder(token: string, orderId: string) {
    return this.request(`/orders/${orderId}`, { token });
  }

  async createCheckout(token: string, data: { addressId?: string; deliveryMethod?: string; paymentMethod?: string }) {
    return this.request('/orders/checkout', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async getShop(token: string) {
    return this.request('/shop/me', { token });
  }

  async updateShop(token: string, data: Record<string, unknown>) {
    return this.request('/shop', {
      method: 'PUT',
      body: data,
      token,
    });
  }

  async getMyProducts(token: string) {
    return this.request('/marketplace/my-products', { token });
  }

    // async deleteProduct(token: string, productId: string) {
    //   return this.request(`/marketplace/${productId}`, {
    //     method: 'DELETE',
    //     token,
    //   });
    // }

  async updateProductStatus(token: string, productId: string, status: string) {
    return this.request(`/marketplace/${productId}/status`, {
      method: 'PUT',
      body: { status },
      token,
    });
  }

  async getShopOrders(token: string) {
    return this.request('/orders/seller', { token });
  }

  async followUser(token: string, userId: string) {
    return this.request(`/users/${userId}/follow`, {
      method: 'POST',
      token,
    });
  }

  async unfollowUser(token: string, userId: string) {
    return this.request(`/users/${userId}/unfollow`, {
      method: 'POST',
      token,
    });
  }

  async removeRsvp(token: string, eventId: string) {
    return this.request(`/events/${eventId}/rsvp`, {
      method: 'DELETE',
      token,
    });
  }

  async getUnreadMessageCount(token: string): Promise<number> {
    const response = await this.request<{ count: number }>('/messages/unread/count', { token });
    return response?.count || 0;
  }

  async getUnreadNotificationCount(token: string): Promise<number> {
    const response = await this.request<{ count: number }>('/notifications/unread-count', { token });
    return response?.count || 0;
  }

  // Conversation and messaging methods
  async getConversations(token: string) {
    return this.request('/conversations', { token });
  }

  async getConversation(token: string, conversationId: string) {
    return this.request(`/conversations/${conversationId}`, { token });
  }

  async getMessages(token: string, conversationId: string) {
    return this.request(`/conversations/${conversationId}/messages`, { token });
  }

  async sendMessage(token: string, conversationId: string, content: string, media?: any[]) {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { content, media },
      token,
    });
  }

  async createConversation(token: string, participantId: string) {
    return this.request('/conversations', {
      method: 'POST',
      body: { participantId },
      token,
    });
  }

  async markMessagesAsRead(token: string, conversationId: string, messageIds: string[]) {
    return this.request(`/conversations/${conversationId}/read`, {
      method: 'POST',
      body: { messageIds },
      token,
    });
  }

  async deleteMessage(token: string, conversationId: string, messageId: string) {
    return this.request(`/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
      token,
    });
  }

  async typingIndicator(token: string, conversationId: string, isTyping: boolean) {
    return this.request(`/conversations/${conversationId}/typing`, {
      method: 'POST',
      body: { isTyping },
      token,
    });
  }

  // Elder Stories API methods
  async getElderStories(category?: string) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/elder-stories${query}`);
  }

  async getElderStory(id: string) {
    return this.request(`/elder-stories/${id}`);
  }

  async createElderStory(token: string, data: any) {
    return this.request('/elder-stories', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateElderStory(token: string, id: string, data: any) {
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

  // Search API methods
  async search(query: string, type?: string) {
    const params = new URLSearchParams();
    params.set('q', query);
    if (type && type !== 'all') params.set('type', type);
    
    return this.request(`/search?${params.toString()}`);
  }

  async getSearchSuggestions(query: string) {
    return this.request(`/search/suggestions?q=${encodeURIComponent(query)}`);
  }

  // Payment System API methods
  async getPaymentMethods(token: string) {
    return this.request('/payments/methods', { token });
  }

  async addPaymentMethod(token: string, paymentData: any) {
    return this.request('/payments/methods', {
      method: 'POST',
      body: paymentData,
      token,
    });
  }

  async removePaymentMethod(token: string, methodId: string) {
    return this.request(`/payments/methods/${methodId}`, {
      method: 'DELETE',
      token,
    });
  }

  async setDefaultPaymentMethod(token: string, methodId: string) {
    return this.request(`/payments/methods/${methodId}/default`, {
      method: 'PUT',
      token,
    });
  }

  async getTransactions(token: string) {
    return this.request('/payments/transactions', { token });
  }

  async createPaymentIntent(token: string, paymentData: any) {
    return this.request('/payments/intent', {
      method: 'POST',
      body: paymentData,
      token,
    });
  }

  async confirmPayment(token: string, paymentIntentId: string) {
    return this.request(`/payments/confirm`, {
      method: 'POST',
      body: { paymentIntentId },
      token,
    });
  }

  async requestWithdrawal(token: string, withdrawalData: any) {
    return this.request('/payments/withdrawal', {
      method: 'POST',
      body: withdrawalData,
      token,
    });
  }

  async getBalance(token: string) {
    return this.request('/payments/balance', { token });
  }

  async getPaymentHistory(token: string, page = 1, limit = 20) {
    return this.request(`/payments/history?page=${page}&limit=${limit}`, { token });
  }

  // Analytics API methods
  async getAnalytics(token: string, timeRange: string = '30d') {
    return this.request(`/analytics?timeRange=${timeRange}`, { token });
  }

  async getAnalyticsOverview(token: string) {
    return this.request('/analytics/overview', { token });
  }

  async getUserAnalytics(token: string, timeRange: string = '30d') {
    return this.request(`/analytics/users?timeRange=${timeRange}`, { token });
  }

  async getContentAnalytics(token: string, timeRange: string = '30d') {
    return this.request(`/analytics/content?timeRange=${timeRange}`, { token });
  }

  async getMarketplaceAnalytics(token: string, timeRange: string = '30d') {
    return this.request(`/analytics/marketplace?timeRange=${timeRange}`, { token });
  }

  async getEventsAnalytics(token: string, timeRange: string = '30d') {
    return this.request(`/analytics/events?timeRange=${timeRange}`, { token });
  }

  async getCulturalAnalytics(token: string, timeRange: string = '30d') {
    return this.request(`/analytics/cultural?timeRange=${timeRange}`, { token });
  }

  async exportAnalytics(token: string, timeRange: string, format: 'csv' | 'json' | 'pdf') {
    return this.request(`/analytics/export?timeRange=${timeRange}&format=${format}`, { token });
  }

  async getRealTimeMetrics(token: string) {
    return this.request('/analytics/realtime', { token });
  }

  async getCustomReport(token: string, reportConfig: any) {
    return this.request('/analytics/custom', {
      method: 'POST',
      body: reportConfig,
      token,
    });
  }

  // AI Recommendation API methods
  async getAIRecommendations(token: string, type: string = 'all') {
    return this.request(`/ai/recommendations?type=${type}`, { token });
  }

  async getRecommendationProfile(token: string) {
    return this.request('/ai/profile', { token });
  }

  async updateRecommendationProfile(token: string, profile: any) {
    return this.request('/ai/profile', {
      method: 'PUT',
      body: profile,
      token,
    });
  }

  async trackRecommendationInteraction(token: string, recommendationId: string, type: string) {
    return this.request('/ai/track', {
      method: 'POST',
      body: { recommendationId, type },
      token,
    });
  }

  async dismissRecommendation(token: string, recommendationId: string) {
    return this.request(`/ai/recommendations/${recommendationId}/dismiss`, {
      method: 'POST',
      token,
    });
  }

  async getRecommendationFeedback(token: string, recommendationId: string, feedback: 'like' | 'dislike' | 'not_interested') {
    return this.request(`/ai/recommendations/${recommendationId}/feedback`, {
      method: 'POST',
      body: { feedback },
      token,
    });
  }

  async getSimilarContent(token: string, contentId: string, type: string) {
    return this.request(`/ai/similar/${type}/${contentId}`, { token });
  }

  async getTrendingContent(token: string, category?: string) {
    const params = category ? `?category=${category}` : '';
    return this.request(`/ai/trending${params}`, { token });
  }

  async getPersonalizedFeed(token: string, limit: number = 20) {
    return this.request(`/ai/feed?limit=${limit}`, { token });
  }

  // Genealogy API methods
  async getFamilyTrees(token: string) {
    return this.request('/genealogy/trees', { token });
  }

  async getFamilyTree(token: string, treeId: string) {
    return this.request(`/genealogy/trees/${treeId}`, { token });
  }

  async createFamilyTree(token: string, treeData: any) {
    return this.request('/genealogy/trees', {
      method: 'POST',
      body: treeData,
      token,
    });
  }

  async updateFamilyTree(token: string, treeId: string, treeData: any) {
    return this.request(`/genealogy/trees/${treeId}`, {
      method: 'PUT',
      body: treeData,
      token,
    });
  }

  async deleteFamilyTree(token: string, treeId: string) {
    return this.request(`/genealogy/trees/${treeId}`, {
      method: 'DELETE',
      token,
    });
  }

  async addFamilyMember(token: string, treeId: string, memberData: any) {
    return this.request(`/genealogy/trees/${treeId}/members`, {
      method: 'POST',
      body: memberData,
      token,
    });
  }

  async updateFamilyMember(token: string, treeId: string, memberId: string, memberData: any) {
    return this.request(`/genealogy/trees/${treeId}/members/${memberId}`, {
      method: 'PUT',
      body: memberData,
      token,
    });
  }

  async deleteFamilyMember(token: string, treeId: string, memberId: string) {
    return this.request(`/genealogy/trees/${treeId}/members/${memberId}`, {
      method: 'DELETE',
      token,
    });
  }

  async getFamilyMember(token: string, treeId: string, memberId: string) {
    return this.request(`/genealogy/trees/${treeId}/members/${memberId}`, { token });
  }

  async searchFamilyMembers(token: string, treeId: string, query: string) {
    return this.request(`/genealogy/trees/${treeId}/members/search?q=${encodeURIComponent(query)}`, { token });
  }

  async exportFamilyTree(token: string, treeId: string, format: 'json' | 'pdf' | 'png') {
    return this.request(`/genealogy/trees/${treeId}/export?format=${format}`, { token });
  }

  async importFamilyTree(token: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/genealogy/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Import failed');
    }

    return response.json();
  }

  async getFamilyTreeStats(token: string, treeId: string) {
    return this.request(`/genealogy/trees/${treeId}/stats`, { token });
  }

  async addRelationship(token: string, treeId: string, relationshipData: any) {
    return this.request(`/genealogy/trees/${treeId}/relationships`, {
      method: 'POST',
      body: relationshipData,
      token,
    });
  }

  async removeRelationship(token: string, treeId: string, relationshipId: string) {
    return this.request(`/genealogy/trees/${treeId}/relationships/${relationshipId}`, {
      method: 'DELETE',
      token,
    });
  }

  // ------------------------------------------------------------------
  // Cart
  // ------------------------------------------------------------------
  async addToCart(token: string, productId: string, quantity = 1) {
    return this.request('/cart/add', {
      method: 'POST',
      body: { productId, quantity },
      token,
    });
  }

  async removeFromCart(token: string, productId: string) {
    return this.request(`/cart/${productId}`, { method: 'DELETE', token });
  }

  async clearCart(token: string) {
    return this.request('/cart', { method: 'DELETE', token });
  }

  async getCartSummary(token: string) {
    return this.request('/cart/summary', { token });
  }

  // ------------------------------------------------------------------
  // Orders
  // ------------------------------------------------------------------
  async createOrder(
    token: string,
    data: {
      items?: { product: string; quantity: number }[];
      addressId?: string;
      shippingAddress?: any;
      paymentMethod?: string;
      deliveryMethod?: string;
      note?: string;
    },
  ) {
    return this.request('/orders/checkout', { method: 'POST', body: data, token });
  }

  async getMyOrders(token: string) {
    return this.request('/orders', { token });
  }

  async getMySales(token: string) {
    return this.request('/orders/seller', { token });
  }

  async getOrderStats(token: string) {
    return this.request('/orders/stats', { token });
  }

  async updateOrderStatus(token: string, orderId: string, status: string) {
    return this.request(`/orders/${orderId}/status`, { method: 'PUT', body: { status }, token });
  }

  async addOrderTracking(token: string, orderId: string, tracking: string) {
    return this.request(`/orders/${orderId}/tracking`, { method: 'PUT', body: { tracking }, token });
  }

  // ------------------------------------------------------------------
  // Marketplace
  // ------------------------------------------------------------------
  async getProducts(category?: string, search?: string, sort?: string) {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    if (sort) params.append('sort', sort);
    const query = params.toString();
    return this.request(`/marketplace${query ? `?${query}` : ''}`);
  }

  async createListing(token: string, data: Record<string, unknown>) {
    return this.request('/marketplace', { method: 'POST', body: data, token });
  }

  async unlikeProduct(token: string, id: string) {
    return this.request(`/marketplace/${id}/like`, { method: 'DELETE', token });
  }

  async getProductReviews(productId: string) {
    return this.request(`/reviews/product/${productId}`);
  }

  async createReview(
    token: string,
    data: { targetType: string; targetId: string; rating: number; title?: string; body?: string },
  ) {
    return this.request('/reviews', { method: 'POST', body: data, token });
  }

  // ------------------------------------------------------------------
  // Shop / seller onboarding
  // ------------------------------------------------------------------
  async becomeSeller(token: string, shopName: string, shopDescription: string) {
    return this.request('/shop', { method: 'POST', body: { shopName, shopDescription }, token });
  }

  async getShopProfile(token: string) {
    return this.request('/shop/me', { token });
  }

  async getShopByHandle(handle: string) {
    return this.request(`/shop/${handle}`);
  }

  // ------------------------------------------------------------------
  // Groups
  // ------------------------------------------------------------------
  async getGroups(category?: string, search?: string) {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    const query = params.toString();
    return this.request(`/groups${query ? `?${query}` : ''}`);
  }

  async getGroup(id: string, token?: string) {
    return this.request(`/groups/${id}`, { token });
  }

  async getMyGroups(token: string) {
    return this.request('/groups/my', { token });
  }

  async createGroup(
    token: string,
    data: { name: string; description: string; privacy?: string; category?: string; joinMethod?: string; coverImage?: string },
  ) {
    return this.request('/groups', { method: 'POST', body: data, token });
  }

  async updateGroup(token: string, id: string, data: Record<string, unknown>) {
    return this.request(`/groups/${id}`, { method: 'PUT', body: data, token });
  }

  async deleteGroup(token: string, id: string) {
    return this.request(`/groups/${id}`, { method: 'DELETE', token });
  }

  async joinGroup(token: string, groupId: string) {
    return this.request(`/groups/${groupId}/join`, { method: 'POST', token });
  }

  async leaveGroup(token: string, groupId: string) {
    return this.request(`/groups/${groupId}/leave`, { method: 'POST', token });
  }

  async getGroupMembers(groupId: string, token?: string) {
    return this.request(`/groups/${groupId}/members`, { token });
  }

  async getGroupPosts(groupId: string, token?: string) {
    return this.request(`/groups/${groupId}/posts`, { token });
  }

  async getGroupJoinRequests(token: string, groupId: string) {
    return this.request(`/groups/${groupId}/requests`, { token });
  }

  async respondToJoinRequest(token: string, groupId: string, userId: string, decision: 'approve' | 'reject') {
    return this.request(`/groups/${groupId}/requests/${userId}/${decision}`, { method: 'POST', token });
  }

  // ------------------------------------------------------------------
  // Events / RSVP
  // ------------------------------------------------------------------
  async rsvpEvent(token: string, eventId: string, status: string = 'going') {
    return this.request(`/events/${eventId}/rsvp`, { method: 'POST', body: { status }, token });
  }

  async cancelRsvp(token: string, eventId: string) {
    return this.request(`/events/${eventId}/rsvp`, { method: 'DELETE', token });
  }

  async getEventAttendees(eventId: string) {
    return this.request(`/events/${eventId}/attendees`);
  }

  // ------------------------------------------------------------------
  // Saved posts
  // ------------------------------------------------------------------
  async getSavedPosts(token: string) {
    return this.request('/posts/saved', { token });
  }

  async savePost(token: string, postId: string) {
    return this.request(`/posts/${postId}/save`, { method: 'POST', token });
  }

  async unsavePost(token: string, postId: string) {
    return this.request(`/posts/${postId}/save`, { method: 'DELETE', token });
  }

  // ------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------
  async getNotifications(token: string) {
    return this.request('/notifications', { token });
  }

  async markNotificationRead(token: string, notificationId: string) {
    return this.request(`/notifications/${notificationId}/read`, { method: 'POST', token });
  }

  async markAllNotificationsRead(token: string) {
    return this.request('/notifications/read-all', { method: 'POST', token });
  }

  async deleteNotification(token: string, notificationId: string) {
    return this.request(`/notifications/${notificationId}`, { method: 'DELETE', token });
  }

  async getNotificationPreferences(token: string) {
    return this.request('/notifications/preferences', { token });
  }

  async updateNotificationPreferences(token: string, preferences: Record<string, boolean>) {
    return this.request('/notifications/preferences', { method: 'PUT', body: preferences, token });
  }

  // ------------------------------------------------------------------
  // Profiles
  // ------------------------------------------------------------------
  async getUserProfile(username: string) {
    return this.request(`/auth/users/by-username/${encodeURIComponent(username)}`);
  }

  async getUserById(userId: string) {
    return this.request(`/users/${userId}`);
  }

  async blockUser(token: string, userId: string) {
    return this.request(`/users/${userId}/block`, { method: 'POST', token });
  }

  async unblockUser(token: string, userId: string) {
    return this.request(`/users/${userId}/unblock`, { method: 'POST', token });
  }

  // ------------------------------------------------------------------
  // Civic engagement
  // ------------------------------------------------------------------
  async getPolls() {
    return this.request('/polls');
  }

  async voteInPoll(token: string, pollId: string, optionKey: string | string[]) {
    return this.request(`/polls/${pollId}/vote`, { method: 'POST', body: { optionKey }, token });
  }

  async getPetitions() {
    return this.request('/petitions');
  }

  async createPetition(token: string, data: Record<string, unknown>) {
    return this.request('/petitions', { method: 'POST', body: data, token });
  }

  async signPetition(token: string, petitionId: string, comment?: string) {
    return this.request(`/petitions/${petitionId}/sign`, { method: 'POST', body: { comment }, token });
  }

  async getCampaigns() {
    return this.request('/campaigns');
  }

  async fileReport(
    token: string,
    data: { targetType: string; targetId: string; reason: string; details?: string },
  ) {
    return this.request('/reports', { method: 'POST', body: data, token });
  }

  async getModerationQueue(token: string, status = 'pending') {
    return this.request(`/reports?status=${status}`, { token });
  }

  async resolveReport(token: string, reportId: string, resolution: string) {
    return this.request(`/reports/${reportId}/resolve`, { method: 'PUT', body: { resolution }, token });
  }

  // ------------------------------------------------------------------
  // Skills, jobs, volunteering
  // ------------------------------------------------------------------
  async applyToJob(token: string, jobId: string, data: { coverLetter?: string; resumeUrl?: string }) {
    return this.request(`/jobs/${jobId}/apply`, { method: 'POST', body: data, token });
  }

  async getJobApplications(token: string, jobId: string) {
    return this.request(`/jobs/${jobId}/applications`, { token });
  }

  async respondToMentorship(token: string, requestId: string, status: 'accepted' | 'declined') {
    return this.request(`/mentorship/requests/${requestId}`, { method: 'PUT', body: { status }, token });
  }

  async getVolunteerOpportunities(category?: string) {
    const query = category && category !== 'all' ? `?category=${category}` : '';
    return this.request(`/volunteer${query}`);
  }

  async applyToVolunteer(token: string, opportunityId: string, motivation?: string) {
    return this.request(`/volunteer/${opportunityId}/apply`, { method: 'POST', body: { motivation }, token });
  }

  // ------------------------------------------------------------------
  // Phrasebook & wallet extras
  // ------------------------------------------------------------------
  async getPhrases(category?: string) {
    const query = category && category !== 'all' ? `?category=${category}` : '';
    return this.request(`/phrases${query}`);
  }

  async getWithdrawals(token: string) {
    return this.request('/payments/withdrawals', { token });
  }
}

export const api = new ApiClient(API_BASE);
export { getWorkingServer, clearServerCache, API_SERVERS };
