# Missing Features Analysis

An audit of everything the app needed in order to actually work end to end — what
was missing, what was built, and what is still genuinely open.

Legend: ✅ implemented and verified · ⚠️ implemented but simulated · ❌ not built,
needs a third party or a product decision.

---

## 1. Platform & infrastructure

| Gap | Why it mattered | Status |
| --- | --- | --- |
| No Cloudflare backend | The app shipped against a Railway-hosted Express + MySQL/MySQL-less server with no deploy target | ✅ `worker/` — 296 endpoints, 61 tables |
| No single origin | Two hosts meant CORS preflights on every call and a second thing to keep alive | ✅ One Worker serves `dist/` + `/api/*` |
| Frontend pointed at hardcoded Railway URLs | Every request went somewhere the user does not control | ✅ Same-origin by default; `VITE_API_SERVERS` is now optional failover only |
| No dev proxy | Local API calls could not work at all | ✅ `vite.config.ts` proxies `/api` (incl. WS) → `wrangler dev` |
| socket.io client against a Worker | socket.io cannot run on Workers; realtime was silently dead | ✅ Rewritten on native WebSocket + Durable Object |
| No rate limiting | Login was wide open to credential stuffing | ✅ KV sliding window, fails open |
| No migration path | Schema lived in ad-hoc SQL | ✅ `migrations/0001`, `0002`, applied via `wrangler d1 migrations apply` |

## 2. The build was broken

This was the most consequential finding. **The frontend did not compile.**

- `src/pages/Messages.tsx` had malformed JSX — a `motion.div` with no closing tag
  and a stray `</div>` in the middle of a ternary. The whole route tree failed.
- **63 TypeScript errors across 20 files.**
- Four of them were runtime-fatal, not type noise:

| File | Bug |
| --- | --- |
| `SocialMediaLayout.tsx` | `content`, `setContent`, `posting`, `setPosting` were referenced but never declared. The composer modal wrapped by ~19 social routes threw on every keystroke. |
| `SEO.tsx` | `useLocation` imported from `react` instead of `react-router-dom`. Crashed on every page. |
| `Profile.tsx` | `user` referenced 11 times; the variable is destructured as `currentUser`. Whole page blank. |
| `Groups.tsx` | `myGroups` read in a `useState` initializer *before* its own declaration — a TDZ `ReferenceError`. |
| `Admin.tsx` | `Link` used but never imported. |
| `Feed.tsx` | `Loader2` used but never imported. |
| `Explore.tsx` | `setActionError` called but never declared. |
| `PaymentSystem.tsx` | `Stripe.stripe(...)` — the package exports `loadStripe`. |
| `Environment.tsx` | Rendered `report.location` as a string; the API returns `{name, latitude, longitude}`. **"Objects are not valid as a React child"** took the page down. |

All fixed. `npx tsc -p tsconfig.app.json --noEmit` is now clean.

`npm run build` is `vite build`, which uses esbuild and **ignores type errors** —
that is how these survived. Both checks are now part of the workflow.

## 3. Frontend ↔ backend contract mismatches

The API and the pages disagreed about shape in three systemic ways.

**(a) Collection envelopes.** List endpoints answer with a descriptive wrapper
(`{news:[…]}`, `{stories:[…]}`, `{events:[…]}`) but pages called `.map()` /
`.filter()` on the response directly. `ElderStories`, `Activity`, `Cart`,
`Diaspora`, `Environment`, `Feed`, `Orders`, `SavedPosts`, `Search`, `Chat`,
`Checkout`, `Explore`, `Profile`, `Groups`, `Events`, `Notifications`, `Posts`,
`CommentSection`, `AIRecommendations`, `CulturalRecording`, `GenealogyTree`,
`PaymentSystem` and `SearchModal` all did this.

Fixed with a shared `asList<T>(data, key?)` normaliser in `src/lib/api.ts` —
unwraps the envelope, tolerates a bare array, and returns `[]` on anything else.
26 call sites converted. (A blanket unwrap inside `request()` was rejected:
`Groups.tsx` legitimately reads `data.groups`, so the fix has to be explicit.)

**(b) Upload responses.** `/api/upload/multiple` returns `{message, files:[…]}`;
`Feed.tsx` read `uploaded.urls` and then called `.map()` on `undefined`.
`uploadMultipleFiles` now normalises to `{files, urls, count, message}`.

**(c) Saved posts.** `/api/posts/saved` returned a flat post array; the page
renders `{_id, post, savedAt}`. The Worker now returns the wrapper, with a real
`savedAt` timestamp (added `messages.read_at`-style column work in the same pass).

## 4. Missing API methods

**25 methods were called by pages but absent from `ApiClient`** — every one of
them a dead button. All added, plus 30 more the pages will need as they grow:

`addToCart`, `removeFromCart`, `clearCart`, `getCartSummary`, `createOrder`,
`getMyOrders`, `getMySales`, `getOrderStats`, `updateOrderStatus`,
`addOrderTracking`, `getProducts`, `createListing`, `unlikeProduct`,
`getProductReviews`, `createReview`, `becomeSeller`, `getShopProfile`,
`getShopByHandle`, `getGroups`, `getGroup`, `getMyGroups`, `createGroup`,
`updateGroup`, `deleteGroup`, `joinGroup`, `leaveGroup`, `getGroupMembers`,
`getGroupPosts`, `getGroupJoinRequests`, `respondToJoinRequest`, `rsvpEvent`,
`cancelRsvp`, `getEventAttendees`, `getSavedPosts`, `savePost`, `unsavePost`,
`getNotifications`, `markNotificationRead`, `markAllNotificationsRead`,
`deleteNotification`, `getNotificationPreferences`,
`updateNotificationPreferences`, `getUserProfile`, `getUserById`, `blockUser`,
`unblockUser`, `getPolls`, `voteInPoll`, `getPetitions`, `createPetition`,
`signPetition`, `getCampaigns`, `fileReport`, `getModerationQueue`,
`resolveReport`, `applyToJob`, `getJobApplications`, `respondToMentorship`,
`getVolunteerOpportunities`, `applyToVolunteer`, `getPhrases`, `getWithdrawals`.

## 5. Dead ends and swallowed errors

- **10 `alert()` calls** remained in `Checkout`, `CreateEvent`, `CreateGroup` and
  `EventDetail` despite a prior commit claiming they were all replaced. Replaced
  with `InlineNotice` + `useNotice()` — animated, dismissible, non-blocking.
- **`Messages.tsx` never loaded history.** It called `api.getMessages()` and
  threw the result away ("wsMessages is managed by WebSocket hook"), so opening a
  conversation showed nothing until someone sent a new message. `useConversationWebSocket`
  now loads history over REST, joins the hub room, and appends optimistically on
  send.
- **Typing indicators were keyed by user ID but read by conversation ID** — they
  could never render. Now keyed by conversation, valued by user.
- **Errors logged to `console.error` and dropped** in `Messages` (send), `Explore`
  (follow/unfollow) and `EventDetail` (RSVP). All now surface to the user.
- **`AbortSignal.timeout()`** is only in Chrome 103+ / Safari 16.4+. A slow
  request on an older device threw instead of timing out. Replaced with an
  `AbortController` + `setTimeout`, cleared in `finally`.
- Empty states: conversations, news and events now explain themselves and offer
  a next action instead of showing a blank card.
- Read receipts render per-message (`✓` / `✓✓`) using the new `messages.read_at`.

## 6. Design

The brief was cinematic and immersive; the homepage was a standard marketing
page. Added a reusable motion system in `src/components/cinema/`:

| Component | Purpose |
| --- | --- |
| `CinematicHero` | Four parallax planes, Ken Burns imagery, scroll-linked blur, masked word-by-word headline, rotating Kalabari greeting with a scramble decode, live scroll-percentage rail |
| `GrainOverlay` | Film grain + vignette, plus a luminance wipe on route change |
| `ScrollRail` | Hairline reading-progress bar |
| `Reveal` / `RevealGroup` / `RevealItem` | Scroll-triggered reveals with stagger and mask variants |
| `ParallaxMedia` | Scroll parallax + Ken Burns |
| `SpotlightCard` | Cursor-tracked radial spotlight with 3D tilt |
| `MagneticButton` | Leans toward the cursor, shine sweep on hover |
| `CountUp` | Numbers that count up on first view |
| `TextScramble` | Decode-from-noise text |
| `Marquee` | Infinite ticker, pauses on hover |

Global CSS gained grain, vignette, aurora wash, kinetic underlines, shine sweeps,
mask reveals and typographic detail classes — **all gated behind
`prefers-reduced-motion`**. The opening screen is now a two-panel curtain reveal
instead of a spinner. The homepage was rebuilt around all of it.

## 7. Verification

| Suite | Result |
| --- | --- |
| `worker/tests/e2e.mjs` | **381 assertions across 16 journeys** — real HTTP, run twice back to back |
| `src/test/app.test.tsx` | **20 tests** rendering real pages in jsdom against the live Worker (21 suite-wide incl. the pre-existing example test) |
| `tsc -p tsconfig.app.json` | clean |
| `worker: tsc --noEmit` | clean |
| `npm run build` | clean, 2393 modules |

The frontend suite was written specifically to catch what typecheck cannot: a
page that throws during render, a component reading a field the API never
returns, a hook firing an unhandled promise. It found the `Environment.tsx` crash
above.

---

## 8. What is still genuinely open

These need a third party, credentials, or a product decision — they cannot be
built inside this repository alone.

### ❌ Email delivery
Password reset, email verification and notification digests all work end to end
*inside* the system (tokens are issued, `/auth/verify-email` and
`/auth/reset-password` accept them, the nightly cron writes digests). **Nothing
is actually emailed.** Needs Resend/Postmark/SES credentials, then a `sendMail()`
in `src/lib/notify.ts`. Today `EXPOSE_RESET_TOKEN=1` returns the token in the API
response, which is fine for development and must be `0` in production.

### ❌ Two-factor authentication
No 2FA or OTP anywhere. For an archive holding genealogical records and a
marketplace holding payout balances, admin and seller accounts should require
TOTP. The `users` table would need `totp_secret` + `totp_enabled`; the schema has
neither.

### ⚠️ Payments are simulated
There are no PSP credentials in this environment.
`POST /api/donations/initialize` returns a local
`/donations/verify?reference=…` URL and `verify` marks the row `paid`. Wallet
intents, withdrawals and seller payouts all behave correctly against the local
ledger, but **no real money moves**. Paystack is the obvious choice for Nigeria;
Stripe is already imported in `PaymentSystem.tsx` and reads
`VITE_STRIPE_PUBLISHABLE_KEY`, which is not set.

### ❌ Image processing
Uploads are stored to R2 exactly as received. There are no thumbnails, no
responsive variants, no EXIF stripping, no virus scanning. A 10 MB photo is
served at 10 MB. Cloudflare Images or a `imageresizing` binding would fix this.

### ❌ Search is substring matching
`/api/search` does `LIKE '%q%'` across posts, users, products, events and
heritage records. No ranking, no typo tolerance, no relevance. Fine at hundreds
of rows; needs Vectorize or Pages Functions + an index at scale.

### ❌ No automated backups
D1 point-in-time recovery exists but is not configured here. For a heritage
archive, an explicit nightly export to R2 should exist.

### ❌ Bundle size
`dist/assets/index-*.js` is **1.03 MB (267 kB gzipped)** in a single chunk.
Recharts, framer-motion and the full Radix set are eagerly imported. Route-level
`React.lazy` would cut first load substantially.

### ❌ No CI
There is no GitHub Actions workflow. The three checks above (`tsc` ×2, `vitest`,
worker `e2e.mjs`) should gate every PR — that is exactly the discipline whose
absence let the broken build ship.

### ❌ No i18n
The Kalabari phrasebook is data, not a localised UI. The interface is
English-only. `react-i18next` plus a Kalabari locale would serve the community
the archive exists for.

### ⚠️ Offline / PWA
`public/sw.js` and `manifest.json` exist, but the service worker does not
precache the app shell and the app has no offline fallback. A heritage archive
for a community with unreliable connectivity is a strong case for real offline
reads.
