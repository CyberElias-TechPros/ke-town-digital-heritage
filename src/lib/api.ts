const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
}

export const api = new ApiClient(API_URL);
