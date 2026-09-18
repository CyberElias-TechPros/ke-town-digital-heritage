/**
 * Marketplace: listings, cart, checkout, orders, seller dashboard, reviews.
 * Checkout is multi-seller aware — a single cart splits into one order per
 * seller so each shop sees only its own items.
 */
import { Hono } from 'hono';
import { newId, randomRef } from '../lib/crypto';
import { all, count, first, run } from '../lib/db';
import { badRequest, clampInt, forbidden, jsonObj, jsonList, notFound, num } from '../lib/http';
import { isStaff, requireAuth } from '../middleware';
import { authorMap, authorRef, loadUser, serializeOrder, serializeProduct, type Row } from '../lib/users';
import { logActivity, notify, notifyMany, trackAnalytics } from '../lib/notify';
import { emit } from '../realtime';
import type { Env, AppEnv } from '../types';

export const marketplace = new Hono<AppEnv>();
export const cart = new Hono<AppEnv>();
export const orders = new Hono<AppEnv>();
export const shop = new Hono<AppEnv>();
export const addresses = new Hono<AppEnv>();
export const reviews = new Hono<AppEnv>();

const SHIPPING_FLAT = 1000;
const FREE_SHIPPING_OVER = 50000;
const PLATFORM_FEE_RATE = 0.05;

async function productOr404(db: D1Database, id: string): Promise<Row> {
  const row = await first<Row>(db, 'SELECT * FROM products WHERE id = ?', id);
  if (!row || String(row.status) === 'deleted') throw notFound('That listing is no longer available.');
  return row;
}

/* =========================== MARKETPLACE =========================== */

marketplace.get('/trending', async (c) => {
  const user = c.get('user');
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM products WHERE status = 'active' ORDER BY (likes * 3 + views * 0.2) DESC, created_at DESC LIMIT 12`,
  );
  return c.json(await Promise.all(rows.map((r) => serializeProduct(c.env.DB, r, user?.id ?? null))));
});

marketplace.get('/my-products', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM products WHERE seller_id = ? AND status <> 'deleted' ORDER BY created_at DESC`,
    user.id,
  );
  return c.json(await Promise.all(rows.map((r) => serializeProduct(c.env.DB, r, user.id))));
});

marketplace.get('/', async (c) => {
  const user = c.get('user');
  const category = c.req.query('category');
  const search = c.req.query('search') || c.req.query('q');
  const sort = c.req.query('sort') ?? 'newest';
  const page = clampInt(c.req.query('page'), 1, 1, 1000);
  const limit = clampInt(c.req.query('limit'), 24, 1, 100);
  const minPrice = c.req.query('minPrice');
  const maxPrice = c.req.query('maxPrice');

  const where = [`status = 'active'`];
  const params: (string | number)[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  if (search) {
    where.push('(title LIKE ? OR description LIKE ? OR tags LIKE ? OR artisan_name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (minPrice) {
    where.push('price >= ?');
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    where.push('price <= ?');
    params.push(Number(maxPrice));
  }
  const clause = where.join(' AND ');
  const orderBy =
    sort === 'price_asc'
      ? 'price ASC'
      : sort === 'price_desc'
        ? 'price DESC'
        : sort === 'popular'
          ? 'views DESC'
          : 'is_featured DESC, created_at DESC';

  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM products WHERE ${clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    ...params,
    limit,
    (page - 1) * limit,
  );
  const total = await count(c.env.DB, `SELECT COUNT(*) AS n FROM products WHERE ${clause}`, ...params);
  return c.json({
    products: await Promise.all(rows.map((r) => serializeProduct(c.env.DB, r, user?.id ?? null))),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

marketplace.post('/', async (c) => {
  const user = await requireAuth(c);
  if (!user.isSeller) {
    throw forbidden('Activate your seller profile first — go to Profile → Shop → Become a seller.');
  }
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? body.name ?? '').trim();
  if (title.length < 3) throw badRequest('Give your listing a title of at least 3 characters.');
  const price = Number(body.price ?? NaN);
  if (!Number.isFinite(price) || price < 0) throw badRequest('Enter a valid price.');

  const shopRow = await first<Row>(c.env.DB, 'SELECT id FROM shops WHERE owner_id = ?', user.id);
  const images = Array.isArray(body.images) ? body.images.slice(0, 10).map(String) : [];

  const id = newId('prd_');
  await run(
    c.env.DB,
    `INSERT INTO products (id, seller_id, shop_id, title, name, description, category, subcategory, condition, price, currency,
                           is_negotiable, images, video, brand, model, artisan_name, location_name, location, contact, tags,
                           stock, quantity, is_featured, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', datetime('now'), datetime('now'))`,
    id,
    user.id,
    shopRow ? String(shopRow.id) : null,
    title,
    title,
    String(body.description ?? '').slice(0, 4000),
    String(body.category ?? 'crafts'),
    String(body.subcategory ?? ''),
    String(body.condition ?? 'new'),
    price,
    String(body.currency ?? 'NGN'),
    body.negotiable ? 1 : 0,
    JSON.stringify(images),
    String(body.video ?? ''),
    String(body.brand ?? ''),
    String(body.model ?? ''),
    String(body.artisanName ?? user.shopName ?? user.fullName),
    String(body.location?.name ?? body.locationName ?? user.location ?? ''),
    JSON.stringify(body.location ?? { name: user.location ?? '' }),
    String(body.contact ?? user.phone ?? ''),
    JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    Number(body.quantity ?? body.stock ?? 1),
    Number(body.quantity ?? body.stock ?? 1),
  );

  await logActivity(c.env, {
    userId: user.id,
    type: 'product_created',
    targetType: 'product',
    targetId: id,
    message: `${user.fullName} listed “${title}”`,
  });
  await trackAnalytics(c.env, { userId: user.id, eventType: 'product_created', entityType: 'product', entityId: id, request: c.req.raw });
  const followers = await all<{ follower_id: string }>(c.env.DB, 'SELECT follower_id FROM follows WHERE following_id = ?', user.id);
  await notifyMany(c.env, followers.map((f) => f.follower_id), {
    fromId: user.id,
    type: 'product',
    message: `${user.shopName || user.fullName} listed “${title}”`,
    link: `/product/${id}`,
  });
  await emit(c.env, 'product_update', { productId: id, action: 'created' }, { room: 'broadcast' });

  return c.json(await serializeProduct(c.env.DB, await productOr404(c.env.DB, id), user.id), 201);
});

marketplace.get('/:id', async (c) => {
  const user = c.get('user');
  const row = await productOr404(c.env.DB, c.req.param('id'));
  await run(c.env.DB, 'UPDATE products SET views = views + 1 WHERE id = ?', String(row.id));
  await trackAnalytics(c.env, {
    userId: user?.id ?? null,
    eventType: 'product_view',
    entityType: 'product',
    entityId: String(row.id),
    request: c.req.raw,
  });
  const related = await all<Row>(
    c.env.DB,
    `SELECT * FROM products WHERE category = ? AND id <> ? AND status = 'active' ORDER BY created_at DESC LIMIT 4`,
    String(row.category),
    String(row.id),
  );
  return c.json({
    ...(await serializeProduct(c.env.DB, row, user?.id ?? null)),
    related: await Promise.all(related.map((r) => serializeProduct(c.env.DB, r, user?.id ?? null))),
  });
});

marketplace.put('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await productOr404(c.env.DB, c.req.param('id'));
  if (String(row.seller_id) !== user.id && !isStaff(user)) throw forbidden('You can only edit your own listings.');
  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number)[] = [];
  const map: Record<string, string> = {
    title: 'title',
    name: 'name',
    description: 'description',
    category: 'category',
    condition: 'condition',
    brand: 'brand',
    model: 'model',
    contact: 'contact',
    video: 'video',
    artisanName: 'artisan_name',
    locationName: 'location_name',
  };
  for (const [key, col] of Object.entries(map)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(String(body[key]));
    }
  }
  if (body.price !== undefined) {
    sets.push('price = ?');
    params.push(Number(body.price));
  }
  if (body.quantity !== undefined || body.stock !== undefined) {
    const qty = Number(body.quantity ?? body.stock);
    sets.push('quantity = ?');
    sets.push('stock = ?');
    params.push(qty, qty);
  }
  if (body.images !== undefined) {
    sets.push('images = ?');
    params.push(JSON.stringify(Array.isArray(body.images) ? body.images : []));
  }
  if (body.tags !== undefined) {
    sets.push('tags = ?');
    params.push(JSON.stringify(Array.isArray(body.tags) ? body.tags : []));
  }
  if (body.negotiable !== undefined) {
    sets.push('is_negotiable = ?');
    params.push(body.negotiable ? 1 : 0);
  }
  if (!sets.length) return c.json(await serializeProduct(c.env.DB, row, user.id));
  sets.push(`updated_at = datetime('now')`);
  await run(c.env.DB, `UPDATE products SET ${sets.join(', ')} WHERE id = ?`, ...params, String(row.id));
  return c.json(await serializeProduct(c.env.DB, await productOr404(c.env.DB, String(row.id)), user.id));
});

marketplace.put('/:id/status', async (c) => {
  const user = await requireAuth(c);
  const row = await productOr404(c.env.DB, c.req.param('id'));
  if (String(row.seller_id) !== user.id && !isStaff(user)) throw forbidden('You can only change your own listings.');
  const status = String((await c.req.json().catch(() => ({}))).status ?? '');
  if (!['active', 'paused', 'sold', 'deleted'].includes(status)) throw badRequest('Status must be active, paused, sold or deleted.');
  await run(c.env.DB, `UPDATE products SET status = ?, updated_at = datetime('now') WHERE id = ?`, status, String(row.id));
  return c.json({ message: `Listing marked as ${status}.`, status });
});

marketplace.delete('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await productOr404(c.env.DB, c.req.param('id'));
  if (String(row.seller_id) !== user.id && !isStaff(user)) throw forbidden('You can only delete your own listings.');
  await run(c.env.DB, `UPDATE products SET status = 'deleted', updated_at = datetime('now') WHERE id = ?`, String(row.id));
  await run(c.env.DB, 'DELETE FROM cart_items WHERE product_id = ?', String(row.id));
  return c.json({ message: 'Listing removed.' });
});

marketplace.post('/:id/like', async (c) => {
  const user = await requireAuth(c);
  const row = await productOr404(c.env.DB, c.req.param('id'));
  const existed = await first(c.env.DB, 'SELECT 1 AS x FROM product_likes WHERE product_id = ? AND user_id = ?', String(row.id), user.id);
  if (!existed) {
    await run(
      c.env.DB,
      `INSERT INTO product_likes (product_id, user_id, created_at) VALUES (?, ?, datetime('now'))`,
      String(row.id),
      user.id,
    );
    await run(c.env.DB, 'UPDATE products SET likes = likes + 1 WHERE id = ?', String(row.id));
    await notify(c.env, {
      userId: String(row.seller_id),
      fromId: user.id,
      type: 'like',
      message: `${user.fullName} liked “${String(row.title)}”`,
      link: `/product/${String(row.id)}`,
    });
  }
  return c.json({ liked: true, likes: await count(c.env.DB, 'SELECT COUNT(*) AS n FROM product_likes WHERE product_id = ?', String(row.id)) });
});

marketplace.delete('/:id/like', async (c) => {
  const user = await requireAuth(c);
  await productOr404(c.env.DB, c.req.param('id'));
  await run(c.env.DB, 'DELETE FROM product_likes WHERE product_id = ? AND user_id = ?', c.req.param('id'), user.id);
  await run(
    c.env.DB,
    'UPDATE products SET likes = (SELECT COUNT(*) FROM product_likes WHERE product_id = ?) WHERE id = ?',
    c.req.param('id'),
    c.req.param('id'),
  );
  return c.json({ liked: false, likes: await count(c.env.DB, 'SELECT COUNT(*) AS n FROM product_likes WHERE product_id = ?', c.req.param('id')) });
});

/* ============================== CART ============================== */

async function cartPayload(db: D1Database, userId: string): Promise<Row[]> {
  // Explicit column list: `cart_items` and `products` both define `id`,
  // `quantity` and `created_at`, so a `SELECT c.*, p.*` would silently
  // let the product's values shadow the cart line's.
  const rows = await all<Row>(
    db,
    `SELECT c.id AS cart_id, c.user_id, c.product_id, c.quantity AS cart_quantity, c.created_at AS cart_created_at, p.*
       FROM cart_items c JOIN products p ON p.id = c.product_id
      WHERE c.user_id = ? AND p.status = 'active' ORDER BY c.created_at DESC`,
    userId,
  );
  const out: Row[] = [];
  for (const row of rows) {
    const product = await serializeProduct(db, row, userId);
    out.push({
      _id: String(row.cart_id),
      id: String(row.cart_id),
      product,
      productId: String(row.product_id),
      quantity: Number(row.cart_quantity),
      createdAt: String(row.cart_created_at),
    });
  }
  return out;
}

cart.get('/', async (c) => {
  const user = await requireAuth(c);
  const items = await cartPayload(c.env.DB, user.id);
  const subtotal = items.reduce((sum, i) => sum + num((i.product as Row).price) * Number(i.quantity), 0);
  return c.json(items);
});

cart.get('/summary', async (c) => {
  const user = await requireAuth(c);
  const items = await cartPayload(c.env.DB, user.id);
  const subtotal = items.reduce((sum, i) => sum + num((i.product as Row).price) * Number(i.quantity), 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
  return c.json({
    items,
    count: items.reduce((n, i) => n + Number(i.quantity), 0),
    subtotal,
    shippingFee: shipping,
    serviceFee: Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100,
    total: subtotal + shipping,
    freeShippingThreshold: FREE_SHIPPING_OVER,
    currency: 'NGN',
  });
});

cart.post('/add', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const productId = String(body.productId ?? body.id ?? '');
  const quantity = Math.max(1, Number(body.quantity ?? 1));
  if (!productId) throw badRequest('productId is required.');
  const product = await productOr404(c.env.DB, productId);
  if (String(product.seller_id) === user.id) throw badRequest('You cannot buy your own listing.');
  const stock = Number(product.quantity ?? 1);
  if (stock < 1) throw badRequest('This item is out of stock.');

  const existing = await first<Row>(c.env.DB, 'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', user.id, productId);
  const nextQty = Math.min(stock, (existing ? Number(existing.quantity) : 0) + quantity);
  if (existing) {
    await run(c.env.DB, 'UPDATE cart_items SET quantity = ? WHERE id = ?', nextQty, String(existing.id));
  } else {
    await run(
      c.env.DB,
      `INSERT INTO cart_items (id, user_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      newId('crt_'),
      user.id,
      productId,
      nextQty,
    );
  }
  return c.json({ message: `Added “${String(product.title)}” to your cart.`, cart: await cartPayload(c.env.DB, user.id) }, 201);
});

cart.put('/update/:productId', async (c) => {
  const user = await requireAuth(c);
  const productId = c.req.param('productId');
  const quantity = Math.max(0, Number((await c.req.json().catch(() => ({}))).quantity ?? 0));
  const product = await productOr404(c.env.DB, productId);
  if (quantity === 0) {
    await run(c.env.DB, 'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', user.id, productId);
    return c.json({ message: 'Removed from cart.', cart: await cartPayload(c.env.DB, user.id) });
  }
  const stock = Number(product.quantity ?? 1);
  const final = Math.min(quantity, stock);
  const existing = await first<Row>(c.env.DB, 'SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?', user.id, productId);
  if (existing) {
    await run(c.env.DB, 'UPDATE cart_items SET quantity = ? WHERE id = ?', final, String(existing.id));
  } else {
    await run(
      c.env.DB,
      `INSERT INTO cart_items (id, user_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      newId('crt_'),
      user.id,
      productId,
      final,
    );
  }
  return c.json({ message: 'Cart updated.', quantity: final, cart: await cartPayload(c.env.DB, user.id) });
});

cart.delete('/:productId', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', user.id, c.req.param('productId'));
  return c.json({ message: 'Removed from cart.', cart: await cartPayload(c.env.DB, user.id) });
});

cart.delete('/', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'DELETE FROM cart_items WHERE user_id = ?', user.id);
  return c.json({ message: 'Cart cleared.', cart: [] });
});

/* ============================ ADDRESSES ============================ */

addresses.get('/', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', user.id);
  return c.json(
    rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      fullName: String(r.full_name),
      phone: String(r.phone),
      address: String(r.address),
      city: String(r.city),
      state: String(r.state),
      country: String(r.country),
      postal: String(r.postal),
      isDefault: r.is_default === 1,
      createdAt: String(r.created_at),
    })),
  );
});

addresses.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const fullName = String(body.fullName ?? '').trim();
  const address = String(body.address ?? '').trim();
  if (!fullName) throw badRequest('Recipient name is required.');
  if (!address) throw badRequest('Street address is required.');
  if (!String(body.phone ?? '').trim()) throw badRequest('A contact phone number is required for delivery.');

  const isDefault = Boolean(body.isDefault);
  if (isDefault) await run(c.env.DB, 'UPDATE addresses SET is_default = 0 WHERE user_id = ?', user.id);
  const hasAny = await count(c.env.DB, 'SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?', user.id);

  const id = newId('adr_');
  await run(
    c.env.DB,
    `INSERT INTO addresses (id, user_id, full_name, phone, address, city, state, country, postal, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    id,
    user.id,
    fullName,
    String(body.phone ?? ''),
    address,
    String(body.city ?? ''),
    String(body.state ?? ''),
    String(body.country ?? 'Nigeria'),
    String(body.postal ?? ''),
    isDefault || hasAny === 0 ? 1 : 0,
  );
  return c.json({ message: 'Delivery address saved.', addressId: id }, 201);
});

addresses.put('/:id', async (c) => {
  const user = await requireAuth(c);
  const existing = await first<Row>(c.env.DB, 'SELECT * FROM addresses WHERE id = ? AND user_id = ?', c.req.param('id'), user.id);
  if (!existing) throw notFound('Address not found.');
  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number)[] = [];
  for (const [key, col] of Object.entries({
    fullName: 'full_name',
    phone: 'phone',
    address: 'address',
    city: 'city',
    state: 'state',
    country: 'country',
    postal: 'postal',
  })) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(String(body[key]));
    }
  }
  if (body.isDefault) {
    await run(c.env.DB, 'UPDATE addresses SET is_default = 0 WHERE user_id = ?', user.id);
    sets.push('is_default = ?');
    params.push(1);
  }
  if (!sets.length) return c.json({ message: 'Nothing to update.' });
  await run(c.env.DB, `UPDATE addresses SET ${sets.join(', ')} WHERE id = ?`, ...params, String(existing.id));
  return c.json({ message: 'Address updated.' });
});

addresses.delete('/:id', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'DELETE FROM addresses WHERE id = ? AND user_id = ?', c.req.param('id'), user.id);
  return c.json({ message: 'Address removed.' });
});

/* ============================= ORDERS ============================= */

orders.get('/', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 100', user.id);
  return c.json(await Promise.all(rows.map((r) => serializeOrder(c.env.DB, r))));
});

orders.get('/seller', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT DISTINCT o.* FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE oi.seller_id = ? ORDER BY o.created_at DESC LIMIT 100`,
    user.id,
  );
  return c.json(await Promise.all(rows.map((r) => serializeOrder(c.env.DB, r))));
});

orders.get('/stats', async (c) => {
  const user = await requireAuth(c);
  const placed = await count(c.env.DB, 'SELECT COUNT(*) AS n FROM orders WHERE buyer_id = ?', user.id);
  const sold = await count(c.env.DB, 'SELECT COUNT(*) AS n FROM order_items WHERE seller_id = ?', user.id);
  const revenue = await first<{ total: number }>(
    c.env.DB,
    `SELECT COALESCE(SUM(oi.total), 0) AS total FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
      WHERE oi.seller_id = ? AND o.payment_status = 'paid'`,
    user.id,
  );
  return c.json({ ordersPlaced: placed, itemsSold: sold, revenue: Number(revenue?.total ?? 0) });
});

orders.post('/checkout', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const explicitItems: Row[] = Array.isArray(body.items) ? body.items : [];

  let lines: { productId: string; quantity: number }[];
  if (explicitItems.length) {
    lines = explicitItems.map((i) => ({
      productId: String((i as Row).product ?? (i as Row).productId ?? ''),
      quantity: Math.max(1, Number((i as Row).quantity ?? 1)),
    }));
  } else {
    const rows = await all<Row>(c.env.DB, 'SELECT product_id, quantity FROM cart_items WHERE user_id = ?', user.id);
    lines = rows.map((r) => ({ productId: String(r.product_id), quantity: Number(r.quantity) }));
  }
  if (!lines.length) throw badRequest('Your cart is empty. Add something before checking out.');

  let shippingAddress = jsonObj<Row>(body.shippingAddress, {});
  if (!Object.keys(shippingAddress).length && body.addressId) {
    const row = await first<Row>(c.env.DB, 'SELECT * FROM addresses WHERE id = ? AND user_id = ?', String(body.addressId), user.id);
    if (!row) throw notFound('That address no longer exists.');
    shippingAddress = {
      fullName: String(row.full_name),
      phone: String(row.phone),
      address: String(row.address),
      city: String(row.city),
      state: String(row.state),
      country: String(row.country),
    };
  }
  if (!shippingAddress.address && String(body.deliveryMethod ?? 'pickup') !== 'pickup') {
    throw badRequest('Add a delivery address or choose pickup to continue.');
  }

  // Resolve products + validate stock, then split per seller.
  const resolved: { product: Row; quantity: number }[] = [];
  for (const line of lines) {
    const product = await productOr404(c.env.DB, line.productId);
    if (String(product.seller_id) === user.id) throw badRequest(`You cannot purchase your own listing “${String(product.title)}”.`);
    const stock = Number(product.quantity ?? 1);
    if (stock < line.quantity) {
      throw badRequest(`“${String(product.title)}” only has ${stock} left in stock.`);
    }
    resolved.push({ product, quantity: line.quantity });
  }

  const bySeller = new Map<string, { product: Row; quantity: number }[]>();
  for (const item of resolved) {
    const sellerId = String(item.product.seller_id);
    bySeller.set(sellerId, [...(bySeller.get(sellerId) ?? []), item]);
  }

  const deliveryMethod = String(body.deliveryMethod ?? 'pickup');
  const paymentMethod = String(body.paymentMethod ?? 'transfer');
  const created: Row[] = [];

  for (const [sellerId, items] of bySeller) {
    const subtotal = items.reduce((s, i) => s + num(i.product.price) * i.quantity, 0);
    const shippingFee = deliveryMethod === 'pickup' || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
    const serviceFee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
    const total = Math.round((subtotal + shippingFee + serviceFee) * 100) / 100;
    const orderId = newId('ord_');
    const reference = randomRef('KE');

    await run(
      c.env.DB,
      `INSERT INTO orders (id, reference, buyer_id, seller_id, items, subtotal, shipping_fee, service_fee, total, currency,
                           payment_method, payment_status, order_status, delivery_method, shipping_address, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?, datetime('now'), datetime('now'))`,
      orderId,
      reference,
      user.id,
      sellerId,
      JSON.stringify(
        items.map((i) => ({
          productId: String(i.product.id),
          title: String(i.product.title),
          quantity: i.quantity,
          unitPrice: num(i.product.price),
        })),
      ),
      subtotal,
      shippingFee,
      serviceFee,
      total,
      String(body.currency ?? 'NGN'),
      paymentMethod,
      deliveryMethod,
      JSON.stringify(shippingAddress),
      String(body.note ?? ''),
    );

    for (const item of items) {
      const images = jsonList<string>(item.product.images);
      await run(
        c.env.DB,
        `INSERT INTO order_items (id, order_id, product_id, seller_id, title, image, unit_price, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId('oit_'),
        orderId,
        String(item.product.id),
        sellerId,
        String(item.product.title),
        images[0] ?? '',
        num(item.product.price),
        item.quantity,
        num(item.product.price) * item.quantity,
      );
      await run(
        c.env.DB,
        `UPDATE products SET quantity = MAX(0, quantity - ?), stock = MAX(0, stock - ?), updated_at = datetime('now') WHERE id = ?`,
        item.quantity,
        item.quantity,
        String(item.product.id),
      );
      await notify(c.env, {
        userId: sellerId,
        fromId: user.id,
        type: 'order',
        message: `New order ${reference}: ${item.quantity} × ${String(item.product.title)}`,
        link: `/seller`,
        data: { orderId },
      });
    }

    await notify(c.env, {
      userId: user.id,
      type: 'order',
      message: `Order ${reference} placed. Total ₦${total.toLocaleString()}`,
      link: `/orders/${orderId}`,
    });
    await logActivity(c.env, {
      userId: user.id,
      type: 'order_placed',
      targetType: 'order',
      targetId: orderId,
      message: `${user.fullName} placed order ${reference}`,
      visibility: 'private',
    });
    await trackAnalytics(c.env, {
      userId: user.id,
      eventType: 'order_placed',
      entityType: 'order',
      entityId: orderId,
      value: total,
      request: c.req.raw,
    });
    await emit(c.env, 'new_order', { orderId, reference, sellerId }, { userIds: [sellerId] });

    const row = await first<Row>(c.env.DB, 'SELECT * FROM orders WHERE id = ?', orderId);
    created.push(await serializeOrder(c.env.DB, row!));
  }

  await run(c.env.DB, 'DELETE FROM cart_items WHERE user_id = ?', user.id);
  const primary = created[0];
  return c.json(
    {
      message: `Order placed! Reference ${primary.reference}.`,
      order: primary,
      orders: created,
      orderId: primary._id,
    },
    201,
  );
});

orders.get('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM orders WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Order not found.');
  const sellerIds = await all<{ seller_id: string }>(c.env.DB, 'SELECT seller_id FROM order_items WHERE order_id = ?', String(row.id));
  const isParty =
    String(row.buyer_id) === user.id || sellerIds.some((s) => s.seller_id === user.id) || isStaff(user);
  if (!isParty) throw forbidden('This order belongs to someone else.');
  return c.json(await serializeOrder(c.env.DB, row));
});

orders.put('/:id/status', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM orders WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Order not found.');
  const sellerIds = await all<{ seller_id: string }>(c.env.DB, 'SELECT seller_id FROM order_items WHERE order_id = ?', String(row.id));
  const isSeller = sellerIds.some((s) => s.seller_id === user.id);
  if (String(row.buyer_id) !== user.id && !isSeller && !isStaff(user)) throw forbidden('You cannot change this order.');

  const body = await c.req.json().catch(() => ({}));
  const status = String(body.status ?? '');
  const allowed = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!allowed.includes(status)) throw badRequest(`Status must be one of: ${allowed.join(', ')}`);

  await run(c.env.DB, `UPDATE orders SET order_status = ?, updated_at = datetime('now') WHERE id = ?`, status, String(row.id));

  if (status === 'delivered' || status === 'paid') {
    await run(c.env.DB, `UPDATE orders SET payment_status = 'paid' WHERE id = ?`, String(row.id));
    const items = await all<Row>(c.env.DB, 'SELECT * FROM order_items WHERE order_id = ?', String(row.id));
    for (const item of items) {
      const payout = Number(item.total) * (1 - PLATFORM_FEE_RATE);
      await run(c.env.DB, 'UPDATE users SET pending_balance = pending_balance + ?, total_sales = total_sales + ? WHERE id = ?', payout, Number(item.quantity), String(item.seller_id));
      await run(
        c.env.DB,
        `INSERT INTO transactions (id, user_id, reference, kind, direction, amount, status, method, description, created_at)
         VALUES (?, ?, ?, 'sale', 'credit', ?, 'success', 'wallet', ?, datetime('now'))`,
        newId('txn_'),
        String(item.seller_id),
        randomRef('SAL'),
        payout,
        `Sale of ${String(item.title)}`,
      );
      await notify(c.env, {
        userId: String(item.seller_id),
        type: 'payout',
        message: `₦${payout.toLocaleString()} added to your pending balance from order ${String(row.reference)}`,
        link: `/seller`,
      });
    }
  }

  if (status === 'cancelled' || status === 'refunded') {
    const items = await all<Row>(c.env.DB, 'SELECT * FROM order_items WHERE order_id = ?', String(row.id));
    for (const item of items) {
      await run(c.env.DB, 'UPDATE products SET quantity = quantity + ?, stock = stock + ? WHERE id = ?', Number(item.quantity), Number(item.quantity), String(item.product_id));
    }
  }

  await notify(c.env, {
    userId: String(row.buyer_id),
    fromId: user.id,
    type: 'order',
    message: `Order ${String(row.reference)} is now ${status}`,
    link: `/orders/${String(row.id)}`,
  });
  await emit(c.env, 'order_status_update', { orderId: String(row.id), status }, { userIds: [String(row.buyer_id), ...sellerIds.map((s) => s.seller_id)] });
  return c.json({ message: `Order marked as ${status}.`, order: await serializeOrder(c.env.DB, (await first<Row>(c.env.DB, 'SELECT * FROM orders WHERE id = ?', String(row.id)))!) });
});

orders.put('/:id/tracking', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM orders WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Order not found.');
  const tracking = String((await c.req.json().catch(() => ({}))).tracking ?? '').trim();
  if (!tracking) throw badRequest('Tracking reference is required.');
  await run(c.env.DB, `UPDATE orders SET tracking = ?, updated_at = datetime('now') WHERE id = ?`, tracking, String(row.id));
  await notify(c.env, {
    userId: String(row.buyer_id),
    fromId: user.id,
    type: 'order',
    message: `Tracking number for order ${String(row.reference)}: ${tracking}`,
    link: `/orders/${String(row.id)}`,
  });
  return c.json({ message: 'Tracking added.', tracking });
});

/* ============================== SHOP ============================== */

function shopRow(user: Row, shopData: Row | null): Row {
  return {
    _id: shopData ? String(shopData.id) : '',
    id: shopData ? String(shopData.id) : '',
    ownerId: String(user.id),
    shopName: String(shopData?.name ?? user.shop_name ?? ''),
    name: String(shopData?.name ?? user.shop_name ?? ''),
    shopDescription: String(shopData?.description ?? user.shop_description ?? ''),
    description: String(shopData?.description ?? user.shop_description ?? ''),
    shopBanner: String(shopData?.banner ?? user.shop_banner ?? ''),
    banner: String(shopData?.banner ?? user.shop_banner ?? ''),
    logo: String(shopData?.logo ?? user.avatar ?? ''),
    location: String(shopData?.location ?? user.location ?? ''),
    phone: String(shopData?.phone ?? user.phone ?? ''),
    verified: shopData ? shopData.verified === 1 : user.shop_verified === 1,
    shopVerified: shopData ? shopData.verified === 1 : user.shop_verified === 1,
    rating: Number(shopData?.rating ?? user.seller_rating ?? 0),
    totalSales: Number(shopData?.total_sales ?? user.total_sales ?? 0),
    isSeller: user.is_seller === 1,
    createdAt: String(shopData?.created_at ?? user.created_at ?? ''),
  };
}

shop.get('/me', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM users WHERE id = ?', user.id);
  const shopData = await first<Row>(c.env.DB, 'SELECT * FROM shops WHERE owner_id = ?', user.id);
  const listings = await count(c.env.DB, `SELECT COUNT(*) AS n FROM products WHERE seller_id = ? AND status = 'active'`, user.id);
  return c.json({ ...shopRow(row!, shopData), activeListings: listings });
});

shop.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const shopName = String(body.shopName ?? '').trim();
  if (shopName.length < 2) throw badRequest('Choose a shop name of at least 2 characters.');
  const description = String(body.shopDescription ?? '').slice(0, 1000);

  const existing = await first<Row>(c.env.DB, 'SELECT id FROM shops WHERE owner_id = ?', user.id);
  if (existing) {
    await run(
      c.env.DB,
      `UPDATE shops SET name = ?, description = ?, banner = ?, updated_at = datetime('now') WHERE owner_id = ?`,
      shopName,
      description,
      String(body.shopBanner ?? ''),
      user.id,
    );
  } else {
    await run(
      c.env.DB,
      `INSERT INTO shops (id, owner_id, name, slug, description, banner, location, phone, verified, rating, total_sales, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'active', datetime('now'), datetime('now'))`,
      newId('shp_'),
      user.id,
      shopName,
      `${shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${user.id.slice(-4)}`,
      description,
      String(body.shopBanner ?? ''),
      user.location,
      user.phone,
    );
  }
  await run(
    c.env.DB,
    `UPDATE users SET is_seller = 1, shop_name = ?, shop_description = ?, shop_banner = ?, updated_at = datetime('now') WHERE id = ?`,
    shopName,
    description,
    String(body.shopBanner ?? ''),
    user.id,
  );
  await logActivity(c.env, {
    userId: user.id,
    type: 'shop_opened',
    targetType: 'shop',
    message: `${user.fullName} opened the shop ${shopName}`,
  });
  await notify(c.env, {
    userId: user.id,
    type: 'shop',
    message: `Your shop “${shopName}” is live. Add your first listing to start selling.`,
    link: '/marketplace/create',
  });

  const shopData = await first<Row>(c.env.DB, 'SELECT * FROM shops WHERE owner_id = ?', user.id);
  const refreshed = await first<Row>(c.env.DB, 'SELECT * FROM users WHERE id = ?', user.id);
  return c.json({ ...shopRow(refreshed!, shopData), message: `Welcome aboard, ${shopName} is ready for business!` }, 201);
});

shop.put('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const existing = await first<Row>(c.env.DB, 'SELECT * FROM shops WHERE owner_id = ?', user.id);
  const shopName = String(body.shopName ?? body.name ?? existing?.name ?? user.shopName ?? '').trim();
  const description = String(body.shopDescription ?? body.description ?? existing?.description ?? '');
  const banner = String(body.shopBanner ?? body.banner ?? existing?.banner ?? '');

  if (existing) {
    await run(
      c.env.DB,
      `UPDATE shops SET name = ?, description = ?, banner = ?, location = ?, phone = ?, updated_at = datetime('now') WHERE owner_id = ?`,
      shopName,
      description,
      banner,
      String(body.location ?? existing.location ?? user.location),
      String(body.phone ?? existing.phone ?? user.phone),
      user.id,
    );
  } else {
    await run(
      c.env.DB,
      `INSERT INTO shops (id, owner_id, name, slug, description, banner, location, phone, verified, rating, total_sales, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'active', datetime('now'), datetime('now'))`,
      newId('shp_'),
      user.id,
      shopName,
      shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description,
      banner,
      String(body.location ?? user.location),
      String(body.phone ?? user.phone),
    );
  }
  await run(
    c.env.DB,
    `UPDATE users SET is_seller = 1, shop_name = ?, shop_description = ?, shop_banner = ?, updated_at = datetime('now') WHERE id = ?`,
    shopName,
    description,
    banner,
    user.id,
  );
  const shopData = await first<Row>(c.env.DB, 'SELECT * FROM shops WHERE owner_id = ?', user.id);
  const refreshed = await first<Row>(c.env.DB, 'SELECT * FROM users WHERE id = ?', user.id);
  return c.json({ ...shopRow(refreshed!, shopData), message: 'Shop updated successfully.' });
});

shop.get('/:slugOrId', async (c) => {
  const key = c.req.param('slugOrId');
  const row = await first<Row>(
    c.env.DB,
    'SELECT * FROM shops WHERE slug = ? OR id = ? OR owner_id = ?',
    key,
    key,
    key,
  );
  if (!row) throw notFound('Shop not found.');
  const owner = await first<Row>(c.env.DB, 'SELECT * FROM users WHERE id = ?', String(row.owner_id));
  const products = await all<Row>(
    c.env.DB,
    `SELECT * FROM products WHERE seller_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 24`,
    String(row.owner_id),
  );
  return c.json({
    ...shopRow(owner!, row),
    products: await Promise.all(products.map((p) => serializeProduct(c.env.DB, p, c.get('user')?.id ?? null))),
  });
});

/* ============================= REVIEWS ============================= */

reviews.get('/:targetType/:targetId', async (c) => {
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM reviews WHERE target_type = ? AND target_id = ? AND status = 'approved' ORDER BY created_at DESC`,
    c.req.param('targetType'),
    c.req.param('targetId'),
  );
  const map = await authorMap(c.env.DB, rows.map((r) => String(r.author_id)));
  const average = rows.length ? rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length : 0;
  return c.json({
    reviews: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      author: map.get(String(r.author_id)),
      rating: Number(r.rating),
      title: String(r.title),
      body: String(r.body),
      createdAt: String(r.created_at),
    })),
    average: Math.round(average * 10) / 10,
    total: rows.length,
  });
});

reviews.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const targetType = String(body.targetType ?? 'product');
  const targetId = String(body.targetId ?? '');
  const rating = Math.min(5, Math.max(1, Number(body.rating ?? 5)));
  if (!targetId) throw badRequest('targetId is required.');

  const existing = await first(
    c.env.DB,
    'SELECT id FROM reviews WHERE author_id = ? AND target_type = ? AND target_id = ?',
    user.id,
    targetType,
    targetId,
  );
  if (existing) {
    await run(
      c.env.DB,
      `UPDATE reviews SET rating = ?, title = ?, body = ? WHERE id = ?`,
      rating,
      String(body.title ?? ''),
      String(body.body ?? ''),
      String((existing as Row).id),
    );
  } else {
    await run(
      c.env.DB,
      `INSERT INTO reviews (id, author_id, target_type, target_id, rating, title, body, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', datetime('now'))`,
      newId('rev_'),
      user.id,
      targetType,
      targetId,
      rating,
      String(body.title ?? ''),
      String(body.body ?? ''),
    );
  }

  if (targetType === 'product') {
    const product = await first<Row>(c.env.DB, 'SELECT seller_id FROM products WHERE id = ?', targetId);
    if (product) {
      const agg = await first<{ avg: number }>(
        c.env.DB,
        `SELECT AVG(rating) AS avg FROM reviews WHERE target_type = 'product' AND target_id = ? AND status = 'approved'`,
        targetId,
      );
      await run(c.env.DB, 'UPDATE users SET seller_rating = ? WHERE id = ?', Math.round(Number(agg?.avg ?? 0) * 10) / 10, String(product.seller_id));
      await notify(c.env, {
        userId: String(product.seller_id),
        fromId: user.id,
        type: 'review',
        message: `${user.fullName} left a ${rating}★ review`,
        link: `/product/${targetId}`,
      });
    }
  }
  return c.json({ message: 'Thanks for the feedback!', rating }, 201);
});

reviews.delete('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM reviews WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Review not found.');
  if (String(row.author_id) !== user.id && !isStaff(user)) throw forbidden('You can only delete your own reviews.');
  await run(c.env.DB, `UPDATE reviews SET status = 'removed' WHERE id = ?`, String(row.id));
  return c.json({ message: 'Review removed.' });
});

export { authorRef, loadUser };
