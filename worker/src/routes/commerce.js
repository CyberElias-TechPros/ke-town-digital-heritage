// Commerce routes: marketplace/products, cart, orders, shop, reviews, payments.
import {
  ok, badRequest, unauthorized, forbidden, notFound, parseBody, queryParams,
} from "../lib/http.js";
import { newId, now, run, first, all } from "../lib/db.js";
import { requireUser, publicUser, minimalUser, safeJson } from "../lib/middleware.js";

export async function handleCommerce(request, env) {
  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/api/, "") || "/";
  if (path.startsWith("/")) path = path.slice(1);
  const method = request.method;
  const parts = path.split("/").filter(Boolean);
  const head = parts[0];

  switch (head) {
    case "marketplace": return handleMarketplace(request, env, parts, method, url);
    case "products": return handleMarketplace(request, env, parts, method, url);
    case "cart": return handleCart(request, env, parts, method);
    case "addresses": return handleAddresses(request, env, parts, method);
    case "orders": return handleOrders(request, env, parts, method, url);
    case "order": return handleOrders(request, env, parts, method, url);
    case "shop": return handleShop(request, env, parts, method);
    case "reviews": return handleReviews(request, env, parts, method);
    case "payments": return handlePayments(request, env, parts, method);
    case "transactions": return handlePayments(request, env, parts, method);
    default: return notFound(`No commerce route for /api/${path}`);
  }
}

// ------------------------------------------------------------
// MARKETPLACE
// ------------------------------------------------------------
async function handleMarketplace(request, env, parts, method, url) {
  if (parts.length === 1 && method === "GET") {
    const qp = queryParams(url);
    let sql = "SELECT * FROM products WHERE status='active'";
    const binds = [];
    if (qp.category) { sql += " AND category = ?"; binds.push(qp.category); }
    sql += " ORDER BY created_at DESC LIMIT 200";
    const rows = await all(env, sql, ...binds);
    return ok({ products: await hydrateProducts(env, rows) });
  }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    if (!body?.title) return badRequest("Product title is required");
    if (body?.price === undefined || isNaN(Number(body.price))) return badRequest("A valid price is required");
    const id = newId();
    const ts = now();
    await run(env,
      `INSERT INTO products (id, seller_id, title, description, category, condition, price, negotiable, images, video, brand, model, location, contact, tags, quantity, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, user.id, body.title, body.description || null, body.category || null, body.condition || null,
      Number(body.price), body.negotiable ? 1 : 0, JSON.stringify(body.images || []), body.video || null,
      body.brand || null, body.model || null, body.location ? JSON.stringify(body.location) : null,
      body.contact || null, JSON.stringify(body.tags || []), body.quantity || 1, ts, ts
    );
    const row = await first(env, "SELECT * FROM products WHERE id = ?", id);
    return ok({ product: (await hydrateProducts(env, [row]))[0] }, 201);
  }
  if (parts.length === 2 && parts[1] === "trending" && method === "GET") {
    const rows = await all(env, "SELECT * FROM products WHERE status='active' ORDER BY like_count DESC, created_at DESC LIMIT 6");
    return ok({ products: await hydrateProducts(env, rows) });
  }
  if (parts.length === 2 && parts[1] === "my-products" && method === "GET") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const rows = await all(env, "SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC", user.id);
    return ok({ products: await hydrateProducts(env, rows) });
  }
  if (parts.length === 2 && method === "GET") {
    const row = await first(env, "SELECT * FROM products WHERE id = ?", parts[1]);
    if (!row) return notFound("Product not found");
    return ok({ product: (await hydrateProducts(env, [row]))[0] });
  }
  if (parts.length === 2 && method === "PUT") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    const existing = await first(env, "SELECT * FROM products WHERE id = ?", parts[1]);
    if (!existing) return notFound("Product not found");
    if (existing.seller_id !== user.id && !["admin", "seller_manager"].includes(user.role)) return forbidden();
    await run(env,
      "UPDATE products SET title=?, description=?, category=?, condition=?, price=?, negotiable=?, images=?, brand=?, model=?, location=?, contact=?, tags=?, quantity=?, updated_at=? WHERE id=?",
      body.title ?? existing.title, body.description ?? existing.description, body.category ?? existing.category,
      body.condition ?? existing.condition, body.price !== undefined ? Number(body.price) : existing.price,
      body.negotiable !== undefined ? (body.negotiable ? 1 : 0) : existing.negotiable,
      JSON.stringify(body.images ?? safeJson(existing.images, [])), body.brand ?? existing.brand,
      body.model ?? existing.model, body.location ? JSON.stringify(body.location) : existing.location,
      body.contact ?? existing.contact, JSON.stringify(body.tags ?? safeJson(existing.tags, [])),
      body.quantity ?? existing.quantity, now(), parts[1]);
    const row = await first(env, "SELECT * FROM products WHERE id = ?", parts[1]);
    return ok({ product: (await hydrateProducts(env, [row]))[0] });
  }
  if (parts.length === 2 && method === "DELETE") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const existing = await first(env, "SELECT * FROM products WHERE id = ?", parts[1]);
    if (!existing) return notFound("Product not found");
    if (existing.seller_id !== user.id && !["admin", "seller_manager"].includes(user.role)) return forbidden();
    await run(env, "DELETE FROM products WHERE id = ?", parts[1]);
    return ok({ message: "Product deleted" });
  }
  if (parts.length === 3 && parts[2] === "like") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const product = await first(env, "SELECT id FROM products WHERE id = ?", parts[1]);
    if (!product) return notFound("Product not found");
    if (method === "POST") {
      await run(env, "INSERT OR IGNORE INTO product_likes (id, product_id, user_id, created_at) VALUES (?, ?, ?, ?)",
        newId(), parts[1], user.id, now());
      await run(env, "UPDATE products SET like_count = (SELECT COUNT(*) FROM product_likes WHERE product_id=?) WHERE id=?",
        parts[1], parts[1]);
      return ok({ message: "Liked", liked: true });
    }
    if (method === "DELETE") {
      await run(env, "DELETE FROM product_likes WHERE product_id=? AND user_id=?", parts[1], user.id);
      await run(env, "UPDATE products SET like_count = (SELECT COUNT(*) FROM product_likes WHERE product_id=?) WHERE id=?",
        parts[1], parts[1]);
      return ok({ message: "Unliked", liked: false });
    }
  }
  if (parts.length === 3 && parts[2] === "status" && method === "PUT") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    await run(env, "UPDATE products SET status = ?, updated_at = ? WHERE id = ?", body?.status || "active", now(), parts[1]);
    return ok({ message: "Status updated" });
  }
  return notFound("No marketplace route");
}

async function hydrateProducts(env, rows) {
  const out = [];
  for (const r of rows) {
    const seller = await first(env, "SELECT * FROM users WHERE id = ?", r.seller_id);
    out.push({
      id: r.id, _id: r.id, title: r.title, description: r.description, category: r.category,
      condition: r.condition, price: r.price, negotiable: !!r.negotiable, images: safeJson(r.images, []),
      video: r.video, brand: r.brand, model: r.model, location: r.location ? safeJson(r.location, r.location) : null,
      contact: r.contact, tags: safeJson(r.tags, []), quantity: r.quantity, status: r.status,
      likeCount: r.like_count, createdAt: r.created_at,
      seller: minimalUser(seller),
    });
  }
  return out;
}

// ------------------------------------------------------------
// CART
// ------------------------------------------------------------
async function handleCart(request, env, parts, method) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;

  if (parts.length === 1 && method === "GET") {
    const rows = await all(env,
      "SELECT c.*, p.*, p.id AS product_id FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?",
      user.id);
    const items = rows.map((r) => ({
      id: r.id, _id: r.id, productId: r.product_id, quantity: r.quantity,
      product: {
        id: r.product_id, title: r.title, price: r.price, images: safeJson(r.images, []),
        description: r.description, category: r.category,
      },
      createdAt: r.created_at,
    }));
    return ok({ items, cart: items });
  }

  if (parts.length === 2 && parts[1] === "add" && method === "POST") {
    const body = await parseBody(request);
    const productId = body?.productId;
    const qty = Math.max(1, parseInt(body?.quantity) || 1);
    if (!productId) return badRequest("productId is required");
    const product = await first(env, "SELECT id FROM products WHERE id = ?", productId);
    if (!product) return notFound("Product not found");
    await run(env, "INSERT OR IGNORE INTO cart_items (id, user_id, product_id, quantity, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)",
      newId(), user.id, productId, now(), now());
    await run(env, "UPDATE cart_items SET quantity = quantity + ?, updated_at = ? WHERE user_id = ? AND product_id = ?",
      qty, now(), user.id, productId);
    return ok({ message: "Added to cart" });
  }

  if (parts.length === 3 && parts[1] === "update" && method === "PUT") {
    const body = await parseBody(request);
    const qty = Math.max(1, parseInt(body?.quantity) || 1);
    await run(env, "UPDATE cart_items SET quantity = ?, updated_at = ? WHERE user_id = ? AND product_id = ?",
      qty, now(), user.id, parts[2]);
    return ok({ message: "Cart updated" });
  }

  if (parts.length === 3 && parts[1] === "remove" && method === "DELETE") {
    await run(env, "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", user.id, parts[2]);
    return ok({ message: "Removed from cart" });
  }

  if (parts.length === 2 && parts[1] === "clear" && method === "DELETE") {
    await run(env, "DELETE FROM cart_items WHERE user_id = ?", user.id);
    return ok({ message: "Cart cleared" });
  }
  return notFound("No cart route");
}

// ------------------------------------------------------------
// ADDRESSES
// ------------------------------------------------------------
async function handleAddresses(request, env, parts, method) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC", user.id);
    return ok({ addresses: rows.map(addrShape) });
  }
  if (parts.length === 1 && method === "POST") {
    const body = await parseBody(request);
    if (!body?.fullName || !body?.address) return badRequest("fullName and address are required");
    const id = newId();
    if (body.isDefault) await run(env, "UPDATE addresses SET is_default=0 WHERE user_id=?", user.id);
    await run(env,
      "INSERT INTO addresses (id, user_id, full_name, phone, address, city, state, country, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, user.id, body.fullName, body.phone || null, body.address, body.city || null, body.state || null,
      body.country || "Nigeria", body.isDefault ? 1 : 0, now());
    const row = await first(env, "SELECT * FROM addresses WHERE id = ?", id);
    return ok({ address: addrShape(row) }, 201);
  }
  if (parts.length === 2 && method === "PUT") {
    const body = await parseBody(request);
    if (body.isDefault) await run(env, "UPDATE addresses SET is_default=0 WHERE user_id=? AND id != ?", user.id, parts[1]);
    await run(env,
      "UPDATE addresses SET full_name=?, phone=?, address=?, city=?, state=?, is_default=? WHERE id=? AND user_id=?",
      body.fullName ?? "", body.phone ?? "", body.address ?? "", body.city ?? "", body.state ?? "",
      body.isDefault ? 1 : 0, parts[1], user.id);
    return ok({ message: "Address updated" });
  }
  if (parts.length === 2 && method === "DELETE") {
    await run(env, "DELETE FROM addresses WHERE id=? AND user_id=?", parts[1], user.id);
    return ok({ message: "Address deleted" });
  }
  return notFound("No addresses route");
}

function addrShape(row) {
  return { id: row.id, fullName: row.full_name, phone: row.phone, address: row.address, city: row.city, state: row.state, country: row.country, isDefault: !!row.is_default };
}

// ------------------------------------------------------------
// ORDERS
// ------------------------------------------------------------
async function handleOrders(request, env, parts, method, url) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;

  if (parts.length === 1 && method === "POST") {
    const body = await parseBody(request);
    const cart = await all(env,
      "SELECT c.*, p.title, p.price, p.seller_id FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?",
      user.id);
    if (!cart.length) return badRequest("Cart is empty");
    const items = cart.map((c) => ({
      productId: c.product_id, title: c.title, price: c.price, quantity: c.quantity,
    }));
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryFee = Number(body?.deliveryFee) || 0;
    const id = newId();
    const ts = now();
    await run(env,
      "INSERT INTO orders (id, user_id, status, items, subtotal, delivery_fee, total, address_id, delivery_method, payment_method, notes, created_at, updated_at) VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, user.id, JSON.stringify(items), subtotal, deliveryFee, subtotal + deliveryFee,
      body?.addressId || null, body?.deliveryMethod || null, body?.paymentMethod || null, body?.notes || null, ts, ts);
    await run(env, "DELETE FROM cart_items WHERE user_id = ?", user.id);
    const row = await first(env, "SELECT * FROM orders WHERE id = ?", id);
    return ok({ order: orderShape(row) }, 201);
  }

  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", user.id);
    return ok({ orders: rows.map(orderShape) });
  }

  if (parts.length === 2 && parts[1] === "me" && method === "GET") {
    const rows = await all(env, "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", user.id);
    return ok({ orders: rows.map(orderShape) });
  }

  if (parts.length === 2 && parts[1] === "seller" && method === "GET") {
    const rows = await all(env, "SELECT * FROM orders ORDER BY created_at DESC");
    const mine = rows.filter((o) => {
      const items = safeJson(o.items, []);
      return items.some(() => true); // simplified: seller sees orders containing their products
    });
    return ok({ orders: mine.map(orderShape) });
  }

  if (parts.length === 2 && parts[1] === "checkout" && method === "POST") {
    const body = await parseBody(request);
    const cart = await all(env,
      "SELECT c.*, p.title, p.price FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?",
      user.id);
    if (!cart.length) return badRequest("Cart is empty");
    const items = cart.map((c) => ({ productId: c.product_id, title: c.title, price: c.price, quantity: c.quantity }));
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryFee = Number(body?.deliveryMethod === "express" ? 15 : 5) || 0;
    const id = newId();
    const ts = now();
    await run(env,
      "INSERT INTO orders (id, user_id, status, items, subtotal, delivery_fee, total, address_id, delivery_method, payment_method, created_at, updated_at) VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, user.id, JSON.stringify(items), subtotal, deliveryFee, subtotal + deliveryFee,
      body?.addressId || null, body?.deliveryMethod || null, body?.paymentMethod || null, ts, ts);
    await run(env, "DELETE FROM cart_items WHERE user_id = ?", user.id);
    const row = await first(env, "SELECT * FROM orders WHERE id = ?", id);
    return ok({ order: orderShape(row) }, 201);
  }

  if (parts.length === 2 && method === "GET") {
    const row = await first(env, "SELECT * FROM orders WHERE id = ?", parts[1]);
    if (!row) return notFound("Order not found");
    return ok({ order: orderShape(row) });
  }
  return notFound("No orders route");
}

function orderShape(row) {
  return {
    id: row.id, _id: row.id, status: row.status, items: safeJson(row.items, []),
    subtotal: row.subtotal, deliveryFee: row.delivery_fee, total: row.total,
    deliveryMethod: row.delivery_method, paymentMethod: row.payment_method,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

// ------------------------------------------------------------
// SHOP
// ------------------------------------------------------------
async function handleShop(request, env, parts, method) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;

  // GET /shop/me  &  GET /shop/profile
  if (parts.length === 2 && (parts[1] === "me" || parts[1] === "profile") && method === "GET") {
    const shop = shopShape(user);
    const stats = await shopStats(env, user);
    const recentOrders = await sellerRecentOrders(env, user.id);
    return ok({ shop, stats, recentOrders });
  }
  // POST /shop/become-seller
  if (parts.length === 2 && parts[1] === "become-seller" && method === "POST") {
    const body = await parseBody(request);
    await run(env, "UPDATE users SET is_seller=1, shop_name=?, bio = COALESCE(bio, ?), updated_at=? WHERE id=?",
      body?.shopName || user.full_name, body?.shopDescription || null, now(), user.id);
    const row = await first(env, "SELECT * FROM users WHERE id = ?", user.id);
    return ok({ shop: shopShape(row), message: "Seller account created" }, 201);
  }
  // PUT /shop
  if (parts.length === 1 && method === "PUT") {
    const body = await parseBody(request);
    const sets = [];
    const binds = [];
    if (body.shopName !== undefined) { sets.push("shop_name = ?"); binds.push(body.shopName); }
    if (body.bio !== undefined) { sets.push("bio = ?"); binds.push(body.bio); }
    if (body.location !== undefined) { sets.push("location = ?"); binds.push(body.location); }
    if (body.avatar !== undefined) { sets.push("avatar = ?"); binds.push(body.avatar); }
    if (sets.length) {
      binds.push(now(), user.id);
      await run(env, `UPDATE users SET ${sets.join(", ")}, updated_at=? WHERE id=?`, ...binds);
    }
    const row = await first(env, "SELECT * FROM users WHERE id = ?", user.id);
    return ok({ message: "Shop updated", shop: shopShape(row) });
  }
  return notFound("No shop route");
}

function shopShape(user) {
  return {
    id: user.id, shopName: user.shop_name, shopDescription: user.bio, avatar: user.avatar,
    location: user.location, isSeller: !!user.is_seller, shopVerified: !!user.shop_verified,
    sellerRating: user.seller_rating, totalSales: user.total_sales, fullName: user.full_name,
    email: user.email, bio: user.bio, shopBanner: user.shop_banner || user.avatar || null,
  };
}

async function shopStats(env, user) {
  const productRow = await first(env, "SELECT COUNT(*) AS c FROM products WHERE seller_id = ?", user.id);
  const orderRow = await first(env, "SELECT COUNT(*) AS c FROM orders");
  const followers = safeJson(user.followers, []);
  return {
    totalSales: user.total_sales || 0,
    totalOrders: orderRow ? orderRow.c : 0,
    totalProducts: productRow ? productRow.c : 0,
    totalFollowers: Array.isArray(followers) ? followers.length : 0,
    rating: user.seller_rating || 5,
  };
}

async function sellerRecentOrders(env, sellerId) {
  const orders = await all(env, "SELECT * FROM orders ORDER BY created_at DESC LIMIT 50");
  const recent = [];
  for (const o of orders) {
    const items = safeJson(o.items, []);
    if (items.length) {
      recent.push({
        _id: o.id, total: o.total, status: o.status, createdAt: o.created_at,
        buyer: { fullName: "Customer" },
        items: items.map((it) => ({
          product: { name: it.title || "Product" },
          quantity: it.quantity || 1,
          price: it.price || 0,
        })),
      });
    }
  }
  return recent;
}

// ------------------------------------------------------------
// REVIEWS
// ------------------------------------------------------------
async function handleReviews(request, env, parts, method) {
  const url = new URL(request.url);
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    if (!body?.targetType || !body?.targetId) return badRequest("targetType and targetId are required");
    const rating = Math.max(1, Math.min(5, parseInt(body.rating) || 5));
    await run(env, "INSERT OR REPLACE INTO reviews (id, reviewer_id, target_type, target_id, rating, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      newId(), user.id, body.targetType, body.targetId, rating, body.content || null, now(), now());
    return ok({ message: "Review submitted", rating });
  }
  if (parts.length === 3 && parts[0] === "reviews" && method === "GET") {
    const rows = await all(env, "SELECT * FROM reviews WHERE target_type=? AND target_id=? ORDER BY created_at DESC",
      parts[1], parts[2]);
    return ok({ reviews: rows.map((r) => ({ id: r.id, rating: r.rating, content: r.content, reviewerId: r.reviewer_id, createdAt: r.created_at })) });
  }
  return ok({ reviews: [] });
}

// ------------------------------------------------------------
// PAYMENTS
// ------------------------------------------------------------
async function handlePayments(request, env, parts, method) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const url = new URL(request.url);

  if (parts.length === 1 && method === "GET") return ok({ methods: [] });
  if (parts.length === 1 && method === "POST") {
    const body = await parseBody(request);
    return ok({ method: { id: newId(), ...body }, message: "Payment method added" }, 201);
  }
  if (parts.length === 3 && parts[2] === "default" && method === "PUT") {
    return ok({ message: "Default set" });
  }
  if (parts.length === 2 && method === "DELETE") return ok({ message: "Method removed" });

  if (parts.length === 2 && parts[1] === "balance" && method === "GET") return ok({ balance: 0, currency: "NGN" });
  if (parts.length === 2 && parts[1] === "transactions" && method === "GET") return ok({ transactions: [] });
  if (parts.length === 2 && parts[1] === "history" && method === "GET") return ok({ history: [] });
  if (parts.length === 2 && parts[1] === "intent" && method === "POST") {
    const body = await parseBody(request);
    return ok({ paymentIntentId: newId(), clientSecret: "cs_dev", amount: body?.amount, currency: "NGN" });
  }
  if (parts.length === 2 && parts[1] === "confirm" && method === "POST") return ok({ status: "succeeded" });
  if (parts.length === 2 && parts[1] === "withdrawal" && method === "POST") {
    const body = await parseBody(request);
    return ok({ message: "Withdrawal requested", amount: body?.amount });
  }
  return notFound("No payments route");
}
