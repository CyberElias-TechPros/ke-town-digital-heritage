# KE Kingdom Digital Heritage - Ultra-Granular Implementation Todo List

**Generated:** June 3, 2026  
**Current Completion:** ~55%  
**Target:** 100% production-ready  
**Status:** ACTIVE — Implementation in progress

---

## CRITICAL BUGS (Must Fix Immediately)

### CB-01: Hardcoded Stripe Test Key in PaymentSystem.tsx
- **File:** `src/components/PaymentSystem.tsx`
- **Issue:** Stripe publishable key is hardcoded as `'pk_test_...'` — will fail in production and exposes test credentials
- **Fix:** Move to environment variable `VITE_STRIPE_PUBLISHABLE_KEY`, load from `.env`

### CB-02: Profile.tsx Uses `<a>` Tags Instead of React Router `<Link>`
- **File:** `src/pages/Profile.tsx`
- **Issue:** `<a href="/marketplace">` causes full page reload, breaks SPA behavior
- **Fix:** Replace all `<a>` with `<Link to="">` from react-router-dom

### CB-03: Cart.tsx Navigates to Non-Existent Route Parameter
- **File:** `src/pages/Cart.tsx`
- **Issue:** `navigate('/profile?tab=orders')` — `?tab=orders` is not a real route parameter
- **Fix:** Either add `tab` state management in Profile.tsx or navigate to `/orders` directly

### CB-04: Audio Visualizer Never Receives Audio Data
- **File:** `src/components/CulturalRecording.tsx`
- **Issue:** `analyserRef` is created in useEffect but never connected to `mediaRecorder.stream.getAudioTracks()` — visualizer never animates
- **Fix:** Connect analyser node to MediaRecorder stream before recording starts

### CB-05: CreateEvent.tsx and Events.tsx Both Have Create Event Modals (Duplicate)
- **Files:** `src/pages/CreateEvent.tsx`, `src/pages/Events.tsx`
- **Issue:** Two separate implementations of the same create-event flow — maintenance nightmare
- **Fix:** Remove modal from Events.tsx, keep only CreateEvent.tsx page, update Events.tsx to route to `/events/create`

### CB-06: CreateGroup.tsx and Groups.tsx Both Have Create Group Modals (Duplicate)
- **Files:** `src/pages/CreateGroup.tsx`, `src/pages/Groups.tsx`
- **Issue:** Two separate implementations of the same create-group flow
- **Fix:** Remove modal from Groups.tsx, keep only CreateGroup.tsx page, update Groups.tsx to route to `/groups/create`

### CB-07: GroupDetail.tsx Links to Non-Existent Route
- **File:** `src/pages/GroupDetail.tsx`
- **Issue:** Links to `/groups/:id/create-post` — route not defined in App.tsx
- **Fix:** Either add the route or change link to use existing post creation flow

### CB-08: ElderStories.tsx Play/Pause Buttons Don't Actually Play Audio
- **File:** `src/pages/ElderStories.tsx`
- **Issue:** `handlePlay` sets `playingId` state but never creates/plays an Audio object
- **Fix:** Implement actual `new Audio(url).play()` with pause/stop logic

### CB-09: Feed.tsx Image/Gallery Attach Buttons Are Inline SVG Stubs
- **File:** `src/pages/Feed.tsx`
- **Issue:** Image and gallery attach buttons are inline SVGs with no onClick handlers — completely decorative
- **Fix:** Add onClick handlers that trigger file picker dialogs, similar to Posts.tsx

### CB-10: Chat.tsx Phone/Video/MoreVertical Buttons Have No Handlers
- **File:** `src/pages/Chat.tsx`
- **Issue:** Phone call, video call, and more options buttons are rendered but have zero functionality
- **Fix:** Implement at minimum a "Coming Soon" toast notification or placeholder modal

### CB-11: Chat.tsx Paperclip/Image/Smile Buttons Are console.log Stubs
- **File:** `src/pages/Chat.tsx`
- **Issue:** Attachment, image, and emoji buttons only log to console
- **Fix:** Implement file attachment upload, image picker, and emoji picker modals

### CB-12: Messages.tsx Search Conversations Input Has No onChange Handler
- **File:** `src/pages/Messages.tsx`
- **Issue:** Search input renders but doesn't filter conversation list
- **Fix:** Add onChange handler that filters `conversations` state by search query

### CB-13: All Dead/Stubbed Buttons Across the App (12+ instances)
- **Files:** Multiple
- **Issue:** See detailed table below

| File | Button | Issue | Priority |
|------|--------|-------|----------|
| `Admin.tsx` | Add Event (Events tab) | No onClick handler | HIGH |
| `Admin.tsx` | Edit button (Events/News rows) | No onClick handler | HIGH |
| `Admin.tsx` | Trash/Delete button (Events/News rows) | No onClick handler | HIGH |
| `Admin.tsx` | Reject (X) on gallery items | No handler | MEDIUM |
| `Admin.tsx` | Environment tab | "Coming soon" placeholder | MEDIUM |
| `Admin.tsx` | Projects tab | "Coming soon" placeholder | MEDIUM |
| `Settings.tsx` | Enable 2FA button | No onClick handler | MEDIUM |
| `GroupDetail.tsx` | Settings button (admin) | No handler | MEDIUM |
| `VirtualTours.tsx` | Save to Favorites | No handler | LOW |
| `VirtualTours.tsx` | Get Directions | No handler | LOW |
| `Marketplace.tsx` | Request Information (modal) | No handler | MEDIUM |
| `Product.tsx` | Share button | No handler | LOW |
| `SavedPosts.tsx` | Share button | No handler | LOW |
| `Explore.tsx` | No unfollow once followed | Can only follow, never unfollow | MEDIUM |
| `Seller.tsx` | Products/Orders/Messages/Settings tabs | All empty placeholders | HIGH |
| `Feed.tsx` | Image/Gallery attach | Inline SVG stubs | HIGH |
| `Profile.tsx` | Activity tab | Empty placeholder, no data loaded | MEDIUM |
| `Profile.tsx` | Product cards in My Products | Non-clickable display only | LOW |
| `GenealogyTree.tsx` | Export button | Called but no download/feedback | MEDIUM |
| `PaymentSystem.tsx` | Remove button icon | Uses AlertCircle instead of Trash2/X | LOW |

### CB-14: Contact.tsx WhatsApp/Facebook/Location Links Are href="#"
- **File:** `src/pages/Contact.tsx`
- **Issue:** All social media and location links point to `#` — completely broken
- **Fix:** Update with actual URLs or remove/hide until real URLs are available

### CB-15: Environment.tsx Resource Links Are href="#"
- **File:** `src/pages/Environment.tsx`
- **Issue:** NDDC, HYPREP, NOSDRA links all point to `#`
- **Fix:** Update with actual organization URLs

### CB-16: SocialMediaLayout.tsx CreatePostModal Uses window.location.reload()
- **File:** `src/components/SocialMediaLayout.tsx`
- **Issue:** After posting, uses `window.location.reload()` instead of updating state or using React Query invalidation
- **Fix:** Use `queryClient.invalidateQueries(['/posts/feed'])` or state update

### CB-17: No User-Visible Error States Anywhere
- **Files:** All pages
- **Issue:** Errors are only `console.error` — users see nothing when operations fail
- **Fix:** Add toast notifications for all error states, add error banners in UI

### CB-18: alert() Used for Validation Instead of Inline Errors
- **Files:** `CreateListing.tsx`, `CreateEvent.tsx`, `CreateGroup.tsx`
- **Issue:** Uses browser `alert()` which blocks UI and looks unprofessional
- **Fix:** Replace with inline error messages under each form field

### CB-19: ApiClient Logs Every Request to Console in Production
- **File:** `src/lib/api.ts`
- **Issue:** `console.log('Trying...')`, `console.log('Response from...')`, `console.log('Success using...')` — noise in production console
- **Fix:** Guard console logs behind `import.meta.env.DEV` check or remove entirely

### CB-20: No Loading Skeletons for Most Pages
- **Files:** Multiple pages
- **Issue:** Most pages show blank content while loading, some show loading text but not skeleton cards
- **Fix:** Add proper skeleton loaders matching content layout for all data-fetching pages

---

## MISSING BACKEND API ENDPOINTS (Frontend Calls These, Backend Doesn't Have Them)

### BE-01: Analytics Endpoints (15+ API calls in frontend, ZERO backend routes)
- **Frontend:** `api.getAnalytics()`, `api.getUserAnalytics()`, `api.getContentAnalytics()`, `api.getMarketplaceAnalytics()`, `api.getEventsAnalytics()`, `api.getCulturalAnalytics()`, `api.exportAnalytics()`, `api.getRealTimeMetrics()`, `api.getCustomReport()`, `api.getAnalyticsOverview()`
- **Backend:** No `/api/analytics` routes exist
- **Fix:** Create new `server/routes/analytics.js` with all analytics endpoints

### BE-02: AI Recommendation Endpoints (10+ API calls in frontend, ZERO backend routes)
- **Frontend:** `api.getAIRecommendations()`, `api.getRecommendationProfile()`, `api.updateRecommendationProfile()`, `api.trackRecommendationInteraction()`, `api.dismissRecommendation()`, `api.getRecommendationFeedback()`, `api.getSimilarContent()`, `api.getTrendingContent()`, `api.getPersonalizedFeed()`
- **Backend:** No `/api/ai` routes exist
- **Fix:** Create new `server/routes/ai.js` with recommendation endpoints (or stub with mock data)

### BE-03: Genealogy/Tree Endpoints (Frontend uses `/genealogy/trees`, backend uses `/genealogy/houses`)
- **Frontend:** `api.getFamilyTrees()`, `api.getFamilyTree()`, `api.createFamilyTree()`, `api.updateFamilyTree()`, `api.deleteFamilyTree()`, `api.addFamilyMember()`, `api.updateFamilyMember()`, `api.deleteFamilyMember()`, `api.exportFamilyTree()`, `api.importFamilyTree()`, `api.searchFamilyMembers()`, `api.getFamilyTreeStats()`, `api.addRelationship()`, `api.removeRelationship()`
- **Backend:** Only has `/api/genealogy/houses` and `/api/genealogy/tree` (singular) — completely different API contract
- **Fix:** Either rename backend routes to match frontend OR update frontend API methods to match backend

### BE-04: Payments Endpoints (Many frontend calls, incomplete backend)
- **Frontend:** `api.getPaymentMethods()`, `api.addPaymentMethod()`, `api.removePaymentMethod()`, `api.setDefaultPaymentMethod()`, `api.getTransactions()`, `api.createPaymentIntent()`, `api.confirmPayment()`, `api.requestWithdrawal()`, `api.getBalance()`, `api.getPaymentHistory()`
- **Backend:** Has `/api/payments.js` but may not implement all these specific endpoints
- **Fix:** Audit server/routes/payments.js and add missing endpoints

### BE-05: Trending/Discovery Endpoints
- **Frontend:** `api.getTrendingPosts()`, `api.getSuggestedUsers()`, `api.getTrendingEvents()`, `api.getTrendingProducts()`
- **Backend:** May not have `/posts/trending`, `/users/suggested`, `/events/trending`, `/marketplace/trending`
- **Fix:** Add trending endpoints to respective route files or `server/routes/social.js`

### BE-06: Real Socket.io Server Setup
- **Frontend:** `src/hooks/useWebSocket.ts` (needs verification), expects Socket.io server
- **Backend:** Has `socket.io` dependency, may have basic setup but needs verification
- **Fix:** Verify Socket.io server is properly initialized in `server/index.js` with auth middleware

---

## MISSING FRONTEND PAGES/COMPONENTS (Referenced in Docs, Not Built)

### FE-01: ResetPassword.tsx Page
- **Status:** NOT CREATED
- **Why needed:** `AuthContext` has `resetPassword()` method, `api.ts` has `resetPassword()` call, but no page exists
- **Route needed:** `/reset-password`
- **Implementation:** Simple form with new password + confirm password fields

### FE-02: VerifyEmail.tsx Page
- **Status:** NOT CREATED
- **Why needed:** `AuthContext` has `verifyEmail()` method, backend has `/api/auth/verify-email`
- **Route needed:** `/verify-email`
- **Implementation:** Success/failure page after email verification link click

### FE-03: 2FA Setup Page
- **Status:** NOT CREATED
- **Why needed:** Settings.tsx has "Enable 2FA" button (currently dead)
- **Route needed:** `/settings/security` or inline in Settings.tsx
- **Implementation:** QR code display, backup codes, TOTP verification flow

### FE-04: OrderDetail.tsx Actions Missing
- **File:** `src/pages/OrderDetail.tsx`
- **Issue:** No action buttons (cancel order, return item, contact seller, track shipment, leave review)
- **Fix:** Add action buttons with corresponding API calls

### FE-05: Orders.tsx Missing Actions
- **File:** `src/pages/Orders.tsx`
- **Issue:** No order cancellation, return request, or re-order functionality
- **Fix:** Add action buttons per order card

### FE-06: AnalyticsDashboard.tsx Charts Are Text Placeholders
- **File:** `src/components/AnalyticsDashboard.tsx`
- **Issue:** Shows "User growth chart will be rendered here" instead of actual charts
- **Fix:** Integrate recharts (already installed) with real analytics data

### FE-07: AnalyticsDashboard.tsx Export Has No File Download Handler
- **File:** `src/components/AnalyticsDashboard.tsx`
- **Issue:** Export button calls API but has no `Blob` download handler
- **Fix:** Add `response.blob()` → `URL.createObjectURL` → `<a download>` flow

### FE-08: GenealogyTree.tsx Export Has No Download
- **File:** `src/components/GenealogyTree.tsx`
- **Issue:** Export button calls API but no file download happens
- **Fix:** Add Blob download handler same as AnalyticsDashboard

### FE-09: GenealogyTree.tsx Relationship Editor Missing
- **File:** `src/components/GenealogyTree.tsx`
- **Issue:** Data model supports spouse/children/parents/siblings but no UI to set them
- **Fix:** Add relationship type selector and target member picker in member detail modal

### FE-10: Search.tsx Filter Change Doesn't Auto-Search
- **File:** `src/pages/Search.tsx`
- **Issue:** Changing filter chip (All/People/Posts/etc.) doesn't trigger new search
- **Fix:** Pass `activeFilter` as dependency to useEffect that triggers search

### FE-11: VirtualTours.tsx Save Favorites Button
- **File:** `src/pages/VirtualTours.tsx`
- **Issue:** Save to Favorites button has no handler
- **Fix:** Implement favorites/wishlist API or local storage toggle

### FE-12: VirtualTours.tsx Get Directions Button
- **File:** `src/pages/VirtualTours.tsx`
- **Issue:** Get Directions button has no handler
- **Fix:** Open Google Maps with location coordinates, or show "Directions coming soon" toast

### FE-13: Product.tsx Share Button
- **File:** `src/pages/Product.tsx`
- **Issue:** Share button has no handler
- **Fix:** Implement native Web Share API or copy-link-to-clipboard with toast

### FE-14: SavedPosts.tsx Share Button
- **File:** `src/pages/SavedPosts.tsx`
- **Issue:** Share button has no handler
- **Fix:** Same as Product.tsx share implementation

### FE-15: Marketplace.tsx Request Information Button
- **File:** `src/pages/Marketplace.tsx`
- **Issue:** Inside product detail modal, "Request Information" button has no handler
- **Fix:** Navigate to product detail page `/product/:id` or open contact form prefilled with product info

### FE-16: Explore.tsx No Unfollow Once Followed
- **File:** `src/pages/Explore.tsx`
- **Issue:** Follow button becomes "Following" but can't unfollow from Explore
- **Fix:** Toggle between Follow/Unfollow using `followUser()` and need `unfollowUser()` API call

### FE-17: Index.tsx News/Event Cards Not Clickable
- **File:** `src/pages/Index.tsx`
- **Issue:** News and event cards show on homepage but don't navigate to detail pages
- **Fix:** Wrap cards in `<Link>` to `/news/:id` and `/events/:id` (or open event detail modal)

### FE-18: Index.tsx No Marketplace Link on Homepage
- **File:** `src/pages/Index.tsx`
- **Issue:** No link to marketplace from homepage despite marketplace being core feature
- **Fix:** Add marketplace quick-access card or section

### FE-19: Comments System Needs Robustness
- **Files:** `CommentSection.tsx`, `LikeButton.tsx`
- **Issue:** Need to verify these components have proper error handling, loading states, and optimistic updates
- **Fix:** Review and add error boundaries, optimistic updates, retry logic

### FE-20: No 404 Page Suggestions
- **File:** `src/pages/NotFound.tsx`
- **Issue:** 404 page only has "Return to Home" link
- **Fix:** Add suggested pages, search box, and popular links on 404 page

---

## MISSING/INCOMPLETE BACKEND ROUTES

### BE-07: Analytics Routes Missing
- **File needed:** `server/routes/analytics.js`
- **Endpoints to implement:**
  - `GET /api/analytics` — Overview stats (DAU, posts, engagement)
  - `GET /api/analytics/overview` — Dashboard overview metrics
  - `GET /api/analytics/users` — User growth metrics
  - `GET /api/analytics/content` — Content performance
  - `GET /api/analytics/marketplace` — Commerce metrics
  - `GET /api/analytics/events` — Event metrics
  - `GET /api/analytics/cultural` — Cultural content metrics
  - `GET /api/analytics/realtime` — Live metrics (WebSocket data)
  - `GET /api/analytics/export` — CSV/JSON/PDF export
  - `POST /api/analytics/custom` — Custom report generation

### BE-08: AI Routes Missing
- **File needed:** `server/routes/ai.js`
- **Endpoints to implement:**
  - `GET /api/ai/recommendations` — Personalized recommendations (start with mock data)
  - `GET /api/ai/profile` — User recommendation profile
  - `PUT /api/ai/profile` — Update recommendation profile
  - `POST /api/ai/track` — Track interaction with recommendation
  - `POST /api/ai/recommendations/:id/dismiss` — Dismiss recommendation
  - `POST /api/ai/recommendations/:id/feedback` — Like/dislike feedback
  - `GET /api/ai/similar/:type/:id` — Similar content
  - `GET /api/ai/trending` — Trending content
  - `GET /api/ai/feed` — AI-personalized feed

### BE-09: Genealogy Tree Routes Mismatch
- **Current backend:** `/api/genealogy/houses`, `/api/genealogy/tree`
- **Frontend expects:** `/api/genealogy/trees`, `/api/genealogy/trees/:id`, etc.
- **Fix Option A:** Add new routes `server/routes/genealogy.js` with full tree CRUD
- **Fix Option B:** Update frontend `api.ts` to match existing backend routes

### BE-10: Email Notification System Missing
- **Current:** `nodemailer` is in server package.json but not configured
- **Needed:**
  - Welcome email on registration
  - Email verification link
  - Password reset email
  - Contact form auto-responder
  - Donation receipt
  - Event reminder emails
- **Fix:** Create `server/services/email.js`, configure SMTP in .env, integrate into relevant routes

### BE-11: Seed Data Missing for Many Collections
- **Current:** `server/seed.js` exists but may not cover all collections
- **Needed:** Seed data for posts, products, orders, groups, messages, payments, analytics, AI data
- **Fix:** Expand seed.js with realistic sample data for all collections

### BE-12: Server Health Check Enhancement
- **Current:** `GET /api/health` returns basic status
- **Needed:** Database connectivity check, memory usage, uptime
- **Fix:** Enhance to include DB status, version, timestamp

---

## FRONTEND FLOW COMPLETENESS AUDIT

### Flow 01: Guest → Registration → Login → First Post
- **Status:** 80% complete
- **Missing:**
  - Welcome tour/onboarding after first login
  - Profile completion prompt
  - Email verification flow (page exists in API, not in UI)

### Flow 02: Browse Events → RSVP → Receive Reminder
- **Status:** 60% complete
- **Missing:**
  - RSVP confirmation email/notification
  - Event reminder before event starts
  - Event calendar sync (.ics download)

### Flow 03: Browse Marketplace → Add to Cart → Checkout → Order
- **Status:** 70% complete
- **Missing:**
  - Real payment processing (Paystack/Stripe not actually wired)
  - Order confirmation page
  - Order tracking updates
  - Seller notification of new order

### Flow 04: Create Post → Get Reactions → See in Feed
- **Status:** 85% complete
- **Missing:**
  - Real-time feed updates via WebSocket (partially done)
  - Post edit/delete confirmation
  - Report post functionality

### Flow 05: Send Message → Real-time Delivery → Read Receipts
- **Status:** 75% complete
- **Missing:**
  - Media attachment upload
  - Emoji picker
  - Voice messages
  - Message search within conversation

### Flow 06: Create Group → Invite Members → Group Posts
- **Status:** 60% complete
- **Missing:**
  - Group member approval workflow (private groups)
  - Group settings page
  - Group post creation within group
  - Group media/events tabs (empty placeholders)

### Flow 07: Admin Content Moderation Flow
- **Status:** 50% complete
- **Missing:**
  - Environment/Projects tab content
  - Bulk approve/reject actions
  - Content search/filter in admin
  - User management page (list users, change roles)

### Flow 08: Donation Flow
- **Status:** 40% complete
- **Missing:**
  - Real Paystack integration (currently simulated)
  - Donation receipt generation
  - Donation history page
  - Project-specific donation tracking

### Flow 09: Seller Flow
- **Status:** 30% complete
- **Missing:**
  - Full product management (in Seller.tsx placeholder tabs)
  - Order fulfillment workflow
  - Seller analytics
  - Payout/withdrawal flow

### Flow 10: Profile Completion Flow
- **Status:** 50% complete
- **Missing:**
  - Avatar upload (only URL input, no file upload)
  - Profile completeness indicator
  - Bio/location suggestions
  - Cover photo (only avatar supported)

### Flow 11: Search & Discovery Flow
- **Status:** 70% complete
- **Missing:**
  - Search result highlighting
  - Recent searches management (view/clear)
  - Popular/trending searches
  - Search within conversations/messages
  - Advanced filters (date range, location, etc.)

### Flow 12: Cultural Heritage Browsing Flow
- **Status:** 80% complete
- **Missing:**
  - Interactive timeline (horizontal scrollable)
  - Audio archive for oral traditions
  - Virtual tour (360° viewer)
  - Genealogy tree visualization
  - Language audio phrasebook (stub only)

---

## INFRASTRUCTURE & DEPLOYMENT

### INF-01: Environment Configuration Validation
- **Issue:** No validation that required env vars are set at startup
- **Fix:** Add startup check in server/index.js that verifies all required env vars

### INF-02: cPanel Deployment Guide Needs Verification
- **Current:** MYSQL_SETUP_GUIDE.md exists but may not match actual app structure
- **Fix:** Test and verify deployment steps work with current codebase

### INF-03: No Database Index Strategy
- **Issue:** MongoDB collections may lack indexes for common queries
- **Fix:** Add indexes to models for: userId, createdAt, status, category fields

### INF-04: No Database Backup Strategy
- **Issue:** No automated backup configuration
- **Fix:** Add MongoDB Atlas backup or configure custom backup script

### INF-05: SEO Not Implemented
- **Current:** PageSEO.tsx and SEO.tsx components exist but not integrated into pages
- **Fix:** Add PageSEO to every page component with appropriate meta tags

### INF-06: Sitemap Not Generated
- **Current:** scripts/generate-sitemap.js exists but may not be complete
- **Fix:** Complete and test sitemap generation

### INF-07: robots.txt Missing
- **Fix:** Add public/robots.txt

### INF-08: PWA Manifest Needs Enhancement
- **Current:** public/manifest.json exists
- **Fix:** Add all required PWA fields, test install prompt

---

## SECURITY HARDENING

### SEC-01: Input Validation Missing on Backend
- **Issue:** No express-validator or Joi middleware on routes
- **Fix:** Add input validation to all POST/PUT routes

### SEC-02: No CSRF Protection
- **Issue:** Forms don't have CSRF tokens
- **Fix:** Add CSRF middleware or use SameSite cookies

### SEC-03: No CAPTCHA on Public Forms
- **Issue:** Registration, contact, and comment forms are vulnerable to bots
- **Fix:** Add reCAPTCHA v3 or hCaptcha to public forms

### SEC-04: No Request Logging/Audit Trail
- **Issue:** Admin actions not logged for accountability
- **Fix:** Add audit logging middleware for admin routes

### SEC-05: Password Reset Uses JWT Token Directly in API
- **Issue:** `api.resetPassword(token, newPassword)` passes token in body — should use separate reset token from email link
- **Fix:** Implement proper password reset flow with time-limited tokens

### SEC-06: No Rate Limiting on Socket.io
- **Issue:** Socket.io connections may not be rate-limited
- **Fix:** Add socket.io rate limiting middleware

### SEC-07: CORS May Be Too Permissive
- **Issue:** CORS configured but may allow all origins in production
- **Fix:** Restrict CORS to specific production domain(s)

---

## PERFORMANCE OPTIMIZATIONS

### PERF-01: No React Query Caching Strategy
- **Issue:** TanStack Query is installed but may not be configured for optimal caching
- **Fix:** Add staleTime, cacheTime, and query key strategies for all API calls

### PERF-02: No Code Splitting
- **Issue:** All routes loaded in single bundle
- **Fix:** Implement React.lazy() + Suspense for route-level code splitting

### PERF-03: No Image Optimization
- **Issue:** Images loaded at full resolution
- **Fix:** Add next/image equivalent or use loading="lazy" + responsive srcset

### PERF-04: No Service Worker Cache Strategy Optimization
- **Issue:** Service worker caches static assets but may not handle API caching properly
- **Fix:** Implement stale-while-revalidate for API calls in service worker

### PERF-05: Large Bundle Size
- **Issue:** Many shadcn/ui components may be unused but still bundled
- **Fix:** Audit and remove unused dependencies/components

---

## ACCESSIBILITY (WCAG 2.2 AA)

### A11Y-01: No ARIA Labels on Interactive Elements
- **Issue:** Many buttons, inputs, and interactive divs lack aria-label or aria-describedby
- **Fix:** Add ARIA labels to all interactive elements

### A11Y-02: No Skip Navigation Link
- **Issue:** No way to skip past navigation for screen readers
- **Fix:** Add skip-to-content link at top of pages

### A11Y-03: No Focus Management for Modals
- **Issue:** Modals don't trap focus or return focus on close
- **Fix:** Implement focus trap in all modal/dialog components

### A11Y-04: Color Contrast May Not Meet AA Standards
- **Issue:** Design system uses custom colors but contrast not verified
- **Fix:** Run contrast checker, adjust colors to meet 4.5:1 ratio

### A11Y-05: No Keyboard Navigation for Custom Components
- **Issue:** Carousel, timeline, and custom widgets may not be keyboard accessible
- **Fix:** Add keyboard event handlers for all interactive non-native elements

### A11Y-06: Form Labels May Be Missing or Improper
- **Issue:** Some inputs may lack associated labels or use placeholders as labels
- **Fix:** Ensure all form fields have visible or screen-reader-only labels

---

## TESTING COVERAGE

### TEST-01: No Unit Tests for API Client
- **Issue:** `src/lib/api.ts` and `src/contexts/AuthContext.tsx` have no unit tests
- **Fix:** Write tests for login, register, logout, profile update flows

### TEST-02: No Component Tests for Critical Pages
- **Issue:** Login, Register, Cart, Checkout, and Admin pages have no component tests
- **Fix:** Write Vitest tests for critical user flows

### TEST-03: No E2E Tests
- **Issue:** Playwright is configured but no test files exist beyond basic setup
- **Fix:** Write E2E tests for: register → login → create post → logout flow

### TEST-04: No Backend Route Tests
- **Issue:** Server routes have no test coverage
- **Fix:** Write tests for auth, posts, events, marketplace routes

---

## DOCUMENTATION GAPS

### DOC-01: README.md Is Empty
- **File:** `README.md`
- **Issue:** Only contains "TODO: Document your project here"
- **Fix:** Write comprehensive README with setup, deployment, features, and API docs

### DOC-02: No API Documentation
- **Issue:** No OpenAPI/Swagger spec for backend APIs
- **Fix:** Generate OpenAPI spec or add inline route documentation

### DOC-03: No Component Documentation
- **Issue:** Reusable components lack prop documentation
- **Fix:** Add TSDoc comments to shared components

### DOC-04: No Deployment Runbook
- **Issue:** Deployment steps exist in multiple MD files but not consolidated
- **Fix:** Create DEPLOYMENT.md with step-by-step deployment instructions

---

## IMPLEMENTATION ORDER

### Phase 1: Critical Bugs (Days 1-2)
1. CB-01: Fix hardcoded Stripe key → env var
2. CB-02: Fix Profile.tsx `<a>` → `<Link>`
3. CB-03: Fix Cart.tsx navigation
4. CB-04: Fix audio visualizer
5. CB-05: Deduplicate CreateEvent
6. CB-06: Deduplicate CreateGroup
7. CB-07: Fix GroupDetail.tsx broken link
8. CB-14: Fix Contact.tsx broken social links
9. CB-15: Fix Environment.tsx broken resource links
10. CB-16: Fix CreatePostModal window.location.reload()
11. CB-17: Add user-visible error toasts
12. CB-18: Replace alert() with inline validation

### Phase 2: Dead Buttons (Days 3-5)
13. CB-08: Implement ElderStories audio playback
14. CB-09: Wire Feed.tsx image/gallery attach buttons
15. CB-10: Implement Chat.tsx Phone/Video buttons
16. CB-11: Implement Chat.tsx media attachment
17. CB-12: Wire Messages.tsx search
18. CB-13: Wire all 15+ remaining dead buttons
19. CB-19: Guard console logs in production

### Phase 3: Backend Routes (Days 6-10)
20. BE-01: Implement analytics routes
21. BE-02: Implement AI routes (with mock data)
22. BE-03: Fix genealogy route mismatch
23. BE-04: Audit and fix payments routes
24. BE-05: Add trending endpoints
25. BE-06: Verify Socket.io server setup

### Phase 4: Missing Pages/Features (Days 11-15)
26. FE-01: Create ResetPassword.tsx
27. FE-02: Wire email verification in UI
28. FE-03: Implement 2FA flow (at minimum stub with "coming soon")
29. FE-04: Add OrderDetail.tsx action buttons
30. FE-05: Add Orders.tsx actions
31. FE-06: Integrate recharts into AnalyticsDashboard
32. FE-07: Add file download for export
33. FE-08: Add file download for genealogy export
34. FE-09: Add genealogy relationship editor
35. FE-10: Auto-search on filter change in Search.tsx
36. FE-11-15: Wire all remaining dead buttons
37. FE-16: Add unfollow in Explore.tsx
38. FE-17: Make Index.tsx cards clickable
39. FE-18: Add marketplace link to homepage
40. FE-19: Review CommentSection.tsx and LikeButton.tsx

### Phase 5: Backend Enhancement (Days 16-18)
41. BE-07: Email notification system
42. BE-08: Expand seed data
43. BE-09: Enhance health check
44. SEC-01-07: Security hardening

### Phase 6: Admin Panel Completion (Days 19-20)
45. Complete Environment tab content
46. Complete Projects tab content
47. Add user management table with role/status editing
48. Add content search and bulk actions

### Phase 7: Seller Features (Days 21-22)
49. Wire Seller.tsx Products tab → product management table
50. Wire Seller.tsx Orders tab → order management
51. Wire Seller.tsx Settings tab → shop settings form

### Phase 8: Infrastructure (Days 23-25)
52. INF-01: Env var validation on startup
53. INF-03: Add MongoDB indexes
54. INF-05: Integrate SEO components
55. INF-06: Complete sitemap
56. INF-07: Add robots.txt
57. INF-08: Enhance PWA manifest

### Phase 9: Polish (Days 26-30)
58. PERF-01-05: Performance optimizations
59. A11Y-01-06: Accessibility fixes
60. TEST-01-04: Write tests
61. DOC-01-04: Complete documentation
62. Final end-to-end testing
63. Production deployment

---

## TOTAL ITEMS COUNT

| Category | Count |
|----------|-------|
| Critical Bugs (CB) | 20 |
| Missing Backend Routes (BE) | 12 |
| Missing Frontend Features (FE) | 20 |
| Missing Backend Routes (separate) | 6 |
| Infrastructure (INF) | 8 |
| Security (SEC) | 7 |
| Performance (PERF) | 5 |
| Accessibility (A11Y) | 6 |
| Testing (TEST) | 4 |
| Documentation (DOC) | 4 |
| **TOTAL** | **~86 items** |

---

## PROGRESS TRACKING

Use this table to track implementation. Mark items as:
- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked

| ID | Item | Status | Notes |
|----|------|--------|-------|
| CB-01 | Hardcoded Stripe key | ⬜ | |
| CB-02 | Profile.tsx <a> → <Link> | ⬜ | |
| CB-03 | Cart.tsx broken route | ⬜ | |
| CB-04 | Audio visualizer fix | ⬜ | |
| CB-05 | Deduplicate CreateEvent | ⬜ | |
| CB-06 | Deduplicate CreateGroup | ⬜ | |
| CB-07 | GroupDetail broken link | ⬜ | |
| CB-08 | ElderStories audio playback | ⬜ | |
| CB-09 | Feed.tsx attach buttons | ⬜ | |
| CB-10 | Chat.tsx phone/video buttons | ⬜ | |
| CB-11 | Chat.tsx media buttons | ⬜ | |
| CB-12 | Messages.tsx search | ⬜ | |
| CB-13 | All dead buttons (15+) | ⬜ | |
| CB-14 | Contact.tsx broken links | ⬜ | |
| CB-15 | Environment.tsx broken links | ⬜ | |
| CB-16 | CreatePostModal reload fix | ⬜ | |
| CB-17 | Error UI everywhere | ⬜ | |
| CB-18 | Replace alert() | ⬜ | |
| CB-19 | Guard console logs | ⬜ | |
| CB-20 | Loading skeletons | ⬜ | |
| BE-01 | Analytics routes | ⬜ | |
| BE-02 | AI routes | ⬜ | |
| BE-03 | Genealogy route fix | ⬜ | |
| BE-04 | Payments audit | ⬜ | |
| BE-05 | Trending endpoints | ⬜ | |
| BE-06 | Socket.io verification | ⬜ | |
| BE-07 | Email notifications | ⬜ | |
| BE-08 | Seed data expansion | ⬜ | |
| BE-09 | Health check | ⬜ | |
| FE-01 | ResetPassword page | ⬜ | |
| FE-02 | Email verification UI | ⬜ | |
| FE-03 | 2FA stub | ⬜ | |
| FE-04 | OrderDetail actions | ⬜ | |
| FE-05 | Orders actions | ⬜ | |
| FE-06 | Analytics charts | ⬜ | |
| FE-07 | Export downloads | ⬜ | |
| FE-08 | Genealogy export | ⬜ | |
| FE-09 | Genealogy relationships | ⬜ | |
| FE-10 | Search auto-filter | ⬜ | |
| FE-11 | VirtualTours favorites | ⬜ | |
| FE-12 | VirtualTours directions | ⬜ | |
| FE-13-15 | Share buttons | ⬜ | |
| FE-16 | Explore unfollow | ⬜ | |
| FE-17 | Homepage cards clickable | ⬜ | |
| FE-18 | Homepage marketplace link | ⬜ | |
| FE-19 | Comment/Like robustness | ⬜ | |
| FE-20 | 404 suggestions | ⬜ | |

---

*Last Updated: June 3, 2026*  
*This document is updated after each implementation batch.*  
*See implementation commit history for detailed changes.*
