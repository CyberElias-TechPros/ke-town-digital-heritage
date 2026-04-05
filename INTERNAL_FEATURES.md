# KE Kingdom Digital Heritage — Internal Features Specification

**Date:** April 2, 2026  
**Purpose:** Document all internal/admin/system features that exist or should exist, separate from public-facing pages

---

## 1. Authentication & User Management

### 1.1 User Registration (EXISTING ✅)
- **Endpoint:** `POST /api/auth/register`
- **Fields:** fullName, email, password
- **Features:**
  - Email uniqueness validation
  - Password hashing with bcrypt
  - Auto-assign 'user' role
  - JWT token generation (7-day expiry)

### 1.2 User Login (EXISTING ✅)
- **Endpoint:** `POST /api/auth/login`
- **Features:**
  - Email/password validation
  - Account status check (isActive)
  - Update lastLogin timestamp
  - JWT token generation

### 1.3 Profile Management (EXISTING ✅)
- **Endpoints:**
  - `GET /api/auth/me` — Get current user
  - `PUT /api/auth/profile` — Update profile
  - `PUT /api/auth/change-password` — Change password

### 1.4 Admin User Management (EXISTING ✅)
- **Endpoints:**
  - `GET /api/auth/users` — List all users
  - `PUT /api/auth/users/:id/role` — Update role
  - `PUT /api/auth/users/:id/status` — Activate/deactivate

### 1.5 Role-Based Access Control (IMPLEMENTED ✅)
- **Roles:** user, admin
- **Middleware:** `authenticate`, `requireAdmin`
- **Access Control:**
  - Public: register, login, read operations
  - Authenticated: profile, submissions
  - Admin: all management endpoints

---

## 2. Content Management System (Admin Panel)

### 2.1 Dashboard Statistics (EXISTING ✅)
- **Endpoint:** `GET /api/admin/dashboard`
- **Returns:**
  - Total counts: events, news, gallery, directory, contacts, environment, projects, users
  - Pending counts: gallery, directory, contacts
  - Recent activity: last 5 events, news, contacts

### 2.2 Events Management (EXISTING ✅)
- **Public Endpoints:** `GET /api/events`, `POST /api/events`
- **Admin Endpoints:**
  - `GET /api/admin/events` — List all events
  - `PUT /api/events/:id` — Update event
  - `DELETE /api/events/:id` — Delete event
- **Frontend:** Admin tab with add/edit/delete

### 2.3 News Management (EXISTING ✅)
- **Public Endpoints:** `GET /api/news`, `POST /api/news`
- **Admin Endpoints:**
  - `GET /api/admin/news` — List all news
  - `PUT /api/news/:id` — Update news
  - `DELETE /api/news/:id` — Delete news
- **Features:**
  - Published/draft status

### 2.4 Gallery Management (EXISTING ✅)
- **Public Endpoints:** `GET /api/gallery` (approved only), `POST /api/gallery`
- **Admin Endpoints:**
  - `GET /api/admin/gallery` — List all (filter by approved)
  - `PUT /api/admin/gallery/:id/approve` — Approve item
  - `DELETE /api/gallery/:id` — Delete item
- **Features:**
  - Approval workflow for community submissions

### 2.5 Directory Management (EXISTING ✅)
- **Public Endpoints:** `GET /api/directory` (approved only), `POST /api/directory`
- **Admin Endpoints:**
  - `GET /api/admin/directory` — List all (filter by approved)
  - `PUT /api/admin/directory/:id/approve` — Approve member
- **Features:**
  - Approval workflow for new members
  - Public/private visibility toggle

### 2.6 Contact Messages (EXISTING ✅)
- **Public Endpoints:** `POST /api/contact`
- **Admin Endpoints:**
  - `GET /api/admin/contacts` — List (filter by read, type)
  - `PUT /api/admin/contacts/:id/read` — Mark as read
- **Features:**
  - Message type categorization
  - Read/unread tracking

### 2.7 Environment Reports (EXISTING ✅)
- **Public Endpoints:** `GET /api/environment`, `POST /api/environment`
- **Admin Endpoints:**
  - `GET /api/admin/environment` — List all
- **Features:**
  - Report submission form
  - Status tracking

### 2.8 Projects Management (EXISTING ✅)
- **Public Endpoints:** `GET /api/projects`, `POST /api/projects`
- **Admin Endpoints:**
  - `GET /api/admin/projects` — List all
  - `PUT /api/admin/projects/:id/status` — Update status
  - `POST /api/admin/projects/:id/updates` — Add update
- **Features:**
  - Project status: planning, active, completed
  - Progress updates

---

## 3. File & Media Management

### 3.1 File Upload (EXISTING ✅)
- **Endpoint:** `POST /api/upload/single`, `POST /api/upload/multiple`
- **Features:**
  - Multer middleware for disk storage
  - 50MB file size limit
  - Supported formats: jpg, jpeg, png, gif, webp, mp4, mov, avi, webm
  - Unique filename generation
  - Admin deletion capability

### 3.2 File Management (EXISTING ✅)
- **Endpoint:** `GET /api/upload/` — List all (admin)
- **Endpoint:** `DELETE /api/upload/:filename` — Delete (admin)

### 3.3 Cloudinary Integration (NOT IMPLEMENTED ❌)
- **Recommended:**
  - Replace local disk storage with Cloudinary
  - Automatic image optimization
  - CDN delivery
  - Image transformations (resize, crop, format)

---

## 4. Donation & Payment System

### 4.1 Donation Initialization (EXISTING ✅)
- **Endpoint:** `POST /api/donations/initialize`
- **Features:**
  - Donor name, email, amount validation
  - Minimum ₦100 requirement
  - Unique reference generation
  - Paystack integration (simulated)
  - Optional: project ID, message, anonymous

### 4.2 Donation Verification (EXISTING ✅)
- **Endpoint:** `POST /api/donations/verify`
- **Features:**
  - Reference validation
  - Status update: pending → success/failed
  - Auto-update project raisedAmount

### 4.3 Donation Stats (EXISTING ✅)
- **Public:** `GET /api/donations/stats`, `GET /api/donations/recent`
- **Admin:** `GET /api/donations/admin/all`, `GET /api/donations/admin/stats`
- **Features:**
  - Total donations count
  - Total amount raised
  - Recent anonymous donations
  - Monthly statistics

### 4.4 Paystack Integration (PARTIAL ⚠️)
- **Status:** Simulated response (needs real API keys)
- **Required:**
  - Add PAYSTACK_PUBLIC_KEY to .env
  - Implement actual Paystack API calls
  - Webhook endpoint for payment confirmation

---

## 5. Search & Discovery

### 5.1 Global Search (EXISTING ✅)
- **Endpoint:** `GET /api/search`
- **Searches across:**
  - Events (title, description, location)
  - News (title, excerpt, content)
  - Gallery (title, description, tags)
  - Directory (fullName, city, country, bio)
  - Environment Reports (title, description, location)
  - Projects (title, description)
- **Features:**
  - Regex search with case-insensitivity
  - Sort by title relevance
  - Result limit (default 20)

### 5.2 Search Suggestions (EXISTING ✅)
- **Endpoint:** `GET /api/search/suggestions`
- **Features:**
  - Autocomplete-style suggestions
  - Type-specific results
  - Deduplication

### 5.3 Full-Text Search Implementation (NOT IMPLEMENTED ❌)
- **Recommendation:** Implement MongoDB Atlas Search or Elasticsearch
- **Features:**
  - Better relevance scoring
  - Fuzzy matching
  - Typo tolerance
  - Faceted search

---

## 6. Newsletter System

### 6.1 Subscribe (EXISTING ✅)
- **Endpoint:** `POST /api/newsletter`
- **Features:**
  - Email validation
  - Duplicate prevention

### 6.2 Unsubscribe (EXISTING ✅)
- **Endpoint:** `DELETE /api/newsletter`
- **Features:**
  - Email-based removal

### 6.3 Newsletter Emails (NOT IMPLEMENTED ❌)
- **Recommended:**
  - Nodemailer integration
  - Welcome email on subscribe
  - Unsubscribe confirmation
  - Admin: Send mass newsletters

---

## 7. Notifications & Communication

### 7.1 Email Notifications (NOT IMPLEMENTED ❌)
- **Recommended:**
  - Welcome emails
  - Contact form auto-responder
  - Newsletter broadcasts
  - Donation receipts
- **Implementation:** Nodemailer with SMTP

### 7.2 WhatsApp Business API (NOT IMPLEMENTED ❌)
- **Recommended:**
  - Automated messaging
  - Newsletter via WhatsApp
  - Contact form notifications
  - Event reminders

### 7.3 Push Notifications (NOT IMPLEMENTED ❌)
- **Recommended:**
  - PWA push notifications
  - New content alerts
  - Festival reminders

---

## 8. Analytics & Tracking

### 8.1 Usage Analytics (NOT IMPLEMENTED ❌)
- **Recommended:**
  - Page views tracking
  - User journey analytics
  - Popular content ranking
  - Geographic distribution
- **Tools:** Google Analytics, Plausible, or custom

### 8.2 Admin Activity Log (NOT IMPLEMENTED ❌)
- **Recommended:**
  - Track admin actions
  - Audit trail for content changes
  - User management history

### 8.3 Performance Monitoring (NOT IMPLEMENTED ❌)
- **Recommended:**
  - API response times
  - Error rate tracking
  - Uptime monitoring

---

## 9. API Infrastructure

### 9.1 Health Check (EXISTING ✅)
- **Endpoint:** `GET /api/health`
- **Returns:** `{ status: 'ok', service: 'KE Kingdom API' }`

### 9.2 Rate Limiting (IMPLEMENTED ✅)
- **Features:**
  - General: 100 requests/minute
  - Auth: 10 attempts/15 minutes
  - Upload: 20 uploads/minute
  - Standard headers enabled
  - Custom messages

### 9.3 API Versioning (NOT IMPLEMENTED ❌)
- **Recommended:**
  - `/api/v1/` prefix for future compatibility
  - Deprecation strategy

### 9.4 Request Validation (NOT IMPLEMENTED ❌)
- **Recommended:**
  - express-validator or Joi
  - Sanitize inputs
  - Type coercion prevention

---

## 10. Database & Storage

### 10.1 MongoDB Models (EXISTING ✅)
- **Collections:**
  - User
  - Event
  - News
  - GalleryItem
  - DirectoryMember
  - ContactMessage
  - EnvironmentReport
  - Project
  - NewsletterSubscriber

### 10.2 Database Backups (NOT IMPLEMENTED ❌)
- **Recommended:**
  - Automated daily backups
  - MongoDB Atlas backup or custom
  - Off-site storage
  - Backup rotation (30 days)

### 10.3 Indexes (NOT IMPLEMENTED ❌)
- **Recommended:**
  - Text indexes for search
  - Compound indexes for queries
  - TTL indexes for temporary data

---

## 11. Security Features

### 11.1 JWT Configuration (EXISTING ✅)
- **Secret:** `process.env.JWT_SECRET`
- **Expiry:** 7 days

### 11.2 Password Security (EXISTING ✅)
- **Method:** bcrypt hashing
- **Rounds:** 10

### 11.3 CORS Configuration (EXISTING ✅)
- **Method:** express cors middleware

### 11.4 Environment Variables (EXISTING ✅)
- **.env.example provided**
- **Required:**
  - MONGODB_URI
  - JWT_SECRET
  - PORT
  - PAYSTACK keys (future)

### 11.5 Additional Security (IMPLEMENTED ✅)
- **Implemented:**
  - Helmet.js for security headers
  - CORS configured
  - Rate limiting
  - Express.json body parsing
  - JWT-based authentication

---

## 12. Frontend Features

### 12.1 Authentication Context (EXISTING ✅)
- **Features:**
  - Login/logout state management
  - Token storage (localStorage)
  - Role-based access (isAdmin)
  - Protected routes

### 12.2 API Client (EXISTING ✅)
- **Features:**
  - Centralized API calls
  - Auth header injection
  - Error handling
  - Admin API wrappers

### 12.3 Search Modal (EXISTING ✅)
- **Component:** `SearchModal.tsx`
- **Features:**
  - Global search trigger
  - Keyboard shortcut (Cmd+K)

### 12.4 Audio Phrasebook (IMPLEMENTED ✅)
- **Component:** `AudioPhrasebook.tsx`
- **Status:** Stub/placeholder for audio clips

### 12.5 Interactive Map (IMPLEMENTED ✅)
- **Component:** `InteractiveMap.tsx`
- **Status:** Placeholder for Google Maps integration

### 12.6 WhatsApp Share (IMPLEMENTED ✅)
- **Component:** `WhatsAppShare.tsx`
- **Features:** Share buttons for content

### 12.7 Profile Page (IMPLEMENTED ✅)
- **Component:** `Profile.tsx`
- **Route:** `/profile`
- **Features:**
  - Edit profile (name, bio, location, avatar)
  - Change password
  - View activity (placeholder)
  - Account information display

---

## 13. Backend Routes (IMPLEMENTED ✅)

### 13.1 Mentorship API (IMPLEMENTED ✅)
- **Endpoint:** `/api/mentorship`
- **Features:**
  - `POST /api/mentorship/register` — Register as mentor
  - `GET /api/mentorship/mentors` — List mentors (filterable by skill)
  - `GET /api/mentorship/mentees` — List mentees
  - `POST /api/mentorship/request` — Request mentorship
  - `GET /api/mentorship/my` — Get my mentorship status
  - `PUT /api/mentorship/:id` — Update status/notes

### 13.2 Jobs/Opportunities API (IMPLEMENTED ✅)
- **Endpoint:** `/api/jobs`
- **Features:**
  - `GET /api/jobs` — List jobs (filterable by type, category, location)
  - `GET /api/jobs/:id` — Get job detail
  - `POST /api/jobs` — Post job (authenticated)
  - `PUT /api/jobs/:id` — Update job
  - `DELETE /api/jobs/:id` — Delete job
  - `PUT /api/jobs/:id/close` — Close job

### 13.3 Calendar API (IMPLEMENTED ✅)
- **Endpoint:** `/api/calendar`
- **Features:**
  - `GET /api/calendar` — Get all events (festivals + DB events)
  - `GET /api/calendar/festivals` — Get static festival dates
  - `GET /api/calendar/upcoming` — Get upcoming events/festivals
  - `GET /api/calendar/best-time-to-visit` — Travel recommendations
  - `GET /api/calendar/meta` — Categories and types

### 13.4 Oral History API (IMPLEMENTED ✅)
- **Endpoint:** `/api/oral-history`
- **Features:**
  - `GET /api/oral-history` — List oral histories (filterable)
  - `GET /api/oral-history/:id` — Get single recording
  - `POST /api/oral-history` — Create (authenticated)
  - `PUT /api/oral-history/:id` — Update
  - `DELETE /api/oral-history/:id` — Delete
  - `GET /api/oral-history/admin/all` — Admin list
  - `PUT /api/oral-history/admin/:id/approve` — Approve

### 13.5 Genealogy API (IMPLEMENTED ✅)
- **Endpoint:** `/api/genealogy`
- **Features:**
  - `GET /api/genealogy/houses` — List war canoe houses
  - `GET /api/genealogy/houses/:id` — Get house detail
  - `POST /api/genealogy/houses` — Create house (admin)
  - `PUT /api/genealogy/houses/:id` — Update house (admin)
  - `GET /api/genealogy/tree` — Full lineage tree
  - `POST /api/genealogy/init` — Initialize default houses

---

## 14. PWA & Offline Features

### 14.1 Service Worker (IMPLEMENTED ✅)
- **File:** `public/sw.js`
- **Features:**
  - Cache-first for static assets
  - Network-first for API calls
  - Offline fallback
  - Push notification handlers
  - Background sync support

### 14.2 Offline Content (IMPLEMENTED ✅)
- **Frontend:** Registered in `main.tsx`
- **Features:**
  - Service worker registration on load
  - Static asset caching
  - Dynamic content caching

---

## 15. SEO & Social

### 15.1 Structured Data (NOT IMPLEMENTED ❌)
- **Recommended:**
  - JSON-LD for Organization
  - Schema.org for Place/Event
  - OpenGraph tags
  - Twitter Cards

### 15.2 Sitemap (NOT IMPLEMENTED ❌)
- **Recommended:**
  - Dynamic sitemap.xml
  - Auto-update with new content

### 15.3 Robots.txt (NOT IMPLEMENTED ❌)
- **Recommended:**
  - Basic SEO rules

---

## 16. Third-Party Integrations

### 16.1 Google Maps API (NOT IMPLEMENTED ❌)
- **Status:** InteractiveMap placeholder exists
- **Required:**
  - Google Cloud project
  - API key configuration
  - Map markers for Ke Kingdom

### 16.2 Paystack (PARTIAL ⚠️)
- **Status:** Simulated, needs real keys
- **Required:**
  - PAYSTACK_PUBLIC_KEY
  - PAYSTACK_SECRET_KEY
  - Webhook URL configuration

### 16.3 Firebase Auth (NOT IMPLEMENTED ❌)
- **Alternative to JWT:** Consider Firebase for easier auth

### 16.4 Cloudinary (NOT IMPLEMENTED ❌)
- **Recommended:** Replace local uploads

### 16.5 SendGrid/Mailgun (NOT IMPLEMENTED ❌)
- **Recommended:** For email notifications

---

## 17. Deployment & Infrastructure

### 17.1 cPanel Node.js (NOT CONFIGURED ❌)
- **Required:**
  - Node.js selector configuration
  - Environment variables setup
  - PM2 process manager

### 17.2 SSL Certificate (NOT CONFIGURED ❌)
- **Required:** Let's Encrypt or paid cert

### 17.3 Custom Domain (NOT CONFIGURED ❌)
- **Recommended:** keKingdom.com.ng

### 17.4 Build Process (CONFIGURED ✅)
- **Frontend:** `npm run build` → dist/
- **Backend:** Express server on port 5000

---

## 18. Admin Panel UI Features (Current Implementation)

### 18.1 Dashboard Tab (EXISTING ✅)
- Stats cards for all content types
- Pending actions summary
- Recent activity feed

### 18.2 Events Tab (EXISTING ✅)
- List view with date and type
- Add/Edit/Delete buttons (UI ready)

### 18.3 News Tab (EXISTING ✅)
- List view with publish status
- Add/Edit/Delete buttons (UI ready)

### 18.4 Gallery Tab (EXISTING ✅)
- Grid view with images
- Approve/Reject functionality

### 18.5 Directory Tab (EXISTING ✅)
- List view with location
- Approve functionality

### 18.6 Contacts Tab (EXISTING ✅)
- List view with read status
- Mark as read functionality
- Type filtering

### 18.7 Environment Tab (PLACEHOLDER ❌)
- Coming soon message

### 18.8 Projects Tab (PLACEHOLDER ❌)
- Coming soon message

---

## Summary: Internal Features Status

| Category | Implemented | Not Implemented | Partial |
|----------|-------------|-----------------|---------|
| Authentication | 5 | 0 | 0 |
| CMS/Admin | 8 | 0 | 0 |
| File Upload | 8+ (enhanced) | 0 | 0 |
| Donations | 4 | 0 | 1 |
| Search | 2 | 0 | 0 |
| Newsletter | 2 | 0 | 0 |
| Notifications | 0 | 3 | 0 |
| Analytics | 0 | 3 | 0 |
| API Infrastructure | 1 | 2 | 0 |
| Database | 1 | 2 | 0 |
| Security | 5 | 0 | 0 |
| Frontend | 7 | 0 | 1 |
| PWA | 2 | 0 | 0 |
| SEO | 0 | 3 | 0 |
| Integrations | 1 | 4 | 1 |
| Deployment | 1 | 3 | 0 |

**Overall: ~80% Complete**
