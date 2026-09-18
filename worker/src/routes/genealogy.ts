/**
 * Genealogy: war canoe houses, family trees, members, relationships, export.
 */
import { Hono } from 'hono';
import { newId } from '../lib/crypto';
import { all, count, first, run } from '../lib/db';
import { badRequest, forbidden, jsonList, notFound, num, str } from '../lib/http';
import { isStaff, requireAuth } from '../middleware';
import type { Row } from '../lib/users';
import type { Env, AppEnv } from '../types';

export const genealogy = new Hono<AppEnv>();

function houseRow(r: Row): Row {
  return {
    _id: String(r.id),
    id: String(r.id),
    name: str(r.name),
    community: str(r.community),
    founder: str(r.founder),
    foundedYear: r.founded_year === null ? null : num(r.founded_year),
    description: str(r.description),
    image: str(r.image),
    lineage: jsonList<Row>(r.lineage),
    currentChief: str(r.current_chief),
    status: str(r.status),
    createdAt: str(r.created_at),
  };
}

function memberRow(r: Row): Row {
  return {
    _id: String(r.id),
    id: String(r.id),
    treeId: String(r.tree_id),
    name: str(r.name),
    gender: str(r.gender, 'unknown'),
    birthYear: r.birth_year === null ? null : num(r.birth_year),
    deathYear: r.death_year === null ? null : num(r.death_year),
    isLiving: r.is_living === 1,
    generation: num(r.generation),
    parentId: r.parent_id ? String(r.parent_id) : null,
    spouseId: r.spouse_id ? String(r.spouse_id) : null,
    houseId: r.house_id ? String(r.house_id) : null,
    photo: str(r.photo),
    notes: str(r.notes),
    birthPlace: str(r.birth_place),
    createdAt: str(r.created_at),
  };
}

async function treeOrForbidden(db: D1Database, treeId: string, user: { id: string; role: string }): Promise<Row> {
  const tree = await first<Row>(db, 'SELECT * FROM family_trees WHERE id = ?', treeId);
  if (!tree) throw notFound('Family tree not found.');
  if (String(tree.owner_id) !== user.id && String(tree.visibility) === 'private' && !isStaff(user)) {
    throw forbidden('This family tree is private.');
  }
  return tree;
}

/* ------------------------ War canoe houses ------------------------ */

genealogy.get('/houses', async (c) => {
  const community = c.req.query('community');
  const status = c.req.query('status');
  const where = [`status = 'active'`];
  const params: (string | number)[] = [];
  if (community && community !== 'all') {
    where.push('community = ?');
    params.push(community);
  }
  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM war_canoe_houses WHERE ${where.join(' AND ')} ORDER BY name ASC`,
    ...params,
  );
  return c.json({ houses: rows.map(houseRow), total: rows.length });
});

genealogy.get('/houses/:id', async (c) => {
  const row = await first<Row>(c.env.DB, 'SELECT * FROM war_canoe_houses WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('War canoe house not found.');
  return c.json(houseRow(row));
});

genealogy.post('/houses', async (c) => {
  requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  if (name.length < 2) throw badRequest('House name is required.');
  const id = newId('wch_');
  await run(
    c.env.DB,
    `INSERT INTO war_canoe_houses (id, name, community, founder, founded_year, description, image, lineage, current_chief, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))`,
    id,
    name,
    String(body.community ?? ''),
    String(body.founder ?? ''),
    body.foundedYear ? Number(body.foundedYear) : null,
    String(body.description ?? ''),
    String(body.image ?? ''),
    JSON.stringify(Array.isArray(body.lineage) ? body.lineage : []),
    String(body.currentChief ?? ''),
  );
  const row = await first<Row>(c.env.DB, 'SELECT * FROM war_canoe_houses WHERE id = ?', id);
  return c.json({ message: 'War canoe house recorded.', house: houseRow(row!) }, 201);
});

/* -------------------------- Community tree ------------------------- */

genealogy.get('/tree', async (c) => {
  const houses = await all<Row>(c.env.DB, `SELECT * FROM war_canoe_houses WHERE status = 'active' ORDER BY name`);
  const members = await all<Row>(
    c.env.DB,
    `SELECT fm.*, ft.name AS tree_name FROM family_members fm
       JOIN family_trees ft ON ft.id = fm.tree_id
      WHERE ft.visibility = 'public' ORDER BY fm.generation ASC, fm.name ASC LIMIT 400`,
  );
  return c.json({
    houses: houses.map(houseRow),
    nodes: members.map(memberRow),
    generations: Array.from(new Set(members.map((m) => num(m.generation)))).sort((a, b) => a - b),
  });
});

/* --------------------------- Family trees -------------------------- */

function treePayload(r: Row, members: Row[] = [], relationships: Row[] = []): Row {
  return {
    _id: String(r.id),
    id: String(r.id),
    ownerId: String(r.owner_id),
    name: str(r.name),
    description: str(r.description),
    houseId: r.house_id ? String(r.house_id) : null,
    visibility: str(r.visibility, 'private'),
    rootId: r.root_id ? String(r.root_id) : null,
    members: members.map(memberRow),
    relationships: relationships.map((rel) => ({
      _id: String(rel.id),
      fromId: String(rel.from_id),
      toId: String(rel.to_id),
      relation: str(rel.relation),
    })),
    memberCount: members.length,
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

genealogy.get('/trees', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(
    c.env.DB,
    'SELECT * FROM family_trees WHERE owner_id = ? OR visibility = ? ORDER BY updated_at DESC',
    user.id,
    'public',
  );
  const out: Row[] = [];
  for (const row of rows) {
    const n = await count(c.env.DB, 'SELECT COUNT(*) AS n FROM family_members WHERE tree_id = ?', String(row.id));
    out.push({ ...treePayload(row), memberCount: n });
  }
  return c.json({ trees: out, total: out.length });
});

genealogy.post('/trees', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  if (name.length < 2) throw badRequest('Name your family tree first.');
  const id = newId('tre_');
  await run(
    c.env.DB,
    `INSERT INTO family_trees (id, owner_id, name, description, house_id, visibility, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    id,
    user.id,
    name,
    String(body.description ?? ''),
    body.houseId ? String(body.houseId) : null,
    ['public', 'private', 'family'].includes(String(body.visibility)) ? String(body.visibility) : 'private',
  );
  const row = await first<Row>(c.env.DB, 'SELECT * FROM family_trees WHERE id = ?', id);
  return c.json({ message: 'Family tree created.', tree: treePayload(row!) }, 201);
});

genealogy.get('/trees/:id', async (c) => {
  const user = await requireAuth(c);
  const tree = await first<Row>(c.env.DB, 'SELECT * FROM family_trees WHERE id = ?', c.req.param('id'));
  if (!tree) throw notFound('Family tree not found.');
  if (String(tree.owner_id) !== user.id && String(tree.visibility) === 'private' && !isStaff(user)) {
    throw forbidden('This family tree is private.');
  }
  const members = await all<Row>(
    c.env.DB,
    'SELECT * FROM family_members WHERE tree_id = ? ORDER BY generation ASC, name ASC',
    String(tree.id),
  );
  const relationships = await all<Row>(c.env.DB, 'SELECT * FROM family_relationships WHERE tree_id = ?', String(tree.id));
  return c.json(treePayload(tree, members, relationships));
});

genealogy.put('/trees/:id', async (c) => {
  const user = await requireAuth(c);
  const tree = await first<Row>(c.env.DB, 'SELECT * FROM family_trees WHERE id = ?', c.req.param('id'));
  if (!tree) throw notFound('Family tree not found.');
  if (String(tree.owner_id) !== user.id && !isStaff(user)) throw forbidden('Only the owner can edit this tree.');
  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number)[] = [];
  for (const [key, col] of Object.entries({ name: 'name', description: 'description', visibility: 'visibility', houseId: 'house_id', rootId: 'root_id' })) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(String(body[key]));
    }
  }
  if (!sets.length) return c.json({ message: 'Nothing to update.', tree: treePayload(tree) });
  sets.push(`updated_at = datetime('now')`);
  await run(c.env.DB, `UPDATE family_trees SET ${sets.join(', ')} WHERE id = ?`, ...params, String(tree.id));
  const updated = await first<Row>(c.env.DB, 'SELECT * FROM family_trees WHERE id = ?', String(tree.id));
  return c.json({ message: 'Family tree updated.', tree: treePayload(updated!) });
});

genealogy.delete('/trees/:id', async (c) => {
  const user = await requireAuth(c);
  const tree = await first<Row>(c.env.DB, 'SELECT * FROM family_trees WHERE id = ?', c.req.param('id'));
  if (!tree) throw notFound('Family tree not found.');
  if (String(tree.owner_id) !== user.id && !isStaff(user)) throw forbidden('Only the owner can delete this tree.');
  await run(c.env.DB, 'DELETE FROM family_relationships WHERE tree_id = ?', String(tree.id));
  await run(c.env.DB, 'DELETE FROM family_members WHERE tree_id = ?', String(tree.id));
  await run(c.env.DB, 'DELETE FROM family_trees WHERE id = ?', String(tree.id));
  return c.json({ message: 'Family tree deleted.' });
});

/* --------------------------- Tree members -------------------------- */

genealogy.post('/trees/:treeId/members', async (c) => {
  const user = await requireAuth(c);
  const tree = await first<Row>(c.env.DB, 'SELECT * FROM family_trees WHERE id = ?', c.req.param('treeId'));
  if (!tree) throw notFound('Family tree not found.');
  if (String(tree.owner_id) !== user.id && !isStaff(user)) throw forbidden('Only the owner can add members.');
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  if (!name) throw badRequest('Member name is required.');

  const id = newId('fmb_');
  await run(
    c.env.DB,
    `INSERT INTO family_members (id, tree_id, name, gender, birth_year, death_year, is_living, generation, parent_id, spouse_id, house_id, photo, notes, birth_place, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    id,
    String(tree.id),
    name,
    String(body.gender ?? 'unknown'),
    body.birthYear ? Number(body.birthYear) : null,
    body.deathYear ? Number(body.deathYear) : null,
    body.isLiving === false ? 0 : 1,
    Number(body.generation ?? 0),
    body.parentId ? String(body.parentId) : null,
    body.spouseId ? String(body.spouseId) : null,
    body.houseId ? String(body.houseId) : (tree.house_id ? String(tree.house_id) : null),
    String(body.photo ?? ''),
    String(body.notes ?? ''),
    String(body.birthPlace ?? ''),
  );
  if (body.parentId) {
    await run(
      c.env.DB,
      `INSERT INTO family_relationships (id, tree_id, from_id, to_id, relation, created_at) VALUES (?, ?, ?, ?, 'child_of', datetime('now'))`,
      newId('frl_'),
      String(tree.id),
      id,
      String(body.parentId),
    );
  }
  await run(c.env.DB, `UPDATE family_trees SET updated_at = datetime('now') WHERE id = ?`, String(tree.id));
  const row = await first<Row>(c.env.DB, 'SELECT * FROM family_members WHERE id = ?', id);
  return c.json({ message: `${name} added to the tree.`, member: memberRow(row!) }, 201);
});

genealogy.get('/trees/:treeId/members/search', async (c) => {
  const user = await requireAuth(c);
  const tree = await treeOrForbidden(c.env.DB, c.req.param('treeId'), user);
  const q = `%${c.req.query('q') ?? ''}%`;
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM family_members WHERE tree_id = ? AND (name LIKE ? OR birth_place LIKE ? OR notes LIKE ?) LIMIT 50`,
    String(tree.id),
    q,
    q,
    q,
  );
  return c.json({ members: rows.map(memberRow), total: rows.length });
});

genealogy.get('/trees/:treeId/members/:memberId', async (c) => {
  const user = await requireAuth(c);
  const tree = await treeOrForbidden(c.env.DB, c.req.param('treeId'), user);
  const row = await first<Row>(
    c.env.DB,
    'SELECT * FROM family_members WHERE id = ? AND tree_id = ?',
    c.req.param('memberId'),
    String(tree.id),
  );
  if (!row) throw notFound('Member not found.');
  const children = await all<Row>(c.env.DB, 'SELECT * FROM family_members WHERE parent_id = ?', String(row.id));
  return c.json({ ...memberRow(row), children: children.map(memberRow) });
});

genealogy.put('/trees/:treeId/members/:memberId', async (c) => {
  const user = await requireAuth(c);
  const tree = await treeOrForbidden(c.env.DB, c.req.param('treeId'), user);
  if (String(tree.owner_id) !== user.id && !isStaff(user)) throw forbidden('Only the owner can edit members.');
  const row = await first<Row>(
    c.env.DB,
    'SELECT * FROM family_members WHERE id = ? AND tree_id = ?',
    c.req.param('memberId'),
    String(tree.id),
  );
  if (!row) throw notFound('Member not found.');

  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  for (const [key, col] of Object.entries({
    name: 'name',
    gender: 'gender',
    photo: 'photo',
    notes: 'notes',
    birthPlace: 'birth_place',
    parentId: 'parent_id',
    spouseId: 'spouse_id',
    houseId: 'house_id',
  })) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(body[key] === null ? null : String(body[key]));
    }
  }
  for (const [key, col] of Object.entries({ birthYear: 'birth_year', deathYear: 'death_year', generation: 'generation' })) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(body[key] === null || body[key] === '' ? null : Number(body[key]));
    }
  }
  if (body.isLiving !== undefined) {
    sets.push('is_living = ?');
    params.push(body.isLiving ? 1 : 0);
  }
  if (!sets.length) return c.json({ message: 'Nothing to update.', member: memberRow(row) });
  await run(c.env.DB, `UPDATE family_members SET ${sets.join(', ')} WHERE id = ?`, ...params, String(row.id));
  const updated = await first<Row>(c.env.DB, 'SELECT * FROM family_members WHERE id = ?', String(row.id));
  return c.json({ message: 'Member updated.', member: memberRow(updated!) });
});

genealogy.delete('/trees/:treeId/members/:memberId', async (c) => {
  const user = await requireAuth(c);
  const tree = await treeOrForbidden(c.env.DB, c.req.param('treeId'), user);
  if (String(tree.owner_id) !== user.id && !isStaff(user)) throw forbidden('Only the owner can remove members.');
  await run(c.env.DB, 'UPDATE family_members SET parent_id = NULL WHERE parent_id = ?', c.req.param('memberId'));
  await run(c.env.DB, 'DELETE FROM family_relationships WHERE tree_id = ? AND (from_id = ? OR to_id = ?)', String(tree.id), c.req.param('memberId'), c.req.param('memberId'));
  await run(c.env.DB, 'DELETE FROM family_members WHERE id = ? AND tree_id = ?', c.req.param('memberId'), String(tree.id));
  return c.json({ message: 'Member removed from the tree.' });
});

/* -------------------------- Relationships -------------------------- */

genealogy.post('/trees/:treeId/relationships', async (c) => {
  const user = await requireAuth(c);
  const tree = await treeOrForbidden(c.env.DB, c.req.param('treeId'), user);
  if (String(tree.owner_id) !== user.id && !isStaff(user)) throw forbidden('Only the owner can edit relationships.');
  const body = await c.req.json().catch(() => ({}));
  const fromId = String(body.fromId ?? '');
  const toId = String(body.toId ?? '');
  if (!fromId || !toId) throw badRequest('fromId and toId are required.');
  if (fromId === toId) throw badRequest('A member cannot be related to themselves.');
  const id = newId('frl_');
  await run(
    c.env.DB,
    `INSERT INTO family_relationships (id, tree_id, from_id, to_id, relation, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    id,
    String(tree.id),
    fromId,
    toId,
    String(body.relation ?? 'child_of'),
  );
  return c.json({ message: 'Relationship recorded.', relationshipId: id }, 201);
});

genealogy.delete('/trees/:treeId/relationships/:relationshipId', async (c) => {
  const user = await requireAuth(c);
  const tree = await treeOrForbidden(c.env.DB, c.req.param('treeId'), user);
  if (String(tree.owner_id) !== user.id && !isStaff(user)) throw forbidden('Only the owner can edit relationships.');
  await run(c.env.DB, 'DELETE FROM family_relationships WHERE id = ? AND tree_id = ?', c.req.param('relationshipId'), String(tree.id));
  return c.json({ message: 'Relationship removed.' });
});

genealogy.get('/trees/:treeId/stats', async (c) => {
  const user = await requireAuth(c);
  const tree = await treeOrForbidden(c.env.DB, c.req.param('treeId'), user);
  const treeId = String(tree.id);
  const total = await count(c.env.DB, 'SELECT COUNT(*) AS n FROM family_members WHERE tree_id = ?', treeId);
  const generations = await all<{ generation: number; n: number }>(
    c.env.DB,
    'SELECT generation, COUNT(*) AS n FROM family_members WHERE tree_id = ? GROUP BY generation ORDER BY generation',
    treeId,
  );
  const living = await count(c.env.DB, 'SELECT COUNT(*) AS n FROM family_members WHERE tree_id = ? AND is_living = 1', treeId);
  const oldest = await first<{ name: string; birth_year: number }>(
    c.env.DB,
    'SELECT name, birth_year FROM family_members WHERE tree_id = ? AND birth_year IS NOT NULL ORDER BY birth_year ASC LIMIT 1',
    treeId,
  );
  return c.json({
    totalMembers: total,
    livingMembers: living,
    deceasedMembers: total - living,
    generations: generations.map((g) => ({ generation: Number(g.generation), count: Number(g.n) })),
    generationCount: generations.length,
    oldestAncestor: oldest ? { name: String(oldest.name), birthYear: Number(oldest.birth_year) } : null,
  });
});

genealogy.get('/trees/:treeId/export', async (c) => {
  const user = await requireAuth(c);
  const tree = await treeOrForbidden(c.env.DB, c.req.param('treeId'), user);
  if (String(tree.owner_id) !== user.id && !isStaff(user)) throw forbidden('Only the owner can export this tree.');
  const members = await all<Row>(c.env.DB, 'SELECT * FROM family_members WHERE tree_id = ?', String(tree.id));
  const relationships = await all<Row>(c.env.DB, 'SELECT * FROM family_relationships WHERE tree_id = ?', String(tree.id));
  const payload = treePayload(tree, members, relationships);

  if (c.req.query('format') === 'csv') {
    const header = 'id,name,gender,birthYear,deathYear,generation,parentId,spouseId,notes\n';
    const body = members
      .map((m) =>
        [m.id, m.name, m.gender, m.birth_year ?? '', m.death_year ?? '', m.generation, m.parent_id ?? '', m.spouse_id ?? '', String(m.notes ?? '').replace(/\n/g, ' ')]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    return c.body(header + body, 200, { 'content-type': 'text/csv; charset=utf-8' });
  }
  return c.json(payload);
});

genealogy.post('/import', async (c) => {
  const user = await requireAuth(c);
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) throw badRequest('Attach a JSON export file to import.');
  let data: Row;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw badRequest('That file is not valid JSON. Export a tree first and re-upload it.');
  }
  const treeId = newId('tre_');
  await run(
    c.env.DB,
    `INSERT INTO family_trees (id, owner_id, name, description, visibility, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'private', datetime('now'), datetime('now'))`,
    treeId,
    user.id,
    String((data as Row).name ?? 'Imported tree'),
    String((data as Row).description ?? ''),
  );
  const idMap = new Map<string, string>();
  for (const member of Array.isArray((data as Row).members) ? ((data as Row).members as Row[]) : []) {
    const id = newId('fmb_');
    idMap.set(String(member._id ?? member.id), id);
    await run(
      c.env.DB,
      `INSERT INTO family_members (id, tree_id, name, gender, birth_year, death_year, is_living, generation, photo, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      id,
      treeId,
      String(member.name ?? 'Unnamed'),
      String(member.gender ?? 'unknown'),
      member.birthYear ? Number(member.birthYear) : null,
      member.deathYear ? Number(member.deathYear) : null,
      member.isLiving === false ? 0 : 1,
      Number(member.generation ?? 0),
      String(member.photo ?? ''),
      String(member.notes ?? ''),
    );
  }
  const tree = await first<Row>(c.env.DB, 'SELECT * FROM family_trees WHERE id = ?', treeId);
  return c.json(
    { message: `Imported ${idMap.size} members.`, tree: treePayload(tree!, Array.from(idMap.values()).map((id) => ({ id, tree_id: treeId })) as Row[]) },
    201,
  );
});
