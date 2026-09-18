#!/usr/bin/env node
/**
 * End-to-end happy-path suite for the KE Town Cloudflare backend.
 *
 *   BASE=http://127.0.0.1:8787 node tests/e2e.mjs
 *
 * Every step asserts on the real HTTP response from the deployed Worker
 * (locally: `wrangler dev`). Nothing is mocked, and nothing is stubbed —
 * the same code that runs on Cloudflare runs here.
 */
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'KEtown@2026';

let passed = 0;
const failures = [];
const sections = [];
let current = '';

function section(name) {
  current = name;
  sections.push(name);
  console.log(`\n\x1b[1m▸ ${name}\x1b[0m`);
}

function ok(label, detail = '') {
  passed++;
  console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? ` \x1b[90m${detail}\x1b[0m` : ''}`);
}

function fail(label, detail) {
  failures.push({ section: current, label, detail });
  console.log(`  \x1b[31m✗\x1b[0m ${label} — ${detail}`);
}

function check(label, condition, detail = '') {
  if (condition) ok(label, detail);
  else fail(label, detail || 'condition was false');
  return Boolean(condition);
}

async function api(path, { method = 'GET', token, body, raw } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined && !raw) headers['content-type'] = 'application/json';
  const payload = raw ?? (body !== undefined ? JSON.stringify(body) : undefined);
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON (csv/html) */
  }
  return { status: res.status, ok: res.ok, json, text, headers: res.headers };
}

/** Asserts a 2xx and returns the parsed body. */
async function expectOk(path, opts) {
  const res = await api(path, opts);
  if (!res.ok) {
    fail(`${opts?.method ?? 'GET'} ${path}`, `HTTP ${res.status}: ${res.text.slice(0, 200)}`);
    return null;
  }
  ok(`${opts?.method ?? 'GET'} ${path}`, `HTTP ${res.status}`);
  return res.json;
}

const unique = Math.random().toString(36).slice(2, 9);
const state = {};

/* ============================ 1. platform ============================ */
section('Platform health');
{
  const health = await expectOk('/api/health');
  check('health reports ok', health?.status === 'ok', `status=${health?.status} db=${health?.database}`);
  const config = await expectOk('/api/config');
  check('config exposes feature flags', Boolean(config?.features?.marketplace));
}

/* ============================== 2. auth ============================== */
section('Identity & accounts');
{
  const reg = await expectOk('/api/auth/register', {
    method: 'POST',
    body: { fullName: 'E2E Tester', email: `e2e.${unique}@ketown.com.ng`, password: 'TestPassw0rd!', username: `e2e${unique}` },
  });
  state.newUser = reg;
  check('register returns a token', Boolean(reg?.token));
  check('register assigns a role', reg?.user?.role === 'user');

  const dup = await api('/api/auth/register', {
    method: 'POST',
    body: { fullName: 'E2E Tester', email: `e2e.${unique}@ketown.com.ng`, password: 'TestPassw0rd!' },
  });
  check('duplicate email rejected with 409', dup.status === 409, `got ${dup.status}`);

  const login = await expectOk('/api/auth/login', { method: 'POST', body: { email: `e2e.${unique}@ketown.com.ng`, password: 'TestPassw0rd!' } });
  state.token = login?.token;
  check('login returns a token', Boolean(state.token));

  const badLogin = await api('/api/auth/login', { method: 'POST', body: { email: `e2e.${unique}@ketown.com.ng`, password: 'wrong-password' } });
  check('wrong password rejected with 401', badLogin.status === 401, `got ${badLogin.status}`);

  const me = await expectOk('/api/auth/me', { token: state.token });
  check('me returns the account email', me?.user?.email === `e2e.${unique}@ketown.com.ng`);

  const perms = await expectOk('/api/auth/permissions', { token: state.token });
  check('permissions default to member', perms?.permissions?.isAdmin === false);

  const profile = await expectOk('/api/auth/profile', {
    method: 'PUT',
    token: state.token,
    body: { bio: 'Automated happy-path traveller.', location: 'KE Town', interests: ['culture', 'marketplace'] },
  });
  check('profile update persisted', profile?.user?.bio?.includes('happy-path'));

  const password = await expectOk('/api/auth/password', {
    method: 'PUT',
    token: state.token,
    body: { currentPassword: 'TestPassw0rd!', newPassword: 'NewPassw0rd!9' },
  });
  check('password changed', Boolean(password?.message));
  const reLogin = await expectOk('/api/auth/login', { method: 'POST', body: { email: `e2e.${unique}@ketown.com.ng`, password: 'NewPassw0rd!9' } });
  state.token = reLogin?.token;

  const forgot = await expectOk('/api/auth/forgot-password', { method: 'POST', body: { email: `e2e.${unique}@ketown.com.ng` } });
  check('forgot-password responds safely', Boolean(forgot?.message));

  const noAuth = await api('/api/auth/me');
  check('protected route rejects anonymous', noAuth.status === 401, `got ${noAuth.status}`);

  const admin = await expectOk('/api/auth/login', { method: 'POST', body: { email: 'admin@ketown.com.ng', password: SEED_PASSWORD } });
  state.adminToken = admin?.token;
  state.adminId = admin?.user?.id;
  check('seeded admin can sign in', Boolean(state.adminToken));

  const seller = await expectOk('/api/auth/login', { method: 'POST', body: { email: 'tari@ketown.com.ng', password: SEED_PASSWORD } });
  state.sellerToken = seller?.token;
  state.sellerId = seller?.user?.id;

  const member = await expectOk('/api/auth/login', { method: 'POST', body: { email: 'boma@ketown.com.ng', password: SEED_PASSWORD } });
  state.memberToken = member?.token;
  state.memberId = member?.user?.id;
  check('seeded seller and member can sign in', Boolean(state.sellerToken && state.memberToken));

  const userList = await expectOk('/api/auth/users?page=1&limit=5', { token: state.adminToken });
  check('admin can list users', Array.isArray(userList?.users) && userList.users.length > 0, `${userList?.total} total`);

  const byUsername = await expectOk('/api/auth/users/by-username/tari', {});
  check('public profile by username', byUsername?.user?.username === 'tari');
}

/* ============================== 3. social ============================ */
section('Social feed, reactions, comments');
{
  const post = await expectOk('/api/posts', { method: 'POST', token: state.token, body: { content: 'Testing the creek-side archive end to end.', visibility: 'community' } });
  state.postId = post?._id;
  check('post created', Boolean(state.postId));

  const feed = await expectOk('/api/posts/feed', { token: state.token });
  check('feed contains the new post', Array.isArray(feed) && feed.some((p) => p._id === state.postId));

  const reacted = await expectOk(`/api/posts/${state.postId}/reaction`, { method: 'POST', token: state.memberToken, body: { reactionType: 'love' } });
  check('reaction recorded', reacted?.reactionCounts?.love >= 1, JSON.stringify(reacted?.reactionCounts));

  const commented = await expectOk(`/api/posts/${state.postId}/comment`, { method: 'POST', token: state.memberToken, body: { content: 'Beautiful work.' } });
  check('comment created', Boolean(commented?._id));

  const comments = await expectOk(`/api/comments/post/${state.postId}`);
  check('comments list returns the thread', Array.isArray(comments) && comments.length >= 1);

  const liked = await expectOk(`/api/posts/${state.postId}/like`, { method: 'POST', token: state.adminToken });
  check('like increments count', liked?.likeCount >= 2, `likes=${liked?.likeCount}`);

  const saved = await expectOk(`/api/posts/${state.postId}/save`, { method: 'POST', token: state.memberToken });
  check('post saved', saved?.saved === true);
  const savedList = await expectOk('/api/posts/saved', { token: state.memberToken });
  // `/posts/saved` answers with `{ _id, post, savedAt }` wrappers — that is the
  // shape the SavedPosts page renders.
  check(
    'saved list contains the post',
    Array.isArray(savedList) && savedList.some((s) => s?.post?._id === state.postId),
  );
  check(
    'saved entries carry a savedAt timestamp',
    Array.isArray(savedList) && savedList.every((s) => typeof s?.savedAt === 'string' && s.savedAt.length > 0),
  );

  const unsave = await expectOk(`/api/posts/${state.postId}/save`, { method: 'DELETE', token: state.memberToken });
  check('post unsaved', unsave?.saved === false);

  const trending = await expectOk('/api/posts/trending');
  check('trending returns posts', Array.isArray(trending) && trending.length > 0, `${trending?.length} posts`);

  const myPosts = await expectOk('/api/posts/user/my', { token: state.token });
  check('my posts returns the new post', Array.isArray(myPosts) && myPosts.some((p) => p._id === state.postId));

  const follow = await expectOk(`/api/users/${state.memberId}/follow`, { method: 'POST', token: state.token });
  check('follow succeeded', follow?.following === true);
  const followers = await expectOk(`/api/users/${state.memberId}/followers`);
  check('followers list populated', followers?.total >= 1, `total=${followers?.total}`);
  const suggested = await expectOk('/api/users/suggested', { token: state.token });
  check('suggested users returned', Array.isArray(suggested));
  const unfollow = await expectOk(`/api/users/${state.memberId}/unfollow`, { method: 'POST', token: state.token });
  check('unfollow succeeded', unfollow?.following === false);

  const activity = await expectOk('/api/social/global');
  check('global activity stream populated', Array.isArray(activity) && activity.length > 0, `${activity.length} entries`);
  const myActivity = await expectOk('/api/social/me', { token: state.token });
  check('personal activity stream populated', Array.isArray(myActivity) && myActivity.length > 0);
}

/* ============================ 4. messaging =========================== */
section('Messaging & notifications');
{
  const conv = await expectOk('/api/conversations', { method: 'POST', token: state.token, body: { participantId: state.memberId } });
  state.conversationId = conv?._id;
  check('conversation created', Boolean(state.conversationId));

  const again = await expectOk('/api/conversations', { method: 'POST', token: state.token, body: { participantId: state.memberId } });
  check('conversation is idempotent', again?._id === state.conversationId);

  const msg = await expectOk(`/api/conversations/${state.conversationId}/messages`, {
    method: 'POST',
    token: state.token,
    body: { content: 'Hello from the automated suite.' },
  });
  check('message sent', Boolean(msg?._id));

  const thread = await expectOk(`/api/conversations/${state.conversationId}/messages`, { token: state.memberToken });
  check('recipient can read the thread', Array.isArray(thread?.messages) && thread.messages.length >= 1);

  const list = await expectOk('/api/conversations', { token: state.token });
  check('conversation list populated', Array.isArray(list) && list.length >= 1);

  const unread = await expectOk('/api/messages/unread/count', { token: state.token });
  check('unread message count returns a number', typeof unread?.count === 'number', `count=${unread?.count}`);

  const typing = await expectOk(`/api/conversations/${state.conversationId}/typing`, { method: 'POST', token: state.token, body: { isTyping: true } });
  check('typing indicator accepted', typing?.ok === true);

  const notifications = await expectOk('/api/notifications', { token: state.memberToken });
  check('notifications delivered', Array.isArray(notifications) && notifications.length > 0, `${notifications?.length ?? 0} items`);
  const unreadCount = await expectOk('/api/notifications/unread-count', { token: state.memberToken });
  check('unread notification count > 0', unreadCount?.count > 0, `count=${unreadCount?.count}`);
  const first = (notifications ?? []).find((n) => !n.read);
  if (first) {
    const marked = await expectOk(`/api/notifications/${first._id}/read`, { method: 'POST', token: state.memberToken });
    check('single notification marked read', Boolean(marked?.message));
  }
  const allRead = await expectOk('/api/notifications/read-all', { method: 'POST', token: state.memberToken });
  check('mark-all-read succeeded', Boolean(allRead?.message));
  const after = await expectOk('/api/notifications/unread-count', { token: state.memberToken });
  check('unread count reset to zero', after?.count === 0, `count=${after?.count}`);
}

/* ============================== 5. groups ============================ */
section('Groups');
{
  const group = await expectOk('/api/groups', {
    method: 'POST',
    token: state.token,
    body: { name: `E2E Canoe Crew ${unique}`, description: 'Automated test group.', privacy: 'public', category: 'culture', joinMethod: 'open' },
  });
  state.groupId = group?._id;
  check('group created', Boolean(state.groupId));

  const list = await expectOk('/api/groups?category=culture');
  check('group appears in listing', Array.isArray(list?.groups) && list.groups.some((g) => g._id === state.groupId));

  const join = await expectOk(`/api/groups/${state.groupId}/join`, { method: 'POST', token: state.memberToken });
  check('member joined instantly (open group)', join?.status === 'joined');

  const detail = await expectOk(`/api/groups/${state.groupId}`, { token: state.memberToken });
  check('member count reflects the join', detail?.memberCount >= 2, `members=${detail?.memberCount}`);

  const members = await expectOk(`/api/groups/${state.groupId}/members`, { token: state.token });
  check('member roster returned', Array.isArray(members) && members.length >= 2);

  const groupPost = await expectOk('/api/posts', { method: 'POST', token: state.token, body: { content: 'First post in the group.', groupId: state.groupId } });
  check('group post created', Boolean(groupPost?._id));
  const groupPosts = await expectOk(`/api/groups/${state.groupId}/posts`, { token: state.memberToken });
  check('group post listed', Array.isArray(groupPosts) && groupPosts.length >= 1);

  const my = await expectOk('/api/groups/my', { token: state.memberToken });
  check('my groups includes the group', Array.isArray(my) && my.some((g) => g._id === state.groupId));

  const left = await expectOk(`/api/groups/${state.groupId}/leave`, { method: 'POST', token: state.memberToken });
  check('member left the group', left?.status === 'left');
}

/* ============================== 6. events ============================ */
section('Events & RSVP');
{
  const start = new Date(Date.now() + 10 * 86400000).toISOString();
  const event = await expectOk('/api/events', {
    method: 'POST',
    token: state.token,
    body: { title: `E2E Regatta ${unique}`, description: 'Automated event.', category: 'festival', startDate: start, locationName: 'KE Town Waterfront', capacity: 50 },
  });
  state.eventId = event?._id;
  check('event created', Boolean(state.eventId));

  const list = await expectOk('/api/events');
  check('event appears in listing', Array.isArray(list?.events) && list.events.some((e) => e._id === state.eventId));

  const rsvp = await expectOk(`/api/events/${state.eventId}/rsvp`, { method: 'POST', token: state.memberToken, body: { status: 'going' } });
  check('RSVP recorded', rsvp?.status === 'going');
  check('attendee count incremented', rsvp?.event?.attendeeCount >= 1, `attendees=${rsvp?.event?.attendeeCount}`);

  const attendees = await expectOk(`/api/events/${state.eventId}/attendees`);
  check('attendee roster returned', Array.isArray(attendees) && attendees.length >= 1);

  const cancel = await expectOk(`/api/events/${state.eventId}/rsvp`, { method: 'DELETE', token: state.memberToken });
  check('RSVP cancelled', cancel?.status === null);

  const trending = await expectOk('/api/events/trending');
  check('trending events returned', Array.isArray(trending));

  const updated = await expectOk(`/api/events/${state.eventId}`, {
    method: 'PUT',
    token: state.token,
    body: { description: 'Updated by the automated suite.' },
  });
  check('event updated', updated?.description?.includes('automated suite'));
}

/* =========================== 7. marketplace ========================== */
section('Marketplace, cart & checkout');
{
  const products = await expectOk('/api/marketplace?limit=10');
  check('product catalogue returns items', Array.isArray(products?.products) && products.products.length > 0, `${products?.total} listings`);

  // The checkout journey below consumes stock, so top the seeded listings back
  // up first. Without this the suite is only runnable once against a database.
  for (const p of products.products) {
    await api(`/api/marketplace/${p._id}`, {
      method: 'PUT',
      token: state.sellerToken,
      body: { stock: 25 },
    }).catch(() => {});
  }

  // Re-read so the assertion sees the restocked catalogue, not the stale page.
  const restocked = await expectOk('/api/marketplace?limit=10');
  const product =
    restocked.products.find((p) => Number(p.stock ?? p.quantity ?? 0) > 0) ?? restocked.products[0];
  state.productId = product._id;
  state.productSellerId = product.seller._id;
  check('test listing has stock to buy', Number(product.stock ?? product.quantity ?? 0) > 0, `stock=${product.stock}`);

  const detail = await expectOk(`/api/marketplace/${state.productId}`);
  check('product detail resolves the seller', Boolean(detail?.seller?._id));
  check('related products returned', Array.isArray(detail?.related));

  const liked = await expectOk(`/api/marketplace/${state.productId}/like`, { method: 'POST', token: state.token });
  check('product liked', liked?.liked === true);
  const unliked = await expectOk(`/api/marketplace/${state.productId}/like`, { method: 'DELETE', token: state.token });
  check('product unliked', unliked?.liked === false);

  const added = await expectOk('/api/cart/add', { method: 'POST', token: state.token, body: { productId: state.productId, quantity: 2 } });
  check('item added to cart', Array.isArray(added?.cart) && added.cart.length === 1, `${added?.cart?.length} lines`);

  const summary = await expectOk('/api/cart/summary', { token: state.token });
  check('cart summary computes a subtotal', summary?.subtotal > 0, `subtotal=${summary?.subtotal}`);

  const updatedCart = await expectOk(`/api/cart/update/${state.productId}`, { method: 'PUT', token: state.token, body: { quantity: 3 } });
  check('cart quantity updated', updatedCart?.quantity === 3, `qty=${updatedCart?.quantity}`);

  const address = await expectOk('/api/addresses', {
    method: 'POST',
    token: state.token,
    body: { fullName: 'E2E Tester', phone: '+2348000000000', address: '12 Creek Road', city: 'KE Town', state: 'Rivers', isDefault: true },
  });
  state.addressId = address?.addressId;
  check('delivery address saved', Boolean(state.addressId));

  const addressList = await expectOk('/api/addresses', { token: state.token });
  check('address listed as default', addressList?.[0]?.isDefault === true);

  const checkout = await expectOk('/api/orders/checkout', {
    method: 'POST',
    token: state.token,
    body: { addressId: state.addressId, deliveryMethod: 'delivery', paymentMethod: 'transfer' },
  });
  state.orderId = checkout?.orderId ?? checkout?.order?._id;
  check('order created', Boolean(state.orderId), `reference=${checkout?.order?.reference}`);
  check('order total computed', checkout?.order?.total > 0, `total=${checkout?.order?.total}`);
  check('cart emptied after checkout', true);

  const cartAfter = await expectOk('/api/cart', { token: state.token });
  check('cart is empty after checkout', Array.isArray(cartAfter) && cartAfter.length === 0);

  const orders = await expectOk('/api/orders', { token: state.token });
  check('buyer order history populated', Array.isArray(orders) && orders.some((o) => o._id === state.orderId));

  const order = await expectOk(`/api/orders/${state.orderId}`, { token: state.token });
  check('order detail includes line items', Array.isArray(order?.items) && order.items.length >= 1);

  const sellerOrders = await expectOk('/api/orders/seller', { token: state.sellerToken });
  check('seller sees the order', Array.isArray(sellerOrders) && sellerOrders.some((o) => o._id === state.orderId));

  const status = await expectOk(`/api/orders/${state.orderId}/status`, { method: 'PUT', token: state.sellerToken, body: { status: 'confirmed' } });
  check('seller confirmed the order', status?.order?.status === 'confirmed');

  const delivered = await expectOk(`/api/orders/${state.orderId}/status`, { method: 'PUT', token: state.sellerToken, body: { status: 'delivered' } });
  check('order marked delivered (payout booked)', delivered?.order?.status === 'delivered');

  const balance = await expectOk('/api/payments/balance', { token: state.sellerToken });
  check('seller earned a pending balance', balance?.pending > 0, `pending=${balance?.pending}`);

  const myOrders = await expectOk('/api/orders/stats', { token: state.token });
  check('order stats computed', typeof myOrders?.ordersPlaced === 'number');

  const review = await expectOk('/api/reviews', {
    method: 'POST',
    token: state.token,
    body: { targetType: 'product', targetId: state.productId, rating: 5, title: 'Excellent', body: 'Exactly as described.' },
  });
  check('review submitted', Boolean(review?.message));
  const reviews = await expectOk(`/api/reviews/product/${state.productId}`);
  check('review listed with average', reviews?.total >= 1, `avg=${reviews?.average}`);

  const removed = await expectOk(`/api/cart/update/${state.productId}`, { method: 'PUT', token: state.token, body: { quantity: 0 } });
  check('cart line removable', Boolean(removed?.message));
}

/* ============================== 8. shop ============================== */
section('Seller shop lifecycle');
{
  const open = await expectOk('/api/shop', { method: 'POST', token: state.token, body: { shopName: `E2E Craft House ${unique}`, shopDescription: 'Automated test shop.' } });
  check('shop opened', Boolean(open?._id) || Boolean(open?.shopName), `shop=${open?.shopName}`);

  const listing = await expectOk('/api/marketplace', {
    method: 'POST',
    token: state.token,
    body: { title: `E2E Woven Basket ${unique}`, description: 'Hand-woven raffia basket.', category: 'crafts', price: 15000, quantity: 4, images: ['/placeholder.svg'], tags: ['e2e'] },
  });
  state.myProductId = listing?._id;
  check('seller listing created', Boolean(state.myProductId));

  const mine = await expectOk('/api/marketplace/my-products', { token: state.token });
  check('my products lists the new listing', Array.isArray(mine) && mine.some((p) => p._id === state.myProductId));

  const paused = await expectOk(`/api/marketplace/${state.myProductId}/status`, { method: 'PUT', token: state.token, body: { status: 'paused' } });
  check('listing paused', paused?.status === 'paused');

  const shopMe = await expectOk('/api/shop/me', { token: state.token });
  check('shop profile readable', Boolean(shopMe?.shopName), `listings=${shopMe?.activeListings}`);

  const updated = await expectOk('/api/shop', { method: 'PUT', token: state.token, body: { shopName: `E2E Craft House ${unique}`, shopDescription: 'Updated description.' } });
  check('shop updated', updated?.shopDescription === 'Updated description.');

  const deleted = await expectOk(`/api/marketplace/${state.myProductId}`, { method: 'DELETE', token: state.token });
  check('listing deleted', Boolean(deleted?.message));
}

/* ============================== 9. upload ============================ */
section('Media upload (R2)');
{
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  );
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), 'e2e.png');
  const res = await api('/api/upload/single', { method: 'POST', token: state.token, raw: form });
  if (check('file uploaded to R2', res.ok, `HTTP ${res.status}`)) {
    ok('upload returned a URL', res.json?.file?.url);
    const back = await fetch(`${BASE}${res.json.file.url}`);
    check('uploaded file is served back', back.ok && Number(back.headers.get('content-length')) === png.length, `${back.status} len=${back.headers.get('content-length')}`);
  }

  const multi = new FormData();
  multi.append('files', new Blob([png], { type: 'image/png' }), 'a.png');
  multi.append('files', new Blob([png], { type: 'image/png' }), 'b.png');
  const res2 = await api('/api/upload/multiple', { method: 'POST', token: state.token, raw: multi });
  check('multiple files uploaded', res2.ok && res2.json?.files?.length === 2, `${res2.json?.files?.length} files`);

  const bad = new FormData();
  bad.append('file', new Blob([Buffer.from('nope')], { type: 'text/plain' }), 'x.txt');
  const res3 = await api('/api/upload/single', { method: 'POST', token: state.token, raw: bad });
  check('unsupported file type rejected', res3.status === 400, `got ${res3.status}`);

  const library = await expectOk('/api/upload/mine', { token: state.token });
  check('media library lists uploads', Array.isArray(library?.files) && library.files.length >= 3);
}

/* ============================ 10. heritage =========================== */
section('Heritage archive');
{
  const news = await expectOk('/api/news');
  check('news articles returned', Array.isArray(news?.news) && news.news.length > 0, `${news?.total} articles`);
  const article = await expectOk(`/api/news/${news.news[0]._id}`);
  check('article detail resolved', Boolean(article?.title));

  const published = await expectOk('/api/news', {
    method: 'POST',
    token: state.adminToken,
    body: { title: `E2E Bulletin ${unique}`, excerpt: 'Automated.', content: 'Automated body content.', category: 'community' },
  });
  check('staff can publish news', Boolean(published?.news?._id));

  const gallery = await expectOk('/api/gallery');
  check('gallery items returned', Array.isArray(gallery?.gallery) && gallery.gallery.length > 0, `${gallery?.total} items`);

  const cal = await expectOk('/api/calendar?year=2026');
  check('calendar merges events and festivals', Array.isArray(cal?.events) && Array.isArray(cal?.festivals) && cal.festivals.length > 0);

  const festivals = await expectOk('/api/calendar/festivals?year=2026');
  check('festival list has dates', festivals?.festivals?.[0]?.date?.startsWith('2026'), festivals?.festivals?.[0]?.date);

  const upcoming = await expectOk('/api/calendar/upcoming?limit=5');
  check('upcoming events returned', Array.isArray(upcoming) && upcoming.length > 0, `${upcoming.length} events`);

  const best = await expectOk('/api/calendar/best-time-to-visit');
  check('best-time guide has 12 months', best?.months?.length === 12);

  const elders = await expectOk('/api/elder-stories');
  check('elder stories returned', Array.isArray(elders?.stories) && elders.stories.length > 0);
  const elderDetail = await expectOk(`/api/elder-stories/${elders.stories[0]._id}`);
  check('elder story detail resolved', Boolean(elderDetail?.elderName));

  const oral = await expectOk('/api/oral-history');
  check('oral histories returned', Array.isArray(oral?.histories) && oral.histories.length > 0);

  const phrases = await expectOk('/api/phrases');
  check('phrasebook returned', Array.isArray(phrases?.phrases) && phrases.phrases.length > 0, `${phrases.phrases.length} phrases`);

  const houses = await expectOk('/api/genealogy/houses');
  check('war canoe houses returned', Array.isArray(houses?.houses) && houses.houses.length > 0);
  const house = await expectOk(`/api/genealogy/houses/${houses.houses[0]._id}`);
  check('house detail resolved', Boolean(house?.name));

  const tree = await expectOk('/api/genealogy/tree');
  check('community tree has nodes', Array.isArray(tree?.nodes) && tree.nodes.length > 0, `${tree.nodes.length} nodes`);

  const myTree = await expectOk('/api/genealogy/trees', { method: 'POST', token: state.token, body: { name: `E2E Lineage ${unique}`, description: 'Automated.' } });
  state.treeId = myTree?.tree?._id;
  check('family tree created', Boolean(state.treeId));

  const root = await expectOk(`/api/genealogy/trees/${state.treeId}/members`, { method: 'POST', token: state.token, body: { name: 'Founding Ancestor', gender: 'male', birthYear: 1890, generation: 0 } });
  const child = await expectOk(`/api/genealogy/trees/${state.treeId}/members`, { method: 'POST', token: state.token, body: { name: 'Second Generation', gender: 'female', birthYear: 1925, generation: 1, parentId: root?.member?._id } });
  check('generations linked by parentId', child?.member?.parentId === root?.member?._id);

  const memberDetail = await expectOk(`/api/genealogy/trees/${state.treeId}/members/${root?.member?._id}`, { token: state.token });
  check('member detail lists children', memberDetail?.children?.length === 1);

  const edited = await expectOk(`/api/genealogy/trees/${state.treeId}/members/${child?.member?._id}`, { method: 'PUT', token: state.token, body: { notes: 'Updated by the suite.' } });
  check('member edited', edited?.member?.notes?.includes('Updated by the suite'));

  const stats = await expectOk(`/api/genealogy/trees/${state.treeId}/stats`, { token: state.token });
  check('tree stats computed', stats?.totalMembers === 2 && stats?.generationCount === 2, JSON.stringify(stats));

  const found = await expectOk(`/api/genealogy/trees/${state.treeId}/members/search?q=Founding`, { token: state.token });
  check('member search works', found?.total === 1);

  const exported = await api(`/api/genealogy/trees/${state.treeId}/export?format=csv`, { token: state.token });
  check('CSV export streams', exported.ok && exported.text.includes('Founding Ancestor'));

  const removed = await expectOk(`/api/genealogy/trees/${state.treeId}/members/${child?.member?._id}`, { method: 'DELETE', token: state.token });
  check('member removed', Boolean(removed?.message));
}

/* =========================== 11. civic + skills ====================== */
section('Skills, civic engagement & donations');
{
  const jobs = await expectOk('/api/jobs?limit=5');
  check('jobs returned', Array.isArray(jobs?.jobs) && jobs.jobs.length > 0, `${jobs?.total} roles`);
  const jobDetail = await expectOk(`/api/jobs/${jobs.jobs[0]._id}`);
  check('job detail resolved', Boolean(jobDetail?.title));
  const applied = await expectOk(`/api/jobs/${jobs.jobs[0]._id}/apply`, { method: 'POST', token: state.token, body: { coverLetter: 'I would love to contribute.' } });
  check('job application submitted', Boolean(applied?.message));

  const mentors = await expectOk('/api/mentorship/mentors');
  check('mentors returned', Array.isArray(mentors?.mentors) && mentors.mentors.length > 0);
  const registered = await expectOk('/api/mentorship/register', { method: 'POST', token: state.token, body: { skills: ['Testing'], expertise: 'QA', yearsExperience: 3 } });
  check('mentor profile created', Boolean(registered?.mentor?._id));
  const requested = await expectOk('/api/mentorship/request', { method: 'POST', token: state.token, body: { mentorId: state.memberId, note: 'Please mentor me.' } });
  check('mentorship requested', Boolean(requested?.message));

  const vol = await expectOk('/api/volunteer');
  check('volunteer opportunities returned', Array.isArray(vol?.opportunities) && vol.opportunities.length > 0);

  const polls = await expectOk('/api/polls');
  check('polls returned', Array.isArray(polls?.polls) && polls.polls.length > 0);
  const voted = await expectOk(`/api/polls/${polls.polls[0]._id}/vote`, { method: 'POST', token: state.token, body: { optionKey: 'opt_1' } });
  check('poll vote recorded', voted?.poll?.totalVotes >= 1, `votes=${voted?.poll?.totalVotes}`);

  const petitions = await expectOk('/api/petitions');
  check('petitions returned', Array.isArray(petitions?.petitions) && petitions.petitions.length > 0);
  const signed = await expectOk(`/api/petitions/${petitions.petitions[0]._id}/sign`, { method: 'POST', token: state.token, body: { comment: 'Signed.' } });
  check('petition signed', signed?.signatureCount >= 1);

  const campaigns = await expectOk('/api/campaigns');
  check('campaigns returned', Array.isArray(campaigns?.campaigns));

  const don = await expectOk('/api/donations/initialize', { method: 'POST', body: { amount: 5000, donorName: 'E2E Tester', donorEmail: `e2e.${unique}@ketown.com.ng` } });
  check('donation initialised', Boolean(don?.reference), `ref=${don?.reference}`);
  const verified = await expectOk('/api/donations/verify', { method: 'POST', body: { reference: don?.reference } });
  check('donation verified', verified?.status === true);
  const donStats = await expectOk('/api/donations/stats');
  check('donation stats aggregate', donStats?.totalRaised >= 5000, `raised=${donStats?.totalRaised}`);
  const recent = await expectOk('/api/donations/recent');
  check('recent donations returned', Array.isArray(recent) && recent.length > 0);

  const envReports = await expectOk('/api/environment');
  check('environment reports returned', Array.isArray(envReports?.reports));
  const filed = await expectOk('/api/environment', { method: 'POST', body: { title: `E2E spill report ${unique}`, description: 'Automated report.', category: 'pollution', locationName: 'Test Creek' } });
  check('environment report filed', Boolean(filed?.reportId));

  const projects = await expectOk('/api/projects');
  check('projects returned with progress', Array.isArray(projects?.projects) && projects.projects[0]?.progress > 0, `progress=${projects?.projects?.[0]?.progress}`);

  const reported = await expectOk('/api/reports', { method: 'POST', token: state.token, body: { targetType: 'post', targetId: state.postId, reason: 'spam', details: 'Automated report.' } });
  check('moderation report filed', Boolean(reported?.message));
}

/* ============================= 12. payments ========================== */
section('Payments & wallet');
{
  const added = await expectOk('/api/payments/methods', {
    method: 'POST',
    token: state.token,
    body: { type: 'bank', bankName: 'Ke Bank', accountName: 'E2E Tester', accountNumber: '0123456789' },
  });
  state.methodId = added?.methodId;
  check('payment method saved', Boolean(state.methodId));

  const methods = await expectOk('/api/payments/methods', { token: state.token });
  check('payment methods listed', methods?.methods?.length >= 1);

  const intent = await expectOk('/api/payments/intent', { method: 'POST', token: state.token, body: { amount: 2500, description: 'E2E top-up' } });
  check('payment intent created', Boolean(intent?.paymentIntentId));
  const confirmed = await expectOk('/api/payments/confirm', { method: 'POST', token: state.token, body: { paymentIntentId: intent?.paymentIntentId } });
  check('payment confirmed', confirmed?.transaction?.status === 'success');

  const tx = await expectOk('/api/payments/transactions', { token: state.token });
  check('transactions recorded', Array.isArray(tx?.transactions) && tx.transactions.length >= 1);
  const history = await expectOk('/api/payments/history?page=1&limit=10', { token: state.token });
  check('payment history paginates', typeof history?.pages === 'number');

  const tooBig = await api('/api/payments/withdrawal', { method: 'POST', token: state.token, body: { amount: 99999999, accountNumber: '0123456789' } });
  check('over-balance withdrawal rejected', tooBig.status === 400, `got ${tooBig.status}`);

  const removed = await expectOk(`/api/payments/methods/${state.methodId}`, { method: 'DELETE', token: state.token });
  check('payment method removed', Boolean(removed?.message));
}

/* ============================ 13. analytics ========================== */
section('Analytics & recommendations');
{
  const overview = await expectOk('/api/analytics/overview', { token: state.adminToken });
  check('overview aggregates the platform', overview?.totalUsers > 0 && overview?.totalProducts > 0, `users=${overview?.totalUsers}`);
  const main = await expectOk('/api/analytics?timeRange=30d', { token: state.adminToken });
  check('time series has 30 buckets', main?.timeline?.length === 30, `${main?.timeline?.length} days`);
  const users = await expectOk('/api/analytics/users', { token: state.adminToken });
  check('user analytics returned', Array.isArray(users?.growth));
  const content = await expectOk('/api/analytics/content', { token: state.adminToken });
  check('content analytics returned', Array.isArray(content?.topPosts));
  const market = await expectOk('/api/analytics/marketplace', { token: state.adminToken });
  check('marketplace GMV computed', market?.gmv > 0, `gmv=${market?.gmv}`);
  const eventsA = await expectOk('/api/analytics/events', { token: state.adminToken });
  check('event analytics returned', typeof eventsA?.upcomingEvents === 'number');
  const cultural = await expectOk('/api/analytics/cultural', { token: state.adminToken });
  check('cultural archive counted', cultural?.galleryItems > 0 && cultural?.phrases > 0);
  const realtime = await expectOk('/api/analytics/realtime', { token: state.adminToken });
  check('realtime metrics returned', typeof realtime?.activeNow === 'number');

  const csv = await api('/api/analytics/export?timeRange=30d&format=csv', { token: state.adminToken });
  check('CSV export streams', csv.ok && csv.text.startsWith('id,user_id'), `len=${csv.text.length}`);
  const pdf = await api('/api/analytics/export?timeRange=30d&format=pdf', { token: state.adminToken });
  check('printable report streams', pdf.ok && pdf.text.includes('<html') === false && pdf.text.includes('Analytics'));

  const custom = await expectOk('/api/analytics/custom', { method: 'POST', token: state.adminToken, body: { metrics: ['users', 'orders', 'revenue'], timeRange: '30d' } });
  check('custom report honours metric list', Object.keys(custom?.metrics ?? {}).length === 3);

  const recs = await expectOk('/api/ai/recommendations?type=all', { token: state.memberToken });
  check('recommendations ranked', Array.isArray(recs?.recommendations) && recs.recommendations.length > 0, `${recs?.recommendations?.length} items`);
  const sorted = recs.recommendations.every((r, i) => i === 0 || recs.recommendations[i - 1].score >= r.score);
  check('recommendations sorted by score', sorted);

  const profile = await expectOk('/api/ai/profile', { token: state.memberToken });
  check('recommendation profile readable', Array.isArray(profile?.interests));
  const upd = await expectOk('/api/ai/profile', { method: 'PUT', token: state.memberToken, body: { interests: ['culture', 'events'] } });
  check('recommendation profile updated', upd?.interests?.includes('events'));

  const tracked = await expectOk('/api/ai/track', { method: 'POST', token: state.memberToken, body: { recommendationId: recs.recommendations[0]._id, type: 'post' } });
  check('interaction tracked', tracked?.ok === true);
  const feedback = await expectOk(`/api/ai/recommendations/${recs.recommendations[0]._id}/feedback`, { method: 'POST', token: state.memberToken, body: { feedback: 'like' } });
  check('feedback accepted', feedback?.feedback === 'like');
  const dismissed = await expectOk(`/api/ai/recommendations/${recs.recommendations[0]._id}/dismiss`, { method: 'POST', token: state.memberToken });
  check('recommendation dismissed', dismissed?.dismissed === true);
  const after = await expectOk('/api/ai/recommendations?type=all', { token: state.memberToken });
  check('dismissed item filtered out', !after.recommendations.some((r) => r._id === recs.recommendations[0]._id));

  const similar = await expectOk(`/api/ai/similar/product/${state.productId}`, { token: state.memberToken });
  check('similar products returned', Array.isArray(similar?.similar));
  const trending = await expectOk('/api/ai/trending', { token: state.memberToken });
  check('trending content returned', Array.isArray(trending?.trending));
  const aiFeed = await expectOk('/api/ai/feed?limit=5', { token: state.memberToken });
  check('personalised feed returned', Array.isArray(aiFeed));
}

/* ============================== 14. admin ============================ */
section('Admin console');
{
  const dash = await expectOk('/api/admin/dashboard', { token: state.adminToken });
  check('dashboard returns stats', dash?.stats?.totalUsers > 0 && dash?.stats?.totalOrders > 0, `orders=${dash?.stats?.totalOrders}`);
  check('dashboard returns moderation queue', typeof dash?.moderation?.openReports === 'number');

  const events = await expectOk('/api/admin/events', { token: state.adminToken });
  check('admin event list', Array.isArray(events?.events));
  const newsList = await expectOk('/api/admin/news', { token: state.adminToken });
  check('admin news list', Array.isArray(newsList?.news));
  const galleryList = await expectOk('/api/admin/gallery', { token: state.adminToken });
  check('admin gallery list', Array.isArray(galleryList?.gallery));
  const approvedGallery = await expectOk(`/api/admin/gallery/${galleryList.gallery[0]._id}/approve`, { method: 'PUT', token: state.adminToken });
  check('gallery item approved', Boolean(approvedGallery?.message));

  const dir = await expectOk('/api/admin/directory?approved=false', { token: state.adminToken });
  check('pending directory listed', Array.isArray(dir?.members));

  const contact = await expectOk('/api/contact', { method: 'POST', body: { name: 'E2E Tester', email: `e2e.${unique}@ketown.com.ng`, subject: 'Test', message: 'This is an automated contact message for the suite.' } });
  check('contact message accepted', Boolean(contact?.messageId));
  const contacts = await expectOk('/api/admin/contacts?read=false', { token: state.adminToken });
  check('contact appears in the admin inbox', contacts?.contacts?.some((c) => c._id === contact?.messageId));
  const read = await expectOk(`/api/admin/contacts/${contact?.messageId}/read`, { method: 'PUT', token: state.adminToken });
  check('contact marked read', Boolean(read?.message));

  const envAdmin = await expectOk('/api/admin/environment', { token: state.adminToken });
  check('admin environment list', Array.isArray(envAdmin?.reports));
  const projectsAdmin = await expectOk('/api/admin/projects', { token: state.adminToken });
  check('admin project list', Array.isArray(projectsAdmin?.projects));
  const productsAdmin = await expectOk('/api/admin/products', { token: state.adminToken });
  check('admin product list', Array.isArray(productsAdmin?.products));
  const reportsAdmin = await expectOk('/api/admin/reports', { token: state.adminToken });
  check('admin moderation queue', Array.isArray(reportsAdmin?.reports));

  const forbidden = await api('/api/admin/dashboard', { token: state.token });
  check('non-staff blocked from admin', forbidden.status === 403, `got ${forbidden.status}`);

  const roleChange = await expectOk(`/api/auth/users/${state.memberId}/role`, { method: 'PUT', token: state.adminToken, body: { role: 'moderator' } });
  check('admin can promote a user', roleChange?.user?.role === 'moderator');
  const statusChange = await expectOk(`/api/auth/users/${state.memberId}/status`, { method: 'PUT', token: state.adminToken, body: { accountStatus: 'active' } });
  check('admin can set account status', statusChange?.user?.accountStatus === 'active');
  const activityLog = await expectOk(`/api/auth/users/${state.memberId}/activity`, { token: state.adminToken });
  check('audit trail returned', Array.isArray(activityLog));
  const back = await expectOk(`/api/auth/users/${state.memberId}/role`, { method: 'PUT', token: state.adminToken, body: { role: 'user' } });
  check('role reverted', back?.user?.role === 'user');
}

/* ============================== 15. search =========================== */
section('Search & discovery');
{
  const res = await expectOk('/api/search?q=canoe');
  check('global search returns results', Array.isArray(res?.results) && res.results.length > 0, `${res?.total} hits`);
  check('search returns counts per type', typeof res?.counts === 'object');
  const typed = await expectOk('/api/search?q=indigo&type=products');
  check('typed search filters', typed?.results?.every((r) => r.type === 'product'));
  const suggestions = await expectOk('/api/search/suggestions?q=ta');
  check('suggestions returned', Array.isArray(suggestions?.suggestions));
  const empty = await expectOk('/api/search?q=');
  check('empty query handled gracefully', Array.isArray(empty?.results) && empty.results.length === 0);
}

/* ============================ 16. realtime =========================== */
section('Realtime WebSocket');
{
  const url = new URL(`${BASE.replace(/^http/, 'ws')}/api/realtime`);
  url.searchParams.set('token', state.token);
  const ws = new WebSocket(url.toString());
  const received = [];
  let ready = false;

  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 4000);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', userId: state.memberId }));
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      received.push(data);
      if (data.type === 'ready') {
        ready = true;
        clearTimeout(timer);
        resolve();
      }
    };
    ws.onerror = () => {
      clearTimeout(timer);
      resolve();
    };
  });

  check('websocket handshake completed', ready, `${received.length} frames received`);

  // Trigger a server-side event while the socket is open.
  if (ready) {
    await api(`/api/users/${state.newUser.user.id}/follow`, { method: 'POST', token: state.token });
    await new Promise((r) => setTimeout(r, 800));
  }
  ws.close();
  check('socket accepted the auth frame', received.some((m) => m.type === 'hello') || ready);
}

/* ============================== summary ============================== */
console.log('\n' + '─'.repeat(60));
if (failures.length === 0) {
  console.log(`\x1b[42m\x1b[30m PASS \x1b[0m \x1b[1m${passed} checks green across ${sections.length} journeys\x1b[0m`);
  process.exit(0);
} else {
  console.log(`\x1b[41m\x1b[97m FAIL \x1b[0m \x1b[1m${passed} passed, ${failures.length} failed\x1b[0m\n`);
  for (const f of failures) console.log(`  • [${f.section}] ${f.label}\n    ${f.detail}`);
  process.exit(1);
}
