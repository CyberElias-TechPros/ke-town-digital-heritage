/**
 * User loading + row → API-shape serialization.
 *
 * The React client was written against a Mongo-flavoured API, so every
 * serializer emits `_id` plus the nested object shapes the pages expect.
 */
import { all, first } from './db';
import { bool, jsonObj, jsonList, num, str } from './http';
import type { AuthUser } from '../types';

export type Row = Record<string, unknown>;

export async function loadUser(db: D1Database, id: string): Promise<AuthUser | null> {
  const row = await first<Row>(db, 'SELECT * FROM users WHERE id = ?', id);
  if (!row) return null;
  return hydrateUser(db, row);
}

export async function hydrateUser(db: D1Database, row: Row): Promise<AuthUser> {
  const id = str(row.id);
  const [followers, following, blocked] = await Promise.all([
    all<{ follower_id: string }>(db, 'SELECT follower_id FROM follows WHERE following_id = ?', id),
    all<{ following_id: string }>(db, 'SELECT following_id FROM follows WHERE follower_id = ?', id),
    all<{ blocked_id: string }>(db, 'SELECT blocked_id FROM blocks WHERE blocker_id = ?', id),
  ]);
  return {
    id,
    fullName: str(row.full_name),
    email: str(row.email),
    username: row.username ? str(row.username) : null,
    role: str(row.role, 'user'),
    accountStatus: str(row.account_status, 'active'),
    emailVerified: bool(row.email_verified),
    avatar: str(row.avatar),
    bio: str(row.bio),
    location: str(row.location),
    phone: str(row.phone),
    coverImage: str(row.cover_image),
    language: str(row.language, 'en'),
    timezone: str(row.timezone, 'Africa/Lagos'),
    profileVisibility: str(row.profile_visibility, 'public'),
    allowMessages: bool(row.allow_messages),
    showOnlineStatus: row.show_online_status === 1,
    verified: bool(row.verified),
    isSeller: bool(row.is_seller),
    shopName: str(row.shop_name),
    shopDescription: str(row.shop_description),
    shopBanner: str(row.shop_banner),
    shopVerified: bool(row.shop_verified),
    sellerRating: num(row.seller_rating),
    totalSales: num(row.total_sales),
    balance: num(row.balance),
    pendingBalance: num(row.pending_balance),
    interests: jsonList(row.interests),
    skills: jsonList(row.skills),
    followers: followers.map((f) => f.follower_id),
    following: following.map((f) => f.following_id),
    blockedUsers: blocked.map((b) => b.blocked_id),
    mutedUsers: [],
    createdAt: str(row.created_at),
    lastLogin: row.last_login ? str(row.last_login) : null,
  };
}

/** Compact author block used inside posts / comments / events. */
export async function authorRef(db: D1Database, userId: string | null): Promise<Row> {
  const fallback = { _id: '', fullName: 'KE Town', avatar: '', username: null, role: 'user' };
  if (!userId) return fallback;
  const row = await first<Row>(
    db,
    'SELECT id, full_name, username, avatar, role, verified FROM users WHERE id = ?',
    userId,
  );
  if (!row) return fallback;
  return {
    _id: str(row.id),
    id: str(row.id),
    fullName: str(row.full_name),
    username: row.username ? str(row.username) : null,
    avatar: str(row.avatar),
    role: str(row.role, 'user'),
    verified: bool(row.verified),
  };
}

/** Author blocks for many users in a single query (avoids N+1). */
export async function authorMap(db: D1Database, ids: string[]): Promise<Map<string, Row>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, Row>();
  if (!unique.length) return map;
  const placeholders = unique.map(() => '?').join(',');
  const rows = await all<Row>(
    db,
    `SELECT id, full_name, username, avatar, role, verified FROM users WHERE id IN (${placeholders})`,
    ...unique,
  );
  for (const row of rows) {
    map.set(str(row.id), {
      _id: str(row.id),
      id: str(row.id),
      fullName: str(row.full_name),
      username: row.username ? str(row.username) : null,
      avatar: str(row.avatar),
      role: str(row.role, 'user'),
      verified: bool(row.verified),
    });
  }
  return map;
}

export function publicUser(user: AuthUser, viewerId?: string | null): Row {
  const isSelf = !!viewerId && viewerId === user.id;
  return {
    _id: user.id,
    id: user.id,
    fullName: user.fullName,
    email: isSelf ? user.email : undefined,
    username: user.username,
    role: user.role,
    accountStatus: user.accountStatus,
    emailVerified: user.emailVerified,
    avatar: user.avatar,
    coverImage: user.coverImage,
    bio: user.bio,
    location: user.location,
    language: user.language,
    timezone: user.timezone,
    profileVisibility: user.profileVisibility,
    allowMessages: user.allowMessages,
    showOnlineStatus: user.showOnlineStatus,
    verified: user.verified,
    isSeller: user.isSeller,
    shopName: user.shopName,
    shopVerified: user.shopVerified,
    sellerRating: user.sellerRating,
    totalSales: user.totalSales,
    followers: user.followers,
    following: user.following,
    blockedUsers: isSelf ? user.blockedUsers : [],
    mutedUsers: isSelf ? user.mutedUsers : [],
    interests: user.interests,
    skills: user.skills,
    createdAt: user.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* Domain serializers                                                  */
/* ------------------------------------------------------------------ */

export async function serializePost(
  db: D1Database,
  row: Row,
  viewerId?: string | null,
): Promise<Row> {
  const author = await authorRef(db, str(row.author_id));
  const media = jsonList<Row>(row.media);
  const locationRaw = row.location;
  let location: Row | null = null;
  if (typeof locationRaw === 'string' && locationRaw.trim()) {
    if (locationRaw.trim().startsWith('{')) {
      location = jsonObj<Row>(locationRaw, { name: '' });
    } else {
      location = { name: locationRaw, _id: locationRaw };
    }
  }
  const reactions = await all<Row>(
    db,
    'SELECT user_id, reaction_type FROM post_reactions WHERE post_id = ?',
    str(row.id),
  );
  const saved = viewerId
    ? await first(
        db,
        'SELECT 1 AS x FROM saved_posts WHERE user_id = ? AND post_id = ?',
        viewerId,
        str(row.id),
      )
    : null;
  return {
    _id: str(row.id),
    id: str(row.id),
    content: str(row.content),
    media,
    location,
    feeling: str(row.feeling),
    privacy: str(row.privacy, 'community'),
    visibility: str(row.visibility, 'community'),
    groupId: row.group_id ? str(row.group_id) : null,
    author,
    reactions: reactions.map((r) => ({ user: str(r.user_id), type: str(r.reaction_type) })),
    reactionCounts: reactions.reduce<Record<string, number>>((acc, r) => {
      const t = str(r.reaction_type, 'like');
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {}),
    myReaction:
      reactions.find((r) => str(r.user_id) === viewerId)?.reaction_type ?? null,
    commentCount: num(row.comment_count),
    likeCount: num(row.like_count),
    viewCount: num(row.view_count),
    shareCount: num(row.share_count),
    isPinned: bool(row.is_pinned),
    isSaved: !!saved,
    status: str(row.status, 'active'),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export async function serializeComment(db: D1Database, row: Row): Promise<Row> {
  const author = await authorRef(db, str(row.author_id));
  return {
    _id: str(row.id),
    id: str(row.id),
    content: str(row.content),
    author,
    targetType: str(row.target_type, 'post'),
    targetId: str(row.target_id),
    parentCommentId: row.parent_id ? str(row.parent_id) : null,
    likeCount: num(row.like_count),
    createdAt: str(row.created_at),
  };
}

export async function serializeProduct(
  db: D1Database,
  row: Row,
  viewerId?: string | null,
): Promise<Row> {
  const sellerId = str(row.seller_id);
  const sellerRow = await first<Row>(
    db,
    `SELECT id, full_name, username, avatar, verified, shop_name, total_sales, seller_rating
       FROM users WHERE id = ?`,
    sellerId,
  );
  const images = jsonList<string>(row.images);
  const liked = viewerId
    ? await first(db, 'SELECT 1 AS x FROM product_likes WHERE product_id = ? AND user_id = ?', str(row.id), viewerId)
    : null;
  return {
    _id: str(row.id),
    id: str(row.id),
    title: str(row.title),
    name: str(row.name, str(row.title)),
    description: str(row.description),
    category: str(row.category, 'crafts'),
    subcategory: str(row.subcategory),
    condition: str(row.condition, 'new'),
    price: num(row.price),
    currency: str(row.currency, 'NGN'),
    isNegotiable: bool(row.is_negotiable),
    images: images.length ? images : ['/placeholder.svg'],
    video: str(row.video),
    brand: str(row.brand),
    model: str(row.model),
    artisanName: str(row.artisan_name, sellerRow ? str(sellerRow.full_name) : 'KE Town Artisan'),
    artisanLocation: str(row.location_name),
    location: jsonObj(row.location, { name: str(row.location_name) }),
    contact: str(row.contact),
    tags: jsonList<string>(row.tags),
    stock: num(row.stock, 1),
    quantity: num(row.quantity, 1),
    views: num(row.views),
    likes: num(row.likes),
    isFeatured: bool(row.is_featured),
    isLiked: !!liked,
    status: str(row.status, 'active'),
    seller: {
      _id: sellerId,
      id: sellerId,
      fullName: sellerRow ? str(sellerRow.full_name) : 'KE Town Seller',
      username: sellerRow?.username ? str(sellerRow.username) : null,
      avatar: sellerRow ? str(sellerRow.avatar) : '',
      isVerified: sellerRow ? bool(sellerRow.verified) : false,
      shopName: sellerRow ? str(sellerRow.shop_name) : '',
      totalSales: sellerRow ? num(sellerRow.total_sales) : 0,
      sellerRating: sellerRow ? num(sellerRow.seller_rating) : 0,
      followers: [],
    },
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export async function serializeEvent(db: D1Database, row: Row, viewerId?: string | null): Promise<Row> {
  const organizer = await authorRef(db, str(row.organizer_id));
  const rsvps = await all<{ user_id: string; status: string }>(
    db,
    'SELECT user_id, status FROM event_rsvps WHERE event_id = ?',
    str(row.id),
  );
  const mine = viewerId ? rsvps.find((r) => r.user_id === viewerId) : undefined;
  return {
    _id: str(row.id),
    id: str(row.id),
    title: str(row.title),
    description: str(row.description),
    coverImage: str(row.cover_image),
    category: str(row.category, 'community'),
    type: str(row.event_type, 'in_person'),
    eventType: str(row.event_type, 'in_person'),
    location: {
      name: str(row.location_name),
      address: str(row.address),
      latitude: row.latitude === null ? null : num(row.latitude),
      longitude: row.longitude === null ? null : num(row.longitude),
    },
    onlineLink: str(row.online_link),
    startDate: str(row.start_date),
    endDate: row.end_date ? str(row.end_date) : null,
    timezone: str(row.timezone, 'Africa/Lagos'),
    organizer,
    capacity: num(row.capacity),
    price: num(row.price),
    currency: str(row.currency, 'NGN'),
    tags: jsonList<string>(row.tags),
    rsvpCount: num(row.rsvp_count, rsvps.length),
    attendeeCount: rsvps.filter((r) => r.status !== 'declined').length,
    going: rsvps.filter((r) => r.status === 'going').map((r) => r.user_id),
    interested: rsvps.filter((r) => r.status === 'interested').map((r) => r.user_id),
    viewCount: num(row.view_count),
    status: str(row.status, 'approved'),
    myRsvp: mine ? mine.status : null,
    createdAt: str(row.created_at),
  };
}

export async function serializeGroup(db: D1Database, row: Row, viewerId?: string | null): Promise<Row> {
  const creator = await authorRef(db, str(row.creator_id));
  const members = await all<{ user_id: string; role: string; status: string }>(
    db,
    'SELECT user_id, role, status FROM group_members WHERE group_id = ?',
    str(row.id),
  );
  const membership = viewerId ? members.find((m) => m.user_id === viewerId && m.status === 'active') : undefined;
  const pending = viewerId ? members.find((m) => m.user_id === viewerId && m.status === 'pending') : undefined;
  return {
    _id: str(row.id),
    id: str(row.id),
    name: str(row.name),
    slug: str(row.slug),
    description: str(row.description),
    coverImage: str(row.cover_image),
    avatar: str(row.avatar),
    privacy: str(row.privacy, 'public'),
    category: str(row.category, 'general'),
    joinMethod: str(row.join_method, 'open'),
    creator,
    memberCount: num(row.member_count, members.filter((m) => m.status === 'active').length),
    postCount: num(row.post_count),
    members: members
      .filter((m) => m.status === 'active')
      .slice(0, 12)
      .map((m) => m.user_id),
    isMember: !!membership,
    myRole: membership ? membership.role : null,
    requestPending: !!pending,
    status: str(row.status, 'active'),
    createdAt: str(row.created_at),
  };
}

export async function serializeOrder(db: D1Database, row: Row): Promise<Row> {
  const items = await all<Row>(db, 'SELECT * FROM order_items WHERE order_id = ?', str(row.id));
  const buyer = await authorRef(db, str(row.buyer_id));
  return {
    _id: str(row.id),
    id: str(row.id),
    reference: str(row.reference),
    buyer,
    sellerId: row.seller_id ? str(row.seller_id) : null,
    items: items.map((i) => ({
      _id: str(i.id),
      product: { _id: str(i.product_id), name: str(i.title), images: [str(i.image)] },
      title: str(i.title),
      image: str(i.image),
      unitPrice: num(i.unit_price),
      quantity: num(i.quantity, 1),
      total: num(i.total),
    })),
    subtotal: num(row.subtotal),
    shippingFee: num(row.shipping_fee),
    serviceFee: num(row.service_fee),
    total: num(row.total),
    currency: str(row.currency, 'NGN'),
    paymentMethod: str(row.payment_method, 'transfer'),
    paymentStatus: str(row.payment_status, 'pending'),
    status: str(row.order_status, 'pending'),
    orderStatus: str(row.order_status, 'pending'),
    deliveryMethod: str(row.delivery_method, 'pickup'),
    shippingAddress: jsonObj(row.shipping_address, {}),
    tracking: str(row.tracking),
    note: str(row.note),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function serializeNotification(row: Row, from: Row | null): Row {
  return {
    _id: str(row.id),
    id: str(row.id),
    type: str(row.type, 'system'),
    title: str(row.title),
    message: str(row.message),
    from: from ?? undefined,
    link: row.link ? str(row.link) : undefined,
    data: jsonObj(row.data, {}),
    read: bool(row.read),
    createdAt: str(row.created_at),
  };
}

export function serializeNews(row: Row): Row {
  return {
    _id: str(row.id),
    id: str(row.id),
    title: str(row.title),
    slug: str(row.slug),
    excerpt: str(row.excerpt),
    content: str(row.content),
    coverImage: str(row.cover_image),
    category: str(row.category, 'community'),
    tags: jsonList<string>(row.tags),
    author: { _id: row.author_id ? str(row.author_id) : '', fullName: str(row.author_name, 'KE Town Editorial') },
    views: num(row.views),
    featured: bool(row.featured),
    status: str(row.status, 'published'),
    publishedAt: str(row.published_at),
    createdAt: str(row.created_at),
  };
}

export function serializeGallery(row: Row): Row {
  return {
    _id: str(row.id),
    id: str(row.id),
    title: str(row.title),
    description: str(row.description),
    url: str(row.url),
    mediaType: str(row.media_type, 'image'),
    thumbnail: str(row.thumbnail, str(row.url)),
    category: str(row.category, 'culture'),
    tags: jsonList<string>(row.tags),
    uploader: { _id: row.uploader_id ? str(row.uploader_id) : '', fullName: 'Community' },
    credit: str(row.credit),
    approved: bool(row.approved),
    featured: bool(row.featured),
    views: num(row.views),
    likes: num(row.likes),
    createdAt: str(row.created_at),
  };
}
