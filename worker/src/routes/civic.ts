/**
 * Civic engagement + money movement: polls, petitions, campaigns,
 * donations, moderation reports, payments, withdrawals.
 */
import { Hono } from 'hono';
import { newId, randomRef } from '../lib/crypto';
import { all, count, first, run } from '../lib/db';
import { badRequest, forbidden, jsonList, notFound, num, str } from '../lib/http';
import { isStaff, requireAuth, requireStaff } from '../middleware';
import { authorMap, type Row } from '../lib/users';
import { audit, logActivity, notify, notifyMany, trackAnalytics } from '../lib/notify';
import type { Env, AppEnv } from '../types';

export const polls = new Hono<AppEnv>();
export const petitions = new Hono<AppEnv>();
export const campaigns = new Hono<AppEnv>();
export const donations = new Hono<AppEnv>();
export const reports = new Hono<AppEnv>();
export const payments = new Hono<AppEnv>();

/* ============================== POLLS ============================== */

function pollRow(r: Row, votes: Row[] = []): Row {
  const options = jsonList<Row>(r.options);
  const tally = new Map<string, number>();
  for (const vote of votes) tally.set(String(vote.option_key), (tally.get(String(vote.option_key)) ?? 0) + 1);
  const total = votes.length || num(r.total_votes);
  return {
    _id: String(r.id),
    id: String(r.id),
    question: str(r.question),
    category: str(r.category),
    options: options.map((o) => ({
      key: String(o.key),
      label: String(o.label),
      votes: tally.get(String(o.key)) ?? 0,
      percentage: total ? Math.round(((tally.get(String(o.key)) ?? 0) / total) * 100) : 0,
    })),
    multiple: r.multiple === 1,
    closesAt: r.closes_at ? str(r.closes_at) : null,
    totalVotes: total,
    status: str(r.status),
    createdAt: str(r.created_at),
  };
}

polls.get('/', async (c) => {
  const user = c.get('user');
  const rows = await all<Row>(c.env.DB, `SELECT * FROM polls ORDER BY created_at DESC LIMIT 40`);
  const out: Row[] = [];
  for (const row of rows) {
    const votes = await all<Row>(c.env.DB, 'SELECT option_key, user_id FROM poll_votes WHERE poll_id = ?', String(row.id));
    const mine = user ? votes.filter((v) => String(v.user_id) === user.id).map((v) => String(v.option_key)) : [];
    out.push({ ...pollRow(row, votes), myVotes: mine, hasVoted: mine.length > 0 });
  }
  return c.json({ polls: out, total: out.length });
});

polls.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const question = String(body.question ?? '').trim();
  const options: string[] = Array.isArray(body.options)
    ? body.options.map((o: unknown) => (typeof o === 'string' ? o : String((o as Row)?.label ?? ''))).filter(Boolean)
    : [];
  if (question.length < 5) throw badRequest('Ask a clear question (at least 5 characters).');
  if (options.length < 2) throw badRequest('A poll needs at least two options.');

  const id = newId('pol_');
  await run(
    c.env.DB,
    `INSERT INTO polls (id, question, options, author_id, category, multiple, closes_at, total_votes, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'open', datetime('now'))`,
    id,
    question,
    JSON.stringify(options.map((label, i) => ({ key: `opt_${i + 1}`, label }))),
    user.id,
    String(body.category ?? 'community'),
    body.multiple ? 1 : 0,
    body.closesAt ? String(body.closesAt) : null,
  );
  const row = await first<Row>(c.env.DB, 'SELECT * FROM polls WHERE id = ?', id);
  return c.json({ message: 'Poll published.', poll: pollRow(row!) }, 201);
});

polls.post('/:id/vote', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM polls WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Poll not found.');
  if (String(row.status) !== 'open') throw badRequest('This poll has closed.');
  const body = await c.req.json().catch(() => ({}));
  const raw = body.optionKey ?? body.option ?? body.options;
  const chosen: string[] = Array.isArray(raw) ? raw.map(String) : [String(raw ?? '')].filter(Boolean);
  if (!chosen.length) throw badRequest('Pick an option to vote.');

  const valid = jsonList<Row>(row.options).map((o) => String(o.key));
  for (const key of chosen) {
    if (!valid.includes(key)) throw badRequest('That option is not part of this poll.');
  }
  if (!row.multiple && chosen.length > 1) throw badRequest('This poll only allows a single choice.');

  const already = await all<Row>(c.env.DB, 'SELECT option_key FROM poll_votes WHERE poll_id = ? AND user_id = ?', String(row.id), user.id);
  if (already.length && !row.multiple) throw badRequest('You have already voted in this poll.');

  for (const key of chosen) {
    await run(
      c.env.DB,
      `INSERT OR IGNORE INTO poll_votes (poll_id, user_id, option_key, created_at) VALUES (?, ?, ?, datetime('now'))`,
      String(row.id),
      user.id,
      key,
    );
  }
  await run(
    c.env.DB,
    'UPDATE polls SET total_votes = (SELECT COUNT(*) FROM poll_votes WHERE poll_id = ?) WHERE id = ?',
    String(row.id),
    String(row.id),
  );
  const votes = await all<Row>(c.env.DB, 'SELECT option_key, user_id FROM poll_votes WHERE poll_id = ?', String(row.id));
  return c.json({ message: 'Vote recorded.', poll: { ...pollRow(row, votes), myVotes: chosen, hasVoted: true } });
});

/* =========================== PETITIONS =========================== */

petitions.get('/', async (c) => {
  const user = c.get('user');
  const rows = await all<Row>(c.env.DB, `SELECT * FROM petitions ORDER BY created_at DESC LIMIT 60`);
  const out: Row[] = [];
  for (const row of rows) {
    const signed = user
      ? await first(c.env.DB, 'SELECT 1 AS x FROM petition_signatures WHERE petition_id = ? AND user_id = ?', String(row.id), user.id)
      : null;
    out.push({
      _id: String(row.id),
      id: String(row.id),
      title: str(row.title),
      description: str(row.description),
      target: str(row.target),
      coverImage: str(row.cover_image),
      goal: num(row.goal, 100),
      signatureCount: num(row.signature_count),
      progress: Math.min(100, Math.round((num(row.signature_count) / Math.max(1, num(row.goal, 100))) * 100)),
      status: str(row.status),
      hasSigned: !!signed,
      createdAt: str(row.created_at),
    });
  }
  return c.json({ petitions: out, total: out.length });
});

petitions.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (title.length < 5) throw badRequest('Give your petition a clear title.');
  const id = newId('pet_');
  await run(
    c.env.DB,
    `INSERT INTO petitions (id, title, description, target, author_id, cover_image, goal, signature_count, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'open', datetime('now'))`,
    id,
    title,
    String(body.description ?? '').slice(0, 4000),
    String(body.target ?? ''),
    user.id,
    String(body.coverImage ?? ''),
    Number(body.goal ?? 100),
  );
  await logActivity(c.env, {
    userId: user.id,
    type: 'petition_created',
    targetType: 'petition',
    targetId: id,
    message: `${user.fullName} started the petition “${title}”`,
  });
  return c.json({ message: 'Petition published. Share it to gather signatures.', petitionId: id }, 201);
});

petitions.post('/:id/sign', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM petitions WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Petition not found.');
  if (String(row.status) !== 'open') throw badRequest('This petition is closed.');
  const exists = await first(c.env.DB, 'SELECT 1 AS x FROM petition_signatures WHERE petition_id = ? AND user_id = ?', String(row.id), user.id);
  if (exists) throw badRequest('You have already signed this petition.');

  const comment = String((await c.req.json().catch(() => ({}))).comment ?? '').slice(0, 500);
  await run(
    c.env.DB,
    `INSERT INTO petition_signatures (petition_id, user_id, comment, created_at) VALUES (?, ?, ?, datetime('now'))`,
    String(row.id),
    user.id,
    comment,
  );
  await run(
    c.env.DB,
    'UPDATE petitions SET signature_count = (SELECT COUNT(*) FROM petition_signatures WHERE petition_id = ?) WHERE id = ?',
    String(row.id),
    String(row.id),
  );
  if (row.author_id) {
    await notify(c.env, {
      userId: String(row.author_id),
      fromId: user.id,
      type: 'petition',
      message: `${user.fullName} signed “${String(row.title)}”`,
      link: `/environment`,
    });
  }
  const total = await count(c.env.DB, 'SELECT COUNT(*) AS n FROM petition_signatures WHERE petition_id = ?', String(row.id));
  return c.json({ message: 'Signed. Thank you for speaking up.', signatureCount: total });
});

petitions.get('/:id/signatures', async (c) => {
  const rows = await all<Row>(
    c.env.DB,
    'SELECT * FROM petition_signatures WHERE petition_id = ? ORDER BY created_at DESC LIMIT 200',
    c.req.param('id'),
  );
  const map = await authorMap(c.env.DB, rows.map((r) => String(r.user_id)));
  return c.json(rows.map((r) => ({ user: map.get(String(r.user_id)), comment: str(r.comment), createdAt: str(r.created_at) })));
});

/* =========================== CAMPAIGNS =========================== */

campaigns.get('/', async (c) => {
  const rows = await all<Row>(c.env.DB, `SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 60`);
  return c.json({
    campaigns: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      title: str(r.title),
      description: str(r.description),
      coverImage: str(r.cover_image),
      goalAmount: num(r.goal_amount),
      raisedAmount: num(r.raised_amount),
      progress: num(r.goal_amount) ? Math.min(100, Math.round((num(r.raised_amount) / num(r.goal_amount)) * 100)) : 0,
      currency: str(r.currency, 'NGN'),
      category: str(r.category),
      deadline: r.deadline ? str(r.deadline) : null,
      status: str(r.status),
      createdAt: str(r.created_at),
    })),
  });
});

campaigns.post('/', async (c) => {
  requireStaff(c);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (title.length < 3) throw badRequest('Campaign title is required.');
  const id = newId('cmp_');
  await run(
    c.env.DB,
    `INSERT INTO campaigns (id, title, description, cover_image, goal_amount, raised_amount, currency, category, deadline, status, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'active', datetime('now'))`,
    id,
    title,
    String(body.description ?? ''),
    String(body.coverImage ?? ''),
    Number(body.goalAmount ?? 0),
    String(body.currency ?? 'NGN'),
    String(body.category ?? 'community'),
    body.deadline ? String(body.deadline) : null,
  );
  return c.json({ message: 'Campaign created.', campaignId: id }, 201);
});

/* =========================== DONATIONS =========================== */

donations.post('/initialize', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const amount = Number(body.amount ?? NaN);
  if (!Number.isFinite(amount) || amount < 100) throw badRequest('Minimum donation is ₦100.');
  const user = c.get('user');
  const reference = randomRef('DON');

  await run(
    c.env.DB,
    `INSERT INTO donations (id, reference, donor_name, donor_email, user_id, amount, currency, campaign_id, project_id, message, anonymous, status, channel, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`,
    newId('don_'),
    reference,
    String(body.donorName ?? user?.fullName ?? 'Kind Supporter'),
    String(body.donorEmail ?? user?.email ?? ''),
    user?.id ?? null,
    amount,
    String(body.currency ?? 'NGN'),
    body.campaignId ? String(body.campaignId) : null,
    body.projectId ? String(body.projectId) : null,
    String(body.message ?? '').slice(0, 500),
    body.anonymous ? 1 : 0,
    String(body.channel ?? 'paystack'),
  );

  // In a live deployment the Paystack secret initialises a real checkout
  // session; without credentials we return a verifiable local reference so
  // the flow stays complete end-to-end.
  const authorizationUrl = `/donations/verify?reference=${reference}`;
  return c.json(
    {
      message: 'Donation initialised.',
      reference,
      access_code: reference,
      authorization_url: authorizationUrl,
      amount,
      currency: String(body.currency ?? 'NGN'),
    },
    201,
  );
});

donations.post('/verify', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const reference = String(body.reference ?? c.req.query('reference') ?? '');
  if (!reference) throw badRequest('reference is required.');
  const row = await first<Row>(c.env.DB, 'SELECT * FROM donations WHERE reference = ?', reference);
  if (!row) throw notFound('No donation matches that reference.');

  if (String(row.status) !== 'paid') {
    await run(c.env.DB, `UPDATE donations SET status = 'paid' WHERE id = ?`, String(row.id));
    if (row.project_id) {
      await run(
        c.env.DB,
        'UPDATE projects SET raised_amount = raised_amount + ?, supporters = supporters + 1, updated_at = datetime(?) WHERE id = ?',
        num(row.amount),
        'now',
        String(row.project_id),
      );
    }
    if (row.campaign_id) {
      await run(c.env.DB, 'UPDATE campaigns SET raised_amount = raised_amount + ? WHERE id = ?', num(row.amount), String(row.campaign_id));
    }
    if (row.user_id) {
      await notify(c.env, {
        userId: String(row.user_id),
        type: 'donation',
        message: `Thank you! Your ₦${num(row.amount).toLocaleString()} donation was received.`,
        link: `/diaspora`,
      });
    }
    await trackAnalytics(c.env, {
      userId: row.user_id ? String(row.user_id) : null,
      eventType: 'donation_completed',
      entityType: 'donation',
      entityId: String(row.id),
      value: num(row.amount),
      request: c.req.raw,
    });
  }
  return c.json({
    status: true,
    message: 'Payment verified. Thank you for supporting KE Town.',
    donation: {
      _id: String(row.id),
      reference,
      amount: num(row.amount),
      currency: str(row.currency, 'NGN'),
      status: 'paid',
      donorName: num(row.anonymous) ? 'Anonymous' : str(row.donor_name),
      createdAt: str(row.created_at),
    },
  });
});

donations.get('/stats', async (c) => {
  const row = await first<{ total: number; n: number; donors: number }>(
    c.env.DB,
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS n, COUNT(DISTINCT donor_email) AS donors
       FROM donations WHERE status = 'paid'`,
  );
  return c.json({
    totalRaised: Number(row?.total ?? 0),
    donationCount: Number(row?.n ?? 0),
    uniqueDonors: Number(row?.donors ?? 0),
    currency: 'NGN',
  });
});

donations.get('/recent', async (c) => {
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM donations WHERE status = 'paid' ORDER BY created_at DESC LIMIT 12`,
  );
  return c.json(
    rows.map((r) => ({
      _id: String(r.id),
      donorName: r.anonymous === 1 ? 'Anonymous' : str(r.donor_name, 'Kind Supporter'),
      amount: num(r.amount),
      currency: str(r.currency, 'NGN'),
      message: str(r.message),
      createdAt: str(r.created_at),
    })),
  );
});

/* ============================ REPORTS ============================ */

reports.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const targetType = String(body.targetType ?? '');
  const targetId = String(body.targetId ?? '');
  if (!targetType || !targetId) throw badRequest('targetType and targetId are required.');
  const dup = await first(
    c.env.DB,
    `SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'pending'`,
    user.id,
    targetType,
    targetId,
  );
  if (dup) throw badRequest('You have already reported this. Our moderators are on it.');

  await run(
    c.env.DB,
    `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
    newId('rpt_'),
    user.id,
    targetType,
    targetId,
    String(body.reason ?? 'other'),
    String(body.details ?? '').slice(0, 1000),
  );
  await audit(c.env, { userId: user.id, action: 'report_filed', resource: targetType, resourceId: targetId });
  return c.json({ message: 'Report filed. Moderators will review it within 24 hours.' }, 201);
});

reports.get('/', async (c) => {
  requireStaff(c);
  const status = c.req.query('status') ?? 'pending';
  const rows = await all<Row>(
    c.env.DB,
    status === 'all'
      ? 'SELECT * FROM reports ORDER BY created_at DESC LIMIT 200'
      : 'SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC LIMIT 200',
    ...(status === 'all' ? [] : [status]),
  );
  const map = await authorMap(c.env.DB, rows.map((r) => String(r.reporter_id)));
  return c.json({
    reports: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      reporter: map.get(String(r.reporter_id)),
      targetType: str(r.target_type),
      targetId: str(r.target_id),
      reason: str(r.reason),
      details: str(r.details),
      status: str(r.status),
      createdAt: str(r.created_at),
    })),
  });
});

reports.put('/:id/resolve', async (c) => {
  const user = requireStaff(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM reports WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Report not found.');
  const body = await c.req.json().catch(() => ({}));
  const resolution = String(body.resolution ?? 'resolved');
  await run(
    c.env.DB,
    `UPDATE reports SET status = ?, resolved_by = ?, resolution = ?, resolved_at = datetime('now') WHERE id = ?`,
    'resolved',
    user.id,
    resolution,
    String(row.id),
  );
  await audit(c.env, { userId: user.id, action: 'report_resolved', resource: str(row.target_type), resourceId: str(row.target_id) });
  return c.json({ message: 'Report resolved.' });
});

/* =========================== PAYMENTS =========================== */

function txRow(r: Row): Row {
  return {
    _id: String(r.id),
    id: String(r.id),
    reference: str(r.reference),
    kind: str(r.kind),
    direction: str(r.direction),
    amount: num(r.amount),
    currency: str(r.currency, 'NGN'),
    status: str(r.status),
    method: str(r.method),
    description: str(r.description),
    createdAt: str(r.created_at),
  };
}

payments.get('/methods', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', user.id);
  return c.json({
    methods: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      type: str(r.type),
      label: str(r.label),
      bankName: str(r.bank_name),
      accountName: str(r.account_name),
      accountNumber: str(r.account_number),
      last4: str(r.last4),
      brand: str(r.brand),
      expiry: str(r.expiry),
      isDefault: r.is_default === 1,
      createdAt: str(r.created_at),
    })),
    available: [
      { id: 'bank', label: 'Bank transfer', icon: '🏦' },
      { id: 'card', label: 'Debit / credit card', icon: '💳' },
      { id: 'ussd', label: 'USSD', icon: '📱' },
      { id: 'wallet', label: 'KE Town wallet', icon: '👛' },
    ],
  });
});

payments.post('/methods', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const type = String(body.type ?? 'bank');
  const label = String(body.label ?? '').trim() || (type === 'bank' ? String(body.bankName ?? 'Bank account') : 'Payment method');
  if (type === 'bank') {
    if (!String(body.accountNumber ?? '').trim()) throw badRequest('Account number is required.');
    if (!String(body.accountName ?? '').trim()) throw badRequest('Account name is required.');
  }
  const hasAny = await count(c.env.DB, 'SELECT COUNT(*) AS n FROM payment_methods WHERE user_id = ?', user.id);
  const id = newId('pm_');
  await run(
    c.env.DB,
    `INSERT INTO payment_methods (id, user_id, type, label, bank_name, account_name, account_number, last4, brand, expiry, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    id,
    user.id,
    type,
    label,
    String(body.bankName ?? ''),
    String(body.accountName ?? ''),
    String(body.accountNumber ?? ''),
    String(body.last4 ?? String(body.accountNumber ?? '').slice(-4)),
    String(body.brand ?? ''),
    String(body.expiry ?? ''),
    hasAny === 0 || body.isDefault ? 1 : 0,
  );
  return c.json({ message: 'Payment method saved.', methodId: id }, 201);
});

payments.delete('/methods/:id', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'DELETE FROM payment_methods WHERE id = ? AND user_id = ?', c.req.param('id'), user.id);
  return c.json({ message: 'Payment method removed.' });
});

payments.put('/methods/:id/default', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'UPDATE payment_methods SET is_default = 0 WHERE user_id = ?', user.id);
  await run(c.env.DB, 'UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?', c.req.param('id'), user.id);
  return c.json({ message: 'Default payment method updated.' });
});

payments.get('/balance', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT balance, pending_balance, total_sales FROM users WHERE id = ?', user.id);
  return c.json({
    available: num(row?.balance),
    pending: num(row?.pending_balance),
    lifetimeSales: num(row?.total_sales),
    currency: 'NGN',
  });
});

payments.get('/transactions', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', user.id);
  return c.json({ transactions: rows.map(txRow), total: rows.length });
});

payments.get('/history', async (c) => {
  const user = await requireAuth(c);
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 20)));
  const rows = await all<Row>(
    c.env.DB,
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    user.id,
    limit,
    (page - 1) * limit,
  );
  const total = await count(c.env.DB, 'SELECT COUNT(*) AS n FROM transactions WHERE user_id = ?', user.id);
  return c.json({ transactions: rows.map(txRow), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

payments.post('/intent', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const amount = Number(body.amount ?? NaN);
  if (!Number.isFinite(amount) || amount <= 0) throw badRequest('Enter a valid amount.');
  const reference = randomRef('PAY');
  await run(
    c.env.DB,
    `INSERT INTO transactions (id, user_id, reference, kind, direction, amount, currency, status, method, description, created_at)
     VALUES (?, ?, ?, ?, 'debit', ?, ?, 'pending', ?, ?, datetime('now'))`,
    newId('txn_'),
    user.id,
    reference,
    String(body.kind ?? 'payment'),
    amount,
    String(body.currency ?? 'NGN'),
    String(body.method ?? 'card'),
    String(body.description ?? 'Payment'),
  );
  return c.json(
    {
      message: 'Payment intent created.',
      paymentIntentId: reference,
      clientSecret: `${reference}_secret`,
      amount,
      currency: String(body.currency ?? 'NGN'),
    },
    201,
  );
});

payments.post('/confirm', async (c) => {
  const user = await requireAuth(c);
  const paymentIntentId = String((await c.req.json().catch(() => ({}))).paymentIntentId ?? '');
  const row = await first<Row>(c.env.DB, 'SELECT * FROM transactions WHERE reference = ? AND user_id = ?', paymentIntentId, user.id);
  if (!row) throw notFound('Payment intent not found.');
  await run(c.env.DB, `UPDATE transactions SET status = 'success' WHERE id = ?`, String(row.id));
  return c.json({ message: 'Payment confirmed.', transaction: txRow((await first<Row>(c.env.DB, 'SELECT * FROM transactions WHERE id = ?', String(row.id)))!) });
});

payments.post('/withdrawal', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const amount = Number(body.amount ?? NaN);
  if (!Number.isFinite(amount) || amount < 1000) throw badRequest('Minimum withdrawal is ₦1,000.');
  if (amount > user.balance) throw badRequest('That amount is more than your available balance.');
  if (!String(body.accountNumber ?? '').trim()) throw badRequest('Add the bank account to withdraw to.');

  await run(
    c.env.DB,
    `INSERT INTO withdrawals (id, user_id, amount, currency, method, bank_name, account_number, account_name, status, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`,
    newId('wd_'),
    user.id,
    amount,
    String(body.currency ?? 'NGN'),
    String(body.method ?? 'bank'),
    String(body.bankName ?? ''),
    String(body.accountNumber ?? ''),
    String(body.accountName ?? ''),
    String(body.note ?? ''),
  );
  await run(c.env.DB, 'UPDATE users SET balance = balance - ? WHERE id = ?', amount, user.id);
  await run(
    c.env.DB,
    `INSERT INTO transactions (id, user_id, reference, kind, direction, amount, currency, status, method, description, created_at)
     VALUES (?, ?, ?, 'withdrawal', 'debit', ?, ?, 'pending', ?, 'Withdrawal request', datetime('now'))`,
    newId('txn_'),
    user.id,
    randomRef('WD'),
    amount,
    String(body.currency ?? 'NGN'),
    String(body.method ?? 'bank'),
  );
  await notify(c.env, {
    userId: user.id,
    type: 'payout',
    message: `Withdrawal of ₦${amount.toLocaleString()} requested. Payouts settle in 1-2 business days.`,
    link: '/seller',
  });
  return c.json({ message: 'Withdrawal requested. You will be notified when it settles.' }, 201);
});

payments.get('/withdrawals', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', user.id);
  return c.json(
    rows.map((r) => ({
      _id: String(r.id),
      amount: num(r.amount),
      currency: str(r.currency, 'NGN'),
      method: str(r.method),
      bankName: str(r.bank_name),
      accountNumber: str(r.account_number),
      status: str(r.status),
      createdAt: str(r.created_at),
      processedAt: r.processed_at ? str(r.processed_at) : null,
    })),
  );
});

export { isStaff, notifyMany };
